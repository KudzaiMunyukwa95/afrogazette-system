import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { advertAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  DollarSign,
  Calendar,
  TrendingUp,
  Eye,
  Edit,
  Phone,
  Mail,
  Filter,
  Download,
  Search,
  BarChart3,
  Clock,
  Target,
  Star
} from 'lucide-react';

const ClientManagement = () => {
  const { user, isAdmin } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBy, setFilterBy] = useState('all');
  const [sortBy, setSortBy] = useState('revenue');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      // Using your existing API to get all adverts, then group by client
      const response = await advertAPI.getAll();
      const adverts = response.data.data.adverts || [];
      
      // Filter adverts by sales rep if not admin
      const filteredAdverts = isAdmin() 
        ? adverts 
        : adverts.filter(advert => advert.sales_rep_id === user?.id);
      
      // Group adverts by client and calculate metrics
      const clientMap = {};
      
      filteredAdverts.forEach(advert => {
        const clientName = advert.client_name;
        
        if (!clientMap[clientName]) {
          clientMap[clientName] = {
            name: clientName,
            totalRevenue: 0,
            totalAdverts: 0,
            activeAdverts: 0,
            categories: new Set(),
            lastActivity: null,
            campaigns: [],
            avgAmount: 0,
            status: 'Active',
            salesRepId: advert.sales_rep_id,
            salesRepName: advert.sales_rep_name || 'Unknown'
          };
        }
        
        const client = clientMap[clientName];
        client.totalRevenue += parseFloat(advert.amount_paid || 0);
        client.totalAdverts++;
        client.categories.add(advert.category);
        client.campaigns.push(advert);
        
        if (advert.status === 'active') {
          client.activeAdverts++;
        }
        
        const advertDate = new Date(advert.created_at);
        if (!client.lastActivity || advertDate > client.lastActivity) {
          client.lastActivity = advertDate;
        }
      });
      
      // Convert to array and calculate additional metrics
      const clientsArray = Object.values(clientMap).map(client => {
        client.avgAmount = client.totalRevenue / client.totalAdverts;
        client.categoriesArray = Array.from(client.categories);
        
        // Determine client tier based on revenue
        if (client.totalRevenue >= 5000) {
          client.tier = 'Premium';
        } else if (client.totalRevenue >= 1000) {
          client.tier = 'Standard';
        } else {
          client.tier = 'Basic';
        }
        
        return client;
      });
      
      setClients(clientsArray);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort clients
  const filteredClients = clients
    .filter(client => {
      const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterBy === 'all' || 
        (filterBy === 'premium' && client.tier === 'Premium') ||
        (filterBy === 'active' && client.activeAdverts > 0) ||
        (filterBy === 'inactive' && client.activeAdverts === 0);
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'revenue':
          return b.totalRevenue - a.totalRevenue;
        case 'activity':
          return new Date(b.lastActivity) - new Date(a.lastActivity);
        case 'campaigns':
          return b.totalAdverts - a.totalAdverts;
        default:
          return a.name.localeCompare(b.name);
      }
    });

  const handleExportClients = () => {
    const csvData = clients.map(client => ({
      'Client Name': client.name,
      'Total Revenue': client.totalRevenue,
      'Total Campaigns': client.totalAdverts,
      'Active Campaigns': client.activeAdverts,
      'Average Amount': client.avgAmount.toFixed(2),
      'Categories': client.categoriesArray.join(', '),
      'Tier': client.tier,
      'Last Activity': client.lastActivity?.toLocaleDateString() || 'N/A',
      ...(isAdmin() ? { 'Sales Rep': client.salesRepName } : {})
    }));
    
    const csv = convertToCSV(csvData);
    const filename = isAdmin() ? 'all-clients-analysis.csv' : 'my-clients-analysis.csv';
    downloadCSV(csv, filename);
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading client data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {isAdmin() ? 'Client Management' : 'My Clients'}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {isAdmin() 
                    ? 'Track all client performance, revenue, and campaign history'
                    : 'Track your client relationships and campaign performance'
                  }
                </p>
              </div>
              <button
                onClick={handleExportClients}
                className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors duration-200 flex items-center"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <StatCard
              title={isAdmin() ? "Total Clients" : "My Clients"}
              value={clients.length}
              icon={<Users className="h-6 w-6" />}
              color="blue"
            />
            <StatCard
              title="Premium Clients"
              value={clients.filter(c => c.tier === 'Premium').length}
              icon={<Star className="h-6 w-6" />}
              color="amber"
            />
            <StatCard
              title="Active Campaigns"
              value={clients.reduce((sum, c) => sum + c.activeAdverts, 0)}
              icon={<Target className="h-6 w-6" />}
              color="green"
            />
            <StatCard
              title={isAdmin() ? "Total Revenue" : "My Revenue"}
              value={`$${clients.reduce((sum, c) => sum + c.totalRevenue, 0).toLocaleString()}`}
              icon={<DollarSign className="h-6 w-6" />}
              color="emerald"
            />
          </div>

          {/* Controls */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              {/* Filter */}
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="all">All Clients</option>
                <option value="premium">Premium Clients</option>
                <option value="active">Active Campaigns</option>
                <option value="inactive">Inactive</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="revenue">Sort by Revenue</option>
                <option value="activity">Sort by Activity</option>
                <option value="campaigns">Sort by Campaigns</option>
                <option value="name">Sort by Name</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Client List */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">
                  {isAdmin() ? 'Client Portfolio' : 'My Client Portfolio'} ({filteredClients.length})
                </h3>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {filteredClients.length > 0 ? (
                  filteredClients.map((client) => (
                    <ClientCard
                      key={client.name}
                      client={client}
                      isSelected={selectedClient?.name === client.name}
                      onClick={() => setSelectedClient(client)}
                      showSalesRep={isAdmin()}
                    />
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {isAdmin() ? 'No Clients Found' : 'No Clients Yet'}
                    </h3>
                    <p className="text-gray-500">
                      {isAdmin() 
                        ? 'No clients match your current filters.'
                        : 'Create your first advert to start building your client portfolio!'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Client Details */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200">
              {selectedClient ? (
                <ClientDetails client={selectedClient} showSalesRep={isAdmin()} />
              ) : (
                <div className="p-8 text-center">
                  <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Select a Client</h3>
                  <p className="text-gray-500">Choose a client to view detailed information</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

// Client Card Component
const ClientCard = ({ client, isSelected, onClick, showSalesRep }) => {
  const getTierColor = (tier) => {
    switch (tier) {
      case 'Premium':
        return 'bg-amber-100 text-amber-800';
      case 'Standard':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div
      onClick={onClick}
      className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors duration-150 ${
        isSelected ? 'bg-blue-50 border-l-4 border-l-red-500' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-gray-900">{client.name}</h4>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTierColor(client.tier)}`}>
          {client.tier}
        </span>
      </div>
      
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <div className="text-gray-500">Revenue</div>
          <div className="font-semibold text-green-600">${client.totalRevenue.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-gray-500">Campaigns</div>
          <div className="font-semibold">{client.totalAdverts}</div>
        </div>
        <div>
          <div className="text-gray-500">Active</div>
          <div className="font-semibold text-blue-600">{client.activeAdverts}</div>
        </div>
      </div>
      
      <div className="mt-2 text-xs text-gray-500">
        Last activity: {client.lastActivity?.toLocaleDateString() || 'N/A'}
        {showSalesRep && (
          <span className="ml-2">• Rep: {client.salesRepName}</span>
        )}
      </div>
    </div>
  );
};

// Client Details Component
const ClientDetails = ({ client, showSalesRep }) => {
  return (
    <div>
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">{client.name}</h3>
        <p className="text-sm text-gray-500">{client.tier} Client</p>
        {showSalesRep && (
          <p className="text-xs text-gray-400">Managed by: {client.salesRepName}</p>
        )}
      </div>
      
      <div className="p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">${client.totalRevenue.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total Revenue</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{client.totalAdverts}</div>
            <div className="text-sm text-gray-600">Total Campaigns</div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Average Campaign Value</span>
            <span className="font-semibold">${client.avgAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Active Campaigns</span>
            <span className="font-semibold text-green-600">{client.activeAdverts}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Categories</span>
            <span className="font-semibold">{client.categoriesArray.length}</span>
          </div>
        </div>

        {/* Categories */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Advertising Categories</h4>
          <div className="flex flex-wrap gap-1">
            {client.categoriesArray.map((category) => (
              <span
                key={category}
                className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs capitalize"
              >
                {category.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </div>

        {/* Recent Campaigns */}
        <div>
          <h4 className="font-medium text-gray-900 mb-2">Recent Campaigns</h4>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {client.campaigns.slice(0, 5).map((campaign, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-gray-600 truncate">
                  {campaign.category.replace(/_/g, ' ')}
                </span>
                <span className="font-medium">${parseFloat(campaign.amount_paid).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-600 transition-colors">
            Contact Client
          </button>
          <button className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors">
            View All Campaigns
          </button>
        </div>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ title, value, icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
};

// Utility Functions
const convertToCSV = (data) => {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => Object.values(row).join(','));
  return [headers, ...rows].join('\n');
};

const downloadCSV = (csv, filename) => {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
};

export default ClientManagement;
