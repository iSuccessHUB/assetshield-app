import { Hono } from 'hono'

interface CloudflareBindings {
  DB: D1Database;
}

export const dashboardRoutes = new Hono<{ Bindings: CloudflareBindings }>()

// Demo dashboard page (handles ?demo=... query params)
dashboardRoutes.get('/', async (c) => {
  try {
    const demoId = c.req.query('demo')
    const firmName = c.req.query('firm') || 'Demo Law Firm'
    
    if (!demoId) {
      return c.redirect('/?error=invalid_demo')
    }
    
    // Get demo dashboard data
    const demoData = {
      id: demoId,
      firm_name: decodeURIComponent(firmName),
      subscription_tier: 'professional',
      owner_name: 'Demo Attorney',
      owner_email: 'demo@example.com'
    }
    
    const dashboardData = getMockDashboardData()
    
    return c.html(getDemoDashboardHTML(demoData, dashboardData))
    
  } catch (error) {
    console.error('Demo dashboard error:', error)
    return c.html('<h1>Error loading demo dashboard</h1>')
  }
})

// Main dashboard page for law firms
dashboardRoutes.get('/firm/:firmId', async (c) => {
  try {
    const firmId = c.req.param('firmId')
    const { env } = c
    
    // Get law firm info
    const lawFirm = await env.DB.prepare(`
      SELECT lf.*, u.name as owner_name, u.email as owner_email
      FROM law_firms lf
      JOIN users u ON lf.user_id = u.id
      WHERE lf.id = ?
    `).bind(firmId).first()
    
    if (!lawFirm) {
      return c.redirect('/?error=firm_not_found')
    }
    
    // Get dashboard data
    const dashboardData = await getDashboardData(env.DB, firmId)
    
    return c.html(getDashboardHTML(lawFirm, dashboardData))
    
  } catch (error) {
    console.error('Dashboard error:', error)
    return c.html('<h1>Error loading dashboard</h1>')
  }
})

// Analytics API endpoint
dashboardRoutes.get('/api/analytics/:firmId', async (c) => {
  try {
    const firmId = c.req.param('firmId')
    const timeframe = c.req.query('timeframe') || '30d'
    const { env } = c
    
    const analytics = await getAnalyticsData(env.DB, firmId, timeframe)
    
    return c.json(analytics)
    
  } catch (error) {
    console.error('Analytics API error:', error)
    return c.json({ error: 'Failed to load analytics' }, 500)
  }
})

// Leads API endpoint
dashboardRoutes.get('/api/leads/:firmId', async (c) => {
  try {
    const firmId = c.req.param('firmId')
    const status = c.req.query('status')
    const { env } = c
    
    let query = `
      SELECT l.*, u.name as assigned_attorney_name
      FROM leads l
      LEFT JOIN users u ON l.assigned_attorney_id = u.id
      WHERE l.law_firm_id = ?
    `
    const params = [firmId]
    
    if (status && status !== 'all') {
      query += ' AND l.status = ?'
      params.push(status)
    }
    
    query += ' ORDER BY l.created_at DESC LIMIT 50'
    
    const leads = await env.DB.prepare(query).bind(...params).all()
    
    return c.json({ leads: leads.results || [] })
    
  } catch (error) {
    console.error('Leads API error:', error)
    return c.json({ error: 'Failed to load leads' }, 500)
  }
})

// Multi-office analytics (Enterprise feature)
dashboardRoutes.get('/api/multi-office-analytics/:firmId', async (c) => {
  try {
    const firmId = c.req.param('firmId')
    const { env } = c
    
    // Check if firm has multi-office access
    const lawFirm = await env.DB.prepare(`
      SELECT subscription_tier FROM law_firms WHERE id = ?
    `).bind(firmId).first()
    
    if (!lawFirm || lawFirm.subscription_tier !== 'enterprise') {
      return c.json({ error: 'Multi-office features require Enterprise subscription' }, 403)
    }
    
    const officeAnalytics = await getMultiOfficeAnalytics(env.DB, firmId)
    
    return c.json(officeAnalytics)
    
  } catch (error) {
    console.error('Multi-office analytics error:', error)
    return c.json({ error: 'Failed to load multi-office analytics' }, 500)
  }
})

// Helper functions
async function getDashboardData(db: D1Database, firmId: number) {
  // Lead statistics
  const leadStats = await db.prepare(`
    SELECT 
      COUNT(*) as total_leads,
      COUNT(CASE WHEN status = 'new' THEN 1 END) as new_leads,
      COUNT(CASE WHEN status = 'qualified' THEN 1 END) as qualified_leads,
      COUNT(CASE WHEN status = 'consultation' THEN 1 END) as consultation_leads,
      COUNT(CASE WHEN status = 'converted' THEN 1 END) as converted_leads,
      AVG(risk_score) as avg_risk_score,
      SUM(estimated_value) as total_pipeline_value
    FROM leads WHERE law_firm_id = ?
  `).bind(firmId).first()
  
  // Recent leads
  const recentLeads = await db.prepare(`
    SELECT l.*, u.name as assigned_attorney_name
    FROM leads l
    LEFT JOIN users u ON l.assigned_attorney_id = u.id
    WHERE l.law_firm_id = ?
    ORDER BY l.created_at DESC
    LIMIT 10
  `).bind(firmId).all()
  
  // Monthly metrics
  const monthlyMetrics = await db.prepare(`
    SELECT 
      COUNT(*) as assessments_this_month,
      COUNT(CASE WHEN ae.created_at >= datetime('now', '-7 days') THEN 1 END) as assessments_this_week
    FROM analytics_events ae
    WHERE ae.law_firm_id = ? AND ae.event_type = 'assessment_completed'
    AND ae.created_at >= datetime('now', 'start of month')
  `).bind(firmId).first()
  
  // Revenue data
  const revenueData = await db.prepare(`
    SELECT 
      SUM(amount) as total_revenue,
      COUNT(*) as total_transactions
    FROM payment_transactions
    WHERE law_firm_id = ? AND status = 'succeeded'
  `).bind(firmId).first()
  
  return {
    leadStats,
    recentLeads: recentLeads.results || [],
    monthlyMetrics,
    revenueData
  }
}

async function getAnalyticsData(db: D1Database, firmId: number, timeframe: string) {
  const timeframeSql = getTimeframeSql(timeframe)
  
  // Conversion funnel
  const funnelData = await db.prepare(`
    SELECT 
      'Website Visitors' as stage, 
      COUNT(DISTINCT session_id) as count, 
      1 as order_num
    FROM analytics_events 
    WHERE law_firm_id = ? AND created_at >= datetime('now', '${timeframeSql}')
    
    UNION ALL
    
    SELECT 
      'Started Assessment' as stage,
      COUNT(*) as count,
      2 as order_num
    FROM analytics_events
    WHERE law_firm_id = ? AND event_type = 'assessment_started'
    AND created_at >= datetime('now', '${timeframeSql}')
    
    UNION ALL
    
    SELECT
      'Completed Assessment' as stage,
      COUNT(*) as count,
      3 as order_num  
    FROM analytics_events
    WHERE law_firm_id = ? AND event_type = 'assessment_completed'
    AND created_at >= datetime('now', '${timeframeSql}')
    
    UNION ALL
    
    SELECT
      'Generated Lead' as stage,
      COUNT(*) as count,
      4 as order_num
    FROM leads
    WHERE law_firm_id = ? AND created_at >= datetime('now', '${timeframeSql}')
    
    UNION ALL
    
    SELECT
      'Booked Consultation' as stage,
      COUNT(*) as count,
      5 as order_num
    FROM analytics_events
    WHERE law_firm_id = ? AND event_type = 'consultation_booked'
    AND created_at >= datetime('now', '${timeframeSql}')
    
    ORDER BY order_num
  `).bind(firmId, firmId, firmId, firmId, firmId).all()
  
  // Daily activity trend
  const dailyTrend = await db.prepare(`
    SELECT 
      DATE(created_at) as date,
      COUNT(*) as total_events,
      COUNT(CASE WHEN event_type = 'assessment_completed' THEN 1 END) as assessments,
      COUNT(CASE WHEN event_type = 'lead_generated' THEN 1 END) as leads,
      COUNT(CASE WHEN event_type = 'consultation_booked' THEN 1 END) as consultations
    FROM analytics_events
    WHERE law_firm_id = ? AND created_at >= datetime('now', '${timeframeSql}')
    GROUP BY DATE(created_at)
    ORDER BY date
  `).bind(firmId).all()
  
  // Lead source breakdown
  const leadSources = await db.prepare(`
    SELECT 
      source_type,
      COUNT(*) as count,
      AVG(risk_score) as avg_risk_score,
      AVG(estimated_value) as avg_value
    FROM leads
    WHERE law_firm_id = ? AND created_at >= datetime('now', '${timeframeSql}')
    GROUP BY source_type
    ORDER BY count DESC
  `).bind(firmId).all()
  
  // Risk score distribution
  const riskDistribution = await db.prepare(`
    SELECT 
      CASE 
        WHEN risk_score < 50 THEN 'Low Risk (0-49)'
        WHEN risk_score < 75 THEN 'Medium Risk (50-74)'
        ELSE 'High Risk (75-100)'
      END as risk_category,
      COUNT(*) as count
    FROM leads
    WHERE law_firm_id = ? AND risk_score IS NOT NULL
    AND created_at >= datetime('now', '${timeframeSql}')
    GROUP BY risk_category
  `).bind(firmId).all()
  
  return {
    funnel: funnelData.results || [],
    dailyTrend: dailyTrend.results || [],
    leadSources: leadSources.results || [],
    riskDistribution: riskDistribution.results || []
  }
}

async function getMultiOfficeAnalytics(db: D1Database, firmId: number) {
  const officePerformance = await db.prepare(`
    SELECT 
      o.id, o.office_name, o.address,
      COUNT(l.id) as total_leads,
      AVG(l.risk_score) as avg_risk_score,
      SUM(l.estimated_value) as total_pipeline,
      COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as converted_leads
    FROM offices o
    LEFT JOIN leads l ON o.id = l.office_id
    WHERE o.law_firm_id = ?
    GROUP BY o.id, o.office_name, o.address
    ORDER BY total_leads DESC
  `).bind(firmId).all()
  
  const staffPerformance = await db.prepare(`
    SELECT 
      u.id, u.name, u.role, o.office_name,
      COUNT(l.id) as assigned_leads,
      COUNT(CASE WHEN l.status = 'converted' THEN 1 END) as converted_leads,
      AVG(l.estimated_value) as avg_deal_size
    FROM users u
    LEFT JOIN offices o ON u.office_id = o.id
    LEFT JOIN leads l ON u.id = l.assigned_attorney_id
    WHERE o.law_firm_id = ? AND u.user_type = 'law_firm'
    GROUP BY u.id, u.name, u.role, o.office_name
    ORDER BY converted_leads DESC
  `).bind(firmId).all()
  
  return {
    officePerformance: officePerformance.results || [],
    staffPerformance: staffPerformance.results || []
  }
}

function getTimeframeSql(timeframe: string): string {
  switch (timeframe) {
    case '7d': return '-7 days'
    case '30d': return '-30 days'  
    case '90d': return '-90 days'
    case '1y': return '-1 year'
    default: return '-30 days'
  }
}

function getDashboardHTML(lawFirm: any, dashboardData: any): string {
  const branding = JSON.parse(lawFirm.branding_config || '{}')
  const features = JSON.parse(lawFirm.features || '[]')
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${lawFirm.firm_name} - AssetShield Dashboard</title>
    
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
                        <i class="fas fa-shield-alt text-white"></i>
                    </div>
                    <h1 class="text-xl font-bold text-gray-900">${lawFirm.firm_name}</h1>
                    ${lawFirm.is_demo ? '<span class="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded">DEMO</span>' : ''}
                </div>
                <nav class="flex items-center space-x-6">
                    <a href="#dashboard" class="text-primary font-medium">Dashboard</a>
                    <a href="#leads" class="text-gray-600 hover:text-primary">Leads</a>
                    <a href="#analytics" class="text-gray-600 hover:text-primary">Analytics</a>
                    ${features.includes('Multi-Office Deployment') ? '<a href="#offices" class="text-gray-600 hover:text-primary">Offices</a>' : ''}
                    <a href="#settings" class="text-gray-600 hover:text-primary">Settings</a>
                </nav>
            </div>
        </div>
    </header>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Dashboard Overview -->
        <div class="mb-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h2>
            
            <!-- Key Metrics -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center">
                        <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                            <i class="fas fa-users text-blue-600 text-xl"></i>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">Total Leads</p>
                            <p class="text-2xl font-bold text-gray-900">${dashboardData.leadStats?.total_leads || 0}</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center">
                        <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                            <i class="fas fa-chart-line text-green-600 text-xl"></i>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">Conversion Rate</p>
                            <p class="text-2xl font-bold text-gray-900">${calculateConversionRate(dashboardData.leadStats)}%</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center">
                        <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                            <i class="fas fa-dollar-sign text-purple-600 text-xl"></i>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">Pipeline Value</p>
                            <p class="text-2xl font-bold text-gray-900">$${formatCurrency(dashboardData.leadStats?.total_pipeline_value || 0)}</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center">
                        <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                            <i class="fas fa-shield-alt text-orange-600 text-xl"></i>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">Avg Risk Score</p>
                            <p class="text-2xl font-bold text-gray-900">${Math.round(dashboardData.leadStats?.avg_risk_score || 0)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Charts Row -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <!-- Conversion Funnel -->
                <div class="bg-white rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel</h3>
                    <canvas id="funnelChart" width="400" height="300"></canvas>
                </div>
                
                <!-- Lead Sources -->
                <div class="bg-white rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Lead Sources</h3>
                    <canvas id="sourceChart" width="400" height="300"></canvas>
                </div>
            </div>

            <!-- Recent Leads Table -->
            <div class="bg-white rounded-lg shadow mb-8">
                <div class="px-6 py-4 border-b border-gray-200">
                    <h3 class="text-lg font-semibold text-gray-900">Recent Leads</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Score</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Value</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${dashboardData.recentLeads.map(lead => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="text-sm font-medium text-gray-900">${lead.contact_name}</div>
                                        <div class="text-sm text-gray-500">${lead.contact_email}</div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskScoreColor(lead.risk_score)}">
                                            ${lead.risk_score || 'N/A'}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        $${formatCurrency(lead.estimated_value || 0)}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(lead.status)}">
                                            ${lead.status}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        ${lead.assigned_attorney_name || 'Unassigned'}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        ${formatDate(lead.created_at)}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Initialize charts when page loads
        document.addEventListener('DOMContentLoaded', function() {
            initializeDashboard();
        });
        
        function initializeDashboard() {
            loadAnalytics('30d');
        }
        
        async function loadAnalytics(timeframe) {
            try {
                const response = await axios.get(\`/dashboard/api/analytics/${lawFirm.id}?timeframe=\${timeframe}\`);
                const data = response.data;
                
                // Update funnel chart
                updateFunnelChart(data.funnel);
                
                // Update source chart  
                updateSourceChart(data.leadSources);
                
            } catch (error) {
                console.error('Failed to load analytics:', error);
            }
        }
        
        function updateFunnelChart(funnelData) {
            const ctx = document.getElementById('funnelChart').getContext('2d');
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: funnelData.map(item => item.stage),
                    datasets: [{
                        label: 'Count',
                        data: funnelData.map(item => item.count),
                        backgroundColor: '${branding.primary_color || '#1e40af'}',
                        borderColor: '${branding.secondary_color || '#3b82f6'}',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
        
        function updateSourceChart(sourceData) {
            const ctx = document.getElementById('sourceChart').getContext('2d');
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: sourceData.map(item => item.source_type),
                    datasets: [{
                        data: sourceData.map(item => item.count),
                        backgroundColor: [
                            '${branding.primary_color || '#1e40af'}',
                            '${branding.secondary_color || '#3b82f6'}',
                            '#10b981',
                            '#f59e0b',
                            '#ef4444'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
    </script>
</body>
</html>`

  function calculateConversionRate(stats: any): string {
    if (!stats || !stats.total_leads || stats.total_leads === 0) return '0'
    return ((stats.converted_leads / stats.total_leads) * 100).toFixed(1)
  }
  
  function formatCurrency(amount: number): string {
    return (amount / 100).toLocaleString()
  }
  
  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString()
  }
  
  function getRiskScoreColor(score: number): string {
    if (!score) return 'bg-gray-100 text-gray-800'
    if (score < 50) return 'bg-green-100 text-green-800'
    if (score < 75) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }
  
  function getStatusColor(status: string): string {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800'
      case 'qualified': return 'bg-green-100 text-green-800'
      case 'consultation': return 'bg-yellow-100 text-yellow-800'
      case 'converted': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
}

function getMockDashboardData() {
  return {
    leadStats: {
      total_leads: 25,
      new_leads: 5,
      qualified_leads: 12,
      consultation_leads: 6,
      converted_leads: 2,
      avg_risk_score: 78.5,
      total_pipeline_value: 15750000
    },
    recentLeads: [
      {
        contact_name: 'Sarah Johnson',
        contact_email: 'sarah@example.com',
        risk_score: 85,
        estimated_value: 2500000,
        status: 'consultation',
        assigned_attorney_name: 'Demo Attorney',
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        contact_name: 'Michael Chen',
        contact_email: 'michael@example.com', 
        risk_score: 72,
        estimated_value: 1800000,
        status: 'qualified',
        assigned_attorney_name: 'Demo Attorney',
        created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        contact_name: 'Robert Davis',
        contact_email: 'robert@example.com',
        risk_score: 91,
        estimated_value: 3200000,
        status: 'new',
        assigned_attorney_name: 'Demo Attorney',
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        contact_name: 'Lisa Williams',
        contact_email: 'lisa@example.com',
        risk_score: 68,
        estimated_value: 1200000,
        status: 'converted',
        assigned_attorney_name: 'Demo Attorney',
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  }
}

function getDemoDashboardHTML(lawFirm: any, dashboardData: any): string {
  const branding = {
    primary_color: '#1e40af',
    secondary_color: '#3b82f6'
  }
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${lawFirm.firm_name} - AssetShield Demo Dashboard</title>
    
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
                        primary: '${branding.primary_color}',
                        secondary: '${branding.secondary_color}'
                    }
                }
            }
        }
    </script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    <style>
        /* Prevent infinite scrolling issues */
        html, body {
            height: 100%;
            overflow-x: hidden;
        }
        body {
            background-color: #f9fafb;
        }
        /* Fixed chart container sizes to prevent resizing loops */
        .chart-container {
            position: relative;
            height: 300px;
            width: 100%;
        }
        canvas {
            max-height: 300px !important;
        }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <!-- Demo Banner -->
    <div class="bg-orange-500 text-white px-4 py-2">
        <div class="max-w-7xl mx-auto flex items-center justify-between">
            <div class="flex items-center space-x-2">
                <i class="fas fa-play"></i>
                <span class="font-medium">Live Demo Mode - Exploring AssetShield Pro for ${lawFirm.firm_name}</span>
            </div>
            <div class="text-sm">
                <i class="fas fa-clock mr-1"></i>
                14-day trial expires in 13 days
            </div>
        </div>
    </div>

    <!-- Header -->
    <header class="bg-white shadow-sm border-b">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
                <div class="flex items-center space-x-4">
                    <div class="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <i class="fas fa-shield-alt text-white"></i>
                    </div>
                    <h1 class="text-xl font-bold text-gray-900">${lawFirm.firm_name}</h1>
                    <span class="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded">DEMO</span>
                </div>
                <nav class="hidden md:flex items-center space-x-6">
                    <a href="#dashboard" class="text-primary font-medium hover:text-blue-800 transition-colors">Dashboard</a>
                    <a href="#leads" class="text-gray-600 hover:text-primary transition-colors">Leads</a>
                    <a href="#analytics" class="text-gray-600 hover:text-primary transition-colors">Analytics</a>
                    <a href="#settings" class="text-gray-600 hover:text-primary transition-colors">Settings</a>
                    <button onclick="if(confirm('Exit demo and return to main site?')) { window.close(); }" class="bg-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-300 transition-colors">
                        <i class="fas fa-sign-out-alt mr-1"></i>
                        Exit Demo
                    </button>
                </nav>
                
                <!-- Mobile menu button -->
                <div class="md:hidden">
                    <button onclick="toggleMobileMenu()" class="text-gray-600 hover:text-primary p-2">
                        <i class="fas fa-bars text-lg"></i>
                    </button>
                </div>
            </div>
            
            <!-- Mobile menu -->
            <div id="mobileMenu" class="md:hidden border-t border-gray-200 hidden">
                <div class="px-4 pt-2 pb-3 space-y-1">
                    <a href="#dashboard" class="block text-primary font-medium py-2">Dashboard</a>
                    <a href="#leads" class="block text-gray-600 hover:text-primary py-2">Leads</a>
                    <a href="#analytics" class="block text-gray-600 hover:text-primary py-2">Analytics</a>
                    <a href="#settings" class="block text-gray-600 hover:text-primary py-2">Settings</a>
                    <button onclick="if(confirm('Exit demo and return to main site?')) { window.close(); }" class="block w-full text-left bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200 mt-3">
                        <i class="fas fa-sign-out-alt mr-1"></i>
                        Exit Demo
                    </button>
                </div>
            </div>
            </div>
        </div>
    </header>

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Welcome Message -->
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <div class="flex items-start">
                <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-4 mt-1">
                    <i class="fas fa-info-circle text-blue-600"></i>
                </div>
                <div>
                    <h3 class="text-lg font-semibold text-blue-900 mb-2">Welcome to Your AssetShield Pro Demo!</h3>
                    <p class="text-blue-700 mb-4">
                        You're now exploring a live version of the platform with sample data. This demonstrates exactly how 
                        AssetShield Pro would work for ${lawFirm.firm_name} with real client data and workflows.
                    </p>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div class="flex items-center text-blue-700">
                            <i class="fas fa-check mr-2"></i>
                            Sample client assessments
                        </div>
                        <div class="flex items-center text-blue-700">
                            <i class="fas fa-check mr-2"></i>
                            Real analytics dashboard
                        </div>
                        <div class="flex items-center text-blue-700">
                            <i class="fas fa-check mr-2"></i>
                            Complete workflow simulation
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Dashboard Overview -->
        <div class="mb-8">
            <h2 class="text-2xl font-bold text-gray-900 mb-6">Dashboard Overview</h2>
            
            <!-- Key Metrics -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center">
                        <div class="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                            <i class="fas fa-users text-blue-600 text-xl"></i>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">Total Leads</p>
                            <p class="text-2xl font-bold text-gray-900">${dashboardData.leadStats.total_leads}</p>
                            <p class="text-xs text-green-600">↑ 23% from last month</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center">
                        <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                            <i class="fas fa-chart-line text-green-600 text-xl"></i>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">Conversion Rate</p>
                            <p class="text-2xl font-bold text-gray-900">${((dashboardData.leadStats.converted_leads / dashboardData.leadStats.total_leads) * 100).toFixed(1)}%</p>
                            <p class="text-xs text-green-600">↑ 5.2% from last month</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center">
                        <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
                            <i class="fas fa-dollar-sign text-purple-600 text-xl"></i>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">Pipeline Value</p>
                            <p class="text-2xl font-bold text-gray-900">$${(dashboardData.leadStats.total_pipeline_value / 1000000).toFixed(1)}M</p>
                            <p class="text-xs text-green-600">↑ 18% from last month</p>
                        </div>
                    </div>
                </div>
                
                <div class="bg-white rounded-lg shadow p-6">
                    <div class="flex items-center">
                        <div class="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mr-4">
                            <i class="fas fa-shield-alt text-orange-600 text-xl"></i>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">Avg Risk Score</p>
                            <p class="text-2xl font-bold text-gray-900">${Math.round(dashboardData.leadStats.avg_risk_score)}</p>
                            <p class="text-xs text-red-600">↑ 2.1 from last month</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Charts Row -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <!-- Conversion Funnel -->
                <div class="bg-white rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Conversion Funnel (Demo Data)</h3>
                    <div class="chart-container">
                        <div class="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-8 h-full flex items-center justify-center">
                            <div class="text-center">
                                <i class="fas fa-chart-bar text-4xl text-blue-600 mb-4"></i>
                                <div class="space-y-2">
                                    <div class="flex items-center justify-between bg-white rounded p-2 shadow-sm">
                                        <span class="text-sm">Visitors</span>
                                        <span class="font-bold text-blue-600">450</span>
                                    </div>
                                    <div class="flex items-center justify-between bg-white rounded p-2 shadow-sm">
                                        <span class="text-sm">Started Assessment</span>
                                        <span class="font-bold text-blue-600">320</span>
                                    </div>
                                    <div class="flex items-center justify-between bg-white rounded p-2 shadow-sm">
                                        <span class="text-sm">Completed Assessment</span>
                                        <span class="font-bold text-blue-600">180</span>
                                    </div>
                                    <div class="flex items-center justify-between bg-white rounded p-2 shadow-sm">
                                        <span class="text-sm">Generated Lead</span>
                                        <span class="font-bold text-blue-600">95</span>
                                    </div>
                                    <div class="flex items-center justify-between bg-white rounded p-2 shadow-sm">
                                        <span class="text-sm">Consultation Booked</span>
                                        <span class="font-bold text-blue-600">42</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Lead Sources -->
                <div class="bg-white rounded-lg shadow p-6">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">Lead Sources (Demo Data)</h3>
                    <div class="chart-container">
                        <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-8 h-full">
                            <div class="space-y-3">
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center">
                                        <div class="w-4 h-4 bg-blue-600 rounded mr-3"></div>
                                        <span class="text-sm">Website Assessment</span>
                                    </div>
                                    <span class="font-bold">45%</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center">
                                        <div class="w-4 h-4 bg-blue-400 rounded mr-3"></div>
                                        <span class="text-sm">Referrals</span>
                                    </div>
                                    <span class="font-bold">25%</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center">
                                        <div class="w-4 h-4 bg-green-500 rounded mr-3"></div>
                                        <span class="text-sm">Social Media</span>
                                    </div>
                                    <span class="font-bold">15%</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center">
                                        <div class="w-4 h-4 bg-yellow-500 rounded mr-3"></div>
                                        <span class="text-sm">Search Ads</span>
                                    </div>
                                    <span class="font-bold">10%</span>
                                </div>
                                <div class="flex items-center justify-between">
                                    <div class="flex items-center">
                                        <div class="w-4 h-4 bg-red-500 rounded mr-3"></div>
                                        <span class="text-sm">Direct Contact</span>
                                    </div>
                                    <span class="font-bold">5%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Recent Leads Table -->
            <div class="bg-white rounded-lg shadow mb-8">
                <div class="px-6 py-4 border-b border-gray-200">
                    <h3 class="text-lg font-semibold text-gray-900">Recent Leads (Demo Data)</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Score</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Value</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${dashboardData.recentLeads.map(lead => `
                                <tr class="hover:bg-gray-50">
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="text-sm font-medium text-gray-900">${lead.contact_name}</div>
                                        <div class="text-sm text-gray-500">${lead.contact_email}</div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRiskScoreColor(lead.risk_score)}">
                                            ${lead.risk_score}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        $${(lead.estimated_value / 1000000).toFixed(1)}M
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(lead.status)}">
                                            ${lead.status}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        ${lead.assigned_attorney_name}
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        ${new Date(lead.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Action Cards -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-white rounded-lg shadow p-6">
                    <h4 class="font-semibold text-gray-900 mb-2">Explore Assessment Tool</h4>
                    <p class="text-gray-600 text-sm mb-4">See how clients assess their asset protection needs</p>
                    <button class="w-full bg-primary text-white py-2 px-4 rounded hover:opacity-90">
                        Try Assessment
                    </button>
                </div>
                
                <div class="bg-white rounded-lg shadow p-6">
                    <h4 class="font-semibold text-gray-900 mb-2">View Lead Pipeline</h4>
                    <p class="text-gray-600 text-sm mb-4">Manage and track your client leads</p>
                    <button class="w-full bg-primary text-white py-2 px-4 rounded hover:opacity-90">
                        View Leads
                    </button>
                </div>
                
                <div class="bg-white rounded-lg shadow p-6">
                    <h4 class="font-semibold text-gray-900 mb-2">Customize Platform</h4>
                    <p class="text-gray-600 text-sm mb-4">Brand the platform with your firm's identity</p>
                    <button class="w-full bg-primary text-white py-2 px-4 rounded hover:opacity-90">
                        Customize
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- Footer -->
    <footer class="bg-white border-t mt-16">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div class="text-center">
                <div class="flex items-center justify-center mb-4">
                    <div class="w-6 h-6 bg-primary rounded flex items-center justify-center mr-2">
                        <i class="fas fa-shield-alt text-white text-sm"></i>
                    </div>
                    <span class="font-semibold text-gray-900">AssetShield Pro Demo</span>
                </div>
                <p class="text-gray-600 text-sm mb-4">
                    This is a live demo with sample data. Experience the complete platform with real workflows and features.
                </p>
                <div class="flex items-center justify-center space-x-6 text-sm text-gray-500">
                    <span><i class="fas fa-clock mr-1"></i> 14-day trial remaining</span>
                    <span><i class="fas fa-database mr-1"></i> Sample data provided</span>
                    <span><i class="fas fa-shield-check mr-1"></i> Full feature access</span>
                </div>
                <div class="mt-6">
                    <button 
                        onclick="if(confirm('Ready to purchase AssetShield Pro? This will redirect you to our pricing page.')) { window.open('/#pricing', '_blank'); }"
                        class="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors mr-3"
                    >
                        <i class="fas fa-shopping-cart mr-2"></i>
                        Purchase Full Platform
                    </button>
                    <button 
                        onclick="if(confirm('Exit demo and return to main site?')) { window.close(); }"
                        class="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        <i class="fas fa-sign-out-alt mr-2"></i>
                        Exit Demo
                    </button>
                </div>
            </div>
        </div>
    </footer>

    <script>
        // Mobile menu toggle function
        function toggleMobileMenu() {
            const menu = document.getElementById('mobileMenu');
            menu.classList.toggle('hidden');
        }
        
        document.addEventListener('DOMContentLoaded', function() {
            console.log('Demo dashboard loaded successfully');
            
            // Add navigation functionality
            const navLinks = document.querySelectorAll('nav a, #mobileMenu a');
            navLinks.forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const text = this.textContent.trim();
                    
                    if (text === 'Dashboard') {
                        showDemoMessage('Dashboard', 'You\\'re currently viewing the main dashboard with key metrics, charts, and recent activity.');
                    } else if (text === 'Leads') {
                        showDemoMessage('Lead Management', 'This would show your complete lead pipeline with client details, risk scores, follow-up tasks, and conversion tracking.');
                    } else if (text === 'Analytics') {
                        showDemoMessage('Analytics Center', 'This would display detailed conversion funnels, ROI tracking, client acquisition costs, and performance metrics across all your marketing channels.');
                    } else if (text === 'Settings') {
                        showDemoMessage('Platform Settings', 'This would open your platform configuration including white-label branding, user management, integration settings, and billing preferences.');
                    }
                });
            });
            
            // Add hover effects to action cards
            const actionButtons = document.querySelectorAll('button[class*="bg-primary"], button[class*="bg-green"]');
            actionButtons.forEach(button => {
                button.addEventListener('click', function(e) {
                    if (this.textContent.includes('Try Assessment')) {
                        e.preventDefault();
                        showDemoMessage('Risk Assessment Tool', 'This would launch the interactive risk assessment where clients answer questions about their assets, business structure, and protection needs to receive a personalized risk score.');
                    } else if (this.textContent.includes('View Leads')) {
                        e.preventDefault();
                        showDemoMessage('Lead Pipeline', 'This would show your complete lead management system with client details, follow-up schedules, conversion tracking, and assignment management.');
                    } else if (this.textContent.includes('Customize')) {
                        e.preventDefault();
                        showDemoMessage('Platform Customization', 'This would open the white-label customization panel where you can upload your firm\\'s logo, set brand colors, customize content, and configure your domain.');
                    }
                });
            });
            
            // Add demo success message
            setTimeout(() => {
                if (!sessionStorage.getItem('demo_welcome_shown')) {
                    sessionStorage.setItem('demo_welcome_shown', 'true');
                    showWelcomeMessage();
                }
            }, 1000);
        });
        
        function showDemoMessage(title, message) {
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
            modal.innerHTML = \`
                <div class="bg-white rounded-xl max-w-md w-full p-6">
                    <div class="flex items-center justify-between mb-4">
                        <h3 class="text-lg font-semibold text-gray-900">\${title}</h3>
                        <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <p class="text-gray-600 mb-6">\${message}</p>
                    <div class="flex justify-end space-x-3">
                        <button onclick="this.closest('.fixed').remove()" class="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90">
                            Got it
                        </button>
                    </div>
                </div>
            \`;
            document.body.appendChild(modal);
            
            // Close on background click
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    modal.remove();
                }
            });
        }
        
        function showWelcomeMessage() {
            const banner = document.createElement('div');
            banner.className = 'fixed top-0 left-0 right-0 bg-green-600 text-white p-4 z-50 transform -translate-y-full transition-transform duration-500';
            banner.innerHTML = \`
                <div class="max-w-7xl mx-auto flex items-center justify-between">
                    <div class="flex items-center">
                        <i class="fas fa-check-circle mr-2"></i>
                        <span class="font-medium">Demo Access Confirmed! You\\'re now exploring AssetShield Pro with live sample data.</span>
                    </div>
                    <button onclick="this.parentElement.parentElement.style.display='none'" class="text-white hover:text-green-200">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            \`;
            document.body.appendChild(banner);
            
            // Slide down
            setTimeout(() => {
                banner.style.transform = 'translateY(0)';
            }, 100);
            
            // Auto hide after 5 seconds
            setTimeout(() => {
                banner.style.transform = 'translateY(-100%)';
                setTimeout(() => {
                    if (banner.parentNode) {
                        banner.parentNode.removeChild(banner);
                    }
                }, 500);
            }, 5000);
        }
    </script>
</body>
</html>`

  function getRiskScoreColor(score: number): string {
    if (score < 50) return 'bg-green-100 text-green-800'
    if (score < 75) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }
  
  function getStatusColor(status: string): string {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800'
      case 'qualified': return 'bg-green-100 text-green-800'
      case 'consultation': return 'bg-yellow-100 text-yellow-800'
      case 'converted': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }
}

export default dashboardRoutes