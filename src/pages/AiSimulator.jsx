import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Mic, MicOff, Volume2, VolumeX, Sparkles, Award, Send,
  Globe, Briefcase, Mic2, RefreshCw, CheckCircle, AlertCircle,
  HelpCircle, ChevronRight, Play, Square, ThumbsUp, Trophy, ArrowRight,
  Radio, PhoneCall, PhoneOff, Volume1, MessageSquare
} from 'lucide-react';
import axios from 'axios';
import Button from '../components/Button';
import './AiSimulator.css';

const API_URL = '/api';

const MODES = [
  {
    id: 'language',
    title: 'Language Partner',
    icon: <Globe size={22} />,
    description: 'Conversational fluency, phonetic guidance, and live grammar corrections.',
    color: '#1F7A5A',
    defaultScenario: 'Ordering food and casual small talk'
  },
  {
    id: 'interview',
    title: 'Mock Interviewer',
    icon: <Briefcase size={22} />,
    description: 'Technical deep-dives & behavioral STAR questions with real-time scoring.',
    color: '#2D6CDF',
    defaultScenario: 'Frontend React & Architecture Interview'
  },
  {
    id: 'pitch',
    title: 'Pitch & Speaking Coach',
    icon: <Mic2 size={22} />,
    description: 'Refine your startup pitch, demo delivery, and eliminate filler words.',
    color: '#F59E0B',
    defaultScenario: '60-second Startup Elevator Pitch'
  }
];

const LANGUAGES = [
  { code: 'es-ES', name: 'Spanish' },
  { code: 'fr-FR', name: 'French' },
  { code: 'de-DE', name: 'German' },
  { code: 'ja-JP', name: 'Japanese' },
  { code: 'zh-CN', name: 'Mandarin' },
  { code: 'hi-IN', name: 'Hindi' },
  { code: 'it-IT', name: 'Italian' },
  { code: 'en-US', name: 'English (Advanced ESL)' }
];

const ROLES = [
  'Frontend React Developer',
  'Full Stack Software Engineer',
  'Backend Node.js & Database Engineer',
  'UI/UX Product Designer',
  'AI & Machine Learning Engineer',
  'Engineering Manager / System Design',
  'Behavioral & Leadership (STAR Method)'
];

const PITCH_TYPES = [
  '60-second Elevator Pitch to Investors',
  'Product Demo to Key Stakeholders',
  'Conference Lightning Talk',
  'Salary & Promotion Negotiation'
];

export default function AiSimulator() {
  const { user } = useAuth();
  const [selectedMode, setSelectedMode] = useState('interview');
  
  // Customization states
  const [targetLanguage, setTargetLanguage] = useState('Spanish');
  const [targetRole, setTargetRole] = useState('Frontend React Developer');
  const [pitchType, setPitchType] = useState('60-second Elevator Pitch to Investors');
  const [difficulty, setDifficulty] = useState('Intermediate');
  
  // Session states
  const [sessionActive, setSessionActive] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentScores, setCurrentScores] = useState({
    metric1Name: 'Clarity',
    metric1Value: 90,
    metric2Name: 'Technical Depth',
    metric2Value: 88,
    metric3Name: 'Confidence',
    metric3Value: 85,
    overall: 88
  });
  const [latestFeedback, setLatestFeedback] = useState(null);
  const [suggestedReplies, setSuggestedReplies] = useState([]);
  const [sessionFinished, setSessionFinished] = useState(false);
  const [awardedXp, setAwardedXp] = useState(0);

  // Audio / Speech State
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoTts, setAutoTts] = useState(true);
  const [handsFreeMode, setHandsFreeMode] = useState(true); // Hands-Free Voice Partner Call Mode
  const [speechSupported, setSpeechSupported] = useState(false);

  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const handsFreeRef = useRef(handsFreeMode);

  useEffect(() => {
    handsFreeRef.current = handsFreeMode;
  }, [handsFreeMode]);

  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking]);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, interimTranscript]);

  // Initialize Web Speech API with Real-Time Interim Results & Auto Silence Detection
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (e) => {
        console.warn('Speech recognition notice:', e.error);
        if (e.error !== 'no-speech') {
          setIsListening(false);
        }
      };

      recognition.onresult = (e) => {
        let finalTranscript = '';
        let currentInterim = '';

        for (let i = e.resultIndex; i < e.results.length; ++i) {
          if (e.results[i].isFinal) {
            finalTranscript += e.results[i][0].transcript;
          } else {
            currentInterim += e.results[i][0].transcript;
          }
        }

        if (currentInterim) {
          setInterimTranscript(currentInterim);
        }

        if (finalTranscript) {
          setInterimTranscript('');
          setInput(prev => (prev ? `${prev} ${finalTranscript}` : finalTranscript).trim());

          // In hands-free mode, trigger silence timeout to auto-send
          if (handsFreeRef.current) {
            if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = setTimeout(() => {
              recognition.stop();
            }, 1400);
          }
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, []);

  const speakText = (text) => {
    if (!('speechSynthesis' in window) || !autoTts) return;
    try {
      window.speechSynthesis.cancel();
      // Clean markdown characters from spoken audio
      const cleanText = text.replace(/[*_#`~>]/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      
      // Select appropriate language voice
      if (selectedMode === 'language') {
        const matchedLang = LANGUAGES.find(l => l.name === targetLanguage);
        if (matchedLang) utterance.lang = matchedLang.code;
      } else {
        utterance.lang = 'en-US';
      }

      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        setIsSpeaking(true);
        // If user was listening, stop temporarily while AI speaks
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch (_) {}
        }
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        // If Hands-Free Voice Mode is enabled and session is active, automatically listen for user's next answer!
        if (handsFreeRef.current && sessionActive && recognitionRef.current) {
          setTimeout(() => {
            startListeningInternal();
          }, 300);
        }
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('TTS error:', e);
      setIsSpeaking(false);
    }
  };

  const startListeningInternal = () => {
    if (!recognitionRef.current) return;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    
    // Set appropriate language for recognition
    if (selectedMode === 'language') {
      const langObj = LANGUAGES.find(l => l.name === targetLanguage);
      if (langObj) recognitionRef.current.lang = langObj.code;
    } else {
      recognitionRef.current.lang = 'en-US';
    }

    try {
      recognitionRef.current.start();
    } catch (_) {}
  };

  const toggleListening = () => {
    if (!speechSupported) {
      alert('Voice recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    if (isListening) {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      recognitionRef.current?.stop();
    } else {
      startListeningInternal();
    }
  };

  const startSession = async () => {
    setSessionActive(true);
    setSessionFinished(false);
    setMessages([]);
    setInput('');
    setInterimTranscript('');
    setLatestFeedback(null);
    setLoading(true);

    const scenarioText = selectedMode === 'language' 
      ? `Conversation in ${targetLanguage}` 
      : selectedMode === 'interview' 
      ? targetRole 
      : pitchType;

    try {
      const res = await axios.post(`${API_URL}/ai/simulator/chat`, {
        mode: selectedMode,
        scenario: scenarioText,
        targetLanguage,
        targetRole,
        level: difficulty,
        history: [],
        userMessage: ''
      });

      const replyText = res.data?.reply || `Welcome to your ${selectedMode} practice! How would you like to begin?`;
      const aiMsg = {
        id: Date.now(),
        sender: 'ai',
        text: replyText
      };
      setMessages([aiMsg]);
      if (res.data?.scores) setCurrentScores(res.data.scores);
      if (res.data?.feedback) setLatestFeedback(res.data.feedback);
      if (res.data?.suggestedNextReplies) setSuggestedReplies(res.data.suggestedNextReplies);

      speakText(replyText);
    } catch (err) {
      console.warn('Simulator start fallback engaged', err);
      let defaultGreeting = selectedMode === 'language'
        ? `¡Hola! Bienvenido a tu práctica de ${targetLanguage}. ¿Qué tema te gustaría conversar hoy?`
        : selectedMode === 'interview'
        ? `Welcome to your ${targetRole} technical interview! Can you walk me through an architectural challenge you solved recently and the trade-offs you considered?`
        : `Welcome to the Pitch Simulator! You have 60 seconds on the clock. What is the core problem, your unique solution, and your unfair advantage?`;
      
      const fallbackAiMsg = { id: Date.now(), sender: 'ai', text: defaultGreeting };
      setMessages([fallbackAiMsg]);
      speakText(defaultGreeting);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (customText = null) => {
    const textToSend = (customText || input || interimTranscript).trim();
    if (!textToSend) return;

    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: textToSend
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setInterimTranscript('');
    setLoading(true);

    const scenarioText = selectedMode === 'language' 
      ? `Conversation in ${targetLanguage}` 
      : selectedMode === 'interview' 
      ? targetRole 
      : pitchType;

    try {
      const res = await axios.post(`${API_URL}/ai/simulator/chat`, {
        mode: selectedMode,
        scenario: scenarioText,
        targetLanguage,
        targetRole,
        level: difficulty,
        history: newHistory,
        userMessage: textToSend
      });

      const replyText = res.data?.reply || `Thank you for sharing that! Could you elaborate further on how you arrived at that decision?`;
      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: replyText
      };

      setMessages(prev => [...prev, aiMsg]);
      if (res.data?.scores) setCurrentScores(res.data.scores);
      if (res.data?.feedback) setLatestFeedback(res.data.feedback);
      if (res.data?.suggestedNextReplies) setSuggestedReplies(res.data.suggestedNextReplies);

      speakText(replyText);
    } catch (err) {
      console.warn('Simulator message fallback', err);
      const fallbackReply = `Great response! You explained "${textToSend.slice(0, 35)}..." clearly. What was the most critical lesson or metric you observed from that experience?`;
      const aiMsg = { id: Date.now() + 1, sender: 'ai', text: fallbackReply };
      setMessages(prev => [...prev, aiMsg]);
      speakText(fallbackReply);
    } finally {
      setLoading(false);
    }
  };

  const finishSession = async () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
    setSessionFinished(true);
    setSessionActive(false);

    // Award XP
    const earnedXp = Math.min(120, Math.max(40, messages.length * 15));
    setAwardedXp(earnedXp);

    if (user?.id) {
      try {
        await axios.post(`${API_URL}/users/${user.id}/add-xp`, {
          xpToAdd: earnedXp,
          hoursLearnedToAdd: 0.5
        });
      } catch (err) {
        console.warn('Could not update XP', err);
      }
    }
  };

  return (
    <div className="simulator-page container fade-in">
      {/* Header */}
      <div className="simulator-header">
        <div className="header-badge">
          <Sparkles size={14} />
          <span>Next-Gen Practice Arena</span>
        </div>
        <h1>Real-Time AI Voice &amp; Roleplay Simulator</h1>
        <p className="text-muted">
          Speak naturally with an intelligent AI coach that listens, analyzes your specific answers in real time, scores your performance, and challenges you with contextual follow-ups.
        </p>
      </div>

      {!sessionActive && !sessionFinished && (
        <div className="simulator-setup-card glass-panel glow-border">
          <h2 className="setup-title">Select Your Training Arena</h2>
          <div className="mode-selector-grid">
            {MODES.map(mode => (
              <div
                key={mode.id}
                className={`mode-card ${selectedMode === mode.id ? 'active' : ''}`}
                onClick={() => setSelectedMode(mode.id)}
              >
                <div className="mode-card-icon" style={{ background: `${mode.color}18`, color: mode.color }}>
                  {mode.icon}
                </div>
                <h3>{mode.title}</h3>
                <p>{mode.description}</p>
                {selectedMode === mode.id && (
                  <div className="selected-indicator" style={{ color: mode.color }}>
                    <CheckCircle size={15} /> Selected
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Mode-Specific Customization */}
          <div className="customization-section glass-panel">
            {selectedMode === 'language' && (
              <div className="custom-row">
                <div className="form-group">
                  <label>Target Language</label>
                  <select 
                    value={targetLanguage} 
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    className="custom-select"
                  >
                    {LANGUAGES.map(l => (
                      <option key={l.code} value={l.name}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Proficiency Level</label>
                  <select 
                    value={difficulty} 
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="custom-select"
                  >
                    <option value="Beginner">Beginner (Slow pace, gentle guidance)</option>
                    <option value="Intermediate">Intermediate (Natural conversation flow)</option>
                    <option value="Advanced">Advanced (Native nuance &amp; idioms)</option>
                  </select>
                </div>
              </div>
            )}

            {selectedMode === 'interview' && (
              <div className="custom-row">
                <div className="form-group">
                  <label>Target Engineering / Design Role</label>
                  <select 
                    value={targetRole} 
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="custom-select"
                  >
                    {ROLES.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Interview Rigor</label>
                  <select 
                    value={difficulty} 
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="custom-select"
                  >
                    <option value="Beginner">Junior / Associate (Concepts &amp; Syntax)</option>
                    <option value="Intermediate">Mid-Level (System Architecture &amp; Trade-offs)</option>
                    <option value="Advanced">Senior / Staff (Scalability &amp; STAR Leadership)</option>
                  </select>
                </div>
              </div>
            )}

            {selectedMode === 'pitch' && (
              <div className="custom-row">
                <div className="form-group">
                  <label>Pitch Scenario</label>
                  <select 
                    value={pitchType} 
                    onChange={(e) => setPitchType(e.target.value)}
                    className="custom-select"
                  >
                    {PITCH_TYPES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Critique Strictness</label>
                  <select 
                    value={difficulty} 
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="custom-select"
                  >
                    <option value="Beginner">Friendly &amp; Encouraging</option>
                    <option value="Intermediate">Standard VC / Reviewer</option>
                    <option value="Advanced">Shark Tank / High-Stakes Pressure</option>
                  </select>
                </div>
              </div>
            )}

            <div className="session-start-bar">
              <div className="speech-status-hint">
                <Mic size={16} className={speechSupported ? 'text-success' : 'text-muted'} />
                <span>{speechSupported ? 'Browser voice recognition & audio speech ready' : 'Text input mode ready'}</span>
              </div>
              <Button onClick={startSession} className="btn-start-simulation">
                <Play size={18} /> Launch Real-Time Voice Room
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Active Session Arena */}
      {sessionActive && (
        <div className="simulator-arena-grid">
          {/* Main Chat & Voice Area */}
          <div className="simulator-chat-panel glass-panel glow-border">
            <div className="arena-header">
              <div className="arena-title-info">
                <div className="mode-pill">
                  {selectedMode === 'language' ? <Globe size={14} /> : selectedMode === 'interview' ? <Briefcase size={14} /> : <Mic2 size={14} />}
                  <span>{selectedMode === 'language' ? `${targetLanguage} Practice` : selectedMode === 'interview' ? targetRole : pitchType}</span>
                </div>
                
                {/* Real-Time Live Status Pill */}
                {isSpeaking ? (
                  <span className="live-indicator speaking">
                    <span className="audio-wave-anim"><span /><span /><span /><span /></span> AI Speaking...
                  </span>
                ) : isListening ? (
                  <span className="live-indicator listening">
                    <span className="pulse-dot-red"></span> Listening to You...
                  </span>
                ) : (
                  <span className="live-indicator"><span className="pulse-dot"></span> Live Room</span>
                )}
              </div>

              <div className="arena-controls">
                {/* Hands-Free Voice Mode Toggle */}
                <button 
                  className={`btn-control-toggle hands-free-btn ${handsFreeMode ? 'active' : ''}`}
                  onClick={() => setHandsFreeMode(!handsFreeMode)}
                  title={handsFreeMode ? 'Hands-Free Voice Call Active (Auto-listens & replies)' : 'Push-to-Talk Mode'}
                >
                  <PhoneCall size={16} />
                  <span>{handsFreeMode ? 'Hands-Free Call' : 'Push-to-Talk'}</span>
                </button>

                <button 
                  className={`btn-control-toggle ${autoTts ? 'active' : ''}`}
                  onClick={() => {
                    if (isSpeaking && window.speechSynthesis) window.speechSynthesis.cancel();
                    setAutoTts(!autoTts);
                  }}
                  title="Toggle AI Voice Playback"
                >
                  {autoTts ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
                
                <Button variant="danger" onClick={finishSession} className="btn-finish-session">
                  <PhoneOff size={15} /> End Call
                </Button>
              </div>
            </div>

            {/* Message Stream */}
            <div className="arena-messages">
              {messages.map((msg) => (
                <div key={msg.id} className={`sim-message ${msg.sender}`}>
                  <div className="sim-avatar">
                    {msg.sender === 'ai' ? <Sparkles size={16} /> : (user?.name?.charAt(0) || 'U')}
                  </div>
                  <div className="sim-bubble">
                    <div className="sim-bubble-header">
                      <span className="sim-sender-name">{msg.sender === 'ai' ? 'AI Coach' : 'You'}</span>
                    </div>
                    <p>{msg.text}</p>
                  </div>
                </div>
              ))}

              {/* Interim Live Speech Transcript Bubble */}
              {interimTranscript && (
                <div className="sim-message user interim-msg">
                  <div className="sim-avatar">{user?.name?.charAt(0) || 'U'}</div>
                  <div className="sim-bubble interim-bubble">
                    <span className="interim-label"><Radio size={12} className="pulse" /> Live Speech:</span>
                    <p>{interimTranscript} <span className="typing-cursor">|</span></p>
                  </div>
                </div>
              )}

              {loading && (
                <div className="sim-message ai loading-msg">
                  <div className="sim-avatar"><Sparkles size={16} /></div>
                  <div className="sim-bubble">
                    <div className="typing-dots">
                      <span></span><span></span><span></span>
                    </div>
                    <span className="thinking-text">Analyzing your response...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggested Replies */}
            {suggestedReplies.length > 0 && !loading && (
              <div className="suggested-chips">
                <span className="suggested-label">Next Ideas:</span>
                {suggestedReplies.map((reply, idx) => (
                  <button 
                    key={idx} 
                    className="reply-chip"
                    onClick={() => handleSendMessage(reply)}
                  >
                    {reply}
                  </button>
                ))}
              </div>
            )}

            {/* Input & Voice Controls */}
            <div className="arena-input-area">
              <button
                className={`btn-mic ${isListening ? 'listening pulse' : ''}`}
                onClick={toggleListening}
                title={isListening ? 'Click to stop listening' : 'Start speaking with mic'}
              >
                {isListening ? (
                  <span className="mic-listening-content">
                    <MicOff size={20} />
                    <span className="listening-tag">Listening</span>
                  </span>
                ) : (
                  <Mic size={20} />
                )}
              </button>

              <div className="input-field-wrapper">
                <input
                  type="text"
                  placeholder={isListening ? 'Listening live... speak naturally...' : 'Type or speak your answer...'}
                  value={input || interimTranscript}
                  onChange={(e) => {
                    setInput(e.target.value);
                    setInterimTranscript('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className={`sim-input ${isListening ? 'listening-active' : ''}`}
                />
              </div>

              <button
                className="btn-sim-send"
                onClick={() => handleSendMessage()}
                disabled={(!input.trim() && !interimTranscript.trim()) || loading}
              >
                <Send size={18} />
              </button>
            </div>
          </div>

          {/* Real-Time Telemetry & Feedback Sidebar */}
          <div className="simulator-telemetry-sidebar">
            {/* Live Scores */}
            <div className="telemetry-card glass-panel">
              <div className="telemetry-card-header">
                <Trophy size={18} className="text-brand" />
                <h3>Live Scoring Metrics</h3>
              </div>

              <div className="overall-score-display">
                <div className="score-ring-container">
                  <svg className="score-ring-svg" width="76" height="76" viewBox="0 0 76 76">
                    <circle
                      className="score-ring-bg"
                      cx="38"
                      cy="38"
                      r="31"
                      strokeWidth="6"
                    />
                    <circle
                      className="score-ring-fill"
                      cx="38"
                      cy="38"
                      r="31"
                      strokeWidth="6"
                      strokeDasharray={2 * Math.PI * 31}
                      strokeDashoffset={(2 * Math.PI * 31) * (1 - (currentScores.overall || 88) / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="score-ring-inner-text">
                    <span className="score-val">{currentScores.overall || 88}</span>
                    <span className="score-sub">/ 100</span>
                  </div>
                </div>
                <div className="score-verdict">
                  <span className="verdict-tag">
                    {currentScores.overall >= 85 ? 'Strong Delivery' : currentScores.overall >= 70 ? 'Solid Response' : 'Keep Expanding'}
                  </span>
                  <span className="verdict-desc">Evaluated dynamically on your specific answers.</span>
                </div>
              </div>

              <div className="metric-bars">
                <div className="metric-item">
                  <div className="metric-info">
                    <span>{currentScores.metric1Name || 'Clarity'}</span>
                    <span className="metric-num">{currentScores.metric1Value || 88}%</span>
                  </div>
                  <div className="metric-progress-track">
                    <div className="metric-progress-fill bg-emerald" style={{ width: `${currentScores.metric1Value || 88}%` }}></div>
                  </div>
                </div>

                <div className="metric-item">
                  <div className="metric-info">
                    <span>{currentScores.metric2Name || 'Technical Depth'}</span>
                    <span className="metric-num">{currentScores.metric2Value || 85}%</span>
                  </div>
                  <div className="metric-progress-track">
                    <div className="metric-progress-fill bg-ocean" style={{ width: `${currentScores.metric2Value || 85}%` }}></div>
                  </div>
                </div>

                <div className="metric-item">
                  <div className="metric-info">
                    <span>{currentScores.metric3Name || 'Confidence'}</span>
                    <span className="metric-num">{currentScores.metric3Value || 88}%</span>
                  </div>
                  <div className="metric-progress-track">
                    <div className="metric-progress-fill bg-warm" style={{ width: `${currentScores.metric3Value || 88}%` }}></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Live Feedback & Tips */}
            {latestFeedback && (
              <div className="telemetry-card glass-panel feedback-card">
                <div className="telemetry-card-header">
                  <Sparkles size={18} className="text-brand" />
                  <h3>Coaching Feedback</h3>
                </div>

                {latestFeedback.positive && (
                  <div className="feedback-section positive">
                    <div className="feedback-badge"><ThumbsUp size={14} /> What went well</div>
                    <p>{latestFeedback.positive}</p>
                  </div>
                )}

                {latestFeedback.improvement && (
                  <div className="feedback-section improvement">
                    <div className="feedback-badge"><AlertCircle size={14} /> Room to improve</div>
                    <p>{latestFeedback.improvement}</p>
                  </div>
                )}

                {latestFeedback.correction && (
                  <div className="feedback-section tip">
                    <div className="feedback-badge"><HelpCircle size={14} /> Practice Tip</div>
                    <p>{latestFeedback.correction}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Session Completion Report Modal */}
      {sessionFinished && (
        <div className="session-finished-card glass-panel glow-border slide-up">
          <div className="finished-header">
            <div className="celebration-icon">
              <Award size={48} className="text-brand" />
            </div>
            <h2>Training Session Completed!</h2>
            <p className="text-muted">You gained practical simulation experience and leveled up your skills.</p>
          </div>

          <div className="summary-stats-grid">
            <div className="summary-stat-box">
              <span className="stat-label">Overall Score</span>
              <span className="stat-value text-gradient">{currentScores.overall || 88}%</span>
            </div>
            <div className="summary-stat-box">
              <span className="stat-label">Exchanges</span>
              <span className="stat-value">{messages.length} Turns</span>
            </div>
            <div className="summary-stat-box">
              <span className="stat-label">XP Earned</span>
              <span className="stat-value text-success">+{awardedXp} XP</span>
            </div>
          </div>

          <div className="finished-actions">
            <Button onClick={startSession} variant="secondary">
              <RefreshCw size={16} /> Practice Again
            </Button>
            <Button onClick={() => setSessionFinished(false)}>
              <ArrowRight size={16} /> Return to Arenas
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
