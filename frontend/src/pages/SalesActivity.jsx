import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import Pagination from '../components/Pagination';
import PhoneActions from '../components/PhoneActions';
import SalesTargetBar from '../components/SalesTargetBar';
import { salesActivityAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import TeamActivity from './TeamActivity';
import { STATUS_STYLES, OUTCOME_STYLES, formatDate, dailyExpectedNow } from '../utils/salesActivity';
import { Plus, Pencil, PhoneCall, CalendarClock, Loader2 } from 'lucide-react';

const Badge = ({ text, styles }) => (
  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${styles[text] || 'bg-gray-100 text-gray-600'}`}>
    {text}
  </span>
);

const RepSalesActivity = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();

  const [progress, setProgress] = useState(null);
  const [followUps, setFollowUps] = useState([]);
  const [activities, setActivities] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0, limit: 15 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  // Admins see everyone's data from these endpoints unless told otherwise;
  // this page is "my" activity, so always pin it to the signed-in user.
  const repId = user?.id;

  const loadTop = useCallback(async () => {
    try {
      const [p, f] = await Promise.all([
        salesActivityAPI.getProgress({ repId }),
        salesActivityAPI.getFollowUps({ repId })
      ]);
      setProgress(p.data.data);
      setFollowUps(f.data.data.followUps);
    } catch (err) {
      toast.error('Could not load your progress');
    }
  }, [repId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadList = useCallback(async () => {
    try {
      const res = await salesActivityAPI.list({ repId, page, limit: 15 });
      setActivities(res.data.data.activities);
      setPagination(res.data.data.pagination);
    } catch (err) {
      toast.error('Could not load your activity');
    }
  }, [repId, page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!repId) return;
    Promise.all([loadTop(), loadList()]).finally(() => setLoading(false));
  }, [repId, loadTop, loadList]);

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      </Layout>
    );
  }

  const daily = progress?.daily;
  const weekly = progress?.weekly;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Sales Activity</h1>
            <button
              onClick={() => navigate('/sales-activity/new')}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 shadow-sm"
            >
              <Plus className="h-5 w-5" /> Log activity
            </button>
          </div>

          {progress && (
            <div className="grid gap-3 md:grid-cols-2">
              <SalesTargetBar
                label="Today's contacts"
                done={daily.done}
                target={daily.target}
                expectedByNow={dailyExpectedNow(daily.target)}
                caption={`${daily.remaining} more to reach today's ${daily.target}`}
              />
              <SalesTargetBar
                label="This week"
                done={weekly.done}
                target={weekly.target}
                expectedByNow={weekly.expectedByNow}
                caption={weekly.done < weekly.expectedByNow
                  ? `${weekly.expectedByNow - weekly.done} behind pace — ${weekly.remaining} to go this week`
                  : `${weekly.remaining} to go this week`}
              />
            </div>
          )}

          <section>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <CalendarClock className="h-4 w-4 text-red-600" />
              Follow-ups due ({followUps.length})
            </h2>
            {followUps.length === 0 ? (
              <p className="bg-white rounded-2xl border border-gray-100 p-4 text-sm text-gray-500">
                Nothing due today and nothing overdue.
              </p>
            ) : (
              <div className="space-y-2">
                {followUps.map((f) => (
                  <div key={f.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{f.client_name}</p>
                        <p className="text-sm text-gray-500 truncate">
                          {f.contact_person}{f.contact_title ? `, ${f.contact_title}` : ''}
                        </p>
                      </div>
                      <Badge text={f.follow_up_status} styles={STATUS_STYLES} />
                    </div>
                    <p className="text-sm text-gray-700 mt-2">{f.next_action}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Follow-up date {formatDate(f.follow_up_date)}</p>
                    <div className="flex items-center justify-between gap-2 mt-3 flex-wrap">
                      <PhoneActions phone={f.phone} />
                      <button
                        onClick={() => navigate(`/sales-activity/new?clientId=${f.client_id}`)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-sm font-medium hover:bg-red-100"
                      >
                        <PhoneCall className="h-4 w-4" /> Log follow-up
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">My activity</h2>
            {activities.length === 0 ? (
              <p className="bg-white rounded-2xl border border-gray-100 p-4 text-sm text-gray-500">
                You haven't logged any contacts yet. Tap “Log activity” after your next call.
              </p>
            ) : (
              <div className="space-y-2">
                {activities.map((a) => (
                  <div key={a.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{a.client_name}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(a.activity_date)} · {a.contact_method} · {a.client_type}
                        </p>
                      </div>
                      <button
                        onClick={() => navigate(`/sales-activity/${a.id}/edit`)}
                        className="p-2 -m-1 text-gray-400 hover:text-gray-700"
                        aria-label="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <Badge text={a.outcome} styles={OUTCOME_STYLES} />
                      <Badge text={a.follow_up_status} styles={STATUS_STYLES} />
                      {a.quoted_amount_usd != null && (
                        <span className="text-xs font-medium text-gray-700">${a.quoted_amount_usd.toLocaleString()}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{a.feedback_notes}</p>
                  </div>
                ))}
              </div>
            )}
            {pagination.totalPages > 1 && (
              <div className="mt-3">
                <Pagination
                  currentPage={page}
                  totalPages={pagination.totalPages}
                  total={pagination.total}
                  limit={pagination.limit}
                  onPageChange={setPage}
                />
              </div>
            )}
          </section>
        </div>
      </div>
    </Layout>
  );
};

// Admins are the managers: they get the live team view instead of a personal log.
const SalesActivity = () => {
  const { user } = useAuth();
  return user?.role === 'admin' ? <TeamActivity /> : <RepSalesActivity />;
};

export default SalesActivity;
