import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isWithinInterval, parseISO } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Loader } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

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
            if (response.data.success) {
                setAdverts(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching adverts:', error);
        } finally {
            setLoading(false);
        }
    };

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const getAdvertsForDay = (day) => {
        return adverts.filter(advert => {
            const start = parseISO(advert.start_date);
            const end = parseISO(advert.end_date);
            return isWithinInterval(day, { start, end });
        });
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
            <div className="flex items-center justify-center min-h-screen">
                <Loader className="h-8 w-8 animate-spin text-red-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Advert Calendar</h1>
                    <p className="text-gray-500">Visualize your advert schedules</p>
                </div>

                <div className="flex items-center space-x-4 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                    <button onClick={prevMonth} className="p-2 hover:bg-gray-50 rounded-md">
                        <ChevronLeft className="h-5 w-5 text-gray-600" />
                    </button>
                    <span className="text-lg font-semibold text-gray-900 min-w-[140px] text-center">
                        {format(currentDate, 'MMMM yyyy')}
                    </span>
                    <button onClick={nextMonth} className="p-2 hover:bg-gray-50 rounded-md">
                        <ChevronRight className="h-5 w-5 text-gray-600" />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Days Header */}
                <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="py-3 text-center text-sm font-semibold text-gray-500">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 auto-rows-fr">
                    {calendarDays.map((day, dayIdx) => {
                        const dayAdverts = getAdvertsForDay(day);
                        const isSelected = selectedDate && isSameDay(day, selectedDate);

                        return (
                            <div
                                key={day.toString()}
                                onClick={() => setSelectedDate(day)}
                                className={`
                                    min-h-[120px] p-2 border-b border-r border-gray-100 transition-colors cursor-pointer
                                    ${!isSameMonth(day, monthStart) ? 'bg-gray-50/50' : 'bg-white'}
                                    ${isSameDay(day, new Date()) ? 'bg-blue-50/30' : ''}
                                    ${isSelected ? 'ring-2 ring-inset ring-red-500' : 'hover:bg-gray-50'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className={`
                                        text-sm font-medium h-7 w-7 flex items-center justify-center rounded-full
                                        ${isSameDay(day, new Date())
                                            ? 'bg-red-600 text-white'
                                            : !isSameMonth(day, monthStart) ? 'text-gray-400' : 'text-gray-700'}
                                    `}>
                                        {format(day, 'd')}
                                    </span>
                                    {dayAdverts.length > 0 && (
                                        <span className="text-xs font-medium text-gray-400">
                                            {dayAdverts.length}
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-1 overflow-y-auto max-h-[80px] scrollbar-hide">
                                    {dayAdverts.slice(0, 3).map((advert) => (
                                        <div
                                            key={advert.id}
                                            className={`
                                                text-[10px] px-1.5 py-0.5 rounded border truncate
                                                ${getStatusColor(advert.status)}
                                            `}
                                            title={`${advert.client_name} - ${advert.advert_type}`}
                                        >
                                            {advert.client_name}
                                        </div>
                                    ))}
                                    {dayAdverts.length > 3 && (
                                        <div className="text-[10px] text-gray-500 pl-1">
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
            {selectedDate && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
                >
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Adverts for {format(selectedDate, 'MMMM d, yyyy')}
                    </h3>

                    {getAdvertsForDay(selectedDate).length > 0 ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {getAdvertsForDay(selectedDate).map(advert => (
                                <div key={advert.id} className="p-4 rounded-lg border border-gray-200 hover:border-red-200 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(advert.status)}`}>
                                            {advert.status.toUpperCase()}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {advert.advert_type}
                                        </span>
                                    </div>
                                    <h4 className="font-medium text-gray-900 truncate">{advert.client_name}</h4>
                                    <div className="mt-2 text-sm text-gray-500 space-y-1">
                                        <div className="flex justify-between">
                                            <span>Duration:</span>
                                            <span>{format(parseISO(advert.start_date), 'MMM d')} - {format(parseISO(advert.end_date), 'MMM d')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Amount:</span>
                                            <span>${advert.amount_paid}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-8">No adverts running on this date.</p>
                    )}
                </motion.div>
            )}
        </div>
    );
};

export default SalesCalendar;
