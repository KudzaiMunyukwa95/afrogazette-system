import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { advertAPI } from '../services/api';
import Layout from '../components/Layout';
import ClientAutocomplete from '../components/ClientAutocomplete';
import { useToast } from '../components/Toast';
import {
  ArrowLeft,
  Save,
  Tag,
  Calendar,
  DollarSign,
  Clock,
  FileText,
  Smartphone,
  Radio,
  CheckCircle,
  User,
  CreditCard,
  Layers
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

const CreateAdvert = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    clientId: null,
    clientName: '',
    category: '',
    advertType: 'text_ad',
    caption: '',
    destinationType: 'groups', // default to groups
    daysPaid: '',
    paymentDate: '',
    paymentMethod: 'cash',
    amountPaid: '',
    startDate: ''
  });

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Calculate commission (10%)
  const calculateCommission = (amount) => {
    return (parseFloat(amount) * 0.10).toFixed(2);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate start date is not in the past
    const today = getTodayDate();
    if (formData.startDate < today) {
      toast.error('Start date cannot be in the past');
      return;
    }

    if (!formData.clientId && !formData.clientName) {
      toast.error('Please select or enter a client');
      return;
    }

    try {
      setLoading(true);
      await advertAPI.create(formData);
      toast.success('Advert created successfully');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating advert:', error);
      toast.error(error.response?.data?.message || 'Failed to create advert');
    } finally {
      setLoading(false);
    }
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

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Step 1: Destination */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-sm">1</div>
                <h2 className="text-lg font-semibold text-gray-900">Where to post?</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={`
                  flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 tap-target
                  ${formData.destinationType === 'groups'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                  }
                `}>
                  <input
                    type="radio"
                    name="destinationType"
                    value="groups"
                    checked={formData.destinationType === 'groups'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className="flex items-start space-x-3">
                    <Smartphone className={`h-5 w-5 mt-1 ${formData.destinationType === 'groups' ? 'text-red-600' : 'text-gray-400'}`} />
                    <div>
                      <div className={`font-semibold text-sm mb-1 ${formData.destinationType === 'groups' ? 'text-red-900' : 'text-gray-900'}`}>
                        WhatsApp Groups
                      </div>
                      <div className={`text-xs ${formData.destinationType === 'groups' ? 'text-red-700' : 'text-gray-600'}`}>
                        Post to multiple community groups
                      </div>
                    </div>
                  </div>
                </label>

                <label className={`
                  flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 tap-target
                  ${formData.destinationType === 'channel'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                  }
                `}>
                  <input
                    type="radio"
                    name="destinationType"
                    value="channel"
                    checked={formData.destinationType === 'channel'}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <div className="flex items-start space-x-3">
                    <Radio className={`h-5 w-5 mt-1 ${formData.destinationType === 'channel' ? 'text-red-600' : 'text-gray-400'}`} />
                    <div>
                      <div className={`font-semibold text-sm mb-1 ${formData.destinationType === 'channel' ? 'text-red-900' : 'text-gray-900'}`}>
                        WhatsApp Channel
                      </div>
                      <div className={`text-xs ${formData.destinationType === 'channel' ? 'text-red-700' : 'text-gray-600'}`}>
                        Broadcast to official channel
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Step 2: Advert Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-sm">2</div>
                <h2 className="text-lg font-semibold text-gray-900">Advert Details</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Advert Type</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { id: 'text_ad', label: 'Text Ad' },
                      { id: 'group_link_ad', label: 'Group Link' },
                      { id: 'picture_ad', label: 'Picture Ad' },
                      { id: 'website_ad', label: 'Website Ad' },
                      { id: 'feature', label: 'Feature' }
                    ].map((type) => (
                      <label
                        key={type.id}
                        className={`
                          relative flex flex-col items-center justify-center p-3 border-2 rounded-lg cursor-pointer text-center transition-all duration-200 tap-target
                          ${formData.advertType === type.id
                            ? 'border-red-500 bg-red-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                          }
                        `}
                      >
                        <input
                          type="radio"
                          name="advertType"
                          value={type.id}
                          checked={formData.advertType === type.id}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <span className={`text-sm font-medium ${formData.advertType === type.id ? 'text-red-900' : 'text-gray-900'}`}>
                          {type.label}
                        </span>
                        {formData.advertType === type.id && (
                          <CheckCircle className="absolute top-1 right-1 h-3 w-3 text-red-600" />
                        )}
                      </label>
                    ))}
                  </div>
                </div>

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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Content *</label>
                  <textarea
                    name="caption"
                    value={formData.caption}
                    onChange={handleChange}
                    required
                    rows={4}
                    placeholder="Enter advertisement text..."
                    className="input-mobile w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>
            </div>

            {/* Step 3: Payment & Schedule */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6">
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold text-sm">3</div>
                <h2 className="text-lg font-semibold text-gray-900">Payment & Schedule</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Days Paid *</label>
                  <input
                    type="number"
                    name="daysPaid"
                    value={formData.daysPaid}
                    onChange={handleChange}
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
                  {formData.amountPaid && (
                    <p className="text-sm text-green-600 font-medium mt-1">
                      Commission: ${calculateCommission(formData.amountPaid)}
                    </p>
                  )}
                </div>

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
                Create Advert
              </button>
            </div>

          </form>
        </div>
      </div>
    </Layout>
  );
};

export default CreateAdvert;
