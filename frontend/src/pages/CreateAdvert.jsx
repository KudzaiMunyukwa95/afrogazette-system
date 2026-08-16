import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { advertAPI, ratesAPI } from '../services/api';
import Layout from '../components/Layout';
import ClientAutocomplete from '../components/ClientAutocomplete';
import { useToast } from '../components/Toast';
import {
  ArrowLeft,
  Save,
  Calendar,
  Smartphone,
  Radio,
  Layers,
  CheckCircle,
} from 'lucide-react';

const CATEGORIES = [
  { value: 'automotive', label: 'Automotive' },
  { value: 'bales', label: 'Bales' },
  { value: 'beauty', label: 'Beauty' },
  { value: 'boreholes', label: 'Boreholes' },
  { value: 'building_materials', label: 'Building Materials' },
  { value: 'church', label: 'Church' },
  { value: 'clothing', label: 'Clothing' },
  { value: 'company_registration', label: 'Company Registration' },
  { value: 'education', label: 'Education' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'farming', label: 'Farming' },
  { value: 'fashion', label: 'Fashion' },
  { value: 'finance', label: 'Finance' },
  { value: 'food_beverage', label: 'Food & Beverage' },
  { value: 'health_wellness', label: 'Health & Wellness' },
  { value: 'herbs', label: 'Herbs' },
  { value: 'home_garden', label: 'Home & Garden' },
  { value: 'loans', label: 'Loans' },
  { value: 'motor', label: 'Motor' },
  { value: 'phones', label: 'Phones' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'solar', label: 'Solar' },
  { value: 'sports', label: 'Sports' },
  { value: 'technology', label: 'Technology' },
  { value: 'travel', label: 'Travel' },
  { value: 'vehicle_spares', label: 'Vehicle Spares' },
  { value: 'other', label: 'Other' }
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'ecocash', label: 'Ecocash' },
  { value: 'zipit', label: 'Zipit' },
  { value: 'innbucks', label: 'Innbucks' },
  { value: 'omarimoney', label: 'Omari' },
  { value: 'bank_transfer', label: 'Bank Transfer' }
];

// Fallback if /api/rates hasn't loaded yet — mirrors backend/src/config/ratePolicy.js.
// Kept in sync manually; the live rate card always wins once it loads.
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

const CreateAdvert = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const [flights, setFlights] = useState(FALLBACK_FLIGHTS);
  const [prices, setPrices] = useState(FALLBACK_PRICES);
  const [bothPrices, setBothPrices] = useState(FALLBACK_BOTH);

  const prefill = location.state?.prefill;

  const [formData, setFormData] = useState({
    clientId: null,
    clientName: prefill?.clientName || '',
    category: prefill?.category || '',
    caption: '',
    adContent: prefill?.adContent || '',
    destinationType: 'groups', // 'groups' | 'channel' | 'both'
    flightKey: 'daily',
    daysPaid: 1,
    paymentDate: '',
    paymentMethod: 'cash',
    amountPaid: '',
    startDate: '',
    discountReason: ''
  });

  const [amountTouched, setAmountTouched] = useState(false);

  useEffect(() => {
    if (prefill) {
      // Clear the router state so a refresh/back doesn't silently re-apply
      // stale prefill data over whatever the rep has since typed.
      window.history.replaceState({}, document.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    ratesAPI.get()
      .then(res => {
        const { flights: f, prices: p, bothPrices: b } = res.data.data;
        if (f) setFlights(f);
        if (p) setPrices(p);
        if (b) setBothPrices(b);
      })
      .catch(() => {
        // Silent — fallback constants above keep the form usable even if
        // the rates endpoint is briefly unreachable.
      });
  }, []);

  // Suggested price for the current destination + flight selection, at the
  // flight's own standard day count.
  const suggestedAmount = () => {
    const key = formData.flightKey;
    if (formData.destinationType === 'both') return bothPrices[key] ?? '';
    const table = prices[formData.destinationType] || prices.groups;
    return table[key] ?? '';
  };

  // Fair asking price for ANY day count, not just the three standard flights
  // — mirrors suggestedPriceForDays() in backend/src/config/ratePolicy.js so
  // a rep who changes days sees the same number the server will check
  // against. Interpolates between the flights' own prices; extrapolates past
  // the last flight using the rate implied by its last two anchors.
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

  const suggested = suggestedPriceForDays(formData.destinationType, formData.daysPaid);
  const paidAmount = parseFloat(formData.amountPaid) || 0;
  const isDiscounted = suggested != null && paidAmount > 0 && paidAmount < suggested - 0.01;

  // Auto-fill days + amount whenever destination or flight changes, unless
  // the rep has manually edited the amount (e.g. a fill-rate discount) —
  // in that case we don't clobber their edit on an unrelated change.
  useEffect(() => {
    const flight = flights.find(f => f.key === formData.flightKey);
    setFormData(prev => ({
      ...prev,
      daysPaid: flight ? flight.days : prev.daysPaid,
      amountPaid: amountTouched ? prev.amountPaid : String(suggestedAmount())
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.destinationType, formData.flightKey, flights, prices, bothPrices]);

  // If the rep edits days directly (a negotiated custom length) and hasn't
  // separately touched the amount, follow it with the fair suggested price
  // for that day count instead of leaving the old flight's price stale.
  const handleDaysChange = (e) => {
    const value = e.target.value;
    setFormData(prev => {
      const next = { ...prev, daysPaid: value };
      if (!amountTouched) {
        const price = suggestedPriceForDays(prev.destinationType, value);
        if (price != null) next.amountPaid = String(price);
      }
      return next;
    });
  };

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'amountPaid') setAmountTouched(true);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Splits a combined "Both" price across the two component adverts,
  // proportional to each platform's own standalone price for that flight —
  // keeps per-platform revenue reporting honest without hardcoding a split
  // per tier. E.g. monthly: groups $65 + channel $70 = $135 standalone,
  // bundle is $127, so groups gets 65/135 of $127 and channel gets 70/135.
  const splitBothAmount = (totalAmount) => {
    const key = formData.flightKey;
    const groupsSolo = prices.groups?.[key] || 1;
    const channelSolo = prices.channel?.[key] || 1;
    const sum = groupsSolo + channelSolo;
    const total = parseFloat(totalAmount) || 0;
    const groupsShare = (total * groupsSolo) / sum;
    return {
      groups: groupsShare.toFixed(2),
      channel: (total - groupsShare).toFixed(2)
    };
  };

  const buildPayload = (destinationType, amountPaid, bundleRef) => ({
    clientId: formData.clientId,
    clientName: formData.clientName,
    category: formData.category,
    caption: formData.caption,
    adContent: formData.adContent,
    destinationType,
    daysPaid: formData.daysPaid,
    paymentDate: formData.paymentDate,
    amountPaid,
    startDate: formData.startDate,
    paymentMethod: formData.paymentMethod,
    discountReason: formData.discountReason,
    ...(bundleRef ? { bundleRef } : {})
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const today = getTodayDate();
    if (formData.startDate < today) {
      toast.error('Start date cannot be in the past');
      return;
    }

    if (!formData.clientId && !formData.clientName) {
      toast.error('Please select or enter a client');
      return;
    }

    const trimmedCaption = (formData.caption || '').trim();
    if (trimmedCaption.length < 10 || trimmedCaption.length > 200) {
      toast.error('Description must be between 10 and 200 characters');
      return;
    }

    if (!formData.amountPaid || parseFloat(formData.amountPaid) <= 0) {
      toast.error('Amount paid is required');
      return;
    }

    if (isDiscounted && !formData.discountReason.trim()) {
      toast.error(`Add a reason — this is below the suggested $${suggested.toFixed(2)} for ${formData.daysPaid} day(s)`);
      return;
    }

    try {
      setLoading(true);

      if (formData.destinationType === 'both') {
        const bundleRef = `bundle-${Date.now()}`;
        const split = splitBothAmount(formData.amountPaid);
        await advertAPI.create(buildPayload('groups', split.groups, bundleRef));
        await advertAPI.create(buildPayload('channel', split.channel, bundleRef));
      } else {
        await advertAPI.create(buildPayload(formData.destinationType, formData.amountPaid));
      }

      toast.success('Advert created successfully');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating advert:', error);
      toast.error(error.response?.data?.message || 'Failed to create advert');
    } finally {
      setLoading(false);
    }
  };

  const perUnit = (amount, flightKey) => {
    const flight = flights.find(f => f.key === flightKey);
    const posts = flight?.days || 1;
    const val = parseFloat(amount);
    if (!val || !posts) return null;
    return (val / posts).toFixed(2);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-4 md:py-8">
        <div className="max-w-4xl mx-auto mobile-container">
          {/* Header */}
          <div className="flex items-center mb-6">
            <button
              onClick={() => navigate(-1)}
              className="mr-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="h-6 w-6 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">New Advert</h1>
              <p className="text-sm text-gray-500">Create a new advertising campaign</p>
            </div>
          </div>

          {prefill && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800">
              Ad content carried over from Check Advert — category and content are pre-filled below.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Step 1: Destination */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-sm">1</div>
                <h2 className="text-lg font-semibold text-gray-900">Where to post?</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { id: 'groups', label: 'WhatsApp Groups', desc: 'Post to all 300 groups', icon: Smartphone },
                  { id: 'channel', label: 'WhatsApp Channel', desc: 'Broadcast to the 40k channel', icon: Radio },
                  { id: 'both', label: 'Both', desc: 'Groups + channel, one price', icon: Layers }
                ].map(({ id, label, desc, icon: Icon }) => (
                  <label
                    key={id}
                    className={`
                      flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 tap-target
                      ${formData.destinationType === id
                        ? 'border-red-500 bg-red-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                      }
                    `}
                  >
                    <input
                      type="radio"
                      name="destinationType"
                      value={id}
                      checked={formData.destinationType === id}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <div className="flex items-start space-x-3">
                      <Icon className={`h-5 w-5 mt-1 ${formData.destinationType === id ? 'text-red-600' : 'text-gray-400'}`} />
                      <div>
                        <div className={`font-semibold text-sm mb-1 ${formData.destinationType === id ? 'text-red-900' : 'text-gray-900'}`}>
                          {label}
                        </div>
                        <div className={`text-xs ${formData.destinationType === id ? 'text-red-700' : 'text-gray-600'}`}>
                          {desc}
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Step 2: Flight length */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-sm">2</div>
                <h2 className="text-lg font-semibold text-gray-900">How long?</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {flights.map((flight) => {
                  const amount = formData.destinationType === 'both'
                    ? bothPrices[flight.key]
                    : (prices[formData.destinationType] || prices.groups)[flight.key];
                  const per = perUnit(amount, flight.key);
                  const selected = formData.flightKey === flight.key;
                  return (
                    <label
                      key={flight.key}
                      className={`
                        relative flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 tap-target
                        ${selected ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'}
                      `}
                    >
                      <input
                        type="radio"
                        name="flightKey"
                        value={flight.key}
                        checked={selected}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <span className={`text-sm font-semibold ${selected ? 'text-red-900' : 'text-gray-900'}`}>
                        {flight.label}
                      </span>
                      <span className={`text-xs mt-0.5 ${selected ? 'text-red-700' : 'text-gray-500'}`}>
                        {flight.days} post{flight.days > 1 ? 's' : ''}
                      </span>
                      {amount != null && (
                        <span className={`text-lg font-bold mt-2 ${selected ? 'text-red-600' : 'text-gray-900'}`}>
                          ${amount}
                          {per && flight.days > 1 && (
                            <span className="text-xs font-normal text-gray-500 ml-1">(${per} ea)</span>
                          )}
                        </span>
                      )}
                      {selected && <CheckCircle className="absolute top-3 right-3 h-4 w-4 text-red-600" />}
                    </label>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Price auto-fills below from the current rate card. Edit it directly for a negotiated or fill-rate discount — it's reviewed at approval either way.
              </p>
            </div>

            {/* Step 3: Advert Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-sm">3</div>
                <h2 className="text-lg font-semibold text-gray-900">Advert Details</h2>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Client Name *</label>
                    <ClientAutocomplete
                      value={formData.clientName}
                      onChange={(value) => setFormData(prev => ({ ...prev, clientName: value, clientId: null }))}
                      onSelect={(client) => setFormData(prev => ({
                        ...prev,
                        clientName: client ? client.name : '',
                        clientId: client ? client.id : null
                      }))}
                      error={!formData.clientName && 'Client name is required'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      required
                      className="input-mobile w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                    >
                      <option value="">Select category</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Description / Advert Content <span className="text-red-500">*</span>
                    </label>
                    <span className={`text-xs font-medium ${
                      formData.caption.trim().length < 10
                        ? 'text-gray-400'
                        : formData.caption.length > 200
                          ? 'text-red-600'
                          : 'text-green-600'
                    }`}>
                      {formData.caption.length}/200
                    </span>
                  </div>
                  <textarea
                    name="caption"
                    value={formData.caption}
                    onChange={handleChange}
                    required
                    rows={4}
                    minLength={10}
                    maxLength={200}
                    placeholder="Describe the ad clearly, e.g. 'Sponsored post – Health & Wellness category, 1-day placement on WhatsApp groups'"
                    className="input-mobile w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Required. 10–200 characters. This appears on the client&apos;s invoice — be specific.
                  </p>
                </div>

                <div>
                  <div className="flex items-baseline justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Ad Content <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <span className="text-xs font-medium text-gray-400">
                      {formData.adContent.length}/2000
                    </span>
                  </div>
                  <textarea
                    name="adContent"
                    value={formData.adContent}
                    onChange={handleChange}
                    rows={6}
                    maxLength={2000}
                    placeholder="Paste the actual creative text the client wants posted to groups/channel."
                    className="input-mobile w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    The real ad copy that goes to groups/channel — separate from the invoice description above. Not sure it clears policy?{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/advert-tools')}
                      className="text-red-600 hover:text-red-700 font-medium underline"
                    >
                      Check it first
                    </button>.
                  </p>
                </div>
              </div>
            </div>

            {/* Step 4: Payment & Schedule */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-sm">4</div>
                <h2 className="text-lg font-semibold text-gray-900">Payment & Schedule</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Days / Posts Paid
                    <span className="ml-1 text-xs font-normal text-gray-400">(edit for a custom length)</span>
                  </label>
                  <input
                    type="number"
                    name="daysPaid"
                    value={formData.daysPaid}
                    onChange={handleDaysChange}
                    required
                    min="1"
                    className="input-mobile w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount Paid ($) *</label>
                  <input
                    type="number"
                    name="amountPaid"
                    value={formData.amountPaid}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    className="input-mobile w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  {suggested != null && (
                    <p className="text-xs text-gray-500 mt-1">
                      Suggested for {formData.daysPaid} day{Number(formData.daysPaid) > 1 ? 's' : ''}: ${suggested.toFixed(2)}
                    </p>
                  )}
                  {formData.destinationType === 'both' && formData.amountPaid && (
                    <p className="text-xs text-gray-500 mt-1">
                      Splits as ${splitBothAmount(formData.amountPaid).groups} groups / ${splitBothAmount(formData.amountPaid).channel} channel for reporting.
                    </p>
                  )}
                </div>

                {isDiscounted && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reason for discount <span className="text-red-500">*</span>
                      <span className="ml-1 text-xs font-normal text-gray-400">
                        (below the ${suggested.toFixed(2)} suggested price)
                      </span>
                    </label>
                    <input
                      type="text"
                      name="discountReason"
                      value={formData.discountReason}
                      onChange={handleChange}
                      required
                      maxLength={300}
                      placeholder="e.g. repeat client, fill-rate discount, price-matched a competitor"
                      className="input-mobile w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                    min={getTodayDate()}
                    className="input-mobile w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date *</label>
                  <input
                    type="date"
                    name="paymentDate"
                    value={formData.paymentDate}
                    onChange={handleChange}
                    required
                    className="input-mobile w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleChange}
                    required
                    className="input-mobile w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                  >
                    {PAYMENT_METHODS.map(method => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="sticky bottom-4 z-10">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center px-6 py-4 border border-transparent rounded-xl shadow-lg text-base font-bold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 btn-touch transition-transform active:scale-95"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                ) : (
                  <Save className="h-5 w-5 mr-2" />
                )}
                {formData.destinationType === 'both' ? 'Create Both Adverts' : 'Create Advert'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </Layout>
  );
};

export default CreateAdvert;
