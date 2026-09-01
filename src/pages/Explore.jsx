import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import SwapRequestModal from '../components/SwapRequestModal';
import UserProfileModal from '../components/UserProfileModal';
import { 
  Search, MapPin, User, MessageCircle,
  Flame, Filter, Star, Briefcase, Calendar, CheckCircle, Sparkles, Zap, ArrowRightLeft 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './Explore.css';

const API_URL = '/api';

const CATEGORIES = [
  'All', '⚡ AI Mutual Matches', 'Programming', 'Design', 'Languages', 'Music', 'Business', 'Photography', 'Marketing'
];

const SORT_OPTIONS = [
  { label: 'AI Match Score', value: 'ai_score' },
  { label: 'Recently Joined', value: 'newest' },
  { label: 'Highest Rated', value: 'rating' },
  { label: 'Most Active', value: 'activity' }
];

export default function Explore() {
  const { user, socket } = useAuth();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState('ai_score');
  const [levelFilter, setLevelFilter] = useState('All');
  
  const [allUsers, setAllUsers] = useState([]);
  const [allSkills, setAllSkills] = useState({});
  const [aiMatchMap, setAiMatchMap] = useState({});
  const [swapRequests, setSwapRequests] = useState([]);
  const [mySkills, setMySkills] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Swap modal state
  const [selectedUserForSwap, setSelectedUserForSwap] = useState(null);
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapModalLoading, setSwapModalLoading] = useState(false);

  // Public profile view modal state
  const [viewProfileUser, setViewProfileUser] = useState(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const fetchExploreData = async () => {
    if (!user) return;
    try {
      // Use Promise.allSettled so user cards still show even if AI matches / requests fail
      const [usersResult, skillsResult, aiMatchesResult, requestsResult] = await Promise.allSettled([
        axios.get(`${API_URL}/users`),
        axios.get(`${API_URL}/skills`),
        axios.get(`${API_URL}/ai-matches/${user.id}`),
        axios.get(`${API_URL}/swap-requests/${user.id}`)
      ]);

      if (usersResult.status === 'fulfilled') {
        const otherUsers = usersResult.value.data.filter(u => u.id !== user.id);
        setAllUsers(otherUsers);
      } else {
        const serverError = usersResult.reason?.response?.data?.error;
        const msg = serverError || usersResult.reason?.message || 'Unknown error';
        console.error('usersResult rejected:', usersResult.reason);
        setError('Failed to load community users: ' + msg);
      }

      if (skillsResult.status === 'fulfilled') {
        setAllSkills(skillsResult.value.data);
        setMySkills(skillsResult.value.data[user.id] || []);
      } else {
        console.error('skillsResult rejected:', skillsResult.reason);
      }

      if (aiMatchesResult.status === 'fulfilled') {
        const map = {};
        aiMatchesResult.value.data.forEach(match => { map[match.userId] = match; });
        setAiMatchMap(map);
      }

      if (requestsResult.status === 'fulfilled') {
        setSwapRequests(requestsResult.value.data);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load community data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExploreData();
  }, [user]);

  // Real-time socket event listeners
  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => {
      axios.get(`${API_URL}/swap-requests/${user.id}`).then(res => setSwapRequests(res.data)).catch(() => {});
    };
    socket.on('swap_request_received', handleUpdate);
    socket.on('swap_request_status_updated', handleUpdate);
    return () => {
      socket.off('swap_request_received', handleUpdate);
      socket.off('swap_request_status_updated', handleUpdate);
    };
  }, [socket, user]);

  const handleMessageUser = (targetUserId) => {
    navigate(`/messages/${targetUserId}`);
  };

  const handleOpenSwapModal = (targetUser) => {
    setProfileModalOpen(false);
    setSelectedUserForSwap(targetUser);
    setSwapModalOpen(true);
  };

  const handleViewProfile = (profileUser) => {
    setViewProfileUser(profileUser);
    setProfileModalOpen(true);
  };

  const handleSendSwapProposal = async (proposalData) => {
    setSwapModalLoading(true);
    try {
      const res = await axios.post(`${API_URL}/swap-requests`, {
        requesterId: user.id,
        ...proposalData
      });
      setSwapRequests(prev => [res.data, ...prev]);
      setSwapModalOpen(false);
      setSelectedUserForSwap(null);
      navigate(`/messages/${proposalData.recipientId}`);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || 'Failed to send swap proposal');
    } finally {
      setSwapModalLoading(false);
    }
  };

  // Advanced Filtering & Sorting Logic
  const filteredAndSortedUsers = allUsers
    .filter(u => {
      const userSkills = allSkills[u.id] || [];
      const aiMatch = aiMatchMap[u.id];

      if (activeCategory === '⚡ AI Mutual Matches') {
        if (!aiMatch || !aiMatch.isMutual) return false;
      } else if (activeCategory !== 'All') {
        const categoryMatches = userSkills.some(skill => 
          skill.name.toLowerCase().includes(activeCategory.toLowerCase()) || 
          (activeCategory === 'Programming' && ['react', 'js', 'python', 'html', 'css', 'node', 'typescript'].some(kw => skill.name.toLowerCase().includes(kw))) ||
          (activeCategory === 'Design' && ['figma', 'ui', 'ux', 'photoshop', 'illustrator'].some(kw => skill.name.toLowerCase().includes(kw))) ||
          (activeCategory === 'Languages' && ['english', 'spanish', 'french', 'mandarin', 'hindi', 'japanese'].some(kw => skill.name.toLowerCase().includes(kw))) ||
          (activeCategory === 'Music' && ['guitar', 'piano', 'violin', 'drums', 'singing', 'music'].some(kw => skill.name.toLowerCase().includes(kw)))
        );
        if (!categoryMatches) return false;
      }

      if (levelFilter === 'Expert') {
        const hasExpert = userSkills.some(s => s.level === 'Advanced' || s.level === 'Expert');
        if (!hasExpert) return false;
      }

      if (!searchQuery) return true;
      const term = searchQuery.toLowerCase();
      return u.name.toLowerCase().includes(term) || userSkills.some(s => s.name.toLowerCase().includes(term));
    })
    .sort((a, b) => {
      if (sortBy === 'ai_score') {
        const scoreA = aiMatchMap[a.id]?.matchScore || 0;
        const scoreB = aiMatchMap[b.id]?.matchScore || 0;
        return scoreB - scoreA;
      }
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'activity') return (b.swapsCompleted || 0) - (a.swapsCompleted || 0);
      if (sortBy === 'newest') return new Date(b.joinedAt || 0) - new Date(a.joinedAt || 0);
      return 0;
    });

  return (
    <div className="explore container">
      <header className="explore-header fade-in-up">
        <div className="explore-hero">
          <h1 className="explore-title">
            Find Your <span className="text-gradient">AI Mutual Skill</span> Partner
          </h1>
          <p className="explore-subtitle">
            Our AI algorithm matches your skills with creators who offer what you want to learn.
          </p>
        </div>
        
        <div className="explore-controls glass-panel">
          <div className="search-box">
            <Search size={20} className="icon-muted" />
            <input 
              type="text" 
              placeholder="Search people, expertise or topics..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="divider-v"></div>
          <div className="filter-dropdown">
            <Filter size={18} className="icon-muted" />
            <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
              <option value="All">All Skill Levels</option>
              <option value="Expert">Experts Only</option>
            </select>
          </div>
          <div className="divider-v"></div>
          <div className="sort-dropdown">
            <span className="sort-label">Sort:</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
        </div>

        <div className="category-scroll">
          <div className="category-pills">
            {CATEGORIES.map(cat => (
              <button 
                key={cat} 
                className={`pill ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      {error && <div className="alert alert-error mb-4">{error}</div>}

      {loading ? (
        <div className="loading-grid">
          {[1,2,3,4,5,6].map(i => <div key={i} className="skeleton-card glass-panel"></div>)}
        </div>
      ) : (
        <div className="explore-results">
          {filteredAndSortedUsers.length === 0 ? (
            <div className="empty-state glass-panel">
              <Search size={48} className="empty-icon text-brand" />
              <h4>No users found</h4>
              <p>Try broadening your filters or searching for something else.</p>
            </div>
          ) : (
            <div className="users-grid">
              {filteredAndSortedUsers.map(profileUser => {
                const userSkills = allSkills[profileUser.id] || [];
                const offeredSkills = userSkills.filter(s => s.level === 'Advanced' || s.level === 'Expert' || s.level === 'Intermediate');
                const learningSkills = userSkills.filter(s => s.level === 'Beginner' || s.level === 'Intermediate');
                const aiMatch = aiMatchMap[profileUser.id] || { matchScore: 50, isMutual: false, matchReason: '' };
                const existingRequest = swapRequests.find(r => 
                  (r.requesterId === user.id && r.recipientId === profileUser.id) ||
                  (r.recipientId === user.id && r.requesterId === profileUser.id)
                );

                return (
                  <div key={profileUser.id} className={`user-profile-card glass-panel ${aiMatch.isMutual ? 'match-glow' : ''}`}>
                    {/* AI Score Badge */}
                    <div className="ai-score-badge">
                      <Zap size={14} fill="currentColor" />
                      <span>{aiMatch.matchScore}% AI Match</span>
                    </div>

                    {aiMatch.isMutual && (
                      <div className="match-ribbon">
                        <Flame size={12} /> 2-WAY MUTUAL
                      </div>
                    )}
                    
                    <div className="card-top">
                      <div className="profile-badge-row">
                        {/* Clickable Avatar → opens profile viewer */}
                        <button
                          className="profile-avatar-premium"
                          onClick={() => handleViewProfile(profileUser)}
                          title={`View ${profileUser.name}'s profile`}
                        >
                          {profileUser.avatar ? (
                            <img src={profileUser.avatar} alt={profileUser.name} className="avatar-img-round" />
                          ) : (
                            <User size={28} />
                          )}
                          {profileUser.swapsCompleted > 5 && <CheckCircle className="verified-check" size={16} />}
                        </button>

                        <div className="profile-meta">
                          {/* Clickable Name → opens profile viewer */}
                          <button
                            className="profile-name-btn"
                            onClick={() => handleViewProfile(profileUser)}
                            title="View full profile"
                          >
                            <h3>{profileUser?.name || 'Explorer'}</h3>
                          </button>
                          <div className="location-row">
                            <MapPin size={12} /> <span>{profileUser.location || 'Global'}</span>
                          </div>
                          {/* Social Links mini row */}
                          <div className="social-mini-row">
                            {profileUser.linkedin && (
                              <a href={profileUser.linkedin} target="_blank" rel="noopener noreferrer" className="social-mini-link li" title="LinkedIn">in</a>
                            )}
                            {profileUser.github && (
                              <a href={profileUser.github} target="_blank" rel="noopener noreferrer" className="social-mini-link gh" title="GitHub">⌥</a>
                            )}
                            {profileUser.twitter && (
                              <a href={profileUser.twitter} target="_blank" rel="noopener noreferrer" className="social-mini-link tw" title="Twitter/X">𝕏</a>
                            )}
                          </div>
                        </div>
                        <div className="rating-badge">
                          <Star size={12} fill="currentColor" />
                          <span>{profileUser.rating?.toFixed(1) || '5.0'}</span>
                        </div>
                      </div>

                      <p className="user-bio">{profileUser.bio || "Passionate about skill exchange and growing together."}</p>

                      {aiMatch.matchReason && (
                        <div className="ai-reason-callout">
                          <Sparkles size={14} className="sparkle-icon" />
                          <span>{aiMatch.matchReason}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="card-body">
                      <div className="card-section">
                        <div className="section-label"><Briefcase size={14} /> TEACHING</div>
                        <div className="tags-container">
                          {offeredSkills.length === 0 ? (
                            <span className="tag-empty">No skills listed</span>
                          ) : (
                            offeredSkills.map(s => (
                              <span key={s.id || s.name} className="tag tag-offered" title={s.verified ? "Verified Skill" : s.name}>
                                {s.name}{s.verified ? ' ✓' : ''}
                              </span>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="card-section">
                        <div className="section-label"><Calendar size={14} /> LEARNING</div>
                        <div className="tags-container">
                          {learningSkills.length === 0 ? (
                            <span className="tag-empty">No goals listed</span>
                          ) : (
                            learningSkills.map(s => (
                              <span key={s.id || s.name} className="tag tag-learning">{s.name}</span>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="card-stats-row">
                      <div className="stat">
                        <span className="stat-value">{profileUser.swapsCompleted || 0}</span>
                        <span className="stat-label">Swaps</span>
                      </div>
                      <div className="stat">
                        <span className="stat-value">24h</span>
                        <span className="stat-label">Response</span>
                      </div>
                      <div className="stat">
                        <span className="stat-value">{userSkills.length}</span>
                        <span className="stat-label">Skills</span>
                      </div>
                    </div>

                    <div className="card-footer-actions">
                      <Button 
                        variant="ghost"
                        className="btn-chat-icon"
                        onClick={() => handleMessageUser(profileUser.id)}
                        title="Send a message"
                      >
                        <MessageCircle size={20} />
                      </Button>

                      {existingRequest ? (
                        <div className={`request-status-pill status-${existingRequest.status}`}>
                          {existingRequest.status === 'pending' && 'Pending'}
                          {existingRequest.status === 'accepted' && '✓ Accepted'}
                          {existingRequest.status === 'rejected' && 'Rejected'}
                        </div>
                      ) : (
                        <Button 
                          className="btn-swap-primary"
                          onClick={() => handleOpenSwapModal(profileUser)}
                        >
                          <ArrowRightLeft size={16} /> Request Swap
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Swap Request Proposal Modal */}
      <SwapRequestModal
        isOpen={swapModalOpen}
        onClose={() => setSwapModalOpen(false)}
        targetUser={selectedUserForSwap}
        targetSkills={selectedUserForSwap ? (allSkills[selectedUserForSwap.id] || []) : []}
        mySkills={mySkills}
        onSubmit={handleSendSwapProposal}
        loading={swapModalLoading}
      />

      {/* Public User Profile Viewer Modal */}
      <UserProfileModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
        userProfile={viewProfileUser}
        userSkills={viewProfileUser ? (allSkills[viewProfileUser.id] || []) : []}
        onMessage={handleMessageUser}
        onRequestSwap={handleOpenSwapModal}
      />
    </div>
  );
}
