import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Input from '../components/Input';
import Button from '../components/Button';
import SkillCard from '../components/SkillCard';
import SwapRequestsList from '../components/SwapRequestsList';
import EditProfileModal from '../components/EditProfileModal';
import VerificationModal from '../components/VerificationModal';
import { PlusCircle, Search, Inbox, AlertCircle, User, Settings, BookOpen, Lightbulb, Sparkles, Award, Zap, Coins, Flame, Users, UserCheck, Mic2, Compass, ArrowRight } from 'lucide-react';
import UserProfileModal from '../components/UserProfileModal';
import axios from 'axios';
import './Dashboard.css';

const API_URL = '/api';

export default function Dashboard() {
  const { user, socket, updateProfile, addXP } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [skills, setSkills] = useState([]);
  const [swapRequests, setSwapRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserForModal, setSelectedUserForModal] = useState(null);

  // Offer form
  const [newOfferSkill, setNewOfferSkill] = useState('');
  const [newOfferLevel, setNewOfferLevel] = useState('Intermediate');

  // Want form
  const [newWantSkill, setNewWantSkill] = useState('');
  const [newWantLevel, setNewWantLevel] = useState('Beginner');

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('offer'); // 'offer' | 'want' | 'followers' | 'following'
  const [error, setError] = useState('');

  // AI Goal Tracker State
  const [aiGoalInput, setAiGoalInput] = useState('');
  const [goalData, setGoalData] = useState(null);
  const [loadingGoal, setLoadingGoal] = useState(false);

  // Skill Verification Modal State
  const [verifySkillTarget, setVerifySkillTarget] = useState(null);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);

  const fetchSwapRequests = async () => {
    if (!user) return;
    try {
      const res = await axios.get(`${API_URL}/swap-requests/${user.id}`);
      setSwapRequests(res.data);
    } catch (err) {
      console.error('Failed to fetch swap requests', err);
    }
  };

  useEffect(() => {
    if (user) {
      axios.get(`${API_URL}/skills/${user.id}`)
        .then(res => setSkills(res.data))
        .catch(err => {
          console.error('Failed to fetch skills', err);
          setError('Failed to load your skills');
        });

      axios.get(`${API_URL}/users`)
        .then(res => setAllUsers(res.data))
        .catch(console.error);

      fetchSwapRequests();
    }
  }, [user]);

  useEffect(() => {
    if (!socket) return;

    const handleNewRequest = () => fetchSwapRequests();
    const handleStatusUpdate = () => fetchSwapRequests();
    const handleNewFollower = () => {
      axios.get(`${API_URL}/users`).then(res => setAllUsers(res.data));
    };

    socket.on('swap_request_received', handleNewRequest);
    socket.on('swap_request_status_updated', handleStatusUpdate);
    socket.on('new_follower', handleNewFollower);

    return () => {
      socket.off('swap_request_received', handleNewRequest);
      socket.off('swap_request_status_updated', handleStatusUpdate);
      socket.off('new_follower', handleNewFollower);
    };
  }, [socket]);

  const handleStatusUpdate = async (requestId, status) => {
    try {
      const res = await axios.put(`${API_URL}/swap-requests/${requestId}/status`, { status });
      setSwapRequests(prev => prev.map(r => r.id === requestId ? res.data : r));
    } catch (err) {
      console.error('Failed to update request status', err);
    }
  };

  const handleAddSkill = async (e, type) => {
    e.preventDefault();
    setError('');
    const skillName = type === 'offer' ? newOfferSkill : newWantSkill;
    const skillLevel = type === 'offer' ? newOfferLevel : newWantLevel;
    if (!skillName.trim()) return;

    try {
      const res = await axios.post(`${API_URL}/skills`, {
        userId: user.id,
        name: skillName.trim(),
        level: skillLevel,
        type
      });
      // Defensively merge 'type' in case the API response omits it
      setSkills(prev => [...prev, { ...res.data, type }]);
      // Award +20 XP in real-time when adding a skill
      if (addXP) {
        addXP(20, `Added new ${type} skill: ${skillName}`);
      }

      if (type === 'offer') {
        setNewOfferSkill('');
        setNewOfferLevel('Intermediate');
      } else {
        setNewWantSkill('');
        setNewWantLevel('Beginner');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add skill');
    }
  };

  const handleDeleteSkill = async (id) => {
    try {
      await axios.delete(`${API_URL}/skills/${id}`);
      setSkills(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      setError('Failed to delete skill');
    }
  };

  const handleGenerateGoal = async (e) => {
    e.preventDefault();
    if (!aiGoalInput.trim()) return;
    setLoadingGoal(true);
    try {
      const res = await axios.post(`${API_URL}/ai/goals`, { goal: aiGoalInput });
      setGoalData(res.data);
      setAiGoalInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGoal(false);
    }
  };


  const offeredSkills = skills.filter(s =>
    s.type === 'offer' ||
    (!s.type && (s.level === 'Advanced' || s.level === 'Expert' || s.level === 'Intermediate'))
  );
  // Include explicit 'want' type OR legacy Beginner skills that predate the type field
  const wantedSkills = skills.filter(s =>
    s.type === 'want' ||
    (!s.type && s.level === 'Beginner')
  );

  const displaySkills = activeTab === 'offer' ? offeredSkills : wantedSkills;
  const filteredSkills = displaySkills.filter(skill =>
    skill.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Followers / Following list rendered outside JSX to avoid IIFE in JSX
  const socialUserIds = activeTab === 'followers' ? (user?.followers || []) : (user?.following || []);
  const socialUsers = allUsers.filter(u => socialUserIds.includes(u.id));
  const filteredSocialUsers = socialUsers.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const renderSocialList = () => {
    if (socialUsers.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon"><Users size={48} /></div>
          <h4>{activeTab === 'followers' ? 'No followers yet' : 'Not following anyone yet'}</h4>
          <p>{activeTab === 'followers' ? 'Share your skills and engage with the community to grow your network!' : 'Explore community members and click Follow to connect with them!'}</p>
        </div>
      );
    }
    if (filteredSocialUsers.length === 0) {
      return (
        <div className="empty-state">
          <p>No users match your search.</p>
        </div>
      );
    }
    return (
      <div className="followers-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
        {filteredSocialUsers.map(u => (
          <div
            key={u.id}
            className="follower-card glass-panel"
            onClick={() => setSelectedUserForModal(u)}
            style={{ padding: '1.25rem', borderRadius: '16px', background: '#ffffff', border: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.9rem', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', transition: 'transform 0.2s, box-shadow 0.2s' }}
          >
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', overflow: 'hidden', background: '#F1F5F9', flexShrink: 0 }}>
              {u.avatar ? (
                <img src={u.avatar} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontWeight: 800 }}>
                  {u.name.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0F172A' }}>{u.name}</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748B' }}>{u.location || 'Global'} &middot; {u.rating?.toFixed(1) || '5.0'} XP</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
    <div className="dashboard container">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">My Toolkit &amp; Proposals</h1>
          <p className="dashboard-subtitle">Manage your skills, what you want to learn, and handle swap requests.</p>
        </div>
      </header>

      {/* AI Superchargers Quick Action Banner */}
      <div className="glass-panel mb-4 p-4 glow-border" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(14,165,233,0.1) 100%)', borderRadius: '1rem', border: '1px solid rgba(99,102,241,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
              <Mic2 size={20} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>AI Voice Practice Simulator</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>Live voice mock interviews &amp; language exchange</p>
            </div>
          </div>
          <Link to="/simulator" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.8rem', background: '#6366f1', color: '#fff', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none' }}>
            Practice <ArrowRight size={13} />
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', borderLeft: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(14,165,233,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#38bdf8' }}>
              <Compass size={20} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>Dream Job Career Copilot</h4>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>Analyze job gaps &amp; match with target mentors</p>
            </div>
          </div>
          <Link to="/career-copilot" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.8rem', background: '#0284c7', color: '#fff', borderRadius: '0.5rem', fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none' }}>
            Launch <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-error mb-4" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', gap: '0.5rem' }}>
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      {/* Swap Requests Management Section */}
      <SwapRequestsList
        requests={swapRequests}
        userId={user?.id}
        onStatusUpdate={handleStatusUpdate}
      />

      <div className="dashboard-grid">
        {/* Left Column - Add Skill Forms */}
        <div className="dashboard-sidebar">

          {/* Tab switcher for form */}
          <div className="skill-form-tabs">
            <button
              className={`skill-tab-btn ${activeTab === 'offer' ? 'active' : ''}`}
              onClick={() => setActiveTab('offer')}
            >
              <Lightbulb size={15} />
              I Can Teach
            </button>
            <button
              className={`skill-tab-btn ${activeTab === 'want' ? 'active want-active' : ''}`}
              onClick={() => setActiveTab('want')}
            >
              <BookOpen size={15} />
              I Want to Learn
            </button>
          </div>

          {/* Offer Skills Form */}
          {activeTab === 'offer' && (
            <div className="glass-panel add-skill-card skill-form-offer">
              <div className="skill-form-icon offer-icon">
                <Lightbulb size={20} />
              </div>
              <h3>Skills I Can Teach</h3>
              <p className="text-muted text-sm mb-4">What expertise do you want to share with the community?</p>

              <form onSubmit={(e) => handleAddSkill(e, 'offer')} className="add-skill-form">
                <Input
                  id="offerSkillName"
                  placeholder="e.g. React, Guitar, Spanish"
                  value={newOfferSkill}
                  onChange={(e) => setNewOfferSkill(e.target.value)}
                />

                <div className="input-wrapper mt-2">
                  <select
                    className="input-field select-field"
                    value={newOfferLevel}
                    onChange={(e) => setNewOfferLevel(e.target.value)}
                  >
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                    <option value="Expert">Expert</option>
                  </select>
                </div>

                {error && <p style={{ color: 'var(--error)', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</p>}

                <Button type="submit" className="w-full mt-4">
                  <PlusCircle size={18} />
                  Add Teaching Skill
                </Button>
              </form>
            </div>
          )}

          {/* Want-to-Learn Form */}
          {activeTab === 'want' && (
            <div className="glass-panel add-skill-card skill-form-want">
              <div className="skill-form-icon want-icon">
                <BookOpen size={20} />
              </div>
              <h3>Skills I Want to Learn</h3>
              <p className="text-muted text-sm mb-4">What do you want to learn? The AI will find people who can teach you.</p>

              <form onSubmit={(e) => handleAddSkill(e, 'want')} className="add-skill-form">
                <Input
                  id="wantSkillName"
                  placeholder="e.g. Python, Piano, French"
                  value={newWantSkill}
                  onChange={(e) => setNewWantSkill(e.target.value)}
                />

                <div className="input-wrapper mt-2">
                  <select
                    className="input-field select-field"
                    value={newWantLevel}
                    onChange={(e) => setNewWantLevel(e.target.value)}
                  >
                    <option value="Beginner">Complete Beginner</option>
                    <option value="Intermediate">Some Experience</option>
                  </select>
                </div>

                {error && <p style={{ color: 'var(--error)', fontSize: '0.8rem', marginTop: '0.5rem' }}>{error}</p>}

                <Button type="submit" variant="secondary" className="w-full mt-4 want-btn">
                  <PlusCircle size={18} />
                  Add Learning Goal
                </Button>
              </form>
            </div>
          )}

          {/* Stats Card */}
          <div className="stats-card glass-panel mt-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="stat-item">
              <span className="stat-value text-gradient">{offeredSkills.length}</span>
              <span className="stat-label">Teaching</span>
            </div>
            <div className="stat-item want-stat">
              <span className="stat-value want-gradient">{wantedSkills.length}</span>
              <span className="stat-label">Want to Learn</span>
            </div>
            <div className="stat-item">
              <span className="stat-value text-gradient">{user?.hoursTaught || 0}</span>
              <span className="stat-label">Hrs Taught</span>
            </div>
            <div className="stat-item want-stat">
              <span className="stat-value want-gradient">{user?.hoursLearned || 0}</span>
              <span className="stat-label">Hrs Learned</span>
            </div>
          </div>

          {/* AI Match Hint */}
          {wantedSkills.length > 0 && (
            <div className="glass-panel ai-hint-card mt-4">
              <div className="ai-hint-header">
                <Sparkles size={16} className="ai-hint-icon" />
                <span>AI Matching Active</span>
              </div>
              <p className="text-muted text-sm">
                Your {wantedSkills.length} learning goal{wantedSkills.length > 1 ? 's are' : ' is'} powering the AI matcher on the <strong>Explore</strong> page.
              </p>
            </div>
          )}

          {/* AI Goal Tracker */}
          <div className="glass-panel mt-4 ai-goal-card">
            <div className="ai-hint-header mb-3">
              <Sparkles size={16} className="ai-hint-icon text-brand" />
              <span>AI Goal Tracker</span>
            </div>
            
            {!goalData ? (
              <form onSubmit={handleGenerateGoal}>
                <p className="text-muted text-sm mb-2">Set a long-term goal and let AI create a plan.</p>
                <Input 
                  placeholder="e.g. Become a Senior Frontend Dev" 
                  value={aiGoalInput}
                  onChange={(e) => setAiGoalInput(e.target.value)}
                />
                <Button type="submit" variant="secondary" className="w-full mt-2" disabled={loadingGoal}>
                  {loadingGoal ? 'Planning...' : 'Generate Plan'}
                </Button>
              </form>
            ) : (
              <div className="goal-view fade-in">
                <h4 className="mb-1">{goalData.goal}</h4>
                <p className="text-muted text-sm mb-3">"{goalData.motivation}"</p>
                <div className="goal-milestones">
                  {goalData.milestones.map(m => (
                    <div key={m.id} className="milestone-item">
                      <div className="milestone-dot"></div>
                      <span className="text-sm">{m.title}</span>
                    </div>
                  ))}
                </div>
                <Button variant="ghost" className="w-full mt-3 text-xs" onClick={() => setGoalData(null)}>
                  Set New Goal
                </Button>
              </div>
            )}
          </div>

          {/* Profile Card */}
          <div className="glass-panel profile-card mt-4">
            <div className="profile-card-inner">
              <div className="profile-card-avatar">
                {user?.avatar ? (
                  <img src={user.avatar} alt={user?.name} className="profile-card-img" />
                ) : (
                  <User size={28} />
                )}
              </div>
              <div className="profile-card-info">
                <p className="profile-card-name">{user?.name}</p>
                <p className="profile-card-email text-muted text-sm">{user?.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full mt-3"
              onClick={() => setIsEditModalOpen(true)}
            >
              <Settings size={16} /> Edit Profile
            </Button>
          </div>
        </div>

        {/* Right Column - Skills List */}
        <div className="dashboard-main glass-panel">
          
          {/* Gamification Overview with Real-Time Level Progress */}
          <div className="gamification-overview mb-4">
            <div className="gamification-card">
              <div className="gamification-icon level-icon"><Award size={24} /></div>
              <div className="gamification-info">
                <span className="gamification-label">Level</span>
                <span className="gamification-value">{user?.level || Math.floor((user?.xp || 0) / 100) + 1}</span>
              </div>
            </div>
            <div className="gamification-card xp-live-card">
              <div className="gamification-icon xp-icon"><Zap size={24} className="pulse-icon" /></div>
              <div className="gamification-info">
                <span className="gamification-label">Real-Time XP</span>
                <span className="gamification-value text-gradient">{user?.xp || 0} XP</span>
              </div>
            </div>
            <div className="gamification-card">
              <div className="gamification-icon credits-icon"><Coins size={24} /></div>
              <div className="gamification-info">
                <span className="gamification-label">Credits</span>
                <span className="gamification-value">{user?.credits || 5}</span>
              </div>
            </div>
            <div className="gamification-card">
              <div className="gamification-icon streak-icon"><Flame size={24} /></div>
              <div className="gamification-info">
                <span className="gamification-label">Streak</span>
                <span className="gamification-value">{user?.streak || 0} Days</span>
              </div>
            </div>
          </div>

          {/* Level Progress Bar */}
          <div className="level-progress-container mb-4">
            <div className="level-progress-header">
              <span>Level Progress</span>
              <span>{(user?.xp || 0) % 100} / 100 XP to Level {(user?.level || Math.floor((user?.xp || 0) / 100) + 1) + 1}</span>
            </div>
            <div className="level-progress-track">
              <div
                className="level-progress-fill"
                style={{ width: `${Math.min(100, (user?.xp || 0) % 100)}%` }}
              />
            </div>
          </div>

          {/* View toggle tabs */}
          <div className="skills-view-tabs">
            <button
              className={`skills-view-tab ${activeTab === 'offer' ? 'active' : ''}`}
              onClick={() => setActiveTab('offer')}
            >
              <Lightbulb size={16} />
              Teaching ({offeredSkills.length})
            </button>
            <button
              className={`skills-view-tab ${activeTab === 'want' ? 'active want-tab-active' : ''}`}
              onClick={() => setActiveTab('want')}
            >
              <BookOpen size={16} />
              Want to Learn ({wantedSkills.length})
            </button>
            <button
              className={`skills-view-tab ${activeTab === 'followers' ? 'active' : ''}`}
              onClick={() => setActiveTab('followers')}
            >
              <Users size={16} />
              Followers ({user?.followers?.length || 0})
            </button>
            <button
              className={`skills-view-tab ${activeTab === 'following' ? 'active' : ''}`}
              onClick={() => setActiveTab('following')}
            >
              <UserCheck size={16} />
              Following ({user?.following?.length || 0})
            </button>
          </div>

          <div className="skills-header">
            <h3>
              {activeTab === 'offer' && 'Skills You Can Teach'}
              {activeTab === 'want' && 'Your Learning Goals'}
              {activeTab === 'followers' && 'People Following You'}
              {activeTab === 'following' && 'People You Follow'}
            </h3>
            <div className="search-box">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder={activeTab === 'followers' || activeTab === 'following' ? "Search users..." : "Search skills..."}
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="skills-list">
            {(activeTab === 'followers' || activeTab === 'following') ? (
              renderSocialList()
            ) : displaySkills.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  {activeTab === 'offer' ? <Lightbulb size={48} /> : <BookOpen size={48} />}
                </div>
                <h4>{activeTab === 'offer' ? 'No teaching skills yet' : 'No learning goals yet'}</h4>
                <p>
                  {activeTab === 'offer'
                    ? 'Add skills you can teach to attract swap partners.'
                    : 'Add skills you want to learn — the AI will find people who can teach you!'}
                </p>
              </div>
            ) : filteredSkills.length === 0 ? (
              <div className="empty-state">
                <p>No skills match your search.</p>
              </div>
            ) : (
              <div className="skills-grid">
                {filteredSkills.map(skill => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    onDelete={handleDeleteSkill}
                    onVerify={(sk) => { setVerifySkillTarget(sk); setIsVerifyModalOpen(true); }}
                    variant={activeTab === 'want' ? 'want' : 'offer'}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>

      {selectedUserForModal && (
        <UserProfileModal
          isOpen={!!selectedUserForModal}
          onClose={() => setSelectedUserForModal(null)}
          userProfile={selectedUserForModal}
          userSkills={[]}
        />
      )}

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentUser={user}
        onSave={async (profileData) => { await updateProfile(profileData); }}
      />

      <VerificationModal
        isOpen={isVerifyModalOpen}
        onClose={() => {
          setIsVerifyModalOpen(false);
          setVerifySkillTarget(null);
        }}
        skill={verifySkillTarget}
        onVerified={async (skillId, verifiedSkill) => {
          const targetId = verifiedSkill?.id || verifySkillTarget?.id || skillId;
          const targetName = verifiedSkill?.name || verifySkillTarget?.name || (typeof skillId === 'string' ? skillId : '');

          // Update local state immediately
          setSkills(prevSkills =>
            prevSkills.map(s => {
              const isMatch = (targetId && s.id === targetId) ||
                              (targetName && s.name && (s.name === targetName || s.name.toLowerCase() === targetName.toLowerCase()));
              if (isMatch) {
                return { ...s, verified: true };
              }
              return s;
            })
          );

          // Persist to backend
          try {
            if (targetId) {
              await axios.put(`${API_URL}/skills/${targetId}/verify`);
            }
          } catch (err) {
            console.error('Failed to persist verified skill status to backend', err);
          }

          // Award XP bonus
          if (addXP) {
            addXP(50, `Certified skill: ${targetName || 'Skill'}`);
          }
        }}
      />
    </>
  );
}
