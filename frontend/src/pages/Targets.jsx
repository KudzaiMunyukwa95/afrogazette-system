import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { targetAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { Target, Save, ChevronLeft, ChevronRight } from 'lucide-react';

const monthLabel = (monthStr) => {
  const [y, m] = monthStr.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
};

const shiftMonth = (monthStr, delta) => {
  const [y, m] = monthStr.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const Targets = () => {
  const toast = useToast();
  const [month, setMonth] = useState(currentMonth());
  const [reps, setReps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({}); // { [repId]: string } — unsaved edits
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    fetchTargets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  const fetchTargets = async () => {
    try {
      setLoading(true);
      const response = await targetAPI.getAll(month);
      setReps(response.data.data.reps);
      setDrafts({});
    } catch (error) {
      console.error('Error fetching targets:', error);
      toast.error('Failed to load targets');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (repId) => {
    const value = drafts[repId];
    if (value === undefined || value === '' || isNaN(parseFloat(value)) || parseFloat(value) < 0) {
      toast.error('Enter a valid target amount');
      return;
    }
    try {
      setSavingId(repId);
      await targetAPI.set(repId, parseFloat(value), month);
      toast.success('Target updated');
      fetchTargets();
    } catch (error) {
      console.error('Error setting target:', error);
      toast.error(error.response?.data?.message || 'Failed to update target');
    } finally {
      setSavingId(null);
    }
  };

  const totalTarget = reps.reduce((sum, r) => sum + r.target, 0);
  const totalAttained = reps.reduce((sum, r) => sum + r.attained, 0);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center space-x-3">
                <Target className="h-6 w-6 text-red-500" />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Rep Targets</h1>
                  <p className="text-sm text-gray-600">Set each sales rep's monthly revenue target</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-2 py-1.5">
                <button
                  onClick={() => setMonth(m => shiftMonth(m, -1))}
                  className="p-1.5 hover:bg-white rounded-md transition-colors"
                  aria-label="Previous month"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-600" />
                </button>
                <span className="text-sm font-semibold text-gray-800 min-w-[130px] text-center">
                  {monthLabel(month)}
                </span>
                <button
                  onClick={() => setMonth(m => shiftMonth(m, 1))}
                  className="p-1.5 hover:bg-white rounded-md transition-colors"
                  aria-label="Next month"
                >
                  <ChevronRight className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-600 mb-1">Company Target</p>
              <p className="text-2xl font-bold text-gray-900">${totalTarget.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-600 mb-1">Company Attained</p>
              <p className="text-2xl font-bold text-gray-900">${totalAttained.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-3"></div>
                Loading reps…
              </div>
            ) : reps.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No sales reps yet — create one from Users first.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rep</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Attained</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Target ($)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reps.map((rep) => {
                      const draft = drafts[rep.id];
                      const displayValue = draft !== undefined ? draft : (rep.target || '');
                      const dirty = draft !== undefined && parseFloat(draft) !== rep.target;
                      const pct = rep.percent == null ? null : Math.min(100, rep.percent);
                      return (
                        <tr key={rep.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{rep.fullName}</div>
                            <div className="text-xs text-gray-500">{rep.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                            ${Number(rep.attained).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {pct == null ? (
                              <span className="text-xs text-gray-400">no target</span>
                            ) : (
                              <div className="flex items-center gap-2 w-28">
                                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${pct >= 100 ? 'bg-green-500' : 'bg-red-500'}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-xs font-semibold text-gray-700 w-9 text-right">{rep.percent}%</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={displayValue}
                              onChange={(e) => setDrafts(prev => ({ ...prev, [rep.id]: e.target.value }))}
                              className="w-28 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleSave(rep.id)}
                              disabled={!dirty || savingId === rep.id}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                              <Save className="h-3.5 w-3.5" />
                              {savingId === rep.id ? 'Saving…' : 'Save'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500 px-1">
            New reps appear here automatically as soon as they're created in Users — nothing to configure. Targets are per calendar month; switch months above to plan ahead or review history.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Targets;
