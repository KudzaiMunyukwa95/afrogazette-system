import React, { useState, useEffect, useRef } from 'react';
import { Search, User, Plus, X } from 'lucide-react';
import { clientAPI } from '../services/api';

const ClientAutocomplete = ({ value, onChange, onSelect, error }) => {
    const [query, setQuery] = useState(value || '');
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const wrapperRef = useRef(null);

    useEffect(() => {
        setQuery(value || '');
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = async (searchTerm) => {
        setQuery(searchTerm);
        onChange(searchTerm); // Propagate text change
        setSelectedClient(null); // Clear selection if typing

        if (searchTerm.length < 2) {
            setSuggestions([]);
            return;
        }

        try {
            setLoading(true);
            const response = await clientAPI.search(searchTerm);
            setSuggestions(response.data.data.clients);
            setShowSuggestions(true);
        } catch (error) {
            console.error('Error searching clients:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (client) => {
        setQuery(client.name);
        setSelectedClient(client);
        setSuggestions([]);
        setShowSuggestions(false);
        onSelect(client); // Propagate selection (id, etc.)
    };

    const clearSelection = () => {
        setQuery('');
        setSelectedClient(null);
        onChange('');
        onSelect(null);
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

            {showSuggestions && (
                <ul className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                    {loading ? (
                        <li className="px-4 py-2 text-gray-500">Loading...</li>
                    ) : suggestions.length > 0 ? (
                        suggestions.map((client) => (
                            <li
                                key={client.id}
                                className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-50"
                                onClick={() => handleSelect(client)}
                            >
                                <div className="flex items-center">
                                    <span className="font-medium block truncate">{client.name}</span>
                                    {client.company && (
                                        <span className="ml-2 text-gray-500 truncate">- {client.company}</span>
                                    )}
                                </div>
                            </li>
                        ))
                    ) : (
                        <li className="px-4 py-2 text-gray-500">
                            No existing clients found. "{query}" will be added as a new entry.
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
};

export default ClientAutocomplete;
