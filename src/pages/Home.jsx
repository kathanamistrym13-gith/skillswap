import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Sparkles, Code, Palette, Music, BookOpen, Layers, Zap, Globe,
  ArrowRight, Users, Star, Shield, Brain, TrendingUp, Play, CheckCircle,
  Gamepad2, MessageCircle, Award
} from 'lucide-react';
import './Home.css';

const LIVE_FEED = [
  { user: 'Zara K.', skill1: 'React', skill2: 'Figma', ago: '2m ago', avatar: 'Z' },
  { user: 'Riven S.', skill1: 'Python', skill2: 'Guitar', ago: '5m ago', avatar: 'R' },
  { user: 'Miko T.', skill1: 'UI/UX', skill2: 'Spanish', ago: '8m ago', avatar: 'M' },
  { user: 'Cyra L.', skill1: 'Data Science', skill2: 'Photography', ago: '11m ago', avatar: 'C' },
  { user: 'Nael V.', skill1: 'Node.js', skill2: 'Piano', ago: '14m ago', avatar: 'N' },
];

const TESTIMONIALS = [
  { name: 'Zara Khalid', role: 'Full Stack Dev → Also Speaks Spanish', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80', quote: 'I taught React for 3 months and came out fluent in Spanish. SkillXchange is the most valuable platform I have ever used. Zero cost, real skills.' },
  { name: 'Riven Shah', role: 'Data Scientist → UI Designer', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=80', quote: 'Found the perfect swap partner within 24 hours. The AI matching is incredibly smart — it knew exactly who I needed before I did.' },
  { name: 'Miko Tanaka', role: 'UX Designer → Python Developer', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80', quote: 'Completed 12 skill swaps in 6 months. My portfolio now spans 3 industries. This is the future of education.' },
];

const CATEGORIES = [
  { label: 'Full-Stack Engineering', icon: '⚙️', count: '1.2k experts', color: '#2D6CDF', trend: '+18%' },
  { label: 'Product Design & UX', icon: '🎨', count: '890 experts', color: '#ec4899', trend: '+24%' },
  { label: 'Global Languages', icon: '🌐', count: '650 experts', color: '#10B981', trend: '+12%' },
  { label: 'Creative Arts', icon: '🎵', count: '420 experts', color: '#F59E0B', trend: '+9%' },
  { label: 'Data Science & AI', icon: '📊', count: '780 experts', color: '#8B5CF6', trend: '+31%' },
  { label: 'Growth Marketing', icon: '🚀', count: '530 experts', color: '#EF4444', trend: '+15%' },
  { label: 'Mobile App Dev', icon: '📱', count: '610 experts', color: '#06B6D4', trend: '+22%' },
  { label: 'Business Strategy', icon: '💼', count: '450 experts', color: '#6366F1', trend: '+11%' },
];

const HOW_IT_WORKS = [
  { step: '01', icon: <Brain size={28} />, title: 'Build Your Skill Profile', desc: 'List what you can teach and what you want to learn. Our smart system maps your expertise level instantly.' },
  { step: '02', icon: <Sparkles size={28} />, title: 'Get AI-Matched', desc: 'Our algorithm finds the perfect partner who wants what you have — and has exactly what you need.' },
  { step: '03', icon: <MessageCircle size={28} />, title: 'Propose a Swap', desc: 'Send a Skill Swap Proposal and agree on session type — 1-on-1, project-based, or micro-sessions.' },
  { step: '04', icon: <Award size={28} />, title: 'Learn & Get Certified', desc: 'Complete sessions, earn XP, climb the leaderboard, and collect verified skill badges for your profile.' },
];

export default function Home() {
  const [feedIndex, setFeedIndex] = useState(0);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  useEffect(() => {
    const feedTimer = setInterval(() => setFeedIndex(i => (i + 1) % LIVE_FEED.length), 3000);
    const tTimer = setInterval(() => setCurrentTestimonial(i => (i + 1) % TESTIMONIALS.length), 5000);
    return () => { clearInterval(feedTimer); clearInterval(tTimer); };
  }, []);

  const feed = LIVE_FEED[feedIndex];
  const t = TESTIMONIALS[currentTestimonial];

  return (
    <div className="home">
      <div className="hero-bg-elements">
        <div className="glow-orb orb-1" />
        <div className="glow-orb orb-2" />
        <div className="glow-orb orb-3" />
      </div>

      {/* ─── HERO ─── */}
      <section className="hero container">
        <div className="hero-content">
          <div className="hero-live-pill">
            <span className="live-dot" />
            <span className="live-text">Live: </span>
            <span className="live-feed-text" key={feedIndex}>
              <span className="live-avatar">{feed.avatar}</span>
              {feed.user} swapped {feed.skill1} ↔ {feed.skill2} · {feed.ago}
            </span>
          </div>

          <h1 className="hero-title">
            Trade Skills.<br />
            <span className="hero-title-gradient">Grow Without Limits.</span>
          </h1>

          <p className="hero-description">
            The world's smartest peer-to-peer skill exchange. Teach what you know, learn what you don't — completely free, forever.
          </p>

          <div className="hero-actions">
            <Link to="/register">
              <button className="btn-hero-primary">Start Swapping Free <ArrowRight size={18} /></button>
            </Link>
            <Link to="/explore">
              <button className="btn-hero-ghost"><Play size={14} /> Browse Community</button>
            </Link>
          </div>

          <div className="hero-trust">
            <div className="trust-avatars">
              {['Z','R','M','C','N'].map((l,i) => (
                <div key={i} className="trust-avatar" style={{ background: ['#10B981','#2D6CDF','#EC4899','#F59E0B','#8B5CF6'][i] }}>{l}</div>
              ))}
            </div>
            <div className="trust-text">
              <div className="trust-stars">★★★★★</div>
              <span>Loved by <strong>10,000+</strong> learners worldwide</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="hero-visual-center">
            <div className="center-ring ring-1" />
            <div className="center-ring ring-2" />
            <div className="center-core">
              <Globe size={38} className="pulse-icon" />
            </div>
          </div>

          <div className="floating-card card-1">
            <div className="card-icon" style={{ color:'#06b6d4', background:'rgba(6,182,212,0.15)' }}><Code size={22}/></div>
            <div className="card-info"><h4>Web Development</h4><p>Zara K. · ⭐ 4.9</p></div>
            <div className="card-match-badge">95% match</div>
          </div>

          <div className="floating-card card-2">
            <div className="card-icon" style={{ color:'#ec4899', background:'rgba(236,72,153,0.15)' }}><Palette size={22}/></div>
            <div className="card-info"><h4>UI/UX Design</h4><p>Miko T. · ⭐ 5.0</p></div>
            <div className="card-match-badge" style={{background:'rgba(236,72,153,0.1)',color:'#ec4899'}}>87% match</div>
          </div>

          <div className="floating-card card-3">
            <div className="card-icon" style={{ color:'#10b981', background:'rgba(16,185,129,0.15)' }}><Music size={22}/></div>
            <div className="card-info"><h4>Guitar Lessons</h4><p>Riven S. · ⭐ 4.8</p></div>
            <div className="card-match-badge" style={{background:'rgba(16,185,129,0.1)',color:'#10b981'}}>91% match</div>
          </div>

          <div className="hero-notification">
            <CheckCircle size={16} style={{color:'#10B981',flexShrink:0}}/>
            <span>🎉 Cyra L. just earned a <strong>React Badge</strong></span>
          </div>
        </div>
      </section>

      {/* ─── MARQUEE ─── */}
      <div className="marquee-container">
        <div className="marquee-content">
          {['React.js','•','Figma','•','Python','•','Guitar','•','Spanish','•','Data Science','•','Photography','•','Node.js','•','UI/UX','•','Machine Learning','•','Video Editing','•',
            'React.js','•','Figma','•','Python','•','Guitar','•','Spanish','•','Data Science','•','Photography','•','Node.js','•','UI/UX','•','Machine Learning','•','Video Editing','•'
          ].map((s, i) => <span key={i} className={s === '•' ? 'dot' : ''}>{s}</span>)}
        </div>
      </div>

      {/* ─── STATS STRIP ─── */}
      <section className="stats-strip container">
        {[
          { icon: <Users size={20}/>, number:'10k+', label:'Active Learners', color:'#10B981' },
          { icon: <TrendingUp size={20}/>, number:'25k+', label:'Skills Swapped', color:'#2D6CDF' },
          { icon: <Star size={20}/>, number:'4.9/5', label:'Avg Session Rating', color:'#F59E0B' },
          { icon: <Shield size={20}/>, number:'98%', label:'Verified Profiles', color:'#8B5CF6' },
        ].map((s,i) => (
          <div key={i} className="stat-strip-card">
            <div className="stat-strip-icon" style={{background:`${s.color}18`,color:s.color}}>{s.icon}</div>
            <div className="stat-strip-number">{s.number}</div>
            <div className="stat-strip-label">{s.label}</div>
          </div>
        ))}
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="how-it-works container">
        <div className="section-header">
          <span className="section-eyebrow">The Process</span>
          <h2>How <span className="text-gradient">SkillXchange</span> Works</h2>
          <p className="text-muted">From profile to certified skill — in four simple steps.</p>
        </div>
        <div className="hiw-grid">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={i} className="hiw-card scroll-trigger" style={{animationDelay:`${i*0.12}s`}}>
              <div className="hiw-step-num">{step.step}</div>
              <div className="hiw-icon">{step.icon}</div>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="features container">
        <div className="section-header">
          <span className="section-eyebrow">Why Us</span>
          <h2>Built Different, <span className="text-gradient">By Design</span></h2>
          <p className="text-muted">Every feature is crafted to make peer learning feel magical.</p>
        </div>
        <div className="features-grid">
          <div className="feature-card feature-card--large scroll-trigger">
            <div className="feature-icon"><Brain size={28}/></div>
            <h3>AI-Powered Matching</h3>
            <p className="text-muted">Our algorithm analyzes 12+ compatibility signals — skills, timezone, learning style, and personality — to find your ideal partner in seconds.</p>
            <div className="feature-tag">🤖 95% Match Accuracy</div>
          </div>
          <div className="feature-card scroll-trigger delay-1">
            <div className="feature-icon" style={{color:'#ec4899',background:'rgba(236,72,153,0.1)',borderColor:'rgba(236,72,153,0.3)'}}><Zap size={28}/></div>
            <h3>Completely Free</h3>
            <p className="text-muted">Trade your time and knowledge instead of money. No subscriptions, no hidden fees — ever.</p>
            <div className="feature-tag" style={{background:'rgba(236,72,153,0.08)',color:'#ec4899'}}>💸 Zero Cost Forever</div>
          </div>
          <div className="feature-card scroll-trigger delay-2">
            <div className="feature-icon" style={{color:'#06b6d4',background:'rgba(6,182,212,0.1)',borderColor:'rgba(6,182,212,0.3)'}}><Layers size={28}/></div>
            <h3>Verified Certificates</h3>
            <p className="text-muted">Pass skill assessments and earn blockchain-backed verified badges that employers actually respect.</p>
            <div className="feature-tag" style={{background:'rgba(6,182,212,0.08)',color:'#06b6d4'}}>🏆 Blockchain Certified</div>
          </div>
          <div className="feature-card scroll-trigger">
            <div className="feature-icon" style={{color:'#F59E0B',background:'rgba(245,158,11,0.1)',borderColor:'rgba(245,158,11,0.3)'}}><Gamepad2 size={28}/></div>
            <h3>Gamified Learning</h3>
            <p className="text-muted">Earn XP, maintain streaks, win daily challenges, and climb the global leaderboard as you learn.</p>
            <div className="feature-tag" style={{background:'rgba(245,158,11,0.08)',color:'#F59E0B'}}>🎮 Daily Challenges</div>
          </div>
          <div className="feature-card scroll-trigger delay-1">
            <div className="feature-icon" style={{color:'#8B5CF6',background:'rgba(139,92,246,0.1)',borderColor:'rgba(139,92,246,0.3)'}}><BookOpen size={28}/></div>
            <h3>AI Skill Roadmaps</h3>
            <p className="text-muted">Personalized roadmaps that guide you from beginner to expert with weekly milestones and checkpoints.</p>
            <div className="feature-tag" style={{background:'rgba(139,92,246,0.08)',color:'#8B5CF6'}}>🗺️ AI Roadmaps</div>
          </div>
          <div className="feature-card scroll-trigger delay-2">
            <div className="feature-icon" style={{color:'#10B981',background:'rgba(16,185,129,0.1)',borderColor:'rgba(16,185,129,0.3)'}}><Globe size={28}/></div>
            <h3>Global Community</h3>
            <p className="text-muted">Connect with learners across 120+ countries. Join skill meetups, forums, and mentorship circles.</p>
            <div className="feature-tag">🌍 120+ Countries</div>
          </div>
        </div>
      </section>

      {/* ─── CATEGORIES ─── */}
      <section className="categories container">
        <div className="section-header">
          <span className="section-eyebrow">High-Demand Skills</span>
          <h2>What People Are <span className="text-gradient">Swapping Now</span></h2>
          <p className="text-muted">Explore the high-value domains our global network is actively mastering.</p>
        </div>
        <div className="categories-grid">
          {CATEGORIES.map((cat,i) => (
            <Link to="/explore" key={i} className="category-card hover-lift scroll-trigger" style={{animationDelay:`${i*0.08}s`}}>
              <div className="category-card-icon" style={{background:`${cat.color}15`,color:cat.color}}>
                <span className="category-emoji">{cat.icon}</span>
              </div>
              <h4>{cat.label}</h4>
              <p className="category-count">{cat.count}</p>
              <div className="category-trend" style={{color:cat.color}}>
                <TrendingUp size={11}/> {cat.trend} this month
              </div>
              <span className="category-arrow">Explore <ArrowRight size={12} className="inline-icon"/></span>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="testimonials-section container">
        <div className="section-header">
          <span className="section-eyebrow">Real Stories</span>
          <h2>People Who <span className="text-gradient">Changed Their Lives</span></h2>
        </div>
        <div className="testimonials-layout">
          <div className="testimonial-card-main" key={currentTestimonial}>
            <div className="testimonial-stars">★★★★★</div>
            <blockquote>"{t.quote}"</blockquote>
            <div className="testimonial-author">
              <img src={t.avatar} alt={t.name} className="testimonial-avatar" onError={e=>{e.target.style.display='none'}}/>
              <div><strong>{t.name}</strong><span>{t.role}</span></div>
            </div>
            <div className="testimonial-dots">
              {TESTIMONIALS.map((_,i)=>(
                <button key={i} className={`testimonial-dot ${i===currentTestimonial?'active':''}`} onClick={()=>setCurrentTestimonial(i)}/>
              ))}
            </div>
          </div>
          <div className="mini-testimonials">
            {TESTIMONIALS.filter((_,i)=>i!==currentTestimonial).map((mt,i)=>(
              <div key={i} className="mini-testimonial-card" onClick={()=>setCurrentTestimonial(TESTIMONIALS.indexOf(mt))}>
                <div className="mt-stars">★★★★★</div>
                <p>"{mt.quote.slice(0,90)}..."</p>
                <strong>{mt.name}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="cta-section container">
        <div className="cta-box">
          <div className="cta-badge">🚀 Join 10,000+ learners — completely free</div>
          <h2>Your Next Skill Is<br /><span className="cta-gradient-text">One Swap Away</span></h2>
          <p>Stop paying for courses. Start learning through exchange. Join the world's fastest-growing skill-sharing community today.</p>
          <div className="cta-checklist">
            {['No credit card required','Unlimited skill swaps','AI-powered matching','Verified certificates'].map((item,i)=>(
              <div key={i} className="cta-check-item"><CheckCircle size={16}/>{item}</div>
            ))}
          </div>
          <div className="cta-actions">
            <Link to="/register"><button className="cta-primary-btn">Get Started Free <ArrowRight size={18}/></button></Link>
            <Link to="/explore"><button className="cta-secondary-btn">Browse the Community</button></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
