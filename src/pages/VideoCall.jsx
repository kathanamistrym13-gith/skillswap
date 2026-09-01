import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PhoneOff, Mic, MicOff, Video as VideoIcon, VideoOff, StickyNote, X, PenTool, Sparkles } from 'lucide-react';
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
  
  const [stream, setStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const [callStatus, setCallStatus] = useState('connecting'); 
  const [callAccepted, setCallAccepted] = useState(false);

  // Collaboration panel
  const [showNotes, setShowNotes] = useState(false);
  const [sharedNotes, setSharedNotes] = useState('');
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [showNotetakerModal, setShowNotetakerModal] = useState(false);
  const whiteboardRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!user || !socket) {
      navigate('/messages');
      return;
    }

    axios.get(`${API_URL}/users`)
      .then(res => {
        const u = res.data.find(u => u.id === userId);
        if (u) setTargetUser(u);
      })
      .catch(console.error);

    let incomingSignal = location.state?.incomingSignal;

    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = currentStream;
        }

        if (incomingSignal) {
          answerCall(currentStream, incomingSignal);
        } else {
          initiateCall(currentStream);
        }
      })
      .catch((err) => {
        console.error("Failed to get local stream", err);
        alert("Camera/Microphone access needed for video calls.");
        navigate(`/messages/${userId}`);
      });

    // Socket listeners for collaboration
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

    return () => {
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (connectionRef.current) connectionRef.current.destroy();
      socket.off('call_ended');
      socket.off('shared_notes_update');
      socket.off('whiteboard_draw');
      socket.off('whiteboard_clear');
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

  const initiateCall = (currentStream) => {
    setCallStatus('ringing');
    
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: currentStream,
      config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
    });

    peer.on('signal', (data) => {
      socket.emit('call_user', {
        userToCall: userId,
        signalData: data,
        from: user.id,
        name: user.name
      });
    });

    peer.on('stream', (remoteStream) => {
      setCallStatus('connected');
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });

    socket.on('call_accepted', (signal) => {
      setCallAccepted(true);
      setCallStatus('connected');
      peer.signal(signal);
    });

    socket.on('call_failed', () => {
      setCallStatus('ended');
      alert("User is offline or unavailable.");
      endCall(false);
    });

    connectionRef.current = peer;
  };

  const answerCall = (currentStream, incomingSignal) => {
    setCallStatus('connected');
    setCallAccepted(true);

    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: currentStream,
      config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
    });

    peer.on('signal', (data) => {
      socket.emit('answer_call', { signal: data, to: userId });
    });

    peer.on('stream', (remoteStream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
    });

    peer.signal(incomingSignal);
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

  const endCall = (emit = true) => {
    setCallStatus('ended');
    if (stream) stream.getTracks().forEach(track => track.stop());
    if (connectionRef.current) connectionRef.current.destroy();
    
    if (emit && socket) {
      socket.emit('end_call', { to: userId });
    }
    
    setTimeout(() => navigate(`/messages/${userId}`), 1000);
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
          {callStatus === 'connecting' || callStatus === 'ringing' ? (
            <div className="calling-state">
              <div className="ripple-loader"><div></div><div></div></div>
              <h2>{callStatus === 'ringing' ? `Ringing ${targetUser?.name}...` : 'Connecting...'}</h2>
            </div>
          ) : callStatus === 'ended' ? (
            <div className="call-ended-state">
              <h2>Call Ended</h2>
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
               <h3>{targetUser?.name}</h3>
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

      {/* Collaboration Sidebar */}
      {showNotes && (
        <div className="collab-sidebar glass-panel fade-in">
          <div className="collab-header">
            <h3><StickyNote size={16} /> Shared Notes</h3>
            <button className="btn-close-collab" onClick={() => setShowNotes(false)}><X size={16} /></button>
          </div>
          <textarea
            className="collab-notes-area"
            placeholder="Type shared notes here... Both participants can see and edit in real-time."
            value={sharedNotes}
            onChange={handleNotesChange}
          />
        </div>
      )}

      {showWhiteboard && (
        <div className="collab-sidebar glass-panel fade-in">
          <div className="collab-header">
            <h3><PenTool size={16} /> Whiteboard</h3>
            <div className="collab-header-actions">
              <button className="btn-clear-board" onClick={clearWhiteboard}>Clear</button>
              <button className="btn-close-collab" onClick={() => setShowWhiteboard(false)}><X size={16} /></button>
            </div>
          </div>
          <div className="whiteboard-wrapper">
            <canvas
              ref={whiteboardRef}
              className="whiteboard-canvas"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
            />
          </div>
          <p className="whiteboard-hint">Your strokes are <span style={{color:'#818cf8'}}>purple</span>, theirs are <span style={{color:'#f87171'}}>red</span>.</p>
        </div>
      )}

      {/* AI Session Notetaker Modal */}
      <SessionNotetakerModal
        isOpen={showNotetakerModal}
        onClose={() => setShowNotetakerModal(false)}
        partnerId={userId}
        partnerName={targetUser?.name || 'Peer Swapper'}
        skillTopic="Peer Skill Exchange"
        initialNotes={sharedNotes}
        initialTranscript="Interactive WebRTC live peer learning session with shared notes and whiteboard."
        onSendToChat={(text) => {
          if (socket) {
            socket.emit('send_message', {
              senderId: user.id,
              receiverId: userId,
              text
            });
          }
        }}
      />
    </div>
  );
}
