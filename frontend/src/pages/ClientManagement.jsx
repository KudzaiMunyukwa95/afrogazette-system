import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { clientAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { Users, Search, GitMerge, Pencil, X, Check } from 'lucide-react';

// Replaces the old version, which grouped raw advert.client_name strings
// client-side — exactly the mechanism that fragmented one real client into
// several "clients" under naming variants. This queries the real unified
// list (linked clients-table rows + unlinked historical names, same source
// as Free Clients but with no dormancy filter, since an active client can
// be just as unlinked/phone-less as a dormant one) and is the actual place
// to standardize a name or add a phone, not just view stats.
const ClientManagement = () => {
  const toast = useToast();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showOnlyUnlinked, setShowOnlyUnlinked] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchClients = useCallback(() => {
    setLoading(true);
    clientAPI.getAllUnified()
      .then(res => setClients(res.data.data.clients || []))
      .catch(err => {
        console.error('Error fetching clients:', err);
        toast.error('Failed to load clients');
      })
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const rowKey = (c) => c.id ?? `unlinked-${c.name}`;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter(c => {
      const matchesSearch = !q ||
        c.name.toLowerCase().includes(q) ||
        (c.last_rep_name || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q);
      const matchesLinked = !showOnlyUnlinked || !c.is_linked;
      return matchesSearch && matchesLinked;
    });
  }, [clients, search, showOnlyUnlinked]);

  const unlinkedCount = clients.filter(c => !c.is_linked).length;

  const startEdit = (client) => {
    setEditingKey(rowKey(client));
    setEditName(client.name);
    setEditPhone(client.phone || '');
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditName('');
    setEditPhone('');
  };

  const saveEdit = async (client) => {
    if (!editName.trim() || !editPhone.trim()) {
      toast.error('Name and phone are both required');
      return;
    }
    try {
      setSaving(true);
      if (client.is_linked) {
        await clientAPI.update(client.id, { name: editName.trim(), phone: editPhone.trim() });
        toast.success('Client updated');
      } else {
        const res = await clientAPI.standardize({
          originalName: client.name,
          name: editName.trim(),
          phone: editPhone.trim()
        });
        toast.success(res.data.message);
      }
      cancelEdit();
      fetchClients();
    } catch (error) {
      const data = error.response?.data;
      toast.error(data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 py-4 max-w-6xl mx-auto">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Users className="h-6 w-6 text-red-500" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Clients</h1>
                  <p className="text-sm text-gray-600">
                    {unlinkedCount > 0
                      ? `${unlinkedCount} need a name/phone confirmed to be fully standardized`
                      : 'Every client on file has a real record and a phone number'}
                  </p>
                </div>
              </div>
              <Link
                to="/duplicate-clients"
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-red-50 text-red-700 rounded-full hover:bg-red-100"
              >
                <GitMerge className="h-3.5 w-3.5" /> Merge duplicates
              </Link>
            </div>

            {!loading && clients.length > 0 && (
              <div className="flex flex-wrap items-center gap-3 mt-4">
                <div className="relative flex-1 min-w-[220px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, rep, or phone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input-mobile w-full pl-9 pr-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-700 tap-target px-1">
                  <input
                    type="checkbox"
                    checked={showOnlyUnlinked}
                    onChange={(e) => setShowOnlyUnlinked(e.target.checked)}
                    className="accent-red-600"
                  />
                  Needs standardizing only
                </label>
                <span className="text-xs text-gray-400 ml-auto">{filtered.length} of {clients.length} shown</span>
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
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No clients yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adverts</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
                      <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact By</th>
                      <th className="px-4 md:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filtered.map((client) => {
                      const key = rowKey(client);
                      const isEditing = editingKey === key;
                      return (
                        <tr key={key} className="hover:bg-gray-50 transition-colors">
                          {isEditing ? (
                            <>
                              <td className="px-4 md:px-6 py-3" colSpan={2}>
                                <div className="flex gap-2">
                                  <input
                                    autoFocus
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    placeholder="Client name"
                                    className="input-mobile px-2 border border-gray-300 rounded w-32"
                                  />
                                  <input
                                    value={editPhone}
                                    onChange={(e) => setEditPhone(e.target.value)}
                                    placeholder="077 123 4567"
                                    className="input-mobile px-2 border border-gray-300 rounded w-32"
                                  />
                                </div>
                              </td>
                              <td colSpan={4} className="px-4 md:px-6 py-3 text-xs text-gray-400">
                                {!client.is_linked && 'Saving will link past bookings under this name to the new record.'}
                              </td>
                              <td className="px-4 md:px-6 py-3">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => saveEdit(client)}
                                    disabled={saving}
                                    className="tap-target inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100 disabled:opacity-50"
                                  >
                                    <Check className="h-3.5 w-3.5" /> Save
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="tap-target inline-flex items-center px-2.5 py-1.5 bg-gray-50 text-gray-600 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-100"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 md:px-6 py-3">
                                <div className="font-medium text-gray-900">{client.name}</div>
                                {!client.is_linked && (
                                  <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded inline-block mt-1">
                                    Not standardized
                                  </span>
                                )}
                              </td>
                              <td className="px-4 md:px-6 py-3 text-sm text-gray-600 whitespace-nowrap">
                                {client.phone || <span className="text-gray-300 italic">none on file</span>}
                              </td>
                              <td className="px-4 md:px-6 py-3 text-sm text-gray-600 tabular-nums">{client.total_adverts}</td>
                              <td className="px-4 md:px-6 py-3 text-sm font-medium text-gray-900 tabular-nums">
                                ${Number(client.total_spent).toFixed(2)}
                              </td>
                              <td className="px-4 md:px-6 py-3 text-sm text-gray-500 whitespace-nowrap">
                                {client.last_advert_date ? new Date(client.last_advert_date).toLocaleDateString() : '—'}
                              </td>
                              <td className="px-4 md:px-6 py-3 text-sm text-gray-600 whitespace-nowrap">
                                {client.last_rep_name || 'unknown'}
                              </td>
                              <td className="px-4 md:px-6 py-3 text-right">
                                <button
                                  onClick={() => startEdit(client)}
                                  className="tap-target inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100"
                                >
                                  <Pencil className="h-3.5 w-3.5" /> {client.is_linked ? 'Edit' : 'Standardize'}
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan="7" className="px-6 py-10 text-center text-gray-400">No matches</td>
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

export default ClientManagement;
