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
      <div className="min-h-screen bg-gray-50">
        {/* Compact Header */}
        <div className="bg-white border-b">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-gray-600" />
                <h1 className="text-lg font-bold text-gray-900">Schedule Calendar</h1>
              </div>
              
              {/* Date Navigation */}
              <div className="flex items-center space-x-2">
                <button 
                  onClick={handlePreviousDay}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-2 py-1 text-sm border rounded"
                />
                
                <button 
                  onClick={handleNextDay}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                
                {!isToday && (
                  <button 
                    onClick={handleToday}
                    className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Today
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Date Display */}
          <div className="bg-black text-white rounded-lg p-4 text-center">
            <div className="text-sm opacity-75 mb-1">
              {isToday ? 'Today\'s Schedule' : 'Schedule for'}
            </div>
            <div className="text-xl font-bold">
              {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              title="Total Slots"
              value={schedule.length}
              icon={<Grid3X3 className="h-4 w-4" />}
              color="bg-gray-100 text-gray-700"
            />
            <StatCard
              title="Occupied"
              value={schedule.filter(s => s.adverts.length > 0).length}
              icon={<Activity className="h-4 w-4" />}
              color="bg-blue-100 text-blue-700"
            />
            <StatCard
              title="Available"
              value={schedule.filter(s => s.available > 0).length}
              icon={<CheckCircle className="h-4 w-4" />}
              color="bg-green-100 text-green-700"
            />
            <StatCard
              title="Fully Booked"
              value={schedule.filter(s => s.available === 0).length}
              icon={<AlertTriangle className="h-4 w-4" />}
              color="bg-red-100 text-red-700"
            />
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {schedule.map(slot => (
              <TimeSlotCard key={slot.slotId} slot={slot} />
            ))}
          </div>

          {/* Legend */}
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-center space-x-6 text-xs">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-200 rounded"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-yellow-200 rounded"></div>
                <span>Partial</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-200 rounded"></div>
                <span>Full</span>
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
  <div className="bg-white rounded-lg border p-3">
    <div className="flex items-center space-x-2 mb-1">
      <div className={`p-1 rounded ${color}`}>
        {icon}
      </div>
      <span className="text-xs text-gray-600">{title}</span>
    </div>
    <div className="text-xl font-bold text-gray-900">{value}</div>
  </div>
);

// Calendar-style Time Slot Card
const TimeSlotCard = ({ slot }) => {
  const getStatusColor = () => {
    if (slot.adverts.length === 0) return 'border-green-300 bg-green-50';
    if (slot.available === 0) return 'border-red-300 bg-red-50';
    return 'border-yellow-300 bg-yellow-50';
  };

  const getTimeColor = () => {
    if (slot.adverts.length === 0) return 'bg-green-500 text-white';
    if (slot.available === 0) return 'bg-red-500 text-white';
    return 'bg-yellow-500 text-white';
  };

  return (
    <div className={`bg-white rounded-lg border-2 ${getStatusColor()} overflow-hidden`}>
      {/* Time Header */}
      <div className={`${getTimeColor()} px-3 py-2 text-center`}>
        <div className="font-bold text-lg">
          {slot.slotTime.substring(0, 5)}
        </div>
        <div className="text-xs opacity-90">
          {slot.adverts.length}/2 slots
        </div>
      </div>
      
      {/* Content */}
      <div className="p-3">
        {slot.adverts.length > 0 ? (
          <div className="space-y-2">
            {slot.adverts.map((advert, index) => (
              <div key={index} className="text-xs">
                <div className="font-medium text-gray-900">{advert.clientName}</div>
                <div className="text-gray-600 truncate">{advert.category.replace(/_/g, ' ')}</div>
                <div className={`font-medium ${
                  advert.remainingDays <= 3 ? 'text-red-600' : 
                  advert.remainingDays <= 7 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {advert.remainingDays}d left
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-gray-400">
            <MessageSquare className="h-6 w-6 mx-auto mb-1" />
            <div className="text-xs">Available</div>
          </div>
        )}
      </div>
      
      {/* Status Footer */}
      <div className="px-3 py-1 bg-gray-50 border-t text-center">
        {slot.available > 0 ? (
          <span className="text-xs text-gray-600">
            {slot.available} available
          </span>
        ) : (
          <span className="text-xs text-red-600 font-medium">
            Full
          </span>
        )}
      </div>
    </div>
  );
};

export default Schedule;
