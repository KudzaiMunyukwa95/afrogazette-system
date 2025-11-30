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
        ? await analyticsAPI.getDashboard()
        : await analyticsAPI.getMyDashboard();
      setData(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const firstName = user?.full_name?.split(' ')[0] || 'User';

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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-6">
          {/* Personalized Greeting */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {getGreeting()}
            </h1>
            <p className="text-gray-600">
              Here's your performance overview.
            </p>
          </motion.div>

          {/* Time Filter Tabs */}
          <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
            {[
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'Last 7 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'lastMonth', label: 'Last Month' }
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setTimeFilter(filter.id)}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap ${timeFilter === filter.id
                    ? 'bg-red-600 text-white shadow-lg shadow-red-200'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
              >
                {filter.label}
              </button>
            ))}
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

// Modern KPI Card
const KPICard = ({ title, value, icon: Icon, trend, color = 'red', prefix = '', suffix = '' }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    whileHover={{ scale: 1.02, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}
    className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all"
  >
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-lg bg-${color}-50`}>
        <Icon className={`h-6 w-6 text-${color}-600`} />
      </div>
      {trend && (
        <div className={`flex items-center text-sm font-medium ${trend > 0 ? 'text-green-600' : 'text-red-600'
          }`}>
          {trend > 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
    <p className="text-3xl font-bold text-gray-900">
      <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
    </p>
  </motion.div>
);

const SalesRepDashboard = ({ data, timeFilter }) => {
  // Mock chart data - in production, this would come from the API
  const advertTypeData = [
    { name: 'Text Ads', value: 40 },
    { name: 'Group Links', value: 30 },
    { name: 'Picture Ads', value: 20 },
    { name: 'Website Ads', value: 10 }
  ];

  const paymentMethodData = [
    { method: 'Cash', amount: 450 },
    { method: 'Ecocash', amount: 320 },
    { method: 'Innbucks', amount: 180 },
    { method: 'Bank Transfer', amount: 150 }
  ];

  const salesTrendData = [
    { day: 'Mon', sales: 120 },
    { day: 'Tue', sales: 180 },
    { day: 'Wed', sales: 150 },
    { day: 'Thu', sales: 220 },
    { day: 'Fri', sales: 190 },
    { day: 'Sat', sales: 160 },
    { day: 'Sun', sales: 140 }
  ];

  const topClients = [
    { name: 'BuySpot', spent: 500 },
    { name: 'Best Furniture', spent: 350 },
    { name: 'Clive Properties', spent: 280 },
    { name: 'Best Wholesalers', spent: 220 },
    { name: 'Tech Solutions', spent: 180 }
  ];

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <KPICard
          title="Total Sales"
          value={data?.revenue?.total || 0}
          icon={DollarSign}
          trend={12}
          color="green"
          prefix="$"
        />
        <KPICard
          title="Commission Earned"
          value={data?.commission?.total || 0}
          icon={TrendingUp}
          trend={8}
          color="blue"
          prefix="$"
        />
        <KPICard
          title="Total Clients"
          value={data?.clients?.total || 0}
          icon={Users}
          trend={5}
          color="purple"
        />
        <KPICard
          title="Active Adverts"
          value={data?.adverts?.active || 0}
          icon={CheckCircle}
          color="green"
        />
        <KPICard
          title="Pending Approvals"
          value={data?.adverts?.pending || 0}
          icon={Clock}
          color="yellow"
        />
        <KPICard
          title="Expiring Soon"
          value={data?.adverts?.expiring || 0}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Advert Type Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Advert Type Breakdown</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={advertTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
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
        </motion.div>

        {/* Payment Method Analytics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={paymentMethodData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="method" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="amount" fill="#E63946" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
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

      {/* Active Adverts Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Active Advert Slots</h3>
        </div>
        <div className="overflow-x-auto">
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
              {/* Mock data - replace with actual data */}
              <tr className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">BuySpot</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">Group Link</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">7 days</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">3 days</td>
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">$50</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
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
