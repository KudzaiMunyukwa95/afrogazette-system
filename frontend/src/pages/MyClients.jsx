import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import { clientAPI } from '../services/api';
import { useToast } from '../components/Toast';
import ConfirmModal from '../components/ConfirmModal';
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
    const [deleteModal, setDeleteModal] = useState({ isOpen: false, clientId: null, clientName: '' });

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

    const handleDelete = async (id, name) => {
        setDeleteModal({ isOpen: true, clientId: id, clientName: name });
    };

    const confirmDelete = async () => {
        try {
            await clientAPI.delete(deleteModal.clientId);
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
            <div className="min-h-screen bg-gray-50 py-4 md:py-8">
                <div className="max-w-7xl mx-auto mobile-container">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Clients</h1>
                            <p className="mt-1 text-sm md:text-base text-gray-500">Manage your client database</p>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            {selectedClients.size >= 2 && (
                                <button
                                    onClick={openMergeModal}
                                    className="flex-1 md:flex-none inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 btn-touch"
                                >
                                    <Merge className="h-4 w-4 mr-2" />
                                    Merge ({selectedClients.size})
                                </button>
                            )}
                            <button
                                onClick={openCreateModal}
                                className="flex-1 md:flex-none inline-flex justify-center items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 btn-touch"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Client
                            </button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="mb-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search clients..."
                                className="input-mobile pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 w-full md:w-96"
                                value={searchTerm}
                                onChange={handleSearch}
                            />
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
                                                            onClick={() => handleDelete(client.id, client.name)}
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

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-4">
                                {clients.map((client) => (
                                    <div key={client.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 card-mobile">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold mr-3">
                                                    {client.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">{client.name}</h3>
                                                    {client.company && (
                                                        <p className="text-xs text-gray-500 flex items-center">
                                                            <Building className="h-3 w-3 mr-1" />
                                                            {client.company}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={selectedClients.has(client.id)}
                                                onChange={() => handleSelection(client.id)}
                                                className="h-5 w-5 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className="bg-gray-50 p-2 rounded-lg text-center">
                                                <span className="text-xs text-gray-500 block">Adverts</span>
                                                <span className="text-lg font-bold text-gray-900">{client.total_adverts}</span>
                                            </div>
                                            <div className="bg-gray-50 p-2 rounded-lg text-center">
                                                <span className="text-xs text-gray-500 block">Total Spent</span>
                                                <span className="text-lg font-bold text-green-600">${Number(client.total_spent).toFixed(2)}</span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 border-t border-gray-100 pt-3">
                                            {client.phone && (
                                                <a
                                                    href={`tel:${client.phone}`}
                                                    className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 btn-touch"
                                                >
                                                    <Phone className="h-4 w-4 mr-2 text-gray-400" />
                                                    Call
                                                </a>
                                            )}
                                            {client.phone && (
                                                <a
                                                    href={`https://wa.me/${client.phone.replace(/[^0-9]/g, '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex-1 inline-flex justify-center items-center px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 btn-touch"
                                                >
                                                    <svg className="h-4 w-4 mr-2 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                                                    </svg>
                                                    WhatsApp
                                                </a>
                                            )}
                                        </div>

                                        <div className="flex justify-end gap-3 mt-3 pt-3 border-t border-gray-100">
                                            <button
                                                onClick={() => openEditModal(client)}
                                                className="text-sm text-indigo-600 font-medium"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(client.id, client.name)}
                                                className="text-sm text-red-600 font-medium"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}

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
                                                                        <span className="block text-xs text-gray-500">{client.email}</span>
                                                                    </div>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700">Name</label>
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
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                                            >
                                                {modalMode === 'create' ? 'Create' : modalMode === 'edit' ? 'Save Changes' : 'Merge Clients'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setIsModalOpen(false)}
                                                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
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

            <ConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={() => setDeleteModal({ isOpen: false, clientId: null, clientName: '' })}
                onConfirm={confirmDelete}
                title="Delete Client"
                message={`Are you sure you want to delete "${deleteModal.clientName}"? This action cannot be undone.`}
                confirmText="Delete"
                type="danger"
            />
        </Layout>
    );
};

export default MyClients;
