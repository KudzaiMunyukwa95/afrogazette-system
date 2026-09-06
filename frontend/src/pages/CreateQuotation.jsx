import React, { useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import { clientAPI, quotationAPI, ratesAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { FileText, Plus, Trash2, Sparkles, Download, Loader2, Search, X, AlertTriangle, Building2 } from 'lucide-react';

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

const emptyBilling = () => ({
  addressLine1: '', addressLine2: '', city: '', country: 'Zimbabwe', tin: '', vatNumber: ''
});

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

  // Billing details are what actually make the PDF presentable to a
  // company's finance office. For a client we already hold a record for they
  // come from that record (so the quote and the invoice that follows it
  // can't disagree); for a prospect who isn't in the system yet they're typed
  // here and used for this one document only — a quotation is pre-sale, so it
  // deliberately doesn't create a client record.
  const [billing, setBilling] = useState(emptyBilling());
  const [linkedClient, setLinkedClient] = useState(null); // full record, or null
  const [clientQuery, setClientQuery] = useState('');
  const [clientResults, setClientResults] = useState([]);
  const [searchingClients, setSearchingClients] = useState(false);
  const [showClientResults, setShowClientResults] = useState(false);
  const searchWrapperRef = useRef(null);

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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(event.target)) {
        setShowClientResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Deliberately not ClientAutocomplete: that component's job is to force a
  // booking onto a real client record, creating one (and demanding a phone
  // number) when there's no match. A quotation must stay usable for a
  // prospect who may never become a client, so this is lookup-only — no
  // match simply means "type their details in below."
  const runClientSearch = async (term) => {
    if (term.trim().length < 2) {
      setClientResults([]);
      setShowClientResults(false);
      return;
    }
    try {
      setSearchingClients(true);
      const response = await clientAPI.search(term.trim());
      setClientResults(response.data.data.clients || []);
      setShowClientResults(true);
    } catch (error) {
      console.error('Error searching clients:', error);
    } finally {
      setSearchingClients(false);
    }
  };

  const selectClient = async (client) => {
    setShowClientResults(false);
    setClientQuery('');
    try {
      // Search results carry only name/company/contact — the address and tax
      // numbers that make the quote presentable need the full record.
      const response = await clientAPI.getById(client.id);
      const full = response.data.data.client;
      setLinkedClient(full);
      setClientName(full.name || '');
      setClientCompany(full.company || '');
      setClientContact(full.phone || full.email || '');
      setBilling({
        addressLine1: full.address_line1 || '',
        addressLine2: full.address_line2 || '',
        city: full.city || '',
        country: full.country || 'Zimbabwe',
        tin: full.tin || '',
        vatNumber: full.vat_number || ''
      });
    } catch (error) {
      console.error('Error loading client:', error);
      toast.error('Could not load that client’s details');
    }
  };

  const unlinkClient = () => {
    setLinkedClient(null);
    setClientName('');
    setClientCompany('');
    setClientContact('');
    setBilling(emptyBilling());
  };

  const updateBilling = (field, value) => setBilling(prev => ({ ...prev, [field]: value }));

  // A quote going to a company with no address on it is the thing this form
  // is here to prevent, so say so before the rep sends it rather than after.
  const missingAddress = !billing.addressLine1.trim() || !billing.city.trim();

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
        clientId: linkedClient?.id || null,
        clientName: clientName.trim(),
        clientCompany: clientCompany.trim(),
        clientContact: clientContact.trim(),
        clientAddressLine1: billing.addressLine1.trim(),
        clientAddressLine2: billing.addressLine2.trim(),
        clientCity: billing.city.trim(),
        clientCountry: billing.country.trim(),
        clientTin: billing.tin.trim(),
        clientVatNumber: billing.vatNumber.trim(),
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

            {linkedClient ? (
              <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Building2 className="h-4 w-4 text-green-700 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-900">
                    Billing to {linkedClient.company || linkedClient.name}'s client record
                  </p>
                  <p className="text-xs text-green-800 mt-0.5">
                    The same details the invoice will bill to. Edits below apply to this quote only.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={unlinkClient}
                  className="p-1 text-green-700 hover:text-green-900"
                  aria-label="Unlink client"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div ref={searchWrapperRef} className="relative">
                <label className="block text-xs font-medium text-gray-600 mb-1">Find an existing client (optional)</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={clientQuery}
                    onChange={(e) => { setClientQuery(e.target.value); runClientSearch(e.target.value); }}
                    onFocus={() => clientResults.length > 0 && setShowClientResults(true)}
                    className="input-mobile w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Search by name, company or phone"
                  />
                  {searchingClients && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Pulls their address and tax numbers so the quote matches the invoice. Quoting a brand-new prospect? Skip this and type their details in below — nothing is saved.
                </p>
                {showClientResults && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {clientResults.length === 0 ? (
                      <p className="px-3 py-3 text-sm text-gray-500">No match — type the client's details in below.</p>
                    ) : clientResults.map(client => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => selectClient(client)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      >
                        <p className="text-sm font-medium text-gray-900">{client.company || client.name}</p>
                        <p className="text-xs text-gray-500">
                          {[client.company ? client.name : null, client.phone].filter(Boolean).join(' • ') || '—'}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

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

            <div className="pt-4 border-t border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Billing Address</h3>
                <span className="text-xs text-gray-500">Printed under “Quoted For”</span>
              </div>

              {missingAddress && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-800">
                    No address on this quote yet. A corporate client's finance office needs one to raise payment —
                    {linkedClient
                      ? ' this client has none on file, so fill it in here and add it to their record under Clients.'
                      : ' fill it in below.'}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Address Line 1</label>
                  <input
                    type="text"
                    value={billing.addressLine1}
                    onChange={(e) => updateBilling('addressLine1', e.target.value)}
                    className="input-mobile w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="e.g. POSB House, 3rd Floor"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Address Line 2 (optional)</label>
                  <input
                    type="text"
                    value={billing.addressLine2}
                    onChange={(e) => updateBilling('addressLine2', e.target.value)}
                    className="input-mobile w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="e.g. 11 Nelson Mandela Avenue"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                  <input
                    type="text"
                    value={billing.city}
                    onChange={(e) => updateBilling('city', e.target.value)}
                    className="input-mobile w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Harare"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
                  <input
                    type="text"
                    value={billing.country}
                    onChange={(e) => updateBilling('country', e.target.value)}
                    className="input-mobile w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Zimbabwe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Client TIN (optional)</label>
                  <input
                    type="text"
                    value={billing.tin}
                    onChange={(e) => updateBilling('tin', e.target.value)}
                    className="input-mobile w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Their tax number"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Client VAT No (optional)</label>
                  <input
                    type="text"
                    value={billing.vatNumber}
                    onChange={(e) => updateBilling('vatNumber', e.target.value)}
                    className="input-mobile w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="If VAT-registered"
                  />
                </div>
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
