import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import { clientAPI } from '../services/api';
import { useToast } from '../components/Toast';
import { Users, GitMerge, CheckCircle2, Phone } from 'lucide-react';

// Most duplicate groups are entirely unlinked (free-text client_name only,
// no clients row and no phone at all yet — a business gets its own client
// record only once someone standardizes it). Grouping is fuzzy, not exact
// match, so it catches typo/spelling variants ("ClickDrive" / "Click Drive
// Rental" / "Click Drive Rentall"), not just case/whitespace differences.
// It's still a suggestion list for a human to review, not an auto-merge.
const memberKey = (member) => `${member.type}-${member.id ?? member.name}`;

const pickDefaultKeep = (members) => {
    const linkedWithPhone = members.filter((m) => m.type === 'linked' && m.phone);
    const pool = linkedWithPhone.length > 0 ? linkedWithPhone : members;
    return [...pool].sort((a, b) => b.total_adverts - a.total_adverts)[0];
};

const DuplicateClients = () => {
    const toast = useToast();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [merging, setMerging] = useState(null);
    const [keepChoice, setKeepChoice] = useState({}); // groupIndex -> memberKey
    const [newPhone, setNewPhone] = useState({}); // groupIndex -> phone string (when keep has none)
    const [newName, setNewName] = useState({}); // groupIndex -> edited name (when keep has none)

    const fetchDuplicates = useCallback(() => {
        setLoading(true);
        clientAPI.getDuplicates()
            .then(res => {
                const groupData = res.data.data.duplicateGroups;
                setGroups(groupData);
                const keepDefaults = {};
                const nameDefaults = {};
                groupData.forEach((g, i) => {
                    const best = pickDefaultKeep(g.members);
                    keepDefaults[i] = memberKey(best);
                    nameDefaults[i] = best.name;
                });
                setKeepChoice(keepDefaults);
                setNewName(nameDefaults);
                setNewPhone({});
            })
            .catch(err => {
                console.error('Error fetching duplicate clients:', err);
                toast.error('Failed to load duplicate clients');
            })
            .finally(() => setLoading(false));
    }, [toast]);

    useEffect(() => { fetchDuplicates(); }, [fetchDuplicates]);

    const handleMerge = async (groupIndex) => {
        const group = groups[groupIndex];
        const chosenKey = keepChoice[groupIndex];
        const chosen = group.members.find((m) => memberKey(m) === chosenKey);
        const others = group.members.filter((m) => memberKey(m) !== chosenKey);

        if (others.length === 0) return;

        let keep;
        if (chosen.type === 'linked') {
            keep = { type: 'existing', id: chosen.id };
        } else {
            const phone = (newPhone[groupIndex] || '').trim();
            const name = (newName[groupIndex] || chosen.name || '').trim();
            if (!phone) {
                toast.error('Enter a phone number for the merged client — none of these records has one on file');
                return;
            }
            keep = { type: 'new', name, phone };
        }

        const mergeSources = others.map((m) =>
            m.type === 'linked' ? { type: 'linked', id: m.id } : { type: 'unlinked', name: m.name }
        );

        try {
            setMerging(groupIndex);
            await clientAPI.merge(keep, mergeSources);
            toast.success(`Merged ${group.members.length} records into one`);
            setGroups(prev => prev.filter((_, i) => i !== groupIndex));
        } catch (error) {
            console.error('Error merging clients:', error);
            toast.error(error.response?.data?.message || 'Failed to merge clients');
        } finally {
            setMerging(null);
        }
    };

    return (
        <Layout>
            <div className="min-h-screen bg-gray-50">
                <div className="bg-white border-b border-gray-200">
                    <div className="px-4 py-4 max-w-4xl mx-auto">
                        <div className="flex items-center gap-3">
                            <Users className="h-6 w-6 text-red-500" />
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">Duplicate Clients</h1>
                                <p className="text-sm text-gray-600">
                                    Same client, different spelling — pick which record to keep, the rest merge into it.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4">
                    {loading ? (
                        <div className="space-y-3">
                            {[0, 1, 2].map(i => <div key={i} className="h-32 bg-gray-200 rounded-2xl animate-pulse" />)}
                        </div>
                    ) : groups.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                            <p className="text-gray-500">No likely duplicates found — the client list looks clean.</p>
                        </div>
                    ) : (
                        groups.map((group, groupIndex) => {
                            const chosenKey = keepChoice[groupIndex];
                            const chosen = group.members.find((m) => memberKey(m) === chosenKey);
                            const needsPhone = chosen && chosen.type === 'unlinked';

                            return (
                                <div key={group.members.map(memberKey).join('|')} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                    <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100">
                                        <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                                            {group.members.length} records look like the same client
                                        </p>
                                    </div>
                                    <div className="divide-y divide-gray-100">
                                        {group.members.map(member => {
                                            const key = memberKey(member);
                                            return (
                                                <label
                                                    key={key}
                                                    className={`flex items-start gap-3 p-4 cursor-pointer transition-colors ${
                                                        chosenKey === key ? 'bg-emerald-50' : 'hover:bg-gray-50'
                                                    }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name={`keep-${groupIndex}`}
                                                        checked={chosenKey === key}
                                                        onChange={() => {
                                                            setKeepChoice(prev => ({ ...prev, [groupIndex]: key }));
                                                            setNewName(prev => ({ ...prev, [groupIndex]: member.name }));
                                                        }}
                                                        className="mt-1 accent-emerald-600"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-semibold text-gray-900">{member.name}</span>
                                                            {chosenKey === key && (
                                                                <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                                                    Keep this one
                                                                </span>
                                                            )}
                                                            {!member.phone && (
                                                                <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                                                    Not standardized
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                                                            {member.phone && (
                                                                <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{member.phone}</span>
                                                            )}
                                                            <span>{member.total_adverts} advert{member.total_adverts === 1 ? '' : 's'}</span>
                                                            {member.sales_rep_name && <span>Rep: {member.sales_rep_name}</span>}
                                                            {member.last_advert_date && (
                                                                <span>Last booked {new Date(member.last_advert_date).toLocaleDateString()}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>

                                    {needsPhone && (
                                        <div className="px-4 py-3 border-t border-gray-100 bg-amber-50">
                                            <p className="text-xs text-amber-800 mb-2">
                                                None of these records has a phone number yet — add one to create the merged client.
                                            </p>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="Client name"
                                                    value={newName[groupIndex] ?? ''}
                                                    onChange={(e) => setNewName(prev => ({ ...prev, [groupIndex]: e.target.value }))}
                                                    className="input-mobile flex-1 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-red-500 focus:border-red-500"
                                                />
                                                <input
                                                    type="tel"
                                                    placeholder="077 123 4567"
                                                    value={newPhone[groupIndex] ?? ''}
                                                    onChange={(e) => setNewPhone(prev => ({ ...prev, [groupIndex]: e.target.value }))}
                                                    className="input-mobile flex-1 px-2 border border-gray-300 rounded focus:ring-1 focus:ring-red-500 focus:border-red-500"
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-4 border-t border-gray-100 flex justify-end">
                                        <button
                                            onClick={() => handleMerge(groupIndex)}
                                            disabled={merging === groupIndex}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50 btn-touch"
                                        >
                                            <GitMerge className="h-4 w-4" />
                                            {merging === groupIndex ? 'Merging...' : 'Merge these records'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default DuplicateClients;
