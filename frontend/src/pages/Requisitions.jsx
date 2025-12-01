import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import FinanceNav from '../components/FinanceNav';
import { financeAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
    CheckCircle, XCircle, Clock, AlertTriangle,
    User, DollarSign, Calendar
} from 'lucide-react';
import { format } from 'date-fns';

const Requisitions = () => {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [requisitions, setRequisitions] = useState([]);
    const [processingId, setProcessingId] = useState(null);
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [selectedReqId, setSelectedReqId] = useState(null);
    const [rejectComment, setRejectComment] = useState('');

    useEffect(() => {
        fetchRequisitions();
    }, []);

    const fetchRequisitions = async () => {
        try {
            setLoading(true);
            // Fetch all pending requisitions
            const response = await financeAPI.getExpenses({
                status: 'Pending',
                type: 'Requisition'
            });
            setRequisitions(response.data.data);
        } catch (error) {
            console.error('Error fetching requisitions:', error);
            showToast('Failed to load requisitions', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id, raisedById) => {
        if (user.id === raisedById) {
            showToast('You cannot approve your own requisition', 'error');
            return;
        }

        try {
            setProcessingId(id);
            const response = await financeAPI.approveExpense(id);
            showToast(response.data?.message || 'Requisition approved successfully', 'success');
            fetchRequisitions();
        } catch (error) {
            console.error('Error approving requisition:', error);
            showToast(error.response?.data?.message || 'Failed to approve requisition', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    const openRejectModal = (id) => {
        setSelectedReqId(id);
        setRejectComment('');
        setRejectModalOpen(true);
    };

    const handleReject = async (e) => {
        e.preventDefault();
        if (!rejectComment.trim()) {
            showToast('Please provide a reason for rejection', 'error');
            return;
        }

        try {
            setProcessingId(selectedReqId);
            await financeAPI.rejectExpense(selectedReqId, rejectComment);
            showToast('Requisition rejected', 'success');
            setRejectModalOpen(false);
            fetchRequisitions();
        } catch (error) {
            console.error('Error rejecting requisition:', error);
            showToast(error.response?.data?.message || 'Failed to reject requisition', 'error');
        } finally {
            setProcessingId(null);
        }
    };

    if (loading && requisitions.length === 0) {
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
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900">Requisition Approvals</h1>
                    <p className="text-gray-500">Review and approve expense requisitions from sales representatives.</p>
                </div>

                {/* Requisitions List */}
                {requisitions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {requisitions.map((req) => (
                            <div key={req.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <Calendar className="w-4 h-4" />
                                            {format(new Date(req.created_at), 'MMM d, yyyy')}
                                        </div>
                                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> Pending
                                        </span>
                                    </div>

                                    <h3 className="text-lg font-bold text-gray-900 mb-2">{req.reason}</h3>

                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500 flex items-center gap-2">
                                                <User className="w-4 h-4" /> Raised By
                                            </span>
                                            <span className="font-medium text-gray-900">{req.raised_by_name}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500 flex items-center gap-2">
                                                <DollarSign className="w-4 h-4" /> Amount
                                            </span>
                                            <span className="font-bold text-gray-900 text-lg">${Number(req.amount).toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-500">Payment Method</span>
                                            <span className="font-medium text-gray-900">{req.payment_method}</span>
                                        </div>
                                    </div>

                                    {req.details && (
                                        <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 mb-6">
                                            {req.details}
                                        </div>
                                    )}

                                    <div className="flex gap-3 pt-4 border-t border-gray-100">
                                        {user.id === req.raised_by_user_id ? (
                                            <div className="w-full py-2 text-center text-sm text-gray-500 bg-gray-50 rounded-lg flex items-center justify-center gap-2">
                                                <AlertTriangle className="w-4 h-4" />
                                                Cannot approve own request
                                            </div>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => openRejectModal(req.id)}
                                                    disabled={processingId === req.id}
                                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 font-medium"
                                                >
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => handleApprove(req.id, req.raised_by_user_id)}
                                                    disabled={processingId === req.id}
                                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
                                                >
                                                    {processingId === req.id ? 'Processing...' : 'Approve'}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16 bg-white rounded-xl border border-gray-200 border-dashed">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">All Caught Up!</h3>
                        <p className="text-gray-500">No pending requisitions to review.</p>
                    </div>
                )}

                {/* Reject Modal */}
                {rejectModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
                        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Reject Requisition</h2>
                            <form onSubmit={handleReject}>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Rejection</label>
                                    <textarea
                                        required
                                        value={rejectComment}
                                        onChange={(e) => setRejectComment(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                                        rows="3"
                                        placeholder="Please explain why this request is being rejected..."
                                    ></textarea>
                                </div>
                                <div className="flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setRejectModalOpen(false)}
                                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={processingId === selectedReqId}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                    >
                                        {processingId === selectedReqId ? 'Rejecting...' : 'Confirm Rejection'}
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

export default Requisitions;
