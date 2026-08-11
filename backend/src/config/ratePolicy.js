// Single source of truth for advert pricing and commission tiers.
// Edit this file when the rate card changes — the frontend fetches it via
// GET /api/rates rather than hardcoding numbers, so a price change (like
// the channel-monthly correction from $58 to $70) only happens in one place.

// A "flight" is how long/how many posts a booking covers — replaces the old
// text/picture/group-link "advert type" split. Every advert is just a post
// now; only destination (groups/channel) and flight length vary.
const FLIGHTS = [
  { key: 'daily', label: 'Daily', days: 1, posts: 1 },
  { key: 'weekly', label: 'Weekly', days: 5, posts: 5 },
  { key: 'monthly', label: 'Monthly', days: 25, posts: 25 }
];

const PRICES = {
  groups: { daily: 6, weekly: 28, monthly: 65 },
  channel: { daily: 6, weekly: 28, monthly: 70 }
};

// "both" isn't a stored destination_type — a Both booking is created as two
// linked adverts (one groups, one channel) sharing a bundle_ref. These are
// the suggested combined prices shown to reps before the split.
const BOTH_PRICES = { daily: 10, weekly: 50, monthly: 127 };

// Commission scales with how hard the sale actually was to close — a daily
// booking closes itself, a monthly pack is real conversion work.
const COMMISSION_TIERS = [
  { minDays: 15, rate: 0.20 }, // monthly-shaped (25 days)
  { minDays: 3, rate: 0.12 },  // weekly-shaped (5 days)
  { minDays: 0, rate: 0.05 }   // daily
];

const commissionRateForDays = (daysPaid) => {
  const days = parseInt(daysPaid, 10) || 0;
  const tier = COMMISSION_TIERS.find(t => days >= t.minDays);
  return tier ? tier.rate : 0.05;
};

const priceFor = (destinationType, flightKey) => {
  const table = PRICES[destinationType] || PRICES.groups;
  return table[flightKey] ?? null;
};

const flightByKey = (flightKey) => FLIGHTS.find(f => f.key === flightKey) || null;

module.exports = {
  FLIGHTS,
  PRICES,
  BOTH_PRICES,
  COMMISSION_TIERS,
  commissionRateForDays,
  priceFor,
  flightByKey
};
