import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Award, Share2, Download, Star, Code, Briefcase, Zap, Globe, Trophy } from 'lucide-react';
import Button from '../components/Button';
import axios from 'axios';
import './Portfolio.css';

const API_URL = '/api';

export default function Portfolio() {
  const { user } = useAuth();
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const portfolioRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    
    axios.get(`${API_URL}/skills`)
      .then(res => {
        const mySkills = res.data[user.id] || [];
        setSkills(mySkills);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  const handleShare = () => {
    // In a real app, this would generate a public URL
    navigator.clipboard.writeText(`https://skillswap.app/portfolio/${user?.id}`);
    alert('Public portfolio link copied to clipboard!');
  };

  const offeredSkills = skills.filter(s => s.type === 'offer' || s.level === 'Advanced' || s.level === 'Expert' || s.level === 'Intermediate');

  if (loading) {
    return <div className="portfolio-loading"><Zap className="spin" size={40} /></div>;
  }

  return (
    <div className="portfolio-page container fade-in">
      <div className="portfolio-header">
        <h1><Trophy className="header-icon text-brand" /> AI Portfolio Generator</h1>
        <p className="text-muted">Your verified skills and gamified achievements, ready to share with the world.</p>
        
        <div className="portfolio-actions">
          <Button onClick={handleShare} className="btn-share">
            <Share2 size={16} /> Share Link
          </Button>
          <Button variant="secondary" onClick={() => window.print()} className="btn-download">
            <Download size={16} /> Export PDF
          </Button>
        </div>
      </div>

      <div className="portfolio-certificate glass-panel" ref={portfolioRef}>
        <div className="cert-header">
          <div className="cert-logo">
            <span className="text-gradient">Skill</span>Xchange
            <div className="cert-verified">
              <Award size={14} /> Verified Member
            </div>
          </div>
          <div className="cert-user">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="cert-avatar" />
            ) : (
              <div className="cert-avatar-placeholder">{user?.name?.charAt(0)}</div>
            )}
          </div>
        </div>

        <div className="cert-body">
          <h2 className="cert-name">{user?.name}</h2>
          <p className="cert-bio">{user?.bio || "Dedicated continuous learner and skill sharer."}</p>
          
          <div className="cert-stats-grid">
            <div className="cert-stat">
              <span className="stat-value text-gradient">Lvl {user?.level || 1}</span>
              <span className="stat-label">Platform Level</span>
            </div>
            <div className="cert-stat">
              <span className="stat-value">{user?.swapsCompleted || 0}</span>
              <span className="stat-label">Successful Swaps</span>
            </div>
            <div className="cert-stat">
              <span className="stat-value">{user?.hoursTaught || 0}</span>
              <span className="stat-label">Hours Taught</span>
            </div>
            <div className="cert-stat">
              <span className="stat-value"><Star size={16} fill="#fbbf24" color="#fbbf24"/> {user?.rating?.toFixed(1) || '5.0'}</span>
              <span className="stat-label">Peer Rating</span>
            </div>
          </div>

          <div className="cert-skills-section">
            <h3><Code size={18} /> Verified Expertise</h3>
            <div className="cert-skills-list">
              {offeredSkills.length > 0 ? (
                offeredSkills.map(skill => (
                  <div key={skill.id} className="cert-skill-badge">
                    <span className="skill-name">{skill.name}</span>
                    <span className={`skill-level level-${skill.level.toLowerCase()}`}>{skill.level}</span>
                  </div>
                ))
              ) : (
                <p className="text-muted text-sm">Complete swaps to verify your teaching skills.</p>
              )}
            </div>
          </div>
          
          <div className="cert-achievements">
            <h3><Briefcase size={18} /> Recent Achievements</h3>
            <ul className="achievement-list">
              <li>Completed a Project-Based Swap ({new Date().toLocaleDateString()})</li>
              <li>Maintained a {user?.streak || 0} day learning streak</li>
              <li>Earned {user?.xp || 0} total XP points</li>
            </ul>
          </div>
        </div>

        <div className="cert-footer">
          <div className="cert-id">Certificate ID: {user?.id?.substring(0,8).toUpperCase()}-{Date.now().toString().slice(-6)}</div>
          <div className="cert-date">Issued: {new Date().toLocaleDateString()}</div>
        </div>
      </div>
    </div>
  );
}
