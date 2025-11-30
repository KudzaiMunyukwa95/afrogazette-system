import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { analyticsAPI } from '../services/api';
import {
  TrendingUp,
  Users,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  BarChart
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = isAdmin()
        ? await analyticsAPI.getDashboard()
        : await analyticsAPI.getMyDashboard();
      setData(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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

  if (!data) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">Failed to load dashboard</h3>
            <p className="mt-1 text-gray-500">Please try refreshing the page.</p>
            <button
              onClick={fetchDashboardData}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-6">
          {/* Welcome Section */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.full_name?.split(' ')[0] || 'User'}!
            </h1>
            <p className="mt-1 text-gray-500">
              Here's what's happening with your {isAdmin() ? 'platform' : 'campaigns'} today.
            </p>
          </div>

          {isAdmin() ? (
            <AdminDashboard data={data} />
          ) : (
            <SalesRepDashboard data={data} />
          )}
        </div>
      </div>
    </Layout>
  );
};

const AdminDashboard = ({ data }) => {
  const { statusStats, revenueStats, salesRepStats, expiringSoon } = data;

  const activeCount = statusStats.find(s => s.status === 'active')?.count || 0;
  const pendingCount = statusStats.find(s => s.status === 'pending')?.count || 0;

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={`$${Number(revenueStats?.total_revenue || 0).toLocaleString()}`}
          icon={<DollarSign className="h-6 w-6" />}
          color="green"
          trend="+12.5%" // Placeholder trend
          trendUp={true}
        />
        <StatCard
          title="Active Adverts"
          value={activeCount}
          icon={<CheckCircle className="h-6 w-6" />}
          color="blue"
        />
        <StatCard
          title="Pending Approvals"
          value={pendingCount}
          icon={<Clock className="h-6 w-6" />}
          color="amber"
          link="/pending-approvals"
        />
        <StatCard
          title="Total Commission"
          value={`$${Number(revenueStats?.total_commission || 0).toLocaleString()}`}
          icon={<PieChart className="h-6 w-6" />}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Top Sales Reps */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Top Sales Representatives</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="text-left py-3 text-xs font-medium text-gray-500 uppercase">Adverts</th>
                  <th className="text-right py-3 text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  <th className="text-right py-3 text-xs font-medium text-gray-500 uppercase">Commission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {salesRepStats.slice(0, 5).map((rep) => (
                  <tr key={rep.id} className="hover:bg-gray-50">
                    <td className="py-3 text-sm font-medium text-gray-900">{rep.full_name}</td>
                    <td className="py-3 text-sm text-gray-500">{rep.total_adverts}</td>
                    <td className="py-3 text-right text-sm font-medium text-gray-900">
                      ${Number(rep.total_revenue).toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-sm font-medium text-green-600">
                      ${Number(rep.total_commission).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expiring Soon */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Expiring Soon</h3>
          <div className="space-y-4">
            {expiringSoon.slice(0, 5).map((ad) => (
              <div key={ad.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {ad.client_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {ad.remaining_days} days remaining
                  </p>
                </div>
              </div>
            ))}
            {expiringSoon.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No adverts expiring soon.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const SalesRepDashboard = ({ data }) => {
  const { summary, active, pending, expired } = data;

  return (
    <div className="space-y-8">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          title="Monthly Sales"
          value={`$${Number(summary?.total_sales || 0).toLocaleString()}`}
          icon={<DollarSign className="h-6 w-6" />}
          color="green"
        />
        <StatCard
          title="Monthly Commission"
          value={`$${Number(summary?.total_commission || 0).toLocaleString()}`}
          icon={<TrendingUp className="h-6 w-6" />}
          color="emerald"
        />
        <StatCard
          title="Active Adverts"
          value={summary?.active_count || 0}
          icon={<CheckCircle className="h-6 w-6" />}
          color="blue"
        />
        <StatCard
          title="Pending Adverts"
          value={summary?.pending_count || 0}
          icon={<Clock className="h-6 w-6" />}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Adverts List */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Active Campaigns</h3>
            <Link to="/my-adverts" className="text-sm text-red-600 hover:text-red-700 font-medium">
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 text-xs font-medium text-gray-500 uppercase">Client</th>
                  <th className="text-left py-3 text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="text-left py-3 text-xs font-medium text-gray-500 uppercase">End Date</th>
                  <th className="text-right py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {active.slice(0, 5).map((ad) => (
                  <tr key={ad.id} className="hover:bg-gray-50">
                    <td className="py-3 text-sm font-medium text-gray-900">{ad.client_name}</td>
                    <td className="py-3 text-sm text-gray-500 capitalize">{ad.category}</td>
                    <td className="py-3 text-sm text-gray-500">
                      {new Date(ad.end_date).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
                {active.length === 0 && (
                  <tr>
                    <td colSpan="4" className="py-4 text-center text-sm text-gray-500">
                      No active campaigns.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions / Notifications */}
        <div className="space-y-6">
          {/* Pending Approvals Widget */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Pending Approval</h3>
            <div className="space-y-4">
              {pending.slice(0, 3).map((ad) => (
                <div key={ad.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{ad.client_name}</p>
                    <p className="text-xs text-gray-500">{new Date(ad.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                    Pending
                  </span>
                </div>
              ))}
              {pending.length === 0 && (
                <p className="text-sm text-gray-500 text-center">No pending adverts.</p>
              )}
            </div>
          </div>

          {/* Expiring Soon Widget */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Expiring Soon</h3>
            <div className="space-y-4">
              {/* Filter active ads that are expiring soon */}
              {active.filter(ad => ad.remaining_days <= 7).slice(0, 3).map((ad) => (
                <div key={ad.id} className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{ad.client_name}</p>
                    <p className="text-xs text-gray-500">Expires in {ad.remaining_days} days</p>
                  </div>
                </div>
              ))}
              {active.filter(ad => ad.remaining_days <= 7).length === 0 && (
                <p className="text-sm text-gray-500 text-center">No adverts expiring soon.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color, trend, trendUp, link }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };

  const Content = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center text-sm font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trendUp ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
            {trend}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );

  if (link) {
    return <Link to={link}><Content /></Link>;
  }

  return <Content />;
};

export default Dashboard;
