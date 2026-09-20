import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Send, ArrowLeft, User, Phone, Video, MessageCircle, Paperclip, Smile,
  Sparkles, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, CheckCircle2
} from 'lucide-react';
import axios from 'axios';
import SessionNotetakerModal from '../components/SessionNotetakerModal';
import './Messages.css';

const API_URL = '/api';

const COMMON_EMOJIS = ['😊', '😂', '🔥', '👍', '🙌', '💻', '🎸', '🎨', '📚', '🚀', '✨', '💯'];

export default function Messages() {
  const { userId } = useParams();
  const { user, socket } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const chatInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);

  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'calls'
  const [conversations, setConversations] = useState([]);
  const [activeChatId, setActiveChatId] = useState(userId || null);
  const [messages, setMessages] = useState([]);
  const [callHistory, setCallHistory] = useState([]);
  const [userCallHistory, setUserCallHistory] = useState([]); // All calls for user
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState(null);
  const [showNotetakerModal, setShowNotetakerModal] = useState(false);
  
  // Sync activeChatId with URL parameters
  useEffect(() => {
    if (userId && userId !== activeChatId) {
      setActiveChatId(userId);
    }
  }, [userId]);

  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const typingTimeoutRef = useRef(null);

  // Helper to format call durations
  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  // Initial Data Load
  const fetchAllData = async () => {
    if (!user) return;
    try {
      const [usersRes, messagesRes, userCallsRes] = await Promise.all([
        axios.get(`${API_URL}/users`),
        axios.get(`${API_URL}/messages/${user.id}`),
        axios.get(`${API_URL}/calls/history/${user.id}`).catch(() => ({ data: [] }))
      ]);
      
      const allUsers = usersRes.data || [];
      const allMessages = messagesRes.data || [];
      const allUserCalls = userCallsRes.data || [];
      setUserCallHistory(allUserCalls);

      const interactedUserIds = new Set();
      allMessages.forEach(msg => {
        if (msg.senderId === user.id) interactedUserIds.add(msg.receiverId);
        if (msg.receiverId === user.id) interactedUserIds.add(msg.senderId);
      });
      allUserCalls.forEach(call => {
        if (call.callerId === user.id) interactedUserIds.add(call.receiverId);
        if (call.receiverId === user.id) interactedUserIds.add(call.callerId);
      });

      if (activeChatId) interactedUserIds.add(activeChatId);

      const activeConversations = Array.from(interactedUserIds)
        .map(id => allUsers.find(u => u.id === id))
        .filter(Boolean);
        
      setConversations(activeConversations);

      const mockOnline = new Set(activeConversations.filter(() => Math.random() > 0.5).map(u => u.id));
      setOnlineUsers(mockOnline);

      if (activeChatId) {
        const targetUser = allUsers.find(u => u.id === activeChatId);
        setOtherUser(targetUser);

        const chatHistory = allMessages.filter(
          msg => (msg.senderId === user.id && msg.receiverId === activeChatId) || 
                 (msg.senderId === activeChatId && msg.receiverId === user.id)
        ).sort((a, b) => a.timestamp - b.timestamp);
        
        setMessages(chatHistory);

        // Fetch direct call history between current user and partner
        try {
          const directCallsRes = await axios.get(`${API_URL}/calls/history/${user.id}/${activeChatId}`);
          setCallHistory(directCallsRes.data || []);
        } catch {
          setCallHistory([]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch messages data", err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [user, activeChatId]);

  // Handle Real-time Socket Events
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (msg) => {
      if (msg.senderId === activeChatId || msg.receiverId === activeChatId) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (msg.senderId === activeChatId) setIsTyping(false);
      }
      
      setConversations(prev => {
        if (!prev.find(c => c.id === msg.senderId)) {
          axios.get(`${API_URL}/users`).then(res => {
             const sender = res.data.find(u => u.id === msg.senderId);
             if (sender) setConversations(old => [...old, sender]);
          });
        }
        return prev;
      });
    };

    const handleCallHistoryUpdate = (callRecord) => {
      setUserCallHistory(prev => [callRecord, ...prev.filter(c => c.id !== callRecord.id)]);
      if (
        (callRecord.callerId === activeChatId && callRecord.receiverId === user?.id) ||
        (callRecord.callerId === user?.id && callRecord.receiverId === activeChatId)
      ) {
        setCallHistory(prev => [...prev.filter(c => c.id !== callRecord.id), callRecord]);
      }
    };
    
    const handleTyping = (data) => {
      if (data.senderId === activeChatId) setIsTyping(true);
    };

    const handleStopTyping = (data) => {
      if (data.senderId === activeChatId) setIsTyping(false);
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_sent', handleReceiveMessage);
    socket.on('call_history_updated', handleCallHistoryUpdate);
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);

    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_sent', handleReceiveMessage);
      socket.off('call_history_updated', handleCallHistoryUpdate);
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [socket, activeChatId, user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, callHistory, isTyping]);

  const handleInputChange = (e) => {
    setNewMessage(e.target.value);
    
    if (socket && activeChatId) {
      socket.emit('typing', { senderId: user.id, receiverId: activeChatId });
      
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing', { senderId: user.id, receiverId: activeChatId });
      }, 2000);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const hasContent = newMessage.trim() || selectedFile;
    if (!hasContent || !activeChatId || !user) return;

    const messageText = newMessage.trim() || (selectedFile ? `[Shared File: ${selectedFile.name}]` : '');

    if (socket && socket.connected) {
      socket.emit('send_message', {
        senderId: user.id,
        receiverId: activeChatId,
        text: messageText
      });
      socket.emit('stop_typing', { senderId: user.id, receiverId: activeChatId });
    } else {
      try {
        const res = await axios.post(`${API_URL}/messages`, {
          senderId: user.id,
          receiverId: activeChatId,
          text: messageText
        });
        setMessages(prev => [...prev, res.data]);
      } catch (err) {
        console.error('Error sending message via API:', err);
      }
    }
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    setNewMessage('');
    setShowEmojiPicker(false);
    setSelectedFile(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setNewMessage(prev => prev + ` [Attached: ${file.name}] `);
    }
  };

  const addEmoji = (e, emoji) => {
    e.preventDefault();
    e.stopPropagation();
    
    const input = chatInputRef.current;
    if (!input) return;

    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = newMessage;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    setNewMessage(before + emoji + after);
    
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const handleStartVideoCall = (targetId = activeChatId) => {
    if (targetId) navigate(`/call/${targetId}`);
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Combine messages and call history items chronologically
  const unifiedTimeline = [
    ...messages.map(m => ({ ...m, timelineType: 'message' })),
    ...callHistory.map(c => ({ ...c, timelineType: 'call', timestamp: c.timestamp || new Date(c.startedAt).getTime() }))
  ].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <div className="messages-layout container">
      {/* Sidebar: Conversations List & Call History */}
      <div className={`conversations-sidebar glass-panel ${activeChatId ? 'hide-on-mobile' : ''}`}>
        <div className="sidebar-header">
          <h2>Messages &amp; Calls</h2>
          <div className="messages-tabs-header">
            <button
              className={`messages-tab-btn ${activeTab === 'chats' ? 'active' : ''}`}
              onClick={() => setActiveTab('chats')}
            >
              <MessageCircle size={15} /> Chats
            </button>
            <button
              className={`messages-tab-btn ${activeTab === 'calls' ? 'active' : ''}`}
              onClick={() => setActiveTab('calls')}
            >
              <Video size={15} /> Video Calls ({userCallHistory.length})
            </button>
          </div>
        </div>
        
        {activeTab === 'chats' ? (
          <div className="conversations-list">
            {conversations.length === 0 ? (
              <div className="empty-conversations">
                <p>No messages yet. Go to Explore or Matchmaking to connect with peers!</p>
              </div>
            ) : (
              conversations.map(contact => {
                const isOnline = onlineUsers.has(contact.id);
                return (
                  <div 
                    key={contact.id} 
                    className={`conversation-item ${activeChatId === contact.id ? 'active' : ''}`}
                    onClick={() => {
                      setActiveChatId(contact.id);
                      navigate(`/messages/${contact.id}`, { replace: true });
                    }}
                  >
                    <div className="contact-avatar-wrapper">
                      <div className="contact-avatar">
                        <User size={20} />
                      </div>
                      {isOnline && <div className="online-indicator"></div>}
                    </div>
                    <div className="contact-info">
                      <h4>{contact.name}</h4>
                      {isOnline && <div className="contact-preview">Online Now</div>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Video Call History List */
          <div className="call-history-list">
            {userCallHistory.length === 0 ? (
              <div className="empty-conversations">
                <Video size={36} className="text-muted mb-2" style={{ opacity: 0.5 }} />
                <p>No video call history yet.</p>
                <p className="text-xs text-muted mt-1">Start a video call with any partner to collaborate live.</p>
              </div>
            ) : (
              userCallHistory.map(call => {
                const isOutgoing = call.callerId === user?.id;
                const partnerName = isOutgoing ? (call.receiverName || 'Partner') : (call.callerName || 'Partner');
                const partnerId = isOutgoing ? call.receiverId : call.callerId;
                const isCompleted = call.status === 'completed';
                const isMissed = call.status === 'missed' || call.status === 'rejected';

                return (
                  <div 
                    key={call.id || call._id} 
                    className="call-history-item"
                    onClick={() => {
                      setActiveChatId(partnerId);
                      navigate(`/messages/${partnerId}`, { replace: true });
                    }}
                  >
                    <div className="call-history-left">
                      <div className={`call-type-icon ${isCompleted ? 'completed' : isMissed ? 'missed' : 'ended'}`}>
                        {isCompleted ? (
                          isOutgoing ? <PhoneOutgoing size={17} /> : <PhoneIncoming size={17} />
                        ) : (
                          <PhoneMissed size={17} />
                        )}
                      </div>
                      <div className="call-history-info">
                        <h5>{partnerName}</h5>
                        <div className="call-history-meta">
                          <span>{new Date(call.startedAt || call.timestamp).toLocaleDateString()}</span>
                          <span>&middot;</span>
                          {isCompleted ? (
                            <span className="call-duration-badge">{formatDuration(call.duration)}</span>
                          ) : (
                            <span style={{ color: '#ef4444' }}>Missed</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button 
                      className="call-back-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartVideoCall(partnerId);
                      }}
                      title="Video Call"
                    >
                      <Video size={14} /> Call
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className={`chat-area glass-panel ${!activeChatId ? 'hide-on-mobile' : ''}`}>
        {!activeChatId ? (
          <div className="empty-chat-state">
            <MessageCircle size={56} className="empty-icon" />
            <h3>Your Messages &amp; Video Sessions</h3>
            <p>Select a conversation from the sidebar or click Call History to inspect previous sessions.</p>
          </div>
        ) : (
          <>
            <div className="chat-header">
              <button 
                className="back-btn mobile-only"
                onClick={() => {
                  setActiveChatId(null);
                  navigate('/messages', { replace: true });
                }}
              >
                <ArrowLeft size={20} />
              </button>
              
              <div className="chat-user-info">
                <div className="contact-avatar-wrapper">
                  <div className="contact-avatar small">
                    <User size={16} />
                  </div>
                  {onlineUsers.has(otherUser?.id) && <div className="online-indicator" style={{width: '10px', height: '10px', borderWidth: '1px'}}></div>}
                </div>
                <div className="chat-user-text">
                  <h3>{otherUser?.name || 'Loading...'}</h3>
                  {isTyping ? (
                    <span style={{color: 'var(--brand-primary)'}}>typing...</span>
                  ) : onlineUsers.has(otherUser?.id) ? (
                    <span>Online Now</span>
                  ) : null}
                </div>
              </div>
              
              <div className="chat-actions">
                <button 
                  className="icon-btn text-brand" 
                  onClick={() => setShowNotetakerModal(true)} 
                  title="Generate Post-Session AI Notes & Study Plan"
                  style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '8px', padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: '600' }}
                >
                  <Sparkles size={16} /> AI Recap
                </button>
                <button 
                  className="icon-btn text-brand" 
                  onClick={() => handleStartVideoCall(activeChatId)} 
                  title="Start Video Call"
                  style={{ background: 'rgba(31, 122, 90, 0.15)', border: '1px solid rgba(31, 122, 90, 0.3)', borderRadius: '8px', padding: '0.4rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: '600' }}
                >
                  <Video size={18} /> Video Call
                </button>
              </div>
            </div>

            {/* Chat & Call Timeline */}
            <div className="chat-history">
              {unifiedTimeline.length === 0 ? (
                <div className="chat-start-message">
                  <p>Send a message or start a video call to begin exchanging skills!</p>
                </div>
              ) : (
                unifiedTimeline.map((item) => {
                  if (item.timelineType === 'call') {
                    const isOutgoing = item.callerId === user.id;
                    const isCompleted = item.status === 'completed';
                    const isMissed = item.status === 'missed' || item.status === 'rejected';

                    return (
                      <div 
                        key={`call-${item.id || item._id}`} 
                        className={`inline-call-bubble ${isCompleted ? 'status-completed' : isMissed ? 'status-missed' : 'status-ended'}`}
                      >
                        <div className="inline-call-content">
                          <div className={`call-type-icon ${isCompleted ? 'completed' : isMissed ? 'missed' : 'ended'}`}>
                            {isCompleted ? <Video size={18} /> : <PhoneMissed size={18} />}
                          </div>
                          <div>
                            <h5 className="inline-call-title">
                              {isCompleted ? 'Video Call Completed' : isMissed ? (isOutgoing ? 'Unanswered Video Call' : 'Missed Video Call') : 'Video Call Ended'}
                            </h5>
                            <p className="inline-call-subtitle">
                              {isCompleted && `Duration: ${formatDuration(item.duration)} • `}
                              {new Date(item.startedAt || item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>

                        <div className="inline-call-actions">
                          <button 
                            className="call-back-btn" 
                            onClick={() => handleStartVideoCall(activeChatId)}
                          >
                            <Video size={14} /> Call Again
                          </button>
                        </div>
                      </div>
                    );
                  }

                  const isMe = item.senderId === user.id;
                  return (
                    <div key={item.id} className={`message-wrapper ${isMe ? 'message-mine' : 'message-theirs'}`}>
                      <div className="message-bubble">
                        <p>{item.text}</p>
                      </div>
                      <span className="message-time">{formatTime(item.timestamp)}</span>
                    </div>
                  );
                })
              )}
              
              {isTyping && (
                <div className="message-wrapper message-theirs">
                  <div className="typing-indicator">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-area" onSubmit={handleSendMessage}>
              <button 
                type="button" 
                className={`icon-btn ${selectedFile ? 'text-brand' : ''}`} 
                title={selectedFile ? `File: ${selectedFile.name}` : "Attach File"} 
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip size={20} />
              </button>
              
              <div className="chat-input-wrapper">
                <input 
                  type="text" 
                  ref={chatInputRef}
                  className="chat-input"
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={handleInputChange}
                />
                <div className="emoji-picker-container" ref={emojiPickerRef}>
                  {showEmojiPicker && (
                    <div className="emoji-dropdown glass-panel fade-in-up">
                      {COMMON_EMOJIS.map(emoji => (
                        <button 
                          key={emoji} 
                          type="button" 
                          className="emoji-item"
                          onClick={(e) => addEmoji(e, emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                  <button 
                    type="button" 
                    className={`icon-btn ${showEmojiPicker ? 'text-brand' : ''}`} 
                    style={{padding: '0.4rem'}} 
                    title="Emoji" 
                    onClick={(e) => {
                      e.preventDefault();
                      setShowEmojiPicker(!showEmojiPicker);
                    }}
                  >
                    <Smile size={20} className={showEmojiPicker ? '' : 'text-muted'} />
                  </button>
                </div>
              </div>
              
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleFileChange} 
              />
              <button 
                type="submit" 
                className="send-btn"
                disabled={!newMessage.trim() && !selectedFile}
              >
                <Send size={18} />
              </button>
            </form>
          </>
        )}
      </div>

      {/* AI Post-Session Notetaker Modal */}
      {activeChatId && otherUser && (
        <SessionNotetakerModal
          isOpen={showNotetakerModal}
          onClose={() => setShowNotetakerModal(false)}
          partnerId={otherUser.id}
          partnerName={otherUser.name}
          skillTopic="Direct Skill Exchange"
          initialNotes=""
          initialTranscript={messages.slice(-10).map(m => `${m.senderId === user.id ? user.name : otherUser.name}: ${m.text}`).join('\n')}
          onSendToChat={(text) => {
            const msgId = Date.now().toString(36) + Math.random().toString(36).substr(2);
            const newMsg = {
              id: msgId,
              senderId: user.id,
              receiverId: activeChatId,
              text,
              timestamp: Date.now()
            };
            setMessages(prev => [...prev, newMsg]);
            if (socket) {
              socket.emit('send_message', {
                senderId: user.id,
                receiverId: activeChatId,
                text
              });
            }
          }}
        />
      )}
    </div>
  );
}
