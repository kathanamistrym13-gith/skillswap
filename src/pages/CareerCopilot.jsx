import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Compass, Sparkles, CheckCircle2, AlertTriangle, XCircle, Users,
  ArrowRight, Target, BookOpen, Layers, Star, Zap, Download,
  Briefcase, Send, ChevronRight, CheckSquare, Square
} from 'lucide-react';
import axios from 'axios';
import Button from '../components/Button';
import SwapRequestModal from '../components/SwapRequestModal';
import './CareerCopilot.css';

const API_URL = '/api';

const PRESET_ROLES = [
  'Senior Full-Stack Engineer',
  'Staff Frontend Architect',
  'AI / Machine Learning Engineer',
  'Lead UI/UX Product Designer',
  'Cloud DevOps & SRE Engineer',
  'Engineering Manager / System Architect'
];

const SAMPLE_JDS = {
  'Senior Full-Stack Engineer': `We are looking for a Senior Full-Stack Engineer to architect and build high-performance web applications.
Requirements:
- 4+ years building production apps with React, TypeScript, and Node.js
- Deep understanding of PostgreSQL, Redis caching, and Docker containerization
- Experience designing scalable REST and GraphQL APIs
- Solid grasp of System Design, CI/CD pipelines, and cloud deployment (AWS/GCP)
- Strong unit testing (Jest/Playwright) and performance optimization mindset.`,
  'Staff Frontend Architect': `Seeking a Staff Frontend Architect to lead UI modernization and design systems.
Requirements:
- Mastery of React 19, TypeScript, Next.js, and modern CSS architecture
- Experience building enterprise Design Systems and Web Components in Figma and code
- Deep knowledge of Web Vitals, SSR/SSG caching, and micro-frontends
- Experience mentoring junior engineers and conducting architecture reviews.`,
  'AI / Machine Learning Engineer': `Join our AI team building production LLM applications and retrieval pipelines.
Requirements:
- Proficiency in Python, PyTorch/TensorFlow, and FastAPI
- Hands-on experience with LangChain, LlamaIndex, and Vector Databases (Pinecone/Milvus)
- Experience fine-tuning open-source models and optimizing RAG architectures
- Solid foundation in Docker, Kubernetes, and model latency profiling.`
};

export default function CareerCopilot() {
  const { user } = useAuth();
  const [targetJobTitle, setTargetJobTitle] = useState('Senior Full-Stack Engineer');
  const [jobDescription, setJobDescription] = useState(SAMPLE_JDS['Senior Full-Stack Engineer']);
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  // Swap modal state
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [swapModalOpen, setSwapModalOpen] = useState(false);

  // Roadmap check state
  const [completedPhases, setCompletedPhases] = useState(new Set());

  // Auto-run initial analysis
  useEffect(() => {
    handleAnalyze();
  }, []);

  const handleSelectPreset = (role) => {
    setTargetJobTitle(role);
    const newJd = SAMPLE_JDS[role] || '';
    if (newJd) {
      setJobDescription(newJd);
    }
    triggerAnalysis(role, newJd);
  };

  const triggerAnalysis = async (title, jd) => {
    const titleToAnalyze = (title || targetJobTitle || 'Senior Full-Stack Engineer').trim();
    const jdToAnalyze = jd !== undefined ? jd : jobDescription;

    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/ai/career-copilot/analyze`, {
        targetJobTitle: titleToAnalyze,
        jobDescription: jdToAnalyze,
        userId: user?.id
      });
      if (res.data && res.data.targetJobTitle) {
        setAnalysisResult(res.data);
      } else {
        throw new Error('Invalid response structure');
      }
      setCompletedPhases(new Set());
    } catch (err) {
      console.warn('Career Copilot engaged client fallback:', err);
      // Fallback
      const fallbackAnalysis = {
        targetJobTitle: titleToAnalyze,
        readinessScore: 72,
        summary: `You possess strong foundations in core engineering and problem solving. Bridging missing skills in System Design, Docker, and TypeScript through SkillSwap mentors will put you in the top tier of candidates.`,
        matchedSkills: ['React', 'JavaScript', 'REST APIs', 'Git'],
        partialSkills: ['State Architecture', 'Node.js', 'UI/UX Design'],
        missingSkills: ['TypeScript', 'System Design', 'PostgreSQL', 'Docker', 'CI/CD Pipelines'],
        recommendedMentors: [
          {
            user: { id: 'm1', name: 'David Chen', avatar: '', rating: 4.95, swapsCompleted: 14 },
            matchingSkills: ['TypeScript', 'System Design'],
            missingSkillsCovered: ['TypeScript', 'System Design'],
            rating: 4.95,
            swapsCompleted: 14
          },
          {
            user: { id: 'm2', name: 'Elena Rostova', avatar: '', rating: 4.88, swapsCompleted: 9 },
            matchingSkills: ['Docker', 'PostgreSQL'],
            missingSkillsCovered: ['Docker', 'PostgreSQL'],
            rating: 4.88,
            swapsCompleted: 9
          },
          {
            user: { id: 'm3', name: 'Marcus Vance', avatar: '', rating: 5.0, swapsCompleted: 22 },
            matchingSkills: ['CI/CD Pipelines', 'System Design'],
            missingSkillsCovered: ['CI/CD Pipelines', 'System Design'],
            rating: 5.0,
            swapsCompleted: 22
          }
        ],
        roadmap: [
          { phase: 1, title: 'TypeScript Mastery & Strict Typing', focusSkill: 'TypeScript', duration: 'Weeks 1-2', description: 'Convert React and Node codebases to strict TypeScript with interfaces and generics.', keyDeliverable: 'Fully typed full-stack module' },
          { phase: 2, title: 'Database Optimization & PostgreSQL', focusSkill: 'PostgreSQL', duration: 'Weeks 3-4', description: 'Design relational schemas, write complex indexes, and optimize query latency.', keyDeliverable: 'Benchmarked database schema' },
          { phase: 3, title: 'System Scalability & Docker Containers', focusSkill: 'Docker & System Design', duration: 'Weeks 5-6', description: 'Containerize backend services and architect high-concurrency caching layers.', keyDeliverable: 'Dockerized multi-service deployment' },
          { phase: 4, title: 'CI/CD Deployment & Mock Interviews', focusSkill: 'Interview Prep', duration: 'Weeks 7-8', description: 'Deploy GitHub Actions pipelines and complete 2 mock interviews on SkillSwap.', keyDeliverable: 'Live Production URL + Case Study' }
        ]
      };
      setAnalysisResult(fallbackAnalysis);
      setCompletedPhases(new Set());
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    triggerAnalysis(targetJobTitle, jobDescription);
  };

  const togglePhaseCompletion = (phaseIdx) => {
    setCompletedPhases(prev => {
      const updated = new Set(prev);
      if (updated.has(phaseIdx)) updated.delete(phaseIdx);
      else updated.add(phaseIdx);
      return updated;
    });
  };

  const handleOpenSwapWithMentor = (mentorUser) => {
    setSelectedMentor(mentorUser);
    setSwapModalOpen(true);
  };

  return (
    <div className="career-copilot-page container fade-in">
      {/* Hero Header */}
      <div className="copilot-hero">
        <div className="copilot-badge">
          <Compass size={14} />
          <span>AI Career Architect</span>
        </div>
        <h1>"Skill Gap to Dream Job" Copilot</h1>
        <p className="text-muted">
          Specify your dream job or paste a job spec. Our AI analyzes your skills, pinpoints missing requirements, connects you with SkillSwap mentors, and builds an actionable bridge roadmap.
        </p>
      </div>

      {/* Input / Job Specification Card */}
      <div className="copilot-input-card glass-panel glow-border">
        <form onSubmit={handleAnalyze}>
          <div className="form-group mb-4">
            <label className="input-label">Target Role / Job Title</label>
            <div className="role-input-row">
              <input
                type="text"
                placeholder="e.g. Senior Full-Stack Engineer at Stripe"
                value={targetJobTitle}
                onChange={(e) => setTargetJobTitle(e.target.value)}
                className="custom-text-input"
              />
              <Button type="submit" disabled={loading || !targetJobTitle.trim()} className="btn-analyze">
                {loading ? <Sparkles className="spin" size={18} /> : <Zap size={18} />}
                {loading ? 'Analyzing Gap...' : 'Analyze Skill Gap'}
              </Button>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="preset-badges-row mb-4">
            <span className="preset-label">Popular Targets:</span>
            {PRESET_ROLES.map(role => (
              <button
                type="button"
                key={role}
                className={`preset-btn ${targetJobTitle === role ? 'active' : ''}`}
                onClick={() => handleSelectPreset(role)}
              >
                {role}
              </button>
            ))}
          </div>

          <div className="form-group">
            <div className="label-with-action">
              <label className="input-label">Job Description / Desired Stack (Optional)</label>
              {SAMPLE_JDS[targetJobTitle] && (
                <button
                  type="button"
                  className="btn-sample-fill"
                  onClick={() => setJobDescription(SAMPLE_JDS[targetJobTitle])}
                >
                  Load Sample Job Spec
                </button>
              )}
            </div>
            <textarea
              rows={4}
              placeholder="Paste a LinkedIn, Indeed, or company job description to extract requirements..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              className="custom-textarea"
            />
          </div>
        </form>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="copilot-loading-card glass-panel">
          <Sparkles className="spin text-brand" size={36} />
          <h3>Comparing Requirements &amp; Skill Profiles...</h3>
          <p className="text-muted">Analyzing skill gaps, computing readiness, and identifying top mentors.</p>
        </div>
      )}

      {/* Analysis Results Display */}
      {!loading && analysisResult && (
        <div className="copilot-results-section fade-in">
          {/* Executive Overview & Readiness Score */}
          <div className="readiness-overview-grid">
            <div className="readiness-score-card glass-panel">
              <span className="card-section-label">Role Readiness</span>
              <div className="readiness-dial">
                <div className="dial-value text-gradient">{analysisResult.readinessScore}%</div>
                <div className="dial-progress-bar">
                  <div 
                    className="dial-fill" 
                    style={{ 
                      width: `${analysisResult.readinessScore}%`,
                      background: analysisResult.readinessScore >= 70 ? 'linear-gradient(90deg, #1F7A5A, #2D6CDF)' : 'linear-gradient(90deg, #F59E0B, #1F7A5A)'
                    }}
                  ></div>
                </div>
              </div>
              <p className="readiness-verdict">
                {analysisResult.readinessScore >= 75
                  ? '🔥 Highly Qualified: Minor targeted upskilling needed to ace interviews.'
                  : analysisResult.readinessScore >= 50
                  ? '⚡ Strong Foundation: Targeted 4-6 week swap roadmap will bridge key gaps.'
                  : '🌱 Foundational: Comprehensive learning path recommended.'}
              </p>
            </div>

            <div className="strategic-summary-card glass-panel">
              <div className="summary-card-header">
                <Target size={20} className="text-brand" />
                <h3>AI Strategic Assessment</h3>
              </div>
              <p className="summary-text">{analysisResult.summary}</p>
              <div className="quick-tags-summary">
                <span className="summary-badge matched">{analysisResult.matchedSkills?.length || 0} Matched</span>
                <span className="summary-badge partial">{analysisResult.partialSkills?.length || 0} In Progress</span>
                <span className="summary-badge missing">{analysisResult.missingSkills?.length || 0} Gaps to Bridge</span>
              </div>
            </div>
          </div>

          {/* Granular Skill Gap Breakdown (3 Columns) */}
          <div className="skill-gap-breakdown-grid">
            {/* Matched Skills */}
            <div className="gap-column-card glass-panel matched-card">
              <div className="column-header">
                <div className="header-icon bg-green"><CheckCircle2 size={18} /></div>
                <div>
                  <h4>Verified &amp; Matched Skills</h4>
                  <span className="count-label">{analysisResult.matchedSkills?.length || 0} skills aligned</span>
                </div>
              </div>
              <div className="skills-pill-tray">
                {analysisResult.matchedSkills?.map((skill, idx) => (
                  <span key={idx} className="skill-pill pill-green">
                    <CheckCircle2 size={12} /> {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* In-Progress / Related */}
            <div className="gap-column-card glass-panel partial-card">
              <div className="column-header">
                <div className="header-icon bg-yellow"><AlertTriangle size={18} /></div>
                <div>
                  <h4>Partial &amp; Expanding Skills</h4>
                  <span className="count-label">{analysisResult.partialSkills?.length || 0} adjacent areas</span>
                </div>
              </div>
              <div className="skills-pill-tray">
                {analysisResult.partialSkills?.map((skill, idx) => (
                  <span key={idx} className="skill-pill pill-yellow">
                    <Zap size={12} /> {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Missing Skill Gaps */}
            <div className="gap-column-card glass-panel missing-card">
              <div className="column-header">
                <div className="header-icon bg-red"><XCircle size={18} /></div>
                <div>
                  <h4>Critical Missing Gaps</h4>
                  <span className="count-label">{analysisResult.missingSkills?.length || 0} priority targets</span>
                </div>
              </div>
              <div className="skills-pill-tray">
                {analysisResult.missingSkills?.map((skill, idx) => (
                  <span key={idx} className="skill-pill pill-red">
                    <Target size={12} /> {skill}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Recommended SkillSwap Mentors */}
          <div className="mentors-recommendation-section glass-panel">
            <div className="section-header-flex">
              <div>
                <div className="badge-sub"><Users size={14} /> Community Mentors</div>
                <h2>SkillSwap Mentors Who Teach Your Missing Gaps</h2>
                <p className="text-muted">Propose a 2-way skill swap to bridge your gaps with active community experts.</p>
              </div>
            </div>

            <div className="mentors-grid">
              {analysisResult.recommendedMentors && analysisResult.recommendedMentors.length > 0 ? (
                analysisResult.recommendedMentors.map((item, idx) => (
                  <div key={idx} className="mentor-recommend-card glass-panel glow-border">
                    <div className="mentor-card-top">
                      <div className="mentor-avatar">
                        {item.user?.avatar ? (
                          <img src={item.user.avatar} alt={item.user.name} />
                        ) : (
                          <div className="avatar-placeholder">{item.user?.name?.charAt(0) || 'M'}</div>
                        )}
                      </div>
                      <div className="mentor-info">
                        <h4>{item.user?.name || 'Community Mentor'}</h4>
                        <div className="mentor-rating-row">
                          <Star size={13} className="text-warning fill-warning" />
                          <span>{item.rating || 5.0}</span>
                          <span className="swaps-count">· {item.swapsCompleted || 0} swaps</span>
                        </div>
                      </div>
                    </div>

                    <div className="mentor-teaches-block">
                      <span className="teaches-label">Teaches Your Missing Skills:</span>
                      <div className="mentor-skills-list">
                        {item.missingSkillsCovered?.map((sk, sIdx) => (
                          <span key={sIdx} className="mentor-skill-tag">
                            <Sparkles size={11} /> {sk}
                          </span>
                        ))}
                      </div>
                    </div>

                    <Button 
                      onClick={() => handleOpenSwapWithMentor(item.user)}
                      className="btn-propose-swap-copilot"
                    >
                      <Send size={14} /> Propose Swap
                    </Button>
                  </div>
                ))
              ) : (
                <div className="no-mentors-notice">
                  <Users size={36} className="text-muted mb-2" />
                  <p>Explore the general directory to connect with swappers in adjacent domains.</p>
                </div>
              )}
            </div>
          </div>

          {/* Career Bridge Roadmap */}
          {analysisResult.roadmap && analysisResult.roadmap.length > 0 && (
            <div className="career-roadmap-section glass-panel">
              <div className="section-header-flex">
                <div>
                  <div className="badge-sub"><BookOpen size={14} /> Actionable Path</div>
                  <h2>Your Career Bridge Learning Roadmap</h2>
                  <p className="text-muted">Follow these milestone phases to reach full readiness for {targetJobTitle}.</p>
                </div>
                <Button variant="secondary" onClick={() => window.print()} className="btn-print-roadmap">
                  <Download size={15} /> Export Plan
                </Button>
              </div>

              <div className="roadmap-milestones-list">
                {analysisResult.roadmap.map((phase, idx) => {
                  const isDone = completedPhases.has(idx);
                  return (
                    <div 
                      key={idx} 
                      className={`roadmap-phase-card ${isDone ? 'completed' : ''}`}
                      onClick={() => togglePhaseCompletion(idx)}
                    >
                      <div className="phase-checkbox">
                        {isDone ? <CheckSquare size={20} className="text-success" /> : <Square size={20} className="text-muted" />}
                      </div>
                      <div className="phase-content">
                        <div className="phase-meta">
                          <span className="phase-number">Phase {phase.phase || idx + 1}</span>
                          <span className="phase-duration">{phase.duration || 'Weeks 1-2'}</span>
                          <span className="phase-focus-tag">{phase.focusSkill}</span>
                        </div>
                        <h3 className="phase-title">{phase.title}</h3>
                        <p className="phase-desc">{phase.description}</p>
                        {phase.keyDeliverable && (
                          <div className="phase-deliverable">
                            <strong>Key Deliverable:</strong> {phase.keyDeliverable}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Propose Swap Modal */}
      {selectedMentor && (
        <SwapRequestModal
          isOpen={swapModalOpen}
          onClose={() => setSwapModalOpen(false)}
          targetUser={selectedMentor}
          currentUserSkills={user ? [] : []}
          onSubmit={async (proposalData) => {
            try {
              await axios.post(`${API_URL}/swap-requests`, {
                requesterId: user?.id,
                ...proposalData
              });
              setSwapModalOpen(false);
              alert(`Swap proposal sent to ${selectedMentor.name}!`);
            } catch (err) {
              console.error('Failed to submit swap proposal', err);
            }
          }}
        />
      )}
    </div>
  );
}
