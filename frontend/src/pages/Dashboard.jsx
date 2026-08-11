import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { analyticsAPI, targetAPI } from '../services/api';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, BarChart, Bar, LineChart, Line, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, TrendingDown, Users, DollarSign, FileText,
  Clock, CheckCircle, AlertTriangle, Calendar, Target, Sparkles
} from 'lucide-react';

const COLORS = ['#E63946', '#457B9D', '#F1FAEE', '#A8DADC', '#1D3557'];

// Tailwind's JIT compiler only includes classes it can see as literal
// strings — `text-${color}-600` inside a plain (non-template) string never
// interpolated in the first place, so KPI icon colors have silently never
// applied. Static per-variant classes are both the fix and the only way
// dynamic-by-name Tailwind color classes work reliably at all.
const COLOR_VARIANTS = {
  green: { tile: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'ring-emerald-100' },
  blue: { tile: 'bg-blue-50', icon: 'text-blue-600', ring: 'ring-blue-100' },
  purple: { tile: 'bg-violet-50', icon: 'text-violet-600', ring: 'ring-violet-100' },
  yellow: { tile: 'bg-amber-50', icon: 'text-amber-600', ring: 'ring-amber-100' },
  red: { tile: 'bg-red-50', icon: 'text-red-600', ring: 'ring-red-100' }
};

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid #F1F1F1',
  boxShadow: '0 8px 24px -8px rgba(0,0,0,0.15)',
  fontSize: 13
};

// Staggers direct children in by a hair each — the whole dashboard arrives
// as one composed motion instead of everything popping in at once.
const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } }
};
const staggerItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
};

const Dashboard = () => {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [timeFilter, setTimeFilter] = useState('month'); // today, week, month, lastMonth, custom
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [targetData, setTargetData] = useState(null);
  const [targetLoading, setTargetLoading] = useState(true);

  useEffect(() => {
    // For custom filter, don't fetch automatically until applied manually
    if (timeFilter === 'custom') return;
    fetchDashboardData();
  }, [timeFilter]);

  // Target is always "this calendar month" — independent of the time filter
  // above, which is for the rest of the dashboard's stats/charts.
  useEffect(() => {
    fetchTargetData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTargetData = async () => {
    try {
      setTargetLoading(true);
      const response = isAdmin()
        ? await targetAPI.getCompany()
        : await targetAPI.getMine();
      setTargetData(response.data.data);
    } catch (error) {
      console.error('Error fetching target data:', error);
    } finally {
      setTargetLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const params = { timeFilter };

      if (timeFilter === 'custom') {
        if (!customDateRange.start || !customDateRange.end) {
          setLoading(false);
          return;
        }
        params.startDate = customDateRange.start;
        params.endDate = customDateRange.end;
      }

      const response = isAdmin()
        ? await analyticsAPI.getDashboard(params)
        : await analyticsAPI.getMyDashboard(params);

      setData(response.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const firstName = user?.full_name?.split(' ')[0] ||
      user?.fullName?.split(' ')[0] ||
      user?.name?.split(' ')[0] ||
      user?.email?.split('@')[0] ||
      'User';

    if (hour >= 5 && hour < 12) return `Good morning, ${firstName}`;
    if (hour >= 12 && hour < 17) return `Good afternoon, ${firstName}`;
    if (hour >= 17 && hour < 24) return `Good evening, ${firstName}`;
    return `Hello, ${firstName}`;
  };

  if (loading) {
    return (
      <Layout>
        <DashboardSkeleton />
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">Failed to load dashboard</h3>
            <p className="mt-1 text-gray-500">Please try refreshing the page.</p>
            <button
              onClick={fetchDashboardData}
              className="mt-4 px-5 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 active:scale-95 transition-all"
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
      <div className="min-h-screen bg-gray-50">
        {/* Sticky filter bar — the one control worth keeping in reach while
            scrolling a long dashboard, like a segmented control in a native app */}
        <div className="sticky top-16 z-30 bg-gray-50/85 backdrop-blur-md border-b border-gray-200/70">
          <div className="max-w-7xl mx-auto mobile-container py-3">
            <div className="-mx-4 md:mx-0">
              <div className="swipeable flex gap-2 px-4 md:px-0 overflow-x-auto">
                {[
                  { id: 'today', label: 'Today' },
                  { id: 'week', label: 'Last 7 Days' },
                  { id: 'month', label: 'This Month' },
                  { id: 'lastMonth', label: 'Last Month' },
                  { id: 'custom', label: 'Custom' }
                ].map((filter) => (
                  <button
                    key={filter.id}
                    onClick={() => setTimeFilter(filter.id)}
                    className={`px-4 md:px-5 py-2 md:py-2.5 rounded-full text-sm font-semibold transition-all whitespace-nowrap tap-target active:scale-95 ${
                      timeFilter === filter.id
                        ? 'bg-red-600 text-white shadow-md shadow-red-200'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {timeFilter === 'custom' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-end gap-4"
              >
                <div className="w-full md:w-auto">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={customDateRange.start}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="w-full md:w-auto">
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={customDateRange.end}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full md:w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <button
                  onClick={fetchDashboardData}
                  disabled={!customDateRange.start || !customDateRange.end}
                  className="w-full md:w-auto px-6 py-2.5 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
                >
                  Apply Range
                </button>
              </motion.div>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto mobile-container py-5 md:py-8">
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 md:mb-8"
          >
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              {getGreeting()} <span className="inline-block">👋</span>
            </h1>
            <p className="text-sm md:text-base text-gray-500 mt-1">
              Here's your performance overview.
            </p>
          </motion.div>

          {isAdmin() ? (
            <AdminDashboard data={data} timeFilter={timeFilter} targetData={targetData} targetLoading={targetLoading} />
          ) : (
            <SalesRepDashboard data={data} timeFilter={timeFilter} targetData={targetData} targetLoading={targetLoading} />
          )}
        </div>
      </div>
    </Layout>
  );
};

// Skeleton loading state — mirrors the real layout's shape so there's no
// jarring pop-in once data lands, and no blank-screen-with-spinner feel.
const DashboardSkeleton = () => (
  <div className="min-h-screen bg-gray-50">
    <div className="sticky top-16 z-30 bg-gray-50/85 backdrop-blur-md border-b border-gray-200/70">
      <div className="max-w-7xl mx-auto mobile-container py-3">
        <div className="flex gap-2 overflow-x-hidden">
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="h-9 w-24 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
          ))}
        </div>
      </div>
    </div>
    <div className="max-w-7xl mx-auto mobile-container py-5 md:py-8 space-y-6 md:space-y-8">
      <div className="h-8 w-56 bg-gray-200 rounded-lg animate-pulse" />
      <div className="h-28 bg-gray-200 rounded-2xl animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-32 bg-gray-200 rounded-2xl animate-pulse" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {[0, 1].map(i => (
          <div key={i} className="h-72 bg-gray-200 rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  </div>
);

// Animated Counter Component
const AnimatedCounter = ({ value, prefix = '', suffix = '' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = parseInt(value);
    if (start === end) return;

    const duration = 900;
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

  return <span className="tabular-nums">{prefix}{count.toLocaleString()}{suffix}</span>;
};

// KPI Card — icon in a soft-tinted tile, tap feedback for mobile, real
// (static, JIT-safe) color variants instead of the old broken template string.
const KPICard = ({ title, value, icon: Icon, trend, color = 'red', prefix = '', suffix = '' }) => {
  const variant = COLOR_VARIANTS[color] || COLOR_VARIANTS.red;
  return (
    <motion.div
      variants={staggerItem}
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -2 }}
      className="bg-white rounded-2xl p-4 md:p-6 border border-gray-100 shadow-sm hover:shadow-lg hover:shadow-gray-200/60 transition-shadow"
    >
      <div className="flex items-center justify-between mb-3 md:mb-4">
        <div className={`p-2.5 md:p-3 rounded-xl ${variant.tile} ring-4 ${variant.ring}`}>
          <Icon className={`h-4 w-4 md:h-5 md:w-5 ${variant.icon}`} />
        </div>
        {trend != null && (
          <div className={`flex items-center text-xs md:text-sm font-semibold ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {trend > 0 ? <TrendingUp className="h-3.5 w-3.5 mr-0.5" /> : <TrendingDown className="h-3.5 w-3.5 mr-0.5" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <h3 className="text-xs md:text-sm font-medium text-gray-500 mb-1">{title}</h3>
      <p className="text-xl md:text-3xl font-bold text-gray-900 tracking-tight">
        <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
      </p>
    </motion.div>
  );
};

// Target progress bar — a loader that fills to % attained vs target.
// Color signals pace, not just raw %: on the second half of the month,
// under half attained turns amber/red so a rep sees they're behind before
// month-end, not just a number that eventually catches up or doesn't.
// This is the dashboard's centerpiece, so it gets the most visual weight —
// gradient fill, a glow once complete, larger type than the KPI cards below it.
const TargetProgressBar = ({ label, target, attained, loading, subtitle }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-5 md:p-7 border border-gray-100 shadow-sm animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded-full w-full"></div>
      </div>
    );
  }

  if (!target || target <= 0) {
    return (
      <div className="bg-white rounded-2xl p-5 md:p-7 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-1.5">
          <Target className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
        </div>
        <p className="text-sm text-gray-500">
          No target set for this month yet
          {subtitle ? ` — ${subtitle}` : ''}.
        </p>
      </div>
    );
  }

  const percent = Math.min(100, Math.round((attained / target) * 100));
  const dayOfMonth = new Date().getDate();
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const monthProgress = (dayOfMonth / daysInMonth) * 100;
  const behindPace = monthProgress > 50 && percent < monthProgress - 15;
  const complete = percent >= 100;

  const fillGradient = complete
    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
    : behindPace
      ? 'bg-gradient-to-r from-amber-500 to-amber-400'
      : 'bg-gradient-to-r from-red-600 to-red-500';

  return (
    <motion.div
      variants={staggerItem}
      className={`relative bg-white rounded-2xl p-5 md:p-7 border shadow-sm overflow-hidden ${
        complete ? 'border-emerald-200 shadow-emerald-100' : 'border-gray-100'
      }`}
    >
      {complete && (
        <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-100/60 blur-2xl pointer-events-none" />
      )}

      <div className="relative flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${complete ? 'bg-emerald-50' : 'bg-red-50'}`}>
            {complete
              ? <Sparkles className="h-4 w-4 text-emerald-600" />
              : <Target className="h-4 w-4 text-red-600" />}
          </div>
          <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
        </div>
        <span className={`text-2xl md:text-3xl font-bold tabular-nums tracking-tight ${complete ? 'text-emerald-600' : 'text-gray-900'}`}>
          {percent}%
        </span>
      </div>

      <div className="relative h-3.5 bg-gray-100 rounded-full overflow-hidden mb-3">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className={`h-full rounded-full ${fillGradient}`}
        />
      </div>

      <div className="relative flex items-center justify-between text-xs md:text-sm">
        <span className="text-gray-600">
          <span className="font-semibold text-gray-900 tabular-nums">${Number(attained).toLocaleString()}</span> attained
        </span>
        <span className="text-gray-500 tabular-nums">of ${Number(target).toLocaleString()} target</span>
      </div>

      {complete ? (
        <p className="relative text-xs text-emerald-700 font-medium mt-3">
          Target hit — nice work. 🎉
        </p>
      ) : behindPace ? (
        <p className="relative text-xs text-amber-700 mt-3">
          {Math.round(monthProgress)}% of the month has passed — pace up to catch the target.
        </p>
      ) : null}
    </motion.div>
  );
};

const SalesRepDashboard = ({ data, timeFilter, extraContent, targetData, targetLoading, targetLabel = "This Month's Target" }) => {
  // Where adverts ran — groups vs channel (replaces the old text/picture/
  // group-link "advert type" split now that every advert is just a post)
  const destinationData = data?.advertTypes?.map(item => ({
    name: (item.name || 'groups').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: parseInt(item.value)
  })) || [];

  const paymentMethodData = data?.paymentMethods?.map(item => {
    let methodLabel = item.method || 'cash';
    if (methodLabel === 'omarimoney') methodLabel = 'Omari';
    return {
      method: methodLabel.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      amount: parseFloat(item.amount || 0)
    };
  }) || [];

  const salesTrendData = data?.salesTrend?.map(item => ({
    day: item.day,
    sales: parseFloat(item.sales || 0)
  })) || [];

  const topClients = data?.topClients?.map(item => ({
    name: item.name,
    spent: parseFloat(item.spent || 0)
  })) || [];

  const isMobile = window.innerWidth < 768;

  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="space-y-6 md:space-y-8"
    >
      <TargetProgressBar
        label={targetLabel}
        target={targetData?.target}
        attained={targetData?.attained}
        loading={targetLoading}
        subtitle="ask an admin to set one"
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        <KPICard title="Total Sales" value={data?.summary?.total_sales || 0} icon={DollarSign} color="green" prefix="$" />
        <KPICard title="Commission Earned" value={data?.summary?.total_commission || 0} icon={TrendingUp} color="blue" prefix="$" />
        <KPICard title="Total Clients" value={data?.summary?.total_adverts || 0} icon={Users} color="purple" />
        <KPICard title="Active Adverts" value={data?.summary?.active_count || 0} icon={CheckCircle} color="green" />
        <KPICard title="Pending Approvals" value={data?.summary?.pending_count || 0} icon={Clock} color="yellow" />
        <KPICard title="Expiring Soon" value={data?.expiringSoon?.length || 0} icon={AlertTriangle} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <motion.div variants={staggerItem} className="bg-white rounded-2xl p-4 md:p-6 border border-gray-100 shadow-sm">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Where Adverts Ran</h3>
          <div className="mobile-chart">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={destinationData}
                  cx="50%"
                  cy="50%"
                  labelLine={!isMobile}
                  label={isMobile ? null : ({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={isMobile ? 60 : 80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {destinationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div variants={staggerItem} className="bg-white rounded-2xl p-4 md:p-6 border border-gray-100 shadow-sm">
          <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Payment Methods</h3>
          <div className="mobile-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentMethodData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="method" tick={{ fontSize: window.innerWidth < 768 ? 10 : 12 }} />
                <YAxis tick={{ fontSize: window.innerWidth < 768 ? 10 : 12 }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgba(230,57,70,0.06)' }} />
                <Bar dataKey="amount" fill="#E63946" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div variants={staggerItem} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">7-Day Sales Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={salesTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="sales" stroke="#E63946" strokeWidth={3} dot={{ r: 4, fill: '#E63946' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div variants={staggerItem} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top 5 Clients by Spend</h3>
          <div className="space-y-2.5">
            {topClients.length > 0 ? topClients.map((client, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 flex-shrink-0 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-sm">
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-900 truncate">{client.name}</span>
                </div>
                <span className="font-bold text-gray-900 tabular-nums flex-shrink-0">${client.spent}</span>
              </div>
            )) : (
              <p className="text-sm text-gray-500 text-center py-6">No client spend yet this period</p>
            )}
          </div>
        </motion.div>
      </div>

      {extraContent}

      <motion.div variants={staggerItem} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-100">
          <h3 className="text-base md:text-lg font-semibold text-gray-900">Active Advert Slots</h3>
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Where</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Left</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data?.active && data.active.length > 0 ? (
                data.active.slice(0, 10).map((advert, index) => (
                  <tr key={advert.id || index} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {advert.client_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {(advert.destination_type || 'groups').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {advert.days_paid} days
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {advert.remaining_days || 'N/A'} days
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 tabular-nums">
                      ${Number(advert.amount_paid || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
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

        <div className="md:hidden p-4 space-y-3">
          {data?.active && data.active.length > 0 ? (
            data.active.slice(0, 10).map((advert, index) => (
              <div key={advert.id || index} className="table-card">
                <div className="table-card-row">
                  <span className="table-card-label">Client</span>
                  <span className="table-card-value font-semibold">{advert.client_name}</span>
                </div>
                <div className="table-card-row">
                  <span className="table-card-label">Where</span>
                  <span className="table-card-value">
                    {(advert.destination_type || 'groups').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
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
                  <span className="table-card-value font-semibold tabular-nums">${Number(advert.amount_paid || 0).toFixed(2)}</span>
                </div>
                <div className="table-card-row">
                  <span className="table-card-label">Status</span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
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
    </motion.div>
  );
};

const AdminDashboard = ({ data, timeFilter, targetData, targetLoading }) => {
  const salesRepPerformance = data?.salesRepPerformance || [];

  // Per-rep monthly target breakdown — always "this calendar month",
  // independent of the leaderboard's timeFilter below.
  const repTargets = (
    <motion.div variants={staggerItem} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Target className="h-5 w-5 text-red-600" />
          Rep Targets — This Month
        </h3>
        <a
          href="/targets"
          className="text-xs font-medium px-3 py-1.5 bg-red-50 text-red-700 rounded-full hover:bg-red-100 active:scale-95 transition-all"
        >
          Edit targets
        </a>
      </div>

      {targetLoading ? (
        <div className="p-6 text-center text-gray-500 text-sm">Loading targets…</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rep</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attained</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(targetData?.reps || []).length > 0 ? (
                targetData.reps.map((rep) => {
                  const pct = rep.percent == null ? null : Math.min(100, rep.percent);
                  return (
                    <tr key={rep.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{rep.fullName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 tabular-nums">
                        ${Number(rep.attained).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 tabular-nums">
                        {rep.target > 0 ? `$${Number(rep.target).toLocaleString()}` : (
                          <span className="text-gray-400 italic">not set</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {pct == null ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          <div className="flex items-center gap-2 w-32">
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-red-500'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 w-9 text-right tabular-nums">{rep.percent}%</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">No sales reps yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );

  const leaderboard = (
    <motion.div variants={staggerItem} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Target className="h-5 w-5 text-red-600" />
          Sales Rep Leaderboard
        </h3>
        <span className="text-xs font-medium px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
          {timeFilter === 'today' ? 'Today' :
            timeFilter === 'week' ? 'Last 7 Days' :
              timeFilter === 'month' ? 'This Month' : 'Last Month'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales Rep</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adverts Sold</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Revenue</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {salesRepPerformance.length > 0 ? (
              salesRepPerformance.map((rep, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-gray-100 text-gray-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-white text-gray-500 border border-gray-200'
                    }`}>
                      {index + 1}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{rep.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 tabular-nums">
                    {rep.total_adverts}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900 tabular-nums">
                    ${Number(rep.total_revenue).toFixed(2)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                  No sales data available for this period
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );

  return (
    <SalesRepDashboard
      data={data}
      timeFilter={timeFilter}
      targetData={targetData}
      targetLoading={targetLoading}
      targetLabel="Company Target — This Month"
      extraContent={
        <>
          {repTargets}
          {leaderboard}
        </>
      }
    />
  );
};

export default Dashboard;
