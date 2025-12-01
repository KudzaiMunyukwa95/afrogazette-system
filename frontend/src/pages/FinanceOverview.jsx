import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import FinanceNav from '../components/FinanceNav';
import { financeAPI } from '../services/api';
import { motion } from 'framer-motion';
import {
    BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
    DollarSign, TrendingUp, TrendingDown, Clock,
    Calendar, Download, CreditCard, AlertCircle
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';

const COLORS = ['#E63946', '#457B9D', '#1D3557', '#F4A261', '#2A9D8F'];

const FinanceOverview = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [incomeData, setIncomeData] = useState(null);
    const [dateRange, setDateRange] = useState('month'); // today, week, month, year
    const [customDates, setCustomDates] = useState({ start: '', end: '' });

    useEffect(() => {
        fetchData();
    }, [dateRange]);

    const getDateParams = () => {
        const today = new Date();
        let startDate, endDate;

        switch (dateRange) {
            case 'today':
                startDate = format(today, 'yyyy-MM-dd');
                endDate = format(today, 'yyyy-MM-dd');
                break;
            case 'week':
                startDate = format(subDays(today, 7), 'yyyy-MM-dd');
                endDate = format(today, 'yyyy-MM-dd');
                break;
            case 'month':
                startDate = format(startOfMonth(today), 'yyyy-MM-dd');
                endDate = format(endOfMonth(today), 'yyyy-MM-dd');
                break;
            case 'year':
                startDate = format(new Date(today.getFullYear(), 0, 1), 'yyyy-MM-dd');
                endDate = format(today, 'yyyy-MM-dd');
                break;
            case 'custom':
                startDate = customDates.start;
                endDate = customDates.end;
                break;
            default:
                startDate = format(startOfMonth(today), 'yyyy-MM-dd');
                endDate = format(endOfMonth(today), 'yyyy-MM-dd');
        }

        return { startDate, endDate };
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const params = getDateParams();

            const [overviewRes, incomeRes] = await Promise.all([
                financeAPI.getFinancialOverview(params),
                financeAPI.getIncomeBreakdown(params)
            ]);

            setData(overviewRes.data.data);
            setIncomeData(incomeRes.data.data);
        } catch (error) {
            console.error('Error fetching finance data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCustomDateChange = (e) => {
        setCustomDates({ ...customDates, [e.target.name]: e.target.value });
    };

    const applyCustomDates = () => {
        if (customDates.start && customDates.end) {
            setDateRange('custom');
            fetchData();
        }
    };

    if (loading) {
        return (
            <Layout>
                <FinanceNav />
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <FinanceNav />
            <div className="p-6 max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Financial Overview</h1>
                        <p className="text-gray-500">Track your income, expenses, and financial health.</p>
                    </div>

                    {/* Date Filter */}
                    <div className="flex flex-wrap gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                        {['today', 'week', 'month', 'year'].map((range) => (
                            <button
                                key={range}
                                onClick={() => setDateRange(range)}
                                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${dateRange === range
                                    ? 'bg-red-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-50'
                                    }`}
                            >
                                {range.charAt(0).toUpperCase() + range.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <KPICard
                        title="Total Income"
                        value={data?.totalIncome}
                        icon={DollarSign}
                        color="green"
                        trend={incomeData?.timeSeries?.length > 1 ?
                            ((data?.totalIncome - incomeData.timeSeries[0].total) / incomeData.timeSeries[0].total * 100).toFixed(1) : 0
                        }
                    />
                    <KPICard
                        title="Total Expenses"
                        value={data?.totalExpenses}
                        icon={CreditCard}
                        color="red"
                    />
                    <KPICard
                        title="Net Position"
                        value={data?.netPosition}
                        icon={TrendingUp}
                        color={data?.netPosition >= 0 ? 'blue' : 'red'}
                        subtext={`Margin: ${data?.margin}%`}
                    />
                    <KPICard
                        title="Pending Items"
                        value={data?.pending?.count}
                        icon={Clock}
                        color="yellow"
                        isCurrency={false}
                        subtext={`Value: $${data?.pending?.amount?.toFixed(2)}`}
                    />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

                    {/* Income vs Expenses Trend */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
                    >
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">Income Trend</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={incomeData?.timeSeries}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis
                                        dataKey="date"
                                        tickFormatter={(date) => format(new Date(date), 'MMM d')}
                                        tick={{ fontSize: 12 }}
                                    />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip
                                        formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Income']}
                                        labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="total"
                                        stroke="#059669"
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: '#059669' }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    {/* Payment Methods Breakdown */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
                    >
                        <h3 className="text-lg font-semibold text-gray-900 mb-6">Expense Payment Methods</h3>
                        <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data?.paymentMethods}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="payment_method" tick={{ fontSize: 12 }} />
                                    <YAxis tick={{ fontSize: 12 }} />
                                    <Tooltip formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Amount']} />
                                    <Bar dataKey="total" fill="#E63946" radius={[4, 4, 0, 0]}>
                                        {data?.paymentMethods?.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>
                </div>

                {/* Pending Items Summary */}
                {data?.pending?.count > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 flex items-center justify-between"
                    >
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-yellow-100 rounded-full text-yellow-700">
                                <AlertCircle className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-yellow-900">
                                    {data.pending.count} Pending Items
                                </h3>
                                <p className="text-yellow-700">
                                    Total value of ${data.pending.amount.toFixed(2)} requires approval
                                </p>
                            </div>
                        </div>
                        <a
                            href="/finance/requisitions"
                            className="px-6 py-2 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 transition-colors"
                        >
                            Review Items
                        </a>
                    </motion.div>
                )}

            </div>
        </Layout>
    );
};

const KPICard = ({ title, value, icon: Icon, color, trend, subtext, isCurrency = true }) => (
    <motion.div
        whileHover={{ y: -4 }}
        className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
    >
        <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-lg bg-${color}-50 text-${color}-600`}>
                <Icon className="h-6 w-6" />
            </div>
            {trend && (
                <span className={`text-sm font-medium ${Number(trend) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Number(trend) >= 0 ? '+' : ''}{trend}%
                </span>
            )}
        </div>
        <h3 className="text-gray-500 text-sm font-medium mb-1">{title}</h3>
        <p className={`text-2xl font-bold text-gray-900 ${color === 'red' && isCurrency ? 'text-red-600' : ''}`}>
            {isCurrency ? '$' : ''}{Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: isCurrency ? 2 : 0 })}
        </p>
        {subtext && <p className="text-sm text-gray-500 mt-1">{subtext}</p>}
    </motion.div>
);

export default FinanceOverview;
