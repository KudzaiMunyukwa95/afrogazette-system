import React, { useEffect, useState } from 'react';
import { advertAPI, slotAPI } from '../services/api';
import Layout from '../components/Layout';
import { useToast } from '../components/Toast';
import {
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  AlertTriangle,
  Calendar,
  DollarSign,
  User,
  MessageSquare,
  X,
  FileText,
  Target
} from 'lucide-react';

const PendingApprovals = () => {
  const toast = useToast();
  const [adverts, setAdverts] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAdvert, setSelectedAdvert] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [approving, setApproving] = useState(false);
  const [availability, setAvailability] = useState(null);
  
  // Decline modal state
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [declineNotes, setDeclineNotes] = useState('');
  const [declining, setDeclining] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [advertsRes, slotsRes] = await Promise.all([
        advertAPI.getPending(),
        slotAPI.getAll()
      ]);
      
      setAdverts(advertsRes.data.data.adverts);
      setSlots(slotsRes.data.data.slots);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load pending adverts');
    } finally {
      setLoading(false);
    }
  };

  const checkAvailability = async (advertId, slotId) => {
    if (!slotId) {
      setAvailability(null);
      return;
    }

    try {
      const response = await slotAPI.checkAvailability(advertId, slotId);
      setAvailability(response.data.data);
    } catch (error) {
      console.error('Error checking availability:', error);
    }
  };

  const handleSelectAdvert = (advert) => {
    setSelectedAdvert(advert);
    setSelectedSlot('');
    setAvailability(null);
  };

  const handleSlotChange = (e) => {
    const slotId = e.target.value;
    setSelectedSlot(slotId);
    if (slotId && selectedAdvert) {
      checkAvailability(selectedAdvert.id, slotId);
    } else {
      setAvailability(null);
    }
  };

  const handleApprove = async () => {
    if (!selectedAdvert || !selectedSlot) {
      toast.warning('Please select both an advert and a time slot');
      return;
    }

    if (availability && !availability.available) {
      toast.error('Cannot approve: Slot has conflicts. Please choose a different slot.');
      return;
    }

    setApproving(true);

    try {
      await advertAPI.approve(selectedAdvert.id, parseInt(selectedSlot));
      toast.success('Advert approved and scheduled successfully!');
      
      // Reset and refresh
      setSelectedAdvert(null);
      setSelectedSlot('');
      setAvailability(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error approving advert');
    } finally {
      setApproving(false);
    }
  };

  const handleDelete = async (advertId) => {
    if (!window.confirm('Are you sure you want to permanently delete this advert? This action cannot be undone.')) {
      return;
    }

    try {
      await advertAPI.delete(advertId);
      toast.success('Advert deleted successfully');
      fetchData();
      if (selectedAdvert?.id === advertId) {
        setSelectedAdvert(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting advert');
    }
  };

  const handleDeclineClick = (advert) => {
    setSelectedAdvert(advert);
    setShowDeclineModal(true);
    setDeclineReason('');
    setDeclineNotes('');
  };

  const handleDeclineSubmit = async () => {
    if (!declineReason.trim() || declineReason.length < 10) {
      toast.warning('Please provide a detailed reason (minimum 10 characters)');
      return;
    }

    setDeclining(true);

    try {
      await advertAPI.decline(selectedAdvert.id, {
        reason: declineReason,
        notes: declineNotes
      });
      
      toast.success('Advert declined successfully');
      setShowDeclineModal(false);
      setSelectedAdvert(null);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error declining advert');
    } finally {
      setDeclining(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading pending adverts...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        {/* Compact Header */}
        <div className="bg-white border-b">
          <div className="px-3 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-amber-500" />
                <h1 className="text-base font-bold text-gray-900">Pending Approvals</h1>
              </div>
              <div className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs">
                {adverts.length} Pending
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        {adverts.length === 0 ? (
          <div className="p-4">
            <div className="bg-white rounded-lg border p-6 text-center">
              <h3 className="text-base font-medium text-gray-900 mb-2">No Pending Adverts</h3>
              <p className="text-sm text-gray-600">All adverts have been reviewed.</p>
            </div>
          </div>
        ) : (
          <div className="p-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {/* Left Panel - Adverts List */}
              <div className="bg-white rounded border">
                <div className="px-3 py-2 bg-gray-50 border-b">
                  <h2 className="text-sm font-medium">Pending Adverts ({adverts.length})</h2>
                </div>
                
                <div className="p-2 max-h-96 overflow-y-auto">
                  {adverts.map(advert => (
                    <div
                      key={advert.id}
                      onClick={() => handleSelectAdvert(advert)}
                      className={`p-2 mb-2 border rounded cursor-pointer ${
                        selectedAdvert?.id === advert.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-sm font-medium">{advert.client_name}</span>
                        <span className="text-xs bg-gray-100 px-1 rounded">{advert.category.replace(/_/g, ' ')}</span>
                      </div>
                      
                      <p className="text-xs text-gray-600 mb-1">
                        {advert.caption.substring(0, 50)}...
                      </p>
                      
                      <div className="text-xs text-gray-500 mb-2">
                        Start: {new Date(advert.start_date).toLocaleDateString()} | 
                        Days: {advert.days_paid} | 
                        ${advert.amount_paid}
                      </div>

                      <div className="flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeclineClick(advert); }}
                          className="flex-1 bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                        >
                          Decline
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(advert.id); }}
                          className="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Panel - Approval */}
              <div className="bg-white rounded border">
                {selectedAdvert ? (
                  <>
                    <div className="px-3 py-2 bg-gray-50 border-b">
                      <h2 className="text-sm font-medium">Approve & Assign Slot</h2>
                    </div>
                    
                    <div className="p-3 space-y-3">
                      {/* Advert Details */}
                      <div className="bg-gray-50 rounded p-2">
                        <div className="text-sm font-medium mb-1">{selectedAdvert.client_name}</div>
                        <div className="text-xs text-gray-600 mb-2">{selectedAdvert.caption}</div>
                        <div className="text-xs grid grid-cols-2 gap-1">
                          <div>Category: {selectedAdvert.category.replace(/_/g, ' ')}</div>
                          <div>Start: {new Date(selectedAdvert.start_date).toLocaleDateString()}</div>
                          <div>Days: {selectedAdvert.days_paid}</div>
                          <div>Amount: ${selectedAdvert.amount_paid}</div>
                        </div>
                      </div>

                      {/* Slot Selection */}
                      <div>
                        <label className="block text-xs font-medium mb-1">Time Slot *</label>
                        <select
                          value={selectedSlot}
                          onChange={handleSlotChange}
                          className="w-full text-xs border rounded px-2 py-1"
                        >
                          <option value="">Choose a time slot...</option>
                          {slots.map(slot => (
                            <option key={slot.id} value={slot.id}>{slot.slot_label}</option>
                          ))}
                        </select>
                      </div>

                      {/* Availability */}
                      {availability && (
                        <div className={`p-2 rounded text-xs ${availability.available ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                          {availability.available ? (
                            <div>✓ {availability.message}</div>
                          ) : (
                            <div>
                              <div className="font-medium mb-1">Conflicts:</div>
                              {availability.conflicts.map((conflict, i) => (
                                <div key={i}>{conflict.date}: {conflict.reason}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Approve Button */}
                      <button
                        onClick={handleApprove}
                        disabled={approving || !selectedSlot || (availability && !availability.available)}
                        className="w-full bg-green-500 text-white px-3 py-2 rounded text-sm hover:bg-green-600 disabled:opacity-50"
                      >
                        {approving ? 'Approving...' : 'Approve & Schedule'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-8 text-center">
                    <div className="text-gray-400 mb-2">📋</div>
                    <div className="text-sm font-medium mb-1">Select an Advert</div>
                    <div className="text-xs text-gray-600">Choose from the list to approve</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Decline Modal */}
        {showDeclineModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="px-4 py-3 border-b flex justify-between items-center">
                <h3 className="font-medium">Decline Advert</h3>
                <button onClick={() => setShowDeclineModal(false)}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="p-4 space-y-3">
                <p className="text-sm text-gray-600">
                  Provide a reason for declining <strong>{selectedAdvert?.client_name}</strong>'s advert.
                </p>

                <div>
                  <label className="block text-xs font-medium mb-1">Reason (min 10 chars) *</label>
                  <textarea
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    rows={3}
                    className="w-full text-xs border rounded px-2 py-1"
                    placeholder="Content violates guidelines..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Additional Notes</label>
                  <textarea
                    value={declineNotes}
                    onChange={(e) => setDeclineNotes(e.target.value)}
                    rows={2}
                    className="w-full text-xs border rounded px-2 py-1"
                    placeholder="Optional notes..."
                  />
                </div>
              </div>

              <div className="px-4 py-3 border-t flex gap-2">
                <button
                  onClick={handleDeclineSubmit}
                  disabled={declining || declineReason.length < 10}
                  className="flex-1 bg-red-500 text-white px-3 py-2 rounded text-sm disabled:opacity-50 hover:bg-red-600"
                >
                  {declining ? 'Declining...' : 'Decline'}
                </button>
                <button
                  onClick={() => setShowDeclineModal(false)}
                  className="flex-1 bg-gray-500 text-white px-3 py-2 rounded text-sm hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PendingApprovals;
