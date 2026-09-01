import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { LogOut, User, Menu, X, Settings, Sparkles, ChevronDown, BarChart2, Trophy, Users, BookMarked, CalendarDays, Layers, Bell, Mic2, Compass } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import EditProfileModal from './EditProfileModal';
import axios from 'axios';
import './Navbar.css';

const API_URL = '/api';

export default function Navbar() {
  const { user, logout, socket, updateProfile } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const moreRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const fetchRequests = async () => {
      try {
        const res = await axios.get(`${API_URL}/swap-requests/${user.id}`);
        const incomingPending = res.data.filter(r => r.recipientId === user.id && r.status === 'pending');
        setPendingCount(incomingPending.length);
      } catch (err) {
        console.error('Failed to fetch swap requests count', err);
      }
    };

    fetchRequests();

    if (socket) {
      const handleNewRequest = () => { setPendingCount(prev => prev + 1); };
      const handleStatusUpdate = () => { fetchRequests(); };
      socket.on('swap_request_received', handleNewRequest);
      socket.on('swap_request_status_updated', handleStatusUpdate);
      return () => {
        socket.off('swap_request_received', handleNewRequest);
        socket.off('swap_request_status_updated', handleStatusUpdate);
      };
    }
  }, [user, socket]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setIsMoreOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
    setIsMenuOpen(false);
  };

  const handleSaveProfile = async (profileData) => {
    await updateProfile(profileData);
  };

  const MORE_LINKS = [
    { to: '/simulator', label: 'AI Simulator', icon: <Mic2 size={15} className="text-brand" /> },
    { to: '/career-copilot', label: 'Career Copilot', icon: <Compass size={15} className="text-brand" /> },
    { to: '/portfolio', label: 'Portfolio', icon: <Layers size={15} /> },
    { to: '/forums', label: 'Forums', icon: <BookMarked size={15} /> },
    { to: '/meetups', label: 'Meetups', icon: <CalendarDays size={15} /> },
    { to: '/leaderboard', label: 'Leaderboard', icon: <Trophy size={15} /> },
    { to: '/analytics', label: 'Analytics', icon: <BarChart2 size={15} /> },
  ];

  return (
    <>
      <nav className="navbar glass-panel">
        <div className="container navbar-container">
          <Link to="/" className="navbar-logo">
            <span className="text-gradient">Skill</span>Xchange
          </Link>

          {/* Desktop Menu */}
          <div className="navbar-links desktop-only">
            {user ? (
              <>
                <Link to="/explore" className="nav-link">Explore</Link>
                <Link to="/matchmaking" className="nav-link">AI Match <Sparkles size={12} className="text-brand" style={{marginLeft:'4px'}}/></Link>
                <Link to="/roadmaps" className="nav-link">Roadmaps</Link>
                <Link to="/messages" className="nav-link">Messages</Link>
                <Link to="/dashboard" className="nav-link nav-link-badge">
                  Dashboard
                  {pendingCount > 0 && (
                    <span className="pending-requests-badge" title={`${pendingCount} pending swap requests`}>
                      {pendingCount}
                    </span>
                  )}
                </Link>

                {/* More Dropdown */}
                <div className="more-dropdown" ref={moreRef}>
                  <button
                    className={`nav-link more-trigger ${isMoreOpen ? 'active' : ''}`}
                    onClick={() => setIsMoreOpen(v => !v)}
                  >
                    More <ChevronDown size={14} className={`chevron ${isMoreOpen ? 'open' : ''}`} />
                  </button>
                  {isMoreOpen && (
                    <div className="more-menu glass-panel">
                      {MORE_LINKS.map(link => (
                        <Link
                          key={link.to}
                          to={link.to}
                          className="more-menu-item"
                          onClick={() => setIsMoreOpen(false)}
                        >
                          {link.icon} {link.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Notifications Dropdown */}
                <div className="notif-dropdown-container" ref={notifRef}>
                  <button 
                    className="btn-icon notif-trigger"
                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                    title="Notifications"
                  >
                    <Bell size={20} />
                    {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
                  </button>
                  {isNotifOpen && (
                    <div className="notif-dropdown glass-panel">
                      <div className="notif-header">
                        <h4>Notifications</h4>
                        {unreadCount > 0 && (
                          <button className="btn-mark-read" onClick={markAllAsRead}>Mark all read</button>
                        )}
                      </div>
                      <div className="notif-list">
                        {notifications.length === 0 ? (
                          <div className="notif-empty text-muted">No notifications yet.</div>
                        ) : (
                          notifications.map(notif => (
                            <div 
                              key={notif.id} 
                              className={`notif-item ${!notif.read ? 'unread' : ''}`}
                              onClick={() => { markAsRead(notif.id); if (notif.type==='request') navigate('/dashboard'); else if (notif.type==='message') navigate('/messages'); setIsNotifOpen(false); }}
                            >
                              <div className="notif-content">
                                <strong>{notif.title}</strong>
                                <p>{notif.message}</p>
                                <span className="notif-date">{new Date(notif.date).toLocaleDateString()}</span>
                              </div>
                              {!notif.read && <div className="notif-dot"></div>}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="user-menu">
                  <button
                    className="btn-user-profile"
                    onClick={() => setIsEditModalOpen(true)}
                    title="Edit Profile"
                  >
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="nav-user-avatar" />
                    ) : (
                      <User size={18} />
                    )}
                    <span>{user.name}</span>
                    <Settings size={14} className="icon-settings-sm" />
                  </button>
                  <button onClick={handleLogout} className="btn-icon" title="Logout">
                    <LogOut size={18} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-link">Log In</Link>
                <Link to="/register" className="btn-primary">Sign Up</Link>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <button
            className="mobile-toggle mobile-only"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="mobile-menu glass-panel">
            {user ? (
              <>
                <button
                  className="mobile-user-greeting"
                  onClick={() => { setIsEditModalOpen(true); setIsMenuOpen(false); }}
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="nav-user-avatar" />
                  ) : (
                    <User size={18} />
                  )}
                  Hi, {user.name} · Edit Profile
                </button>
                <Link to="/explore" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Explore</Link>
                <Link to="/matchmaking" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>AI Match <Sparkles size={12} style={{marginLeft:'4px'}}/></Link>
                <Link to="/roadmaps" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Roadmaps</Link>
                <Link to="/messages" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Messages</Link>
                <Link to="/dashboard" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>
                  Dashboard {pendingCount > 0 && `(${pendingCount})`}
                </Link>
                <Link to="/simulator" className="mobile-nav-link text-brand" onClick={() => setIsMenuOpen(false)}>AI Simulator 🎙️</Link>
                <Link to="/career-copilot" className="mobile-nav-link text-brand" onClick={() => setIsMenuOpen(false)}>Career Copilot 🎯</Link>
                <Link to="/portfolio" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Portfolio</Link>
                <Link to="/forums" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Forums</Link>
                <Link to="/meetups" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Meetups</Link>
                <Link to="/leaderboard" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Leaderboard</Link>
                <Link to="/analytics" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Analytics</Link>
                <button onClick={handleLogout} className="mobile-nav-link text-error">Logout</button>
              </>
            ) : (
              <>
                <Link to="/login" className="mobile-nav-link" onClick={() => setIsMenuOpen(false)}>Log In</Link>
                <Link to="/register" className="mobile-nav-link text-brand" onClick={() => setIsMenuOpen(false)}>Sign Up</Link>
              </>
            )}
          </div>
        )}
      </nav>

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentUser={user}
        onSave={handleSaveProfile}
      />
    </>
  );
}
