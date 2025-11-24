<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enhanced Dashboard - AfroGazette</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    fontFamily: {
                        'sans': ['Inter', 'system-ui', 'sans-serif'],
                    },
                    colors: {
                        'ag-black': '#000000',
                        'ag-red': '#FF0033',
                        'ag-white': '#FFFFFF',
                    }
                }
            }
        }
    </script>

    <style>
        /* Custom animations */
        @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        
        .animate-slide-up {
            animation: slideUp 0.6s ease-out forwards;
        }
        
        .animate-fade-in {
            animation: fadeIn 0.8s ease-out forwards;
        }
        
        /* Stagger animation delays */
        .delay-100 { animation-delay: 0.1s; opacity: 0; }
        .delay-200 { animation-delay: 0.2s; opacity: 0; }
        .delay-300 { animation-delay: 0.3s; opacity: 0; }
        .delay-400 { animation-delay: 0.4s; opacity: 0; }
        
        /* Custom scrollbar */
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        
        /* Chart container styling */
        .chart-container {
            position: relative;
            background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
            border: 1px solid #e2e8f0;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        
        /* Glass effect cards */
        .glass-card {
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
    </style>
</head>

<body class="bg-gray-50 font-sans">
    <!-- Fixed Header -->
    <header class="bg-black border-b border-gray-800 fixed top-0 left-0 right-0 z-50">
        <div class="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
                <div class="flex items-center space-x-8">
                    <!-- Logo -->
                    <div class="flex-shrink-0">
                        <button class="flex items-center space-x-3 text-white hover:opacity-80 transition-opacity duration-200">
                            <div class="h-8 w-8 bg-ag-red rounded-lg flex items-center justify-center">
                                <span class="text-white font-bold text-sm">AG</span>
                            </div>
                            <span class="text-xl font-bold tracking-tight">AfroGazette</span>
                        </button>
                    </div>

                    <!-- Desktop Navigation -->
                    <nav class="hidden md:flex space-x-1">
                        <button class="flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-ag-red text-white">
                            <i data-lucide="bar-chart-3" class="h-4 w-4 mr-2"></i>
                            Dashboard
                        </button>
                        <button class="flex items-center px-4 py-2 text-sm font-medium rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors duration-200">
                            <i data-lucide="plus" class="h-4 w-4 mr-2"></i>
                            Create Advert
                        </button>
                        <button class="flex items-center px-4 py-2 text-sm font-medium rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors duration-200">
                            <i data-lucide="clock" class="h-4 w-4 mr-2"></i>
                            Pending
                        </button>
                        <button class="flex items-center px-4 py-2 text-sm font-medium rounded-lg text-gray-300 hover:text-white hover:bg-gray-800 transition-colors duration-200">
                            <i data-lucide="calendar" class="h-4 w-4 mr-2"></i>
                            Schedule
                        </button>
                    </nav>
                </div>

                <div class="flex items-center space-x-4">
                    <div class="hidden md:flex items-center space-x-3">
                        <div class="text-right">
                            <div class="text-sm font-medium text-white">John Admin</div>
                            <div class="text-xs text-gray-400">Administrator</div>
                        </div>
                    </div>
                    <button class="flex items-center px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors duration-200">
                        <i data-lucide="log-out" class="h-4 w-4 mr-2"></i>
                        Logout
                    </button>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="pt-16 min-h-screen">
        <!-- Page Header -->
        <div class="bg-white border-b border-gray-200 sticky top-16 z-10">
            <div class="max-w-7xl mx-auto px-6 py-6">
                <div class="flex items-center justify-between">
                    <div class="animate-slide-up">
                        <h1 class="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                        <p class="mt-1 text-sm text-gray-500">Real-time analytics and performance insights</p>
                    </div>
                    <div class="flex items-center space-x-3 animate-slide-up delay-100">
                        <div class="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span class="text-sm text-gray-600 font-medium">Live Data</span>
                        <button class="bg-ag-red text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors duration-200">
                            <i data-lucide="download" class="h-4 w-4 mr-2 inline"></i>
                            Export Report
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div class="max-w-7xl mx-auto px-6 py-8">
            <!-- Key Metrics Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <!-- Total Revenue Card -->
                <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 animate-slide-up delay-100">
                    <div class="flex items-center justify-between mb-4">
                        <div class="p-3 rounded-xl bg-green-50 text-green-600">
                            <i data-lucide="trending-up" class="h-6 w-6"></i>
                        </div>
                        <div class="text-right">
                            <div class="text-sm text-green-600 font-semibold">+12.5%</div>
                            <div class="text-xs text-gray-500">vs last month</div>
                        </div>
                    </div>
                    <div class="space-y-1">
                        <p class="text-sm font-medium text-gray-600">Total Revenue</p>
                        <p class="text-2xl font-bold text-gray-900">$247,890</p>
                        <div class="flex items-center space-x-1">
                            <div class="h-1 bg-green-200 rounded-full flex-1">
                                <div class="h-1 bg-green-500 rounded-full w-3/4"></div>
                            </div>
                            <span class="text-xs text-gray-500">Goal: $300k</span>
                        </div>
                    </div>
                </div>

                <!-- Active Adverts Card -->
                <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 animate-slide-up delay-200">
                    <div class="flex items-center justify-between mb-4">
                        <div class="p-3 rounded-xl bg-blue-50 text-blue-600">
                            <i data-lucide="activity" class="h-6 w-6"></i>
                        </div>
                        <div class="text-right">
                            <div class="text-sm text-blue-600 font-semibold">+8.2%</div>
                            <div class="text-xs text-gray-500">vs last week</div>
                        </div>
                    </div>
                    <div class="space-y-1">
                        <p class="text-sm font-medium text-gray-600">Active Adverts</p>
                        <p class="text-2xl font-bold text-gray-900">1,247</p>
                        <p class="text-sm text-gray-500">84 campaigns running</p>
                    </div>
                </div>

                <!-- Pending Approvals Card -->
                <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 animate-slide-up delay-300">
                    <div class="flex items-center justify-between mb-4">
                        <div class="p-3 rounded-xl bg-amber-50 text-amber-600">
                            <i data-lucide="clock" class="h-6 w-6"></i>
                        </div>
                        <div class="text-right">
                            <div class="text-sm text-amber-600 font-semibold">23 new</div>
                            <div class="text-xs text-gray-500">in 24h</div>
                        </div>
                    </div>
                    <div class="space-y-1">
                        <p class="text-sm font-medium text-gray-600">Pending Approval</p>
                        <p class="text-2xl font-bold text-gray-900">156</p>
                        <p class="text-sm text-gray-500">Avg. approval: 2.4h</p>
                    </div>
                </div>

                <!-- Performance Score Card -->
                <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 animate-slide-up delay-400">
                    <div class="flex items-center justify-between mb-4">
                        <div class="p-3 rounded-xl bg-purple-50 text-purple-600">
                            <i data-lucide="zap" class="h-6 w-6"></i>
                        </div>
                        <div class="text-right">
                            <div class="text-sm text-purple-600 font-semibold">Excellent</div>
                            <div class="text-xs text-gray-500">+2 points</div>
                        </div>
                    </div>
                    <div class="space-y-1">
                        <p class="text-sm font-medium text-gray-600">Performance Score</p>
                        <p class="text-2xl font-bold text-gray-900">94/100</p>
                        <div class="flex items-center space-x-1">
                            <div class="h-1 bg-gray-200 rounded-full flex-1">
                                <div class="h-1 bg-purple-500 rounded-full w-11/12"></div>
                            </div>
                            <span class="text-xs text-gray-500">94%</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Charts Section -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <!-- Revenue Trend Chart -->
                <div class="chart-container animate-slide-up delay-500">
                    <div class="flex items-center justify-between mb-6">
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900">Revenue Trend</h3>
                            <p class="text-sm text-gray-500">Last 6 months performance</p>
                        </div>
                        <div class="flex space-x-2">
                            <button class="px-3 py-1 text-xs font-medium bg-ag-red text-white rounded-lg">6M</button>
                            <button class="px-3 py-1 text-xs font-medium text-gray-500 hover:text-gray-900">1Y</button>
                        </div>
                    </div>
                    <canvas id="revenueChart" width="400" height="200"></canvas>
                </div>

                <!-- Category Distribution Chart -->
                <div class="chart-container animate-slide-up delay-600">
                    <div class="flex items-center justify-between mb-6">
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900">Category Performance</h3>
                            <p class="text-sm text-gray-500">Revenue by category</p>
                        </div>
                        <div class="flex items-center space-x-2">
                            <div class="h-2 w-2 bg-green-500 rounded-full"></div>
                            <span class="text-xs text-gray-600">Live</span>
                        </div>
                    </div>
                    <canvas id="categoryChart" width="400" height="200"></canvas>
                </div>
            </div>

            <!-- Advanced Analytics Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                <!-- Top Performers Table -->
                <div class="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-slide-up delay-700">
                    <div class="px-6 py-4 bg-gray-50 border-b border-gray-200">
                        <div class="flex items-center justify-between">
                            <div class="flex items-center space-x-3">
                                <i data-lucide="users" class="h-5 w-5 text-gray-400"></i>
                                <h3 class="text-lg font-semibold text-gray-900">Top Sales Performers</h3>
                            </div>
                            <button class="text-sm text-ag-red font-medium hover:text-red-700">View All</button>
                        </div>
                    </div>
                    
                    <div class="overflow-x-auto custom-scrollbar">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales Rep</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adverts</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trend</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                <tr class="hover:bg-gray-50 transition-colors duration-150">
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="flex items-center">
                                            <div class="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                                                <span class="text-green-600 font-semibold text-sm">SA</span>
                                            </div>
                                            <div class="ml-3">
                                                <div class="text-sm font-medium text-gray-900">Sarah Adams</div>
                                                <div class="text-sm text-gray-500">sarah@example.com</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="text-sm font-semibold text-gray-900">$48,320</div>
                                        <div class="text-xs text-green-600">+12% this month</div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="text-sm text-gray-900">127</div>
                                        <div class="text-xs text-gray-500">23 active</div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="flex items-center">
                                            <div class="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                                <div class="bg-green-500 h-2 rounded-full" style="width: 94%"></div>
                                            </div>
                                            <span class="text-sm font-medium text-gray-900">94%</span>
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="flex items-center space-x-1 text-green-600">
                                            <i data-lucide="trending-up" class="h-4 w-4"></i>
                                            <span class="text-sm">+12%</span>
                                        </div>
                                    </td>
                                </tr>
                                
                                <tr class="hover:bg-gray-50 transition-colors duration-150">
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="flex items-center">
                                            <div class="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                <span class="text-blue-600 font-semibold text-sm">MJ</span>
                                            </div>
                                            <div class="ml-3">
                                                <div class="text-sm font-medium text-gray-900">Michael Johnson</div>
                                                <div class="text-sm text-gray-500">michael@example.com</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="text-sm font-semibold text-gray-900">$41,250</div>
                                        <div class="text-xs text-green-600">+8% this month</div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="text-sm text-gray-900">98</div>
                                        <div class="text-xs text-gray-500">19 active</div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="flex items-center">
                                            <div class="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                                <div class="bg-blue-500 h-2 rounded-full" style="width: 89%"></div>
                                            </div>
                                            <span class="text-sm font-medium text-gray-900">89%</span>
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="flex items-center space-x-1 text-green-600">
                                            <i data-lucide="trending-up" class="h-4 w-4"></i>
                                            <span class="text-sm">+8%</span>
                                        </div>
                                    </td>
                                </tr>
                                
                                <tr class="hover:bg-gray-50 transition-colors duration-150">
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="flex items-center">
                                            <div class="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                                                <span class="text-purple-600 font-semibold text-sm">ED</span>
                                            </div>
                                            <div class="ml-3">
                                                <div class="text-sm font-medium text-gray-900">Emma Davis</div>
                                                <div class="text-sm text-gray-500">emma@example.com</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="text-sm font-semibold text-gray-900">$38,190</div>
                                        <div class="text-xs text-amber-600">+3% this month</div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="text-sm text-gray-900">89</div>
                                        <div class="text-xs text-gray-500">15 active</div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="flex items-center">
                                            <div class="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                                <div class="bg-purple-500 h-2 rounded-full" style="width: 86%"></div>
                                            </div>
                                            <span class="text-sm font-medium text-gray-900">86%</span>
                                        </div>
                                    </td>
                                    <td class="px-6 py-4 whitespace-nowrap">
                                        <div class="flex items-center space-x-1 text-green-600">
                                            <i data-lucide="trending-up" class="h-4 w-4"></i>
                                            <span class="text-sm">+3%</span>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Quick Actions & Insights -->
                <div class="space-y-6 animate-slide-up delay-800">
                    <!-- Quick Actions -->
                    <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                        <div class="space-y-3">
                            <button class="w-full flex items-center p-3 text-left bg-ag-red text-white rounded-lg hover:bg-red-600 transition-colors duration-200">
                                <i data-lucide="plus-circle" class="h-5 w-5 mr-3"></i>
                                Create New Campaign
                            </button>
                            <button class="w-full flex items-center p-3 text-left bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors duration-200">
                                <i data-lucide="clock" class="h-5 w-5 mr-3"></i>
                                Review Pending (156)
                            </button>
                            <button class="w-full flex items-center p-3 text-left bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors duration-200">
                                <i data-lucide="download" class="h-5 w-5 mr-3"></i>
                                Export Monthly Report
                            </button>
                        </div>
                    </div>

                    <!-- Platform Health -->
                    <div class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <h3 class="text-lg font-semibold text-gray-900 mb-4">Platform Health</h3>
                        <div class="space-y-4">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center space-x-2">
                                    <div class="h-2 w-2 bg-green-500 rounded-full"></div>
                                    <span class="text-sm text-gray-600">System Status</span>
                                </div>
                                <span class="text-sm font-medium text-green-600">Operational</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <div class="flex items-center space-x-2">
                                    <div class="h-2 w-2 bg-blue-500 rounded-full"></div>
                                    <span class="text-sm text-gray-600">API Response</span>
                                </div>
                                <span class="text-sm font-medium text-blue-600">145ms</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <div class="flex items-center space-x-2">
                                    <div class="h-2 w-2 bg-purple-500 rounded-full"></div>
                                    <span class="text-sm text-gray-600">Slot Utilization</span>
                                </div>
                                <span class="text-sm font-medium text-purple-600">78%</span>
                            </div>
                        </div>
                    </div>

                    <!-- AI Insights -->
                    <div class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-200 p-6">
                        <div class="flex items-center space-x-2 mb-3">
                            <i data-lucide="brain" class="h-5 w-5 text-purple-600"></i>
                            <h3 class="text-lg font-semibold text-gray-900">AI Insights</h3>
                        </div>
                        <div class="space-y-3">
                            <div class="bg-white/70 rounded-lg p-3 border border-purple-100">
                                <div class="text-sm font-medium text-gray-900 mb-1">💡 Optimization Tip</div>
                                <div class="text-xs text-gray-600">Peak performance time: 2-4 PM. Consider promoting premium slots.</div>
                            </div>
                            <div class="bg-white/70 rounded-lg p-3 border border-purple-100">
                                <div class="text-sm font-medium text-gray-900 mb-1">📈 Trend Alert</div>
                                <div class="text-xs text-gray-600">Automotive category up 23% this week. High demand expected.</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Expiring Soon Alert -->
            <div class="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden animate-slide-up delay-900">
                <div class="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-amber-200">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <div class="flex-shrink-0">
                                <i data-lucide="alert-triangle" class="h-6 w-6 text-amber-600"></i>
                            </div>
                            <div>
                                <h3 class="text-lg font-semibold text-amber-900">Adverts Expiring Soon</h3>
                                <p class="text-sm text-amber-700">These campaigns need immediate attention</p>
                            </div>
                        </div>
                        <div class="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">
                            12 adverts
                        </div>
                    </div>
                </div>
                
                <div class="overflow-x-auto custom-scrollbar">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time Slot</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Left</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            <tr class="hover:bg-gray-50 transition-colors duration-150">
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="font-semibold text-gray-900">TechCorp Solutions</div>
                                    <div class="text-sm text-gray-500">Premium client</div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Technology</span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    10:00 AM - Groups
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                        2 days
                                    </span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <button class="bg-ag-red text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-red-600 transition-colors duration-200">
                                        Extend Campaign
                                    </button>
                                </td>
                            </tr>
                            
                            <tr class="hover:bg-gray-50 transition-colors duration-150">
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <div class="font-semibold text-gray-900">Fashion Forward</div>
                                    <div class="text-sm text-gray-500">Regular client</div>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">Fashion</span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    2:00 PM - Channel
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                                        1 day
                                    </span>
                                </td>
                                <td class="px-6 py-4 whitespace-nowrap">
                                    <button class="bg-ag-red text-white px-3 py-1 rounded-lg text-xs font-medium hover:bg-red-600 transition-colors duration-200">
                                        Extend Campaign
                                    </button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </main>

    <script>
        // Initialize Lucide icons
        lucide.createIcons();

        // Initialize charts after page load
        window.addEventListener('load', function() {
            setTimeout(initializeCharts, 100);
        });

        function initializeCharts() {
            // Revenue Trend Chart
            const revenueCtx = document.getElementById('revenueChart');
            if (revenueCtx) {
                new Chart(revenueCtx, {
                    type: 'line',
                    data: {
                        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                        datasets: [{
                            label: 'Revenue',
                            data: [165000, 178000, 192000, 205000, 231000, 247000],
                            borderColor: '#FF0033',
                            backgroundColor: 'rgba(255, 0, 51, 0.1)',
                            tension: 0.4,
                            pointBackgroundColor: '#FF0033',
                            pointBorderColor: '#FFFFFF',
                            pointBorderWidth: 2,
                            pointRadius: 6,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: false,
                                ticks: {
                                    callback: function(value) {
                                        return '$' + (value / 1000) + 'k';
                                    }
                                },
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.05)'
                                }
                            },
                            x: {
                                grid: {
                                    display: false
                                }
                            }
                        }
                    }
                });
            }

            // Category Distribution Chart
            const categoryCtx = document.getElementById('categoryChart');
            if (categoryCtx) {
                new Chart(categoryCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Technology', 'Fashion', 'Automotive', 'Health', 'Finance', 'Others'],
                        datasets: [{
                            data: [28, 22, 18, 15, 12, 5],
                            backgroundColor: [
                                '#3B82F6',
                                '#EC4899',
                                '#10B981',
                                '#F59E0B',
                                '#8B5CF6',
                                '#6B7280'
                            ],
                            borderColor: '#FFFFFF',
                            borderWidth: 3,
                            hoverOffset: 10
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '60%',
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    padding: 20,
                                    usePointStyle: true
                                }
                            }
                        }
                    }
                });
            }
        }
    </script>
</body>
</html>
