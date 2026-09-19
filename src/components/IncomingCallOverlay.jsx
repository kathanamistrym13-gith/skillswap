import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Phone, PhoneOff, Video } from 'lucide-react';
import axios from 'axios';
import './IncomingCallOverlay.css';

const API_URL = '/api';

export default function IncomingCallOverlay() {
  const { user, socket } = useAuth();
  const navigate = useNavigate();
  const [incomingCall, setIncomingCall] = useState(null);
  const [callerName, setCallerName] = useState('SkillSwap User');
  const ringtoneTimerRef = useRef(null);

  // Play gentle ring chime using standard Web Audio API (no external asset required)
  const playRingtone = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
      osc.frequency.setValueAtTime(523.25, ctx.currentTime + 0.15); // C5
      osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.3); // E5

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.75);
    } catch {}
  };

  useEffect(() => {
    if (!user) return;

    // 1. Socket listener (real-time when socket server is connected)
    const handleIncomingSocketCall = (data) => {
      if (!data) return;
      const name = data.name || data.callerName || 'SkillSwap Partner';
      setCallerName(name);
      setIncomingCall(data);
      playRingtone();
    };

    const handleCallEnded = () => {
      setIncomingCall(null);
    };

    if (socket) {
      socket.on('incoming_call', handleIncomingSocketCall);
      socket.on('call_ended', handleCallEnded);
    }

    // 2. HTTP Polling Fallback (ensures incoming calls always appear, even on Vercel serverless)
    const pollInterval = setInterval(async () => {
      try {
        const res = await axios.get(`${API_URL}/call/pending/${user.id}`);
        if (res.data?.call) {
          const pending = res.data.call;
          setCallerName(pending.callerName || 'SkillSwap Partner');
          setIncomingCall({
            signal: pending.signal,
            from: pending.from,
            name: pending.callerName,
            callId: pending.callId
          });
          playRingtone();
        } else if (incomingCall && !socket) {
          // If we were showing a call via polling and it's gone
          // setIncomingCall(null);
        }
      } catch {
        // Polling error ignored
      }
    }, 2500);

    return () => {
      clearInterval(pollInterval);
      if (socket) {
        socket.off('incoming_call', handleIncomingSocketCall);
        socket.off('call_ended', handleCallEnded);
      }
    };
  }, [socket, user]);

  const acceptCall = () => {
    if (incomingCall) {
      const signal = incomingCall.signal;
      const from = incomingCall.from;
      const callId = incomingCall.callId;
      setIncomingCall(null);
      navigate(`/call/${from}`, { 
        state: { 
          incomingSignal: signal, 
          callId: callId,
          callerName: callerName 
        } 
      });
    }
  };

  const rejectCall = async () => {
    const currentCall = incomingCall;
    setIncomingCall(null);
    if (!currentCall) return;

    if (socket) {
      socket.emit('end_call', { to: currentCall.from });
    }

    try {
      await axios.post(`${API_URL}/call/end`, { 
        callId: currentCall.callId, 
        userId: user?.id 
      });
    } catch {}
  };

  if (!incomingCall) return null;

  return (
    <div className="incoming-call-global-overlay" role="dialog" aria-modal="true">
      <div className="incoming-call-card">
        <div className="call-ring-animation">
          <div className="call-avatar-ring ring-1" />
          <div className="call-avatar-ring ring-2" />
          <div className="call-avatar-ring ring-3" />
          <div className="call-avatar-icon">
            <Video size={32} />
          </div>
        </div>
        <div className="call-info">
          <p className="call-label">Incoming Video Call</p>
          <h3 className="call-caller-name">{callerName}</h3>
          <p className="text-muted text-xs mt-1">wants to connect for a skill exchange</p>
        </div>
        <div className="call-action-buttons">
          <button
            id="reject-call-btn"
            className="call-btn reject-btn"
            onClick={rejectCall}
            title="Decline Call"
            aria-label="Decline Call"
          >
            <PhoneOff size={24} />
          </button>
          <button
            id="accept-call-btn"
            className="call-btn accept-btn"
            onClick={acceptCall}
            title="Accept Call"
            aria-label="Accept Call"
          >
            <Phone size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}
