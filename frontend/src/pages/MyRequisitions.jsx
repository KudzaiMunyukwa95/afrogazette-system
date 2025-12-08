import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { financeAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
    Plus, Clock, CheckCircle, XCircle,
    DollarSign, Calendar, MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';

const MyRequisitions = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [requisitions, setRequisitions] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        reason: '',
        amount: '',
        category: 'Transport',
        payment_method: 'cash',
        details: ''
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchRequisitions();
    }, []);

    const fetchRequisitions = async () => {
        try {
            setLoading(true);
            // Sales reps only see their own requisitions (handled by backend)
            const response = await financeAPI.getExpenses({
                type: 'Requisition'
            });
            setRequisitions(response.data.data);
        } catch (error) {
            console.error('Error fetching requisitions:', error);
            showToast('Failed to load your requisitions', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRequisition = async (e) => {
        e.preventDefault();
        console.log('🚀 handleCreateRequisition called');
        console.log('📝 Form Data:', formData);

        try {
            setSubmitting(true);
            console.log('⏳ Sending API request...');
            const response = await financeAPI.createRequisition(formData);
            console.log('✅ API Response:', response);

            showToast('Requisition submitted successfully', 'success');
            setIsModalOpen(false);
            setFormData({
                reason: '',
                amount: '',
                category: 'Transport',
                payment_method: 'cash',
                details: ''
            });
            fetchRequisitions();
        } catch (error) {
            console.error('❌ Error creating requisition:', error);
            showToast(error.response?.data?.message || 'Failed to submit requisition', 'error');
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

    return (
        <Layout>
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">My Requisitions</h1>
                            <p className="text-gray-600">Track your expense requests</p>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            New Request
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
                        </div>
                    ) : requisitions.length > 0 ? (
                        <div className="space-y-4">
                            {requisitions.map((req) => (
                                <div key={req.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 md:p-6 hover:shadow-md transition-shadow">
                                    <div className="flex flex-col md:flex-row justify-between gap-4">
                                        <div className="flex-grow">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-lg font-bold text-gray-900">{req.reason}</h3>
                                                {getStatusBadge(req.status)}
                                            </div>

                                            <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {format(new Date(req.created_at), 'MMM d, yyyy')}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <DollarSign className="w-4 h-4" />
                                                    {req.payment_method}
                                                </span>
                                            </div>

                                            {req.details && (
                                                <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg inline-block">
                                                    {req.details}
                                                </p>
                                            )}

                                            {req.status === 'Rejected' && req.rejection_comment && (
                                                <div className="mt-3 text-sm text-red-600 bg-red-50 p-3 rounded-lg flex items-start gap-2">
                                                    <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                                    <div>
                                                        <span className="font-semibold">Rejection Reason:</span> {req.rejection_comment}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col items-end justify-center min-w-[120px]">
                                            <span className="text-2xl font-bold text-gray-900">${Number(req.amount).toFixed(2)}</span>
                                            {req.approved_at && (
                                                <span className="text-xs text-green-600 mt-1">
                                                    Approved {format(new Date(req.approved_at), 'MMM d')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 border-dashed">
                            <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">No Requisitions Yet</h3>
                            <p className="text-gray-500 mb-6">Create a request to get reimbursed for expenses.</p>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Create First Request
                            </button>
                        </div>
                    )}

                </div>
            </div>

            {/* Create Requisition Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">New Requisition</h2>
                        <form onSubmit={handleCreateRequisition} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.reason}
                                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                                    placeholder="e.g. Transport to Client"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                                        required
                                    >
                                        <option value="Transport">Transport</option>
                                        <option value="Marketing">Marketing</option>
                                        <option value="Office Supplies">Office Supplies</option>
                                        <option value="Utilities">Utilities</option>
                                        <option value="Salaries">Salaries</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Method</label>
                                <select
                                    value={formData.payment_method}
                                    onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                                >
                                    <option value="cash">Cash</option>
                                    <option value="ecocash">EcoCash</option>
                                    <option value="innbucks">Innbucks</option>
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
                                    {submitting ? 'Submitting...' : 'Submit Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default MyRequisitions;
