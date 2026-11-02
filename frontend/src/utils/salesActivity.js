// Shared helpers for the Sales Activity pages. The rules themselves are
// enforced on the server (backend/src/utils/salesActivityRules.js) — these
// only mirror the few that change what the form shows.

export const QUOTE_OUTCOMES = ['Quote sent', 'Negotiating', 'Closed - Won'];
export const CLOSED_OUTCOMES = ['Closed - Won', 'Closed - Lost'];
export const CLIENT_TYPE_NEW = 'New client';
export const CLIENT_TYPE_REPEAT = 'Repeat / follow-up';
export const MIN_FEEDBACK_LENGTH = 15;
export const REP_BACKDATE_DAYS = 3;

// "Today" is always the Harare calendar date, whatever the device clock says.
export const todayHarare = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Harare', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());

export const addDays = (dateStr, n) => {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const formatDate = (dateStr) =>
  dateStr
    ? new Date(`${dateStr}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    : '—';

// +263771234567 -> 077 123 4567 ; anything else is shown as stored.
export const formatPhone = (phone) => {
  if (!phone) return '';
  if (phone.startsWith('+263') && phone.length === 13) {
    const d = phone.slice(4);
    return `0${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
  }
  return phone;
};

export const telLink = (phone) => `tel:${phone}`;
export const whatsappLink = (phone) => `https://wa.me/${String(phone).replace(/\D/g, '')}`;

export const STATUS_STYLES = {
  'Overdue': 'bg-red-100 text-red-700',
  'Due today': 'bg-amber-100 text-amber-700',
  'Scheduled': 'bg-blue-100 text-blue-700',
  'Done': 'bg-emerald-100 text-emerald-700',
  'Closed': 'bg-gray-200 text-gray-600',
  'Superseded': 'bg-gray-100 text-gray-500',
  'No follow-up': 'bg-gray-100 text-gray-500'
};

export const OUTCOME_STYLES = {
  'Not reached': 'bg-gray-100 text-gray-600',
  'Reached - not interested': 'bg-gray-100 text-gray-700',
  'Reached - interested': 'bg-blue-100 text-blue-700',
  'Meeting booked': 'bg-indigo-100 text-indigo-700',
  'Quote sent': 'bg-purple-100 text-purple-700',
  'Negotiating': 'bg-amber-100 text-amber-700',
  'Closed - Won': 'bg-emerald-100 text-emerald-700',
  'Closed - Lost': 'bg-red-100 text-red-700'
};

// Daily pace: the day's contacts are expected to build up between 8:00 and
// 17:00, so the pace marker (and the amber warning) follows the clock.
export const dailyExpectedNow = (target) => {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  return Math.round(target * Math.min(1, Math.max(0, (hour - 8) / 9)));
};

export const timeAgo = (seconds) => {
  if (seconds == null) return 'never';
  if (seconds < 60) return 'just now';
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
};

// Wall-clock time (Harare) of something that happened `seconds` ago.
export const clockTimeAgo = (seconds) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Harare', hour: '2-digit', minute: '2-digit'
  }).format(new Date(Date.now() - seconds * 1000));
