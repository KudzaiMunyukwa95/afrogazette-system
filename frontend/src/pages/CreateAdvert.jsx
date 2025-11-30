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
  User
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

    setLoading(true);

    try {
      await advertAPI.create(formData);
      toast.success('Advert created successfully and sent for approval!');

      // Reset form
      setFormData({
        clientId: null,
        clientName: '',
        category: '',
        caption: '',
        destinationType: 'groups',
        daysPaid: '',
        paymentDate: '',
        amountPaid: '',
        startDate: ''
      });

      // Redirect to dashboard after 1 second
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error creating advert');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-6 py-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Create New Advert</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Destination Type */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Destination *
                  <span className="text-xs text-gray-500 font-normal ml-2">
                    Where should this advert be posted?
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className={`
                  flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200
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
                    <Smartphone className={`h-5 w-5 mt-1 ${formData.destinationType === 'groups' ? 'text-red-600' : 'text-gray-400'
                      }`} />
                    <div>
                      <div className={`font-semibold text-sm mb-1 ${formData.destinationType === 'groups' ? 'text-red-900' : 'text-gray-900'
                        }`}>
                        WhatsApp Groups
                      </div>
                      <div className={`text-xs mb-2 ${formData.destinationType === 'groups' ? 'text-red-700' : 'text-gray-600'
                        }`}>
                        Posted to multiple groups
                      </div>
                      <div className="text-xs text-green-600 font-medium">
                        2 adverts per time slot
                      </div>
                    </div>
                  </div>
                </label>

                <label className={`
                  flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200
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
                    <Radio className={`h-5 w-5 mt-1 ${formData.destinationType === 'channel' ? 'text-red-600' : 'text-gray-400'
                      }`} />
                    <div>
                      <div className={`font-semibold text-sm mb-1 ${formData.destinationType === 'channel' ? 'text-red-900' : 'text-gray-900'
                        }`}>
                        WhatsApp Channel
                      </div>
                      <div className={`text-xs mb-2 ${formData.destinationType === 'channel' ? 'text-red-700' : 'text-gray-600'
                        }`}>
                        Broadcast to channel
                      </div>
                      <div className="text-xs text-blue-600 font-medium">
                        1 advert per time slot
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Advert Type */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <Tag className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Advert Type</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { id: 'text_ad', label: 'Text Ad', desc: 'Simple text message' },
                  { id: 'group_link_ad', label: 'Group Link Ad', desc: 'Promote a WhatsApp group' },
                  { id: 'picture_ad', label: 'Picture Ad', desc: 'Image with caption' },
                  { id: 'website_ad', label: 'Website Ad', desc: 'Link to external site' },
                  { id: 'feature', label: 'Feature', desc: 'Premium placement' }
                ].map((type) => (
                  <label
                    key={type.id}
                    className={`
                      relative flex flex-col p-4 border-2 rounded-xl cursor-pointer transition-all duration-200
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
                    <span className={`font-semibold text-sm mb-1 ${formData.advertType === type.id ? 'text-red-900' : 'text-gray-900'
                      }`}>
                      {type.label}
                    </span>
                    <span className={`text-xs ${formData.advertType === type.id ? 'text-red-700' : 'text-gray-500'
                      }`}>
                      {type.desc}
                    </span>
                    {formData.advertType === type.id && (
                      <CheckCircle className="absolute top-3 right-3 h-4 w-4 text-red-600" />
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Client & Category */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <User className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Client Details</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
            </div>

            {/* Advertisement Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <FileText className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Advertisement Content</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Advertisement Text *</label>
                <textarea
                  name="caption"
                  value={formData.caption}
                  onChange={handleChange}
                  required
                  rows={5}
                  placeholder="Enter your advertisement message..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                <p className="text-xs text-gray-600 mt-2">
                  This message will be posted to {formData.destinationType === 'groups' ? 'WhatsApp groups' : 'the WhatsApp channel'}
                </p>
              </div>
            </div>

            {/* Payment & Schedule */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-2 mb-6">
                <DollarSign className="h-5 w-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-900">Payment & Schedule</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Days Paid *</label>
                  <input
                    type="number"
                    name="daysPaid"
                    value={formData.daysPaid}
                    onChange={handleChange}
                    required
                    min="1"
                    placeholder="Number of days"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
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
                    placeholder="0.00"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  {formData.amountPaid && (
                    <p className="text-sm text-green-600 font-medium mt-1">
                      Your commission: ${calculateCommission(formData.amountPaid)}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date *</label>
                  <input
                    type="date"
                    name="paymentDate"
                    value={formData.paymentDate}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                    min={getTodayDate()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    Start date must be today or later
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Create Advert
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  disabled={loading}
                  className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>

            {/* Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <strong>Note:</strong> Your advert will be sent to admin for review and approval.
                  You'll be notified once it's approved and assigned to a time slot on the{' '}
                  {formData.destinationType === 'groups' ? 'Groups Schedule' : 'Channel Schedule'}.
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default CreateAdvert;
