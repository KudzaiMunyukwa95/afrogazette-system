import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { advertAPI } from '../services/api';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Sparkles,
  Search,
  Copy,
  ArrowRight,
  RefreshCw
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

const VERDICT_META = {
  accept: {
    label: 'Accepted',
    sub: "This advert clears the policy — it's safe to book as-is.",
    icon: ShieldCheck,
    className: 'bg-green-50 border-green-200 text-green-800',
    iconClassName: 'text-green-600'
  },
  reject: {
    label: 'Rejected',
    sub: 'This advert matches a pattern that has already gotten us banned once. Do not book it.',
    icon: ShieldAlert,
    className: 'bg-red-50 border-red-200 text-red-800',
    iconClassName: 'text-red-600'
  },
  tweak: {
    label: 'Needs a tweak',
    sub: 'Close, but something needs clarifying before this should go out.',
    icon: ShieldQuestion,
    className: 'bg-amber-50 border-amber-200 text-amber-800',
    iconClassName: 'text-amber-600'
  }
};

const CheckAdvert = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({ category: '', clientName: '', adContent: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCheck = async (e) => {
    e.preventDefault();

    const trimmed = form.adContent.trim();
    if (trimmed.length < 10 || trimmed.length > 2000) {
      toast.warning('Ad content must be between 10 and 2000 characters');
      return;
    }
    if (!form.category) {
      toast.warning('Please select a category');
      return;
    }

    setChecking(true);
    setResult(null);
    try {
      const response = await advertAPI.checkEligibility({
        category: form.category,
        clientName: form.clientName,
        adContent: trimmed
      });
      setResult(response.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error checking advert eligibility');
    } finally {
      setChecking(false);
    }
  };

  const handleCopyRewrite = async () => {
    if (!result?.rewrite) return;
    try {
      await navigator.clipboard.writeText(result.rewrite);
      toast.success('Rewrite copied to clipboard');
    } catch {
      toast.error('Could not copy — select and copy manually');
    }
  };

  const handleContinueToBooking = () => {
    navigate('/create-advert', {
      state: {
        prefill: {
          category: form.category,
          clientName: form.clientName,
          adContent: result?.rewrite || form.adContent
        }
      }
    });
  };

  const meta = result ? (VERDICT_META[result.verdict] || VERDICT_META.tweak) : null;
  const Icon = meta?.icon;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-4 md:py-8">
        <div className="max-w-3xl mx-auto mobile-container space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Search className="h-6 w-6 mr-2 text-red-600" />
              Check Advert Eligibility
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Test the actual ad copy against our content policy before booking — no advert is created here.
              If it's accepted, use the standardized rewrite to keep our ads consistent.
            </p>
          </div>

          <form onSubmit={handleCheck} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  required
                  className="input-mobile w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-white"
                >
                  <option value="">Select category</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Name <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  name="clientName"
                  value={form.clientName}
                  onChange={handleChange}
                  placeholder="For context only — not saved"
                  className="input-mobile w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Ad Content *</label>
                <span className="text-xs font-medium text-gray-400">{form.adContent.length}/2000</span>
              </div>
              <textarea
                name="adContent"
                value={form.adContent}
                onChange={handleChange}
                required
                rows={8}
                maxLength={2000}
                placeholder="Paste the exact creative text the client wants posted to groups/channel."
                className="input-mobile w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>

            <button
              type="submit"
              disabled={checking}
              className="w-full flex justify-center items-center px-6 py-3 border border-transparent rounded-xl shadow-sm text-base font-bold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 btn-touch"
            >
              {checking ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Checking...
                </>
              ) : (
                'Check Eligibility'
              )}
            </button>
          </form>

          {result && (
            <div className={`rounded-xl border p-5 space-y-4 ${meta.className}`}>
              <div className="flex items-start">
                <Icon className={`h-8 w-8 mr-3 flex-shrink-0 ${meta.iconClassName}`} />
                <div>
                  <h2 className="text-xl font-bold">{meta.label}</h2>
                  <p className="text-sm mt-0.5">{meta.sub}</p>
                </div>
              </div>

              <div className="bg-white bg-opacity-60 rounded-lg p-3">
                <p className="text-sm leading-relaxed">{result.reasoning}</p>
              </div>

              {result.flags && result.flags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {result.flags.map((flag, i) => (
                    <span key={i} className="px-2 py-0.5 bg-white bg-opacity-70 rounded-full text-xs font-medium">
                      {flag}
                    </span>
                  ))}
                </div>
              )}

              {result.rewrite && (
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center text-xs font-bold text-gray-500 uppercase tracking-wide">
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      Standardized rewrite
                    </div>
                    <button
                      onClick={handleCopyRewrite}
                      type="button"
                      className="flex items-center text-xs font-medium text-gray-600 hover:text-gray-900"
                    >
                      <Copy className="h-3.5 w-3.5 mr-1" />
                      Copy
                    </button>
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{result.rewrite}</p>
                </div>
              )}

              {result.verdict !== 'reject' && (
                <button
                  onClick={handleContinueToBooking}
                  type="button"
                  className="w-full flex justify-center items-center px-4 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black btn-touch"
                >
                  Continue to booking with this content
                  <ArrowRight className="h-4 w-4 ml-2" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default CheckAdvert;
