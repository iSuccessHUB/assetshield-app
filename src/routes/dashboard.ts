import { Hono } from 'hono'
import { SaaSPlatformService } from '../services/saas-platform'

interface CloudflareBindings {
  DB: D1Database;
}

export const dashboardRoutes = new Hono<{ Bindings: CloudflareBindings }>()

// Dashboard login page
dashboardRoutes.get('/login', async (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AssetShield Dashboard - Login</title>
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzJkNjNhNCIvPgo8cGF0aCBkPSJNMTYgNEw4IDEwVjE4TDE2IDI4TDI0IDE4VjEwTDE2IDRaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTYgOEwxMiAxMlYxOEwxNiAyMkwyMCAxOFYxMkwxNiA4WiIgZmlsbD0iIzJkNjNhNCIvPgo8L3N2Zz4=" />
        <link rel="apple-touch-icon" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDE4MCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxODAiIGhlaWdodD0iMTgwIiByeD0iNDAiIGZpbGw9IiMyZDYzYTQiLz4KPHBhdGggZD0iTTkwIDIwTDQ1IDUwVjEwMEw5MCA0NjBMMTM1IDEwMFY1MEw5MCAyMFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik05MCA0MEw2NyA2MFYxMDBMOTAgMTIwTDExMyAxMDBWNjBMOTAgNDBaIiBmaWxsPSIjMmQ2M2E0Ii8+Cjwvc3ZnPg==" />
        <link rel="shortcut icon" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzJkNjNhNCIvPgo8cGF0aCBkPSJNMTYgNEw4IDEwVjE4TDE2IDI4TDI0IDE4VjEwTDE2IDRaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTYgOEwxMiAxMlYxOEwxNiAyMkwyMCAxOFYxMkwxNiA4WiIgZmlsbD0iIzJkNjNhNCIvPgo8L3N2Zz4=" />
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    </head>
    <body class="bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 min-h-screen">
        <div class="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
            <div class="max-w-md w-full space-y-8">
                <div class="text-center">
                    <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-6">
                        <i class="fas fa-shield-alt text-blue-600 text-2xl"></i>
                    </div>
                    <h2 class="text-3xl font-bold text-white">AssetShield Dashboard</h2>
                    <p class="mt-2 text-blue-200">Sign in to manage your white-label platform</p>
                </div>
                
                <div class="bg-white rounded-xl shadow-2xl p-8">
                    <form id="loginForm" class="space-y-6">
                        <div>
                            <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
                                <i class="fas fa-envelope mr-2"></i>Email Address
                            </label>
                            <input id="email" name="email" type="email" required 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                   placeholder="your@lawfirm.com">
                        </div>
                        
                        <div>
                            <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
                                <i class="fas fa-lock mr-2"></i>Password
                            </label>
                            <input id="password" name="password" type="password" required 
                                   class="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                   placeholder="Enter your password">
                        </div>
                        
                        <div id="errorMessage" class="hidden bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm"></div>
                        
                        <button type="submit" id="loginButton"
                                class="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
                            <i class="fas fa-sign-in-alt mr-2"></i>
                            Sign In
                        </button>
                    </form>
                    
                    <div class="mt-6 text-center">
                        <p class="text-sm text-gray-600">
                            Don't have an account? 
                            <a href="/#pricing" class="font-medium text-blue-600 hover:text-blue-500">
                                Get started here
                            </a>
                        </p>
                    </div>
                </div>
                
                <div class="text-center">
                    <p class="text-xs text-blue-200">
                        Need help? Contact <a href="mailto:support@isuccesshub.com" class="underline">support@isuccesshub.com</a>
                    </p>
                </div>
            </div>
        </div>
        
        <script>
            document.getElementById('loginForm').addEventListener('submit', async function(e) {
                e.preventDefault();
                
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const button = document.getElementById('loginButton');
                const errorDiv = document.getElementById('errorMessage');
                
                // Hide previous errors
                errorDiv.classList.add('hidden');
                
                // Show loading state
                button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Signing in...';
                button.disabled = true;
                
                try {
                    const response = await fetch('/dashboard/api/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ email, password })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        // Store authentication token
                        localStorage.setItem('assetshield_token', result.token);
                        // Redirect to dashboard
                        window.location.href = '/dashboard';
                    } else {
                        errorDiv.textContent = result.error || 'Login failed. Please check your credentials.';
                        errorDiv.classList.remove('hidden');
                    }
                } catch (error) {
                    errorDiv.textContent = 'Network error. Please try again.';
                    errorDiv.classList.remove('hidden');
                } finally {
                    button.innerHTML = '<i class="fas fa-sign-in-alt mr-2"></i>Sign In';
                    button.disabled = false;
                }
            });
        </script>
    </body>
    </html>
  `);
});

// Dashboard main page
dashboardRoutes.get('/', async (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AssetShield Dashboard</title>
        <link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzJkNjNhNCIvPgo8cGF0aCBkPSJNMTYgNEw4IDEwVjE4TDE2IDI4TDI0IDE4VjEwTDE2IDRaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTYgOEwxMiAxMlYxOEwxNiAyMkwyMCAxOFYxMkwxNiA4WiIgZmlsbD0iIzJkNjNhNCIvPgo8L3N2Zz4=" />
        <link rel="apple-touch-icon" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDE4MCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxODAiIGhlaWdodD0iMTgwIiByeD0iNDAiIGZpbGw9IiMyZDYzYTQiLz4KPHBhdGggZD0iTTkwIDIwTDQ1IDUwVjEwMEw5MCA0NjBMMTM1IDEwMFY1MEw5MCAyMFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik05MCA0MEw2NyA2MFYxMDBMOTAgMTIwTDExMyAxMDBWNjBMOTAgNDBaIiBmaWxsPSIjMmQ2M2E0Ii8+Cjwvc3ZnPg==" />
        <link rel="shortcut icon" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzJkNjNhNCIvPgo8cGF0aCBkPSJNMTYgNEw4IDEwVjE4TDE2IDI4TDI0IDE4VjEwTDE2IDRaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTYgOEwxMiAxMlYxOEwxNiAyMkwyMCAxOFYxMkwxNiA4WiIgZmlsbD0iIzJkNjNhNCIvPgo8L3N2Zz4=" />
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    </head>
    <body class="bg-gray-50">
        <div id="app">
            <!-- Loading state -->
            <div id="loading" class="min-h-screen flex items-center justify-center">
                <div class="text-center">
                    <div class="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                        <i class="fas fa-shield-alt text-white text-2xl"></i>
                    </div>
                    <p class="text-gray-600">Loading your dashboard...</p>
                </div>
            </div>
        </div>
        
        <script>
            // Check authentication and load dashboard
            document.addEventListener('DOMContentLoaded', async function() {
                const token = localStorage.getItem('assetshield_token');
                
                if (!token) {
                    window.location.href = '/dashboard/login';
                    return;
                }
                
                try {
                    // Verify token and get customer data
                    const response = await fetch('/dashboard/api/me', {
                        headers: {
                            'Authorization': 'Bearer ' + token
                        }
                    });
                    
                    if (!response.ok) {
                        throw new Error('Authentication failed');
                    }
                    
                    const customer = await response.json();
                    loadDashboard(customer);
                    
                } catch (error) {
                    console.error('Authentication error:', error);
                    localStorage.removeItem('assetshield_token');
                    window.location.href = '/dashboard/login';
                }
            });
            
            function loadDashboard(customer) {
                document.getElementById('app').innerHTML = \`
                    <!-- Navigation -->
                    <nav class="bg-white border-b border-gray-200 px-4 py-4">
                        <div class="max-w-7xl mx-auto flex items-center justify-between">
                            <div class="flex items-center">
                                <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                                    <i class="fas fa-shield-alt text-white"></i>
                                </div>
                                <h1 class="text-xl font-semibold text-gray-900">AssetShield Dashboard</h1>
                            </div>
                            <div class="flex items-center space-x-4">
                                <span class="text-sm text-gray-600">Welcome, \${customer.owner_name}</span>
                                <div class="flex items-center space-x-1">
                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium \${
                                        customer.status === 'trial' ? 'bg-yellow-100 text-yellow-800' :
                                        customer.status === 'active' ? 'bg-green-100 text-green-800' :
                                        'bg-red-100 text-red-800'
                                    }">
                                        \${customer.status === 'trial' ? 'Trial' : customer.status}
                                    </span>
                                    <span class="text-xs text-gray-500">\${customer.tier}</span>
                                </div>
                                <button onclick="logout()" class="text-gray-500 hover:text-gray-700">
                                    <i class="fas fa-sign-out-alt"></i>
                                </button>
                            </div>
                        </div>
                    </nav>
                    
                    <!-- Main Content -->
                    <div class="max-w-7xl mx-auto py-6 px-4">
                        <!-- Stats Cards -->
                        <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            <div class="bg-white rounded-lg shadow p-6">
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                        <i class="fas fa-users text-blue-600"></i>
                                    </div>
                                    <div class="ml-4">
                                        <p class="text-sm font-medium text-gray-600">Total Leads</p>
                                        <p id="totalLeads" class="text-2xl font-semibold text-gray-900">-</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="bg-white rounded-lg shadow p-6">
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                        <i class="fas fa-clipboard-check text-green-600"></i>
                                    </div>
                                    <div class="ml-4">
                                        <p class="text-sm font-medium text-gray-600">Assessments</p>
                                        <p id="totalAssessments" class="text-2xl font-semibold text-gray-900">-</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="bg-white rounded-lg shadow p-6">
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                        <i class="fas fa-calendar-check text-purple-600"></i>
                                    </div>
                                    <div class="ml-4">
                                        <p class="text-sm font-medium text-gray-600">Consultations</p>
                                        <p id="totalConsultations" class="text-2xl font-semibold text-gray-900">-</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="bg-white rounded-lg shadow p-6">
                                <div class="flex items-center">
                                    <div class="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                        <i class="fas fa-globe text-orange-600"></i>
                                    </div>
                                    <div class="ml-4">
                                        <p class="text-sm font-medium text-gray-600">Domains</p>
                                        <p id="totalDomains" class="text-2xl font-semibold text-gray-900">-</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Tab Navigation -->
                        <div class="bg-white rounded-lg shadow">
                            <div class="border-b border-gray-200">
                                <nav class="-mb-px flex space-x-8 px-6">
                                    <button onclick="showTab('overview')" id="tab-overview" class="py-4 px-1 border-b-2 border-blue-500 font-medium text-sm text-blue-600">
                                        <i class="fas fa-chart-line mr-2"></i>Overview
                                    </button>
                                    <button onclick="showTab('branding')" id="tab-branding" class="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300">
                                        <i class="fas fa-palette mr-2"></i>Branding
                                    </button>
                                    <button onclick="showTab('domains')" id="tab-domains" class="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300">
                                        <i class="fas fa-globe mr-2"></i>Domains
                                    </button>
                                    <button onclick="showTab('leads')" id="tab-leads" class="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300">
                                        <i class="fas fa-users mr-2"></i>Leads
                                    </button>
                                    <button onclick="showTab('settings')" id="tab-settings" class="py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300">
                                        <i class="fas fa-cog mr-2"></i>Settings
                                    </button>
                                </nav>
                            </div>
                            
                            <!-- Tab Content -->
                            <div id="tabContent" class="p-6">
                                <!-- Content will be loaded here -->
                            </div>
                        </div>
                    </div>
                \`;
                
                // Load initial data
                loadDashboardData(customer);
                showTab('overview');
            }
            
            async function loadDashboardData(customer) {
                try {
                    const token = localStorage.getItem('assetshield_token');
                    
                    // Load analytics
                    const analyticsResponse = await fetch('/dashboard/api/analytics', {
                        headers: { 'Authorization': 'Bearer ' + token }
                    });
                    const analytics = await analyticsResponse.json();
                    
                    document.getElementById('totalLeads').textContent = analytics.totalLeads || 0;
                    document.getElementById('totalAssessments').textContent = analytics.completedAssessments || 0;
                    document.getElementById('totalConsultations').textContent = analytics.scheduledConsultations || 0;
                    
                    // Load domains
                    const domainsResponse = await fetch('/dashboard/api/domains', {
                        headers: { 'Authorization': 'Bearer ' + token }
                    });
                    const domains = await domainsResponse.json();
                    document.getElementById('totalDomains').textContent = domains.domains?.length || 0;
                    
                } catch (error) {
                    console.error('Error loading dashboard data:', error);
                }
            }
            
            function showTab(tabName) {
                // Update tab styles
                document.querySelectorAll('[id^="tab-"]').forEach(tab => {
                    tab.className = 'py-4 px-1 border-b-2 border-transparent font-medium text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300';
                });
                document.getElementById('tab-' + tabName).className = 'py-4 px-1 border-b-2 border-blue-500 font-medium text-sm text-blue-600';
                
                // Load tab content
                loadTabContent(tabName);
            }
            
            async function loadTabContent(tabName) {
                const content = document.getElementById('tabContent');
                
                switch(tabName) {
                    case 'overview':
                        content.innerHTML = \`
                            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <h3 class="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
                                    <div class="space-y-3">
                                        <div class="flex items-center p-3 bg-gray-50 rounded-lg">
                                            <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                                <i class="fas fa-user-plus text-green-600 text-sm"></i>
                                            </div>
                                            <div>
                                                <p class="text-sm font-medium text-gray-900">New lead captured</p>
                                                <p class="text-xs text-gray-500">2 hours ago</p>
                                            </div>
                                        </div>
                                        <div class="flex items-center p-3 bg-gray-50 rounded-lg">
                                            <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                                <i class="fas fa-clipboard-check text-blue-600 text-sm"></i>
                                            </div>
                                            <div>
                                                <p class="text-sm font-medium text-gray-900">Assessment completed</p>
                                                <p class="text-xs text-gray-500">5 hours ago</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <h3 class="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                                    <div class="space-y-3">
                                        <button onclick="showTab('branding')" class="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                                            <div class="flex items-center">
                                                <i class="fas fa-palette text-blue-600 mr-3"></i>
                                                <div>
                                                    <p class="font-medium text-blue-900">Customize Branding</p>
                                                    <p class="text-sm text-blue-600">Update logo, colors, and content</p>
                                                </div>
                                            </div>
                                        </button>
                                        <button onclick="showTab('domains')" class="w-full text-left p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                                            <div class="flex items-center">
                                                <i class="fas fa-globe text-green-600 mr-3"></i>
                                                <div>
                                                    <p class="font-medium text-green-900">Connect Domain</p>
                                                    <p class="text-sm text-green-600">Add your custom domain</p>
                                                </div>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        \`;
                        break;
                        
                    case 'branding':
                        content.innerHTML = \`
                            <div class="max-w-4xl">
                                <h3 class="text-lg font-medium text-gray-900 mb-6">White-Label Branding</h3>
                                
                                <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div class="space-y-6">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">Logo URL</label>
                                            <input type="url" id="logoUrl" class="w-full px-3 py-2 border border-gray-300 rounded-lg" 
                                                   placeholder="https://example.com/logo.png">
                                            <p class="text-xs text-gray-500 mt-1">Upload your logo and paste the URL here</p>
                                        </div>
                                        
                                        <div class="grid grid-cols-3 gap-4">
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
                                                <input type="color" id="primaryColor" value="#2563eb" class="w-full h-10 border border-gray-300 rounded-lg">
                                            </div>
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Secondary Color</label>
                                                <input type="color" id="secondaryColor" value="#1d4ed8" class="w-full h-10 border border-gray-300 rounded-lg">
                                            </div>
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Accent Color</label>
                                                <input type="color" id="accentColor" value="#10b981" class="w-full h-10 border border-gray-300 rounded-lg">
                                            </div>
                                        </div>
                                        
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">Hero Title</label>
                                            <input type="text" id="heroTitle" class="w-full px-3 py-2 border border-gray-300 rounded-lg" 
                                                   placeholder="Protect Your Assets with [Firm Name]">
                                        </div>
                                        
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">Hero Subtitle</label>
                                            <textarea id="heroSubtitle" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg" 
                                                      placeholder="Professional asset protection strategies..."></textarea>
                                        </div>
                                        
                                        <button onclick="saveBranding()" class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                                            <i class="fas fa-save mr-2"></i>Save Changes
                                        </button>
                                    </div>
                                    
                                    <div class="bg-gray-50 rounded-lg p-6">
                                        <h4 class="font-medium text-gray-900 mb-4">Live Preview</h4>
                                        <div class="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                                            <div class="text-center">
                                                <div id="previewLogo" class="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                                                    <i class="fas fa-shield-alt text-white"></i>
                                                </div>
                                                <h3 id="previewTitle" class="text-lg font-bold text-gray-900 mb-2">Protect Your Assets</h3>
                                                <p id="previewSubtitle" class="text-sm text-gray-600">Professional asset protection strategies</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        \`;
                        break;
                        
                    case 'domains':
                        content.innerHTML = \`
                            <div class="max-w-4xl">
                                <div class="flex items-center justify-between mb-6">
                                    <h3 class="text-lg font-medium text-gray-900">Domain Management</h3>
                                    <button onclick="addDomain()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                                        <i class="fas fa-plus mr-2"></i>Add Domain
                                    </button>
                                </div>
                                
                                <div id="domainsList" class="space-y-4">
                                    <div class="text-center py-8 text-gray-500">
                                        <i class="fas fa-globe text-4xl mb-4"></i>
                                        <p>Loading domains...</p>
                                    </div>
                                </div>
                            </div>
                        \`;
                        loadDomains();
                        break;
                        
                    case 'leads':
                        content.innerHTML = \`
                            <div class="max-w-6xl">
                                <h3 class="text-lg font-medium text-gray-900 mb-6">Client Leads</h3>
                                
                                <div id="leadsList" class="bg-white rounded-lg border border-gray-200">
                                    <div class="text-center py-8 text-gray-500">
                                        <i class="fas fa-users text-4xl mb-4"></i>
                                        <p>Loading leads...</p>
                                    </div>
                                </div>
                            </div>
                        \`;
                        loadLeads();
                        break;
                        
                    case 'settings':
                        content.innerHTML = \`
                            <div class="max-w-4xl space-y-8">
                                <div>
                                    <h3 class="text-lg font-medium text-gray-900 mb-6">Account Settings</h3>
                                    
                                    <div class="bg-white border border-gray-200 rounded-lg p-6">
                                        <h4 class="font-medium text-gray-900 mb-4">Account Information</h4>
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Firm Name</label>
                                                <input type="text" value="\${customer.firm_name}" class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" readonly>
                                            </div>
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Owner Name</label>
                                                <input type="text" value="\${customer.owner_name}" class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" readonly>
                                            </div>
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                                                <input type="email" value="\${customer.owner_email}" class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" readonly>
                                            </div>
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Plan</label>
                                                <input type="text" value="\${customer.tier}" class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50" readonly>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <h4 class="font-medium text-gray-900 mb-4">API Access</h4>
                                    <div class="bg-white border border-gray-200 rounded-lg p-6">
                                        <div class="flex items-center justify-between">
                                            <div>
                                                <p class="font-medium text-gray-900">API Key</p>
                                                <p class="text-sm text-gray-500">Use this key to access the AssetShield API</p>
                                            </div>
                                            <button onclick="showApiKey()" class="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors">
                                                <i class="fas fa-eye mr-2"></i>Show Key
                                            </button>
                                        </div>
                                        <div id="apiKeyDisplay" class="hidden mt-4 p-3 bg-gray-50 rounded-lg font-mono text-sm break-all">
                                            \${customer.api_key}
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="pt-6 border-t border-gray-200">
                                    <button onclick="logout()" class="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors">
                                        <i class="fas fa-sign-out-alt mr-2"></i>Sign Out
                                    </button>
                                </div>
                            </div>
                        \`;
                        break;
                }
            }
            
            async function loadDomains() {
                try {
                    const token = localStorage.getItem('assetshield_token');
                    const response = await fetch('/dashboard/api/domains', {
                        headers: { 'Authorization': 'Bearer ' + token }
                    });
                    const result = await response.json();
                    
                    const domainsList = document.getElementById('domainsList');
                    
                    if (result.domains && result.domains.length > 0) {
                        domainsList.innerHTML = result.domains.map(domain => \`
                            <div class="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                                <div>
                                    <p class="font-medium text-gray-900">\${domain.domain}</p>
                                    <div class="flex items-center space-x-4 mt-1">
                                        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium \${
                                            domain.verification_status === 'verified' ? 'bg-green-100 text-green-800' :
                                            domain.verification_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-red-100 text-red-800'
                                        }">
                                            \${domain.verification_status}
                                        </span>
                                        \${domain.is_primary ? '<span class="text-xs text-blue-600 font-medium">Primary</span>' : ''}
                                    </div>
                                </div>
                                <div class="flex items-center space-x-2">
                                    \${domain.verification_status === 'verified' ? 
                                        \`<a href="https://\${domain.domain}" target="_blank" class="text-blue-600 hover:text-blue-800">
                                            <i class="fas fa-external-link-alt"></i>
                                        </a>\` : 
                                        \`<button onclick="verifyDomain('\${domain.domain}')" class="text-orange-600 hover:text-orange-800">
                                            <i class="fas fa-check-circle"></i>
                                        </button>\`
                                    }
                                </div>
                            </div>
                        \`).join('');
                    } else {
                        domainsList.innerHTML = \`
                            <div class="text-center py-8 text-gray-500">
                                <i class="fas fa-globe text-4xl mb-4"></i>
                                <p class="mb-4">No domains connected yet</p>
                                <button onclick="addDomain()" class="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                                    <i class="fas fa-plus mr-2"></i>Add Your First Domain
                                </button>
                            </div>
                        \`;
                    }
                } catch (error) {
                    console.error('Error loading domains:', error);
                }
            }
            
            async function loadLeads() {
                try {
                    const token = localStorage.getItem('assetshield_token');
                    const response = await fetch('/dashboard/api/leads', {
                        headers: { 'Authorization': 'Bearer ' + token }
                    });
                    const result = await response.json();
                    
                    const leadsList = document.getElementById('leadsList');
                    
                    if (result.leads && result.leads.length > 0) {
                        leadsList.innerHTML = \`
                            <div class="overflow-x-auto">
                                <table class="min-w-full divide-y divide-gray-200">
                                    <thead class="bg-gray-50">
                                        <tr>
                                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Score</th>
                                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody class="bg-white divide-y divide-gray-200">
                                        \${result.leads.map(lead => \`
                                            <tr>
                                                <td class="px-6 py-4 whitespace-nowrap">
                                                    <div>
                                                        <div class="text-sm font-medium text-gray-900">\${lead.client_name}</div>
                                                        <div class="text-sm text-gray-500">\${lead.client_email}</div>
                                                    </div>
                                                </td>
                                                <td class="px-6 py-4 whitespace-nowrap">
                                                    <div class="flex items-center">
                                                        <span class="text-sm font-medium text-gray-900">\${lead.risk_score}/100</span>
                                                        <span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium \${
                                                            lead.risk_level === 'high' ? 'bg-red-100 text-red-800' :
                                                            lead.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-green-100 text-green-800'
                                                        }">
                                                            \${lead.risk_level}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td class="px-6 py-4 whitespace-nowrap">
                                                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium \${
                                                        lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                                                        lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                                                        lead.status === 'consultation_scheduled' ? 'bg-purple-100 text-purple-800' :
                                                        lead.status === 'converted' ? 'bg-green-100 text-green-800' :
                                                        'bg-gray-100 text-gray-800'
                                                    }">
                                                        \${lead.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    \${new Date(lead.created_at).toLocaleDateString()}
                                                </td>
                                                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                    <button onclick="viewLead(\${lead.id})" class="text-blue-600 hover:text-blue-900">View</button>
                                                </td>
                                            </tr>
                                        \`).join('')}
                                    </tbody>
                                </table>
                            </div>
                        \`;
                    } else {
                        leadsList.innerHTML = \`
                            <div class="text-center py-8 text-gray-500">
                                <i class="fas fa-users text-4xl mb-4"></i>
                                <p>No leads yet</p>
                                <p class="text-sm mt-2">Leads will appear here when visitors complete assessments on your white-label sites</p>
                            </div>
                        \`;
                    }
                } catch (error) {
                    console.error('Error loading leads:', error);
                }
            }
            
            function logout() {
                localStorage.removeItem('assetshield_token');
                window.location.href = '/dashboard/login';
            }
            
            function showApiKey() {
                const display = document.getElementById('apiKeyDisplay');
                display.classList.toggle('hidden');
            }
            
            async function addDomain() {
                const domain = prompt('Enter your domain name (e.g., mylawfirm.com):');
                if (!domain) return;
                
                try {
                    const token = localStorage.getItem('assetshield_token');
                    if (!token) {
                        alert('Please log in again');
                        return;
                    }
                    
                    // Clean domain input
                    const cleanDomain = domain.toLowerCase().replace(/^https?:\\/\\//, '').replace(/\\/.*$/, '');
                    
                    console.log('Adding domain:', cleanDomain);
                    
                    const response = await fetch('/dashboard/api/domains/add', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + token
                        },
                        body: JSON.stringify({ domain: cleanDomain, isPrimary: false })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        alert('Domain added successfully! You can now verify it.');
                        // Reload domains list
                        loadDomains();
                    } else {
                        throw new Error(result.error || 'Failed to add domain');
                    }
                    
                } catch (error) {
                    console.error('Error adding domain:', error);
                    alert('Failed to add domain. Please check the domain name and try again.');
                }
            }
            
            async function verifyDomain(domain) {
                try {
                    const token = localStorage.getItem('assetshield_token');
                    if (!token) {
                        alert('Please log in again');
                        return;
                    }
                    
                    console.log('Verifying domain:', domain);
                    
                    // Show verification instructions
                    const shouldProceed = confirm(\`To verify "\${domain}", you need to:
                    
1. Add a CNAME record pointing to your AssetShield deployment
2. Ensure the domain is publicly accessible
3. Click OK to proceed with verification

Continue?\`);
                    
                    if (!shouldProceed) return;
                    
                    const response = await fetch('/dashboard/api/domains/verify', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + token
                        },
                        body: JSON.stringify({ domain })
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        alert('Domain verified successfully! It may take a few minutes to propagate.');
                        // Reload domains list
                        loadDomains();
                    } else {
                        alert('Domain verification failed. Please check your DNS settings and try again.');
                    }
                    
                } catch (error) {
                    console.error('Error verifying domain:', error);
                    alert('Failed to verify domain. Please try again.');
                }
            }
            
            function viewLead(leadId) {
                alert('Lead details view coming soon!');
            }
            
            async function saveBranding() {
                try {
                    const token = localStorage.getItem('assetshield_token');
                    if (!token) {
                        alert('Please log in again');
                        return;
                    }
                    
                    // Collect branding data from form inputs
                    const brandingData = {
                        logoUrl: document.getElementById('logoUrl')?.value || '',
                        primaryColor: document.getElementById('primaryColor')?.value || '#2563eb',
                        secondaryColor: document.getElementById('secondaryColor')?.value || '#1d4ed8',
                        accentColor: document.getElementById('accentColor')?.value || '#10b981',
                        heroTitle: document.getElementById('heroTitle')?.value || '',
                        heroSubtitle: document.getElementById('heroSubtitle')?.value || ''
                    };
                    
                    console.log('Saving branding configuration:', brandingData);
                    
                    // Show loading state
                    const button = event.target;
                    const originalText = button.innerHTML;
                    button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
                    button.disabled = true;
                    
                    // Send to API
                    const response = await fetch('/dashboard/api/branding/save', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': 'Bearer ' + token
                        },
                        body: JSON.stringify(brandingData)
                    });
                    
                    const result = await response.json();
                    
                    if (result.success) {
                        // Show success message
                        button.innerHTML = '<i class="fas fa-check mr-2"></i>Saved!';
                        button.classList.remove('bg-blue-600', 'hover:bg-blue-700');
                        button.classList.add('bg-green-600');
                        
                        // Reset button after 2 seconds
                        setTimeout(() => {
                            button.innerHTML = originalText;
                            button.classList.remove('bg-green-600');
                            button.classList.add('bg-blue-600', 'hover:bg-blue-700');
                            button.disabled = false;
                        }, 2000);
                        
                        // Update live preview
                        updateBrandingPreview();
                        
                    } else {
                        throw new Error(result.error || 'Failed to save branding');
                    }
                    
                } catch (error) {
                    console.error('Error saving branding:', error);
                    alert('Failed to save branding configuration. Please try again.');
                    
                    // Reset button
                    const button = event.target;
                    button.innerHTML = '<i class="fas fa-save mr-2"></i>Save Changes';
                    button.disabled = false;
                }
            }
            
            function updateBrandingPreview() {
                const logoUrl = document.getElementById('logoUrl')?.value;
                const primaryColor = document.getElementById('primaryColor')?.value;
                const heroTitle = document.getElementById('heroTitle')?.value;
                const heroSubtitle = document.getElementById('heroSubtitle')?.value;
                
                // Update preview elements
                const previewLogo = document.getElementById('previewLogo');
                const previewTitle = document.getElementById('previewTitle');
                const previewSubtitle = document.getElementById('previewSubtitle');
                
                if (logoUrl && previewLogo) {
                    previewLogo.innerHTML = \`<img src="\${logoUrl}" alt="Logo" class="w-full h-full object-contain rounded-lg">\`;
                } else if (previewLogo) {
                    previewLogo.innerHTML = '<i class="fas fa-shield-alt text-white"></i>';
                    if (primaryColor) {
                        previewLogo.style.backgroundColor = primaryColor;
                    }
                }
                
                if (previewTitle && heroTitle) {
                    previewTitle.textContent = heroTitle;
                    if (primaryColor) {
                        previewTitle.style.color = primaryColor;
                    }
                }
                
                if (previewSubtitle && heroSubtitle) {
                    previewSubtitle.textContent = heroSubtitle;
                }
            }
            
            // Add real-time preview updates
            document.addEventListener('DOMContentLoaded', function() {
                // Add event listeners for real-time preview updates
                const inputs = ['logoUrl', 'primaryColor', 'heroTitle', 'heroSubtitle'];
                inputs.forEach(inputId => {
                    const input = document.getElementById(inputId);
                    if (input) {
                        input.addEventListener('input', updateBrandingPreview);
                    }
                });
            });
        </script>
    </body>
    </html>
  `);
});

// API Routes
dashboardRoutes.post('/api/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    
    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }
    
    const saasService = new SaaSPlatformService(c.env.DB);
    const customer = await saasService.authenticateCustomer(email, password);
    
    if (!customer) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }
    
    // Generate simple token (in production, use JWT)
    const token = Buffer.from(`${customer.id}:${Date.now()}`).toString('base64');
    
    return c.json({ 
      success: true, 
      token,
      customer: {
        id: customer.id,
        firmName: customer.firm_name,
        ownerName: customer.owner_name,
        tier: customer.tier,
        status: customer.status
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

// Verify token and get customer data
dashboardRoutes.get('/api/me', async (c) => {
  try {
    const authHeader = c.req.header('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Authentication required' }, 401);
    }
    
    const token = authHeader.substring(7);
    const [customerId] = Buffer.from(token, 'base64').toString().split(':');
    
    const saasService = new SaaSPlatformService(c.env.DB);
    const customer = await c.env.DB.prepare(`
      SELECT * FROM customers WHERE id = ?
    `).bind(parseInt(customerId)).first();
    
    if (!customer) {
      return c.json({ error: 'Customer not found' }, 404);
    }
    
    return c.json(customer);
    
  } catch (error) {
    console.error('Authentication error:', error);
    return c.json({ error: 'Authentication failed' }, 401);
  }
});

// Get customer analytics
dashboardRoutes.get('/api/analytics', async (c) => {
  try {
    const authHeader = c.req.header('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Authentication required' }, 401);
    }
    
    const token = authHeader.substring(7);
    const [customerId] = Buffer.from(token, 'base64').toString().split(':');
    
    const saasService = new SaaSPlatformService(c.env.DB);
    const analytics = await saasService.getCustomerAnalytics(parseInt(customerId));
    
    return c.json(analytics);
    
  } catch (error) {
    console.error('Analytics error:', error);
    return c.json({ error: 'Failed to load analytics' }, 500);
  }
});

// Get customer domains
dashboardRoutes.get('/api/domains', async (c) => {
  try {
    const authHeader = c.req.header('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Authentication required' }, 401);
    }
    
    const token = authHeader.substring(7);
    const [customerId] = Buffer.from(token, 'base64').toString().split(':');
    
    const saasService = new SaaSPlatformService(c.env.DB);
    const domains = await saasService.getCustomerDomains(parseInt(customerId));
    
    return c.json({ domains: domains.results });
    
  } catch (error) {
    console.error('Domains error:', error);
    return c.json({ error: 'Failed to load domains' }, 500);
  }
});

// Get customer leads
dashboardRoutes.get('/api/leads', async (c) => {
  try {
    const authHeader = c.req.header('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Authentication required' }, 401);
    }
    
    const token = authHeader.substring(7);
    const [customerId] = Buffer.from(token, 'base64').toString().split(':');
    
    const saasService = new SaaSPlatformService(c.env.DB);
    const leads = await saasService.getCustomerLeads(parseInt(customerId));
    
    return c.json({ leads: leads.results });
    
  } catch (error) {
    console.error('Leads error:', error);
    return c.json({ error: 'Failed to load leads' }, 500);
  }
});

// Save branding configuration
dashboardRoutes.post('/api/branding/save', async (c) => {
  try {
    const authHeader = c.req.header('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Authentication required' }, 401);
    }
    
    const token = authHeader.substring(7);
    const [customerId] = Buffer.from(token, 'base64').toString().split(':');
    
    const brandingData = await c.req.json();
    
    const saasService = new SaaSPlatformService(c.env.DB);
    await saasService.updateWhiteLabelConfig(parseInt(customerId), brandingData);
    
    return c.json({ success: true, message: 'Branding configuration saved successfully' });
    
  } catch (error) {
    console.error('Branding save error:', error);
    return c.json({ error: 'Failed to save branding configuration' }, 500);
  }
});

// Add domain to customer account
dashboardRoutes.post('/api/domains/add', async (c) => {
  try {
    const authHeader = c.req.header('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Authentication required' }, 401);
    }
    
    const token = authHeader.substring(7);
    const [customerId] = Buffer.from(token, 'base64').toString().split(':');
    
    const { domain, isPrimary } = await c.req.json();
    
    if (!domain) {
      return c.json({ error: 'Domain is required' }, 400);
    }
    
    const saasService = new SaaSPlatformService(c.env.DB);
    await saasService.addCustomerDomain(parseInt(customerId), domain, isPrimary || false);
    
    return c.json({ success: true, message: 'Domain added successfully' });
    
  } catch (error) {
    console.error('Domain add error:', error);
    return c.json({ error: 'Failed to add domain' }, 500);
  }
});

// Verify domain ownership
dashboardRoutes.post('/api/domains/verify', async (c) => {
  try {
    const authHeader = c.req.header('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Authentication required' }, 401);
    }
    
    const token = authHeader.substring(7);
    const [customerId] = Buffer.from(token, 'base64').toString().split(':');
    
    const { domain } = await c.req.json();
    
    if (!domain) {
      return c.json({ error: 'Domain is required' }, 400);
    }
    
    const saasService = new SaaSPlatformService(c.env.DB);
    const verified = await saasService.verifyDomain(parseInt(customerId), domain);
    
    return c.json({ 
      success: verified, 
      message: verified ? 'Domain verified successfully' : 'Domain verification failed' 
    });
    
  } catch (error) {
    console.error('Domain verification error:', error);
    return c.json({ error: 'Failed to verify domain' }, 500);
  }
});

export default dashboardRoutes