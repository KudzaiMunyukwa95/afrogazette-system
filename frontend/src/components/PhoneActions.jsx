import React from 'react';
import { Phone, MessageCircle } from 'lucide-react';
import { formatPhone, telLink, whatsappLink } from '../utils/salesActivity';

// Tap-to-call and tap-to-WhatsApp for a stored international number.
const PhoneActions = ({ phone }) => {
  if (!phone) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-gray-700 tabular-nums">{formatPhone(phone)}</span>
      <a
        href={telLink(phone)}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200"
      >
        <Phone className="h-3.5 w-3.5" /> Call
      </a>
      <a
        href={whatsappLink(phone)}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100"
      >
        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
      </a>
    </div>
  );
};

export default PhoneActions;
