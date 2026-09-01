import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, Flame, Star, Zap, Medal, ArrowUp, TrendingUp, Gamepad2, CheckCircle } from 'lucide-react';
import axios from 'axios';
import './Leaderboard.css';

const API_URL = '/api';

const TIER_BADGES = [
  { min: 1, max: 1, label: '🥇 Gold', cls: 'tier-gold' },
  { min: 2, max: 2, label: '🥈 Silver', cls: 'tier-silver' },
  { min: 3, max: 3, label: '🥉 Bronze', cls: 'tier-bronze' },
  { min: 4, max: 10, label: 'Top 10', cls: 'tier-top10' },
];

function getTier(rank) {
  for (const t of TIER_BADGES) {
    if (rank >= t.min && rank <= t.max) return t;
  }
  return null;
}

const DAILY_CHALLENGES = [
  {
    id: 1,
    question: "What is the Feynman Technique for rapid learning?",
    options: [
      "Reading a textbook 3 times repeatedly",
      "Explaining a concept simply as if teaching a child",
      "Memorizing definitions using flashcards",
      "Solving 100 multiple choice questions"
    ],
    answerIndex: 1,
    xpReward: 50
  },
  {
    id: 2,
    question: "What is the optimal way to retain a newly learned skill long-term?",
    options: [
      "Read a book about it passivey",
      "Watch a 10-hour tutorial marathon",
      "Teach it to someone else (Peer Learning)",
      "Memorize the documentation line by line"
    ],
    answerIndex: 2,
    xpReward: 50
  },
  {
    id: 3,
    question: "Which daily habit best builds long-term coding & skill muscle memory?",
    options: [
      "Cramming 12 hours once a week",
      "Consistent 30-minute daily hands-on practice",
      "Only practicing when a test is coming up",
      "Copying code without typing it out"
    ],
    answerIndex: 1,
    xpReward: 50
  },
  {
    id: 4,
    question: "What does 'Active Recall' mean in learning science?",
    options: [
      "Rereading highlighted notes multiple times",
      "Testing yourself on material without looking at the answer",
      "Listening to lectures while sleeping",
      "Highlighting important textbook lines with bright colors"
    ],
    answerIndex: 1,
    xpReward: 50
  },
  {
    id: 5,
    question: "In peer skill exchange, what is the best practice for effective feedback?",
    options: [
      "Only giving praise and avoiding constructive notes",
      "Providing specific, actionable suggestions for improvement",
      "Pointing out mistakes without explaining how to fix them",
      "Waiting a month before sharing your observations"
    ],
    answerIndex: 1,
    xpReward: 50
  },
  {
    id: 6,
    question: "What is 'Spaced Repetition' designed to combat in learning?",
    options: [
      "The Ebbinghaus Forgetting Curve",
      "Physical eye strain from screens",
      "Lack of social motivation",
      "Slow typing speeds"
    ],
    answerIndex: 0,
    xpReward: 50
  },
  {
    id: 7,
    question: "In Git, what does 'git commit' accomplish?",
    options: [
      "Uploads your code to GitHub immediately",
      "Saves a snapshot of staged changes to local repository history",
      "Deletes temporary files in your project",
      "Merges your branch into production automatically"
    ],
    answerIndex: 1,
    xpReward: 50
  },
  {
    id: 8,
    question: "What is the primary goal of UI/UX wireframing before coding?",
    options: [
      "Adding final brand colors and animations",
      "Mapping user flow and structural layout fast without visual distraction",
      "Writing production-ready database schemas",
      "Generating automated marketing materials"
    ],
    answerIndex: 1,
    xpReward: 50
  },
  {
    id: 9,
    question: "What does the 'Pareto Principle' (80/20 rule) imply for skill mastery?",
    options: [
      "80% of results come from 20% of core fundamentals",
      "You must spend 80 hours a week for 20 years to master a skill",
      "20% of learners fail 80% of the time",
      "You only need 20% attendance to pass a course"
    ],
    answerIndex: 0,
    xpReward: 50
  },
  {
    id: 10,
    question: "What is a 'Micro-Session' in peer-to-peer skill swapping?",
    options: [
      "A 4-hour intensive webinar",
      "A quick 15-to-20 minute focused exchange targeting one specific problem",
      "A silent self-study group session",
      "An automated bot-led quiz"
    ],
    answerIndex: 1,
    xpReward: 50
  },
  {
    id: 11,
    question: "In Python, what is the main advantage of Virtual Environments (venv)?",
    options: [
      "Makes your Python scripts run 10x faster",
      "Isolates project dependencies to prevent version conflicts",
      "Compiles Python into C++ code",
      "Automatically publishes your code to PyPI"
    ],
    answerIndex: 1,
    xpReward: 50
  },
  {
    id: 12,
    question: "What does 'Rubber Duck Debugging' involve?",
    options: [
      "Using AI code generators exclusively",
      "Explaining your code line-by-line out loud to an inanimate object",
      "Running automated unit tests in parallel",
      "Refactoring code without testing"
    ],
    answerIndex: 1,
    xpReward: 50
  },
  {
    id: 13,
    question: "In React, what is the key benefit of component reusability?",
    options: [
      "Eliminates the need for CSS styling completely",
      "Reduces duplicate code and ensures consistent UI behavior",
      "Bypasses browser security restrictions",
      "Automatically translates your app to 50 languages"
    ],
    answerIndex: 1,
    xpReward: 50
  },
  {
    id: 14,
    question: "What is 'Deliberate Practice' according to performance psychology?",
    options: [
      "Mindlessly repeating things you are already good at",
      "Focused practice targeting specific weaknesses with immediate feedback",
      "Listening to background music while studying",
      "Studying without any clear goals or benchmarks"
    ],
    answerIndex: 1,
    xpReward: 50
  },
  {
    id: 15,
    question: "Why is peer-to-peer teaching often more effective than traditional lectures?",
    options: [
      "Peers share recent learning hurdles and explain in relatable terms",
      "Traditional lectures are illegal in online learning",
      "Peers always have PhDs in pedagogy",
      "Peer exchanges take 0 seconds"
    ],
    answerIndex: 0,
    xpReward: 50
  }
];

export default function Leaderboard() {
  const { user, addXP } = useAuth();
  const [users, setUsers] = useState([]);
  const [sortBy, setSortBy] = useState('xp');
  const [loading, setLoading] = useState(true);

  // Daily Game State
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [gamePlayed, setGamePlayed] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);

  useEffect(() => {
    // Determine daily challenge index based on day of year
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now - start;
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const index = dayOfYear % DAILY_CHALLENGES.length;
    setChallengeIndex(index);

    const todayKey = `daily_game_played_${now.toISOString().slice(0,10)}`;
    const played = localStorage.getItem(todayKey);
    if (played) {
      setGamePlayed(true);
      setGameWon(localStorage.getItem(`${todayKey}_won`) === 'true');
    }

    axios.get(`${API_URL}/users`)
      .then(res => setUsers(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const currentChallenge = DAILY_CHALLENGES[challengeIndex];

  const handlePlayGame = async (index) => {
    if (gamePlayed) return;
    setSelectedOption(index);
    const isWin = index === currentChallenge.answerIndex;
    const now = new Date();
    const todayKey = `daily_game_played_${now.toISOString().slice(0,10)}`;
    
    setTimeout(async () => {
      setGamePlayed(true);
      setGameWon(isWin);
      localStorage.setItem(todayKey, 'true');
      localStorage.setItem(`${todayKey}_won`, isWin ? 'true' : 'false');
      
      if (isWin) {
        // 1. Credit real-time XP to user in database & AuthContext so it shows in Dashboard
        if (addXP) {
          await addXP(currentChallenge.xpReward, `Daily Challenge: ${currentChallenge.question}`);
        }

        // 2. Optimistically update local user XP in leaderboard list
        setUsers(prev => prev.map(u => 
          u.id === user?.id ? { ...u, xp: (u.xp || 0) + currentChallenge.xpReward } : u
        ));
      }
    }, 800);
  };

  const SORT_OPTIONS = [
    { value: 'xp', label: 'XP Points', icon: <Zap size={14} /> },
    { value: 'swapsCompleted', label: 'Swaps Done', icon: <ArrowUp size={14} /> },
    { value: 'hoursTaught', label: 'Hours Taught', icon: <TrendingUp size={14} /> },
    { value: 'streak', label: 'Streak', icon: <Flame size={14} /> },
    { value: 'rating', label: 'Rating', icon: <Star size={14} /> },
  ];

  const sorted = [...users].sort((a, b) => (b[sortBy] || 0) - (a[sortBy] || 0)).slice(0, 20);
  const myRank = sorted.findIndex(u => u.id === user?.id) + 1;

  if (loading) {
    return (
      <div className="leaderboard-page container fade-in">
        <div className="leaderboard-loading">
          <Trophy size={48} className="spin text-brand" />
          <p>Loading rankings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-page container fade-in">
      <div className="leaderboard-header">
        <div>
          <h1><Trophy className="header-icon text-brand" /> Global Leaderboard</h1>
          <p className="text-muted">See how you rank among the SkillXchange community.</p>
        </div>
        {myRank > 0 && (
          <div className="my-rank-badge glass-panel">
            <span className="rank-label">Your Rank</span>
            <span className="rank-num text-gradient">#{myRank}</span>
          </div>
        )}
      </div>

      {/* --- DAILY MINI-GAME SECTION --- */}
      <div className="daily-game-section glass-panel glow-border" style={{ marginBottom: '3rem', padding: '2rem', borderRadius: '24px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.02) 100%)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ background: 'var(--brand-primary)', padding: '0.5rem', borderRadius: '12px', color: '#fff' }}>
            <Gamepad2 size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--text-primary)' }}>Daily Challenge</h2>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Earn <strong className="text-brand">+{currentChallenge.xpReward} XP</strong> to boost your leaderboard rank!</p>
          </div>
        </div>

        {!gamePlayed ? (
          <div className="game-active">
            <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', color: 'var(--text-primary)' }}>{currentChallenge.question}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {currentChallenge.options.map((opt, idx) => (
                <button 
                  key={idx} 
                  onClick={() => handlePlayGame(idx)}
                  disabled={selectedOption !== null}
                  style={{
                    padding: '1rem',
                    background: selectedOption === idx ? 'var(--brand-primary)' : '#fff',
                    color: selectedOption === idx ? '#fff' : 'var(--text-primary)',
                    border: `2px solid ${selectedOption === idx ? 'var(--brand-primary)' : '#e5e7eb'}`,
                    borderRadius: '12px',
                    cursor: selectedOption !== null ? 'default' : 'pointer',
                    transition: 'all 0.2s',
                    fontWeight: 600,
                    textAlign: 'left'
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="game-result" style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '1rem', border: '1px solid #e5e7eb' }}>
            {gameWon ? (
              <>
                <CheckCircle size={32} className="text-success" />
                <div>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Correct! You earned {currentChallenge.xpReward} XP.</h3>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Come back tomorrow for another challenge.</p>
                </div>
              </>
            ) : (
              <>
                <Flame size={32} className="text-error" />
                <div>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Not quite right!</h3>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>The correct answer was: <strong>{currentChallenge.options[currentChallenge.answerIndex]}</strong>. Try again tomorrow!</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Sort Tabs */}
      <div className="sort-tabs">
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.value}
            className={`sort-tab ${sortBy === opt.value ? 'active' : ''}`}
            onClick={() => setSortBy(opt.value)}
          >
            {opt.icon} {opt.label}
          </button>
        ))}
      </div>

      {/* Top 3 Podium */}
      <div className="podium-section">
        {sorted.slice(0, 3).map((u, idx) => {
          const rank = idx + 1;
          const isMe = u.id === user?.id;
          return (
            <div key={u.id} className={`podium-card podium-rank-${rank} glass-panel ${isMe ? 'podium-me' : ''}`}>
              <div className="podium-medal">
                {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
              </div>
              {u.avatar ? (
                <img src={u.avatar} alt={u.name} className="podium-avatar" />
              ) : (
                <div className="podium-avatar-placeholder">{u.name?.charAt(0)}</div>
              )}
              <h3 className="podium-name">{u.name} {isMe && <span className="you-badge">You</span>}</h3>
              <div className="podium-score text-gradient">
                {(u[sortBy] || 0).toLocaleString()}
                <span className="podium-score-label"> {SORT_OPTIONS.find(o => o.value === sortBy)?.label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Rankings Table */}
      <div className="rankings-table glass-panel">
        <div className="rankings-header">
          <span>Rank</span>
          <span>User</span>
          <span className="col-metric">{SORT_OPTIONS.find(o => o.value === sortBy)?.label}</span>
          <span className="col-extra">XP</span>
          <span className="col-extra">Streak</span>
        </div>
        {sorted.map((u, idx) => {
          const rank = idx + 1;
          const tier = getTier(rank);
          const isMe = u.id === user?.id;
          return (
            <div key={u.id} className={`ranking-row ${isMe ? 'ranking-row-me' : ''}`}>
              <div className="ranking-rank">
                {tier ? (
                  <span className={`tier-badge ${tier.cls}`}>{rank}</span>
                ) : (
                  <span className="rank-plain">#{rank}</span>
                )}
              </div>
              <div className="ranking-user">
                {u.avatar ? (
                  <img src={u.avatar} alt={u.name} className="ranking-avatar" />
                ) : (
                  <div className="ranking-avatar-placeholder">{u.name?.charAt(0)}</div>
                )}
                <div>
                  <p className="ranking-name">{u.name} {isMe && <span className="you-tag">You</span>}</p>
                  <p className="ranking-location text-muted">{u.location}</p>
                </div>
              </div>
              <div className="col-metric ranking-metric text-gradient">
                {(u[sortBy] || 0).toLocaleString()}
              </div>
              <div className="col-extra ranking-xp">{u.xp || 0} XP</div>
              <div className="col-extra ranking-streak"><Flame size={12} className="text-brand" /> {u.streak || 0}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
