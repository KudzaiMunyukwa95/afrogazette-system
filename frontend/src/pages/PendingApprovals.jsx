import React, { useEffect, useState } from 'react';
import ConfirmModal from '../components/ConfirmModal';
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
  Target,
  ArrowLeft,
  ChevronRight
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
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, advertId: null });

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

  const handleBack = () => {
    setSelectedAdvert(null);
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

  const handleDelete = (advertId) => {
    setDeleteModal({ isOpen: true, advertId });
  };

  const confirmDelete = async () => {
    try {
      await advertAPI.delete(deleteModal.advertId);
      toast.success('Advert deleted successfully');
      fetchData();
      if (selectedAdvert?.id === deleteModal.advertId) {
        setSelectedAdvert(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting advert');
    }
  };

  const handleDeclineClick = (advert) => {
    // If on mobile and selected, use selectedAdvert, otherwise use passed advert
    const targetAdvert = advert || selectedAdvert;
    setSelectedAdvert(targetAdvert);
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

  // Details View Component (Reused for Mobile Modal and Desktop Panel)
  const DetailsView = () => (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 bg-gray-50 border-b flex items-center">
        <button onClick={handleBack} className="md:hidden mr-3 text-gray-500">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-bold text-gray-900">Approve & Schedule</h2>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto flex-1">
        {/* Advert Details Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">{selectedAdvert.client_name}</h3>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full capitalize">
              {selectedAdvert.category.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 mb-3 text-sm text-gray-700 leading-relaxed">
            {selectedAdvert.caption}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center text-gray-600">
              <Calendar className="h-4 w-4 mr-2" />
              {new Date(selectedAdvert.start_date).toLocaleDateString()}
            </div>
            <div className="flex items-center text-gray-600">
              <Clock className="h-4 w-4 mr-2" />
              {selectedAdvert.days_paid} Days
            </div>
            <div className="flex items-center text-gray-900 font-medium">
              <DollarSign className="h-4 w-4 mr-2 text-green-600" />
              ${selectedAdvert.amount_paid}
            </div>
          </div>
        </div>

        {/* Slot Selection Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <label className="block text-sm font-medium text-gray-700 mb-2">Assign Time Slot</label>
          <select
            value={selectedSlot}
            onChange={handleSlotChange}
            className="input-mobile w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
          >
            <option value="">Choose a time slot...</option>
            {slots.map(slot => (
              <option key={slot.id} value={slot.id}>{slot.slot_label}</option>
            ))}
          </select>

          {/* Availability Status */}
          {availability && (
            <div className={`mt-3 p-3 rounded-lg text-sm ${availability.available ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
              {availability.available ? (
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {availability.message}
                </div>
              ) : (
                <div>
                  <div className="font-medium mb-1 flex items-center">
                    <XCircle className="h-4 w-4 mr-2" />
                    Conflicts Detected:
                  </div>
                  <ul className="list-disc list-inside space-y-1 ml-1 text-xs">
                    {availability.conflicts.map((conflict, i) => (
                      <li key={i}>{conflict.date}: {conflict.reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="p-4 border-t bg-white space-y-3">
        <button
          onClick={handleApprove}
          disabled={approving || !selectedSlot || (availability && !availability.available)}
          className="w-full flex justify-center items-center px-4 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed btn-touch shadow-sm"
        >
          {approving ? 'Processing...' : 'Approve & Schedule'}
        </button>

        <button
          onClick={() => handleDeclineClick(null)}
          className="w-full flex justify-center items-center px-4 py-3 bg-white text-red-600 border border-red-200 rounded-xl font-medium hover:bg-red-50 btn-touch"
        >
          Decline Advert
        </button>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-4 md:py-8">
        <div className="max-w-7xl mx-auto mobile-container h-[calc(100vh-6rem)]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Pending Approvals</h1>
              <p className="text-sm text-gray-500">Review and schedule client adverts</p>
            </div>
            <div className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold">
              {adverts.length} Pending
            </div>
          </div>

          {adverts.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center shadow-sm">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h3>
              <p className="text-gray-500">No pending adverts to review at the moment.</p>
            </div>
          ) : (
            <div className="flex h-full gap-6">
              {/* Left Panel - List */}
              <div className={`flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col ${selectedAdvert ? 'hidden md:flex' : 'flex'}`}>
                <div className="px-4 py-3 bg-gray-50 border-b">
                  <h2 className="font-semibold text-gray-700">Queue</h2>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {adverts.map(advert => (
                    <div
                      key={advert.id}
                      onClick={() => handleSelectAdvert(advert)}
                      className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${selectedAdvert?.id === advert.id
                        ? 'border-red-500 bg-red-50 ring-1 ring-red-500'
                        : 'border-gray-200 bg-white hover:border-red-200'
                        }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-gray-900">{advert.client_name}</span>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">{advert.caption}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{new Date(advert.start_date).toLocaleDateString()}</span>
                        <span className="font-medium text-gray-900">${advert.amount_paid}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Panel - Desktop Details */}
              <div className="hidden md:block w-96 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {selectedAdvert ? (
                  <DetailsView />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-gray-400 p-6 text-center">
                    <FileText className="h-12 w-12 mb-3 opacity-20" />
                    <p>Select an advert from the queue to review details</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Details Modal */}
        {selectedAdvert && (
          <div className="md:hidden fixed inset-0 z-40 bg-white">
            <DetailsView />
          </div>
        )}

        {/* Decline Modal */}
        {showDeclineModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
              <div className="px-4 py-3 border-b flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-gray-900">Decline Advert</h3>
                <button onClick={() => setShowDeclineModal(false)} className="p-1 hover:bg-gray-200 rounded-full">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <p className="text-sm text-gray-600">
                  Provide a reason for declining <strong>{selectedAdvert?.client_name}</strong>'s advert.
                </p>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Reason (min 10 chars) *</label>
                  <textarea
                    value={declineReason}
                    onChange={(e) => setDeclineReason(e.target.value)}
                    rows={3}
                    className="input-mobile w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    placeholder="Content violates guidelines..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Additional Notes</label>
                  <textarea
                    value={declineNotes}
                    onChange={(e) => setDeclineNotes(e.target.value)}
                    rows={2}
                    className="input-mobile w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    placeholder="Optional notes..."
                  />
                </div>
              </div>

              <div className="px-4 py-3 bg-gray-50 border-t flex gap-3">
                <button
                  onClick={() => setShowDeclineModal(false)}
                  className="flex-1 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 btn-touch"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeclineSubmit}
                  disabled={declining || declineReason.length < 10}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 btn-touch"
                >
                  {declining ? 'Declining...' : 'Decline'}
                </button>
              </div>
            </div>
          </div>
        )}

        <ConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, advertId: null })}
          onConfirm={confirmDelete}
          title="Delete Advert"
          message="Are you sure you want to permanently delete this advert? This action cannot be undone."
          confirmText="Delete"
          type="danger"
        />
      </div>
    </Layout>
  );
};

export default PendingApprovals;
