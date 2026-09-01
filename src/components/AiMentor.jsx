import { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles, Lightbulb } from 'lucide-react';
import axios from 'axios';
import './AiMentor.css';

const API_URL = '/api';

export default function AiMentor() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, sender: 'ai', text: "Hi! I'm your AI Mentor. Ask me to explain a concept or generate a practice quiz." }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim()) return;

    const userMsg = { id: Date.now(), sender: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await axios.post(`${API_URL}/ai/chat`, { message: userMsg.text });
      const aiMsg = { id: Date.now() + 1, sender: 'ai', text: res.data.reply };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', text: "Sorry, I'm offline right now." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickAction = (action) => {
    setInput(action);
    setTimeout(() => {
      // Simulate form submission
      const fakeEvent = { preventDefault: () => {} };
      handleSend(fakeEvent);
    }, 100);
  };

  return (
    <div className="ai-mentor-container">
      {!isOpen && (
        <button className="ai-mentor-fab" onClick={() => setIsOpen(true)}>
          <Bot size={24} />
        </button>
      )}

      {isOpen && (
        <div className="ai-mentor-chat glass-panel glow-border slide-up">
          <div className="chat-header">
            <div className="header-info">
              <Bot size={20} className="text-brand" />
              <h3>AI Mentor</h3>
            </div>
            <button className="btn-close" onClick={() => setIsOpen(false)}><X size={18} /></button>
          </div>

          <div className="chat-messages">
            {messages.map(msg => (
              <div key={msg.id} className={`message-bubble ${msg.sender}`}>
                <p>{msg.text}</p>
              </div>
            ))}
            {isTyping && (
              <div className="message-bubble ai typing">
                <span className="dot"></span><span className="dot"></span><span className="dot"></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-suggestions">
            <button className="suggestion-chip" onClick={() => handleQuickAction("Explain React Hooks")}>
              <Lightbulb size={12} /> Explain Concept
            </button>
            <button className="suggestion-chip" onClick={() => handleQuickAction("Generate a Python quiz")}>
              <Sparkles size={12} /> Practice Quiz
            </button>
          </div>

          <form onSubmit={handleSend} className="chat-input-area">
            <input 
              type="text" 
              placeholder="Ask anything..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="chat-input"
            />
            <button type="submit" className="btn-send" disabled={!input.trim()}>
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
