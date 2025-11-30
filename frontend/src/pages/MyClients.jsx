import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import { clientAPI } from '../services/api';
import { useToast } from '../components/Toast';
import {
    Users, Search, Plus, Edit2, Trash2, Merge,
    X, Check, AlertTriangle, Phone, Mail, Building
} from 'lucide-react';

const MyClients = () => {
    const toast = useToast();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [pagination, setPagination] = useState({ total: 0, totalPages: 0, limit: 15 });

    // Selection for merge
    const [selectedClients, setSelectedClients] = useState(new Set());

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create', 'edit', 'merge'
    const [currentClient, setCurrentClient] = useState(null);
    const [mergeKeepId, setMergeKeepId] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        notes: ''
    });

    useEffect(() => {
        fetchClients();
    }, [currentPage, searchTerm]);

    const fetchClients = async () => {
        try {
            setLoading(true);
            const params = { page: currentPage, limit: 15 };
            if (searchTerm) params.search = searchTerm;

            const response = await clientAPI.getAll(params);
            setClients(response.data.data.clients);
            setPagination(response.data.data.pagination);
        } catch (error) {
            console.error('Error fetching clients:', error);
            toast.error('Failed to load clients');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleSelection = (id) => {
        const newSelected = new Set(selectedClients);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedClients(newSelected);
    };

    const openCreateModal = () => {
        setModalMode('create');
        setFormData({ name: '', email: '', phone: '', company: '', notes: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (client) => {
        setModalMode('edit');
        setCurrentClient(client);
        setFormData({
            name: client.name,
            email: client.email || '',
            phone: client.phone || '',
            company: client.company || '',
            notes: client.notes || ''
        });
        setIsModalOpen(true);
    };

    const openMergeModal = () => {
        if (selectedClients.size < 2) {
            toast.error('Select at least 2 clients to merge');
            return;
        }
        setModalMode('merge');
        setMergeKeepId(Array.from(selectedClients)[0]); // Default to first selected
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (modalMode === 'create') {
                await clientAPI.create(formData);
                toast.success('Client created successfully');
            } else if (modalMode === 'edit') {
                await clientAPI.update(currentClient.id, formData);
                toast.success('Client updated successfully');
            } else if (modalMode === 'merge') {
                const mergeIds = Array.from(selectedClients).filter(id => id !== parseInt(mergeKeepId));
                await clientAPI.merge(parseInt(mergeKeepId), mergeIds);
                toast.success('Clients merged successfully');
                setSelectedClients(new Set());
            }
            setIsModalOpen(false);
            fetchClients();
        } catch (error) {
            console.error('Operation error:', error);
            toast.error(error.response?.data?.message || 'Operation failed');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this client?')) return;

        try {
            await clientAPI.delete(id);
            toast.success('Client deleted successfully');
            fetchClients();
        } catch (error) {
            console.error('Delete error:', error);
            toast.error(error.response?.data?.message || 'Failed to delete client');
        }
    };

    const getSelectedClientsList = () => {
        return clients.filter(c => selectedClients.has(c.id));
    };

    return (
        <Layout>
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-7xl mx-auto px-6">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">My Clients</h1>
                            <p className="mt-1 text-gray-500">Manage your client database</p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4">
                            {selectedClients.size >= 2 && (
                                <button
                                    onClick={openMergeModal}
                                    className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    <Merge className="h-5 w-5 mr-2" />
                                    Merge ({selectedClients.size})
                                </button>
                            )}

                            <button
                                onClick={openCreateModal}
                                className="flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                <Plus className="h-5 w-5 mr-2" />
                                Add Client
                            </button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="mb-6">
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search clients..."
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 w-full"
                                value={searchTerm}
                                onChange={handleSearch}
                            />
                        </div>
                    </div>

                    {/* Table */}
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
                        </div>
                    ) : (
                        <>
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left">
                                                    <span className="sr-only">Select</span>
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stats</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {clients.map((client) => (
                                                <tr key={client.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap w-4">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedClients.has(client.id)}
                                                            onChange={() => handleSelection(client.id)}
                                                            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold mr-3">
                                                                {client.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-gray-900">{client.name}</div>
                                                                {client.company && (
                                                                    <div className="text-sm text-gray-500 flex items-center">
                                                                        <Building className="h-3 w-3 mr-1" />
                                                                        {client.company}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-500 space-y-1">
                                                            {client.email && (
                                                                <div className="flex items-center">
                                                                    <Mail className="h-3 w-3 mr-1" />
                                                                    {client.email}
                                                                </div>
                                                            )}
                                                            {client.phone && (
                                                                <div className="flex items-center">
                                                                    <Phone className="h-3 w-3 mr-1" />
                                                                    {client.phone}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">
                                                            {client.total_adverts} Adverts
                                                        </div>
                                                        <div className="text-sm text-green-600 font-medium">
                                                            ${Number(client.total_spent).toFixed(2)} Spent
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <button
                                                            onClick={() => openEditModal(client)}
                                                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(client.id)}
                                                            className="text-red-600 hover:text-red-900"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                {clients.length === 0 && (
                                    <div className="text-center py-12">
                                        <Users className="mx-auto h-12 w-12 text-gray-300" />
                                        <h3 className="mt-2 text-sm font-medium text-gray-900">No clients found</h3>
                                    </div>
                                )}
                            </div>

                            <Pagination
                                currentPage={currentPage}
                                totalPages={pagination.totalPages}
                                total={pagination.total}
                                limit={pagination.limit}
                                onPageChange={setCurrentPage}
                            />
                        </>
                    )}

                    {/* Modal */}
                    {isModalOpen && (
                        <div className="fixed inset-0 z-50 overflow-y-auto">
                            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
                                <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                                    <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setIsModalOpen(false)}></div>
                                </div>

                                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
                                    <form onSubmit={handleSubmit}>
                                        <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                            <div className="flex justify-between items-start mb-4">
                                                <h3 className="text-lg leading-6 font-medium text-gray-900">
                                                    {modalMode === 'create' && 'Add New Client'}
                                                    {modalMode === 'edit' && 'Edit Client'}
                                                    {modalMode === 'merge' && 'Merge Clients'}
                                                </h3>
                                                <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                                                    <X className="h-6 w-6" />
                                                </button>
                                            </div>

                                            {modalMode === 'merge' ? (
                                                <div className="space-y-4">
                                                    <div className="bg-blue-50 p-4 rounded-md">
                                                        <div className="flex">
                                                            <div className="flex-shrink-0">
                                                                <AlertTriangle className="h-5 w-5 text-blue-400" />
                                                            </div>
                                                            <div className="ml-3">
                                                                <h3 className="text-sm font-medium text-blue-800">Merge Operation</h3>
                                                                <div className="mt-2 text-sm text-blue-700">
                                                                    <p>Select the primary client to keep. All adverts from other selected clients will be transferred to this one, and the others will be deleted.</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-2">Keep this client:</label>
                                                        <div className="space-y-2">
                                                            {getSelectedClientsList().map(client => (
                                                                <label key={client.id} className={`flex items-center p-3 border rounded-lg cursor-pointer ${parseInt(mergeKeepId) === client.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200'
                                                                    }`}>
                                                                    <input
                                                                        type="radio"
                                                                        name="keepId"
                                                                        value={client.id}
                                                                        checked={parseInt(mergeKeepId) === client.id}
                                                                        onChange={(e) => setMergeKeepId(e.target.value)}
                                                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                                                    />
                                                                    <div className="ml-3">
                                                                        <span className="block text-sm font-medium text-gray-900">{client.name}</span>
                                                                        <span className="block text-xs text-gray-500">
                                                                            {client.total_adverts} adverts • ${Number(client.total_spent).toFixed(2)} spent
                                                                        </span>
                                                                    </div>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700">Name *</label>
                                                        <input
                                                            type="text"
                                                            required
                                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                                                            value={formData.name}
                                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700">Company</label>
                                                        <input
                                                            type="text"
                                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                                                            value={formData.company}
                                                            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700">Email</label>
                                                            <input
                                                                type="email"
                                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                                                                value={formData.email}
                                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700">Phone</label>
                                                            <input
                                                                type="text"
                                                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                                                                value={formData.phone}
                                                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700">Notes</label>
                                                        <textarea
                                                            rows={3}
                                                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm"
                                                            value={formData.notes}
                                                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                            <button
                                                type="submit"
                                                className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm ${modalMode === 'merge' ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500' : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                                                    }`}
                                            >
                                                {modalMode === 'create' && 'Create Client'}
                                                {modalMode === 'edit' && 'Save Changes'}
                                                {modalMode === 'merge' && 'Merge Clients'}
                                            </button>
                                            <button
                                                type="button"
                                                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                                                onClick={() => setIsModalOpen(false)}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default MyClients;
