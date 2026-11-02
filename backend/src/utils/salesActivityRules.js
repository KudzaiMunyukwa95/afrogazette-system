// Pure business rules for the Sales Activity Log — no database, no Express —
// so validation, the derived follow-up status and the summary maths can be
// tested directly. Dates are plain 'YYYY-MM-DD' strings throughout: "today"
// is a calendar date in Africa/Harare, and comparing strings avoids every
// server-timezone bug that comparing Date objects would bring.

const { normalizeContactPhone } = require('./phone');

const TIME_ZONE = 'Africa/Harare';

const OUTCOME = {
  NOT_REACHED: 'Not reached',
  MEETING_BOOKED: 'Meeting booked',
  QUOTE_SENT: 'Quote sent',
  NEGOTIATING: 'Negotiating',
  WON: 'Closed - Won',
  LOST: 'Closed - Lost'
};

// Outcomes that may carry a quoted amount.
const QUOTE_OUTCOMES = [OUTCOME.QUOTE_SENT, OUTCOME.NEGOTIATING, OUTCOME.WON];
const CLOSED_OUTCOMES = [OUTCOME.WON, OUTCOME.LOST];
const PIPELINE_OUTCOMES = [OUTCOME.QUOTE_SENT, OUTCOME.NEGOTIATING];

const CLIENT_TYPE = { NEW: 'New client', REPEAT: 'Repeat / follow-up' };

const MIN_FEEDBACK_LENGTH = 15;
const REP_BACKDATE_DAYS = 3;
const DEFAULT_DAILY_TARGET = 10;
const DEFAULT_WORKING_DAYS = 6; // Monday-Saturday

// Fields whose changes are written to the audit history.
const AUDITED_FIELDS = [
  'activity_date', 'client_id', 'contact_person', 'contact_title', 'line_of_business',
  'phone', 'email', 'contact_method', 'product_pitched', 'client_type', 'outcome',
  'quoted_amount_usd', 'feedback_notes', 'main_objection', 'next_action', 'follow_up_date'
];

// Fields validated against an admin-editable dropdown list.
const LIST_FIELDS = {
  line_of_business: 'line_of_business',
  contact_method: 'contact_method',
  product_pitched: 'product_pitched',
  client_type: 'client_type',
  outcome: 'outcome',
  main_objection: 'main_objection'
};

// ---------------------------------------------------------------- dates

const todayInHarare = (now = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(now);

const isDateString = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
  && !Number.isNaN(Date.parse(`${s}T00:00:00Z`))
  && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;

const addDays = (dateStr, n) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// 0 = Monday ... 6 = Sunday
const weekdayIndex = (dateStr) => (new Date(`${dateStr}T00:00:00Z`).getUTCDay() + 6) % 7;

// Monday-to-Sunday week containing dateStr.
const weekBounds = (dateStr) => {
  const start = addDays(dateStr, -weekdayIndex(dateStr));
  return { start, end: addDays(start, 6) };
};

// Working days are the first N days of the week from Monday (6 = Mon-Sat).
const countWorkingDays = (from, to, workingDays = DEFAULT_WORKING_DAYS) => {
  let count = 0;
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (weekdayIndex(d) < workingDays) count += 1;
  }
  return count;
};

// ---------------------------------------------------------------- follow-up status

// Derived, never typed. `isLatest` is false when the same client has since
// been contacted again: the older row's follow-up has been acted on, so it
// must not sit at OVERDUE forever and inflate the overdue count.
const followUpStatus = ({ outcome, follow_up_date: followUpDate }, today, { isLatest = true } = {}) => {
  if (outcome === OUTCOME.WON) return 'Done';
  if (outcome === OUTCOME.LOST) return 'Closed';
  if (!isLatest) return 'Superseded';
  if (!followUpDate) return 'No follow-up';
  if (followUpDate < today) return 'Overdue';
  if (followUpDate === today) return 'Due today';
  return 'Scheduled';
};

// ---------------------------------------------------------------- validation

const blank = (v) => v === undefined || v === null || String(v).trim() === '';
const str = (v) => (blank(v) ? null : String(v).trim());
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate and normalise a sales activity payload.
 *
 * ctx:
 *  - today:    'YYYY-MM-DD' in Africa/Harare
 *  - isAdmin:  admins may back-date without limit; reps only REP_BACKDATE_DAYS
 *  - options:  { list_key: [active labels] } for dropdown validation
 *  - existing: the stored row when editing — an unchanged date or dropdown
 *              value is never re-rejected (otherwise an old entry, or one
 *              using a since-retired option, could never be edited again)
 *
 * Returns { errors: { field: message }, value: normalised fields }.
 */
const validateActivity = (input, ctx) => {
  const { today, isAdmin = false, options = {}, existing = null } = ctx;
  const errors = {};
  const v = {};

  // date
  v.activity_date = str(input.activity_date);
  if (!v.activity_date) errors.activity_date = 'Date is required';
  else if (!isDateString(v.activity_date)) errors.activity_date = 'Date must be YYYY-MM-DD';
  else if (v.activity_date > today) errors.activity_date = 'Date cannot be in the future';
  else if (!isAdmin && v.activity_date < addDays(today, -REP_BACKDATE_DAYS)
    && !(existing && existing.activity_date === v.activity_date)) {
    errors.activity_date = `You can only back-date up to ${REP_BACKDATE_DAYS} days`;
  }

  // client
  v.client_id = Number.parseInt(input.client_id, 10);
  if (!Number.isInteger(v.client_id) || v.client_id <= 0) errors.client_id = 'Client is required';

  // free text
  v.contact_person = str(input.contact_person);
  if (!v.contact_person) errors.contact_person = 'Contact person is required';
  v.contact_title = str(input.contact_title);

  v.email = str(input.email);
  if (v.email && !EMAIL_RE.test(v.email)) errors.email = 'Email is not valid';

  // phone — stored in international format
  if (blank(input.phone)) errors.phone = 'Phone number is required';
  else {
    v.phone = normalizeContactPhone(input.phone);
    if (!v.phone) errors.phone = 'Enter a valid phone number (e.g. 0771234567 or +263771234567)';
  }

  // dropdowns
  for (const [field, listKey] of Object.entries(LIST_FIELDS)) {
    v[field] = str(input[field]);
    const required = field !== 'product_pitched' && field !== 'main_objection';
    if (!v[field]) {
      if (required) errors[field] = 'This field is required';
      continue;
    }
    const unchanged = existing && existing[field] === v[field];
    const allowed = options[listKey];
    if (allowed && !allowed.includes(v[field]) && !unchanged) errors[field] = 'Choose a value from the list';
  }

  // feedback
  v.feedback_notes = str(input.feedback_notes);
  if (!v.feedback_notes) errors.feedback_notes = 'Feedback notes are required';
  else if (v.feedback_notes.length < MIN_FEEDBACK_LENGTH) {
    errors.feedback_notes = `Feedback must be at least ${MIN_FEEDBACK_LENGTH} characters — say what the client actually said`;
  }

  // quoted amount
  if (blank(input.quoted_amount_usd)) v.quoted_amount_usd = null;
  else {
    const amount = Number(input.quoted_amount_usd);
    if (!Number.isFinite(amount) || amount < 0) errors.quoted_amount_usd = 'Quoted amount must be 0 or more (USD)';
    else if (v.outcome && !QUOTE_OUTCOMES.includes(v.outcome)) {
      errors.quoted_amount_usd = 'A quoted amount is only allowed for Quote sent, Negotiating or Closed - Won';
    } else v.quoted_amount_usd = Math.round(amount * 100) / 100;
  }

  // next action + follow-up: required unless the deal is closed
  const closed = CLOSED_OUTCOMES.includes(v.outcome);
  v.next_action = str(input.next_action);
  v.follow_up_date = str(input.follow_up_date);
  if (!closed) {
    if (!v.next_action) errors.next_action = 'Next action is required';
    if (!v.follow_up_date) errors.follow_up_date = 'Follow-up date is required';
  }
  if (v.follow_up_date) {
    if (!isDateString(v.follow_up_date)) errors.follow_up_date = 'Follow-up date must be YYYY-MM-DD';
    else if (v.activity_date && isDateString(v.activity_date) && v.follow_up_date < v.activity_date) {
      errors.follow_up_date = 'Follow-up date cannot be before the activity date';
    }
  }

  return { errors, value: v };
};

// ---------------------------------------------------------------- permissions

const canViewActivity = (user, activity) =>
  user.role === 'admin' || activity.rep_user_id === user.id;

// Withdrawn entries are frozen — they exist for the audit trail only.
const canEditActivity = (user, activity) =>
  !activity.is_withdrawn && canViewActivity(user, activity);

// ---------------------------------------------------------------- audit

const auditValue = (v) => (v === null || v === undefined ? null : String(v));

// Field-level diff between the stored row and the validated update.
const diffActivity = (before, after) =>
  AUDITED_FIELDS
    .filter((f) => f in after && auditValue(before[f]) !== auditValue(after[f]))
    .map((f) => ({ field: f, old_value: auditValue(before[f]), new_value: auditValue(after[f]) }));

// ---------------------------------------------------------------- summaries

// Latest non-withdrawn row per client (by date, then id) — the client's
// current position in the pipeline.
const latestPerClient = (rows) => {
  const latest = new Map();
  for (const r of rows) {
    const cur = latest.get(r.client_id);
    if (!cur || r.activity_date > cur.activity_date
      || (r.activity_date === cur.activity_date && r.id > cur.id)) latest.set(r.client_id, r);
  }
  return [...latest.values()];
};

const num = (v) => Number(v) || 0;

/**
 * Activity counts for a set of rows (already limited to the period and rep).
 * `snapshotRows` is every non-withdrawn row for the same rep(s); pipeline and
 * overdue are point-in-time positions (each client's latest row), not
 * period counts, so they come from there instead.
 */
const summarize = (rows, snapshotRows, today) => {
  const current = latestPerClient(snapshotRows);
  return {
    contactsLogged: rows.length,
    contactsReached: rows.filter((r) => r.outcome !== OUTCOME.NOT_REACHED).length,
    meetingsBooked: rows.filter((r) => r.outcome === OUTCOME.MEETING_BOOKED).length,
    quotesSent: rows.filter((r) => r.outcome === OUTCOME.QUOTE_SENT).length,
    dealsWon: rows.filter((r) => r.outcome === OUTCOME.WON).length,
    valueWon: rows.filter((r) => r.outcome === OUTCOME.WON).reduce((s, r) => s + num(r.quoted_amount_usd), 0),
    newClients: rows.filter((r) => r.client_type === CLIENT_TYPE.NEW).length,
    repeatClients: rows.filter((r) => r.client_type === CLIENT_TYPE.REPEAT).length,
    pipelineValue: current
      .filter((r) => PIPELINE_OUTCOMES.includes(r.outcome))
      .reduce((s, r) => s + num(r.quoted_amount_usd), 0),
    overdueFollowUps: current.filter((r) => followUpStatus(r, today) === 'Overdue').length
  };
};

// Daily + weekly progress against target. `expectedByNow` is how many
// contacts the week's pace calls for so far, which drives the bar colour.
const targetProgress = ({ loggedToday, loggedThisWeek, dailyTarget, today, workingDays = DEFAULT_WORKING_DAYS }) => {
  const pct = (done, target) => (target > 0 ? Math.round((done / target) * 100) : null);
  const weeklyTarget = dailyTarget * workingDays;
  const elapsedWorkingDays = Math.min(weekdayIndex(today) + 1, workingDays);
  return {
    daily: { target: dailyTarget, done: loggedToday, percent: pct(loggedToday, dailyTarget), remaining: Math.max(0, dailyTarget - loggedToday) },
    weekly: {
      target: weeklyTarget,
      done: loggedThisWeek,
      percent: pct(loggedThisWeek, weeklyTarget),
      remaining: Math.max(0, weeklyTarget - loggedThisWeek),
      expectedByNow: dailyTarget * elapsedWorkingDays,
      hit: weeklyTarget > 0 && loggedThisWeek >= weeklyTarget
    }
  };
};

module.exports = {
  TIME_ZONE, OUTCOME, QUOTE_OUTCOMES, CLOSED_OUTCOMES, PIPELINE_OUTCOMES, CLIENT_TYPE,
  MIN_FEEDBACK_LENGTH, REP_BACKDATE_DAYS, DEFAULT_DAILY_TARGET, DEFAULT_WORKING_DAYS,
  AUDITED_FIELDS, LIST_FIELDS,
  todayInHarare, isDateString, addDays, weekdayIndex, weekBounds, countWorkingDays,
  followUpStatus, validateActivity, canViewActivity, canEditActivity,
  diffActivity, latestPerClient, summarize, targetProgress
};
