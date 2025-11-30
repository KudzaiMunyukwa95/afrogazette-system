import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { analyticsAPI } from '../services/api';
import { motion } from 'framer-motion';
import { format, subDays, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import {
  PieChart, Pie, BarChart, Bar, LineChart, Line, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, DollarSign, FileText,
  Clock, CheckCircle, AlertTriangle, Calendar, Target
} from 'lucide-react';

const COLORS = ['#E63946', '#457B9D', '#F1FAEE', '#A8DADC', '#1D3557'];

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [timeFilter, setTimeFilter] = useState('month'); // today, week, month, lastMonth

  useEffect(() => {
    fetchDashboardData();
  }, [timeFilter]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = isAdmin()
        ? await analyticsAPI.getDashboard({ timeFilter })
        : await analyticsAPI.getMyDashboard({ timeFilter });

      // Debug: Log the response to see data structure
      console.log('Dashboard API Response:', response.data.data);

      setData(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();

    // Debug: Log user object to see what's available
    console.log('User object:', user);

    // Try multiple possible field names
    const firstName = user?.full_name?.split(' ')[0] ||
      user?.fullName?.split(' ')[0] ||
      user?.name?.split(' ')[0] ||
      user?.email?.split('@')[0] ||
      'User';

    if (hour >= 5 && hour < 12) return `Good morning, ${firstName} 👋`;
    if (hour >= 12 && hour < 17) return `Good afternoon, ${firstName} 👋`;
    if (hour >= 17 && hour < 24) return `Good evening, ${firstName} 👋`;
    return `Hello, ${firstName} 👋`;
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-4 md:py-8">
        <div className="max-w-7xl mx-auto mobile-container">
          {/* Personalized Greeting */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 md:mb-8"
          >
            <h1 className="font-bold text-gray-900 mb-2">
              {getGreeting()}
            </h1>
            <p className="text-sm md:text-base text-gray-600">
              Here's your performance overview.
            </p>
          </motion.div>

          {/* Time Filter Tabs - Swipeable on Mobile */}
          <div className="mb-6 md:mb-8 -mx-4 md:mx-0">
            <div className="swipeable flex gap-2 px-4 md:px-0 pb-2">
              {[
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'Last 7 Days' },
                { id: 'month', label: 'This Month' },
                { id: 'lastMonth', label: 'Last Month' }
              ].map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setTimeFilter(filter.id)}
                  className={`px-4 md:px-6 py-2 md:py-2.5 rounded-lg text-sm md:text-base font-medium transition-all whitespace-nowrap tap-target ${timeFilter === filter.id
                    ? 'bg-red-600 text-white shadow-lg shadow-red-200'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {isAdmin() ? (
            <AdminDashboard data={data} timeFilter={timeFilter} />
          ) : (
            <SalesRepDashboard data={data} timeFilter={timeFilter} />
          )}
        </div>
      </div>
    </Layout>
  );
};

// Animated Counter Component
const AnimatedCounter = ({ value, prefix = '', suffix = '' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value);
    if (start === end) return;

    const duration = 1000;
    const increment = end / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{prefix}{count.toLocaleString()}{suffix}</span>;
};

// Modern KPI Card - Mobile Optimized
const KPICard = ({ title, value, icon: Icon, trend, color = 'red', prefix = '', suffix = '' }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    whileHover={{ scale: 1.02, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
    className="bg-white rounded-xl p-4 md:p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all"
  >
    <div className="flex items-center justify-between mb-3 md:mb-4">
      <div className={`p-2 md:p-3 rounded-lg bg-${color}-50`}>
        <Icon className="icon-md md:h-6 md:w-6 text-${color}-600" />
      </div>
      {trend && (
        <div className={`flex items-center text-xs md:text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
          {trend > 0 ? <TrendingUp className="h-3 w-3 md:h-4 md:w-4 mr-1" /> : <TrendingDown className="h-3 w-3 md:h-4 md:w-4 mr-1" />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <h3 className="text-xs md:text-sm font-medium text-gray-600 mb-1">{title}</h3>
    <p className="text-xl md:text-3xl font-bold text-gray-900">
      <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
    </p>
  </motion.div>
);

const SalesRepDashboard = ({ data, timeFilter }) => {
  // Format advert types for chart
  const advertTypeData = data?.advertTypes?.map(item => ({
    name: (item.name || 'text_ad').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: parseInt(item.value)
  })) || [];

  // Format payment methods for chart
  const paymentMethodData = data?.paymentMethods?.map(item => ({
    method: (item.method || 'cash').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    amount: parseFloat(item.amount || 0)
  })) || [];

  // Format sales trend data
  const salesTrendData = data?.salesTrend?.map(item => ({
    day: item.day,
    sales: parseFloat(item.sales || 0)
  })) || [];

  // Format top clients data
  const topClients = data?.topClients?.map(item => ({
    name: item.name,
    spent: parseFloat(item.spent || 0)
  })) || [];

  return (
    <div className="space-y-8">
      {/* KPI Cards - 2 columns on mobile, 3 on desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        <KPICard
          title="Total Sales"
          value={data?.summary?.total_sales || 0}
          icon={DollarSign}
          color="green"
          prefix="$"
        />
        <KPICard
          title="Commission Earned"
          value={data?.summary?.total_commission || 0}
          icon={TrendingUp}
          color="blue"
          prefix="$"
        />
        <KPICard
          title="Total Clients"
          value={data?.summary?.total_adverts || 0}
          icon={Users}
          color="purple"
        />
        <KPICard
          title="Active Adverts"
          value={data?.summary?.active_count || 0}
          icon={CheckCircle}
          color="green"
        />
        <KPICard
          title="Pending Approvals"
          value={data?.summary?.pending_count || 0}
          icon={Clock}
          color="yellow"
        />
        <KPICard
          title="Expiring Soon"
          value={data?.expiringSoon?.length || 0}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Charts Section - Mobile Optimized */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Advert Type Breakdown - Mobile Optimized */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-4 md:p-6 border border-gray-100 shadow-sm"
        >
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Advert Type Breakdown</h3>
          <div className="mobile-chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={advertTypeData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={window.innerWidth < 768 ? 60 : 80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {advertTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Payment Method Analytics - Mobile Optimized */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-4 md:p-6 border border-gray-100 shadow-sm"
        >
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Payment Methods</h3>
          <div className="mobile-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentMethodData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="method" tick={{ fontSize: window.innerWidth < 768 ? 10 : 12 }} />
                <YAxis tick={{ fontSize: window.innerWidth < 768 ? 10 : 12 }} />
                <Tooltip />
                <Bar dataKey="amount" fill="#E63946" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Sales Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">7-Day Sales Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={salesTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line type="monotone" dataKey="sales" stroke="#E63946" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Top Clients */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Clients by Spend</h3>
          <div className="space-y-3">
            {topClients.map((client, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-sm">
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-900">{client.name}</span>
                </div>
                <span className="font-bold text-gray-900">${client.spent}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Active Adverts Section - Mobile Optimized */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
      >
        <div className="p-4 md:p-6 border-b border-gray-100">
          <h3 className="text-base md:text-lg font-semibold text-gray-900">Active Advert Slots</h3>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Left</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data?.active && data.active.length > 0 ? (
                data.active.slice(0, 10).map((advert, index) => (
                  <tr key={advert.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {advert.client_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {(advert.advert_type || 'text_ad').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {advert.days_paid} days
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {advert.remaining_days || 'N/A'} days
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      ${Number(advert.amount_paid || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Active
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No active adverts at the moment
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden p-4 space-y-3">
          {data?.active && data.active.length > 0 ? (
            data.active.slice(0, 10).map((advert, index) => (
              <div key={advert.id || index} className="table-card">
                <div className="table-card-row">
                  <span className="table-card-label">Client</span>
                  <span className="table-card-value font-semibold">{advert.client_name}</span>
                </div>
                <div className="table-card-row">
                  <span className="table-card-label">Type</span>
                  <span className="table-card-value">
                    {(advert.advert_type || 'text_ad').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
                <div className="table-card-row">
                  <span className="table-card-label">Duration</span>
                  <span className="table-card-value">{advert.days_paid} days</span>
                </div>
                <div className="table-card-row">
                  <span className="table-card-label">Days Left</span>
                  <span className="table-card-value">{advert.remaining_days || 'N/A'} days</span>
                </div>
                <div className="table-card-row">
                  <span className="table-card-label">Price</span>
                  <span className="table-card-value font-semibold">${Number(advert.amount_paid || 0).toFixed(2)}</span>
                </div>
                <div className="table-card-row">
                  <span className="table-card-label">Status</span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="py-8 text-center text-gray-500 text-sm">
              No active adverts at the moment
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const AdminDashboard = ({ data, timeFilter }) => {
  // Similar structure to SalesRepDashboard but with global data
  return <SalesRepDashboard data={data} timeFilter={timeFilter} />;
};

export default Dashboard;
