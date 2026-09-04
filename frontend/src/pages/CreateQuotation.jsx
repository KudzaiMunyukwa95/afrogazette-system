import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { quotationAPI, ratesAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { FileText, Plus, Trash2, Sparkles, Download, Loader2 } from 'lucide-react';

// Mirrors backend/src/config/ratePolicy.js — same fallback pattern used in
// CreateAdvert.jsx, kept in sync manually; the live rate card always wins.
const FALLBACK_FLIGHTS = [
  { key: 'daily', label: 'Daily', days: 1 },
  { key: 'weekly', label: 'Weekly', days: 5 },
  { key: 'monthly', label: 'Monthly', days: 25 }
];
const FALLBACK_PRICES = {
  groups: { daily: 6, weekly: 28, monthly: 65 },
  channel: { daily: 6, weekly: 28, monthly: 70 }
};
const FALLBACK_BOTH = { daily: 10, weekly: 50, monthly: 127 };

const getDefaultValidUntil = () => {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split('T')[0];
};

const emptyItem = () => ({ description: '', amount: '' });

const CreateQuotation = () => {
  const toast = useToast();
  const [generating, setGenerating] = useState(false);

  const [flights, setFlights] = useState(FALLBACK_FLIGHTS);
  const [prices, setPrices] = useState(FALLBACK_PRICES);
  const [bothPrices, setBothPrices] = useState(FALLBACK_BOTH);

  const [clientName, setClientName] = useState('');
  const [clientCompany, setClientCompany] = useState('');
  const [clientContact, setClientContact] = useState('');
  const [validUntil, setValidUntil] = useState(getDefaultValidUntil());
  const [items, setItems] = useState([emptyItem()]);
  const [notes, setNotes] = useState('');

  const [helperDestination, setHelperDestination] = useState('groups');
  const [helperDays, setHelperDays] = useState(5);

  useEffect(() => {
    ratesAPI.get()
      .then(res => {
        const { flights: f, prices: p, bothPrices: b } = res.data.data;
        if (f) setFlights(f);
        if (p) setPrices(p);
        if (b) setBothPrices(b);
      })
      .catch(() => {
        // Silent — fallback constants above keep the form usable.
      });
  }, []);

  // Same anchor-interpolation as CreateAdvert.jsx / ratePolicy.js, so a
  // suggested quote line matches what the actual booking would suggest.
  const suggestedPriceForDays = (destinationType, daysPaid) => {
    const days = parseInt(daysPaid, 10) || 0;
    const table = destinationType === 'both' ? bothPrices : (prices[destinationType] || prices.groups);
    const anchors = flights
      .map(f => ({ days: f.days, price: table[f.key] }))
      .filter(a => a.price != null)
      .sort((a, b) => a.days - b.days);
    if (anchors.length === 0) return null;

    const first = anchors[0];
    const last = anchors[anchors.length - 1];
    if (days <= first.days) return first.price;
    if (days >= last.days) {
      const prev = anchors[anchors.length - 2] || first;
      const perDay = prev.days === last.days ? 0 : (last.price - prev.price) / (last.days - prev.days);
      return +(last.price + perDay * (days - last.days)).toFixed(2);
    }
    for (let i = 0; i < anchors.length - 1; i++) {
      const lo = anchors[i];
      const hi = anchors[i + 1];
      if (days >= lo.days && days <= hi.days) {
        const progress = (days - lo.days) / (hi.days - lo.days);
        return +(lo.price + progress * (hi.price - lo.price)).toFixed(2);
      }
    }
    return first.price;
  };

  const helperSuggested = suggestedPriceForDays(helperDestination, helperDays);

  const addSuggestedLine = () => {
    const destLabel = helperDestination === 'both' ? 'Groups + Channel' : helperDestination === 'channel' ? 'Channel' : 'Groups';
    const description = `${destLabel} advert — ${helperDays} day${Number(helperDays) > 1 ? 's' : ''}`;
    setItems(prev => {
      const withoutBlank = prev.filter(i => i.description || i.amount);
      return [...withoutBlank, { description, amount: helperSuggested != null ? String(helperSuggested) : '' }];
    });
  };

  const updateItem = (index, field, value) => {
    setItems(prev => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const addBlankItem = () => setItems(prev => [...prev, emptyItem()]);

  const removeItem = (index) => setItems(prev => prev.filter((_, i) => i !== index));

  const total = items.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);

  const handleGenerate = async (e) => {
    e.preventDefault();

    if (!clientName.trim()) {
      toast.error('Client name is required');
      return;
    }
    const cleanItems = items
      .map(i => ({ description: i.description.trim(), amount: parseFloat(i.amount) }))
      .filter(i => i.description && i.amount > 0);
    if (cleanItems.length === 0) {
      toast.error('Add at least one line item with a description and amount');
      return;
    }

    try {
      setGenerating(true);
      const response = await quotationAPI.generate({
        clientName: clientName.trim(),
        clientCompany: clientCompany.trim(),
        clientContact: clientContact.trim(),
        validUntil: validUntil || null,
        items: cleanItems,
        notes: notes.trim()
      });

      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `quotation-${clientName.trim().replace(/\s+/g, '-').toLowerCase()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Quotation generated');
    } catch (error) {
      console.error('Error generating quotation:', error);
      // Errors come back as a JSON blob too (responseType: 'blob' applies to
      // every response, not just successful ones), so it has to be read back
      // out as text before the real message can be shown.
      let message = 'Failed to generate quotation';
      if (error.response?.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          message = JSON.parse(text)?.message || message;
        } catch {
          // fall through to the generic message
        }
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      }
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="px-4 py-4 max-w-4xl mx-auto">
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-red-500" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Create Quotation</h1>
                <p className="text-sm text-gray-600">Generate a branded PDF quote for a prospective client — nothing is saved.</p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleGenerate} className="max-w-4xl mx-auto p-4 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Client</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Client Name *</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="input-mobile w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="e.g. Tendai Moyo"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Company (optional)</label>
                <input
                  type="text"
                  value={clientCompany}
                  onChange={(e) => setClientCompany(e.target.value)}
                  className="input-mobile w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="e.g. Green World Farms"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone / Email (optional)</label>
                <input
                  type="text"
                  value={clientContact}
                  onChange={(e) => setClientContact(e.target.value)}
                  className="input-mobile w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="077 123 4567"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Valid Until</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="input-mobile w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-red-500" />
              <h2 className="text-sm font-semibold text-gray-900">Rate Card Helper</h2>
            </div>
            <p className="text-xs text-gray-500">Pick a destination and day count to add a line at the current suggested price.</p>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Destination</label>
                <select
                  value={helperDestination}
                  onChange={(e) => setHelperDestination(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="groups">Groups</option>
                  <option value="channel">Channel</option>
                  <option value="both">Groups + Channel</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Days</label>
                <input
                  type="number"
                  min="1"
                  value={helperDays}
                  onChange={(e) => setHelperDays(e.target.value)}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
              <div className="text-sm text-gray-600">
                Suggested: <span className="font-semibold text-gray-900">{helperSuggested != null ? `$${helperSuggested.toFixed(2)}` : '—'}</span>
              </div>
              <button
                type="button"
                onClick={addSuggestedLine}
                className="ml-auto inline-flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors"
              >
                <Plus className="h-4 w-4" /> Add as line
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Line Items</h2>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={index} className="flex items-start gap-2">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    className="input-mobile flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Description, e.g. Groups advert — 5 days"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.amount}
                    onChange={(e) => updateItem(index, 'amount', e.target.value)}
                    className="input-mobile w-28 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Amount"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Remove line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addBlankItem}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700"
            >
              <Plus className="h-4 w-4" /> Add blank line
            </button>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <div className="text-right">
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-2xl font-bold text-gray-900">${total.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="input-mobile w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder="Anything else the client should know — payment terms, what's included, etc."
            />
          </div>

          <button
            type="submit"
            disabled={generating}
            className="btn-touch w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Generating…
              </>
            ) : (
              <>
                <Download className="h-5 w-5" /> Generate Quotation
              </>
            )}
          </button>
        </form>
      </div>
    </Layout>
  );
};

export default CreateQuotation;
