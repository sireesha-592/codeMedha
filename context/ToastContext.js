// src/context/ToastContext.js
// Converted from web ToastContext.js
// Browser Notifications → react-native-toast-message
// axios polling preserved

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import Toast from 'react-native-toast-message';
import { useAuth } from './AuthContext';
import api, { API_BASE } from '../api';

const ToastContext = createContext();
export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const pollRef = useRef(null);
  const lastFetchRef = useRef(null);

  const showToast = useCallback((title, message, type = 'info') => {
    Toast.show({
      type: type === 'class' ? 'success' : type === 'assignment' ? 'info' : 'success',
      text1: title,
      text2: message,
      position: 'top',
      visibilityTime: 4000,
    });
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!token || !user) return;
    try {
      const res = await api.get(`${API_BASE}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data || [];
      const unread = data.filter(n => !n.read).length;
      setNotifications(data);
      setUnreadCount(unread);

      // Show toast for new notifications since last fetch
      if (lastFetchRef.current && data.length > 0) {
        const newOnes = data.filter(n =>
          !n.read && new Date(n.createdAt) > lastFetchRef.current
        );
        newOnes.slice(0, 2).forEach(n => {
          showToast(n.title || 'New Notification', n.message || '', n.type);
        });
      }
      lastFetchRef.current = new Date();
    } catch (e) {}
  }, [token, user, showToast]);

  // Poll every 30 seconds when logged in
  useEffect(() => {
    if (!user || !token) return;
    fetchNotifications();
    pollRef.current = setInterval(fetchNotifications, 30000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [user, token, fetchNotifications]);

  const markAsRead = async (notifId) => {
    try {
      await api.post(`${API_BASE}/api/notifications/${notifId}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev =>
        prev.map(n => n._id === notifId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {}
  };

  const markAllRead = async () => {
    try {
      await api.post(`${API_BASE}/api/notifications/read-all`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {}
  };

  return (
    <ToastContext.Provider value={{ notifications, unreadCount, showToast, markAsRead, markAllRead, refetch: fetchNotifications }}>
      {children}
    </ToastContext.Provider>
  );
};
