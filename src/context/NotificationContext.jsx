import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const NotificationContext = createContext();

export function useNotifications() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const { user, socket } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Mock initial notifications
  useEffect(() => {
    if (user) {
      setNotifications([
        {
          id: 1,
          type: 'request',
          title: 'New Swap Request',
          message: 'Alex wants to learn React from you.',
          read: false,
          date: new Date().toISOString()
        },
        {
          id: 2,
          type: 'message',
          title: 'New Message',
          message: 'Sarah sent you a message about UX Design.',
          read: true,
          date: new Date(Date.now() - 86400000).toISOString()
        }
      ]);
    }
  }, [user]);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  useEffect(() => {
    if (socket && user) {
      const handleNewNotification = (notification) => {
        setNotifications(prev => [notification, ...prev]);
      };
      // We will emit this event from server in the future, simulating for now
      socket.on('new_notification', handleNewNotification);
      return () => socket.off('new_notification', handleNewNotification);
    }
  }, [socket, user]);

  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const addNotification = (notification) => {
    setNotifications(prev => [{ id: Date.now(), ...notification, read: false, date: new Date().toISOString() }, ...prev]);
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, addNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}
