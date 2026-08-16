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
// booking closes itself, a monthly pack is real conversion work. Custom-length
// bookings (negotiated deals outside the three standard flights) are common
// enough that a flat step function was unfair: a 4-day and a 14-day booking
// used to earn the identical rate. This anchors the rate at exactly 5% / 12% /
// 20% at the three real flight lengths (1 / 5 / 25 days) and interpolates
// linearly between them for anything in between, so standard bookings are
// completely unaffected and custom lengths get a proportional rate instead
// of being rounded into whichever bucket they happen to fall in.
const COMMISSION_ANCHORS = [
  { days: 1, rate: 0.05 },
  { days: 5, rate: 0.12 },
  { days: 25, rate: 0.20 }
];

const commissionRateForDays = (daysPaid) => {
  const days = parseInt(daysPaid, 10) || 0;
  const first = COMMISSION_ANCHORS[0];
  const last = COMMISSION_ANCHORS[COMMISSION_ANCHORS.length - 1];
  if (days <= first.days) return first.rate;
  if (days >= last.days) return last.rate;

  for (let i = 0; i < COMMISSION_ANCHORS.length - 1; i++) {
    const lo = COMMISSION_ANCHORS[i];
    const hi = COMMISSION_ANCHORS[i + 1];
    if (days >= lo.days && days <= hi.days) {
      const progress = (days - lo.days) / (hi.days - lo.days);
      return lo.rate + progress * (hi.rate - lo.rate);
    }
  }
  return first.rate;
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
  COMMISSION_ANCHORS,
  commissionRateForDays,
  priceFor,
  flightByKey
};
