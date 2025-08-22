import { Hono } from 'hono'

interface CloudflareBindings {
  DB: D1Database;
}

export const officesRoutes = new Hono<{ Bindings: CloudflareBindings }>()

// Get all offices for a law firm
officesRoutes.get('/:firmId', async (c) => {
  try {
    const firmId = c.req.param('firmId')
    const { env } = c
    
    // Verify Enterprise subscription
    const lawFirm = await env.DB.prepare(`
      SELECT subscription_tier FROM law_firms WHERE id = ?
    `).bind(firmId).first()
    
    if (!lawFirm || lawFirm.subscription_tier !== 'enterprise') {
      return c.json({ error: 'Multi-office features require Enterprise subscription' }, 403)
    }
    
    const offices = await env.DB.prepare(`
      SELECT 
        o.*,
        u.name as manager_name,
        COUNT(staff.id) as staff_count,
        COUNT(leads.id) as leads_count
      FROM offices o
      LEFT JOIN users u ON o.manager_user_id = u.id
      LEFT JOIN users staff ON staff.office_id = o.id AND staff.user_type = 'law_firm'
      LEFT JOIN leads ON leads.office_id = o.id
      WHERE o.law_firm_id = ?
      GROUP BY o.id
      ORDER BY o.is_headquarters DESC, o.office_name
    `).bind(firmId).all()
    
    return c.json({ offices: offices.results || [] })
    
  } catch (error) {
    console.error('Offices list error:', error)
    return c.json({ error: 'Failed to load offices' }, 500)
  }
})

// Create new office
officesRoutes.post('/:firmId', async (c) => {
  try {
    const firmId = c.req.param('firmId')
    const { 
      officeName, 
      address, 
      phone, 
      email, 
      managerUserId, 
      timezone = 'America/New_York' 
    } = await c.req.json()
    
    if (!officeName || !address) {
      return c.json({ error: 'Office name and address are required' }, 400)
    }
    
    const { env } = c
    
    // Verify Enterprise subscription
    const lawFirm = await env.DB.prepare(`
      SELECT subscription_tier FROM law_firms WHERE id = ?
    `).bind(firmId).first()
    
    if (!lawFirm || lawFirm.subscription_tier !== 'enterprise') {
      return c.json({ error: 'Multi-office features require Enterprise subscription' }, 403)
    }
    
    const result = await env.DB.prepare(`
      INSERT INTO offices (
        law_firm_id, office_name, address, phone, email, 
        manager_user_id, is_headquarters, timezone
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      firmId, officeName, address, phone || '', email || '',
      managerUserId || null, 0, timezone
    ).run()
    
    return c.json({
      success: true,
      officeId: result.meta.last_row_id
    })
    
  } catch (error) {
    console.error('Office creation error:', error)
    return c.json({ error: 'Failed to create office' }, 500)
  }
})

// Update office
officesRoutes.put('/:firmId/:officeId', async (c) => {
  try {
    const firmId = c.req.param('firmId')
    const officeId = c.req.param('officeId')
    const { 
      officeName, 
      address, 
      phone, 
      email, 
      managerUserId, 
      timezone,
      settings 
    } = await c.req.json()
    
    const { env } = c
    
    await env.DB.prepare(`
      UPDATE offices 
      SET office_name = ?, address = ?, phone = ?, email = ?,
          manager_user_id = ?, timezone = ?, settings = ?,
          updated_at = datetime('now')
      WHERE id = ? AND law_firm_id = ?
    `).bind(
      officeName, address, phone || '', email || '',
      managerUserId || null, timezone || 'America/New_York',
      JSON.stringify(settings || {}), officeId, firmId
    ).run()
    
    return c.json({ success: true })
    
  } catch (error) {
    console.error('Office update error:', error)
    return c.json({ error: 'Failed to update office' }, 500)
  }
})

// Get office analytics
officesRoutes.get('/:firmId/:officeId/analytics', async (c) => {
  try {
    const firmId = c.req.param('firmId')
    const officeId = c.req.param('officeId')
    const timeframe = c.req.query('timeframe') || '30d'
    const { env } = c
    
    const timeframeSql = getTimeframeSql(timeframe)
    
    // Office performance metrics
    const performance = await env.DB.prepare(`
      SELECT 
        COUNT(l.id) as total_leads,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as converted_leads,
        AVG(l.risk_score) as avg_risk_score,
        SUM(l.estimated_value) as total_pipeline,
        COUNT(CASE WHEN l.created_at >= datetime('now', '${timeframeSql}') THEN 1 END) as recent_leads
      FROM leads l
      WHERE l.office_id = ? AND l.law_firm_id = ?
    `).bind(officeId, firmId).first()
    
    // Staff performance
    const staffStats = await env.DB.prepare(`
      SELECT 
        u.id, u.name, u.role,
        COUNT(l.id) as assigned_leads,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as converted_leads,
        AVG(l.estimated_value) as avg_deal_size
      FROM users u
      LEFT JOIN leads l ON u.id = l.assigned_attorney_id
      WHERE u.office_id = ? AND u.user_type = 'law_firm'
      GROUP BY u.id, u.name, u.role
      ORDER BY converted_leads DESC
    `).bind(officeId).all()
    
    // Monthly trend
    const monthlyTrend = await env.DB.prepare(`
      SELECT 
        strftime('%Y-%m', l.created_at) as month,
        COUNT(*) as leads_count,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as conversions,
        SUM(l.estimated_value) as pipeline_value
      FROM leads l
      WHERE l.office_id = ? AND l.created_at >= datetime('now', '${timeframeSql}')
      GROUP BY strftime('%Y-%m', l.created_at)
      ORDER BY month
    `).bind(officeId).all()
    
    return c.json({
      performance,
      staffStats: staffStats.results || [],
      monthlyTrend: monthlyTrend.results || []
    })
    
  } catch (error) {
    console.error('Office analytics error:', error)
    return c.json({ error: 'Failed to load office analytics' }, 500)
  }
})

// Get office staff
officesRoutes.get('/:firmId/:officeId/staff', async (c) => {
  try {
    const firmId = c.req.param('firmId')
    const officeId = c.req.param('officeId')
    const { env } = c
    
    const staff = await env.DB.prepare(`
      SELECT 
        u.id, u.name, u.email, u.phone, u.role, u.permissions,
        u.last_login_at, u.is_active,
        COUNT(l.id) as assigned_leads,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as converted_leads
      FROM users u
      LEFT JOIN leads l ON u.id = l.assigned_attorney_id
      WHERE u.office_id = ? AND u.user_type = 'law_firm'
      GROUP BY u.id
      ORDER BY u.name
    `).bind(officeId).all()
    
    return c.json({ staff: staff.results || [] })
    
  } catch (error) {
    console.error('Office staff error:', error)  
    return c.json({ error: 'Failed to load office staff' }, 500)
  }
})

// Add staff member to office
officesRoutes.post('/:firmId/:officeId/staff', async (c) => {
  try {
    const firmId = c.req.param('firmId')
    const officeId = c.req.param('officeId')
    const { 
      name, 
      email, 
      phone, 
      role = 'attorney', 
      permissions = [] 
    } = await c.req.json()
    
    if (!name || !email) {
      return c.json({ error: 'Name and email are required' }, 400)
    }
    
    const { env } = c
    
    // Check if user already exists
    const existingUser = await env.DB.prepare(`
      SELECT id FROM users WHERE email = ?
    `).bind(email).first()
    
    if (existingUser) {
      return c.json({ error: 'User with this email already exists' }, 400)
    }
    
    const result = await env.DB.prepare(`
      INSERT INTO users (
        email, password_hash, name, phone, user_type, 
        office_id, role, permissions, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      email, '$2b$10$placeholder_hash', name, phone || '',
      'law_firm', officeId, role, JSON.stringify(permissions), 1
    ).run()
    
    return c.json({
      success: true,
      userId: result.meta.last_row_id
    })
    
  } catch (error) {
    console.error('Add staff error:', error)
    return c.json({ error: 'Failed to add staff member' }, 500)
  }
})

// Get comparative office performance (Enterprise dashboard)
officesRoutes.get('/:firmId/comparative-analytics', async (c) => {
  try {
    const firmId = c.req.param('firmId')
    const timeframe = c.req.query('timeframe') || '30d'
    const { env } = c
    
    // Verify Enterprise subscription
    const lawFirm = await env.DB.prepare(`
      SELECT subscription_tier FROM law_firms WHERE id = ?
    `).bind(firmId).first()
    
    if (!lawFirm || lawFirm.subscription_tier !== 'enterprise') {
      return c.json({ error: 'Multi-office analytics require Enterprise subscription' }, 403)
    }
    
    const timeframeSql = getTimeframeSql(timeframe)
    
    // Comparative performance by office
    const officeComparison = await env.DB.prepare(`
      SELECT 
        o.id, o.office_name,
        COUNT(l.id) as total_leads,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as converted_leads,
        AVG(l.risk_score) as avg_risk_score,
        SUM(l.estimated_value) as total_pipeline,
        COUNT(CASE WHEN l.created_at >= datetime('now', '${timeframeSql}') THEN 1 END) as recent_leads,
        ROUND(
          CAST(COUNT(CASE WHEN l.status = 'converted' THEN 1 END) AS FLOAT) / 
          NULLIF(COUNT(l.id), 0) * 100, 2
        ) as conversion_rate
      FROM offices o
      LEFT JOIN leads l ON o.id = l.office_id
      WHERE o.law_firm_id = ?
      GROUP BY o.id, o.office_name
      ORDER BY conversion_rate DESC
    `).bind(firmId).all()
    
    // Top performers across all offices
    const topPerformers = await env.DB.prepare(`
      SELECT 
        u.name, u.role, o.office_name,
        COUNT(l.id) as assigned_leads,
        COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as converted_leads,
        AVG(l.estimated_value) as avg_deal_size,
        ROUND(
          CAST(COUNT(CASE WHEN l.status = 'converted' THEN 1 END) AS FLOAT) / 
          NULLIF(COUNT(l.id), 0) * 100, 2
        ) as conversion_rate
      FROM users u
      JOIN offices o ON u.office_id = o.id
      LEFT JOIN leads l ON u.id = l.assigned_attorney_id
      WHERE o.law_firm_id = ? AND u.user_type = 'law_firm'
      AND l.created_at >= datetime('now', '${timeframeSql}')
      GROUP BY u.id, u.name, u.role, o.office_name
      HAVING COUNT(l.id) > 0
      ORDER BY conversion_rate DESC, converted_leads DESC
      LIMIT 10
    `).bind(firmId).all()
    
    return c.json({
      officeComparison: officeComparison.results || [],
      topPerformers: topPerformers.results || []
    })
    
  } catch (error) {
    console.error('Comparative analytics error:', error)
    return c.json({ error: 'Failed to load comparative analytics' }, 500)
  }
})

// Multi-office dashboard HTML
officesRoutes.get('/:firmId/dashboard', async (c) => {
  try {
    const firmId = c.req.param('firmId')
    const { env } = c
    
    // Verify Enterprise subscription
    const lawFirm = await env.DB.prepare(`
      SELECT * FROM law_firms WHERE id = ?
    `).bind(firmId).first()
    
    if (!lawFirm || lawFirm.subscription_tier !== 'enterprise') {
      return c.html(`
        <html>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Enterprise Feature Required</h1>
            <p>Multi-office management requires an Enterprise subscription.</p>
            <a href="/pricing" style="color: #1e40af;">Upgrade to Enterprise</a>
          </body>
        </html>
      `)
    }
    
    return c.html(getMultiOfficeDashboardHTML(lawFirm))
    
  } catch (error) {
    console.error('Multi-office dashboard error:', error)
    return c.html('<h1>Error loading multi-office dashboard</h1>')
  }
})

// Helper functions
function getTimeframeSql(timeframe: string): string {
  switch (timeframe) {
    case '7d': return '-7 days'
    case '30d': return '-30 days'
    case '90d': return '-90 days'
    case '1y': return '-1 year'
    default: return '-30 days'
  }
}

function getMultiOfficeDashboardHTML(lawFirm: any): string {
  const branding = JSON.parse(lawFirm.branding_config || '{}')
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Multi-Office Dashboard - ${lawFirm.firm_name}</title>
    
    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzJkNjNhNCIvPgo8cGF0aCBkPSJNMTYgNEw4IDEwVjE4TDE2IDI4TDI0IDE4VjEwTDE2IDRaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTYgOEwxMiAxMlYxOEwxNiAyMkwyMCAxOFYxMkwxNiA4WiIgZmlsbD0iIzJkNjNhNCIvPgo8L3N2Zz4=" />
    <link rel="apple-touch-icon" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDE4MCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxODAiIGhlaWdodD0iMTgwIiByeD0iNDAiIGZpbGw9IiMyZDYzYTQiLz4KPHBhdGggZD0iTTkwIDIwTDQ1IDUwVjEwMEw5MCA2MEwxMzUgMTAwVjUwTDkwIDIwWiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTkwIDQwTDY3IDYwVjEwMEw5MCAxMjBMMTEzIDEwMFY2MEw5MCA0MFoiIGZpbGw9IiMyZDYzYTQiLz4KPC9zdmc+" />
    <link rel="shortcut icon" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzJkNjNhNCIvPgo8cGF0aCBkPSJNMTYgNEw4IDEwVjE4TDE2IDI4TDI0IDE4VjEwTDE2IDRaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTYgOEwxMiAxMlYxOEwxNiAyMkwyMCAxOFYxMkwxNiA4WiIgZmlsbD0iIzJkNjNhNCIvPgo8L3N2Zz4=" />
    
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        primary: '${branding.primary_color || '#1e40af'}',
                        secondary: '${branding.secondary_color || '#3b82f6'}'
                    }
                }
            }
        }
    </script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
</head>
<body class="bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
                <div class="flex items-center space-x-4">
                    <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <i class="fas fa-building text-white"></i>
                    </div>
                    <h1 class="text-xl font-bold text-gray-900">Multi-Office Dashboard</h1>
                    <span class="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded">ENTERPRISE</span>
                </div>
                <nav class="flex items-center space-x-6">
                    <a href="/dashboard/firm/${lawFirm.id}" class="text-gray-600 hover:text-primary">Main Dashboard</a>
                    <a href="#offices" class="text-primary font-medium">Offices</a>
                    <a href="#analytics" class="text-gray-600 hover:text-primary">Analytics</a>
                    <a href="#staff" class="text-gray-600 hover:text-primary">Staff</a>
                </nav>
            </div>
        </div>
    </header>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Office Management -->
        <div class="mb-8">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-900">Office Management</h2>
                <button onclick="showAddOfficeModal()" class="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90">
                    <i class="fas fa-plus mr-2"></i>Add Office
                </button>
            </div>
            
            <!-- Offices Grid -->
            <div id="officesGrid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <!-- Offices will be loaded here -->
            </div>
        </div>

        <!-- Comparative Analytics -->
        <div class="mb-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-6">Comparative Performance</h2>
            
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <!-- Office Performance Chart -->
                <div class="bg-white rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Office Performance Comparison</h3>
                    <canvas id="officeComparisonChart" width="400" height="300"></canvas>
                </div>
                
                <!-- Top Performers -->
                <div class="bg-white rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Top Performers</h3>
                    <div id="topPerformersList">
                        <!-- Top performers will be loaded here -->
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Add Office Modal -->
    <div id="addOfficeModal" class="hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div class="mt-3">
                <h3 class="text-lg font-medium text-gray-900 mb-4">Add New Office</h3>
                <form id="addOfficeForm">
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Office Name</label>
                        <input type="text" name="officeName" required class="w-full p-2 border border-gray-300 rounded-md">
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Address</label>
                        <textarea name="address" required class="w-full p-2 border border-gray-300 rounded-md rows-3"></textarea>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                        <input type="tel" name="phone" class="w-full p-2 border border-gray-300 rounded-md">
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <input type="email" name="email" class="w-full p-2 border border-gray-300 rounded-md">
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                        <select name="timezone" class="w-full p-2 border border-gray-300 rounded-md">
                            <option value="America/New_York">Eastern Time</option>
                            <option value="America/Chicago">Central Time</option>
                            <option value="America/Denver">Mountain Time</option>
                            <option value="America/Los_Angeles">Pacific Time</option>
                        </select>
                    </div>
                    <div class="flex justify-end space-x-3">
                        <button type="button" onclick="hideAddOfficeModal()" class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">
                            Cancel
                        </button>
                        <button type="submit" class="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90">
                            Add Office
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <script>
        let offices = [];
        
        document.addEventListener('DOMContentLoaded', function() {
            loadOffices();
            loadComparativeAnalytics();
        });
        
        async function loadOffices() {
            try {
                const response = await axios.get('/offices/${lawFirm.id}');
                offices = response.data.offices;
                renderOffices();
            } catch (error) {
                console.error('Failed to load offices:', error);
            }
        }
        
        function renderOffices() {
            const grid = document.getElementById('officesGrid');
            grid.innerHTML = offices.map(office => \`
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900">\${office.office_name}</h3>
                        \${office.is_headquarters ? '<span class="bg-green-100 text-green-800 text-xs font-medium px-2 py-1 rounded">HQ</span>' : ''}
                    </div>
                    <div class="space-y-2 text-sm text-gray-600 mb-4">
                        <p><i class="fas fa-map-marker-alt mr-2"></i>\${office.address}</p>
                        \${office.phone ? \`<p><i class="fas fa-phone mr-2"></i>\${office.phone}</p>\` : ''}
                        \${office.email ? \`<p><i class="fas fa-envelope mr-2"></i>\${office.email}</p>\` : ''}
                        \${office.manager_name ? \`<p><i class="fas fa-user mr-2"></i>Manager: \${office.manager_name}</p>\` : ''}
                    </div>
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div class="text-center">
                            <div class="text-2xl font-bold text-primary">\${office.staff_count}</div>
                            <div class="text-gray-500">Staff</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-secondary">\${office.leads_count}</div>
                            <div class="text-gray-500">Leads</div>
                        </div>
                    </div>
                    <div class="mt-4 flex space-x-2">
                        <button onclick="viewOfficeDetails(\${office.id})" class="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200">
                            View Details
                        </button>
                        <button onclick="manageOfficeStaff(\${office.id})" class="flex-1 bg-primary text-white px-3 py-2 rounded text-sm hover:bg-primary/90">
                            Manage Staff
                        </button>
                    </div>
                </div>
            \`).join('');
        }
        
        async function loadComparativeAnalytics() {
            try {
                const response = await axios.get('/offices/${lawFirm.id}/comparative-analytics');
                const data = response.data;
                
                renderOfficeComparison(data.officeComparison);
                renderTopPerformers(data.topPerformers);
                
            } catch (error) {
                console.error('Failed to load comparative analytics:', error);
            }
        }
        
        function renderOfficeComparison(comparisonData) {
            const ctx = document.getElementById('officeComparisonChart').getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: comparisonData.map(office => office.office_name),
                    datasets: [
                        {
                            label: 'Total Leads',
                            data: comparisonData.map(office => office.total_leads),
                            backgroundColor: '${branding.primary_color || '#1e40af'}',
                            yAxisID: 'y'
                        },
                        {
                            label: 'Conversion Rate (%)',
                            data: comparisonData.map(office => office.conversion_rate),
                            backgroundColor: '${branding.secondary_color || '#3b82f6'}',
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            grid: {
                                drawOnChartArea: false,
                            },
                        }
                    }
                }
            });
        }
        
        function renderTopPerformers(performers) {
            const list = document.getElementById('topPerformersList');
            list.innerHTML = performers.map((performer, index) => \`
                <div class="flex items-center justify-between py-3 border-b border-gray-200">
                    <div class="flex items-center">
                        <div class="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
                            \${index + 1}
                        </div>
                        <div>
                            <div class="font-medium text-gray-900">\${performer.name}</div>
                            <div class="text-sm text-gray-500">\${performer.role} • \${performer.office_name}</div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="font-medium text-gray-900">\${performer.conversion_rate}%</div>
                        <div class="text-sm text-gray-500">\${performer.converted_leads}/\${performer.assigned_leads}</div>
                    </div>
                </div>
            \`).join('');
        }
        
        function showAddOfficeModal() {
            document.getElementById('addOfficeModal').classList.remove('hidden');
        }
        
        function hideAddOfficeModal() {
            document.getElementById('addOfficeModal').classList.add('hidden');
            document.getElementById('addOfficeForm').reset();
        }
        
        document.getElementById('addOfficeForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const officeData = Object.fromEntries(formData);
            
            try {
                await axios.post('/offices/${lawFirm.id}', officeData);
                hideAddOfficeModal();
                loadOffices(); // Reload offices
            } catch (error) {
                console.error('Failed to add office:', error);
                alert('Failed to add office. Please try again.');
            }
        });
        
        function viewOfficeDetails(officeId) {
            window.location.href = \`/offices/${lawFirm.id}/\${officeId}/analytics\`;
        }
        
        function manageOfficeStaff(officeId) {
            window.location.href = \`/offices/${lawFirm.id}/\${officeId}/staff\`;
        }
    </script>
</body>
</html>`
}

export default officesRoutes