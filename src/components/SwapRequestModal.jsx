import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, ArrowRightLeft, Sparkles, Clock, Layers } from 'lucide-react';
import Button from './Button';
import './SwapRequestModal.css';

export default function SwapRequestModal({ 
  isOpen, 
  onClose, 
  targetUser, 
  targetSkills, 
  mySkills, 
  onSubmit, 
  loading 
}) {
  if (!isOpen || !targetUser) return null;

  // Filter skills
  const targetOffered = targetSkills.filter(s => s.level === 'Advanced' || s.level === 'Expert' || s.level === 'Intermediate');
  const myOffered = mySkills.filter(s => s.level === 'Advanced' || s.level === 'Expert' || s.level === 'Intermediate');

  // Fallback if empty
  const defaultOffered = myOffered[0]?.name || (mySkills[0]?.name || 'My Knowledge');
  const defaultWanted = targetOffered[0]?.name || (targetSkills[0]?.name || 'Your Expertise');

  const [selectedMySkill, setSelectedMySkill] = useState(defaultOffered);
  const [selectedTargetSkill, setSelectedTargetSkill] = useState(defaultWanted);
  const [message, setMessage] = useState('');
  const [swapType, setSwapType] = useState('Standard');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedMySkill || !selectedTargetSkill) {
      setError('Please select both skills for the swap exchange.');
      return;
    }
    setError('');
    onSubmit({
      recipientId: targetUser.id,
      offeredSkill: selectedMySkill,
      wantedSkill: selectedTargetSkill,
      message: message.trim(),
      swapType
    });
  };

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="swap-modal-content">
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-badge"><Sparkles size={14} /> Proposal</span>
            <h2>Skill Swap Proposal</h2>
            <p className="text-muted text-sm">Propose a mutual skill exchange with <strong>{targetUser?.name || 'this user'}</strong></p>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="modal-error-alert">{error}</div>}

          <div className="swap-exchange-card">
            <div className="exchange-side">
              <label className="exchange-label">YOU TEACH ({(targetUser?.name || 'They').split(' ')[0]} learns)</label>
              <select 
                className="modal-select"
                value={selectedMySkill}
                onChange={(e) => setSelectedMySkill(e.target.value)}
              >
                {mySkills.length === 0 ? (
                  <option value="General Guidance">General Skill Sharing</option>
                ) : (
                  mySkills.map(s => (
                    <option key={s.id || s.name} value={s.name}>
                      {s.name} ({s.level})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="exchange-icon-wrapper">
              <div className="exchange-circle">
                <ArrowRightLeft size={18} />
              </div>
            </div>

            <div className="exchange-side">
              <label className="exchange-label">YOU LEARN (from {(targetUser?.name || 'them').split(' ')[0]})</label>
              <select 
                className="modal-select"
                value={selectedTargetSkill}
                onChange={(e) => setSelectedTargetSkill(e.target.value)}
              >
                {targetSkills.length === 0 ? (
                  <option value="Expertise Sharing">General Expertise</option>
                ) : (
                  targetSkills.map(s => (
                    <option key={s.id || s.name} value={s.name}>
                      {s.name} ({s.level})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="swap-type-selector mt-4">
            <label className="input-label">Session Type</label>
            <div className="swap-type-options">
              <button type="button" className={`swap-type-btn ${swapType === 'Standard' ? 'active' : ''}`} onClick={() => setSwapType('Standard')}>
                <ArrowRightLeft size={16} />
                <span>Standard</span>
                <small>1-on-1 skill exchange</small>
              </button>
              <button type="button" className={`swap-type-btn ${swapType === 'Project-Based' ? 'active' : ''}`} onClick={() => setSwapType('Project-Based')}>
                <Layers size={16} />
                <span>Project-Based</span>
                <small>Collaborate on a project</small>
              </button>
              <button type="button" className={`swap-type-btn ${swapType === 'Micro-Session' ? 'active' : ''}`} onClick={() => setSwapType('Micro-Session')}>
                <Clock size={16} />
                <span>Micro-Session</span>
                <small>Quick 15-min lesson</small>
              </button>
            </div>
          </div>

          <div className="input-group mt-4">
            <label className="input-label">Optional Intro Note</label>
            <textarea
              className="modal-textarea"
              rows={3}
              placeholder={`Hi ${(targetUser?.name || 'there').split(' ')[0]}! I'd love to swap skills with you. Let's schedule a session!`}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>

          <div className="modal-footer mt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="btn-send-proposal">
              <Send size={16} />
              {loading ? 'Sending Proposal...' : 'Send Swap Request'}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
