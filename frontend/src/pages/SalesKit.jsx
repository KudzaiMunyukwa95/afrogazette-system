import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { ratesAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { Copy, Check, MessageSquare } from 'lucide-react';

const FALLBACK_PRICES = {
  groups: { daily: 6, weekly: 28, monthly: 65 },
  channel: { daily: 6, weekly: 28, monthly: 70 }
};
const FALLBACK_BOTH = { daily: 10, weekly: 50, monthly: 127 };
const FALLBACK_FLIGHTS = [
  { key: 'daily', label: 'Daily', days: 1 },
  { key: 'weekly', label: 'Weekly', days: 5 },
  { key: 'monthly', label: 'Monthly', days: 25 }
];

const CopyBlock = ({ title, subtitle, text }) => {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error('Could not copy — select and copy manually');
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <button
          onClick={handleCopy}
          className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            copied ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-700 hover:bg-red-100'
          }`}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="px-4 py-3 text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed bg-gray-50">
        {text}
      </pre>
    </div>
  );
};

const SalesKit = () => {
  const [prices, setPrices] = useState(FALLBACK_PRICES);
  const [bothPrices, setBothPrices] = useState(FALLBACK_BOTH);
  const [flights, setFlights] = useState(FALLBACK_FLIGHTS);

  useEffect(() => {
    ratesAPI.get()
      .then(res => {
        const { flights: f, prices: p, bothPrices: b } = res.data.data;
        if (f) setFlights(f);
        if (p) setPrices(p);
        if (b) setBothPrices(b);
      })
      .catch(() => {});
  }, []);

  const g = prices.groups || FALLBACK_PRICES.groups;
  const c = prices.channel || FALLBACK_PRICES.channel;
  const b = bothPrices || FALLBACK_BOTH;
  const gMonthDays = flights.find(f => f.key === 'monthly')?.days || 25;
  const cMonthDays = gMonthDays;
  const gWeekDays = flights.find(f => f.key === 'weekly')?.days || 5;
  const gWeekEach = (g.weekly / gWeekDays).toFixed(2);
  const cWeekEach = (c.weekly / gWeekDays).toFixed(2);
  const gMonthEach = (g.monthly / gMonthDays).toFixed(2);
  const cMonthEach = (c.monthly / cMonthDays).toFixed(2);

  const rateCardMessage = `*AFROGAZETTE ADVERTISING*
_300 WhatsApp groups + 40,000-follower channel_

*IN THE GROUPS*
Daily (1 advert) — $${g.daily}
Weekly (${gWeekDays} adverts / ${gWeekDays} days) — $${g.weekly} _($${gWeekEach} each)_
Monthly (${gMonthDays} adverts / ${gMonthDays} days) — $${g.monthly} _($${gMonthEach} each)_

*IN THE CHANNEL*
Daily (1 advert) — $${c.daily}
Weekly (${gWeekDays} adverts / ${gWeekDays} days) — $${c.weekly} _($${cWeekEach} each)_
Monthly (${cMonthDays} adverts / ${cMonthDays} days) — $${c.monthly} _($${cMonthEach} each)_

*BOTH — Monthly (${gMonthDays + cMonthDays} adverts) — $${b.monthly}*

*We write and format your advert free.*
EcoCash or InnBucks.

*Reply to book.*`;

  const inGroupInvite = `*Do you have a business that nobody knows about?*

You're reading this in one of our 300 WhatsApp groups. So are thousands of other people — and some of them are looking for exactly what you sell.

*One advert is $${g.daily}.* ${gMonthDays} adverts across a full month is *$${g.monthly}* — $${gMonthEach} each.

We write and format it for you, free.

*Reply here or WhatsApp 0778 826 661*`;

  const tradeSpecificDM = `*Selling spare parts in Harare?*

Right now somebody is in a WhatsApp group asking where to find a part you have in stock. They'll buy from whoever they see first.

We put your advert in front of *300 groups* — one for *$${g.daily}*, or ${gMonthDays} across the month for *$${g.monthly}*.

We write it for you, free.

Reply *PARTS* and I'll send you the rate card.`;

  const winBackMessage = `Mhoroi [Name], it's [Your name] from AfroGazette.

You advertised with us in [month]. Two things changed since then:

We write and format every advert professionally now, free — so people actually stop and read it.

And our price came down: *one advert is $${g.daily}* now, or ${gMonthDays} across the month for *$${g.monthly} in the groups* (*$${c.monthly}* on the channel) — an advert almost every working day.

Shall I book you in for [next month]?`;

  const fillSlotOffer = `Morning [Name], [Your name] from AfroGazette.

We have *slots still open for tomorrow* across our 300 groups.

I can give you one at *$5* instead of $${g.daily} — but only if you confirm today, because tomorrow it's gone.

Want me to hold one for you?`;

  const objections = [
    {
      q: 'Can you do $5?',
      a: `Almost there already — one advert is $${g.daily}. On the ${gWeekDays}-pack it's $${gWeekEach} each, and the full month is ${gMonthDays} adverts for $${g.monthly} in the groups, $${c.monthly} on the channel — almost every working day. Want me to put you on the week instead of just one day?`
    },
    {
      q: 'Others are charging less than you.',
      a: `Which one, and what did they quote? Most of them have twenty or thirty groups and run far more adverts a day than we do. We're 300 groups, capped so yours is actually seen, and we write it for you — for $${g.daily}.`
    },
    {
      q: 'Let me think about it.',
      a: `Of course. Rather than think about it, test it — one advert is $${g.daily}. If nobody contacts you, you've lost $${g.daily} and you'll know. If they do, you already know what to do next.`
    },
    {
      q: 'Does it actually work?',
      a: `I can't promise you customers — nobody honest can. What I can promise is that your advert goes to 300 groups and 40,000 followers, written properly, on the days you paid for. Clients who do well with us run a pack, not one advert — people need to see a name more than once.`
    },
    {
      q: 'But I paid $5 a day last time.',
      a: `You did — we had two rate cards running and we've fixed that. Our new price is $${g.daily}, close to what you paid, and this time every advert is written and formatted for you at no extra cost.`
    }
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b">
          <div className="px-4 py-4">
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-6 w-6 text-red-500" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Sales Kit</h1>
                <p className="text-sm text-gray-600">
                  Copy-ready messages, always matching the live rate card — no more quoting an old price.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-6 max-w-3xl">
          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Rate card</h2>
            <CopyBlock
              title="Full rate card"
              subtitle="When a client asks 'how much?'"
              text={rateCardMessage}
            />
          </div>

          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Fill-rate slots</h2>
            <CopyBlock
              title="Fill-slot offer"
              subtitle="Send every morning to past clients — never quote this as your first price"
              text={fillSlotOffer}
            />
          </div>

          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Outreach templates</h2>
            <div className="space-y-3">
              <CopyBlock title="In-group invitation" subtitle="Once a week in our own groups, never twice in the same week" text={inGroupInvite} />
              <CopyBlock title="Direct message — trade specific" subtitle="Swap the trade in the first line" text={tradeSpecificDM} />
              <CopyBlock title="Win back a past client" subtitle="For clients who booked once and never returned" text={winBackMessage} />
            </div>
          </div>

          <div>
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">When they push back</h2>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {objections.map((o, i) => (
                <div key={i} className="p-4">
                  <p className="text-sm font-semibold text-red-700 italic mb-1.5">"{o.q}"</p>
                  <p className="text-sm text-gray-700">{o.a}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-amber-900 mb-2">Non-negotiable</h3>
            <ul className="text-sm text-amber-800 space-y-1.5 list-disc list-inside">
              <li>${g.daily} is the card floor — never quote below it.</li>
              <li>Discounts buy more adverts, not a lower price.</li>
              <li>Lead with what's included, not the total.</li>
              <li>Log the competitor's name and price whenever a client mentions one.</li>
              <li>Text only — no picture adverts, never send the rate card as an image.</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SalesKit;
