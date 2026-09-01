import { X, User, Mail, Phone, MapPin, Star, Briefcase, Calendar, Linkedin, Github, Twitter, Globe, MessageCircle, ArrowRightLeft, Copy, Check, ThumbsUp, Award, UserPlus, UserCheck, Users } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import Button from './Button';
import './UserProfileModal.css';

export default function UserProfileModal({ 
  isOpen, 
  onClose, 
  userProfile: initialUserProfile, 
  userSkills = [], 
  onMessage, 
  onRequestSwap 
}) {
  const { user: currentUser, updateProfile } = useAuth();

  // All hooks must be declared before any early return
  const [userProfile, setUserProfile] = useState(initialUserProfile);
  const [copiedField, setCopiedField] = useState(null);
  const [endorsements, setEndorsements] = useState({});
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  useEffect(() => {
    setUserProfile(initialUserProfile);
  }, [initialUserProfile]);

  useEffect(() => {
    if (!userProfile) return;
    setIsFollowing(currentUser?.following?.includes(userProfile.id) || false);
    setFollowersCount(userProfile.followers?.length || 0);
  }, [currentUser, userProfile]);

  // Early return after all hooks
  if (!isOpen || !userProfile) return null;

  const handleFollowToggle = async () => {
    if (!currentUser || currentUser.id === userProfile.id) return;
    try {
      const res = await axios.post(`/api/users/${userProfile.id}/follow`, {
        currentUserId: currentUser.id
      });
      setIsFollowing(res.data.isFollowing);
      setFollowersCount(res.data.targetUser?.followers?.length || 0);
      if (updateProfile) {
        // Update current user context locally
        updateProfile(res.data.currentUser);
      }
    } catch (err) {
      console.error('Failed to follow/unfollow user:', err);
    }
  };

  const handleEndorse = (skillName) => {
    setEndorsements(prev => ({
      ...prev,
      [skillName]: (prev[skillName] || 0) + 1
    }));
  };

  const offeredSkills = userSkills.filter(s => s.level === 'Advanced' || s.level === 'Expert' || s.level === 'Intermediate');
  const learningSkills = userSkills.filter(s => s.level === 'Beginner' || s.level === 'Intermediate');

  const copyToClipboard = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const isSelf = currentUser?.id === userProfile.id;

  return (
    <div className="modal-overlay fade-in">
      <div className="user-profile-modal glass-panel glow-border">
        <button className="btn-close-modal" onClick={onClose} aria-label="Close">
          <X size={20} />
        </button>

        <div className="profile-header-hero">
          <div className="profile-avatar-wrapper">
            {userProfile.avatar ? (
              <img src={userProfile.avatar} alt={userProfile.name} className="profile-avatar-img" />
            ) : (
              <div className="profile-avatar-fallback">
                <User size={36} />
              </div>
            )}
          </div>

          <div className="profile-header-info">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h2>{userProfile.name}</h2>
              {!isSelf && (
                <button
                  className={`btn-follow ${isFollowing ? 'following' : ''}`}
                  onClick={handleFollowToggle}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.45rem 1rem',
                    borderRadius: '100px',
                    fontSize: '0.83rem',
                    fontWeight: 700,
                    border: isFollowing ? '1px solid #10b981' : 'none',
                    background: isFollowing ? 'rgba(16, 185, 129, 0.1)' : 'var(--brand-primary, #10b981)',
                    color: isFollowing ? '#10b981' : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {isFollowing ? <><UserCheck size={14} /> Following</> : <><UserPlus size={14} /> Follow</>}
                </button>
              )}
            </div>

            <div className="profile-meta-row">
              <span className="meta-pill"><MapPin size={12} /> {userProfile.location || 'Global'}</span>
              <span className="meta-pill rating"><Star size={12} fill="currentColor" /> {userProfile.rating?.toFixed(1) || '5.0'}</span>
              <span className="meta-pill swaps">{userProfile.swapsCompleted || 0} Swaps</span>
              <span className="meta-pill" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                <Users size={12} /> {followersCount} Followers · {userProfile.following?.length || 0} Following
              </span>
            </div>
          </div>
        </div>

        <div className="profile-modal-body">
          {/* Bio */}
          <div className="profile-section">
            <h4 className="section-title">About</h4>
            <p className="bio-text">{userProfile.bio || "Passionate about skill exchange and growing together."}</p>
          </div>

          {/* Contact Details */}
          <div className="profile-section">
            <h4 className="section-title">Contact & Connectivity</h4>
            <div className="contact-grid">
              {userProfile.email && (
                <div className="contact-item" onClick={() => copyToClipboard(userProfile.email, 'email')}>
                  <Mail size={16} className="icon-contact" />
                  <span className="contact-val">{userProfile.email}</span>
                  <span className="btn-copy">
                    {copiedField === 'email' ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                  </span>
                </div>
              )}

              {userProfile.phone && (
                <div className="contact-item" onClick={() => copyToClipboard(userProfile.phone, 'phone')}>
                  <Phone size={16} className="icon-contact" />
                  <span className="contact-val">{userProfile.phone}</span>
                  <span className="btn-copy">
                    {copiedField === 'phone' ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Social Links */}
          {(userProfile.linkedin || userProfile.github || userProfile.twitter || userProfile.website) && (
            <div className="profile-section">
              <h4 className="section-title">Social Links & Portfolios</h4>
              <div className="social-badges-row">
                {userProfile.linkedin && (
                  <a href={userProfile.linkedin} target="_blank" rel="noopener noreferrer" className="social-pill linkedin">
                    <Linkedin size={16} /> LinkedIn
                  </a>
                )}
                {userProfile.github && (
                  <a href={userProfile.github} target="_blank" rel="noopener noreferrer" className="social-pill github">
                    <Github size={16} /> GitHub
                  </a>
                )}
                {userProfile.twitter && (
                  <a href={userProfile.twitter} target="_blank" rel="noopener noreferrer" className="social-pill twitter">
                    <Twitter size={16} /> Twitter / X
                  </a>
                )}
                {userProfile.website && (
                  <a href={userProfile.website} target="_blank" rel="noopener noreferrer" className="social-pill website">
                    <Globe size={16} /> Website
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Skills Breakdown */}
          <div className="profile-section">
            <h4 className="section-title"><Briefcase size={14} /> Skills Offered (Teaching)</h4>
            <div className="skills-tags-row">
              {offeredSkills.length === 0 ? (
                <span className="text-muted text-sm">No teaching skills listed yet.</span>
              ) : (
                offeredSkills.map(s => (
                  <div key={s.id || s.name} className="skill-badge-wrapper" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginRight: '0.5rem', marginBottom: '0.5rem' }}>
                    <span className="skill-badge offer">{s.name} ({s.level})</span>
                    <button 
                      className="btn-endorse-sm" 
                      onClick={() => handleEndorse(s.name)}
                      title={`Endorse ${s.name}`}
                      style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', color: '#818cf8', borderRadius: '12px', padding: '0.15rem 0.4rem', fontSize: '0.72rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                    >
                      <ThumbsUp size={10} /> {endorsements[s.name] || 0}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="profile-section">
            <h4 className="section-title"><Calendar size={14} /> Skills Wanted (Learning)</h4>
            <div className="skills-tags-row">
              {learningSkills.length === 0 ? (
                <span className="text-muted text-sm">No learning goals listed yet.</span>
              ) : (
                learningSkills.map(s => (
                  <span key={s.id || s.name} className="skill-badge want">{s.name} ({s.level})</span>
                ))
              )}
            </div>
          </div>

          {/* Peer Reviews */}
          <div className="profile-section mt-4">
            <h4 className="section-title"><Star size={14} /> Peer Endorsements & Reviews</h4>
            <div className="peer-reviews-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
              <div className="review-card-sm" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '8px', padding: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.2rem' }}>
                  <span>Alex Rivera</span>
                  <span style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Star size={10} fill="currentColor" /> 5.0</span>
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                  "Great instructor! Explained key concepts clearly during our 1-on-1 swap."
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-modal-footer">
          {onMessage && (
            <Button variant="ghost" onClick={() => { onClose(); onMessage(userProfile.id); }}>
              <MessageCircle size={18} /> Direct Message
            </Button>
          )}

          {onRequestSwap && (
            <Button className="btn-swap-primary" onClick={() => { onClose(); onRequestSwap(userProfile); }}>
              <ArrowRightLeft size={18} /> Request Skill Swap
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
