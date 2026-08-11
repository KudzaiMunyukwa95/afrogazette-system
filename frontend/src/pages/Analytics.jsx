import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { reportsAPI, userAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { motion } from 'framer-motion';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import {
  Activity, Calendar, Download, Users, DollarSign, Target, TrendingUp,
  AlertTriangle, Clock, Percent, Repeat, Zap, MessageSquare, Plus
} from 'lucide-react';

const tooltipStyle = { borderRadius: 12, border: '1px solid #F1F1F1', boxShadow: '0 8px 24px -8px rgba(0,0,0,0.15)', fontSize: 13 };

const PRESETS = [
  { id: 'month', label: 'This Month' },
  { id: 'lastMonth', label: 'Last Month' },
  { id: 'last3', label: 'Last 3 Months' },
  { id: 'year', label: 'This Year' },
  { id: 'all', label: 'All Time' },
  { id: 'custom', label: 'Custom' }
];

const TABS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'flight', label: 'Flight & Occupancy', icon: Zap },
  { id: 'retention', label: 'Retention', icon: Repeat },
  { id: 'margin', label: 'Margin', icon: Percent },
  { id: 'targets', label: 'Target History', icon: Target },
  { id: 'competitors', label: 'Competitor Log', icon: MessageSquare }
];

const fmtDate = (d) => d.toISOString().split('T')[0];

const computeRange = (preset, custom) => {
  const now = new Date();
  switch (preset) {
    case 'month':
      return { startDate: fmtDate(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: fmtDate(new Date(now.getFullYear(), now.getMonth() + 1, 1)) };
    case 'lastMonth':
      return { startDate: fmtDate(new Date(now.getFullYear(), now.getMonth() - 1, 1)), endDate: fmtDate(new Date(now.getFullYear(), now.getMonth(), 1)) };
    case 'last3':
      return { startDate: fmtDate(new Date(now.getFullYear(), now.getMonth() - 3, 1)), endDate: fmtDate(new Date(now.getFullYear(), now.getMonth() + 1, 1)) };
    case 'year':
      return { startDate: fmtDate(new Date(now.getFullYear(), 0, 1)), endDate: fmtDate(new Date(now.getFullYear() + 1, 0, 1)) };
    case 'all':
      return { startDate: '2020-01-01', endDate: fmtDate(new Date(now.getFullYear(), now.getMonth() + 1, 1)) };
    case 'custom':
      return custom;
    default:
      return { startDate: fmtDate(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: fmtDate(new Date(now.getFullYear(), now.getMonth() + 1, 1)) };
  }
};

// Client-side CSV export — every report table gets a Download button that
// calls this, no server-side file generation needed for plain tabular data.
const exportCSV = (filename, rows) => {
  if (!rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const escape = (val) => {
    const s = val == null ? '' : String(val);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const StatCard = ({ label, value, icon: Icon, tint = 'red', suffix = '' }) => {
  const tints = {
    red: 'bg-red-50 text-red-600',
    green: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-violet-50 text-violet-600',
    amber: 'bg-amber-50 text-amber-600'
  };
  return (
    <div className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm">
      <div className={`inline-flex p-2 rounded-xl ${tints[tint]} mb-3`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-xs md:text-sm text-gray-500 mb-1">{label}</p>
      <p className="text-xl md:text-2xl font-bold text-gray-900 tabular-nums">{value}{suffix}</p>
    </div>
  );
};

const DownloadButton = ({ onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
  >
    <Download className="h-3.5 w-3.5" />
    Export CSV
  </button>
);

const Analytics = () => {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const admin = isAdmin();

  const [activeTab, setActiveTab] = useState('overview');
  const [preset, setPreset] = useState('month');
  const [customRange, setCustomRange] = useState({ startDate: '', endDate: '' });
  const [reps, setReps] = useState([]);
  const [repId, setRepId] = useState('');

  const range = computeRange(preset, customRange);

  useEffect(() => {
    if (admin) {
      userAPI.getAll().then(res => {
        setReps((res.data.data.users || []).filter(u => u.role === 'sales_rep'));
      }).catch(() => {});
    }
  }, [admin]);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 py-4 max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="h-6 w-6 text-red-500" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
                <p className="text-sm text-gray-600">
                  {admin ? 'Real-time and historical performance, company-wide or per rep.' : 'Your performance, real-time and over time.'}
                </p>
              </div>
            </div>

            {/* Date range + rep filter controls */}
            <div className="flex flex-wrap items-center gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs md:text-sm font-semibold whitespace-nowrap transition-all ${
                    preset === p.id ? 'bg-red-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}

              {admin && (
                <select
                  value={repId}
                  onChange={(e) => setRepId(e.target.value)}
                  className="ml-auto px-3 py-1.5 text-sm border border-gray-300 rounded-lg bg-white"
                >
                  <option value="">All reps (company-wide)</option>
                  {reps.map(r => (
                    <option key={r.id} value={r.id}>{r.fullName || r.full_name}</option>
                  ))}
                </select>
              )}
            </div>

            {preset === 'custom' && (
              <div className="flex flex-wrap items-end gap-3 mt-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start</label>
                  <input type="date" value={customRange.startDate}
                    onChange={(e) => setCustomRange(prev => ({ ...prev, startDate: e.target.value }))}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End</label>
                  <input type="date" value={customRange.endDate}
                    onChange={(e) => setCustomRange(prev => ({ ...prev, endDate: e.target.value }))}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 mt-4 -mb-4 overflow-x-auto">
              {TABS.map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                      activeTab === t.id ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-4 md:p-6">
          {activeTab === 'overview' && <OverviewTab admin={admin} repId={repId || null} range={range} />}
          {activeTab === 'flight' && <FlightOccupancyTab repId={repId || null} range={range} toast={toast} />}
          {activeTab === 'retention' && <RetentionTab repId={repId || null} range={range} toast={toast} />}
          {activeTab === 'margin' && <MarginTab repId={repId || null} range={range} toast={toast} />}
          {activeTab === 'targets' && <TargetHistoryTab repId={repId || null} toast={toast} />}
          {activeTab === 'competitors' && <CompetitorTab repId={repId || null} range={range} toast={toast} />}
        </div>
      </div>
    </Layout>
  );
};

// ---------- Overview ----------
const OverviewTab = ({ admin, repId, range }) => {
  const [realtime, setRealtime] = useState(null);
  const [margin, setMargin] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      reportsAPI.getRealtime(repId),
      reportsAPI.getMargin(repId ? { ...range, repId } : range)
    ]).then(([rt, mg]) => {
      setRealtime(rt.data.data);
      setMargin(mg.data.data);
    }).catch(err => console.error('Overview load error:', err))
      .finally(() => setLoading(false));
  }, [repId, range.startDate, range.endDate]);

  if (loading) return <TabSkeleton />;

  const slotsToday = realtime?.slotsUsedToday || [];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Right now</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard label="Bookings Today" value={realtime?.bookingsToday ?? 0} icon={Zap} tint="amber" />
          <StatCard label="Revenue Today" value={`$${Number(realtime?.revenueToday ?? 0).toLocaleString()}`} icon={DollarSign} tint="green" />
          <StatCard label="Pending Approvals" value={realtime?.pendingApprovals ?? 0} icon={Clock} tint="red" />
          <StatCard
            label="Slots Used Today"
            value={slotsToday.reduce((s, r) => s + r.used, 0)}
            icon={Activity}
            tint="blue"
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Selected period</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <StatCard label="Revenue" value={`$${Number(margin?.company?.revenue ?? 0).toLocaleString()}`} icon={DollarSign} tint="green" />
          <StatCard label="Commission Paid" value={`$${Number(margin?.company?.commission ?? 0).toLocaleString()}`} icon={Users} tint="purple" />
          <StatCard label="Commission / Revenue" value={margin?.company?.commissionPercent ?? 0} suffix="%" icon={Percent} tint="amber" />
        </div>
      </div>

      <p className="text-xs text-gray-500">
        Switch tabs above for pack mix, occupancy, retention, per-rep margin, target history, and the competitor price log.
      </p>
    </motion.div>
  );
};

// ---------- Flight & Occupancy ----------
const FlightOccupancyTab = ({ repId, range, toast }) => {
  const [flightData, setFlightData] = useState(null);
  const [occupancy, setOccupancy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = repId ? { ...range, repId } : range;
    Promise.all([reportsAPI.getFlightMix(params), reportsAPI.getOccupancy(range)])
      .then(([fm, occ]) => { setFlightData(fm.data.data); setOccupancy(occ.data.data); })
      .catch(err => { console.error(err); toast.error('Failed to load flight & occupancy report'); })
      .finally(() => setLoading(false));
  }, [repId, range.startDate, range.endDate]);

  if (loading) return <TabSkeleton />;

  const flightSummary = {};
  (flightData?.rows || []).forEach(r => {
    flightSummary[r.flight] = flightSummary[r.flight] || { flight: r.flight, bookings: 0, revenue: 0 };
    flightSummary[r.flight].bookings += parseInt(r.bookings);
    flightSummary[r.flight].revenue += parseFloat(r.revenue);
  });
  const flightChartData = ['daily', 'weekly', 'monthly'].map(f => ({
    flight: f.charAt(0).toUpperCase() + f.slice(1),
    bookings: flightSummary[f]?.bookings || 0,
    revenue: Math.round((flightSummary[f]?.revenue || 0) * 100) / 100
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900">Pack Mix — Daily / Weekly / Monthly</h3>
          <DownloadButton onClick={() => exportCSV('flight-mix.csv', flightData?.rows || [])} disabled={!flightData?.rows?.length} />
        </div>
        {flightChartData.every(f => f.bookings === 0) ? (
          <p className="text-sm text-gray-500 text-center py-8">No bookings in this period yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={flightChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="flight" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar yAxisId="left" dataKey="bookings" fill="#457B9D" radius={[8, 8, 0, 0]} name="Bookings" />
              <Bar yAxisId="right" dataKey="revenue" fill="#E63946" radius={[8, 8, 0, 0]} name="Revenue ($)" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Slot Occupancy — {occupancy?.daysInRange || 0} days in range</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {(occupancy?.byType || []).map(t => (
            <div key={t.slotType} className="border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700 capitalize">{t.slotType}</span>
                <span className="text-lg font-bold text-gray-900 tabular-nums">{t.occupancyPercent ?? 0}%</span>
              </div>
              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full ${(t.occupancyPercent || 0) >= 80 ? 'bg-emerald-500' : (t.occupancyPercent || 0) >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(100, t.occupancyPercent || 0)}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 tabular-nums">{t.used} of {t.totalCapacity} slots used</p>
            </div>
          ))}
        </div>

        {occupancy?.trend?.length > 0 && (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={occupancy.trend.reduce((acc, row) => {
              const existing = acc.find(a => a.date === row.assignment_date);
              if (existing) existing[row.slot_type] = parseInt(row.used);
              else acc.push({ date: row.assignment_date, [row.slot_type]: parseInt(row.used) });
              return acc;
            }, [])}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d?.slice(5)} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line type="monotone" dataKey="groups" stroke="#E63946" strokeWidth={2} dot={false} name="Groups" />
              <Line type="monotone" dataKey="channel" stroke="#457B9D" strokeWidth={2} dot={false} name="Channel" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </motion.div>
  );
};

// ---------- Retention ----------
const RetentionTab = ({ repId, range, toast }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    reportsAPI.getRetention(repId ? { ...range, repId } : range)
      .then(res => setData(res.data.data))
      .catch(err => { console.error(err); toast.error('Failed to load retention report'); })
      .finally(() => setLoading(false));
  }, [repId, range.startDate, range.endDate]);

  if (loading) return <TabSkeleton />;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard label="New Clients (period)" value={data?.period?.newClients ?? 0} icon={Users} tint="blue" />
        <StatCard label="Returning Clients (period)" value={data?.period?.returningClients ?? 0} icon={Repeat} tint="green" />
        <StatCard label="All-Time Repeat Rate" value={data?.allTime?.repeatRatePercent ?? 0} suffix="%" icon={Percent} tint="purple" />
        <StatCard label="Dormant Clients (30+ days)" value={data?.dormantClients?.length ?? 0} icon={AlertTriangle} tint="amber" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Dormant Clients</h3>
            <p className="text-xs text-gray-500 mt-0.5">Haven't booked in 30+ days — the win-back script's target list.</p>
          </div>
          <DownloadButton onClick={() => exportCSV('dormant-clients.csv', data?.dormantClients || [])} disabled={!data?.dormantClients?.length} />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Booking</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Bookings</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lifetime Value</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(data?.dormantClients || []).length > 0 ? data.dormantClients.map((c, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{c.client_name}</td>
                  <td className="px-6 py-3 text-sm text-gray-600">{new Date(c.last_booking).toLocaleDateString()}</td>
                  <td className="px-6 py-3 text-sm text-gray-600 tabular-nums">{c.total_bookings}</td>
                  <td className="px-6 py-3 text-sm font-semibold text-gray-900 tabular-nums">${Number(c.lifetime_value).toFixed(2)}</td>
                </tr>
              )) : (
                <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">No dormant clients — everyone's active or too new to qualify.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

// ---------- Margin ----------
const MarginTab = ({ repId, range, toast }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    reportsAPI.getMargin(repId ? { ...range, repId } : range)
      .then(res => setData(res.data.data))
      .catch(err => { console.error(err); toast.error('Failed to load margin report'); })
      .finally(() => setLoading(false));
  }, [repId, range.startDate, range.endDate]);

  if (loading) return <TabSkeleton />;

  const trendData = (data?.trend || []).map(t => ({
    month: new Date(t.month).toLocaleDateString('default', { month: 'short', year: '2-digit' }),
    revenue: t.revenue,
    commission: t.commission
  }));

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        <StatCard label="Total Revenue" value={`$${Number(data?.company?.revenue ?? 0).toLocaleString()}`} icon={DollarSign} tint="green" />
        <StatCard label="Total Commission" value={`$${Number(data?.company?.commission ?? 0).toLocaleString()}`} icon={Users} tint="purple" />
        <StatCard label="Commission / Revenue" value={data?.company?.commissionPercent ?? 0} suffix="%" icon={Percent} tint="amber" />
      </div>

      {trendData.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Revenue vs Commission — Monthly Trend</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#E63946" strokeWidth={3} dot={{ r: 4 }} name="Revenue" />
              <Line type="monotone" dataKey="commission" stroke="#457B9D" strokeWidth={3} dot={{ r: 4 }} name="Commission" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">By Rep</h3>
          <DownloadButton onClick={() => exportCSV('margin-by-rep.csv', data?.byRep || [])} disabled={!data?.byRep?.length} />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rep</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">%</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {(data?.byRep || []).length > 0 ? data.byRep.map(r => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-medium text-gray-900">{r.fullName}</td>
                  <td className="px-6 py-3 text-sm text-gray-600 tabular-nums">${r.revenue.toLocaleString()}</td>
                  <td className="px-6 py-3 text-sm text-gray-600 tabular-nums">${r.commission.toLocaleString()}</td>
                  <td className="px-6 py-3 text-sm font-semibold text-gray-900 tabular-nums">{r.commissionPercent}%</td>
                </tr>
              )) : (
                <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">No data for this period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

// ---------- Target History ----------
const TargetHistoryTab = ({ repId, toast }) => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    reportsAPI.getTargetHistory(repId)
      .then(res => setRows(res.data.data.rows))
      .catch(err => { console.error(err); toast.error('Failed to load target history'); })
      .finally(() => setLoading(false));
  }, [repId]);

  if (loading) return <TabSkeleton />;

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Target History</h3>
          <p className="text-xs text-gray-500 mt-0.5">Every month a target was set, target vs. what was actually attained.</p>
        </div>
        <DownloadButton onClick={() => exportCSV('target-history.csv', rows)} disabled={!rows.length} />
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rep</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attained</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Result</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {rows.length > 0 ? rows.map((r, i) => (
              <tr key={i} className="hover:bg-gray-50">
                <td className="px-6 py-3 text-sm text-gray-600">{new Date(r.month).toLocaleDateString('default', { month: 'long', year: 'numeric' })}</td>
                <td className="px-6 py-3 text-sm font-medium text-gray-900">{r.fullName}</td>
                <td className="px-6 py-3 text-sm text-gray-600 tabular-nums">${r.target.toLocaleString()}</td>
                <td className="px-6 py-3 text-sm text-gray-600 tabular-nums">${r.attained.toLocaleString()}</td>
                <td className="px-6 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                    r.percent >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {r.percent ?? 0}%
                  </span>
                </td>
              </tr>
            )) : (
              <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No targets set yet — set one from the Targets page.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

// ---------- Competitor Log ----------
const CompetitorTab = ({ repId, range, toast }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ clientName: '', competitorName: '', competitorPrice: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    reportsAPI.getCompetitors(repId ? { ...range, repId } : range)
      .then(res => setData(res.data.data))
      .catch(err => { console.error(err); toast.error('Failed to load competitor log'); })
      .finally(() => setLoading(false));
  }, [repId, range.startDate, range.endDate]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.competitorName.trim()) {
      toast.error('Competitor name is required');
      return;
    }
    try {
      setSubmitting(true);
      await reportsAPI.logCompetitor({
        clientName: form.clientName || null,
        competitorName: form.competitorName,
        competitorPrice: form.competitorPrice ? parseFloat(form.competitorPrice) : null,
        notes: form.notes || null
      });
      toast.success('Logged');
      setForm({ clientName: '', competitorName: '', competitorPrice: '', notes: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to log mention');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">Log a Competitor Mention</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text" placeholder="Client (optional)" value={form.clientName}
            onChange={(e) => setForm(prev => ({ ...prev, clientName: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <input
            type="text" placeholder="Competitor name *" value={form.competitorName}
            onChange={(e) => setForm(prev => ({ ...prev, competitorName: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <input
            type="number" step="0.01" min="0" placeholder="Their quoted price" value={form.competitorPrice}
            onChange={(e) => setForm(prev => ({ ...prev, competitorPrice: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            <Plus className="h-4 w-4" />
            {submitting ? 'Logging…' : 'Log It'}
          </button>
        </form>
      </div>

      {loading ? <TabSkeleton /> : (
        <>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6">
            <h3 className="text-base font-semibold text-gray-900 mb-4">Most Mentioned</h3>
            {data?.summary?.length > 0 ? (
              <div className="space-y-2">
                {data.summary.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <span className="font-medium text-gray-900">{s.competitorName}</span>
                    <span className="text-sm text-gray-600">
                      {s.mentions} mention{s.mentions !== 1 ? 's' : ''}{s.avgPrice != null ? ` · avg $${s.avgPrice}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-6">No competitor mentions logged this period.</p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 md:p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Recent Mentions</h3>
              <DownloadButton onClick={() => exportCSV('competitor-mentions.csv', data?.mentions || [])} disabled={!data?.mentions?.length} />
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rep</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Competitor</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(data?.mentions || []).length > 0 ? data.mentions.map((m) => (
                    <tr key={m.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-sm text-gray-600">{new Date(m.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{m.rep_name}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{m.client_name || '—'}</td>
                      <td className="px-6 py-3 text-sm font-medium text-gray-900">{m.competitor_name}</td>
                      <td className="px-6 py-3 text-sm text-gray-600 tabular-nums">{m.competitor_price != null ? `$${Number(m.competitor_price).toFixed(2)}` : '—'}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">Nothing logged in this period</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
};

const TabSkeleton = () => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {[0, 1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-2xl animate-pulse" />)}
    </div>
    <div className="h-64 bg-gray-200 rounded-2xl animate-pulse" />
  </div>
);

export default Analytics;
