import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { clientAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { UserX, Phone } from 'lucide-react';

// Full list, moved off the dashboard to keep that page from growing
// unbounded — the dashboard still carries a compact count tile linking here,
// so this stays discoverable without needing the whole scrollable list
// competing with everything else on the landing page.
const FreeClients = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [clients, setClients] = useState([]);
  const [dormancyDays, setDormancyDays] = useState(60);
  const [loading, setLoading] = useState(true);

  const fetchFreeClients = useCallback(() => {
    setLoading(true);
    clientAPI.getFree()
      .then(res => {
        setClients(res.data.data.clients || []);
        setDormancyDays(res.data.data.dormancyDays || 60);
      })
      .catch(err => {
        console.error('Error fetching free clients:', err);
        toast.error('Failed to load free clients');
      })
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { fetchFreeClients(); }, [fetchFreeClients]);

  const handleClaim = (client) => {
    navigate('/create-advert', {
      state: { prefill: { clientId: client.id, clientName: client.name } }
    });
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 py-4 max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <UserX className="h-6 w-6 text-orange-500" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Free Clients</h1>
                <p className="text-sm text-gray-600">
                  No booking in {dormancyDays}+ days — open for anyone on the team to claim.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-4 md:p-6">
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />)}
            </div>
          ) : clients.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <UserX className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No dormant clients right now — everyone's actively engaged.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100 overflow-hidden">
              {clients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => handleClaim(client)}
                  className="w-full text-left px-4 md:px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors tap-target"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{client.name}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500">
                      {client.phone && (
                        <span className="flex items-center gap-1 min-w-0"><Phone className="h-3 w-3 flex-shrink-0" />{client.phone}</span>
                      )}
                      <span className="truncate">Last with {client.last_rep_name || 'unknown rep'}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <span className="text-xs font-bold text-orange-700 whitespace-nowrap">{client.days_dormant}d dormant</span>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {client.last_advert_date ? new Date(client.last_advert_date).toLocaleDateString() : '—'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default FreeClients;
