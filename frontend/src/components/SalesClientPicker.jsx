import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Plus, Building } from 'lucide-react';
import { clientAPI, salesActivityAPI } from '../services/api';
import { formatPhone } from '../utils/salesActivity';

// Pick an existing client, or create a lightweight prospect inline so the
// same company is never entered twice. Deliberately separate from
// ClientAutocomplete: that one creates full clients for advert bookings;
// this one creates prospects, which only need a name and a phone number.
const SalesClientPicker = ({ value, onSelect, error, disabled }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [phone, setPhone] = useState('');
  const [notice, setNotice] = useState(null);
  const wrapperRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const handleChange = (text) => {
    setQuery(text);
    setNotice(null);
    setCreating(false);
    clearTimeout(debounceRef.current);
    if (text.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await clientAPI.search(text.trim());
        setResults(res.data.data.clients);
        setOpen(true);
      } catch (err) {
        console.error('Client search failed:', err);
      } finally {
        setSearching(false);
      }
    }, 250);
  };

  const choose = (client) => {
    setOpen(false);
    setCreating(false);
    setQuery('');
    setResults([]);
    onSelect(client);
  };

  const createProspect = async () => {
    try {
      const res = await salesActivityAPI.createProspect({ name: query.trim(), phone });
      choose(res.data.data.client);
    } catch (err) {
      const data = err.response?.data;
      if (err.response?.status === 409 && data?.data?.client) {
        // The number already belongs to a client — use that one, not a duplicate.
        setNotice({ type: 'info', text: data.message });
        choose(data.data.client);
      } else {
        setNotice({ type: 'error', text: data?.errors?.[0]?.message || data?.message || 'Could not add prospect' });
      }
    }
  };

  if (value) {
    return (
      <div className={`flex items-center justify-between gap-2 px-3 py-2.5 border rounded-xl bg-gray-50 ${error ? 'border-red-300' : 'border-gray-200'}`}>
        <div className="flex items-center gap-2 min-w-0">
          <Building className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="font-medium text-gray-900 truncate">{value.name}</span>
          {value.company && value.company !== value.name && (
            <span className="text-sm text-gray-500 truncate">· {value.company}</span>
          )}
        </div>
        {!disabled && (
          <button type="button" onClick={() => onSelect(null)} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Change client">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search client or company…"
          className={`block w-full pl-10 pr-3 py-3 border rounded-xl bg-white text-base focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 ${error ? 'border-red-300' : 'border-gray-300'}`}
        />
      </div>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {notice && <p className={`mt-1 text-sm ${notice.type === 'error' ? 'text-red-600' : 'text-blue-600'}`}>{notice.text}</p>}

      {open && query.trim().length >= 2 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-auto">
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => choose(c)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
            >
              <p className="font-medium text-gray-900">{c.name}</p>
              <p className="text-xs text-gray-500">
                {[c.company, c.phone && formatPhone(c.phone)].filter(Boolean).join(' · ')}
              </p>
            </button>
          ))}
          {!searching && results.length === 0 && (
            <p className="px-4 py-3 text-sm text-gray-500">No client found for “{query.trim()}”.</p>
          )}
          {!creating ? (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <Plus className="h-4 w-4" /> Add “{query.trim()}” as a new prospect
            </button>
          ) : (
            <div className="p-4 space-y-2 bg-red-50/40">
              <p className="text-sm font-medium text-gray-800">New prospect: {query.trim()}</p>
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Phone, e.g. 0771234567"
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <button
                type="button"
                onClick={createProspect}
                className="w-full py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700"
              >
                Add prospect
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SalesClientPicker;
