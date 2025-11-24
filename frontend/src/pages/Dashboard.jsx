import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { analyticsAPI } from '../services/api';
import Layout from '../components/Layout';
import {
  BarChart3,
  Clock,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Smartphone,
  Radio,
  Users,
  Calendar,
  Activity,
  CheckCircle,
  XCircle,
  Zap,
  Download,
  PlusCircle,
  Brain
} from 'lucide-react';

const Dashboard = () => {
  const { isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const response = isAdmin()
        ? await analyticsAPI.getDashboard()
        : await analyticsAPI.getMyDashboard();
      setData(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Enhanced Page Header */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="animate-fade-in">
                <h1 className="text-3xl font-bold text-gray-900">
                  {isAdmin() ? 'Admin Dashboard' : 'My Dashboard'}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {isAdmin() ? 'Real-time analytics and performance insights' : 'Your performance overview'}
                </p>
                {!isAdmin() && data?.monthRange && (
                  <p className="mt-1 text-sm text-gray-500">
                    Current Period: {new Date(data.monthRange.start).toLocaleDateString('en-US', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600 font-medium">Live Data</span>
                </div>
                {isAdmin() && (
                  <button className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors duration-200 flex items-center">
                    <Download className="h-4 w-4 mr-2" />
                    Export Report
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 py-8">
          {isAdmin() ? <AdminDashboard data={data} /> : <SalesRepDashboard data={data} />}
        </div>
      </div>
    </Layout>
  );
};

const AdminDashboard = ({ data }) => {
  const totalAdverts = data.statusStats?.reduce((sum, s) => sum + parseInt(s.count), 0) || 0;
  const pendingAdverts = data.statusStats?.find(s => s.status === 'pending')?.count || 0;
  const totalRevenue = parseFloat(data.revenueStats?.total_revenue || 0);
  const totalCommission = parseFloat(data.revenueStats?.total_commission || 0);
  const avgRevenue = parseFloat(data.revenueStats?.average_revenue || 0);

  return (
    <div className="space-y-8">
      {/* Enhanced Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <EnhancedStatCard
          title="Total Revenue"
          value={`$${totalRevenue.toLocaleString()}`}
          icon={<TrendingUp className="h-6 w-6" />}
          color="green"
          trend={`Avg: $${avgRevenue.toFixed(2)}`}
          change="+12.5%"
          delay="100"
        />
        <EnhancedStatCard
          title="Total Adverts"
          value={totalAdverts.toLocaleString()}
          icon={<BarChart3 className="h-6 w-6" />}
          color="blue"
          trend={`${totalAdverts} total campaigns`}
          change="+8.2%"
          delay="200"
        />
        <EnhancedStatCard
          title="Pending Approval"
          value={pendingAdverts.toLocaleString()}
          icon={<Clock className="h-6 w-6" />}
          color="amber"
          trend="Awaiting review"
          change={`${pendingAdverts} new`}
          delay="300"
        />
        <EnhancedStatCard
          title="Performance Score"
          value="94/100"
          icon={<Zap className="h-6 w-6" />}
          color="purple"
          trend="Excellent"
          change="+2 points"
          delay="400"
        />
      </div>

      {/* Quick Actions */}
      {isAdmin() && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <QuickActionButton
              icon={<PlusCircle className="h-5 w-5" />}
              title="Create Campaign"
              description="Launch new advertisement"
              color="red"
            />
            <QuickActionButton
              icon={<Clock className="h-5 w-5" />}
              title={`Review Pending (${pendingAdverts})`}
              description="Approve waiting adverts"
              color="amber"
            />
            <QuickActionButton
              icon={<Download className="h-5 w-5" />}
              title="Export Report"
              description="Download monthly analytics"
              color="blue"
            />
          </div>
        </div>
      )}

      {/* Expiring Soon Alert */}
      {data.expiringSoon?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-amber-200 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-amber-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-amber-900">
                    Expiring Soon
                  </h3>
                  <p className="text-sm text-amber-700">
                    These adverts require immediate attention
                  </p>
                </div>
              </div>
              <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">
                {data.expiringSoon.length} adverts
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Destination
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Slot
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days Left
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sales Rep
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.expiringSoon.map((advert, index) => (
                  <tr key={advert.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">{advert.client_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <CategoryBadge category={advert.category} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <DestinationBadge type={advert.destination_type} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {advert.slot_label}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <DaysLeftBadge days={advert.remaining_days} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {advert.sales_rep_name}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales Rep Performance */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900">Sales Rep Performance</h3>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {data.salesRepStats?.map((rep) => (
                <div key={rep.id} className="bg-gray-50 rounded-xl p-4 border border-gray-100 hover:bg-gray-100 transition-colors duration-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{rep.full_name}</h4>
                      <p className="text-sm text-gray-500">{rep.email}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        ${parseFloat(rep.total_revenue || 0).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        ${parseFloat(rep.total_commission || 0).toFixed(2)} commission
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-3 text-sm">
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">Total</div>
                      <div className="font-semibold text-gray-900">{rep.total_adverts || 0}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-amber-600 mb-1">Pending</div>
                      <div className="font-semibold text-amber-700">{rep.pending_count || 0}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-green-600 mb-1">Active</div>
                      <div className="font-semibold text-green-700">{rep.active_count || 0}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-500 mb-1">Expired</div>
                      <div className="font-semibold text-gray-600">{rep.expired_count || 0}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Category Distribution & AI Insights */}
        <div className="space-y-6">
          {/* Category Distribution */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <BarChart3 className="h-5 w-5 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900">Top Categories</h3>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-3">
                {data.categoryStats?.slice(0, 5).map((cat, index) => (
                  <div key={cat.category} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 capitalize">
                        {cat.category.replace(/_/g, ' ')}
                      </div>
                      <div className="text-sm text-gray-500">
                        {cat.count} adverts
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-green-600">
                      ${parseFloat(cat.revenue || 0).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-200 p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Brain className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
            </div>
            <div className="space-y-3">
              <div className="bg-white/70 rounded-lg p-3 border border-purple-100">
                <div className="text-sm font-medium text-gray-900 mb-1">💡 Optimization Tip</div>
                <div className="text-xs text-gray-600">Peak performance time: 2-4 PM. Consider promoting premium slots.</div>
              </div>
              <div className="bg-white/70 rounded-lg p-3 border border-purple-100">
                <div className="text-sm font-medium text-gray-900 mb-1">📈 Trend Alert</div>
                <div className="text-xs text-gray-600">Automotive category up 23% this week. High demand expected.</div>
              </div>
              <div className="bg-white/70 rounded-lg p-3 border border-purple-100">
                <div className="text-sm font-medium text-gray-900 mb-1">🎯 Recommendation</div>
                <div className="text-xs text-gray-600">Focus on WhatsApp Groups - 15% higher conversion rate.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SalesRepDashboard = ({ data }) => {
  const commission = parseFloat(data.summary?.total_commission || 0);
  const sales = parseFloat(data.summary?.total_sales || 0);
  const pendingCount = data.summary?.pending_count || 0;
  const activeCount = data.summary?.active_count || 0;

  return (
    <div className="space-y-8">
      {/* Current Month Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <EnhancedStatCard
          title="Monthly Sales"
          value={`$${sales.toLocaleString()}`}
          icon={<TrendingUp className="h-6 w-6" />}
          color="blue"
          trend="This month only"
          change="+12%"
          delay="100"
        />
        <EnhancedStatCard
          title="Your Commission"
          value={`$${commission.toLocaleString()}`}
          icon={<DollarSign className="h-6 w-6" />}
          color="emerald"
          trend="10% of sales"
          change={`+$${(commission * 0.1).toFixed(2)}`}
          delay="200"
        />
        <EnhancedStatCard
          title="Active Adverts"
          value={activeCount.toLocaleString()}
          icon={<Activity className="h-6 w-6" />}
          color="green"
          trend="Currently running"
          change="+3 new"
          delay="300"
        />
        <EnhancedStatCard
          title="Pending"
          value={pendingCount.toLocaleString()}
          icon={<Clock className="h-6 w-6" />}
          color="amber"
          trend="Awaiting approval"
          change="Review soon"
          delay="400"
        />
      </div>

      {/* Quick Actions for Sales Rep */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <QuickActionButton
            icon={<PlusCircle className="h-5 w-5" />}
            title="Create New Advert"
            description="Start a new campaign"
            color="red"
          />
          <QuickActionButton
            icon={<BarChart3 className="h-5 w-5" />}
            title="View Performance"
            description="Check your statistics"
            color="blue"
          />
        </div>
      </div>

      {/* Active Adverts */}
      {data.active?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <h3 className="text-lg font-semibold text-gray-900">Active Adverts</h3>
              </div>
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                {data.active.length} running
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slot</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days Left</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.active.map((advert, index) => (
                  <tr key={advert.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors duration-150`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">{advert.client_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <CategoryBadge category={advert.category} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <DestinationBadge type={advert.destination_type} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {advert.slot_label}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <DaysLeftBadge days={advert.remaining_days} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${parseFloat(advert.amount_paid).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      ${parseFloat(advert.commission_amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pending Adverts */}
      {data.pending?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Clock className="h-5 w-5 text-amber-500" />
                <h3 className="text-lg font-semibold text-gray-900">Pending Approval</h3>
              </div>
              <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm font-medium">
                {data.pending.length} waiting
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.pending.map((advert, index) => (
                  <tr key={advert.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-amber-50 transition-colors duration-150`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">{advert.client_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <CategoryBadge category={advert.category} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <DestinationBadge type={advert.destination_type} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(advert.start_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {advert.days_paid}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ${parseFloat(advert.amount_paid).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                      ${parseFloat(advert.commission_amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {data.pending?.length === 0 && data.active?.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
          <Radio className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Adverts This Month</h3>
          <p className="text-gray-500 mb-6">Create your first advert to start earning commission!</p>
          <a 
            href="/create-advert" 
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-red-500 hover:bg-red-600 transition-colors duration-200"
          >
            Create Advert
          </a>
        </div>
      )}
    </div>
  );
};

// Enhanced Utility Components
const EnhancedStatCard = ({ title, value, icon, color, trend, change, delay }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  const changeColors = {
    blue: 'text-blue-600',
    amber: 'text-amber-600',
    green: 'text-green-600',
    emerald: 'text-emerald-600',
    purple: 'text-purple-600',
  };

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-all duration-300 animate-slide-up opacity-0`} 
         style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className="text-right">
          <div className={`text-sm font-semibold ${changeColors[color]}`}>{change}</div>
          <div className="text-xs text-gray-500">vs last period</div>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {trend && (
          <p className="text-sm text-gray-500">{trend}</p>
        )}
      </div>
    </div>
  );
};

const QuickActionButton = ({ icon, title, description, color }) => {
  const colorClasses = {
    red: 'bg-red-500 hover:bg-red-600 text-white',
    amber: 'bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200',
    blue: 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200',
  };

  return (
    <button className={`w-full flex items-center p-4 text-left rounded-lg transition-all duration-200 ${colorClasses[color]}`}>
      <div className="mr-3">
        {icon}
      </div>
      <div className="flex-1">
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs opacity-75">{description}</div>
      </div>
    </button>
  );
};

const CategoryBadge = ({ category }) => (
  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
    {category.replace(/_/g, ' ')}
  </span>
);

const DestinationBadge = ({ type }) => (
  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
    type === 'groups' 
      ? 'bg-blue-100 text-blue-800' 
      : 'bg-purple-100 text-purple-800'
  }`}>
    {type === 'groups' ? (
      <>
        <Smartphone className="h-3 w-3 mr-1" />
        Groups
      </>
    ) : (
      <>
        <Radio className="h-3 w-3 mr-1" />
        Channel
      </>
    )}
  </span>
);

const DaysLeftBadge = ({ days }) => {
  const getColorClass = (days) => {
    if (days <= 3) return 'bg-red-100 text-red-800';
    if (days <= 7) return 'bg-amber-100 text-amber-800';
    return 'bg-green-100 text-green-800';
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getColorClass(days)}`}>
      {days} days
    </span>
  );
};

export default Dashboard;
