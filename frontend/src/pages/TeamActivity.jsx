import React, { useCallback, useEffect, useRef, useState } from 'react';
import Layout from '../components/Layout';
import PhoneActions from '../components/PhoneActions';
import { salesActivityAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { OUTCOME_STYLES, STATUS_STYLES, dailyExpectedNow, timeAgo, clockTimeAgo, formatDate, todayHarare } from '../utils/salesActivity';
import { Loader2, RefreshCw, Users, Target, AlertTriangle, DollarSign, X, Download } from 'lucide-react';

const REFRESH_MS = 20000;
const HIGHLIGHT_MS = 8000;

const Badge = ({ text, styles }) => (
  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${styles[text] || 'bg-gray-100 text-gray-600'}`}>
    {text}
  </span>
);

// Same colour rules as the rep's own bar: green once hit, amber when behind
// the pace the target calls for right now, red otherwise.
const MiniBar = ({ done, target, expected }) => {
  const percent = target > 0 ? Math.min(100, Math.round((done / target) * 100)) : 0;
  const complete = target > 0 && done >= target;
  const behind = !complete && expected > 0 && done < expected;
  const fill = complete ? 'bg-emerald-500' : behind ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="relative h-2.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-700 ${fill}`} style={{ width: `${percent}%` }} />
      {!complete && expected > 0 && target > 0 && (
        <div className="absolute top-0 bottom-0 w-0.5 bg-gray-700/40" style={{ left: `${Math.min(100, (expected / target) * 100)}%` }} />
      )}
    </div>
  );
};

// Monday = 1 ... Sunday = 7 in Harare, so the week's expected contacts so far
// is (working days elapsed) x daily target.
const workingDaysElapsed = (workingDays) => {
  const wd = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Harare', weekday: 'short' }).format(new Date());
  const idx = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[wd] || 1;
  return Math.min(idx, workingDays);
};

const StatTile = ({ icon: Icon, label, value, sub, tone = 'red' }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
    <div className="flex items-center gap-2 mb-1">
      <div className={`p-1.5 rounded-lg ${tone === 'amber' ? 'bg-amber-50' : 'bg-red-50'}`}>
        <Icon className={`h-4 w-4 ${tone === 'amber' ? 'text-amber-600' : 'text-red-600'}`} />
      </div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
    </div>
    <p className="text-2xl font-bold text-gray-900 tabular-nums">{value}</p>
    {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
  </div>
);

const TeamActivity = () => {
  const [summary, setSummary] = useState(null);
  const [feed, setFeed] = useState([]);
  const toast = useToast();
  const [selectedRep, setSelectedRep] = useState(null);
  const [fromDate, setFromDate] = useState(todayHarare);
  const [toDate, setToDate] = useState(todayHarare);
  const [outcome, setOutcome] = useState('');
  const [total, setTotal] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [, setTick] = useState(0);
  const [fresh, setFresh] = useState(() => new Set());
  const seenIds = useRef(null);
  const filterKey = useRef('');

  const load = useCallback(async ({ manual = false } = {}) => {
    if (manual) setRefreshing(true);
    try {
      // No from/to means "this week" for the summary; the feed is today only.
      const sum = await salesActivityAPI.getSummary();
      const today = sum.data.data.today;
      const list = await salesActivityAPI.list({
        from: fromDate, to: toDate, limit: 100,
        repId: selectedRep || undefined, outcome: outcome || undefined
      });
      const activities = list.data.data.activities;

      // Flash entries that arrived since the last refresh, but not on first
      // load or right after the filters change (everything is "new" then).
      const key = `${fromDate}|${toDate}|${selectedRep}|${outcome}`;
      if (filterKey.current !== key) {
        seenIds.current = null;
        filterKey.current = key;
      }
      if (seenIds.current) {
        const arrived = activities.filter((a) => !seenIds.current.has(a.id)).map((a) => a.id);
        if (arrived.length) {
          setFresh((prev) => new Set([...prev, ...arrived]));
          setTimeout(() => {
            setFresh((prev) => {
              const next = new Set(prev);
              arrived.forEach((id) => next.delete(id));
              return next;
            });
          }, HIGHLIGHT_MS);
        }
      }
      seenIds.current = new Set(activities.map((a) => a.id));

      setSummary(sum.data.data);
      setFeed(activities);
      setTotal(list.data.data.pagination.total);
      setUpdatedAt(Date.now());
      setError(false);
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fromDate, toDate, selectedRep, outcome]);

  // Poll while the tab is visible; catch up immediately when it becomes visible again.
  useEffect(() => {
    load();
    const poll = setInterval(() => { if (!document.hidden) load(); }, REFRESH_MS);
    const onVisible = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  // Re-render every 15s so "x min ago" stays honest between refreshes.
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 15000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      </Layout>
    );
  }

  const reps = summary?.reps || [];
  const elapsed = workingDaysElapsed(summary?.range?.workingDays || 6);
  const totalToday = reps.reduce((s, r) => s + r.loggedToday, 0);
  const totalDailyTarget = reps.reduce((s, r) => s + r.dailyTarget, 0);
  const activeReps = reps.filter((r) => r.loggedToday > 0).length;
  const shownFeed = feed;
  const isToday = fromDate === summary?.today && toDate === summary?.today;
  const rangeLabel = isToday ? "Today's feed"
    : fromDate === toDate ? `Feed for ${formatDate(fromDate)}`
    : `Feed ${formatDate(fromDate)} – ${formatDate(toDate)}`;

  const exportCsv = async () => {
    setExporting(true);
    try {
      const res = await salesActivityAPI.exportCsv({
        from: fromDate, to: toDate,
        repId: selectedRep || undefined, outcome: outcome || undefined
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales-activity_${fromDate}_to_${toDate}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Could not export the activity log');
    } finally {
      setExporting(false);
    }
  };
  const selectedName = reps.find((r) => r.repId === selectedRep)?.repName;
  const secondsSinceUpdate = updatedAt ? Math.floor((Date.now() - updatedAt) / 1000) : null;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 py-5 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Team Activity</h1>
              <p className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                <span className="relative flex h-2 w-2">
                  {!error && <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${error ? 'bg-red-500' : 'bg-emerald-500'}`} />
                </span>
                {error
                  ? 'Connection problem — retrying'
                  : `Live · updated ${secondsSinceUpdate != null && secondsSinceUpdate > 5 ? timeAgo(secondsSinceUpdate) : 'just now'}`}
              </p>
            </div>
            <button
              onClick={() => load({ manual: true })}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile icon={Target} label="Contacts today" value={`${totalToday} / ${totalDailyTarget}`} sub="whole team" />
            <StatTile icon={Users} label="Reps who have logged" value={`${activeReps} / ${reps.length}`}
              sub={reps.length - activeReps > 0 ? `${reps.length - activeReps} yet to log today` : 'everyone is active'}
              tone={reps.length - activeReps > 0 ? 'amber' : 'red'} />
            <StatTile icon={AlertTriangle} label="Overdue follow-ups" value={summary?.totals?.overdueFollowUps ?? 0}
              tone={(summary?.totals?.overdueFollowUps ?? 0) > 0 ? 'amber' : 'red'} />
            <StatTile icon={DollarSign} label="Open pipeline"
              value={`$${(summary?.totals?.pipelineValue ?? 0).toLocaleString()}`} sub="latest quote per client" />
          </div>

          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Reps — tap one to filter the feed</h2>
            {reps.length === 0 ? (
              <p className="bg-white rounded-2xl border border-gray-100 p-4 text-sm text-gray-500">No sales reps found.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {reps.map((r) => {
                  const selected = selectedRep === r.repId;
                  const weekExpected = r.dailyTarget * elapsed;
                  return (
                    <button
                      key={r.repId}
                      onClick={() => setSelectedRep(selected ? null : r.repId)}
                      className={`text-left bg-white rounded-2xl border shadow-sm p-4 transition-colors ${selected ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-100 hover:border-gray-200'}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{r.repName}</p>
                          <p className={`text-xs ${r.loggedToday === 0 ? 'text-amber-700 font-medium' : 'text-gray-500'}`}>
                            {r.lastLoggedSecondsAgo == null ? 'Has never logged' : `Last log ${timeAgo(r.lastLoggedSecondsAgo)}`}
                          </p>
                        </div>
                        {r.overdueFollowUps > 0 && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-700 whitespace-nowrap">
                            {r.overdueFollowUps} overdue
                          </span>
                        )}
                      </div>
                      <div className="space-y-2.5">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500">Today</span>
                            <span className="font-semibold text-gray-800 tabular-nums">{r.loggedToday} / {r.dailyTarget}</span>
                          </div>
                          <MiniBar done={r.loggedToday} target={r.dailyTarget} expected={dailyExpectedNow(r.dailyTarget)} />
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-500">This week</span>
                            <span className="font-semibold text-gray-800 tabular-nums">{r.contactsLogged} / {r.periodTarget}</span>
                          </div>
                          <MiniBar done={r.contactsLogged} target={r.periodTarget} expected={weekExpected} />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <h2 className="text-sm font-semibold text-gray-700">{rangeLabel} ({total})</h2>
              {selectedRep && (
                <button
                  onClick={() => setSelectedRep(null)}
                  className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-700 hover:bg-red-100"
                >
                  {selectedName} <X className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 p-3 mb-3 flex flex-wrap items-end gap-3">
              <label className="text-xs text-gray-500">
                From
                <input
                  type="date" value={fromDate} max={toDate}
                  onChange={(e) => e.target.value && setFromDate(e.target.value)}
                  className="block mt-1 px-2.5 py-2 rounded-lg border border-gray-200 text-sm text-gray-900"
                />
              </label>
              <label className="text-xs text-gray-500">
                To
                <input
                  type="date" value={toDate} min={fromDate} max={summary?.today}
                  onChange={(e) => e.target.value && setToDate(e.target.value)}
                  className="block mt-1 px-2.5 py-2 rounded-lg border border-gray-200 text-sm text-gray-900"
                />
              </label>
              <label className="text-xs text-gray-500">
                Outcome
                <select
                  value={outcome} onChange={(e) => setOutcome(e.target.value)}
                  className="block mt-1 px-2.5 py-2 rounded-lg border border-gray-200 text-sm text-gray-900 bg-white"
                >
                  <option value="">All outcomes</option>
                  {Object.keys(OUTCOME_STYLES).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
              <div className="flex items-center gap-2 ml-auto">
                {!isToday && (
                  <button
                    onClick={() => { setFromDate(summary.today); setToDate(summary.today); }}
                    className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Today
                  </button>
                )}
                <button
                  onClick={exportCsv} disabled={exporting || total === 0}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
                >
                  {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Export CSV
                </button>
              </div>
            </div>
            {shownFeed.length === 0 ? (
              <p className="bg-white rounded-2xl border border-gray-100 p-4 text-sm text-gray-500">
                {selectedRep || outcome || !isToday ? 'No activity matches these filters.' : 'Nothing logged yet today. New entries appear here automatically.'}
              </p>
            ) : (
              <div className="space-y-2">
                {shownFeed.map((a) => {
                  const open = expanded === a.id;
                  return (
                    <div
                      key={a.id}
                      onClick={() => setExpanded(open ? null : a.id)}
                      className={`bg-white rounded-2xl border p-4 cursor-pointer transition-colors duration-700 ${fresh.has(a.id) ? 'border-emerald-300 bg-emerald-50/60' : 'border-gray-100'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{a.client_name}</p>
                          <p className="text-xs text-gray-500">
                            <span className="font-medium text-gray-700">{a.rep_name}</span>
                            {' · '}{a.contact_method}{' · '}{a.client_type}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 whitespace-nowrap">{clockTimeAgo(a.seconds_ago)}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge text={a.outcome} styles={OUTCOME_STYLES} />
                        <Badge text={a.follow_up_status} styles={STATUS_STYLES} />
                        {a.quoted_amount_usd != null && (
                          <span className="text-xs font-medium text-gray-700">${a.quoted_amount_usd.toLocaleString()}</span>
                        )}
                        {a.main_objection && a.main_objection !== 'None' && (
                          <span className="text-xs text-gray-500">Objection: {a.main_objection}</span>
                        )}
                      </div>
                      <p className={`text-sm text-gray-600 mt-2 ${open ? '' : 'line-clamp-2'}`}>{a.feedback_notes}</p>
                      {open && (
                        <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5 text-sm" onClick={(e) => e.stopPropagation()}>
                          <p className="text-gray-700">
                            {a.contact_person}{a.contact_title ? `, ${a.contact_title}` : ''} · {a.line_of_business}
                          </p>
                          {a.next_action && (
                            <p className="text-gray-700">
                              Next: {a.next_action}{a.follow_up_date ? ` (${formatDate(a.follow_up_date)})` : ''}
                            </p>
                          )}
                          <PhoneActions phone={a.phone} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {total > shownFeed.length && (
              <p className="text-xs text-gray-500 mt-3 text-center">
                Showing the latest {shownFeed.length} of {total}. Export CSV to get all of them.
              </p>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
};

export default TeamActivity;
