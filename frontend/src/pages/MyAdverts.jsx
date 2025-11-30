import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import { advertAPI } from '../services/api';
import { Search, Filter, Calendar, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

const MyAdverts = () => {
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
            <div className="min-h-screen bg-gray-50 py-4 md:py-8">
                <div className="max-w-7xl mx-auto mobile-container">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Adverts</h1>
                            <p className="mt-1 text-sm md:text-base text-gray-500">Manage all your advertising campaigns</p>
                        </div>

                        <div className="w-full md:w-auto">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search adverts..."
                                    className="input-mobile pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 w-full md:w-64"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Mobile Filters - Swipeable Pills */}
                    <div className="mb-6 -mx-4 md:mx-0 md:mb-8">
                        <div className="swipeable flex gap-2 px-4 md:px-0 pb-2">
                            {[
                                { id: 'all', label: 'All Status' },
                                { id: 'active', label: 'Active' },
                                { id: 'pending', label: 'Pending' },
                                { id: 'expired', label: 'Expired' },
                                { id: 'rejected', label: 'Rejected' }
                            ].map((filter) => (
                                <button
                                    key={filter.id}
                                    onClick={() => setStatusFilter(filter.id)}
                                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all tap-target ${statusFilter === filter.id
                                        ? 'bg-red-600 text-white shadow-md'
                                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    {filter.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
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
                                                        {ad.end_date && <div>End: {new Date(ad.end_date).toLocaleDateString()}</div>}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {ad.slot_label || '-'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                        ${Number(ad.amount_paid).toFixed(2)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                                        ${Number(ad.commission_amount || 0).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-4">
                                {filteredAdverts.map((ad) => (
                                    <div key={ad.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 card-mobile">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <h3 className="font-semibold text-gray-900">{ad.client_name}</h3>
                                                <p className="text-xs text-gray-500 truncate max-w-[200px]">{ad.caption}</p>
                                            </div>
                                            {getStatusBadge(ad.status)}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <div className="bg-gray-50 p-2 rounded-lg">
                                                <span className="text-xs text-gray-500 block mb-1">Type</span>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                                                    {(ad.advert_type || 'text_ad').replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                            <div className="bg-gray-50 p-2 rounded-lg">
                                                <span className="text-xs text-gray-500 block mb-1">Category</span>
                                                <span className="text-sm font-medium text-gray-700 capitalize">
                                                    {ad.category.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center text-xs text-gray-500 mb-3">
                                            <Calendar className="h-3.5 w-3.5 mr-1.5" />
                                            <span>
                                                {new Date(ad.start_date).toLocaleDateString()}
                                                {ad.end_date && ` - ${new Date(ad.end_date).toLocaleDateString()}`}
                                            </span>
                                        </div>

                                        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                            <div>
                                                <span className="text-xs text-gray-500 block">Amount</span>
                                                <span className="text-lg font-bold text-gray-900">${Number(ad.amount_paid).toFixed(2)}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs text-gray-500 block">Commission</span>
                                                <span className="text-sm font-bold text-green-600">+${Number(ad.commission_amount || 0).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
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

                            <Pagination
                                currentPage={currentPage}
                                totalPages={pagination.totalPages}
                                total={pagination.total}
                                limit={pagination.limit}
                                onPageChange={(page) => setCurrentPage(page)}
                            />
                        </>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default MyAdverts;
