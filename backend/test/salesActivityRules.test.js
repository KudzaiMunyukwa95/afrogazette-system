const test = require('node:test');
const assert = require('node:assert/strict');
const rules = require('../src/utils/salesActivityRules');
const { normalizeContactPhone } = require('../src/utils/phone');

const {
  OUTCOME, followUpStatus, validateActivity, canViewActivity, canEditActivity,
  diffActivity, summarize, targetProgress, todayInHarare, weekBounds, countWorkingDays, addDays
} = rules;

const TODAY = '2026-11-04'; // a Wednesday

const options = {
  line_of_business: ['Retail & FMCG', 'Other'],
  contact_method: ['Phone call', 'WhatsApp'],
  product_pitched: ['Banner / display ad', 'Not yet pitched'],
  client_type: ['New client', 'Repeat / follow-up'],
  outcome: ['Not reached', 'Reached - interested', 'Meeting booked', 'Quote sent', 'Negotiating', 'Closed - Won', 'Closed - Lost'],
  main_objection: ['None', 'No budget']
};

const valid = (over = {}) => ({
  activity_date: TODAY,
  client_id: 7,
  contact_person: 'Tendai Moyo',
  line_of_business: 'Retail & FMCG',
  phone: '0771234567',
  contact_method: 'Phone call',
  client_type: 'New client',
  outcome: 'Reached - interested',
  feedback_notes: 'Interested in a banner for December, wants prices',
  next_action: 'Send rate card',
  follow_up_date: '2026-11-06',
  ...over
});

const check = (over, ctx = {}) => validateActivity(valid(over), { today: TODAY, options, ...ctx });

// ------------------------------------------------------------ validation

test('a complete entry passes and the phone is stored in international format', () => {
  const { errors, value } = check();
  assert.deepEqual(errors, {});
  assert.equal(value.phone, '+263771234567');
});

test('every required field is reported when missing', () => {
  const { errors } = validateActivity({}, { today: TODAY, options });
  for (const f of ['activity_date', 'client_id', 'contact_person', 'line_of_business', 'phone',
    'contact_method', 'outcome', 'feedback_notes', 'next_action', 'follow_up_date', 'client_type']) {
    assert.ok(errors[f], `${f} should be required`);
  }
});

test('feedback under 15 characters is rejected, 15 is accepted', () => {
  assert.ok(check({ feedback_notes: 'ok' }).errors.feedback_notes);
  assert.ok(check({ feedback_notes: 'n/a' }).errors.feedback_notes);
  assert.ok(check({ feedback_notes: '12345678901234' }).errors.feedback_notes);
  assert.equal(check({ feedback_notes: '123456789012345' }).errors.feedback_notes, undefined);
  assert.ok(check({ feedback_notes: '   ok            ' }).errors.feedback_notes, 'padding must not count');
});

test('future dates are rejected', () => {
  assert.ok(check({ activity_date: '2026-11-05' }).errors.activity_date);
});

test('reps may back-date 3 days but not 4; admins have no limit', () => {
  assert.equal(check({ activity_date: '2026-11-01', follow_up_date: '2026-11-06' }).errors.activity_date, undefined);
  assert.ok(check({ activity_date: '2026-10-31' }).errors.activity_date);
  assert.equal(check({ activity_date: '2026-10-01' }, { isAdmin: true }).errors.activity_date, undefined);
});

test('editing an old entry does not re-trigger the back-date limit on its unchanged date', () => {
  const existing = { activity_date: '2026-10-01' };
  assert.equal(check({ activity_date: '2026-10-01' }, { existing }).errors.activity_date, undefined);
  assert.ok(check({ activity_date: '2026-10-02' }, { existing }).errors.activity_date);
});

test('quoted amount is only allowed for Quote sent, Negotiating and Closed - Won', () => {
  for (const outcome of ['Quote sent', 'Negotiating', 'Closed - Won']) {
    assert.equal(check({ outcome, quoted_amount_usd: '250.5' }).errors.quoted_amount_usd, undefined, outcome);
  }
  for (const outcome of ['Not reached', 'Reached - interested', 'Meeting booked', 'Closed - Lost']) {
    assert.ok(check({ outcome, quoted_amount_usd: 100 }).errors.quoted_amount_usd, outcome);
  }
});

test('quoted amount must be a non-negative number; blank is fine', () => {
  assert.ok(check({ outcome: 'Quote sent', quoted_amount_usd: -1 }).errors.quoted_amount_usd);
  assert.ok(check({ outcome: 'Quote sent', quoted_amount_usd: 'abc' }).errors.quoted_amount_usd);
  assert.equal(check({ outcome: 'Quote sent', quoted_amount_usd: 0 }).errors.quoted_amount_usd, undefined);
  assert.equal(check({ outcome: 'Not reached', quoted_amount_usd: '' }).errors.quoted_amount_usd, undefined);
});

test('next action and follow-up date are optional only for closed outcomes', () => {
  for (const outcome of ['Closed - Won', 'Closed - Lost']) {
    const { errors } = check({ outcome, next_action: '', follow_up_date: '' });
    assert.equal(errors.next_action, undefined);
    assert.equal(errors.follow_up_date, undefined);
  }
  const open = check({ outcome: 'Negotiating', next_action: '', follow_up_date: '' }).errors;
  assert.ok(open.next_action && open.follow_up_date);
});

test('follow-up date cannot precede the activity date', () => {
  assert.ok(check({ follow_up_date: '2026-11-03' }).errors.follow_up_date);
});

test('dropdown values must come from the active list', () => {
  assert.ok(check({ outcome: 'Made up' }).errors.outcome);
  assert.ok(check({ contact_method: 'Carrier pigeon' }).errors.contact_method);
});

test('a retired option on an existing row can still be saved unchanged', () => {
  const existing = { contact_method: 'Telegram', activity_date: TODAY };
  assert.equal(check({ contact_method: 'Telegram' }, { existing }).errors.contact_method, undefined);
});

test('invalid phone and email are rejected', () => {
  assert.ok(check({ phone: '12345' }).errors.phone);
  assert.ok(check({ email: 'nope' }).errors.email);
});

test('phone normalisation: mobiles, landlines and international numbers', () => {
  assert.equal(normalizeContactPhone('077 123 4567'), '+263771234567');
  assert.equal(normalizeContactPhone('0242123456'), '+263242123456');
  assert.equal(normalizeContactPhone('+27 82 123 4567'), '+27821234567');
  assert.equal(normalizeContactPhone('0027821234567'), '+27821234567');
  assert.equal(normalizeContactPhone('ok'), null);
});

test('a new client can be logged by name alone when new clients are allowed', () => {
  const input = { ...valid({ client_id: undefined }), new_client_name: 'Zim Fresh Farms' };
  const ok = validateActivity(input, { today: TODAY, options, allowNewClient: true });
  assert.deepEqual(ok.errors, {});
  assert.equal(ok.value.new_client_name, 'Zim Fresh Farms');
  assert.equal(ok.value.client_id, null);
});

test('with new clients allowed, neither a client nor a name is an error on the name field', () => {
  const none = validateActivity(valid({ client_id: undefined }), { today: TODAY, options, allowNewClient: true });
  assert.ok(none.errors.new_client_name);
  assert.ok(validateActivity({ ...valid({ client_id: undefined }), new_client_name: 'A' }, { today: TODAY, options, allowNewClient: true }).errors.new_client_name);
});

test('a new-client name is ignored when new clients are not allowed (edits)', () => {
  const r = validateActivity({ ...valid({ client_id: undefined }), new_client_name: 'X Co' }, { today: TODAY, options });
  assert.ok(r.errors.client_id);
});

// ------------------------------------------------------------ derived follow-up status

test('follow-up status is derived from outcome and date, in the documented order', () => {
  const s = (outcome, follow_up_date, opts) => followUpStatus({ outcome, follow_up_date }, TODAY, opts);
  assert.equal(s('Closed - Won', '2026-01-01'), 'Done');
  assert.equal(s('Closed - Lost', '2026-01-01'), 'Closed');
  assert.equal(s('Negotiating', '2026-11-03'), 'Overdue');
  assert.equal(s('Negotiating', TODAY), 'Due today');
  assert.equal(s('Negotiating', '2026-11-05'), 'Scheduled');
  assert.equal(s('Negotiating', null), 'No follow-up');
});

test('a follow-up already acted on by a later contact is Superseded, not Overdue', () => {
  assert.equal(followUpStatus({ outcome: 'Negotiating', follow_up_date: '2026-11-01' }, TODAY, { isLatest: false }), 'Superseded');
  assert.equal(followUpStatus({ outcome: 'Closed - Won', follow_up_date: '2026-11-01' }, TODAY, { isLatest: false }), 'Done');
});

test('"today" is the Africa/Harare calendar date, not UTC', () => {
  // 23:30 UTC on the 4th is 01:30 on the 5th in Harare (UTC+2)
  assert.equal(todayInHarare(new Date('2026-11-04T23:30:00Z')), '2026-11-05');
  assert.equal(todayInHarare(new Date('2026-11-04T21:59:00Z')), '2026-11-04');
});

// ------------------------------------------------------------ permissions

test('reps can view and edit only their own entries; admins any; withdrawn are frozen', () => {
  const rep = { id: 5, role: 'sales_rep' };
  const admin = { id: 1, role: 'admin' };
  assert.equal(canViewActivity(rep, { rep_user_id: 5 }), true);
  assert.equal(canViewActivity(rep, { rep_user_id: 6 }), false);
  assert.equal(canEditActivity(rep, { rep_user_id: 6 }), false);
  assert.equal(canViewActivity(admin, { rep_user_id: 6 }), true);
  assert.equal(canEditActivity(admin, { rep_user_id: 6 }), true);
  assert.equal(canEditActivity(admin, { rep_user_id: 6, is_withdrawn: true }), false);
});

// ------------------------------------------------------------ audit diff

test('audit diff records only fields that actually changed, with old and new values', () => {
  const before = { outcome: 'Quote sent', quoted_amount_usd: 500, next_action: 'Call', follow_up_date: '2026-11-06' };
  const after = { ...before, outcome: 'Negotiating', quoted_amount_usd: 450 };
  assert.deepEqual(diffActivity(before, after), [
    { field: 'outcome', old_value: 'Quote sent', new_value: 'Negotiating' },
    { field: 'quoted_amount_usd', old_value: '500', new_value: '450' }
  ]);
  assert.deepEqual(diffActivity(before, { ...before }), []);
});

// ------------------------------------------------------------ weekly summary maths

test('weeks run Monday to Sunday and working days are Mon-Sat', () => {
  assert.deepEqual(weekBounds('2026-11-04'), { start: '2026-11-02', end: '2026-11-08' });
  assert.deepEqual(weekBounds('2026-11-08'), { start: '2026-11-02', end: '2026-11-08' });
  assert.equal(countWorkingDays('2026-11-02', '2026-11-08'), 6);
  assert.equal(countWorkingDays('2026-11-02', '2026-11-02'), 1);
  assert.equal(addDays('2026-11-30', 1), '2026-12-01');
});

const row = (id, client_id, outcome, extra = {}) => ({
  id, client_id, outcome, activity_date: TODAY, client_type: 'New client',
  quoted_amount_usd: null, follow_up_date: null, ...extra
});

test('summary counts logged, reached, meetings, quotes, wins and value won', () => {
  const rows = [
    row(1, 1, 'Not reached'),
    row(2, 2, 'Reached - interested'),
    row(3, 3, 'Meeting booked'),
    row(4, 4, 'Quote sent', { quoted_amount_usd: 300 }),
    row(5, 5, 'Closed - Won', { quoted_amount_usd: 1200 }),
    row(6, 6, 'Closed - Won', { quoted_amount_usd: 800, client_type: 'Repeat / follow-up' }),
    row(7, 7, 'Closed - Lost')
  ];
  const s = summarize(rows, [], TODAY);
  assert.equal(s.contactsLogged, 7);
  assert.equal(s.contactsReached, 6);
  assert.equal(s.meetingsBooked, 1);
  assert.equal(s.quotesSent, 1);
  assert.equal(s.dealsWon, 2);
  assert.equal(s.valueWon, 2000);
  assert.equal(s.newClients, 6);
  assert.equal(s.repeatClients, 1);
});

test('pipeline value uses each client\'s latest row, so a quote that later closed is not double counted', () => {
  const snapshot = [
    row(1, 1, 'Quote sent', { quoted_amount_usd: 500, activity_date: '2026-11-02' }),
    row(2, 1, 'Closed - Won', { quoted_amount_usd: 500, activity_date: '2026-11-04' }),
    row(3, 2, 'Negotiating', { quoted_amount_usd: 700 }),
    row(4, 3, 'Quote sent', { quoted_amount_usd: 100 })
  ];
  assert.equal(summarize([], snapshot, TODAY).pipelineValue, 800);
});

test('overdue follow-ups count only each client\'s latest open row', () => {
  const snapshot = [
    row(1, 1, 'Negotiating', { follow_up_date: '2026-11-01', activity_date: '2026-10-30' }), // superseded
    row(2, 1, 'Negotiating', { follow_up_date: '2026-11-10', activity_date: '2026-11-03' }), // scheduled
    row(3, 2, 'Reached - interested', { follow_up_date: '2026-11-02' }),                       // overdue
    row(4, 3, 'Reached - interested', { follow_up_date: TODAY }),                              // due today
    row(5, 4, 'Closed - Lost', { follow_up_date: '2026-10-01' })                               // closed
  ];
  assert.equal(summarize([], snapshot, TODAY).overdueFollowUps, 1);
});

test('progress: 10 a day means 60 for a Mon-Sat week, with a pace line', () => {
  const p = targetProgress({ loggedToday: 4, loggedThisWeek: 25, dailyTarget: 10, today: TODAY });
  assert.equal(p.daily.target, 10);
  assert.equal(p.daily.percent, 40);
  assert.equal(p.daily.remaining, 6);
  assert.equal(p.weekly.target, 60);
  assert.equal(p.weekly.percent, 42);
  assert.equal(p.weekly.expectedByNow, 30); // Mon, Tue, Wed elapsed
  assert.equal(p.weekly.hit, false);
  assert.equal(targetProgress({ loggedToday: 10, loggedThisWeek: 60, dailyTarget: 10, today: TODAY }).weekly.hit, true);
});

test('progress: Sunday counts the full working week as elapsed; a zero target never divides by zero', () => {
  assert.equal(targetProgress({ loggedToday: 0, loggedThisWeek: 0, dailyTarget: 10, today: '2026-11-08' }).weekly.expectedByNow, 60);
  const none = targetProgress({ loggedToday: 3, loggedThisWeek: 3, dailyTarget: 0, today: TODAY });
  assert.equal(none.daily.percent, null);
  assert.equal(none.weekly.hit, false);
});
