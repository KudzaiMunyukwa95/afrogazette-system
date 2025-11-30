import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../services/api';
import { Users, Search, TrendingUp, Calendar, DollarSign } from 'lucide-react';

const MyClients = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        // Since we don't have a dedicated clients endpoint yet, we'll derive it from adverts
        // Ideally, we should have a /api/clients endpoint
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            // Fetch all adverts for the user
            const response = await api.get('/adverts');
            const adverts = response.data.data.adverts;

            // Group by client name
            const clientMap = new Map();

            adverts.forEach(ad => {
                const name = ad.client_name;
                if (!clientMap.has(name)) {
                    clientMap.set(name, {
                        name,
                        totalSpend: 0,
                        advertsCount: 0,
                        lastActivity: ad.created_at,
                        categories: new Set(),
                        status: 'active' // logic to determine status
                    });
                }

                const client = clientMap.get(name);
                client.totalSpend += parseFloat(ad.amount_paid);
                client.advertsCount += 1;
                client.categories.add(ad.category);
                if (new Date(ad.created_at) > new Date(client.lastActivity)) {
                    client.lastActivity = ad.created_at;
                }
            });

            // Process clients
            const processedClients = Array.from(clientMap.values()).map(client => {
                const lastDate = new Date(client.lastActivity);
                const daysSinceLast = (new Date() - lastDate) / (1000 * 60 * 60 * 24);

                return {
                    ...client,
                    categories: Array.from(client.categories),
                    status: daysSinceLast > 30 ? 'dormant' : 'active',
                    isHighValue: client.totalSpend > 500 // Threshold example
                };
            });

            setClients(processedClients);
        } catch (error) {
            console.error('Error fetching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredClients = clients.filter(client =>
        client.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Layout>
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">My Clients</h1>
                            <p className="mt-1 text-gray-500">Manage and track your client relationships</p>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search clients..."
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 w-64"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Client Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Total Clients</p>
                                    <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-lg">
                                    <Users className="h-6 w-6 text-blue-600" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Active Clients</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {clients.filter(c => c.status === 'active').length}
                                    </p>
                                </div>
                                <div className="p-3 bg-green-50 rounded-lg">
                                    <TrendingUp className="h-6 w-6 text-green-600" />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">High Value</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {clients.filter(c => c.isHighValue).length}
                                    </p>
                                </div>
                                <div className="p-3 bg-amber-50 rounded-lg">
                                    <DollarSign className="h-6 w-6 text-amber-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Client Name
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Total Spend
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Campaigns
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Last Activity
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Categories
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredClients.map((client, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold mr-3">
                                                        {client.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900">{client.name}</div>
                                                        {client.isHighValue && (
                                                            <span className="text-xs text-amber-600 font-medium">High Value Client</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${client.status === 'active'
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {client.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                ${client.totalSpend.toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {client.advertsCount}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(client.lastActivity).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-wrap gap-1">
                                                    {client.categories.slice(0, 2).map(cat => (
                                                        <span key={cat} className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600 capitalize">
                                                            {cat.replace(/_/g, ' ')}
                                                        </span>
                                                    ))}
                                                    {client.categories.length > 2 && (
                                                        <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                                                            +{client.categories.length - 2}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredClients.length === 0 && (
                                <div className="text-center py-12">
                                    <Users className="mx-auto h-12 w-12 text-gray-300" />
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">No clients found</h3>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default MyClients;
