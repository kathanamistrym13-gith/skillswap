import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

const AuthContext = createContext(null);

const API_URL = '/api';

// Always returns a human-readable error string, never [object Object]
const extractError = (err, fallback = 'Something went wrong. Please try again.') => {
  if (!err) return fallback;
  // Axios error with response body
  if (err.response?.data?.error && typeof err.response.data.error === 'string') {
    return err.response.data.error;
  }
  if (err.response?.data?.message && typeof err.response.data.message === 'string') {
    return err.response.data.message;
  }
  if (typeof err.response?.data === 'string' && err.response.data.length > 0) {
    return err.response.data;
  }
  // Network error (no response)
  if (err.message && typeof err.message === 'string') return err.message;
  if (typeof err === 'string') return err;
  return fallback;
};

const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
};

const createSocket = (userId) => {
  const url = getSocketUrl();
  if (!url) return null;

  try {
    const newSocket = io(url, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      timeout: 10000,
      autoConnect: true
    });

    newSocket.on('connect', () => {
      newSocket.emit('register', userId);
    });

    newSocket.on('connect_error', (err) => {
      // Silently handle socket failure in serverless environments
      console.warn('Real-time socket connection not available:', err.message);
    });

    return newSocket;
  } catch (e) {
    console.warn('Socket initialization failed:', e);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Check local storage for existing session
    const storedUser = localStorage.getItem('skillxchange_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      
      const newSocket = createSocket(parsedUser.id);
      if (newSocket) setSocket(newSocket);
    }
    setLoading(false);

    return () => {
      if (socket) socket.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email, password) => {
    try {
      const res = await axios.post(`${API_URL}/login`, { email, password });
      const userData = res.data;
      
      setUser(userData);
      localStorage.setItem('skillxchange_user', JSON.stringify(userData));
      
      if (socket) socket.disconnect();
      const newSocket = createSocket(userData.id);
      if (newSocket) setSocket(newSocket);
      
      return userData;
    } catch (err) {
      throw new Error(extractError(err, 'Login failed'));
    }
  };

  const signup = async (name, email, password) => {
    try {
      const res = await axios.post(`${API_URL}/signup`, { name, email, password });
      const userData = res.data;
      
      setUser(userData);
      localStorage.setItem('skillxchange_user', JSON.stringify(userData));
      
      if (socket) socket.disconnect();
      const newSocket = createSocket(userData.id);
      if (newSocket) setSocket(newSocket);
      
      return userData;
    } catch (err) {
      throw new Error(extractError(err, 'Signup failed'));
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const res = await axios.put(`${API_URL}/users/${user.id}`, profileData);
      const updatedUser = res.data;
      setUser(updatedUser);
      localStorage.setItem('skillxchange_user', JSON.stringify(updatedUser));
      return updatedUser;
    } catch (err) {
      throw new Error(err.response?.data?.error || 'Failed to update profile');
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('skillxchange_user');
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
  };

  useEffect(() => {
    if (!socket) return;
    const handleXpUpdate = (data) => {
      if (data && data.user) {
        setUser(data.user);
        localStorage.setItem('skillxchange_user', JSON.stringify(data.user));
      }
    };
    socket.on('xp_updated', handleXpUpdate);
    return () => {
      socket.off('xp_updated', handleXpUpdate);
    };
  }, [socket]);

  const addXP = async (amount, reason = 'Completed Action') => {
    if (!user) return;
    try {
      const res = await axios.post(`${API_URL}/users/${user.id}/add-xp`, { xpAmount: amount, reason });
      if (res.data && res.data.user) {
        setUser(res.data.user);
        localStorage.setItem('skillxchange_user', JSON.stringify(res.data.user));
      }
      return res.data;
    } catch (err) {
      console.error('Failed to add XP:', err);
    }
  };

  const value = {
    user,
    login,
    signup,
    updateProfile,
    addXP,
    logout,
    loading,
    socket
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
