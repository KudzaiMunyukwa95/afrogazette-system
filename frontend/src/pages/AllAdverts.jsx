import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import { advertAPI } from '../services/api';
import { Search, Filter, Calendar, CheckCircle, XCircle, Clock, Trash2, Edit, MoreVertical } from 'lucide-react';

const AllAdverts = () => {
    const [adverts, setAdverts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 0, limit: 15 });
    useEffect(() => {
        fetchAdverts();
    }, [statusFilter, currentPage]);

    const fetchAdverts = async () => {
        try {
            setLoading(true);
            const params = { page: currentPage, limit: 15 };
            if (statusFilter !== 'all') params.status = statusFilter;

            const response = await advertAPI.getAll(params);
            setAdverts(response.data.data.adverts);
            setPagination(response.data.data.pagination);
        } catch (error) {
            console.error('Error fetching adverts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this advert?')) {
            try {
                await advertAPI.deleteAdvert(id);
                fetchAdverts(); // Refresh list
            } catch (error) {
                console.error('Error deleting advert:', error);
                alert('Failed to delete advert');
            }
        }
    };

    const filteredAdverts = adverts.filter(ad => {
        const matchesSearch =
            ad.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ad.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (ad.sales_rep_name && ad.sales_rep_name.toLowerCase().includes(searchTerm.toLowerCase()));

        return matchesSearch;
    });

    const getStatusBadge = (status) => {
        const styles = {
            active: 'bg-green-100 text-green-800',
            pending: 'bg-amber-100 text-amber-800',
            expired: 'bg-gray-100 text-gray-800',
            rejected: 'bg-red-100 text-red-800',
            cancelled: 'bg-red-100 text-red-800'
        };

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] || styles.expired}`}>
                {status}
            </span>
        );
    };

    return (
        <Layout>
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">All Adverts</h1>
                            <p className="mt-1 text-gray-500">Manage all advertising campaigns across the platform</p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search adverts or reps..."
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 w-full sm:w-64"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <select
                                    className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 appearance-none bg-white"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="all">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="pending">Pending</option>
                                    <option value="expired">Expired</option>
                                    <option value="rejected">Rejected</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales Rep</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredAdverts.map((ad) => (
                                            <tr key={ad.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-medium text-gray-900">{ad.client_name}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm text-gray-900">{ad.sales_rep_name}</div>
                                                    <div className="text-xs text-gray-500">{ad.sales_rep_email}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                                                        {(ad.advert_type || 'text_ad').replace(/_/g, ' ')}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm text-gray-600 capitalize">{ad.category.replace(/_/g, ' ')}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {getStatusBadge(ad.status)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <div>Start: {new Date(ad.start_date).toLocaleDateString()}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    ${Number(ad.amount_paid).toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button
                                                        onClick={() => handleDelete(ad.id)}
                                                        className="text-red-600 hover:text-red-900"
                                                        title="Delete Advert"
                                                    >
                                                        <Trash2 className="h-5 w-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {filteredAdverts.length === 0 && (
                                <div className="text-center py-12">
                                    <Search className="mx-auto h-12 w-12 text-gray-300" />
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">No adverts found</h3>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default AllAdverts;
