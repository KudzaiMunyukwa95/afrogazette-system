import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Plus, X, Phone } from 'lucide-react';
import { clientAPI } from '../services/api';

// A booking now always needs a real client record (see advertController —
// clientId is required), so "no match found" can no longer just mean
// "submit this text as a free-form name." It means: create a real client,
// which means capturing a phone number — that's the field that actually
// stops two reps from creating "Amanda M" and "Madam Amanda" as separate
// people, since a name-only check never catches that.
const ClientAutocomplete = ({ value, onChange, onSelect, error }) => {
    const [query, setQuery] = useState(value || '');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [addingPhoneFor, setAddingPhoneFor] = useState(null); // existing client missing a phone
    const [newPhone, setNewPhone] = useState('');
    const [notice, setNotice] = useState(null); // { type: 'info'|'error', text }
    const wrapperRef = useRef(null);

    useEffect(() => {
        setQuery(value || '');
    }, [value]);

    // Arriving here with a name already prefilled (e.g. from Free Clients,
    // where a client has a name but no resolved id yet) used to just show
    // static text in the box — nothing actually ran until the rep manually
    // clicked or typed, so the "search or create" prompt that's the whole
    // point of this component stayed hidden. Auto-run the search once on
    // mount so landing on the page behaves the same as if the rep had just
    // finished typing the name themselves.
    useEffect(() => {
        if (value && value.trim().length >= 2) {
            runSearch(value.trim());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
                setCreating(false);
                setAddingPhoneFor(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const runSearch = async (searchTerm) => {
        try {
            setLoading(true);
            const response = await clientAPI.search(searchTerm);
            setSuggestions(response.data.data.clients);
            setShowSuggestions(true);
        } catch (err) {
            console.error('Error searching clients:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (searchTerm) => {
        setQuery(searchTerm);
        // Propagate text change — the parent is expected to clear its own
        // resolved clientId here too (CreateAdvert's onChange already does),
        // so this deliberately doesn't also call onSelect(null): that would
        // race the parent's onChange in the same event and wipe clientName
        // right back out via onSelect's own reset-to-'' behavior.
        onChange(searchTerm);
        setCreating(false);
        setAddingPhoneFor(null);
        setNotice(null);

        if (searchTerm.length < 2) {
            setSuggestions([]);
            return;
        }

        runSearch(searchTerm);
    };

    const handleSelect = (client) => {
        setQuery(client.name);
        setSuggestions([]);
        setNotice(null);
        onChange(client.name);

        // Some existing clients predate the phone requirement entirely (or
        // were created before it existed at all) — booking now gets blocked
        // server-side for these, so surface that immediately on selection
        // instead of letting the rep fill out the whole form and only find
        // out at submit.
        if (!client.phone) {
            setShowSuggestions(false);
            setAddingPhoneFor(client);
            onSelect(null);
            return;
        }

        setShowSuggestions(false);
        setCreating(false);
        onSelect(client); // Propagate selection (id, etc.)
    };

    const handleAddPhoneToExisting = async () => {
        const trimmedPhone = newPhone.trim();
        if (!trimmedPhone) {
            setNotice({ type: 'error', text: 'Enter a phone number' });
            return;
        }
        try {
            setLoading(true);
            const response = await clientAPI.update(addingPhoneFor.id, {
                name: addingPhoneFor.name,
                phone: trimmedPhone
            });
            setNotice(null);
            setAddingPhoneFor(null);
            setNewPhone('');
            handleSelect(response.data.data.client);
        } catch (err) {
            const data = err.response?.data;
            setNotice({ type: 'error', text: data?.message || 'Could not update phone number' });
        } finally {
            setLoading(false);
        }
    };

    const clearSelection = () => {
        setQuery('');
        setSuggestions([]);
        setCreating(false);
        setAddingPhoneFor(null);
        setNotice(null);
        onChange('');
        onSelect(null);
    };

    const handleCreateNew = async () => {
        const trimmedName = query.trim();
        const trimmedPhone = newPhone.trim();
        if (!trimmedName || !trimmedPhone) {
            setNotice({ type: 'error', text: 'Enter both a name and a phone number' });
            return;
        }

        try {
            setLoading(true);
            const response = await clientAPI.create({ name: trimmedName, phone: trimmedPhone });
            const client = response.data.data.client;
            setNotice(null);
            handleSelect(client);
        } catch (err) {
            const status = err.response?.status;
            const data = err.response?.data;
            if (status === 409 && data?.data?.client) {
                // The phone already belongs to someone — that's the whole point
                // of the check, so select the real existing client instead of
                // letting the rep create a duplicate anyway.
                setNotice({ type: 'info', text: data.message });
                handleSelect(data.data.client);
            } else {
                setNotice({ type: 'error', text: data?.message || 'Could not create client' });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    className={`block w-full pl-10 pr-10 py-2 border ${error ? 'border-red-300' : 'border-gray-300'
                        } rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-red-500 focus:border-red-500 sm:text-sm`}
                    placeholder="Search or enter client name..."
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    onFocus={() => query.length >= 2 && setShowSuggestions(true)}
                />
                {query && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer" onClick={clearSelection}>
                        <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </div>
                )}
            </div>
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
            {notice && (
                <p className={`mt-1 text-sm ${notice.type === 'error' ? 'text-red-600' : 'text-blue-600'}`}>
                    {notice.text}
                </p>
            )}

            {addingPhoneFor && (
                <div className="mt-1.5 p-3 border border-amber-200 bg-amber-50 rounded-md">
                    <p className="text-xs text-amber-800 mb-1.5">
                        <strong>{addingPhoneFor.name}</strong> has no phone number on file — add one to continue booking.
                    </p>
                    <div className="flex gap-2">
                        <input
                            type="tel"
                            autoFocus
                            placeholder="077 123 4567"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddPhoneToExisting()}
                            className="input-mobile flex-1 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-red-500 focus:border-red-500"
                        />
                        <button
                            type="button"
                            onClick={handleAddPhoneToExisting}
                            disabled={loading}
                            className="btn-touch px-4 bg-red-600 text-white rounded font-medium hover:bg-red-700 disabled:opacity-50"
                        >
                            Save
                        </button>
                    </div>
                </div>
            )}

            {showSuggestions && (
                <ul className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-72 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                    {loading ? (
                        <li className="px-4 py-2 text-gray-500">Loading...</li>
                    ) : (
                        <>
                            {suggestions.map((client) => (
                                <li
                                    key={client.id}
                                    className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-50"
                                    onClick={() => handleSelect(client)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="min-w-0">
                                            <span className="font-medium block truncate">
                                                {client.name}
                                                {client.company && <span className="ml-2 text-gray-500 font-normal">- {client.company}</span>}
                                            </span>
                                            {client.phone && (
                                                <span className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                    <Phone className="h-3 w-3" /> {client.phone}
                                                </span>
                                            )}
                                        </div>
                                        {client.owner_rep_name && (
                                            <span
                                                className={`text-xs whitespace-nowrap ml-2 ${
                                                    client.is_within_ownership_window ? 'text-amber-700 font-medium' : 'text-gray-400'
                                                }`}
                                            >
                                                {client.owner_rep_name}
                                                {client.is_within_ownership_window && ` · ${client.days_since_last_advert}d ago`}
                                            </span>
                                        )}
                                    </div>
                                </li>
                            ))}

                            {!creating ? (
                                <li
                                    className="tap-target flex !justify-start w-full cursor-pointer select-none gap-2 pl-3 pr-9 text-red-600 hover:bg-red-50 border-t border-gray-100"
                                    onClick={() => setCreating(true)}
                                >
                                    <Plus className="h-4 w-4" />
                                    Add "{query}" as a new client
                                </li>
                            ) : (
                                <li className="px-3 py-2 border-t border-gray-100 bg-gray-50">
                                    <p className="text-xs text-gray-500 mb-1.5">Phone number required — this is how we make sure "{query}" doesn't already exist under a different spelling.</p>
                                    <div className="flex gap-2">
                                        <input
                                            type="tel"
                                            autoFocus
                                            placeholder="077 123 4567"
                                            value={newPhone}
                                            onChange={(e) => setNewPhone(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleCreateNew()}
                                            className="input-mobile flex-1 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-red-500 focus:border-red-500"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCreateNew}
                                            disabled={loading}
                                            className="btn-touch px-4 bg-red-600 text-white rounded font-medium hover:bg-red-700 disabled:opacity-50"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </li>
                            )}
                        </>
                    )}
                </ul>
            )}
        </div>
    );
};

export default ClientAutocomplete;
