import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Phone, PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff, StickyNote, X, PenTool, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Peer from 'simple-peer';
import axios from 'axios';
import SessionNotetakerModal from '../components/SessionNotetakerModal';
import './VideoCall.css';

const API_URL = '/api';

export default function VideoCall() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, socket } = useAuth();
  
  const [targetUser, setTargetUser] = useState(null);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const connectionRef = useRef(null);
  const activeCallIdRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  
  const callStartTimeRef = useRef(null);
  
  const [stream, setStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const [callStatus, setCallStatus] = useState('connecting'); // 'connecting' | 'ringing' | 'connected' | 'ended'
  const [callAccepted, setCallAccepted] = useState(false);
  const [pendingIncomingCall, setPendingIncomingCall] = useState(null);

  // Collaboration panel
  const [showNotes, setShowNotes] = useState(false);
  const [sharedNotes, setSharedNotes] = useState('');
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showNotetakerModal, setShowNotetakerModal] = useState(false);
  const whiteboardRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    axios.get(`${API_URL}/users`)
      .then(res => {
        const u = res.data.find(u => String(u.id) === String(userId) || String(u._id) === String(userId));
        if (u) setTargetUser(u);
      })
      .catch(console.error);

    const incomingSignal = location.state?.incomingSignal;
    const callId = location.state?.callId;
    if (callId) activeCallIdRef.current = callId;

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = currentStream;
        }

        if (incomingSignal) {
          answerCall(currentStream, incomingSignal, callId);
        } else {
          // Check if there's an incoming call from this user waiting for us to answer
          axios.get(`${API_URL}/call/pending/${user.id}`)
            .then(res => {
              if (res.data?.call && String(res.data.call.from) === String(userId)) {
                setPendingIncomingCall(res.data.call);
                setCallStatus('ringing');
              } else {
                initiateCall(currentStream);
              }
            })
            .catch(() => {
              initiateCall(currentStream);
            });
        }
      })
      .catch((err) => {
        console.error("Failed to get local media stream", err);
        alert("Camera/Microphone permission is required for video calls. Please enable it in browser settings.");
        navigate(`/messages/${userId}`);
      });

    // Socket listeners when socket server is connected
    if (socket) {
      socket.on('call_ended', () => {
        endCall(false);
      });

      socket.on('shared_notes_update', (data) => {
        if (data.from !== user.id) {
          setSharedNotes(data.content);
        }
      });

      socket.on('whiteboard_draw', (data) => {
        if (data.from !== user.id) {
          drawRemoteLine(data);
        }
      });

      socket.on('whiteboard_clear', (data) => {
        if (data.from !== user.id) {
          clearWhiteboardCanvas();
        }
      });
    }

    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (connectionRef.current) connectionRef.current.destroy();
      if (socket) {
        socket.off('call_ended');
        socket.off('shared_notes_update');
        socket.off('whiteboard_draw');
        socket.off('whiteboard_clear');
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set up whiteboard canvas when it mounts
  useEffect(() => {
    if (showWhiteboard && whiteboardRef.current) {
      const canvas = whiteboardRef.current;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const ctx = canvas.getContext('2d');
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';
    }
  }, [showWhiteboard]);

  const startAnswerPolling = (peer, callId) => {
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    let attempts = 0;
    pollingIntervalRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 50) { // 75 seconds timeout
        clearInterval(pollingIntervalRef.current);
        if (callStatus !== 'connected') {
          setCallStatus('ended');
        }
        return;
      }
      try {
        const res = await axios.get(`${API_URL}/call/status/${callId}`);
        if (res.data?.status === 'connected' && res.data?.answerSignal) {
          clearInterval(pollingIntervalRef.current);
          setCallAccepted(true);
          setCallStatus('connected');
          if (!callStartTimeRef.current) callStartTimeRef.current = Date.now();
          try {
            peer.signal(res.data.answerSignal);
          } catch (e) {
            console.error('Failed to apply answer signal:', e);
          }
        } else if (res.data?.status === 'ended' || res.data?.status === 'rejected') {
          clearInterval(pollingIntervalRef.current);
          setCallStatus('ended');
        }
      } catch {}
    }, 1500);
  };

  const initiateCall = (currentStream) => {
    setCallStatus('ringing');
    const callId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    activeCallIdRef.current = callId;
    
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: currentStream,
      config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
    });

    peer.on('signal', async (data) => {
      // 1. Socket emission if connected
      if (socket) {
        socket.emit('call_user', {
          userToCall: userId,
          signalData: data,
          from: user.id,
          name: user.name,
          callId
        });
      }

      // 2. HTTP signaling (works seamlessly on Vercel)
      try {
        await axios.post(`${API_URL}/call/initiate`, {
          callId,
          from: user.id,
          to: userId,
          callerName: user.name,
          signal: data
        });
      } catch (err) {
        console.warn('HTTP call initiation fallback error:', err);
      }

      // Start polling for receiver's answer signal
      startAnswerPolling(peer, callId);
    });

    peer.on('stream', (remoteStream) => {
      setCallStatus('connected');
      if (!callStartTimeRef.current) callStartTimeRef.current = Date.now();
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });

    if (socket) {
      socket.on('call_accepted', (signal) => {
        if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
        setCallAccepted(true);
        setCallStatus('connected');
        if (!callStartTimeRef.current) callStartTimeRef.current = Date.now();
        try {
          peer.signal(signal);
        } catch (e) {
          console.error('Peer signal accept error:', e);
        }
      });

      socket.on('call_failed', () => {
        // Only mark ended if HTTP polling hasn't connected
        if (callStatus !== 'connected') {
          setCallStatus('ended');
          alert("User is offline or unavailable.");
          endCall(false);
        }
      });
    }

    connectionRef.current = peer;
  };

  const answerCall = (currentStream, incomingSignal, callId) => {
    setCallStatus('connected');
    setCallAccepted(true);
    setPendingIncomingCall(null);
    if (!callStartTimeRef.current) callStartTimeRef.current = Date.now();
    if (callId) activeCallIdRef.current = callId;

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: currentStream,
      config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
    });

    peer.on('signal', async (data) => {
      // 1. Socket emission if available
      if (socket) {
        socket.emit('answer_call', { signal: data, to: userId });
      }

      // 2. HTTP signaling for Vercel
      if (activeCallIdRef.current) {
        try {
          await axios.post(`${API_URL}/call/answer`, {
            callId: activeCallIdRef.current,
            answerSignal: data
          });
        } catch (err) {
          console.warn('HTTP answer error:', err);
        }
      }
    });

    peer.on('stream', (remoteStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });

    try {
      peer.signal(incomingSignal);
    } catch (err) {
      console.error('Failed to apply incoming signal to peer:', err);
    }

    connectionRef.current = peer;
  };

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const endCall = async (emit = true) => {
    setCallStatus('ended');
    const duration = callStartTimeRef.current ? Math.max(1, Math.round((Date.now() - callStartTimeRef.current) / 1000)) : 0;
    
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    if (stream) stream.getTracks().forEach(track => track.stop());
    if (connectionRef.current) connectionRef.current.destroy();
    
    if (emit) {
      if (socket) {
        socket.emit('end_call', { to: userId });
      }
      try {
        await axios.post(`${API_URL}/call/end`, { 
          callId: activeCallIdRef.current, 
          userId: user?.id,
          duration
        });
      } catch {}
    }

    // Explicitly record/update persistent call history
    if (activeCallIdRef.current) {
      try {
        await axios.post(`${API_URL}/calls/history`, {
          callId: activeCallIdRef.current,
          callerId: user?.id,
          receiverId: userId,
          callerName: user?.name,
          receiverName: targetUser?.name || 'Partner',
          status: duration > 0 ? 'completed' : 'ended',
          duration,
          endedAt: new Date().toISOString()
        });
      } catch {}
    }
    
    setTimeout(() => navigate(`/messages/${userId}`), 800);
  };

  // --- Shared Notes ---
  const handleNotesChange = (e) => {
    const content = e.target.value;
    setSharedNotes(content);
    if (socket) {
      socket.emit('shared_notes_update', { to: userId, from: user.id, content });
    }
  };

  // --- Whiteboard ---
  const startDraw = (e) => {
    isDrawingRef.current = true;
    const rect = whiteboardRef.current.getBoundingClientRect();
    lastPosRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const draw = (e) => {
    if (!isDrawingRef.current || !whiteboardRef.current) return;
    const canvas = whiteboardRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    if (socket) {
      socket.emit('whiteboard_draw', {
        to: userId,
        from: user.id,
        x1: lastPosRef.current.x,
        y1: lastPosRef.current.y,
        x2: x,
        y2: y
      });
    }

    lastPosRef.current = { x, y };
  };

  const stopDraw = () => {
    isDrawingRef.current = false;
  };

  const drawRemoteLine = (data) => {
    if (!whiteboardRef.current) return;
    const ctx = whiteboardRef.current.getContext('2d');
    ctx.strokeStyle = '#f87171';
    ctx.beginPath();
    ctx.moveTo(data.x1, data.y1);
    ctx.lineTo(data.x2, data.y2);
    ctx.stroke();
    ctx.strokeStyle = '#818cf8';
  };

  const clearWhiteboard = () => {
    clearWhiteboardCanvas();
    if (socket) {
      socket.emit('whiteboard_clear', { to: userId, from: user.id });
    }
  };

  const clearWhiteboardCanvas = () => {
    if (!whiteboardRef.current) return;
    const ctx = whiteboardRef.current.getContext('2d');
    ctx.clearRect(0, 0, whiteboardRef.current.width, whiteboardRef.current.height);
  };

  return (
    <div className="video-call-container">
      <div className={`video-main-area ${(showNotes || showWhiteboard) ? 'with-sidebar' : ''}`}>
        {/* Remote Video */}
        <div className="remote-video-container">
          {pendingIncomingCall ? (
            <div className="calling-state">
              <div className="ripple-loader"><div></div><div></div></div>
              <h2>{targetUser?.name || 'Partner'} is calling you!</h2>
              <p className="text-muted text-sm mt-1">Click below to answer and start video exchange</p>
              <button 
                id="in-call-accept-btn"
                className="btn btn-primary mt-4" 
                style={{ 
                  padding: '0.85rem 2.5rem', 
                  fontSize: '1.15rem', 
                  borderRadius: '30px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.6rem', 
                  margin: '1.5rem auto 0',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  boxShadow: '0 4px 25px rgba(34, 197, 94, 0.5)'
                }}
                onClick={() => answerCall(stream, pendingIncomingCall.signal, pendingIncomingCall.callId)}
              >
                <Phone size={22} /> Accept Call Now
              </button>
            </div>
          ) : (callStatus === 'connecting' || callStatus === 'ringing') ? (
            <div className="calling-state">
              <div className="ripple-loader"><div></div><div></div></div>
              <h2>{callStatus === 'ringing' ? `Ringing ${targetUser?.name || 'Partner'}...` : 'Connecting...'}</h2>
              <p className="text-muted text-sm mt-2">Waiting for remote stream...</p>
            </div>
          ) : callStatus === 'ended' ? (
            <div className="call-ended-state">
              <h2>Call Ended</h2>
              <p className="text-muted text-sm mt-1">Redirecting back to messages...</p>
            </div>
          ) : (
            <video 
              playsInline 
              ref={remoteVideoRef} 
              autoPlay 
              className="remote-video-full" 
            />
          )}

          {callStatus === 'connected' && callAccepted && (
            <div className="remote-user-overlay text-shadow">
               <h3>{targetUser?.name || 'Partner'}</h3>
            </div>
          )}
        </div>

        {/* Local Video Stream (PIP) */}
        <div className={`local-video-container ${isVideoOff ? 'video-off' : ''}`}>
          <video 
            playsInline 
            muted 
            ref={localVideoRef} 
            autoPlay 
            className="local-video"
          />
          {isVideoOff && (
            <div className="local-video-off-placeholder">
              <VideoOff size={32} />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="call-controls glass-panel">
          <button 
            className={`control-btn ${isMuted ? 'danger' : 'secondary'}`} 
            onClick={toggleMute}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
          </button>
          
          <button 
            className={`control-btn ${isVideoOff ? 'danger' : 'secondary'}`} 
            onClick={toggleVideo}
            title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
          >
            {isVideoOff ? <VideoOff size={24} /> : <VideoIcon size={24} />}
          </button>

          <button 
            className={`control-btn ${showNotes ? 'active-tool' : 'secondary'}`} 
            onClick={() => { setShowNotes(!showNotes); setShowWhiteboard(false); }}
            title="Shared Notes"
          >
            <StickyNote size={24} />
          </button>

          <button 
            className={`control-btn ${showWhiteboard ? 'active-tool' : 'secondary'}`} 
            onClick={() => { setShowWhiteboard(!showWhiteboard); setShowNotes(false); }}
            title="Whiteboard"
          >
            <PenTool size={24} />
          </button>

          <button 
            className="control-btn notetaker-trigger-btn"
            onClick={() => setShowNotetakerModal(true)}
            title="AI Session Notetaker & Summary"
            style={{ background: 'rgba(99, 102, 241, 0.25)', border: '1px solid #6366f1', color: '#a5b4fc' }}
          >
            <Sparkles size={24} />
          </button>
          
          <button 
            className="control-btn end-call" 
            onClick={() => endCall(true)}
            title="End Call"
          >
            <PhoneOff size={24} />
          </button>
        </div>
      </div>

      {/* Sidebar: Collaborative Notes */}
      {showNotes && (
        <div className="collaboration-sidebar glass-panel">
          <div className="sidebar-top-bar">
            <h3>Shared Notes</h3>
            <button className="btn-icon-close" onClick={() => setShowNotes(false)}>
              <X size={18} />
            </button>
          </div>
          <p className="text-muted text-xs mb-2">Notes are synchronized in real-time between both callers.</p>
          <textarea 
            className="shared-textarea"
            placeholder="Type meeting notes, code snippets, or exchange key points..."
            value={sharedNotes}
            onChange={handleNotesChange}
          />
        </div>
      )}

      {/* Sidebar: Whiteboard Canvas */}
      {showWhiteboard && (
        <div className="collaboration-sidebar glass-panel whiteboard-panel">
          <div className="sidebar-top-bar">
            <h3>Live Whiteboard</h3>
            <div className="whiteboard-actions">
              <button className="btn-clear-canvas" onClick={clearWhiteboard}>Clear</button>
              <button className="btn-icon-close" onClick={() => setShowWhiteboard(false)}>
                <X size={18} />
              </button>
            </div>
          </div>
          <p className="text-muted text-xs mb-2">Draw or diagram collaboratively in real-time.</p>
          <canvas 
            ref={whiteboardRef}
            className="whiteboard-canvas"
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
          />
        </div>
      )}

      {/* AI Notetaker Modal */}
      {showNotetakerModal && (
        <SessionNotetakerModal
          partnerId={userId}
          partnerName={targetUser?.name || 'Partner'}
          onClose={() => setShowNotetakerModal(false)}
        />
      )}
    </div>
  );
}
