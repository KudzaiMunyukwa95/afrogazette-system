import axios from 'axios';

// Get API URL from environment or use default
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

console.log('🔗 API Configuration:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  API_URL,
  mode: import.meta.env.MODE
});

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log requests in development
    if (import.meta.env.DEV) {
      console.log('🚀 API Request:', {
        method: config.method?.toUpperCase(),
        url: `${config.baseURL}${config.url}`,
        headers: config.headers
      });
    }

    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (import.meta.env.DEV) {
      console.log('✅ API Response:', {
        status: response.status,
        url: response.config.url,
        data: response.data
      });
    }
    return response;
  },
  (error) => {
    // Enhanced error logging
    console.error('❌ API Error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      data: error.response?.data
    });

    if (error.response?.status === 401) {
      // Token expired or invalid
      console.warn('🔐 Authentication failed - clearing session');
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile')
};

// User APIs
export const userAPI = {
  getAll: () => api.get('/users'),
  create: (userData) => api.post('/users', userData),
  update: (id, userData) => api.patch(`/users/${id}`, userData),
  delete: (id) => api.delete(`/users/${id}`)
};

// Advert APIs
export const advertAPI = {
  create: (advertData) => api.post('/adverts', advertData),
  getAll: (params) => api.get('/adverts', { params }),
  getPending: () => api.get('/adverts/pending'),
  approve: (id, slotId) => api.post(`/adverts/${id}/approve`, { slotId }),
  extend: (id, data) => api.post(`/adverts/${id}/extend`, data),
  update: (id, data) => api.patch(`/adverts/${id}`, data),
  delete: (id) => api.delete(`/adverts/${id}`),

  // NEW: Decline advert with reason
  decline: (id, data) => api.post(`/adverts/${id}/decline`, data),

  // NEW: Permanently delete advert (admin only)
  permanentDelete: (id, reason) => api.delete(`/adverts/${id}/permanent`, {
    data: { reason }
  }),

  // NEW: Get admin action history for an advert
  getHistory: (id) => api.get(`/adverts/${id}/history`)
};

// Slot APIs
export const slotAPI = {
  getAll: () => api.get('/slots'),
  getToday: () => api.get('/slots/today'),
  getCalendar: (date) => api.get('/slots/calendar', { params: { date } }),
  getVacant: (startDate, endDate) => api.get('/slots/vacant', { params: { startDate, endDate } }),
  checkAvailability: (advertId, slotId) => api.get('/slots/check-availability', { params: { advertId, slotId } })
};

// Analytics APIs
// Analytics APIs
export const analyticsAPI = {
  getDashboard: (params) => api.get('/analytics/dashboard', { params }),
  getMyDashboard: (params) => api.get('/analytics/my-dashboard', { params })
};

// Invoice APIs
export const invoiceAPI = {
  getAll: () => api.get('/invoices'),
  download: (id) => api.get(`/invoices/${id}/download`, { responseType: 'blob' })
};

// Client APIs
export const clientAPI = {
  getAll: (params) => api.get('/clients', { params }),
  search: (query) => api.get('/clients/search', { params: { q: query } }),
  getById: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.patch(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
  merge: (keepId, mergeIds) => api.post('/clients/merge', { keepId, mergeIds })
};

// Finance APIs
export const financeAPI = {
  // Expenses
  createExpense: (data) => api.post('/finance/expenses', data),
  getExpenses: (params) => api.get('/finance/expenses', { params }),
  getExpenseById: (id) => api.get(`/finance/expenses/${id}`),
  approveExpense: (id) => api.put(`/finance/expenses/${id}/approve`),
  rejectExpense: (id, comment) => api.put(`/finance/expenses/${id}/reject`, { comment }),
  getExpenseHistory: (id) => api.get(`/finance/expenses/${id}/history`),

  // Requisitions
  createRequisition: (data) => api.post('/finance/requisitions', data),
  getRequisitions: (params) => api.get('/finance/requisitions', { params }),

  // Reports
  getFinancialOverview: (params) => api.get('/finance/reports/overview', { params }),
  getIncomeBreakdown: (params) => api.get('/finance/reports/income', { params }),
  getExpenseBreakdown: (params) => api.get('/finance/reports/expenses', { params }),
  getPaymentMethodSummary: (params) => api.get('/finance/reports/payment-methods', { params }),
  downloadFinancialReport: (params) => api.get('/finance/reports/download-pdf', {
    params,
    responseType: 'blob'
  })
};

// Health check function
export const healthCheck = async () => {
  try {
    const response = await axios.get(`${API_URL.replace('/api', '')}/health`, { timeout: 5000 });
    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      details: error.response?.data
    };
  }
};

export default api;
