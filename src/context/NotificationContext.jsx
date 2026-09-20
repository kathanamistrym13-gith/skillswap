import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import ToastNotification from '../components/ToastNotification';
import axios from 'axios';

const API_URL = '/api';

const NotificationContext = createContext();

export function useNotifications() {
  return useContext(NotificationContext);
}

// Web Audio synthesizer for cheerful notifications without external audio assets
const playChime = (type = 'message') => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    if (type === 'task' || type === 'success') {
      // Ascending triumphant major triad for task completion
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
        gain.gain.setValueAtTime(0.06, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.35);
      });
    } else {
      // Gentle two-tone ping for messages
      const notes = [587.33, 880]; // D5, A5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.05, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.3);
      });
    }
  } catch {}
};

export function NotificationProvider({ children }) {
  const { user, socket } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState([]);
  const seenMsgIdsRef = useRef(new Set());
  const seenSwapIdsRef = useRef(new Map()); // id -> status
  const lastCallTimeRef = useRef(0);

  // Initialize notifications from localStorage or defaults
  useEffect(() => {
    if (user) {
      const storageKey = `skillxchange_notifs_${user.id}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          setNotifications(JSON.parse(saved));
        } catch {
          setNotifications([]);
        }
      } else {
        setNotifications([
          {
            id: 1,
            type: 'request',
            title: 'Welcome to SkillXchange',
            message: 'Connect with mentors and swap your skills!',
            read: false,
            date: new Date().toISOString()
          }
        ]);
      }
    } else {
      setNotifications([]);
    }
  }, [user]);

  // Persist notifications
  useEffect(() => {
    if (user && notifications.length > 0) {
      localStorage.setItem(`skillxchange_notifs_${user.id}`, JSON.stringify(notifications.slice(0, 50)));
    }
  }, [notifications, user]);

  useEffect(() => {
    setUnreadCount(notifications.filter(n => !n.read).length);
  }, [notifications]);

  const showToast = (toastData) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const newToast = { id, ...toastData };
    setToasts(prev => [newToast, ...prev.slice(0, 4)]); // Max 5 toasts
    playChime(toastData.type);
    return id;
  };

  const dismissToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const addNotification = (notif) => {
    const newNotif = {
      id: Date.now(),
      read: false,
      date: new Date().toISOString(),
      ...notif
    };
    setNotifications(prev => [newNotif, ...prev]);
    showToast({
      title: notif.title,
      message: notif.message,
      type: notif.type || 'info',
      xp: notif.xp,
      link: notif.link,
      data: notif
    });
  };

  // 1. Real-time Socket Event Handlers
  useEffect(() => {
    if (!socket || !user) return;

    // Incoming Message Notification
    const handleReceiveMessage = (msg) => {
      if (msg.receiverId === user.id && msg.senderId !== user.id) {
        seenMsgIdsRef.current.add(msg.id);
        
        // Fetch sender info if needed
        axios.get(`${API_URL}/users`).then(res => {
          const sender = res.data.find(u => u.id === msg.senderId);
          const senderName = sender ? sender.name : 'A user';
          
          addNotification({
            type: 'message',
            title: `New Message from ${senderName}`,
            message: msg.text.length > 60 ? msg.text.substring(0, 60) + '...' : msg.text,
            link: `/messages/${msg.senderId}`
          });
        }).catch(() => {
          addNotification({
            type: 'message',
            title: 'New Message',
            message: msg.text,
            link: `/messages/${msg.senderId}`
          });
        });
      }
    };

    // Swap Request Received
    const handleSwapRequestReceived = (req) => {
      if (req.recipientId === user.id) {
        addNotification({
          type: 'request',
          title: 'New Skill Swap Proposal! 🔄',
          message: `${req.requesterName || 'A user'} wants to exchange: [${req.offeredSkill}] for [${req.wantedSkill}]`,
          link: '/dashboard'
        });
      }
    };

    // Swap Request Status Updated (Task Completed / Accepted)
    const handleSwapStatusUpdated = (req) => {
      const isMyAction = req.updatedBy === user.id;
      if (!isMyAction) {
        if (req.status === 'completed') {
          addNotification({
            type: 'task',
            title: '🎉 Skill Swap Task Completed!',
            message: `Your exchange of [${req.offeredSkill} ↔ ${req.wantedSkill}] is marked complete!`,
            xp: 50,
            link: '/dashboard'
          });
        } else if (req.status === 'accepted') {
          addNotification({
            type: 'task',
            title: '✨ Swap Proposal Accepted!',
            message: `Your proposal for [${req.offeredSkill} ↔ ${req.wantedSkill}] was accepted. Let's start learning!`,
            link: '/dashboard'
          });
        }
      }
    };

    // Call History Updated
    const handleCallHistoryUpdate = (callRecord) => {
      if (callRecord.receiverId === user.id && callRecord.status === 'missed') {
        addNotification({
          type: 'call',
          title: 'Missed Video Call 📹',
          message: `${callRecord.callerName || 'Partner'} tried to video call you.`,
          link: `/messages/${callRecord.callerId}`
        });
      }
    };

    // General server notification event
    const handleGenericNotification = (notif) => {
      addNotification(notif);
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('swap_request_received', handleSwapRequestReceived);
    socket.on('swap_request_status_updated', handleSwapStatusUpdated);
    socket.on('call_history_updated', handleCallHistoryUpdate);
    socket.on('new_notification', handleGenericNotification);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('swap_request_received', handleSwapRequestReceived);
      socket.off('swap_request_status_updated', handleSwapStatusUpdated);
      socket.off('call_history_updated', handleCallHistoryUpdate);
      socket.off('new_notification', handleGenericNotification);
    };
  }, [socket, user]);

  // 2. Vercel Serverless Background Polling Sync (Ensures live notifications work even without WebSockets)
  useEffect(() => {
    if (!user) return;

    let isInitialLoad = true;

    const pollServerUpdates = async () => {
      try {
        // Poll for new incoming messages
        const msgRes = await axios.get(`${API_URL}/messages/${user.id}`);
        const allMsgs = msgRes.data || [];
        
        if (!isInitialLoad) {
          allMsgs.forEach(msg => {
            if (msg.receiverId === user.id && !seenMsgIdsRef.current.has(msg.id)) {
              seenMsgIdsRef.current.add(msg.id);
              // Only notify if message was sent in the last 15 seconds
              if (Date.now() - msg.timestamp < 15000) {
                addNotification({
                  type: 'message',
                  title: 'New Message',
                  message: msg.text.length > 60 ? msg.text.substring(0, 60) + '...' : msg.text,
                  link: `/messages/${msg.senderId}`
                });
              }
            }
          });
        } else {
          allMsgs.forEach(m => seenMsgIdsRef.current.add(m.id));
        }

        // Poll for swap requests status updates
        const swapRes = await axios.get(`${API_URL}/swap-requests/${user.id}`);
        const allSwaps = swapRes.data || [];
        
        if (!isInitialLoad) {
          allSwaps.forEach(req => {
            const prevStatus = seenSwapIdsRef.current.get(req.id);
            if (prevStatus && prevStatus !== req.status) {
              if (req.status === 'completed') {
                addNotification({
                  type: 'task',
                  title: '🎉 Task Completed: Skill Swap!',
                  message: `Swap [${req.offeredSkill} ↔ ${req.wantedSkill}] is now complete!`,
                  xp: 50,
                  link: '/dashboard'
                });
              } else if (req.status === 'accepted' && req.recipientId !== user.id) {
                addNotification({
                  type: 'task',
                  title: '✨ Proposal Accepted!',
                  message: `${req.recipientName} accepted your skill exchange proposal.`,
                  link: '/dashboard'
                });
              }
            }
            seenSwapIdsRef.current.set(req.id, req.status);
          });
        } else {
          allSwaps.forEach(r => seenSwapIdsRef.current.set(r.id, r.status));
        }

        isInitialLoad = false;
      } catch (err) {
        // Polling errors ignored
      }
    };

    pollServerUpdates();
    const interval = setInterval(pollServerUpdates, 4000); // 4 seconds polling for serverless responsiveness

    return () => clearInterval(interval);
  }, [user]);

  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleToastClick = (toast) => {
    if (toast.link && window.location.pathname !== toast.link) {
      window.location.href = toast.link;
    }
  };

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      markAsRead,
      markAllAsRead,
      addNotification,
      showToast,
      dismissToast
    }}>
      {children}

      {/* Floating Live Toasts Container */}
      <div className="toast-container" aria-live="polite">
        {toasts.map(toast => (
          <ToastNotification
            key={toast.id}
            toast={toast}
            onDismiss={dismissToast}
            onClick={handleToastClick}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}
