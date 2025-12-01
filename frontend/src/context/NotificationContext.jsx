import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider = ({ children }) => {
    const { user, token } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    // API URL helper
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

    const fetchNotifications = useCallback(async () => {
        if (!user || !token) {
            console.log('⚠️ NotificationContext: No user or token', { user: !!user, token: !!token });
            return;
        }

        console.log('🔔 Fetching notifications...', { API_URL, userId: user.id });

        try {
            const response = await axios.get(`${API_URL}/notifications`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('✅ Notifications response:', response.data);

            if (response.data.success) {
                setNotifications(response.data.data.notifications);
                setUnreadCount(response.data.data.unreadCount);
                console.log('📬 Notifications set:', response.data.data.notifications.length, 'total,', response.data.data.unreadCount, 'unread');
            }
        } catch (error) {
            console.error('❌ Error fetching notifications:', error);
            console.error('Error details:', error.response?.data || error.message);
        }
    }, [user, token, API_URL]);

    const markAsRead = async (id) => {
        try {
            await axios.patch(`${API_URL}/notifications/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Optimistic update
            setNotifications(prev => prev.map(n =>
                n.id === id ? { ...n, is_read: true } : n
            ));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
            fetchNotifications(); // Revert on error
        }
    };

    const markAllAsRead = async () => {
        try {
            await axios.patch(`${API_URL}/notifications/read-all`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Optimistic update
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            fetchNotifications(); // Revert on error
        }
    };

    // Poll for notifications
    useEffect(() => {
        if (user) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
            return () => clearInterval(interval);
        }
    }, [user, fetchNotifications]);

    const value = {
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead
    };

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    );
};
