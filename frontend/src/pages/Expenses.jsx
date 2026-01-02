import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import FinanceNav from '../components/FinanceNav';
import Pagination from '../components/Pagination';
import { financeAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
    Plus, Search, Filter, Download,
    CheckCircle, XCircle, Clock,
    ChevronLeft, ChevronRight, DollarSign
} from 'lucide-react';
import { format } from 'date-fns';

const Expenses = () => {
    const { user } = useAuth();
    const { success, error: showError } = useToast();
    const [loading, setLoading] = useState(true);
    const [expenses, setExpenses] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 0, limit: 15 });
    const [filters, setFilters] = useState({
        status: '',
        payment_method: '',
        startDate: '',
        endDate: ''
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        reason: '',
        amount: '',
        payment_method: 'Cash',
        category: 'Other',
        details: '',
        expense_date: new Date().toISOString().split('T')[0]
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchExpenses();
    }, [filters, currentPage]);

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            const response = await financeAPI.getExpenses({
                ...filters,
                type: 'DirectExpense',
                page: currentPage,
                limit: 15
            });
            // Handle new paginated response structure
            if (response.data.data.expenses) {
                setExpenses(response.data.data.expenses);
                setPagination(response.data.data.pagination);
            } else {
                // Fallback for older API version or unexpected structure
                setExpenses(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching expenses:', error);
            showError('Failed to load expenses');
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
        window.scrollTo(0, 0);
    };

    const handleCreateExpense = async (e) => {
        e.preventDefault();
        console.log('🚀 handleCreateExpense called');
        console.log('📝 Form Data:', formData);

        try {
            setSubmitting(true);
            console.log('⏳ Sending API request...');
            const response = await financeAPI.createExpense(formData);
            console.log('✅ API Response:', response);

            success('Expense created successfully');
            setIsModalOpen(false);
            setFormData({
                reason: '',
                amount: '',
                payment_method: 'Cash',
                category: 'Other',
                details: '',
                expense_date: new Date().toISOString().split('T')[0]
            });
            fetchExpenses();
        } catch (error) {
            console.error('❌ Error creating expense:', error);
            showError(error.response?.data?.message || 'Failed to create expense');
        } finally {
            console.log('🏁 Handler finished');
            setSubmitting(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Approved':
                return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Approved</span>;
            case 'Rejected':
                return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 flex items-center gap-1"><XCircle className="w-3 h-3" /> Rejected</span>;
            default:
                return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>;
        }
    };

    if (loading && expenses.length === 0) {
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
                        <h1 className="text-2xl font-bold text-gray-900">Operational Expenses</h1>
                        <p className="text-gray-500">Manage and track company expenses.</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        New Expense
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2 text-gray-500">
                        <Filter className="w-5 h-5" />
                        <span className="text-sm font-medium">Filters:</span>
                    </div>

                    <select
                        value={filters.status}
                        onChange={(e) => {
                            setFilters({ ...filters, status: e.target.value });
                            setCurrentPage(1);
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-red-500 focus:border-red-500"
                    >
                        <option value="">All Statuses</option>
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                    </select>

                    <select
                        value={filters.payment_method}
                        onChange={(e) => {
                            setFilters({ ...filters, payment_method: e.target.value });
                            setCurrentPage(1);
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-red-500 focus:border-red-500"
                    >
                        <option value="">All Payment Methods</option>
                        <option value="Cash">Cash</option>
                        <option value="EcoCash">EcoCash</option>
                        <option value="Innbucks">Innbucks</option>
                    </select>

                    <input
                        type="date"
                        value={filters.startDate}
                        onChange={(e) => {
                            setFilters({ ...filters, startDate: e.target.value });
                            setCurrentPage(1);
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-red-500 focus:border-red-500"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                        type="date"
                        value={filters.endDate}
                        onChange={(e) => {
                            setFilters({ ...filters, endDate: e.target.value });
                            setCurrentPage(1);
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-red-500 focus:border-red-500"
                    />
                </div>

                {/* Expenses List */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
                    {expenses.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Raised By</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {expenses.map((expense) => (
                                        <tr key={expense.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {format(new Date(expense.expense_date || expense.created_at), 'MMM d, yyyy')}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                {expense.reason}
                                                {expense.type === 'Requisition' && <span className="ml-2 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Req</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {expense.category || '-'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                                ${Number(expense.amount).toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {expense.payment_method}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {expense.raised_by_name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {getStatusBadge(expense.status)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-12 text-center text-gray-500">
                            No expenses found matching your filters.
                        </div>
                    )}
                </div>

                {/* Pagination */}
                {expenses.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={pagination.totalPages}
                        onPageChange={handlePageChange}
                        totalItems={pagination.total}
                        itemsPerPage={pagination.limit}
                    />
                )}

                {/* Create Expense Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">New Expense</h2>
                            <form onSubmit={handleCreateExpense} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.reason}
                                        onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                                        placeholder="e.g. Office Supplies"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Expense Date</label>
                                        <input
                                            type="date"
                                            required
                                            max={new Date().toISOString().split('T')[0]} // Prevent future dates
                                            value={formData.expense_date}
                                            onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            required
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                                        <select
                                            value={formData.payment_method}
                                            onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                                        >
                                            <option value="Cash">Cash</option>
                                            <option value="EcoCash">EcoCash</option>
                                            <option value="Innbucks">Innbucks</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                                    >
                                        <option value="Transport">Transport</option>
                                        <option value="Data/Airtime">Data/Airtime</option>
                                        <option value="Equipment">Equipment</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Details (Optional)</label>
                                    <textarea
                                        value={formData.details}
                                        onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                                        rows="3"
                                        placeholder="Additional notes..."
                                    ></textarea>
                                </div>

                                <div className="flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                    >
                                        {submitting ? 'Saving...' : 'Create Expense'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Expenses;
