import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { invoiceAPI } from '../services/api';
import { FileText, Download, Search, Calendar } from 'lucide-react';

const MyInvoices = () => {
    const { user } = useAuth();
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            const response = await invoiceAPI.getAll();
            setInvoices(response.data.data);
        } catch (error) {
            console.error('Error fetching invoices:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (id, invoiceNumber) => {
        try {
            const response = await invoiceAPI.download(id);

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `invoice-${invoiceNumber}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Error downloading invoice:', error);
            alert('Failed to download invoice');
        }
    };

    const filteredInvoices = invoices.filter(invoice =>
        invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.client_name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Layout>
            <div className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">My Invoices</h1>
                            <p className="mt-1 text-gray-500">View and download your commission invoices</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search invoices..."
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
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
                                            Invoice #
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Date
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Client
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Amount
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Commission
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Action
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredInvoices.map((invoice) => (
                                        <tr key={invoice.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <FileText className="h-5 w-5 text-gray-400 mr-2" />
                                                    <span className="font-medium text-gray-900">{invoice.invoice_number}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(invoice.generated_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {invoice.client_name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                ${Number(invoice.amount).toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                                ${Number(invoice.commission_amount).toFixed(2)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                    {invoice.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button
                                                    onClick={() => handleDownload(invoice.id, invoice.invoice_number)}
                                                    className="text-red-600 hover:text-red-900 flex items-center justify-end ml-auto"
                                                >
                                                    <Download className="h-4 w-4 mr-1" />
                                                    Download
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredInvoices.length === 0 && (
                                <div className="text-center py-12">
                                    <FileText className="mx-auto h-12 w-12 text-gray-300" />
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices found</h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Invoices are generated automatically when adverts are approved.
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

export default MyInvoices;
