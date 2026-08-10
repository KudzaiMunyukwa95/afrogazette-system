import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { advertAPI } from '../services/api';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';
import { whatsAppToHtml } from '../utils/whatsappFormat';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Sparkles,
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
  accept: { label: 'Accepted', icon: ShieldCheck, pill: 'bg-green-100 text-green-700' },
  reject: { label: 'Rejected', icon: ShieldAlert, pill: 'bg-red-100 text-red-700' },
  tweak: { label: 'Needs a tweak', icon: ShieldQuestion, pill: 'bg-amber-100 text-amber-700' }
};

const AdvertTools = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({ category: '', clientName: '', adContent: '' });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleRun = async (e) => {
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

    setWorking(true);
    setResult(null);
    try {
      const response = await advertAPI.checkEligibility({
        category: form.category,
        clientName: form.clientName,
        adContent: trimmed
      });
      setResult(response.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error checking advert');
    } finally {
      setWorking(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.rewrite) return;
    try {
      await navigator.clipboard.writeText(result.rewrite);
      toast.success('Copied — paste directly into WhatsApp');
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
              <ShieldCheck className="h-6 w-6 mr-2 text-red-600" />
              Advert Tools
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Check a client's ad against policy and get clean, WhatsApp-ready standardized copy in one step —
              use this before booking whenever you're unsure. No advert is created here. Works in Shona or
              English; the rewrite stays in whatever language the client wrote in.
            </p>
          </div>

          <form onSubmit={handleRun} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 space-y-4">
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
                <label className="block text-sm font-medium text-gray-700">Client's Ad Content *</label>
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
              disabled={working}
              className="w-full flex justify-center items-center px-6 py-3 border border-transparent rounded-xl shadow-sm text-base font-bold text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 btn-touch"
            >
              {working ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Running...
                </>
              ) : (
                'Check & Standardize'
              )}
            </button>
          </form>

          {result && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${meta.pill}`}>
                  <Icon className="h-3.5 w-3.5 mr-1" />
                  {meta.label}
                </span>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-sm text-gray-700 leading-relaxed">{result.reasoning}</p>

                {result.flags && result.flags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {result.flags.map((flag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                        {flag}
                      </span>
                    ))}
                  </div>
                )}

                {result.rewrite && (
                  <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center text-xs font-bold text-gray-500 uppercase tracking-wide">
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        Standardized rewrite
                      </div>
                      <button
                        onClick={handleCopy}
                        type="button"
                        className="flex items-center text-xs font-medium text-gray-600 hover:text-gray-900"
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" />
                        Copy
                      </button>
                    </div>
                    <p
                      className="text-sm text-gray-900 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: whatsAppToHtml(result.rewrite) }}
                    />
                  </div>
                )}
              </div>

              {result.verdict !== 'reject' && (
                <div className="p-5 pt-0">
                  <button
                    onClick={handleContinueToBooking}
                    type="button"
                    className="w-full flex justify-center items-center px-4 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black btn-touch"
                  >
                    Continue to booking with this content
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default AdvertTools;
