import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Send, ArrowLeft, User, Phone, Video, MessageCircle, Paperclip, Smile, Sparkles } from 'lucide-react';
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
  const fileInputRef = useRef(null); // Ref for file attachment
  const emojiPickerRef = useRef(null);
  const [conversations, setConversations] = useState([]);
  const [activeChatId, setActiveChatId] = useState(userId || null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState(null);
  const [showNotetakerModal, setShowNotetakerModal] = useState(false);
  
  // Sync activeChatId with URL parameters
  useEffect(() => {
    if (userId && userId !== activeChatId) {
      setActiveChatId(userId);
    }
  }, [userId]);

  // Initial Data Load
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set()); // Mock online support
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const typingTimeoutRef = useRef(null);

  // Initial Data Load
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const [usersRes, messagesRes] = await Promise.all([
          axios.get(`${API_URL}/users`),
          axios.get(`${API_URL}/messages/${user.id}`)
        ]);
        
        const allUsers = usersRes.data;
        const allMessages = messagesRes.data;

        const interactedUserIds = new Set();
        allMessages.forEach(msg => {
          if (msg.senderId === user.id) interactedUserIds.add(msg.receiverId);
          if (msg.receiverId === user.id) interactedUserIds.add(msg.senderId);
        });

        if (activeChatId) interactedUserIds.add(activeChatId);

        const activeConversations = Array.from(interactedUserIds)
          .map(id => allUsers.find(u => u.id === id))
          .filter(Boolean);
          
        setConversations(activeConversations);

        // Mock 50% online users for display purposes
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
        }
      } catch (err) {
        console.error("Failed to fetch messages data", err);
      }
    };

    fetchData();
  }, [user, activeChatId]);

  // Handle Real-time Socket Events
  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (msg) => {
      if (msg.senderId === activeChatId || msg.receiverId === activeChatId) {
        setMessages(prev => [...prev, msg]);
        if (msg.senderId === activeChatId) setIsTyping(false); // Clear typing indicator
      }
      
      setConversations(prev => {
        if (!prev.find(c => c.id === msg.senderId)) {
          axios.get(`${API_URL}/users`).then(res => {
             const sender = res.data.find(u => u.id === msg.senderId);
             if(sender) setConversations(old => [...old, sender]);
          });
        }
        return prev;
      });
    };
    
    const handleTyping = (data) => {
      if (data.senderId === activeChatId) setIsTyping(true);
    };

    const handleStopTyping = (data) => {
      if (data.senderId === activeChatId) setIsTyping(false);
    };

    socket.on('receive_message', handleReceiveMessage);
    socket.on('message_sent', handleReceiveMessage);
    socket.on('typing', handleTyping);
    socket.on('stop_typing', handleStopTyping);

    // Close emoji picker when clicking outside
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      socket.off('receive_message', handleReceiveMessage);
      socket.off('message_sent', handleReceiveMessage);
      socket.off('typing', handleTyping);
      socket.off('stop_typing', handleStopTyping);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [socket, activeChatId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

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
      // Fallback via REST API when socket is disconnected or in serverless Vercel
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
      // Automatically add a mention of the file in the text
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
    
    // Defer focus and cursor placement
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const handleStartVideoCall = () => {
    navigate(`/call/${activeChatId}`);
  };
  
  const rejectCall = () => {
    // handled globally by IncomingCallOverlay
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="messages-layout container">
      {/* Sidebar: Conversations List */}
      <div className={`conversations-sidebar glass-panel ${activeChatId ? 'hide-on-mobile' : ''}`}>
        <div className="sidebar-header">
          <h2>Messages</h2>
        </div>
        
        <div className="conversations-list">
          {conversations.length === 0 ? (
            <div className="empty-conversations">
              <p>No messages yet. Go to Explore to find people!</p>
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
                    {isOnline && <div className="contact-preview">Online</div>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`chat-area glass-panel ${!activeChatId ? 'hide-on-mobile' : ''}`}>
        {!activeChatId ? (
          <div className="empty-chat-state">
            <MessageCircle size={56} className="empty-icon" />
            <h3>Your Messages</h3>
            <p>Select a conversation to start chatting.</p>
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
                <button className="icon-btn text-brand" onClick={handleStartVideoCall} title="Start Video Call">
                  <Video size={20} />
                </button>
              </div>
            </div>

            <div className="chat-history">
              {messages.length === 0 ? (
                <div className="chat-start-message">
                  <p>Send a message to start the conversation!</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.senderId === user.id;
                  return (
                    <div key={msg.id} className={`message-wrapper ${isMe ? 'message-mine' : 'message-theirs'}`}>
                      <div className="message-bubble">
                        <p>{msg.text}</p>
                      </div>
                      <span className="message-time">{formatTime(msg.timestamp)}</span>
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
