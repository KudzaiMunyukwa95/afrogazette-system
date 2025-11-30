import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { advertAPI } from '../services/api';
import { Search, Filter, Calendar, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

const MyAdverts = () => {
    const [adverts, setAdverts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    useEffect(() => {
        fetchAdverts();
    }, [statusFilter]);

    const fetchAdverts = async () => {
        try {
            setLoading(true);
            const response = await advertAPI.getAll(statusFilter !== 'all' ? { status: statusFilter } : undefined);
            setAdverts(response.data.data.adverts);
        } catch (error) {
            console.error('Error fetching adverts:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredAdverts = adverts.filter(ad => {
        const matchesSearch =
            ad.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ad.category.toLowerCase().includes(searchTerm.toLowerCase());

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

        const icons = {
            active: <CheckCircle className="h-3 w-3 mr-1" />,
            pending: <Clock className="h-3 w-3 mr-1" />,
            expired: <Calendar className="h-3 w-3 mr-1" />,
            rejected: <XCircle className="h-3 w-3 mr-1" />,
            cancelled: <XCircle className="h-3 w-3 mr-1" />
        };

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${styles[status] || styles.expired}`}>
                {icons[status]}
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
                            <h1 className="text-3xl font-bold text-gray-900">My Adverts</h1>
                            <p className="mt-1 text-gray-500">Manage all your advertising campaigns</p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search adverts..."
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
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slot</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commission</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredAdverts.map((ad) => (
                                            <tr key={ad.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="font-medium text-gray-900">{ad.client_name}</div>
                                                    <div className="text-xs text-gray-500 truncate max-w-[200px]">{ad.caption}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm text-gray-600 capitalize">{ad.category.replace(/_/g, ' ')}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {getStatusBadge(ad.status)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    <div>Start: {new Date(ad.start_date).toLocaleDateString()}</div>
                                                    {ad.end_date && (
                                                        <div className="text-xs">End: {new Date(ad.end_date).toLocaleDateString()}</div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {ad.slot_label || '-'}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    ${Number(ad.amount_paid).toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                                    ${Number(ad.commission_amount).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {filteredAdverts.length === 0 && (
                                <div className="text-center py-12">
                                    <AlertTriangle className="mx-auto h-12 w-12 text-gray-300" />
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">No adverts found</h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Try adjusting your search or filters.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default MyAdverts;
