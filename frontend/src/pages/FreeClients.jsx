import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { clientAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { UserX, Search, MessageCircle, Plus } from 'lucide-react';

// wa.me needs digits only, no leading + — our stored format is +263XXXXXXXXX.
const waLink = (phone) => `https://wa.me/${phone.replace(/[^\d]/g, '')}`;

// A real data table, not a click-the-whole-row list — with 253+ rows, reps
// need to scan and filter, not guess what a tap does. Actions are explicit:
// WhatsApp them (when there's a number to WhatsApp) and/or start a new
// advert, instead of one implicit click that assumes a booking is already
// decided. Most rows have no phone on file yet (bookings made before this
// feature existed never captured one) — those get an "Add phone & book"
// action instead, since that's the one flow that actually captures it.
const FreeClients = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [clients, setClients] = useState([]);
  const [dormancyDays, setDormancyDays] = useState(60);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.last_rep_name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q)
    );
  }, [clients, search]);

  const handleBook = (client) => {
    // Unlinked clients (from old free-text-only bookings) have no real
    // clients-table id to prefill — sending a bogus one would either error
    // or silently attach to the wrong record. Prefilling just the name
    // routes through ClientAutocomplete's normal search-or-create flow,
    // which is exactly where a rep gets prompted for a phone number.
    navigate('/create-advert', {
      state: {
        prefill: client.is_linked
          ? { clientId: client.id, clientName: client.name }
          : { clientName: client.name }
      }
    });
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 py-4 max-w-6xl mx-auto">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <UserX className="h-6 w-6 text-orange-500" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Free Clients</h1>
                  <p className="text-sm text-gray-600">
                    No booking in {dormancyDays}+ days — open for anyone on the team to claim.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-100 text-orange-800">
                  {clients.length} dormant
                </span>
              </div>
            </div>

            {!loading && clients.length > 0 && (
              <div className="relative mt-4 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, rep, or phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-mobile w-full pl-9 pr-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            )}
          </div>
        </div>

        <div className="max-w-6xl mx-auto p-4 md:p-6">
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map(i => <div key={i} className="h-14 bg-gray-200 rounded-xl animate-pulse" />)}
            </div>
          ) : clients.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <UserX className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No dormant clients right now — everyone's actively engaged.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Contact</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dormant</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact By</th>
                      <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filtered.map((client) => (
                      <tr key={client.id ?? `unlinked-${client.name}`} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 md:px-6 py-3">
                          <div className="font-medium text-gray-900">{client.name}</div>
                          {!client.is_linked && (
                            <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded inline-block mt-1">
                              Needs phone
                            </span>
                          )}
                        </td>
                        <td className="px-4 md:px-6 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {client.phone || <span className="text-gray-300 italic">none on file</span>}
                        </td>
                        <td className="px-4 md:px-6 py-3 text-sm text-gray-500 whitespace-nowrap">
                          {client.last_advert_date ? new Date(client.last_advert_date).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 md:px-6 py-3 whitespace-nowrap">
                          <span className="text-sm font-bold text-orange-700">{client.days_dormant}d</span>
                        </td>
                        <td className="px-4 md:px-6 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {client.last_rep_name || 'unknown'}
                        </td>
                        <td className="px-4 md:px-6 py-3">
                          <div className="flex items-center justify-end gap-2">
                            {client.phone && (
                              <a
                                href={waLink(client.phone)}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="tap-target inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100"
                              >
                                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                              </a>
                            )}
                            <button
                              onClick={() => handleBook(client)}
                              className="tap-target inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100"
                            >
                              <Plus className="h-3.5 w-3.5" /> {client.phone ? 'New Advert' : 'Add Phone & Book'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan="6" className="px-6 py-10 text-center text-gray-400">No matches for "{search}"</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default FreeClients;
