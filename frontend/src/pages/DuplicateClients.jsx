import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import { clientAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { Users, GitMerge, CheckCircle2, Phone } from 'lucide-react';

// Historical duplicates can't be matched by phone — most old client rows
// predate the phone requirement entirely, so there's no shared data to key
// on. This groups by normalized name (titles stripped, whitespace
// collapsed) as the best a query can do, and leaves the actual judgment —
// "is this really the same person" — to whoever's reviewing it.
const DuplicateClients = () => {
  const toast = useToast();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(null);
  const [keepChoice, setKeepChoice] = useState({});

  const fetchDuplicates = useCallback(() => {
    setLoading(true);
    clientAPI.getDuplicates()
      .then(res => {
        const groupData = res.data.data.duplicateGroups;
        setGroups(groupData);
        // Default "keep" choice: whichever record in the group has the most
        // adverts — the one with the real history is the one worth keeping.
        const defaults = {};
        groupData.forEach((g, i) => {
          const best = [...g.clients].sort((a, b) => b.total_adverts - a.total_adverts)[0];
          defaults[i] = best.id;
        });
        setKeepChoice(defaults);
      })
      .catch(err => {
        console.error('Error fetching duplicate clients:', err);
        toast.error('Failed to load duplicate clients');
      })
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { fetchDuplicates(); }, [fetchDuplicates]);

  const handleMerge = async (groupIndex) => {
    const group = groups[groupIndex];
    const keepId = keepChoice[groupIndex];
    const mergeIds = group.clients.map(c => c.id).filter(id => id !== keepId);

    if (mergeIds.length === 0) return;

    try {
      setMerging(groupIndex);
      await clientAPI.merge(keepId, mergeIds);
      toast.success(`Merged ${mergeIds.length + 1} records into one`);
      setGroups(prev => prev.filter((_, i) => i !== groupIndex));
    } catch (error) {
      console.error('Error merging clients:', error);
      toast.error(error.response?.data?.message || 'Failed to merge clients');
    } finally {
      setMerging(null);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="px-4 py-4 max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-red-500" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Duplicate Clients</h1>
                <p className="text-sm text-gray-600">
                  Same client, different spelling — pick which record to keep, the rest merge into it.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map(i => <div key={i} className="h-32 bg-gray-200 rounded-2xl animate-pulse" />)}
            </div>
          ) : groups.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
              <p className="text-gray-500">No likely duplicates found — the client list looks clean.</p>
            </div>
          ) : (
            groups.map((group, groupIndex) => (
              <div key={group.normalizedName} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100">
                  <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                    {group.clients.length} records look like the same client
                  </p>
                </div>
                <div className="divide-y divide-gray-100">
                  {group.clients.map(client => (
                    <label
                      key={client.id}
                      className={`flex items-start gap-3 p-4 cursor-pointer transition-colors ${
                        keepChoice[groupIndex] === client.id ? 'bg-emerald-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`keep-${groupIndex}`}
                        checked={keepChoice[groupIndex] === client.id}
                        onChange={() => setKeepChoice(prev => ({ ...prev, [groupIndex]: client.id }))}
                        className="mt-1 accent-emerald-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">{client.name}</span>
                          {keepChoice[groupIndex] === client.id && (
                            <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                              Keep this one
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                          {client.phone && (
                            <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{client.phone}</span>
                          )}
                          <span>{client.total_adverts} advert{client.total_adverts === '1' ? '' : 's'}</span>
                          <span>Rep: {client.sales_rep_name || 'unassigned'}</span>
                          {client.last_advert_date && (
                            <span>Last booked {new Date(client.last_advert_date).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="p-4 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={() => handleMerge(groupIndex)}
                    disabled={merging === groupIndex}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 btn-touch"
                  >
                    <GitMerge className="h-4 w-4" />
                    {merging === groupIndex ? 'Merging...' : 'Merge these records'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
};

export default DuplicateClients;
