import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Building2 } from 'lucide-react';
import api from '../services/api';

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const titleCase = (value) => {
  if (!value) return '—';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
};

const money = (amount, currency) => {
  const n = Number(amount || 0);
  return `${currency || 'USD'} ${n.toFixed(2)}`;
};

const VerifyInvoice = () => {
  const { invoiceNumber } = useParams();
  const [state, setState] = useState({ loading: true, invoice: null, company: null, error: null });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await api.get(`/invoices/verify/${encodeURIComponent(invoiceNumber)}`);
        if (!cancelled) {
          setState({ loading: false, invoice: res.data.invoice, company: res.data.company, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          const message = err.response?.status === 404
            ? 'We couldn\'t find an invoice with this number.'
            : 'Something went wrong loading this invoice.';
          setState({ loading: false, invoice: null, company: null, error: message });
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [invoiceNumber]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center mobile-container py-8 md:py-12">
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-transparent"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-red-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl md:rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="bg-black px-6 py-6 md:px-8 md:py-8 text-center">
            <div className="flex justify-center mb-3 md:mb-4">
              <img src="/logo.svg" alt="AfroGazette" className="h-8 md:h-10 w-auto" />
            </div>
            <p className="text-gray-300 text-xs md:text-sm">Invoice Verification</p>
          </div>

          <div className="px-6 py-6 md:px-8 md:py-8">
            {state.loading && (
              <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin mb-3" />
                <p className="text-sm">Verifying invoice…</p>
              </div>
            )}

            {!state.loading && state.error && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <XCircle className="h-12 w-12 text-red-500 mb-4" />
                <h2 className="text-lg font-bold text-gray-900 mb-1">Not Verified</h2>
                <p className="text-sm text-gray-600">{state.error}</p>
              </div>
            )}

            {!state.loading && state.invoice && (
              <>
                <div className="flex flex-col items-center text-center mb-6">
                  <CheckCircle2 className="h-12 w-12 text-green-600 mb-3" />
                  <h2 className="text-lg font-bold text-gray-900">Payment Verified</h2>
                  <p className="text-xs text-gray-500 mt-1">
                    This invoice was issued by {state.company.legalName}
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl divide-y divide-gray-200 mb-6">
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs font-medium text-gray-500">Invoice No.</span>
                    <span className="text-sm font-semibold text-gray-900">{state.invoice.invoiceNumber}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs font-medium text-gray-500">Billed To</span>
                    <span className="text-sm font-semibold text-gray-900 text-right">{state.invoice.clientName}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs font-medium text-gray-500">Category</span>
                    <span className="text-sm text-gray-900">{titleCase(state.invoice.category)}</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs font-medium text-gray-500">Paid On</span>
                    <span className="text-sm text-gray-900">{formatDate(state.invoice.paymentDate)}</span>
                  </div>
                  {state.invoice.paymentMethod && (
                    <div className="flex items-center justify-between px-4 py-3">
                      <span className="text-xs font-medium text-gray-500">Method</span>
                      <span className="text-sm text-gray-900">{titleCase(state.invoice.paymentMethod)}</span>
                    </div>
                  )}
                </div>

                <div className="bg-red-500 rounded-xl px-4 py-4 flex items-center justify-between mb-6">
                  <span className="text-white text-sm font-semibold">Total Paid</span>
                  <span className="text-white text-xl font-bold">
                    {money(state.invoice.amount, state.invoice.currency)}
                  </span>
                </div>

                <div className="flex items-start gap-2 text-gray-500">
                  <Building2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <p className="text-xs leading-relaxed">
                    {state.company.legalName} • Reg. No. {state.company.registrationNumber} • TIN {state.company.tin}
                    <br />
                    {state.company.website} • {state.company.email}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyInvoice;
