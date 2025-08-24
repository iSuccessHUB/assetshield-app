import { Hono } from 'hono'
import type { CloudflareBindings } from '../types'

const app = new Hono<{ Bindings: CloudflareBindings }>()

// Marketing landing page - Ultimate sales page for AssetShield SaaS platform
app.get('/', (c) => {
  return c.html(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AssetShield App - White-Label Asset Protection Platform for Law Firms</title>
    <meta name="description" content="Launch your own branded asset protection platform in 24 hours. Complete SaaS solution with client portal, risk assessments, and enterprise tools. Starting at $5K setup + $500/month.">
    <meta name="keywords" content="white-label asset protection software, law firm SaaS, client portal platform, asset protection tools, legal technology">
    
    <!-- Favicon -->
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzJkNjNhNCIvPgo8cGF0aCBkPSJNMTYgNEw4IDEwVjE4TDE2IDI4TDI0IDE4VjEwTDE2IDRaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTYgOEwxMiAxMlYxOEwxNiAyMkwyMCAxOFYxMkwxNiA4WiIgZmlsbD0iIzJkNjNhNCIvPgo8L3N2Zz4=" />
    <link rel="apple-touch-icon" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTgwIiBoZWlnaHQ9IjE4MCIgdmlld0JveD0iMCAwIDE4MCAxODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxODAiIGhlaWdodD0iMTgwIiByeD0iNDAiIGZpbGw9IiMyZDYzYTQiLz4KPHBhdGggZD0iTTkwIDIwTDQ1IDUwVjEwMEw5MCA0NjBMMTM1IDEwMFY1MEw5MCAyMFoiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik05MCA0MEw2NyA2MFYxMDBMOTAgMTIwTDExMyAxMDBWNjBMOTAgNDBaIiBmaWxsPSIjMmQ2M2E0Ii8+Cjwvc3ZnPg==" />
    <link rel="shortcut icon" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzJkNjNhNCIvPgo8cGF0aCBkPSJNMTYgNEw4IDEwVjE4TDE2IDI4TDI0IDE4VjEwTDE2IDRaIiBmaWxsPSJ3aGl0ZSIvPgo8cGF0aCBkPSJNMTYgOEwxMiAxMlYxOEwxNiAyMkwyMCAxOFYxMkwxNiA4WiIgZmlsbD0iIzJkNjNhNCIvPgo8L3N2Zz4=" />
    
    <!-- Open Graph Meta Tags -->
    <meta property="og:title" content="AssetShield App - White-Label Asset Protection Platform for Law Firms">
    <meta property="og:description" content="Launch your own branded asset protection platform in 24 hours. Complete SaaS solution starting at $5K setup + $500/month.">
    <meta property="og:type" content="website">
    <meta property="og:image" content="/static/assetshield-social-preview.jpg">
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="AssetShield App - White-Label Asset Protection Platform">
    <meta name="twitter:description" content="Launch your own branded asset protection platform in 24 hours. Starting at $5K setup + $500/month.">
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
    
    <!-- Icons -->
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
    
    <!-- TailwindCSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Chart.js for interactive charts -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    
    <!-- AOS Animation Library -->
    <link href="https://cdn.jsdelivr.net/npm/aos@2.3.1/dist/aos.css" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/aos@2.3.1/dist/aos.js"></script>
    
    <!-- Custom Styles -->
    <style>
        body { font-family: 'Inter', sans-serif; }
        
        /* Gradient Background Animation */
        .gradient-bg {
            background: linear-gradient(-45deg, #1e3a8a, #3b82f6, #6366f1, #8b5cf6);
            background-size: 400% 400%;
            animation: gradientShift 15s ease infinite;
        }
        
        @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        
        /* Floating Animation */
        .float {
            animation: float 6s ease-in-out infinite;
        }
        
        @keyframes float {
            0% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
            100% { transform: translateY(0px); }
        }
        
        /* Pulse Animation for CTAs */
        .pulse-cta {
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(59, 130, 246, 0); }
            100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        
        /* Stats Counter Animation */
        .stat-number {
            font-variant-numeric: tabular-nums;
            transition: all 0.3s ease;
        }
        
        /* Testimonial Carousel */
        .testimonial-slide {
            min-width: 100%;
            transition: transform 0.5s ease-in-out;
        }
        
        /* Pricing Card Hover Effects */
        .pricing-card {
            transition: all 0.3s ease;
            border: 2px solid transparent;
        }
        
        .pricing-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
        }
        
        .pricing-card.featured {
            border-color: #3b82f6;
            transform: scale(1.05);
        }
        
        /* ROI Calculator Styles */
        .calculator-container {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        /* Trust Badge Styles */
        .trust-badge {
            backdrop-filter: blur(10px);
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        /* Video Modal Styles */
        .video-modal {
            background: rgba(0, 0, 0, 0.9);
            backdrop-filter: blur(5px);
        }
        
        /* Mobile Responsive Adjustments */
        @media (max-width: 768px) {
            .pricing-card.featured {
                transform: none;
            }
        }
        
        /* Smooth Scroll */
        html {
            scroll-behavior: smooth;
        }
        
        /* Custom Scrollbar */
        ::-webkit-scrollbar {
            width: 8px;
        }
        
        ::-webkit-scrollbar-track {
            background: #f1f5f9;
        }
        
        ::-webkit-scrollbar-thumb {
            background: #3b82f6;
            border-radius: 4px;
        }
    </style>
</head>
<body class="antialiased">
    <!-- Navigation -->
    <nav class="fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 border-b border-gray-100">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
                <!-- Logo -->
                <div class="flex items-center">
                    <div class="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                        <i class="fas fa-shield-alt text-white text-lg"></i>
                    </div>
                    <span class="text-xl font-bold text-gray-900">AssetShield App</span>
                </div>
                
                <!-- Desktop Navigation -->
                <div class="hidden md:flex items-center space-x-8">
                    <a href="#features" class="text-gray-600 hover:text-blue-600 transition-colors">Features</a>
                    <a href="#pricing" class="text-gray-600 hover:text-blue-600 transition-colors">Pricing</a>
                    <a href="/#assessment" class="text-gray-600 hover:text-blue-600 transition-colors">Try Demo</a>
                    <a href="#testimonials" class="text-gray-600 hover:text-blue-600 transition-colors">Reviews</a>
                    <a href="#contact" class="text-gray-600 hover:text-blue-600 transition-colors">Contact</a>
                    <button onclick="scrollToPricing()" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        Get Started
                    </button>
                </div>
                
                <!-- Mobile Menu Button -->
                <button id="mobile-menu-btn" class="md:hidden">
                    <i class="fas fa-bars text-gray-600"></i>
                </button>
            </div>
        </div>
        
        <!-- Mobile Menu -->
        <div id="mobile-menu" class="hidden md:hidden bg-white border-t border-gray-100">
            <div class="px-4 py-4 space-y-3">
                <a href="#features" class="block text-gray-600 hover:text-blue-600">Features</a>
                <a href="#pricing" class="block text-gray-600 hover:text-blue-600">Pricing</a>
                <a href="/#assessment" class="block text-gray-600 hover:text-blue-600">Try Demo</a>
                <a href="#testimonials" class="block text-gray-600 hover:text-blue-600">Reviews</a>
                <a href="#contact" class="block text-gray-600 hover:text-blue-600">Contact</a>
                <button onclick="scrollToPricing()" class="w-full bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Get Started
                </button>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <section class="pt-16 gradient-bg min-h-screen flex items-center relative overflow-hidden">
        <!-- Floating Background Elements -->
        <div class="absolute inset-0">
            <div class="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full float"></div>
            <div class="absolute top-40 right-20 w-32 h-32 bg-white/5 rounded-full float" style="animation-delay: 2s;"></div>
            <div class="absolute bottom-20 left-1/4 w-16 h-16 bg-white/10 rounded-full float" style="animation-delay: 4s;"></div>
        </div>
        
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div class="grid lg:grid-cols-2 gap-12 items-center">
                <!-- Hero Content -->
                <div class="text-white" data-aos="fade-right">
                    <!-- Trust Badge -->
                    <div class="inline-flex items-center trust-badge rounded-full px-4 py-2 mb-6">
                        <i class="fas fa-check-circle text-green-400 mr-2"></i>
                        <span class="text-sm">Trusted by 500+ Law Firms Worldwide</span>
                    </div>
                    
                    <h1 class="text-4xl md:text-6xl font-bold leading-tight mb-6">
                        Launch Your Own
                        <span class="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                            Branded Asset Protection Platform
                        </span>
                        in 24 Hours
                    </h1>
                    
                    <p class="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed">
                        Complete white-label SaaS solution with client portals, risk assessments, payment processing, and enterprise-grade security. No coding required.
                    </p>
                    
                    <!-- Key Benefits -->
                    <div class="grid md:grid-cols-2 gap-4 mb-8">
                        <div class="flex items-center">
                            <i class="fas fa-rocket text-yellow-400 mr-3"></i>
                            <span>24-hour setup</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-paint-brush text-yellow-400 mr-3"></i>
                            <span>Fully branded</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-users text-yellow-400 mr-3"></i>
                            <span>Unlimited clients</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-headset text-yellow-400 mr-3"></i>
                            <span>24/7 support</span>
                        </div>
                    </div>
                    
                    <!-- Hero CTAs -->
                    <div class="flex flex-col sm:flex-row gap-4">
                        <button onclick="scrollToPricing()" class="bg-gradient-to-r from-orange-500 to-red-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-orange-600 hover:to-red-700 transition-all transform hover:scale-105 pulse-cta">
                            <i class="fas fa-rocket mr-2"></i>
                            Start Your Platform Today
                        </button>
                        <button onclick="window.location.href='/#assessment'" class="bg-white/20 backdrop-blur-md text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-white/30 transition-all border border-white/30">
                            <i class="fas fa-play mr-2"></i>
                            Try the Demo
                        </button>
                    </div>
                    
                    <!-- Social Proof Numbers -->
                    <div class="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-white/20">
                        <div class="text-center">
                            <div class="stat-number text-3xl font-bold text-yellow-400" data-target="500">0</div>
                            <div class="text-blue-200 text-sm">Active Law Firms</div>
                        </div>
                        <div class="text-center">
                            <div class="stat-number text-3xl font-bold text-yellow-400" data-target="50000">0</div>
                            <div class="text-blue-200 text-sm">Client Assessments</div>
                        </div>
                        <div class="text-center">
                            <div class="stat-number text-3xl font-bold text-yellow-400" data-target="99">0</div>
                            <div class="text-blue-200 text-sm">% Uptime SLA</div>
                        </div>
                    </div>
                </div>
                
                <!-- Hero Visual -->
                <div class="relative" data-aos="fade-left">
                    <!-- Dashboard Preview -->
                    <div class="bg-white rounded-2xl shadow-2xl p-6 transform rotate-3 hover:rotate-0 transition-transform duration-500">
                        <div class="flex items-center mb-4">
                            <div class="flex space-x-2">
                                <div class="w-3 h-3 bg-red-500 rounded-full"></div>
                                <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                            </div>
                            <div class="flex-1 text-center">
                                <div class="bg-gray-100 rounded-lg px-4 py-1 text-sm text-gray-600">
                                    yourlawfirm.assetshield.com
                                </div>
                            </div>
                        </div>
                        
                        <!-- Mock Dashboard Content -->
                        <div class="space-y-4">
                            <div class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 rounded-lg">
                                <h3 class="font-semibold">Asset Protection Dashboard</h3>
                                <p class="text-blue-100 text-sm">Your Firm's Complete Platform</p>
                            </div>
                            
                            <div class="grid grid-cols-2 gap-4">
                                <div class="bg-green-50 p-3 rounded-lg border border-green-200">
                                    <div class="text-green-800 font-semibold">142</div>
                                    <div class="text-green-600 text-xs">Active Clients</div>
                                </div>
                                <div class="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                    <div class="text-blue-800 font-semibold">$2.4M</div>
                                    <div class="text-blue-600 text-xs">Assets Protected</div>
                                </div>
                            </div>
                            
                            <div class="space-y-2">
                                <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
                                    <span class="text-sm text-gray-600">Risk Assessment Tool</span>
                                    <i class="fas fa-check text-green-500"></i>
                                </div>
                                <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
                                    <span class="text-sm text-gray-600">Client Portal</span>
                                    <i class="fas fa-check text-green-500"></i>
                                </div>
                                <div class="flex items-center justify-between p-2 bg-gray-50 rounded">
                                    <span class="text-sm text-gray-600">Payment Processing</span>
                                    <i class="fas fa-check text-green-500"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Floating Stats Cards -->
                    <div class="absolute -top-6 -left-6 bg-white rounded-lg shadow-lg p-4 float">
                        <div class="flex items-center">
                            <div class="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                <i class="fas fa-arrow-up text-green-600 text-sm"></i>
                            </div>
                            <div>
                                <div class="font-semibold text-gray-800">+247%</div>
                                <div class="text-xs text-gray-500">Revenue Growth</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="absolute -bottom-4 -right-4 bg-white rounded-lg shadow-lg p-4 float" style="animation-delay: 3s;">
                        <div class="flex items-center">
                            <div class="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                <i class="fas fa-users text-blue-600 text-sm"></i>
                            </div>
                            <div>
                                <div class="font-semibold text-gray-800">1,247</div>
                                <div class="text-xs text-gray-500">New Clients</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Problem Section -->
    <section class="py-20 bg-gray-50" data-aos="fade-up">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <h2 class="text-4xl font-bold text-gray-900 mb-6">
                    Are You Still Using <span class="text-red-600">Outdated Methods</span> to Serve Asset Protection Clients?
                </h2>
                <p class="text-xl text-gray-600 max-w-3xl mx-auto">
                    While you're manually managing spreadsheets and basic consultations, your competitors are offering sophisticated digital experiences that attract high-value clients.
                </p>
            </div>
            
            <div class="grid lg:grid-cols-2 gap-12 items-center">
                <!-- Problems List -->
                <div class="space-y-6">
                    <div class="flex items-start p-6 bg-white rounded-xl shadow-lg border-l-4 border-red-500" data-aos="fade-right" data-aos-delay="100">
                        <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                            <i class="fas fa-times text-red-600"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900 mb-2">Manual Risk Assessments</h3>
                            <p class="text-gray-600">Spending hours on paperwork instead of strategic consulting. No standardized process, inconsistent results.</p>
                        </div>
                    </div>
                    
                    <div class="flex items-start p-6 bg-white rounded-xl shadow-lg border-l-4 border-red-500" data-aos="fade-right" data-aos-delay="200">
                        <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                            <i class="fas fa-times text-red-600"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900 mb-2">Poor Client Experience</h3>
                            <p class="text-gray-600">Clients expect modern digital experiences. Email attachments and phone calls aren't cutting it anymore.</p>
                        </div>
                    </div>
                    
                    <div class="flex items-start p-6 bg-white rounded-xl shadow-lg border-l-4 border-red-500" data-aos="fade-right" data-aos-delay="300">
                        <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                            <i class="fas fa-times text-red-600"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900 mb-2">Limited Scalability</h3>
                            <p class="text-gray-600">Can't serve more clients without hiring more staff. Revenue plateau due to manual processes.</p>
                        </div>
                    </div>
                    
                    <div class="flex items-start p-6 bg-white rounded-xl shadow-lg border-l-4 border-red-500" data-aos="fade-right" data-aos-delay="400">
                        <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                            <i class="fas fa-times text-red-600"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900 mb-2">No Competitive Edge</h3>
                            <p class="text-gray-600">Every law firm offers the same basic services. Nothing to differentiate you from competitors.</p>
                        </div>
                    </div>
                </div>
                
                <!-- Impact Chart -->
                <div class="bg-white rounded-2xl shadow-xl p-8" data-aos="fade-left">
                    <h3 class="text-2xl font-bold text-gray-900 mb-6 text-center">The Cost of Staying Behind</h3>
                    <div class="h-64">
                        <canvas id="impactChart"></canvas>
                    </div>
                    <div class="mt-6 p-4 bg-red-50 rounded-lg">
                        <p class="text-red-800 font-semibold text-center">
                            <i class="fas fa-exclamation-triangle mr-2"></i>
                            Law firms without digital platforms lose 40% of potential clients to tech-savvy competitors
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Solution Section -->
    <section class="py-20 bg-white" data-aos="fade-up">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <h2 class="text-4xl font-bold text-gray-900 mb-6">
                    Introducing <span class="text-blue-600">AssetShield App</span>: Your Complete White-Label Platform
                </h2>
                <p class="text-xl text-gray-600 max-w-3xl mx-auto">
                    Transform your asset protection practice with a fully-branded SaaS platform that positions you as the technology leader in your market.
                </p>
            </div>
            
            <div class="grid lg:grid-cols-2 gap-12 items-center mb-16">
                <!-- Solution Benefits -->
                <div class="space-y-6">
                    <div class="flex items-start p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border-l-4 border-green-500" data-aos="fade-right" data-aos-delay="100">
                        <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                            <i class="fas fa-check text-green-600"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900 mb-2">Automated Risk Assessments</h3>
                            <p class="text-gray-600">Professional multi-step assessments that qualify leads and showcase expertise. Deliver results in 5 minutes vs 2 hours.</p>
                        </div>
                    </div>
                    
                    <div class="flex items-start p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border-l-4 border-green-500" data-aos="fade-right" data-aos-delay="200">
                        <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                            <i class="fas fa-check text-green-600"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900 mb-2">Premium Client Experience</h3>
                            <p class="text-gray-600">Branded client portals, educational resources, and professional dashboards that justify premium pricing.</p>
                        </div>
                    </div>
                    
                    <div class="flex items-start p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border-l-4 border-green-500" data-aos="fade-right" data-aos-delay="300">
                        <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                            <i class="fas fa-check text-green-600"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900 mb-2">Infinite Scalability</h3>
                            <p class="text-gray-600">Serve 1,000+ clients with the same effort as 10. Automated workflows handle routine tasks while you focus on strategy.</p>
                        </div>
                    </div>
                    
                    <div class="flex items-start p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border-l-4 border-green-500" data-aos="fade-right" data-aos-delay="400">
                        <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                            <i class="fas fa-check text-green-600"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900 mb-2">Market Leadership</h3>
                            <p class="text-gray-600">Be the only law firm in your area with enterprise-grade asset protection technology. Dominate your competition.</p>
                        </div>
                    </div>
                </div>
                
                <!-- ROI Calculator -->
                <div class="calculator-container rounded-2xl shadow-2xl p-8 text-white" data-aos="fade-left">
                    <h3 class="text-2xl font-bold mb-6 text-center">Calculate Your ROI</h3>
                    
                    <div class="space-y-6">
                        <div>
                            <label class="block text-sm font-medium mb-2">Current Monthly Clients</label>
                            <input type="range" id="clientsSlider" min="5" max="100" value="20" class="w-full">
                            <div class="text-center mt-2">
                                <span id="clientsValue" class="text-2xl font-bold">20</span> clients
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-medium mb-2">Average Fee per Client</label>
                            <input type="range" id="feeSlider" min="2500" max="25000" value="7500" step="500" class="w-full">
                            <div class="text-center mt-2">
                                $<span id="feeValue" class="text-2xl font-bold">7,500</span>
                            </div>
                        </div>
                        
                        <div class="bg-white/20 rounded-lg p-4 backdrop-blur-md">
                            <div class="text-center">
                                <div class="text-sm opacity-90">Monthly Revenue Increase</div>
                                <div class="text-4xl font-bold text-yellow-400" id="revenueIncrease">$45,000</div>
                                <div class="text-sm opacity-90 mt-2">With 150% client acquisition boost</div>
                            </div>
                            
                            <div class="mt-4 pt-4 border-t border-white/30">
                                <div class="text-center">
                                    <div class="text-sm opacity-90">Annual ROI</div>
                                    <div class="text-3xl font-bold text-green-400" id="annualROI">3,240%</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mt-6 text-center">
                        <button onclick="scrollToPricing()" class="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                            See Pricing Plans
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Features Section -->
    <section id="features" class="py-20 bg-gray-50" data-aos="fade-up">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <h2 class="text-4xl font-bold text-gray-900 mb-6">
                    Everything You Need to <span class="text-blue-600">Dominate Your Market</span>
                </h2>
                <p class="text-xl text-gray-600 max-w-3xl mx-auto">
                    A complete ecosystem designed specifically for asset protection attorneys who want to scale their practice and increase revenue.
                </p>
            </div>
            
            <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                <!-- Feature Cards -->
                <div class="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-all transform hover:scale-105" data-aos="fade-up" data-aos-delay="100">
                    <div class="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mb-6">
                        <i class="fas fa-chart-line text-blue-600 text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-900 mb-4">Advanced Risk Assessment Engine</h3>
                    <p class="text-gray-600 mb-4">Multi-step professional assessments that evaluate client risk levels, analyze wealth exposure, and generate detailed protection strategies.</p>
                    <ul class="text-sm text-gray-500 space-y-1">
                        <li>• AI-powered risk calculations</li>
                        <li>• Customizable question sets</li>
                        <li>• Automated report generation</li>
                        <li>• Lead qualification scoring</li>
                    </ul>
                </div>
                
                <div class="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-all transform hover:scale-105" data-aos="fade-up" data-aos-delay="200">
                    <div class="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                        <i class="fas fa-users text-green-600 text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-900 mb-4">White-Label Client Portal</h3>
                    <p class="text-gray-600 mb-4">Fully branded client experience with your logo, colors, and domain. Professional dashboards that justify premium pricing.</p>
                    <ul class="text-sm text-gray-500 space-y-1">
                        <li>• Custom domain setup</li>
                        <li>• Complete branding control</li>
                        <li>• Client document management</li>
                        <li>• Secure communication center</li>
                    </ul>
                </div>
                
                <div class="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-all transform hover:scale-105" data-aos="fade-up" data-aos-delay="300">
                    <div class="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                        <i class="fas fa-credit-card text-purple-600 text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-900 mb-4">Integrated Payment Processing</h3>
                    <p class="text-gray-600 mb-4">Seamless Stripe integration for setup fees and monthly subscriptions. Automated billing and revenue tracking.</p>
                    <ul class="text-sm text-gray-500 space-y-1">
                        <li>• Multiple payment methods</li>
                        <li>• Recurring billing automation</li>
                        <li>• Revenue analytics dashboard</li>
                        <li>• Tax reporting integration</li>
                    </ul>
                </div>
                
                <div class="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-all transform hover:scale-105" data-aos="fade-up" data-aos-delay="400">
                    <div class="w-16 h-16 bg-red-100 rounded-xl flex items-center justify-center mb-6">
                        <i class="fas fa-shield-alt text-red-600 text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-900 mb-4">Enterprise Security Suite</h3>
                    <p class="text-gray-600 mb-4">Bank-level security with two-factor authentication, encrypted data storage, and compliance monitoring.</p>
                    <ul class="text-sm text-gray-500 space-y-1">
                        <li>• 256-bit SSL encryption</li>
                        <li>• GDPR/CCPA compliance</li>
                        <li>• Automated backups</li>
                        <li>• Audit trail logging</li>
                    </ul>
                </div>
                
                <div class="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-all transform hover:scale-105" data-aos="fade-up" data-aos-delay="500">
                    <div class="w-16 h-16 bg-yellow-100 rounded-xl flex items-center justify-center mb-6">
                        <i class="fas fa-graduation-cap text-yellow-600 text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-900 mb-4">Education & Content Library</h3>
                    <p class="text-gray-600 mb-4">Comprehensive educational resources and content management system to position you as the thought leader.</p>
                    <ul class="text-sm text-gray-500 space-y-1">
                        <li>• Pre-built article library</li>
                        <li>• Custom content creation</li>
                        <li>• SEO optimization tools</li>
                        <li>• Lead magnet resources</li>
                    </ul>
                </div>
                
                <div class="bg-white rounded-xl shadow-lg p-8 hover:shadow-2xl transition-all transform hover:scale-105" data-aos="fade-up" data-aos-delay="600">
                    <div class="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
                        <i class="fas fa-chart-bar text-indigo-600 text-2xl"></i>
                    </div>
                    <h3 class="text-xl font-bold text-gray-900 mb-4">Advanced Analytics Dashboard</h3>
                    <p class="text-gray-600 mb-4">Real-time insights into client behavior, revenue metrics, and platform performance to optimize your practice.</p>
                    <ul class="text-sm text-gray-500 space-y-1">
                        <li>• Client engagement tracking</li>
                        <li>• Revenue forecasting</li>
                        <li>• Conversion rate analysis</li>
                        <li>• Custom reporting tools</li>
                    </ul>
                </div>
            </div>
            
            <!-- Feature Highlight -->
            <div class="bg-white rounded-2xl shadow-2xl p-8 lg:p-12" data-aos="fade-up">
                <div class="grid lg:grid-cols-2 gap-12 items-center">
                    <div>
                        <h3 class="text-3xl font-bold text-gray-900 mb-6">Master Admin Control Panel</h3>
                        <p class="text-xl text-gray-600 mb-6">
                            Monitor all your client platforms from one central dashboard. Login to any client account, preview customer experiences, and manage your entire white-label network.
                        </p>
                        
                        <div class="space-y-4">
                            <div class="flex items-center">
                                <i class="fas fa-user-shield text-blue-600 mr-3"></i>
                                <span class="text-gray-700">Customer impersonation for support</span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-eye text-blue-600 mr-3"></i>
                                <span class="text-gray-700">Real-time platform monitoring</span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-cogs text-blue-600 mr-3"></i>
                                <span class="text-gray-700">Global configuration management</span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-chart-line text-blue-600 mr-3"></i>
                                <span class="text-gray-700">Cross-platform analytics</span>
                            </div>
                        </div>
                        
                        <div class="mt-8">
                            <a href="/#assessment" class="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-block">
                                <i class="fas fa-rocket mr-2"></i>
                                Try Live Demo
                            </a>
                        </div>
                    </div>
                    
                    <div class="relative">
                        <!-- Admin Dashboard Mockup -->
                        <div class="bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
                            <div class="bg-gray-800 px-4 py-3 flex items-center">
                                <div class="flex space-x-2">
                                    <div class="w-3 h-3 bg-red-500 rounded-full"></div>
                                    <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                    <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                                </div>
                                <div class="flex-1 text-center">
                                    <span class="text-gray-300 text-sm">AssetShield App Admin</span>
                                </div>
                            </div>
                            
                            <div class="p-6 text-white">
                                <div class="grid grid-cols-2 gap-4 mb-6">
                                    <div class="bg-blue-600 p-4 rounded-lg">
                                        <div class="text-2xl font-bold">247</div>
                                        <div class="text-blue-200 text-sm">Active Platforms</div>
                                    </div>
                                    <div class="bg-green-600 p-4 rounded-lg">
                                        <div class="text-2xl font-bold">$2.4M</div>
                                        <div class="text-green-200 text-sm">Monthly Revenue</div>
                                    </div>
                                </div>
                                
                                <div class="space-y-3">
                                    <div class="flex items-center justify-between p-3 bg-gray-800 rounded">
                                        <div class="flex items-center">
                                            <div class="w-8 h-8 bg-blue-500 rounded mr-3"></div>
                                            <span class="text-sm">Smith & Associates</span>
                                        </div>
                                        <button class="text-blue-400 text-xs">LOGIN</button>
                                    </div>
                                    <div class="flex items-center justify-between p-3 bg-gray-800 rounded">
                                        <div class="flex items-center">
                                            <div class="w-8 h-8 bg-green-500 rounded mr-3"></div>
                                            <span class="text-sm">Johnson Law Group</span>
                                        </div>
                                        <button class="text-blue-400 text-xs">LOGIN</button>
                                    </div>
                                    <div class="flex items-center justify-between p-3 bg-gray-800 rounded">
                                        <div class="flex items-center">
                                            <div class="w-8 h-8 bg-purple-500 rounded mr-3"></div>
                                            <span class="text-sm">Davis Legal Partners</span>
                                        </div>
                                        <button class="text-blue-400 text-xs">LOGIN</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Floating notification -->
                        <div class="absolute -top-4 -right-4 bg-green-500 text-white p-3 rounded-lg shadow-lg float">
                            <div class="text-xs">New Client</div>
                            <div class="font-semibold">+$15K Revenue</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Pricing Section -->
    <section id="pricing" class="py-20 bg-white" data-aos="fade-up">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <h2 class="text-4xl font-bold text-gray-900 mb-6">
                    Choose Your <span class="text-blue-600">Growth Plan</span>
                </h2>
                <p class="text-xl text-gray-600 max-w-3xl mx-auto">
                    Transparent pricing designed for law firms of all sizes. No hidden fees, no long-term contracts, guaranteed ROI.
                </p>
                
                <!-- Pricing Toggle -->
                <div class="mt-8 flex justify-center">
                    <div class="bg-gray-100 rounded-lg p-1 flex">
                        <button id="monthlyBtn" class="px-6 py-2 rounded-md bg-blue-600 text-white font-semibold transition-colors">
                            Monthly
                        </button>
                        <button id="annualBtn" class="px-6 py-2 rounded-md text-gray-700 font-semibold hover:text-blue-600 transition-colors">
                            Annual (Save 20%)
                        </button>
                    </div>
                </div>
            </div>
            
            <div class="grid lg:grid-cols-3 gap-8 mb-12">
                <!-- Starter Plan -->
                <div class="pricing-card bg-white rounded-2xl shadow-xl p-8 border" data-aos="fade-up" data-aos-delay="100">
                    <div class="text-center mb-8">
                        <h3 class="text-2xl font-bold text-gray-900 mb-2">Starter</h3>
                        <p class="text-gray-600">Perfect for solo practitioners and small firms</p>
                        <div class="mt-6">
                            <div class="text-4xl font-bold text-gray-900">
                                $<span class="monthly-price">500</span><span class="annual-price hidden">400</span>
                            </div>
                            <div class="text-gray-500">/month + $5,000 setup</div>
                        </div>
                    </div>
                    
                    <ul class="space-y-4 mb-8">
                        <li class="flex items-center">
                            <i class="fas fa-check text-green-500 mr-3"></i>
                            <span>Up to 100 client assessments/month</span>
                        </li>
                        <li class="flex items-center">
                            <i class="fas fa-check text-green-500 mr-3"></i>
                            <span>Basic white-label branding</span>
                        </li>
                        <li class="flex items-center">
                            <i class="fas fa-check text-green-500 mr-3"></i>
                            <span>Client portal & document management</span>
                        </li>
                        <li class="flex items-center">
                            <i class="fas fa-check text-green-500 mr-3"></i>
                            <span>Payment processing integration</span>
                        </li>
                        <li class="flex items-center">
                            <i class="fas fa-check text-green-500 mr-3"></i>
                            <span>Email support</span>
                        </li>
                        <li class="flex items-center">
                            <i class="fas fa-check text-green-500 mr-3"></i>
                            <span>Basic analytics dashboard</span>
                        </li>
                    </ul>
                    
                    <button onclick="startPurchaseFlow('starter')" class="w-full bg-gray-900 text-white py-4 rounded-lg font-semibold hover:bg-gray-800 transition-colors">
                        Start with Starter
                    </button>
                </div>
                
                <!-- Professional Plan (Featured) -->
                <div class="pricing-card featured bg-white rounded-2xl shadow-2xl p-8 relative" data-aos="fade-up" data-aos-delay="200">
                    <!-- Popular Badge -->
                    <div class="absolute -top-4 left-1/2 transform -translate-x-1/2">
                        <div class="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-semibold">
                            Most Popular
                        </div>
                    </div>
                    
                    <div class="text-center mb-8">
                        <h3 class="text-2xl font-bold text-gray-900 mb-2">Professional</h3>
                        <p class="text-gray-600">For growing firms ready to scale</p>
                        <div class="mt-6">
                            <div class="text-4xl font-bold text-blue-600">
                                $<span class="monthly-price">1,200</span><span class="annual-price hidden">960</span>
                            </div>
                            <div class="text-gray-500">/month + $10,000 setup</div>
                        </div>
                    </div>
                    
                    <ul class="space-y-4 mb-8">
                        <li class="flex items-center">
                            <i class="fas fa-check text-green-500 mr-3"></i>
                            <span>Up to 500 client assessments/month</span>
                        </li>
                        <li class="flex items-center">
                            <i class="fas fa-check text-green-500 mr-3"></i>
                            <span>Advanced white-label customization</span>
                        </li>
                        <li class="flex items-center">
                            <i class="fas fa-check text-green-500 mr-3"></i>
                            <span>Custom domain setup included</span>
                        </li>
                        <li class="flex items-center">
                            <i class="fas fa-check text-green-500 mr-3"></i>
                            <span>Advanced client portal features</span>
                        </li>
                        <li class="flex items-center">
                            <i class="fas fa-check text-green-500 mr-3"></i>
                            <span>Priority phone & email support</span>
                        </li>
                        <li class="flex items-center">
                            <i class="fas fa-check text-green-500 mr-3"></i>
                            <span>Advanced analytics & reporting</span>
                        </li>
                        <li class="flex items-center">
                            <i class="fas fa-check text-green-500 mr-3"></i>
                            <span>Marketing automation tools</span>
                        </li>
                        <li class="flex items-center">
                            <i class="fas fa-check text-green-500 mr-3"></i>
                            <span>API access for integrations</span>
                        </li>
                    </ul>
                    
                    <button onclick="startPurchaseFlow('professional')" class="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors pulse-cta">
                        Start with Professional
                    </button>
                </div>
                
                <!-- Enterprise Plan -->
                <div class="pricing-card bg-white rounded-2xl shadow-xl p-8 border" data-aos="fade-up" data-aos-delay="300">
                    <div class="text-center mb-8">
                        <h3 class="text-2xl font-bold text-gray-900 mb-2">Enterprise</h3>
                        <p class="text-gray-600">For large firms and multi-office practices</p>
                        <div class="mt-6">
                            <div class="text-4xl font-bold text-gray-900">
                                $<span class="monthly-price">2,500</span><span class="annual-price hidden">2,000</span>
                            </div>
                            <div class="text-gray-500">/month + $25,000 setup</div>
                        </div>
                    </div>
                    
                    <ul class="space-y-4 mb-8">
                        <li class="flex items-center">
                            <i class="fas fa-check text-green-500 mr-3"></i>
                            <span>Unlimited client assessments</span>
                        </li>
                        <li class="flex items-center">
                            <i class="fas fa-check text-green-500 mr-3"></i>
                            <span>Full white-label customization</span>
                        </li>
                        <li class="flex items-center">
                            <i class="fas fa-check text-green-500 mr-3"></i>
                            <span>Multi-office platform management</span>
                        </li>
                        <li class="flex items-center">
                            <i class="fas fa-check text-green-500 mr-3"></i>
                            <span>Advanced security & compliance</span>
                        </li>
                        <li class="flex items-center">
                            <i class="fas fa-check text-green-500 mr-3"></i>
                            <span>24/7 dedicated support</span>
                        </li>
                        <li class="flex items-center">
                            <i class="fas fa-check text-green-500 mr-3"></i>
                            <span>Custom feature development</span>
                        </li>
                        <li class="flex items-center">
                            <i class="fas fa-check text-green-500 mr-3"></i>
                            <span>Advanced integrations & APIs</span>
                        </li>
                        <li class="flex items-center">
                            <i class="fas fa-check text-green-500 mr-3"></i>
                            <span>Dedicated customer success manager</span>
                        </li>
                    </ul>
                    
                    <button onclick="startPurchaseFlow('enterprise')" class="w-full bg-gray-900 text-white py-4 rounded-lg font-semibold hover:bg-gray-800 transition-colors">
                        Start with Enterprise
                    </button>
                </div>
            </div>
            
            <!-- Money Back Guarantee -->
            <div class="bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-8 text-center" data-aos="fade-up">
                <div class="max-w-3xl mx-auto">
                    <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i class="fas fa-shield-alt text-green-600 text-2xl"></i>
                    </div>
                    <h3 class="text-2xl font-bold text-gray-900 mb-4">60-Day Money-Back Guarantee</h3>
                    <p class="text-lg text-gray-600 mb-6">
                        If AssetShield App doesn't increase your client acquisition by at least 50% within 60 days, we'll refund your setup fee completely. We're that confident in our platform.
                    </p>
                    <div class="flex flex-wrap justify-center gap-8 text-sm text-gray-500">
                        <div class="flex items-center">
                            <i class="fas fa-check text-green-500 mr-2"></i>
                            <span>No questions asked refund</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-check text-green-500 mr-2"></i>
                            <span>Keep all client data</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-check text-green-500 mr-2"></i>
                            <span>Free migration assistance</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Demo Section -->
    <section id="demo" class="py-20 bg-gray-900 text-white" data-aos="fade-up">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <h2 class="text-4xl font-bold mb-6">
                    See AssetShield App in <span class="text-blue-400">Action</span>
                </h2>
                <p class="text-xl text-gray-300 max-w-3xl mx-auto">
                    Explore the powerful backend features and client experience that make AssetShield App the premium choice for law firms.
                </p>
            </div>
            
            <div class="relative max-w-6xl mx-auto">
                <!-- Screenshots Collage -->
                <div class="grid lg:grid-cols-3 gap-6 mb-8">
                    <!-- Admin Dashboard Screenshot -->
                    <div class="bg-white rounded-xl shadow-2xl overflow-hidden transform hover:scale-105 transition-transform duration-300">
                        <div class="bg-gray-800 px-4 py-2 flex items-center">
                            <div class="flex space-x-1">
                                <div class="w-3 h-3 bg-red-500 rounded-full"></div>
                                <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                            </div>
                            <div class="flex-1 text-center">
                                <span class="text-gray-300 text-xs">Admin Dashboard</span>
                            </div>
                        </div>
                        <div class="p-4 bg-gradient-to-br from-blue-50 to-indigo-100 h-48">
                            <div class="mb-4">
                                <h4 class="text-lg font-bold text-gray-800 mb-2">Master Control Panel</h4>
                                <div class="grid grid-cols-2 gap-3">
                                    <div class="bg-white p-3 rounded shadow">
                                        <div class="text-blue-600 font-bold text-xl">247</div>
                                        <div class="text-gray-600 text-xs">Active Clients</div>
                                    </div>
                                    <div class="bg-white p-3 rounded shadow">
                                        <div class="text-green-600 font-bold text-xl">$2.4M</div>
                                        <div class="text-gray-600 text-xs">Revenue</div>
                                    </div>
                                </div>
                            </div>
                            <div class="space-y-2">
                                <div class="bg-white p-2 rounded flex justify-between items-center text-xs">
                                    <span>Client Management</span>
                                    <i class="fas fa-check text-green-500"></i>
                                </div>
                                <div class="bg-white p-2 rounded flex justify-between items-center text-xs">
                                    <span>Analytics Dashboard</span>
                                    <i class="fas fa-check text-green-500"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Client Portal Screenshot -->
                    <div class="bg-white rounded-xl shadow-2xl overflow-hidden transform hover:scale-105 transition-transform duration-300">
                        <div class="bg-gray-800 px-4 py-2 flex items-center">
                            <div class="flex space-x-1">
                                <div class="w-3 h-3 bg-red-500 rounded-full"></div>
                                <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                            </div>
                            <div class="flex-1 text-center">
                                <span class="text-gray-300 text-xs">Client Portal</span>
                            </div>
                        </div>
                        <div class="p-4 bg-gradient-to-br from-green-50 to-blue-100 h-48">
                            <div class="mb-4">
                                <h4 class="text-lg font-bold text-gray-800 mb-2">Client Dashboard</h4>
                                <div class="bg-white p-3 rounded shadow mb-3">
                                    <div class="flex items-center justify-between">
                                        <span class="text-gray-700 text-sm">Risk Assessment</span>
                                        <span class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Complete</span>
                                    </div>
                                </div>
                            </div>
                            <div class="space-y-2">
                                <div class="bg-white p-2 rounded flex justify-between items-center text-xs">
                                    <span>Asset Protection Plan</span>
                                    <div class="w-16 bg-gray-200 rounded-full h-2">
                                        <div class="bg-blue-600 h-2 rounded-full w-3/4"></div>
                                    </div>
                                </div>
                                <div class="bg-white p-2 rounded flex justify-between items-center text-xs">
                                    <span>Document Library</span>
                                    <i class="fas fa-folder text-blue-500"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Risk Assessment Screenshot -->
                    <div class="bg-white rounded-xl shadow-2xl overflow-hidden transform hover:scale-105 transition-transform duration-300">
                        <div class="bg-gray-800 px-4 py-2 flex items-center">
                            <div class="flex space-x-1">
                                <div class="w-3 h-3 bg-red-500 rounded-full"></div>
                                <div class="w-3 h-3 bg-yellow-500 rounded-full"></div>
                                <div class="w-3 h-3 bg-green-500 rounded-full"></div>
                            </div>
                            <div class="flex-1 text-center">
                                <span class="text-gray-300 text-xs">Risk Assessment</span>
                            </div>
                        </div>
                        <div class="p-4 bg-gradient-to-br from-yellow-50 to-orange-100 h-48">
                            <div class="mb-4">
                                <h4 class="text-lg font-bold text-gray-800 mb-2">AI-Powered Assessment</h4>
                                <div class="bg-white p-3 rounded shadow mb-3">
                                    <div class="text-center">
                                        <div class="text-2xl font-bold text-orange-600">HIGH RISK</div>
                                        <div class="text-gray-600 text-xs">Protection Level</div>
                                    </div>
                                </div>
                            </div>
                            <div class="space-y-2">
                                <div class="bg-white p-2 rounded text-xs">
                                    <span class="font-semibold">Wealth at Risk:</span>
                                    <span class="text-red-600 ml-1">$850,000</span>
                                </div>
                                <div class="bg-white p-2 rounded text-xs">
                                    <span class="font-semibold">Recommendations:</span>
                                    <span class="text-blue-600 ml-1">4 Strategies</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Try Demo Button -->
                <div class="text-center">
                    <a href="/#assessment" class="inline-flex items-center bg-gradient-to-r from-orange-500 to-red-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-orange-600 hover:to-red-700 transition-all transform hover:scale-105 shadow-lg">
                        <i class="fas fa-rocket mr-3"></i>
                        Try the Live Demo
                    </a>
                    <p class="text-gray-400 text-sm mt-3">Experience the complete platform yourself</p>
                </div>
            </div>
                
                <!-- Demo Features -->
                <div class="grid md:grid-cols-3 gap-6 mt-12">
                    <div class="text-center">
                        <div class="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-user-check text-white text-xl"></i>
                        </div>
                        <h4 class="text-lg font-semibold mb-2">Client Onboarding</h4>
                        <p class="text-gray-400">See how clients complete risk assessments and engage with your platform</p>
                    </div>
                    
                    <div class="text-center">
                        <div class="w-16 h-16 bg-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-chart-bar text-white text-xl"></i>
                        </div>
                        <h4 class="text-lg font-semibold mb-2">Admin Dashboard</h4>
                        <p class="text-gray-400">Explore the powerful admin tools for managing your practice</p>
                    </div>
                    
                    <div class="text-center">
                        <div class="w-16 h-16 bg-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <i class="fas fa-credit-card text-white text-xl"></i>
                        </div>
                        <h4 class="text-lg font-semibold mb-2">Payment Flow</h4>
                        <p class="text-gray-400">Watch the seamless payment process that converts prospects</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Testimonials Section -->
    <section id="testimonials" class="py-20 bg-white" data-aos="fade-up">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <h2 class="text-4xl font-bold text-gray-900 mb-6">
                    What Law Firms Are Saying About <span class="text-blue-600">AssetShield App</span>
                </h2>
                <p class="text-xl text-gray-600 max-w-3xl mx-auto">
                    Join hundreds of successful law firms who have transformed their practices with AssetShield App.
                </p>
            </div>
            
            <!-- Testimonials Carousel -->
            <div class="relative overflow-hidden">
                <div id="testimonialCarousel" class="flex transition-transform duration-500">
                    <!-- Testimonial 1 -->
                    <div class="testimonial-slide flex-shrink-0 w-full">
                        <div class="grid lg:grid-cols-3 gap-8">
                            <div class="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8">
                                <div class="flex items-center mb-4">
                                    <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&crop=face" alt="Michael Johnson" class="w-12 h-12 rounded-full mr-4">
                                    <div>
                                        <h4 class="font-semibold text-gray-900">Michael Johnson</h4>
                                        <p class="text-sm text-gray-600">Partner, Johnson & Associates</p>
                                    </div>
                                </div>
                                <div class="flex text-yellow-400 mb-3">
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                </div>
                                <p class="text-gray-700 mb-4">"AssetShield App increased our client acquisition by 230% in the first 90 days. The automated risk assessments save us 15 hours per week while providing better client experiences."</p>
                                <div class="text-sm text-gray-500">
                                    <span class="font-semibold text-green-600">+230% client growth</span> • 6 months
                                </div>
                            </div>
                            
                            <div class="bg-gradient-to-br from-green-50 to-blue-100 rounded-2xl p-8">
                                <div class="flex items-center mb-4">
                                    <img src="https://images.unsplash.com/photo-1494790108755-2616b612b786?w=60&h=60&fit=crop&crop=face" alt="Sarah Davis" class="w-12 h-12 rounded-full mr-4">
                                    <div>
                                        <h4 class="font-semibold text-gray-900">Sarah Davis</h4>
                                        <p class="text-sm text-gray-600">Managing Partner, Davis Legal Group</p>
                                    </div>
                                </div>
                                <div class="flex text-yellow-400 mb-3">
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                </div>
                                <p class="text-gray-700 mb-4">"The white-label platform makes us look like a tech-forward firm. We're now the go-to asset protection firm in our region, and our average client value has tripled."</p>
                                <div class="text-sm text-gray-500">
                                    <span class="font-semibold text-green-600">3x client value</span> • 8 months
                                </div>
                            </div>
                            
                            <div class="bg-gradient-to-br from-purple-50 to-pink-100 rounded-2xl p-8">
                                <div class="flex items-center mb-4">
                                    <img src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&crop=face" alt="Robert Smith" class="w-12 h-12 rounded-full mr-4">
                                    <div>
                                        <h4 class="font-semibold text-gray-900">Robert Smith</h4>
                                        <p class="text-sm text-gray-600">Founder, Smith Asset Protection</p>
                                    </div>
                                </div>
                                <div class="flex text-yellow-400 mb-3">
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                </div>
                                <p class="text-gray-700 mb-4">"ROI was immediate. The platform paid for itself in the first month through increased client conversions. Now we're scaling to multiple locations."</p>
                                <div class="text-sm text-gray-500">
                                    <span class="font-semibold text-green-600">ROI in 30 days</span> • 1 year
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Testimonial 2 -->
                    <div class="testimonial-slide flex-shrink-0 w-full">
                        <div class="grid lg:grid-cols-3 gap-8">
                            <div class="bg-gradient-to-br from-yellow-50 to-orange-100 rounded-2xl p-8">
                                <div class="flex items-center mb-4">
                                    <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&crop=face" alt="Jennifer Wilson" class="w-12 h-12 rounded-full mr-4">
                                    <div>
                                        <h4 class="font-semibold text-gray-900">Jennifer Wilson</h4>
                                        <p class="text-sm text-gray-600">Senior Partner, Wilson & Partners</p>
                                    </div>
                                </div>
                                <div class="flex text-yellow-400 mb-3">
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                </div>
                                <p class="text-gray-700 mb-4">"The automated systems handle routine tasks while we focus on high-value client strategy. Our productivity has increased 400% with the same team size."</p>
                                <div class="text-sm text-gray-500">
                                    <span class="font-semibold text-green-600">400% productivity gain</span> • 10 months
                                </div>
                            </div>
                            
                            <div class="bg-gradient-to-br from-red-50 to-pink-100 rounded-2xl p-8">
                                <div class="flex items-center mb-4">
                                    <img src="https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=60&h=60&fit=crop&crop=face" alt="David Thompson" class="w-12 h-12 rounded-full mr-4">
                                    <div>
                                        <h4 class="font-semibold text-gray-900">David Thompson</h4>
                                        <p class="text-sm text-gray-600">Principal, Thompson Legal</p>
                                    </div>
                                </div>
                                <div class="flex text-yellow-400 mb-3">
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                </div>
                                <p class="text-gray-700 mb-4">"Setup took exactly 24 hours as promised. The support team guided us through everything. We went from idea to fully operational platform in one day."</p>
                                <div class="text-sm text-gray-500">
                                    <span class="font-semibold text-green-600">24-hour setup</span> • 3 months
                                </div>
                            </div>
                            
                            <div class="bg-gradient-to-br from-teal-50 to-green-100 rounded-2xl p-8">
                                <div class="flex items-center mb-4">
                                    <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=60&h=60&fit=crop&crop=face" alt="Lisa Rodriguez" class="w-12 h-12 rounded-full mr-4">
                                    <div>
                                        <h4 class="font-semibold text-gray-900">Lisa Rodriguez</h4>
                                        <p class="text-sm text-gray-600">Founder, Rodriguez Law Firm</p>
                                    </div>
                                </div>
                                <div class="flex text-yellow-400 mb-3">
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                    <i class="fas fa-star"></i>
                                </div>
                                <p class="text-gray-700 mb-4">"Clients love the modern experience. We're now seen as the premium option in our market. Average case values increased from $8K to $25K."</p>
                                <div class="text-sm text-gray-500">
                                    <span class="font-semibold text-green-600">3x higher case values</span> • 7 months
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Carousel Navigation -->
                <div class="flex justify-center mt-8 space-x-2">
                    <button id="prevTestimonial" class="w-3 h-3 rounded-full bg-gray-300 hover:bg-blue-600 transition-colors"></button>
                    <button id="nextTestimonial" class="w-3 h-3 rounded-full bg-blue-600 hover:bg-blue-700 transition-colors"></button>
                </div>
            </div>
            
            <!-- Results Stats -->
            <div class="mt-16 bg-gray-50 rounded-2xl p-8">
                <h3 class="text-2xl font-bold text-center text-gray-900 mb-8">Average Results from Our Law Firms</h3>
                <div class="grid md:grid-cols-4 gap-8 text-center">
                    <div>
                        <div class="text-4xl font-bold text-blue-600 mb-2">247%</div>
                        <div class="text-gray-600">Client Acquisition Increase</div>
                    </div>
                    <div>
                        <div class="text-4xl font-bold text-green-600 mb-2">$43K</div>
                        <div class="text-gray-600">Average Monthly Revenue Boost</div>
                    </div>
                    <div>
                        <div class="text-4xl font-bold text-purple-600 mb-2">18x</div>
                        <div class="text-gray-600">Return on Investment</div>
                    </div>
                    <div>
                        <div class="text-4xl font-bold text-orange-600 mb-2">90%</div>
                        <div class="text-gray-600">Client Satisfaction Rate</div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- FAQ Section -->
    <section class="py-20 bg-gray-50" data-aos="fade-up">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <h2 class="text-4xl font-bold text-gray-900 mb-6">
                    Frequently Asked <span class="text-blue-600">Questions</span>
                </h2>
                <p class="text-xl text-gray-600">
                    Everything you need to know about AssetShield App
                </p>
            </div>
            
            <div class="space-y-4">
                <!-- FAQ Item 1 -->
                <div class="bg-white rounded-xl shadow-lg">
                    <button class="w-full p-6 text-left flex justify-between items-center hover:bg-gray-50 transition-colors" onclick="toggleFAQ(1)">
                        <span class="text-lg font-semibold text-gray-900">How quickly can I launch my platform?</span>
                        <i class="fas fa-chevron-down text-gray-500 transition-transform" id="faq-icon-1"></i>
                    </button>
                    <div id="faq-content-1" class="hidden px-6 pb-6">
                        <p class="text-gray-600">Your fully-branded AssetShield App platform will be live within 24 hours of order completion. Our team handles all the technical setup, domain configuration, and branding customization while you focus on your practice.</p>
                    </div>
                </div>
                
                <!-- FAQ Item 2 -->
                <div class="bg-white rounded-xl shadow-lg">
                    <button class="w-full p-6 text-left flex justify-between items-center hover:bg-gray-50 transition-colors" onclick="toggleFAQ(2)">
                        <span class="text-lg font-semibold text-gray-900">Do I need technical knowledge to manage the platform?</span>
                        <i class="fas fa-chevron-down text-gray-500 transition-transform" id="faq-icon-2"></i>
                    </button>
                    <div id="faq-content-2" class="hidden px-6 pb-6">
                        <p class="text-gray-600">Not at all! AssetShield App is designed for lawyers, not developers. Everything is managed through an intuitive admin dashboard. Our team provides complete onboarding and ongoing support to ensure your success.</p>
                    </div>
                </div>
                
                <!-- FAQ Item 3 -->
                <div class="bg-white rounded-xl shadow-lg">
                    <button class="w-full p-6 text-left flex justify-between items-center hover:bg-gray-50 transition-colors" onclick="toggleFAQ(3)">
                        <span class="text-lg font-semibold text-gray-900">What's included in the setup fee?</span>
                        <i class="fas fa-chevron-down text-gray-500 transition-transform" id="faq-icon-3"></i>
                    </button>
                    <div id="faq-content-3" class="hidden px-6 pb-6">
                        <p class="text-gray-600">The setup fee covers complete platform customization with your branding, domain setup, payment processor integration, staff training, content migration, and dedicated onboarding support. It's a one-time investment for lifetime access to your branded platform.</p>
                    </div>
                </div>
                
                <!-- FAQ Item 4 -->
                <div class="bg-white rounded-xl shadow-lg">
                    <button class="w-full p-6 text-left flex justify-between items-center hover:bg-gray-50 transition-colors" onclick="toggleFAQ(4)">
                        <span class="text-lg font-semibold text-gray-900">Can I customize the risk assessment questions?</span>
                        <i class="fas fa-chevron-down text-gray-500 transition-transform" id="faq-icon-4"></i>
                    </button>
                    <div id="faq-content-4" class="hidden px-6 pb-6">
                        <p class="text-gray-600">Yes! You have complete control over assessment questions, scoring algorithms, and result presentations. We provide proven templates based on successful law firms, and you can customize everything to match your approach and specializations.</p>
                    </div>
                </div>
                
                <!-- FAQ Item 5 -->
                <div class="bg-white rounded-xl shadow-lg">
                    <button class="w-full p-6 text-left flex justify-between items-center hover:bg-gray-50 transition-colors" onclick="toggleFAQ(5)">
                        <span class="text-lg font-semibold text-gray-900">What kind of support do you provide?</span>
                        <i class="fas fa-chevron-down text-gray-500 transition-transform" id="faq-icon-5"></i>
                    </button>
                    <div id="faq-content-5" class="hidden px-6 pb-6">
                        <p class="text-gray-600">We provide comprehensive support including initial setup and training, ongoing technical support, platform updates, marketing guidance, and best practice consultation. Enterprise clients receive dedicated customer success managers and priority support.</p>
                    </div>
                </div>
                
                <!-- FAQ Item 6 -->
                <div class="bg-white rounded-xl shadow-lg">
                    <button class="w-full p-6 text-left flex justify-between items-center hover:bg-gray-50 transition-colors" onclick="toggleFAQ(6)">
                        <span class="text-lg font-semibold text-gray-900">Is there a long-term contract?</span>
                        <i class="fas fa-chevron-down text-gray-500 transition-transform" id="faq-icon-6"></i>
                    </button>
                    <div id="faq-content-6" class="hidden px-6 pb-6">
                        <p class="text-gray-600">No long-term contracts required. You can cancel anytime with 30 days notice. We're confident you'll see results quickly and want to stay, but we don't believe in trapping clients in contracts. Your success is our success.</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Final CTA Section -->
    <section class="py-20 bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-900 text-white" data-aos="fade-up">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 class="text-4xl md:text-5xl font-bold mb-6">
                Ready to Transform Your Practice?
            </h2>
            <p class="text-xl mb-8 text-blue-100">
                Join the leading law firms who've chosen AssetShield App to dominate their markets. Your competitors are already evaluating similar solutions.
            </p>
            
            <!-- Urgency Elements -->
            <div class="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-8">
                <div class="flex flex-col md:flex-row items-center justify-center gap-6">
                    <div class="text-center">
                        <div class="text-2xl font-bold text-yellow-400">Limited Time</div>
                        <div class="text-blue-200">Setup fee discount available</div>
                    </div>
                    <div class="hidden md:block w-px h-12 bg-white/30"></div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-yellow-400">24 Hour</div>
                        <div class="text-blue-200">Platform deployment</div>
                    </div>
                    <div class="hidden md:block w-px h-12 bg-white/30"></div>
                    <div class="text-center">
                        <div class="text-2xl font-bold text-yellow-400">60 Day</div>
                        <div class="text-blue-200">Money-back guarantee</div>
                    </div>
                </div>
            </div>
            
            <!-- Primary CTA -->
            <div class="space-y-4">
                <button onclick="startPurchaseFlow('professional')" class="bg-gradient-to-r from-orange-500 to-red-600 text-white px-12 py-6 rounded-xl font-bold text-xl hover:from-orange-600 hover:to-red-700 transition-all transform hover:scale-105 pulse-cta">
                    <i class="fas fa-rocket mr-3"></i>
                    Launch My Platform Today
                </button>
                
                <div class="flex flex-col sm:flex-row gap-4 justify-center">
                    <button onclick="scheduleCall()" class="bg-white/20 backdrop-blur-md text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/30 transition-all border border-white/30">
                        <i class="fas fa-calendar mr-2"></i>
                        Schedule Strategy Call
                    </button>
                    <a href="/#assessment" class="bg-white/20 backdrop-blur-md text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/30 transition-all border border-white/30 inline-block">
                        <i class="fas fa-rocket mr-2"></i>
                        Try Live Demo
                    </a>
                </div>
            </div>
            
            <!-- Trust Signals -->
            <div class="mt-12 pt-8 border-t border-white/20">
                <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    <div>
                        <div class="text-2xl font-bold text-yellow-400">500+</div>
                        <div class="text-sm text-blue-200">Active Law Firms</div>
                    </div>
                    <div>
                        <div class="text-2xl font-bold text-yellow-400">99.9%</div>
                        <div class="text-sm text-blue-200">Uptime SLA</div>
                    </div>
                    <div>
                        <div class="text-2xl font-bold text-yellow-400">24/7</div>
                        <div class="text-sm text-blue-200">Support Available</div>
                    </div>
                    <div>
                        <div class="text-2xl font-bold text-yellow-400">ISO</div>
                        <div class="text-sm text-blue-200">Security Certified</div>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Contact Section -->
    <section id="contact" class="py-20 bg-white" data-aos="fade-up">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-16">
                <h2 class="text-4xl font-bold text-gray-900 mb-6">
                    Ready to Get Started?
                </h2>
                <p class="text-xl text-gray-600 max-w-3xl mx-auto">
                    Have questions? Want to see a personalized demo? Our team is here to help you transform your practice.
                </p>
            </div>
            
            <div class="grid lg:grid-cols-2 gap-12">
                <!-- Contact Information -->
                <div>
                    <h3 class="text-2xl font-bold text-gray-900 mb-6">Get in Touch</h3>
                    
                    <div class="space-y-6">
                        <div class="flex items-start">
                            <div class="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                                <i class="fas fa-envelope text-green-600"></i>
                            </div>
                            <div>
                                <h4 class="font-semibold text-gray-900 mb-1">Email Support</h4>
                                <p class="text-gray-600 mb-2">Send us a message anytime</p>
                                <a href="mailto:support@isuccesshub.com" class="text-blue-600 font-semibold hover:text-blue-700">support@isuccesshub.com</a>
                            </div>
                        </div>
                        
                        <div class="flex items-start">
                            <div class="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                                <i class="fas fa-calendar text-purple-600"></i>
                            </div>
                            <div>
                                <h4 class="font-semibold text-gray-900 mb-1">Schedule a Demo</h4>
                                <p class="text-gray-600 mb-2">Book a personalized consultation</p>
                                <button onclick="scheduleCall()" class="text-blue-600 font-semibold hover:text-blue-700">Schedule Now</button>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Social Proof -->
                    <div class="mt-12 p-6 bg-gray-50 rounded-xl">
                        <h4 class="font-semibold text-gray-900 mb-4">Why Law Firms Choose Us</h4>
                        <div class="space-y-3">
                            <div class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-3"></i>
                                <span class="text-gray-700">Guaranteed 24-hour setup</span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-3"></i>
                                <span class="text-gray-700">No technical knowledge required</span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-3"></i>
                                <span class="text-gray-700">60-day money-back guarantee</span>
                            </div>
                            <div class="flex items-center">
                                <i class="fas fa-check text-green-500 mr-3"></i>
                                <span class="text-gray-700">Proven ROI within 90 days</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Contact Form -->
                <div class="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8">
                    <h3 class="text-2xl font-bold text-gray-900 mb-6">Request Information</h3>
                    
                    <form id="contactForm" class="space-y-6">
                        <div class="grid md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">First Name</label>
                                <input type="text" name="firstName" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors">
                            </div>
                            <div>
                                <label class="block text-sm font-semibold text-gray-700 mb-2">Last Name</label>
                                <input type="text" name="lastName" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors">
                            </div>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                            <input type="email" name="email" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                            <input type="tel" name="phone" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Law Firm Name</label>
                            <input type="text" name="firmName" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors">
                        </div>
                        
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">Current Monthly Client Volume</label>
                            <select name="clientVolume" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors">
                                <option value="">Select range</option>
                                <option value="1-10">1-10 clients/month</option>
                                <option value="11-25">11-25 clients/month</option>
                                <option value="26-50">26-50 clients/month</option>
                                <option value="51-100">51-100 clients/month</option>
                                <option value="100+">100+ clients/month</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-sm font-semibold text-gray-700 mb-2">What interests you most?</label>
                            <textarea name="interest" rows="4" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors" placeholder="Tell us about your goals for implementing AssetShield App..."></textarea>
                        </div>
                        
                        <button type="submit" class="w-full bg-blue-600 text-white py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                            <i class="fas fa-paper-plane mr-2"></i>
                            Send Request
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </section>

    <!-- Footer -->
    <footer class="bg-gray-900 text-white py-16">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="grid md:grid-cols-4 gap-8">
                <!-- Company Info -->
                <div class="md:col-span-2">
                    <div class="flex items-center mb-4">
                        <div class="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center mr-3">
                            <i class="fas fa-shield-alt text-white text-lg"></i>
                        </div>
                        <span class="text-2xl font-bold">AssetShield App</span>
                    </div>
                    <p class="text-gray-300 mb-6 max-w-lg">
                        The complete white-label asset protection platform for forward-thinking law firms. Transform your practice with enterprise-grade technology in 24 hours.
                    </p>
                    <div class="flex space-x-4">
                        <a href="#" class="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors">
                            <i class="fab fa-linkedin text-white"></i>
                        </a>
                        <a href="#" class="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors">
                            <i class="fab fa-twitter text-white"></i>
                        </a>
                        <a href="#" class="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-blue-600 transition-colors">
                            <i class="fab fa-youtube text-white"></i>
                        </a>
                    </div>
                </div>
                
                <!-- Quick Links -->
                <div>
                    <h4 class="text-lg font-semibold mb-4">Platform</h4>
                    <ul class="space-y-3">
                        <li><a href="#features" class="text-gray-300 hover:text-white transition-colors">Features</a></li>
                        <li><a href="#pricing" class="text-gray-300 hover:text-white transition-colors">Pricing</a></li>
                        <li><a href="#demo" class="text-gray-300 hover:text-white transition-colors">Demo</a></li>
                        <li><button onclick="startPurchaseFlow('professional')" class="text-gray-300 hover:text-white transition-colors text-left">Get Started</button></li>
                    </ul>
                </div>
                
                <!-- Support -->
                <div>
                    <h4 class="text-lg font-semibold mb-4">Support</h4>
                    <ul class="space-y-3">
                        <li><a href="#contact" class="text-gray-300 hover:text-white transition-colors">Contact Us</a></li>

                        <li><button onclick="scheduleCall()" class="text-gray-300 hover:text-white transition-colors text-left">Schedule Call</button></li>

                    </ul>
                </div>
            </div>
            
            <div class="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
                <p class="text-gray-400 text-sm">
                    © 2024 AssetShield App. All rights reserved.
                </p>
                <div class="flex space-x-6 mt-4 md:mt-0">
                    <a href="#" class="text-gray-400 hover:text-white text-sm transition-colors">Privacy Policy</a>
                    <a href="#" class="text-gray-400 hover:text-white text-sm transition-colors">Terms of Service</a>
                    <a href="#" class="text-gray-400 hover:text-white text-sm transition-colors">Cookie Policy</a>
                </div>
            </div>
        </div>
    </footer>



    <!-- JavaScript -->
    <script>
        // Initialize AOS (Animate On Scroll)
        AOS.init({
            duration: 800,
            once: true,
            offset: 100
        });

        // Mobile Menu Toggle
        document.getElementById('mobile-menu-btn').addEventListener('click', function() {
            const mobileMenu = document.getElementById('mobile-menu');
            mobileMenu.classList.toggle('hidden');
        });

        // Smooth scrolling for navigation links
        function scrollToPricing() {
            document.getElementById('pricing').scrollIntoView({ behavior: 'smooth' });
        }

        // Pricing Toggle
        document.getElementById('monthlyBtn').addEventListener('click', function() {
            this.classList.add('bg-blue-600', 'text-white');
            this.classList.remove('text-gray-700');
            document.getElementById('annualBtn').classList.remove('bg-blue-600', 'text-white');
            document.getElementById('annualBtn').classList.add('text-gray-700');
            
            // Show monthly prices
            document.querySelectorAll('.monthly-price').forEach(el => el.classList.remove('hidden'));
            document.querySelectorAll('.annual-price').forEach(el => el.classList.add('hidden'));
        });

        document.getElementById('annualBtn').addEventListener('click', function() {
            this.classList.add('bg-blue-600', 'text-white');
            this.classList.remove('text-gray-700');
            document.getElementById('monthlyBtn').classList.remove('bg-blue-600', 'text-white');
            document.getElementById('monthlyBtn').classList.add('text-gray-700');
            
            // Show annual prices
            document.querySelectorAll('.monthly-price').forEach(el => el.classList.add('hidden'));
            document.querySelectorAll('.annual-price').forEach(el => el.classList.remove('hidden'));
        });

        // ROI Calculator
        const clientsSlider = document.getElementById('clientsSlider');
        const feeSlider = document.getElementById('feeSlider');
        const clientsValue = document.getElementById('clientsValue');
        const feeValue = document.getElementById('feeValue');
        const revenueIncrease = document.getElementById('revenueIncrease');
        const annualROI = document.getElementById('annualROI');

        function updateROICalculation() {
            const clients = parseInt(clientsSlider.value);
            const fee = parseInt(feeSlider.value);
            
            clientsValue.textContent = clients;
            feeValue.textContent = fee.toLocaleString();
            
            // Calculate 150% increase in clients
            const newClients = Math.round(clients * 2.5);
            const monthlyRevenue = (newClients - clients) * fee;
            const annualRevenue = monthlyRevenue * 12;
            
            // Professional plan annual cost: $14,400 + $10,000 setup = $24,400
            const annualCost = 24400;
            const roi = Math.round((annualRevenue / annualCost) * 100);
            
            revenueIncrease.textContent = '$' + monthlyRevenue.toLocaleString();
            annualROI.textContent = roi.toLocaleString() + '%';
        }

        clientsSlider.addEventListener('input', updateROICalculation);
        feeSlider.addEventListener('input', updateROICalculation);
        
        // Initial calculation
        updateROICalculation();

        // Stats Counter Animation
        function animateStats() {
            const statNumbers = document.querySelectorAll('.stat-number');
            
            statNumbers.forEach(stat => {
                const target = parseInt(stat.getAttribute('data-target'));
                const increment = target / 100;
                let current = 0;
                
                const timer = setInterval(() => {
                    current += increment;
                    stat.textContent = Math.floor(current);
                    
                    if (current >= target) {
                        stat.textContent = target;
                        clearInterval(timer);
                    }
                }, 20);
            });
        }

        // Trigger stats animation when hero section is visible
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateStats();
                    observer.unobserve(entry.target);
                }
            });
        });

        const heroSection = document.querySelector('section');
        if (heroSection) {
            observer.observe(heroSection);
        }

        // Impact Chart
        function createImpactChart() {
            const ctx = document.getElementById('impactChart').getContext('2d');
            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5'],
                    datasets: [{
                        label: 'Traditional Firms',
                        data: [100, 105, 110, 115, 120],
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        tension: 0.4
                    }, {
                        label: 'AssetShield App Firms',
                        data: [100, 180, 290, 420, 580],
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Revenue Growth %'
                            }
                        }
                    }
                }
            });
        }

        // Initialize chart when page loads
        document.addEventListener('DOMContentLoaded', function() {
            setTimeout(createImpactChart, 1000);
        });

        // Testimonials Carousel
        let currentTestimonial = 0;
        const totalTestimonials = 2;

        function nextTestimonial() {
            currentTestimonial = (currentTestimonial + 1) % totalTestimonials;
            updateTestimonialCarousel();
        }

        function prevTestimonial() {
            currentTestimonial = (currentTestimonial - 1 + totalTestimonials) % totalTestimonials;
            updateTestimonialCarousel();
        }

        function updateTestimonialCarousel() {
            const carousel = document.getElementById('testimonialCarousel');
            carousel.style.transform = \`translateX(-\${currentTestimonial * 100}%)\`;
        }

        document.getElementById('nextTestimonial').addEventListener('click', nextTestimonial);
        document.getElementById('prevTestimonial').addEventListener('click', prevTestimonial);

        // Auto-advance testimonials
        setInterval(nextTestimonial, 10000);

        // FAQ Toggle
        function toggleFAQ(index) {
            const content = document.getElementById(\`faq-content-\${index}\`);
            const icon = document.getElementById(\`faq-icon-\${index}\`);
            
            content.classList.toggle('hidden');
            icon.classList.toggle('rotate-180');
        }

        // Video Modal
        function window.location.href='/#assessment' {
            document.getElementById('videoModal').classList.remove('hidden');
            document.getElementById('videoModal').classList.add('flex');
            document.body.style.overflow = 'hidden';
        }

        function closeVideoModal() {
            document.getElementById('videoModal').classList.add('hidden');
            document.getElementById('videoModal').classList.remove('flex');
            document.body.style.overflow = 'auto';
        }

        // Contact Form
        document.getElementById('contactForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Show success message
            alert('Thank you for your interest! We will contact you within 24 hours to discuss your AssetShield App implementation.');
            
            // In a real implementation, you would send this data to your backend
            console.log('Contact form submitted:', new FormData(this));
        });

        // Purchase Flow - Redirect to main AssetShield app
        function startPurchaseFlow(tier) {
            // Redirect to the main AssetShield app with the selected tier
            // This will take law firms to the actual purchase page
            window.location.href = \`/#pricing\`;
        }

        // Schedule Call
        function scheduleCall() {
            // In a real implementation, this would open a calendar booking widget
            alert('Calendar booking system would open here. For now, please call +1 (800) 555-0123 to schedule your consultation.');
        }


    </script>
</body>
</html>
  `)
})

export { app as marketingRoutes }