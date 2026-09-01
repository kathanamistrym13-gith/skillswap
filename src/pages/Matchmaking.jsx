import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, MessageCircle, ArrowRightLeft, Star, Users, MapPin, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Button from '../components/Button';
import SwapRequestModal from '../components/SwapRequestModal';
import './Matchmaking.css';

const API_URL = '/api';

export default function Matchmaking() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [matches, setMatches] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [allSkills, setAllSkills] = useState({});
  const [loading, setLoading] = useState(true);

  // Modal states
  const [selectedUserForSwap, setSelectedUserForSwap] = useState(null);
  const [swapModalOpen, setSwapModalOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchMatches = async () => {
      try {
        const [usersRes, skillsRes, matchesRes] = await Promise.all([
          axios.get(`${API_URL}/users`),
          axios.get(`${API_URL}/skills`),
          axios.get(`${API_URL}/ai-matches/${user.id}`)
        ]);

        setAllUsers(usersRes.data);
        setAllSkills(skillsRes.data);
        
        // Filter matches to top recommendations (slice top 6) and don't strictly require > 60 so it doesn't look broken if user is new
        const topMatches = matchesRes.data.sort((a, b) => b.matchScore - a.matchScore).slice(0, 6);
        setMatches(topMatches);
      } catch (err) {
        console.error('Failed to load matchmaking data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMatches();
  }, [user]);

  const handleMessageUser = (targetUserId) => {
    navigate(`/messages/${targetUserId}`);
  };

  const handleOpenSwapModal = (targetUserId) => {
    const targetUser = allUsers.find(u => u.id === targetUserId);
    if (targetUser) {
      setSelectedUserForSwap(targetUser);
      setSwapModalOpen(true);
    }
  };

  const handleSendSwapProposal = async (proposalData) => {
    try {
      await axios.post(`${API_URL}/swap-requests`, {
        requesterId: user.id,
        ...proposalData
      });
      setSwapModalOpen(false);
      setSelectedUserForSwap(null);
      navigate(`/messages/${proposalData.recipientId}`);
    } catch (err) {
      console.error('Failed to send swap proposal', err);
    }
  };

  if (loading) {
    return <div className="matchmaking-container"><div className="matchmaking-loading"><Sparkles className="animate-spin" /> Analyzing community skills...</div></div>;
  }

  return (
    <div className="matchmaking-container fade-in">
      <div className="matchmaking-hero">
        <h1><Sparkles className="text-brand" /> Smart Matchmaking</h1>
        <p>Our AI analyzes your learning goals to find the perfect skill exchange partners.</p>
      </div>

      <div className="match-grid">
        {matches.length === 0 ? (
          <div className="no-matches glass-panel">
            <Users size={48} className="text-muted mb-4" />
            <h3>No strong matches right now</h3>
            <p>Try adding more "Want to Learn" and "Teaching" skills to your profile to help the AI find better partners.</p>
            <Button onClick={() => navigate('/dashboard')} className="mt-4">Update My Profile</Button>
          </div>
        ) : (
          matches.map(match => {
            const matchUser = allUsers.find(u => u.id === match.userId);
            if (!matchUser) return null;
            
            const matchSkills = allSkills[match.userId] || [];
            const offered = matchSkills.filter(s => s.type === 'offer' || s.level === 'Expert' || s.level === 'Advanced');

            return (
              <div key={match.userId} className="match-card glass-panel">
                <div className="match-score-badge">
                  <span className="score-value">{match.matchScore}%</span>
                  <span className="score-label">Match</span>
                </div>
                
                <div className="match-card-header">
                  <div className="match-avatar-wrapper">
                    {matchUser.avatar ? (
                      <img src={matchUser.avatar} alt={matchUser.name} className="match-avatar" />
                    ) : (
                      <div className="match-avatar-placeholder"><User size={24} /></div>
                    )}
                  </div>
                  <div className="match-user-info">
                    <h3>{matchUser.name}</h3>
                    <div className="match-user-meta">
                      <span><Star size={12} fill="currentColor" className="text-warning" /> {matchUser.rating || '5.0'}</span>
                      {matchUser.location && <span><MapPin size={12} /> {matchUser.location}</span>}
                    </div>
                  </div>
                </div>

                <div className="match-reason-box">
                  <Sparkles size={14} className="text-brand flex-shrink-0 mt-1" />
                  <p>{match.matchReason}</p>
                </div>

                <div className="match-skills">
                  <h4>They Teach:</h4>
                  <div className="skill-tags">
                    {offered.slice(0, 3).map(s => (
                      <span key={s.name} className="skill-tag">{s.name}</span>
                    ))}
                    {offered.length > 3 && <span className="skill-tag-more">+{offered.length - 3}</span>}
                  </div>
                </div>

                <div className="match-actions">
                  <Button variant="ghost" onClick={() => handleMessageUser(match.userId)}>
                    <MessageCircle size={16} /> Chat
                  </Button>
                  <Button className="btn-primary" onClick={() => handleOpenSwapModal(match.userId)}>
                    <ArrowRightLeft size={16} /> Request Swap
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {swapModalOpen && selectedUserForSwap && (
        <SwapRequestModal
          isOpen={swapModalOpen}
          onClose={() => setSwapModalOpen(false)}
          targetUser={selectedUserForSwap}
          mySkills={allSkills[user.id] || []}
          targetSkills={allSkills[selectedUserForSwap.id] || []}
          onSubmit={handleSendSwapProposal}
        />
      )}
    </div>
  );
}
