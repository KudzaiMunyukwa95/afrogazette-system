import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, CheckCircle, Activity } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

const SalesCalendar = () => {
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [adverts, setAdverts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);

    // API URL helper
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    useEffect(() => {
        fetchAdverts();
    }, []);

    const fetchAdverts = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/adverts`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('📅 Calendar API Response:', response.data);
            if (response.data.success && Array.isArray(response.data.data)) {
                console.log('📅 Total adverts loaded:', response.data.data.length);
                console.log('📅 Sample advert:', response.data.data[0]);
                setAdverts(response.data.data);
            } else {
                console.warn('📅 No adverts data or invalid format');
                setAdverts([]);
            }
        } catch (error) {
            console.error('📅 Error fetching adverts:', error);
            setAdverts([]);
        } finally {
            setLoading(false);
        }
    };

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
    const handleToday = () => setCurrentDate(new Date());

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const getAdvertsForDay = (day) => {
        if (!Array.isArray(adverts)) return [];
        const matches = adverts.filter(advert => {
            if (!advert.start_date || !advert.end_date) return false;

            // Normalize dates to YYYY-MM-DD for accurate comparison
            const checkDate = format(day, 'yyyy-MM-dd');
            const start = format(parseISO(advert.start_date), 'yyyy-MM-dd');
            const end = format(parseISO(advert.end_date), 'yyyy-MM-dd');

            const isMatch = checkDate >= start && checkDate <= end;
            if (isMatch) {
                console.log(`📅 Match found for ${checkDate}:`, advert.client_name, `(${start} to ${end})`);
            }
            return isMatch;
        });
        return matches;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800 border-green-200';
            case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'expired': return 'bg-gray-100 text-gray-800 border-gray-200';
            case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
            default: return 'bg-blue-100 text-blue-800 border-blue-200';
        }
    };

    if (loading) {
        return (
            <Layout>
                <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
                        <p className="mt-4 text-gray-600 font-medium">Loading calendar...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="min-h-screen bg-gray-50 py-4 md:py-8">
                <div className="max-w-7xl mx-auto mobile-container">
                    {/* Header & Navigation */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">Advert Calendar</h1>
                            <p className="text-sm text-gray-500">Visualize your advert schedules</p>
                        </div>

                        <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between md:justify-end gap-2">
                            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors tap-target">
                                <ChevronLeft className="h-5 w-5 text-gray-600" />
                            </button>
                            <span className="text-lg font-bold text-gray-900 min-w-[160px] text-center">
                                {format(currentDate, 'MMMM yyyy')}
                            </span>
                            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors tap-target">
                                <ChevronRight className="h-5 w-5 text-gray-600" />
                            </button>
                            {!isSameMonth(currentDate, new Date()) && (
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
                                Monthly Overview
                            </div>
                            <div className="text-2xl md:text-3xl font-bold">
                                {format(currentDate, 'MMMM yyyy')}
                            </div>
                        </div>

                        {/* Calendar Grid */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            {/* Days Header */}
                            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <div key={day} className="py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Calendar Days */}
                            <div className="grid grid-cols-7 auto-rows-fr bg-gray-200 gap-px">
                                {calendarDays.map((day) => {
                                    const dayAdverts = getAdvertsForDay(day);
                                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                                    const isCurrentMonth = isSameMonth(day, monthStart);
                                    const isTodayDate = isSameDay(day, new Date());

                                    return (
                                        <div
                                            key={day.toString()}
                                            onClick={() => setSelectedDate(day)}
                                            className={`
                                                min-h-[100px] md:min-h-[140px] p-2 transition-all cursor-pointer relative group
                                                ${!isCurrentMonth ? 'bg-gray-50/80 text-gray-400' : 'bg-white'}
                                                ${isTodayDate ? 'bg-blue-50/30' : ''}
                                                ${isSelected ? 'ring-2 ring-inset ring-red-500 z-10' : 'hover:bg-gray-50'}
                                            `}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className={`
                                                    text-sm font-bold h-7 w-7 flex items-center justify-center rounded-full
                                                    ${isTodayDate
                                                        ? 'bg-red-600 text-white shadow-md'
                                                        : !isCurrentMonth ? 'text-gray-400' : 'text-gray-700 group-hover:bg-gray-100'}
                                                `}>
                                                    {format(day, 'd')}
                                                </span>
                                                {dayAdverts.length > 0 && (
                                                    <span className="text-xs font-bold bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-md">
                                                        {dayAdverts.length}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="space-y-1 overflow-y-auto max-h-[60px] md:max-h-[90px] scrollbar-hide">
                                                {dayAdverts.slice(0, 3).map((advert) => (
                                                    <div
                                                        key={advert.id}
                                                        className={`
                                                            text-[10px] px-1.5 py-1 rounded border truncate font-medium
                                                            ${getStatusColor(advert.status)}
                                                        `}
                                                        title={`${advert.client_name} - ${advert.advert_type}`}
                                                    >
                                                        {advert.client_name}
                                                    </div>
                                                ))}
                                                {dayAdverts.length > 3 && (
                                                    <div className="text-[10px] text-gray-500 font-medium pl-1">
                                                        +{dayAdverts.length - 3} more
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Selected Date Details */}
                        <AnimatePresence mode="wait">
                            {selectedDate && (
                                <motion.div
                                    key={selectedDate.toString()}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                                >
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-lg font-bold text-gray-900 flex items-center">
                                            <CalendarIcon className="h-5 w-5 mr-2 text-red-600" />
                                            Adverts for {format(selectedDate, 'MMMM d, yyyy')}
                                        </h3>
                                        <button
                                            onClick={() => setSelectedDate(null)}
                                            className="text-sm text-gray-500 hover:text-gray-700"
                                        >
                                            Close
                                        </button>
                                    </div>

                                    {getAdvertsForDay(selectedDate).length > 0 ? (
                                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                            {getAdvertsForDay(selectedDate).map(advert => (
                                                <div key={advert.id} className="group p-4 rounded-xl border border-gray-200 hover:border-red-200 hover:shadow-md transition-all bg-white">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full uppercase tracking-wide ${getStatusColor(advert.status)}`}>
                                                            {advert.status}
                                                        </span>
                                                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-lg">
                                                            {advert.advert_type}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-gray-900 truncate text-lg mb-1">{advert.client_name}</h4>
                                                    <div className="mt-3 space-y-2">
                                                        <div className="flex items-center text-sm text-gray-600">
                                                            <Clock className="h-4 w-4 mr-2 text-gray-400" />
                                                            <span>{format(parseISO(advert.start_date), 'MMM d')} - {format(parseISO(advert.end_date), 'MMM d')}</span>
                                                        </div>
                                                        <div className="flex items-center text-sm text-gray-600">
                                                            <Activity className="h-4 w-4 mr-2 text-gray-400" />
                                                            <span className="font-medium">${advert.amount_paid}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                                            <p className="text-gray-500 font-medium">No adverts scheduled for this date.</p>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default SalesCalendar;
