import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { invoiceAPI } from '../services/api';
import { FileText, Download, Search, Calendar, CheckCircle } from 'lucide-react';

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
            <div className="min-h-screen bg-gray-50 py-4 md:py-8">
                <div className="max-w-7xl mx-auto mobile-container">
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                        <div>
                            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Invoices</h1>
                            <p className="mt-1 text-sm md:text-base text-gray-500">View and download your commission invoices</p>
                        </div>
                        <div className="w-full md:w-auto">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search invoices..."
                                    className="input-mobile pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-red-500 focus:border-red-500 w-full md:w-64"
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
                        <>
                            {/* Desktop Table View */}
                            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <div className="overflow-x-auto">
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
                                </div>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-4">
                                {filteredInvoices.map((invoice) => (
                                    <div key={invoice.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 card-mobile">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center">
                                                <FileText className="h-5 w-5 text-gray-400 mr-2" />
                                                <span className="font-semibold text-gray-900">{invoice.invoice_number}</span>
                                            </div>
                                            <span className="px-2 py-0.5 inline-flex text-xs font-semibold rounded-full bg-green-100 text-green-800 capitalize">
                                                {invoice.status}
                                            </span>
                                        </div>

                                        <div className="mb-3">
                                            <div className="text-sm text-gray-900 font-medium mb-1">{invoice.client_name}</div>
                                            <div className="flex items-center text-xs text-gray-500">
                                                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                                                {new Date(invoice.generated_at).toLocaleDateString()}
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center py-3 border-t border-b border-gray-50 mb-3">
                                            <div>
                                                <span className="text-xs text-gray-500 block">Amount</span>
                                                <span className="text-lg font-bold text-gray-900">${Number(invoice.amount).toFixed(2)}</span>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xs text-gray-500 block">Commission</span>
                                                <span className="text-sm font-bold text-green-600">+${Number(invoice.commission_amount).toFixed(2)}</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleDownload(invoice.id, invoice.invoice_number)}
                                            className="w-full flex justify-center items-center px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 btn-touch"
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            Download PDF
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {filteredInvoices.length === 0 && (
                                <div className="text-center py-12">
                                    <FileText className="mx-auto h-12 w-12 text-gray-300" />
                                    <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices found</h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        Invoices are generated automatically when adverts are approved.
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default MyInvoices;
