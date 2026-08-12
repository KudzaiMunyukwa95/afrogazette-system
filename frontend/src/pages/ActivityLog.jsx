import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import { activityAPI } from '../services/api';
import { useToast } from '../components/Toast';
import {
  History, CheckCircle2, XCircle, Trash2, FileText, DollarSign,
  User, ChevronLeft, ChevronRight
} from 'lucide-react';

const ACTION_META = {
  approved: { label: 'Approved', icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  declined: { label: 'Declined', icon: XCircle, className: 'bg-red-50 text-red-700 border-red-200' },
  deleted: { label: 'Deleted', icon: Trash2, className: 'bg-gray-100 text-gray-700 border-gray-200' },
  rejected: { label: 'Rejected', icon: XCircle, className: 'bg-red-50 text-red-700 border-red-200' }
};

const TYPE_FILTERS = [
  { id: '', label: 'All' },
  { id: 'advert', label: 'Adverts' },
  { id: 'expense', label: 'Expenses & Requisitions' }
];

const ActivityLog = () => {
  const toast = useToast();
  const [events, setEvents] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [type, setType] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLog = useCallback(() => {
    setLoading(true);
    activityAPI.getLog({ page, limit: 25, ...(type ? { type } : {}) })
      .then(res => {
        setEvents(res.data.data.events);
        setPagination(res.data.data.pagination);
      })
      .catch(err => {
        console.error('Error fetching activity log:', err);
        toast.error('Failed to load activity log');
      })
      .finally(() => setLoading(false));
  }, [page, type]);

  useEffect(() => { fetchLog(); }, [fetchLog]);

  const handleTypeChange = (t) => {
    setType(t);
    setPage(1);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 py-4 max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <History className="h-6 w-6 text-red-500" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Activity Log</h1>
                <p className="text-sm text-gray-600">Every advert and expense/requisition decision, who made it and when.</p>
              </div>
            </div>

            <div className="flex gap-2">
              {TYPE_FILTERS.map(f => (
                <button
                  key={f.id}
                  onClick={() => handleTypeChange(f.id)}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-semibold transition-all ${
                    type === f.id ? 'bg-red-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto p-4 md:p-6">
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse" />)}
            </div>
          ) : events.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <History className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No activity logged yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
              {events.map((e) => {
                const meta = ACTION_META[e.action] || { label: e.action, icon: History, className: 'bg-gray-50 text-gray-700 border-gray-200' };
                const Icon = meta.icon;
                return (
                  <div key={`${e.type}-${e.id}`} className="p-4 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                    <div className={`p-2 rounded-lg border flex-shrink-0 ${meta.className}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${meta.className}`}>
                          {meta.label}
                        </span>
                        <span className="text-xs text-gray-400 uppercase tracking-wide flex items-center gap-1">
                          {e.type === 'advert' ? <FileText className="h-3 w-3" /> : <DollarSign className="h-3 w-3" />}
                          {e.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{e.actor_name}</span>{' '}
                        {meta.label.toLowerCase()}{' '}
                        {e.type === 'advert' ? 'the advert for' : 'the expense for'}{' '}
                        <span className="font-medium">{e.target_label || `#${e.target_id}`}</span>
                        {e.target_amount != null && (
                          <span className="text-gray-500"> — ${Number(e.target_amount).toFixed(2)}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Raised by {e.raised_by_name || 'unknown'}
                      </p>
                      {e.reason && <p className="text-sm text-gray-500 mt-1">"{e.reason}"</p>}
                      <p className="text-xs text-gray-400 mt-1.5">{new Date(e.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-white border border-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </button>
              <span className="text-sm text-gray-500">Page {pagination.page} of {pagination.totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-white border border-gray-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ActivityLog;
