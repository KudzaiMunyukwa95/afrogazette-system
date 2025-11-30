import React, { useEffect, useState } from 'react';
import { slotAPI } from '../services/api';
import Layout from '../components/Layout';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  User,
  Tag,
  MessageSquare,
  Activity,
  Grid3X3
} from 'lucide-react';

const Schedule = () => {
  const [schedule, setSchedule] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedule();
  }, [selectedDate]);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const response = await slotAPI.getCalendar(selectedDate);
      setSchedule(response.data.data.schedule);
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  const handleToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Loading schedule...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-4 md:py-8">
        <div className="max-w-7xl mx-auto mobile-container">
          {/* Header & Date Nav */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
              <p className="text-sm text-gray-500">Manage daily advertising slots</p>
            </div>

            <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between md:justify-end gap-2">
              <button
                onClick={handlePreviousDay}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors tap-target"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600" />
              </button>

              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="input-mobile border-none bg-transparent font-medium text-gray-900 focus:ring-0 text-center"
              />

              <button
                onClick={handleNextDay}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors tap-target"
              >
                <ChevronRight className="h-5 w-5 text-gray-600" />
              </button>

              {!isToday && (
                <button
                  onClick={handleToday}
                  className="ml-2 px-3 py-1.5 text-xs font-bold bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  Today
                </button>
              )}
            </div>
          </div>

          <div className="space-y-6">
            {/* Date Display Banner */}
            <div className="bg-black text-white rounded-xl p-6 text-center shadow-lg">
              <div className="text-sm text-gray-400 mb-1 uppercase tracking-wider font-medium">
                {isToday ? 'Today\'s Overview' : 'Schedule Overview'}
              </div>
              <div className="text-2xl md:text-3xl font-bold">
                {new Date(selectedDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <StatCard
                title="Total Slots"
                value={schedule.length}
                icon={<Grid3X3 className="h-5 w-5" />}
                color="bg-gray-100 text-gray-700"
              />
              <StatCard
                title="Occupied"
                value={schedule.filter(s => s.adverts.length > 0).length}
                icon={<Activity className="h-5 w-5" />}
                color="bg-blue-100 text-blue-700"
              />
              <StatCard
                title="Available"
                value={schedule.filter(s => s.available > 0).length}
                icon={<CheckCircle className="h-5 w-5" />}
                color="bg-green-100 text-green-700"
              />
              <StatCard
                title="Fully Booked"
                value={schedule.filter(s => s.available === 0).length}
                icon={<AlertTriangle className="h-5 w-5" />}
                color="bg-red-100 text-red-700"
              />
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {schedule.map(slot => (
                <TimeSlotCard key={slot.slotId} slot={slot} />
              ))}
            </div>

            {/* Legend */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs md:text-sm font-medium text-gray-600">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Available</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>Partially Booked</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <span>Fully Booked</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

// Compact Stats Card
const StatCard = ({ title, value, icon, color }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col items-center justify-center text-center">
    <div className={`p-2 rounded-full mb-2 ${color}`}>
      {icon}
    </div>
    <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</span>
  </div>
);

// Calendar-style Time Slot Card
const TimeSlotCard = ({ slot }) => {
  const getStatusColor = () => {
    if (slot.adverts.length === 0) return 'border-green-200 bg-white';
    if (slot.available === 0) return 'border-red-200 bg-red-50';
    return 'border-yellow-200 bg-yellow-50';
  };

  const getTimeHeaderStyle = () => {
    if (slot.adverts.length === 0) return 'bg-green-500 text-white';
    if (slot.available === 0) return 'bg-red-500 text-white';
    return 'bg-yellow-500 text-white';
  };

  return (
    <div className={`rounded-xl border shadow-sm overflow-hidden transition-all hover:shadow-md ${getStatusColor()}`}>
      {/* Time Header */}
      <div className={`${getTimeHeaderStyle()} px-4 py-3 flex justify-between items-center`}>
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 opacity-80" />
          <span className="font-bold text-lg">{slot.slotTime.substring(0, 5)}</span>
        </div>
        <div className="text-xs font-medium bg-black bg-opacity-20 px-2 py-1 rounded-full">
          {slot.adverts.length}/2
        </div>
      </div>

      {/* Content */}
      <div className="p-4 min-h-[120px] flex flex-col justify-center">
        {slot.adverts.length > 0 ? (
          <div className="space-y-3">
            {slot.adverts.map((advert, index) => (
              <div key={index} className="bg-white bg-opacity-60 p-2 rounded-lg border border-gray-100 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-bold text-sm text-gray-900">{advert.clientName}</div>
                    <div className="text-xs text-gray-500 capitalize">{advert.category.replace(/_/g, ' ')}</div>
                  </div>
                  <div className={`text-xs font-bold px-1.5 py-0.5 rounded ${advert.remainingDays <= 3 ? 'bg-red-100 text-red-700' :
                    advert.remainingDays <= 7 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                    }`}>
                    {advert.remainingDays}d
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-400 py-2">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50 text-green-500" />
            <div className="text-sm font-medium text-green-600">Slot Available</div>
            <div className="text-xs text-gray-500">Ready for booking</div>
          </div>
        )}
      </div>

      {/* Status Footer */}
      <div className="px-4 py-2 bg-white bg-opacity-50 border-t border-gray-100 flex justify-between items-center">
        <span className="text-xs font-medium text-gray-500">Status</span>
        {slot.available > 0 ? (
          <span className="text-xs font-bold text-green-600 flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-1.5"></div>
            {slot.available} Available
          </span>
        ) : (
          <span className="text-xs font-bold text-red-600 flex items-center">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-1.5"></div>
            Fully Booked
          </span>
        )}
      </div>
    </div>
  );
};

export default Schedule;
