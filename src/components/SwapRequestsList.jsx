import { useState } from 'react';
import { Check, X, ArrowRightLeft, Clock, CheckCircle2, XCircle, User, MessageSquare, Briefcase, Star } from 'lucide-react';
import Button from './Button';
import { useNavigate } from 'react-router-dom';
import ReviewModal from './ReviewModal';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import './SwapRequestsList.css';

export default function SwapRequestsList({ requests = [], userId, onStatusUpdate }) {
  const [activeTab, setActiveTab] = useState('incoming'); // 'incoming' | 'outgoing'
  const [loadingId, setLoadingId] = useState(null);
  const [reviewData, setReviewData] = useState(null); // { req, partnerName }
  const navigate = useNavigate();
  const { showToast, addNotification } = useNotifications();
  const { addXP } = useAuth();

  const incomingRequests = requests.filter(r => r.recipientId === userId);
  const outgoingRequests = requests.filter(r => r.requesterId === userId);

  const displayedRequests = activeTab === 'incoming' ? incomingRequests : outgoingRequests;

  const handleAction = async (requestId, status) => {
    setLoadingId(requestId);
    const targetReq = requests.find(r => r.id === requestId);
    try {
      await onStatusUpdate(requestId, status);
      if (status === 'completed') {
        if (addXP) addXP(50, 'Completed Skill Swap Task');
        if (addNotification) {
          addNotification({
            type: 'task',
            title: '🎉 Skill Swap Completed!',
            message: `Congratulations! Your exchange with ${targetReq?.recipientName || targetReq?.requesterName || 'Partner'} is complete!`,
            xp: 50
          });
        }
      } else if (status === 'accepted') {
        if (addXP) addXP(25, 'Accepted Skill Swap Proposal');
        if (showToast) {
          showToast({
            type: 'success',
            title: '✨ Proposal Accepted!',
            message: `Exchange active! You can now start messaging or video calling.`,
            xp: 25
          });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingId(null);
    }
  };

  const handleSubmitReview = async (reviewDetails) => {
    // In a real app, send reviewDetails to the API
    console.log('Submitted review:', reviewDetails);
    await handleAction(reviewData.req.id, 'completed');
  };

  return (
    <div className="swap-requests-container glass-panel">
      <div className="requests-header">
        <div className="requests-title-group">
          <h3>Skill Swap Proposals</h3>
          <p className="text-muted text-sm">Review, accept or reject incoming skill exchange offers.</p>
        </div>

        <div className="requests-tabs">
          <button 
            className={`tab-btn ${activeTab === 'incoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('incoming')}
          >
            Incoming ({incomingRequests.filter(r => r.status === 'pending').length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'outgoing' ? 'active' : ''}`}
            onClick={() => setActiveTab('outgoing')}
          >
            Sent Proposals ({outgoingRequests.length})
          </button>
        </div>
      </div>

      <div className="requests-list">
        {displayedRequests.length === 0 ? (
          <div className="empty-requests-state">
            <Clock size={40} className="text-muted mb-2" />
            <p>No {activeTab} swap proposals found.</p>
          </div>
        ) : (
          displayedRequests.map(req => {
            const isIncoming = req.recipientId === userId;
            const otherUserName = isIncoming ? req.requesterName : req.recipientName;
            const otherUserId = isIncoming ? req.requesterId : req.recipientId;

            return (
              <div key={req.id} className={`request-card status-${req.status}`}>
                <div className="request-card-left">
                  <div className="user-avatar-circle">
                    <User size={20} />
                  </div>
                  
                  <div className="request-info">
                    <div className="user-name-row">
                      <h4>{otherUserName}</h4>
                      <span className={`status-badge status-${req.status}`}>
                        {req.status === 'pending' && <Clock size={12} />}
                        {req.status === 'accepted' && <CheckCircle2 size={12} />}
                        {req.status === 'rejected' && <XCircle size={12} />}
                        {req.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="swap-pair-detail">
                      <span className="skill-pill offer">Teaches: {req.offeredSkill}</span>
                      <ArrowRightLeft size={14} className="icon-exchange" />
                      <span className="skill-pill want">Wants: {req.wantedSkill}</span>
                    </div>

                    {req.message && (
                      <p className="request-note">"{req.message}"</p>
                    )}

                    {req.swapType && req.swapType !== 'Standard' && (
                      <span className={`swap-type-badge type-${req.swapType.toLowerCase().replace('-', '')}`}>
                        {req.swapType === 'Project-Based' ? <Briefcase size={11} /> : <Clock size={11} />}
                        {req.swapType}
                      </span>
                    )}
                  </div>
                </div>

                <div className="request-card-actions">
                  {isIncoming && req.status === 'pending' ? (
                    <div className="btn-decision-group">
                      <button 
                        className="btn-accept" 
                        disabled={loadingId === req.id}
                        onClick={() => handleAction(req.id, 'accepted')}
                      >
                        <Check size={16} /> Accept
                      </button>
                      <button 
                        className="btn-reject" 
                        disabled={loadingId === req.id}
                        onClick={() => handleAction(req.id, 'rejected')}
                      >
                        <X size={16} /> Reject
                      </button>
                    </div>
                  ) : req.status === 'accepted' ? (
                    <div className="btn-decision-group">
                      <Button 
                        variant="ghost" 
                        className="btn-open-chat"
                        onClick={() => navigate(`/messages/${otherUserId}`)}
                      >
                        <MessageSquare size={16} /> Chat
                      </Button>
                      <Button 
                        className="btn-primary" 
                        onClick={() => setReviewData({ req, partnerName: otherUserName })}
                      >
                        <Star size={16} fill="currentColor" /> Leave Review
                      </Button>
                    </div>
                  ) : req.status === 'completed' ? (
                    <div className="text-success text-sm flex items-center gap-1 font-medium" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#10B981', fontWeight: 600 }}>
                      <CheckCircle2 size={16} /> Swap Completed
                    </div>
                  ) : (
                    <Button 
                      variant="ghost" 
                      className="btn-open-chat"
                      onClick={() => navigate(`/messages/${otherUserId}`)}
                    >
                      <MessageSquare size={16} /> Chat
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {reviewData && (
        <ReviewModal
          isOpen={true}
          onClose={() => setReviewData(null)}
          partnerName={reviewData.partnerName}
          onSubmitReview={handleSubmitReview}
        />
      )}
    </div>
  );
}
