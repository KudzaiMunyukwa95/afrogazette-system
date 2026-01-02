import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import FinanceNav from '../components/FinanceNav';
import { financeAPI } from '../services/api';
import { useToast } from '../components/Toast';
import {
    Download, Calendar, TrendingUp,
    TrendingDown, DollarSign, FileText
} from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

const FinancialReports = () => {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [generatingPdf, setGeneratingPdf] = useState(false);
    const [data, setData] = useState(null);
    const [incomeData, setIncomeData] = useState(null);
    const [expenseData, setExpenseData] = useState(null);
    const [customDates, setCustomDates] = useState({
        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
    });
    const [activeFilter, setActiveFilter] = useState('thisMonth');

    useEffect(() => {
        fetchReportData();
    }, [customDates]);

    const handleQuickFilter = (type) => {
        setActiveFilter(type);
        const now = new Date();

        switch (type) {
            case 'today':
                setCustomDates({
                    start: format(now, 'yyyy-MM-dd'),
                    end: format(now, 'yyyy-MM-dd')
                });
                break;
            case 'thisMonth':
                setCustomDates({
                    start: format(startOfMonth(now), 'yyyy-MM-dd'),
                    end: format(endOfMonth(now), 'yyyy-MM-dd')
                });
                break;
            case 'lastMonth':
                const lastMonth = new Date();
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                setCustomDates({
                    start: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
                    end: format(endOfMonth(lastMonth), 'yyyy-MM-dd')
                });
                break;
        }
    };

    const fetchReportData = async () => {
        try {
            setLoading(true);
            const params = { startDate: customDates.start, endDate: customDates.end };

            const [overviewRes, incomeRes, expenseRes, paymentRes] = await Promise.all([
                financeAPI.getFinancialOverview(params),
                financeAPI.getIncomeBreakdown(params),
                financeAPI.getExpenseBreakdown(params),
                financeAPI.getPaymentMethodSummary(params)
            ]);

            setData({
                ...overviewRes.data.data,
                paymentSummary: paymentRes.data.data
            });
            setIncomeData(incomeRes.data.data);
            setExpenseData(expenseRes.data.data);
        } catch (error) {
            console.error('Error fetching report data:', error);
            showToast('Failed to load report data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDateChange = (e) => {
        setCustomDates({ ...customDates, [e.target.name]: e.target.value });
    };

    const handleDownloadPDF = async () => {
        try {
            setGeneratingPdf(true);
            const params = { startDate: customDates.start, endDate: customDates.end };
            const response = await financeAPI.downloadFinancialReport(params);

            // Create blob link to download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `AfroGazette_Financial_Report_${customDates.start}_${customDates.end}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();

            showToast('Report downloaded successfully', 'success');
        } catch (error) {
            console.error('Error downloading PDF:', error);
            showToast('Failed to download report', 'error');
        } finally {
            setGeneratingPdf(false);
        }
    };

    if (loading && !data) {
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
                        <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
                        <p className="text-gray-500">Detailed financial analysis and reporting.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
                        {/* Quick Filters - Pill Style */}
                        <div className="bg-gray-100 p-1 rounded-lg flex gap-1">
                            <button
                                onClick={() => handleQuickFilter('today')}
                                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${activeFilter === 'today'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                Today
                            </button>
                            <button
                                onClick={() => handleQuickFilter('thisMonth')}
                                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${activeFilter === 'thisMonth'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                This Month
                            </button>
                            <button
                                onClick={() => handleQuickFilter('lastMonth')}
                                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-all ${activeFilter === 'lastMonth'
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-900'
                                    }`}
                            >
                                Last Month
                            </button>
                        </div>

                        {/* Date Range & Actions */}
                        <div className="flex items-center gap-3">
                            <div className={`flex items-center gap-2 bg-white px-3 py-2 rounded-lg border transition-colors ${activeFilter === 'custom' ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-200'}`}>
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <input
                                    type="date"
                                    name="start"
                                    value={customDates.start}
                                    onChange={(e) => {
                                        setActiveFilter('custom');
                                        handleDateChange(e);
                                    }}
                                    className="border-none p-0 text-sm focus:ring-0 text-gray-600 w-28"
                                />
                                <span className="text-gray-400">-</span>
                                <input
                                    type="date"
                                    name="end"
                                    value={customDates.end}
                                    onChange={(e) => {
                                        setActiveFilter('custom');
                                        handleDateChange(e);
                                    }}
                                    className="border-none p-0 text-sm focus:ring-0 text-gray-600 w-28"
                                />
                            </div>

                            <button
                                onClick={handleDownloadPDF}
                                disabled={generatingPdf}
                                className="flex items-center justify-center w-10 h-10 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-70"
                                title="Export PDF"
                            >
                                {generatingPdf ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                ) : (
                                    <Download className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Loading Indicator Overlay */}
                {loading && data && (
                    <div className="fixed top-20 right-6 z-50 bg-white px-4 py-2 rounded-full shadow-lg border border-gray-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-600 border-t-transparent"></div>
                        <span className="text-sm font-medium text-gray-700">Updating...</span>
                    </div>
                )}

                {/* Executive Summary */}
                <div className={`transition-opacity duration-200 ${loading && data ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <p className="text-sm text-gray-500 font-medium mb-1">Total Income</p>
                            <p className="text-2xl font-bold text-gray-900">${data?.totalIncome?.toFixed(2)}</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <p className="text-sm text-gray-500 font-medium mb-1">Total Expenses</p>
                            <p className="text-2xl font-bold text-gray-900">${data?.totalExpenses?.toFixed(2)}</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <p className="text-sm text-gray-500 font-medium mb-1">Net Position</p>
                            <p className={`text-2xl font-bold ${data?.netPosition >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ${data?.netPosition?.toFixed(2)}
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <p className="text-sm text-gray-500 font-medium mb-1">Net Margin</p>
                            <p className={`text-2xl font-bold ${data?.netPosition >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {data?.margin?.toFixed(1)}%
                            </p>
                        </div>
                    </div>

                    {/* Payment Method Summary Table */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-lg font-semibold text-gray-900">Summary by Payment Method</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Income</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Expenses</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Net Position</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {data?.paymentSummary?.map((item) => (
                                        <tr key={item.method} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{item.method}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">${item.income.toFixed(2)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">${item.expense.toFixed(2)}</td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-bold ${item.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                ${item.net.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Income Breakdown */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-green-600" />
                                    Income Breakdown
                                </h3>
                            </div>
                            <div className="p-6">
                                <h4 className="text-sm font-medium text-gray-500 uppercase mb-3">By Category</h4>
                                <div className="space-y-3 mb-6">
                                    {incomeData?.byCategory?.map((item, index) => (
                                        <div key={index} className="flex justify-between items-center">
                                            <span className="text-gray-700 capitalize">{item.category.replace(/_/g, ' ')}</span>
                                            <span className="font-medium text-gray-900">${Number(item.total).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Expense Breakdown */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                    <TrendingDown className="w-5 h-5 text-red-600" />
                                    Expense Breakdown
                                </h3>
                            </div>
                            <div className="p-6">
                                <h4 className="text-sm font-medium text-gray-500 uppercase mb-3">By Category</h4>
                                <div className="space-y-3 mb-6">
                                    {expenseData?.byCategory?.map((item, index) => (
                                        <div key={index} className="flex justify-between items-center">
                                            <span className="text-gray-700">{item.category}</span>
                                            <span className="font-medium text-gray-900">${Number(item.total).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </Layout>
    );
};

export default FinancialReports;
