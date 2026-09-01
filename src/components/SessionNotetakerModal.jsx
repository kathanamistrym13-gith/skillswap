import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Sparkles, X, CheckSquare, Square, Copy, Check, Download,
  Send, Code2, BookOpen, Clock, Award, Layers, Zap
} from 'lucide-react';
import axios from 'axios';
import Button from './Button';
import './SessionNotetakerModal.css';

const API_URL = '/api';

export default function SessionNotetakerModal({
  isOpen,
  onClose,
  partnerId = '',
  partnerName = 'Peer Partner',
  skillTopic = 'Skill Exchange Session',
  initialNotes = '',
  initialTranscript = '',
  onSendToChat = null
}) {
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [completedActions, setCompletedActions] = useState(new Set());
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && !summaryData) {
      generateSummary();
    }
  }, [isOpen]);

  const generateSummary = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_URL}/ai/session-notetaker/generate`, {
        sessionContext: `Session between swappers on ${skillTopic}`,
        notes: initialNotes,
        transcript: initialTranscript,
        skillTopic,
        partnerName
      });
      setSummaryData(res.data);
    } catch (err) {
      console.error('Failed to generate session summary', err);
      setError('Failed to generate summary. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleActionItem = (id) => {
    setCompletedActions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCopyMarkdown = () => {
    if (!summaryData) return;
    const md = `# ${summaryData.title}
**Duration:** ${summaryData.duration} | **Partner:** ${partnerName}

## Executive Summary
${summaryData.executiveSummary}

## Key Takeaways
${summaryData.keyConcepts?.map(k => `- ${k}`).join('\n')}

## Code Snippets
${summaryData.codeSnippets?.map(c => `### ${c.title} (${c.language})\n\`\`\`${c.language}\n${c.code}\n\`\`\``).join('\n\n')}

## Action Items & Homework
${summaryData.actionItems?.map(a => `- [ ] ${a.task} (${a.estimatedHours})`).join('\n')}

## Next Session Agenda
${summaryData.nextSessionAgenda?.map(n => `- ${n}`).join('\n')}
`;

    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToNotes = async () => {
    if (!summaryData) return;
    try {
      await axios.post(`${API_URL}/session-notes`, {
        partnerId,
        partnerName,
        title: summaryData.title,
        skillTopic,
        duration: summaryData.duration,
        executiveSummary: summaryData.executiveSummary,
        keyConcepts: summaryData.keyConcepts,
        codeSnippets: summaryData.codeSnippets,
        actionItems: summaryData.actionItems?.map(a => ({
          ...a,
          completed: completedActions.has(a.id)
        })),
        nextSessionAgenda: summaryData.nextSessionAgenda,
        mentorPraise: summaryData.mentorPraise
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error('Failed to save session note', err);
    }
  };

  const handleShareToChat = () => {
    if (!summaryData || !onSendToChat) return;
    const chatText = `📝 **AI Session Summary: ${summaryData.title}**\n\n**Executive Summary:**\n${summaryData.executiveSummary}\n\n**Action Items:**\n${summaryData.actionItems?.map(a => `• ${a.task}`).join('\n')}\n\n**Next Session:**\n${summaryData.nextSessionAgenda?.join(', ')}`;
    onSendToChat(chatText);
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="notetaker-modal-overlay fade-in" onClick={onClose}>
      <div className="notetaker-modal-card glass-panel glow-border" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="notetaker-header">
          <div className="notetaker-title-area">
            <div className="notetaker-icon-badge">
              <Sparkles size={18} className="text-brand" />
            </div>
            <div>
              <h2>Post-Session AI Notetaker</h2>
              <p className="text-muted">Automatic synthesis of key takeaways, code patterns, and homework.</p>
            </div>
          </div>
          <button className="btn-close-modal" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="notetaker-loading-view">
            <Sparkles className="spin text-brand" size={40} />
            <h3>Distilling Session Insights...</h3>
            <p className="text-muted">Synthesizing discussions, extracting key code patterns, and constructing practice action items.</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="notetaker-error">
            <p>{error}</p>
            <Button onClick={generateSummary} variant="secondary">Retry</Button>
          </div>
        )}

        {/* Loaded Content */}
        {!loading && summaryData && (
          <div className="notetaker-content-scroll">
            {/* Title & Metadata Banner */}
            <div className="notetaker-banner glass-panel">
              <div className="banner-top">
                <span className="banner-topic-tag">{skillTopic}</span>
                <span className="banner-duration"><Clock size={13} /> {summaryData.duration}</span>
              </div>
              <h3 className="banner-title">{summaryData.title}</h3>
              <p className="banner-summary">{summaryData.executiveSummary}</p>
            </div>

            {/* Key Concepts */}
            {summaryData.keyConcepts && summaryData.keyConcepts.length > 0 && (
              <div className="summary-block">
                <h4 className="block-heading"><BookOpen size={16} className="text-brand" /> Key Concepts Mastered</h4>
                <ul className="concepts-list">
                  {summaryData.keyConcepts.map((item, idx) => (
                    <li key={idx}>
                      <span className="bullet-dot"></span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Code Snippets */}
            {summaryData.codeSnippets && summaryData.codeSnippets.length > 0 && (
              <div className="summary-block">
                <h4 className="block-heading"><Code2 size={16} className="text-brand" /> Code Snippets & Patterns</h4>
                <div className="code-snippets-list">
                  {summaryData.codeSnippets.map((snippet, idx) => (
                    <div key={idx} className="code-snippet-box">
                      <div className="snippet-header">
                        <span>{snippet.title}</span>
                        <span className="snippet-lang">{snippet.language}</span>
                      </div>
                      <pre className="snippet-pre">
                        <code>{snippet.code}</code>
                      </pre>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Items & Homework Checklist */}
            {summaryData.actionItems && summaryData.actionItems.length > 0 && (
              <div className="summary-block">
                <h4 className="block-heading"><CheckSquare size={16} className="text-success" /> Practice Action Items & Homework</h4>
                <div className="action-items-list">
                  {summaryData.actionItems.map((action, idx) => {
                    const isDone = completedActions.has(action.id);
                    return (
                      <div
                        key={action.id || idx}
                        className={`action-item-row ${isDone ? 'done' : ''}`}
                        onClick={() => toggleActionItem(action.id)}
                      >
                        <div className="action-item-check">
                          {isDone ? <CheckSquare size={18} className="text-success" /> : <Square size={18} className="text-muted" />}
                        </div>
                        <div className="action-item-text">
                          <span>{action.task}</span>
                          <div className="action-item-meta">
                            <span className={`priority-tag ${action.priority?.toLowerCase()}`}>{action.priority || 'Medium'} Priority</span>
                            <span className="est-hours"><Clock size={11} /> {action.estimatedHours || '1h'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Next Session Agenda & Praise */}
            {summaryData.nextSessionAgenda && summaryData.nextSessionAgenda.length > 0 && (
              <div className="summary-block next-agenda-block">
                <h4 className="block-heading"><Layers size={16} className="text-brand" /> Next Session Suggested Agenda</h4>
                <ul className="agenda-list">
                  {summaryData.nextSessionAgenda.map((agenda, idx) => (
                    <li key={idx}>{agenda}</li>
                  ))}
                </ul>
              </div>
            )}

            {summaryData.mentorPraise && (
              <div className="mentor-praise-card">
                <Award size={20} className="text-warning" />
                <p>"{summaryData.mentorPraise}"</p>
              </div>
            )}
          </div>
        )}

        {/* Modal Actions Footer */}
        {!loading && summaryData && (
          <div className="notetaker-footer">
            <div className="footer-left-actions">
              <button className="btn-footer-action" onClick={handleCopyMarkdown}>
                {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
                <span>{copied ? 'Copied Markdown!' : 'Copy Markdown'}</span>
              </button>
              <button className="btn-footer-action" onClick={handleSaveToNotes}>
                <Zap size={16} className={saved ? 'text-warning' : ''} />
                <span>{saved ? 'Saved to Notes!' : 'Save to Profile Notes'}</span>
              </button>
            </div>

            <div className="footer-right-actions">
              {onSendToChat && (
                <Button onClick={handleShareToChat} variant="primary">
                  <Send size={15} /> Send to Chat
                </Button>
              )}
              <Button onClick={onClose} variant="secondary">
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
