import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import SalesClientPicker from '../components/SalesClientPicker';
import { salesActivityAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import {
  QUOTE_OUTCOMES, CLOSED_OUTCOMES, MIN_FEEDBACK_LENGTH, REP_BACKDATE_DAYS, CLIENT_TYPE_NEW, CLIENT_TYPE_REPEAT,
  todayHarare, addDays
} from '../utils/salesActivity';
import { ArrowLeft, AlertTriangle, Loader2 } from 'lucide-react';

const inputClass = (error) =>
  `block w-full px-3 py-3 border rounded-xl bg-white text-base focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${error ? 'border-red-300' : 'border-gray-300'}`;

const Field = ({ label, error, hint, children }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
    {children}
    {hint && !error && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
  </div>
);

const emptyForm = () => ({
  activity_date: todayHarare(),
  contact_person: '',
  contact_title: '',
  phone: '',
  email: '',
  line_of_business: '',
  contact_method: 'Phone call',
  product_pitched: 'Not yet pitched',
  client_type: CLIENT_TYPE_NEW,
  new_client_name: '',
  outcome: '',
  quoted_amount_usd: '',
  feedback_notes: '',
  main_objection: 'None',
  next_action: '',
  follow_up_date: ''
});

const LogActivity = () => {
  const { id } = useParams(); // present when editing
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const isEdit = Boolean(id);
  const isAdmin = user?.role === 'admin';

  const [options, setOptions] = useState({});
  const [form, setForm] = useState(emptyForm());
  const [client, setClient] = useState(null);
  const [duplicateToday, setDuplicateToday] = useState(false);
  const [existingMatch, setExistingMatch] = useState(null); // a client that already owns the typed phone
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(isEdit || Boolean(searchParams.get('clientId')));
  const [submitting, setSubmitting] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');

  const today = todayHarare();
  const labels = (key) => (options[key] || []).map((o) => o.label);
  // New clients are typed in by name (no search); repeat clients are looked up.
  const isNewClient = !isEdit && form.client_type === CLIENT_TYPE_NEW;
  const closed = CLOSED_OUTCOMES.includes(form.outcome);
  const showAmount = QUOTE_OUTCOMES.includes(form.outcome);

  const set = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  useEffect(() => {
    salesActivityAPI.getOptions()
      .then((res) => setOptions(res.data.data.options))
      .catch(() => toast.error('Could not load the dropdown lists'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pick a client: pull their last contact's details so a repeat contact is
  // a few taps, and flag a same-day duplicate.
  const loadClientContext = async (clientId, date) => {
    try {
      const res = await salesActivityAPI.getClientContext({ clientId, date });
      const { client: c, duplicateToday: dup, lastActivity } = res.data.data;
      setClient(c);
      setDuplicateToday(dup);
      setExistingMatch(null);
      setForm((f) => ({
        ...f,
        client_type: CLIENT_TYPE_REPEAT,
        new_client_name: '',
        contact_person: f.contact_person || lastActivity?.contact_person || c.contact_person || '',
        contact_title: f.contact_title || lastActivity?.contact_title || '',
        phone: f.phone || lastActivity?.phone || c.phone || '',
        email: f.email || lastActivity?.email || c.email || '',
        line_of_business: f.line_of_business || lastActivity?.line_of_business || ''
      }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not load client details');
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        if (isEdit) {
          const res = await salesActivityAPI.getById(id);
          const a = res.data.data.activity;
          setClient({ id: a.client_id, name: a.client_name, company: a.company });
          setForm({
            activity_date: a.activity_date,
            contact_person: a.contact_person || '',
            contact_title: a.contact_title || '',
            phone: a.phone || '',
            email: a.email || '',
            line_of_business: a.line_of_business || '',
            contact_method: a.contact_method || '',
            product_pitched: a.product_pitched || '',
            client_type: a.client_type || '',
            outcome: a.outcome || '',
            quoted_amount_usd: a.quoted_amount_usd ?? '',
            feedback_notes: a.feedback_notes || '',
            main_objection: a.main_objection || '',
            next_action: a.next_action || '',
            follow_up_date: a.follow_up_date || ''
          });
        } else if (searchParams.get('clientId')) {
          await loadClientContext(searchParams.get('clientId'), todayHarare());
        }
      } catch (err) {
        toast.error(err.response?.data?.message || 'Could not load this entry');
        navigate('/sales-activity');
      } finally {
        setLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleClientSelect = (c) => {
    if (!c) {
      setClient(null);
      setDuplicateToday(false);
      return;
    }
    setClient(c);
    loadClientContext(c.id, form.activity_date);
  };

  const submit = async (logAnother = false) => {
    setSubmitting(true);
    setErrors({});
    const payload = {
      ...form,
      client_id: isNewClient ? undefined : client?.id,
      new_client_name: isNewClient ? form.new_client_name : undefined,
      quoted_amount_usd: showAmount ? form.quoted_amount_usd : ''
    };
    try {
      const res = isEdit
        ? await salesActivityAPI.update(id, payload)
        : await salesActivityAPI.create(payload);
      toast.success(isEdit ? 'Entry updated' : 'Activity logged');
      (res.data.data.warnings || []).forEach((w) => toast.warning(w));

      if (logAnother && !isEdit) {
        setForm(emptyForm());
        setClient(null);
        setDuplicateToday(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        navigate('/sales-activity');
      }
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (err.response?.status === 409 && err.response?.data?.code === 'PHONE_EXISTS') {
        // Typed as a new client, but that number already belongs to one.
        setExistingMatch(err.response.data.data.client);
        setErrors({ phone: err.response.data.message });
      } else if (Array.isArray(apiErrors)) {
        setErrors(Object.fromEntries(apiErrors.map((e) => [e.field, e.message])));
        toast.error('Please fix the highlighted fields');
      } else {
        toast.error(err.response?.data?.message || 'Could not save');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const withdraw = async () => {
    try {
      await salesActivityAPI.withdraw(id, withdrawReason);
      toast.success('Entry withdrawn');
      navigate('/sales-activity');
    } catch (err) {
      toast.error(err.response?.data?.errors?.[0]?.message || err.response?.data?.message || 'Could not withdraw');
    }
  };

  const select = (field, key) => (
    <select value={form[field]} onChange={(e) => set(field, e.target.value)} className={inputClass(errors[field])}>
      <option value="">Select…</option>
      {/* keep a since-retired value visible when editing an old entry */}
      {form[field] && !labels(key).includes(form[field]) && <option value={form[field]}>{form[field]}</option>}
      {labels(key).map((l) => <option key={l} value={l}>{l}</option>)}
    </select>
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
      </Layout>
    );
  }

  const feedbackLen = form.feedback_notes.trim().length;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-5 pb-28">
          <button onClick={() => navigate('/sales-activity')} className="flex items-center gap-1 text-sm text-gray-500 mb-3">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <h1 className="text-xl font-bold text-gray-900 mb-4">{isEdit ? 'Edit activity' : 'Log activity'}</h1>

          <form onSubmit={(e) => { e.preventDefault(); submit(false); }} className="space-y-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 md:p-6">
            <Field label="Is this a new client or a follow-up?" error={errors.client_type}>
              <div className="grid grid-cols-2 gap-2">
                {labels('client_type').map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => {
                      set('client_type', l);
                      if (!isEdit) {
                        setClient(null);
                        setDuplicateToday(false);
                        setExistingMatch(null);
                      }
                    }}
                    className={`py-3 rounded-xl border text-sm font-semibold ${form.client_type === l ? 'bg-red-600 border-red-600 text-white' : 'bg-white border-gray-300 text-gray-700'}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </Field>

            {isNewClient ? (
              <Field label="Client / company name" error={errors.new_client_name} hint="No need to search — just type the name. They're added to the system when you save.">
                <input
                  type="text"
                  value={form.new_client_name}
                  onChange={(e) => set('new_client_name', e.target.value)}
                  placeholder="e.g. Zim Fresh Farms"
                  className={inputClass(errors.new_client_name)}
                />
              </Field>
            ) : (
              <Field label="Search for the client" error={errors.client_id}>
                <SalesClientPicker value={client} onSelect={handleClientSelect} error={errors.client_id} disabled={isEdit} />
              </Field>
            )}

            {existingMatch && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-800">
                <p><strong>{existingMatch.name}</strong> already has this number, so they aren't a new client.</p>
                <button
                  type="button"
                  onClick={() => {
                    set('client_type', CLIENT_TYPE_REPEAT);
                    handleClientSelect(existingMatch);
                  }}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium"
                >
                  Log it against {existingMatch.name}
                </button>
              </div>
            )}

            {duplicateToday && (
              <div className="flex gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                You already logged this client on this date. You can still save — just make sure it's a separate contact.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Outcome" error={errors.outcome}>{select('outcome', 'outcome')}</Field>
              <Field label="Contact method" error={errors.contact_method}>{select('contact_method', 'contact_method')}</Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Contact person" error={errors.contact_person}>
                <input type="text" value={form.contact_person} onChange={(e) => set('contact_person', e.target.value)} className={inputClass(errors.contact_person)} />
              </Field>
              <Field label="Position / title (optional)" error={errors.contact_title}>
                <input type="text" value={form.contact_title} onChange={(e) => set('contact_title', e.target.value)} className={inputClass(errors.contact_title)} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone *" error={errors.phone}>
                <input type="tel" inputMode="tel" required value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="0771234567" className={inputClass(errors.phone)} />
              </Field>
              <Field label="Email (optional)" error={errors.email}>
                <input type="email" inputMode="email" value={form.email} onChange={(e) => set('email', e.target.value)} className={inputClass(errors.email)} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Line of business" error={errors.line_of_business}>{select('line_of_business', 'line_of_business')}</Field>
              <Field label="Product pitched" error={errors.product_pitched}>{select('product_pitched', 'product_pitched')}</Field>
            </div>

            {showAmount && (
              <Field label="Quoted amount (USD)" error={errors.quoted_amount_usd}>
                <input type="number" inputMode="decimal" min="0" step="0.01" value={form.quoted_amount_usd} onChange={(e) => set('quoted_amount_usd', e.target.value)} className={inputClass(errors.quoted_amount_usd)} />
              </Field>
            )}

            <Field
              label="What did the client say?"
              error={errors.feedback_notes}
              hint={feedbackLen < MIN_FEEDBACK_LENGTH ? `${feedbackLen}/${MIN_FEEDBACK_LENGTH} characters minimum` : undefined}
            >
              <textarea rows={3} value={form.feedback_notes} onChange={(e) => set('feedback_notes', e.target.value)} className={inputClass(errors.feedback_notes)} />
            </Field>

            <Field label="Main objection" error={errors.main_objection}>{select('main_objection', 'main_objection')}</Field>

            {!closed && (
              <>
                <Field label="Next action" error={errors.next_action}>
                  <input type="text" value={form.next_action} onChange={(e) => set('next_action', e.target.value)} placeholder="e.g. Send rate card on WhatsApp" className={inputClass(errors.next_action)} />
                </Field>
                <Field label="Follow-up date" error={errors.follow_up_date}>
                  <input type="date" value={form.follow_up_date} min={form.activity_date} onChange={(e) => set('follow_up_date', e.target.value)} className={inputClass(errors.follow_up_date)} />
                  <div className="flex gap-2 mt-2">
                    {[['Tomorrow', 1], ['In 3 days', 3], ['Next week', 7]].map(([label, days]) => (
                      <button key={label} type="button" onClick={() => set('follow_up_date', addDays(today, days))} className="px-3 py-1.5 rounded-lg bg-gray-100 text-xs font-medium text-gray-700 hover:bg-gray-200">
                        {label}
                      </button>
                    ))}
                  </div>
                </Field>
              </>
            )}

            <Field
              label="Date of contact"
              error={errors.activity_date}
              hint={isAdmin ? undefined : `You can back-date up to ${REP_BACKDATE_DAYS} days`}
            >
              <input
                type="date"
                value={form.activity_date}
                max={today}
                min={isAdmin ? undefined : addDays(today, -REP_BACKDATE_DAYS)}
                onChange={(e) => set('activity_date', e.target.value)}
                className={inputClass(errors.activity_date)}
              />
            </Field>

            {/* Sticky action bar — sits above the mobile bottom tab bar */}
            <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3">
              <div className="max-w-2xl mx-auto flex gap-2">
                {!isEdit && (
                  <button type="button" disabled={submitting} onClick={() => submit(true)} className="flex-1 py-3 rounded-xl border border-red-600 text-red-600 font-semibold disabled:opacity-50">
                    Save &amp; add another
                  </button>
                )}
                <button type="submit" disabled={submitting} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-50">
                  {submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Save'}
                </button>
              </div>
            </div>
          </form>

          {isEdit && (
            <div className="mt-4 bg-white rounded-2xl border border-gray-100 p-4">
              {!withdrawing ? (
                <button type="button" onClick={() => setWithdrawing(true)} className="text-sm text-red-600 font-medium">
                  Withdraw this entry…
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Entries are never deleted — a withdrawn entry is hidden from lists but kept in the audit history.</p>
                  <input type="text" value={withdrawReason} onChange={(e) => setWithdrawReason(e.target.value)} placeholder="Why is it being withdrawn?" className={inputClass(false)} />
                  <div className="flex gap-2">
                    <button type="button" onClick={withdraw} disabled={withdrawReason.trim().length < 5} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-50">Withdraw</button>
                    <button type="button" onClick={() => setWithdrawing(false)} className="px-4 py-2 rounded-lg bg-gray-100 text-sm font-medium text-gray-700">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default LogActivity;
