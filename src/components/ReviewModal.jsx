import { useState } from 'react';
import { X, Star, MessageSquare } from 'lucide-react';
import Button from './Button';
import './SwapRequestModal.css'; // Reuse modal styles

export default function ReviewModal({ isOpen, onClose, partnerName, onSubmitReview }) {
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmitReview({ rating, review: reviewText });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay fade-in">
      <div className="modal-content glass-panel glow-border" style={{ maxWidth: '450px' }}>
        <button className="btn-close-modal" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="modal-header">
          <h3>Review {partnerName}</h3>
          <p className="text-muted text-sm mt-1">Rate your skill swap experience and help the community.</p>
        </div>

        <form onSubmit={handleSubmit} className="modal-body mt-4">
          <div className="form-group mb-4">
            <label>Rating (1-5)</label>
            <div className="flex items-center gap-2 mt-2" style={{ display: 'flex', gap: '0.5rem' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: star <= rating ? '#F59E0B' : 'var(--border-glass)',
                    transition: 'color 0.2s'
                  }}
                >
                  <Star size={32} fill={star <= rating ? 'currentColor' : 'none'} />
                </button>
              ))}
            </div>
          </div>

          <div className="form-group mb-4">
            <label>Written Review <span className="text-muted text-xs font-normal">(Optional)</span></label>
            <div className="textarea-wrapper" style={{ position: 'relative', marginTop: '0.5rem' }}>
              <MessageSquare size={16} className="input-icon" style={{ position: 'absolute', top: '12px', left: '12px', color: 'var(--text-muted)' }} />
              <textarea
                className="form-input"
                style={{ paddingLeft: '2.5rem', minHeight: '100px', width: '100%', background: 'transparent', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', resize: 'vertical' }}
                placeholder="What did you learn? How was their teaching style?"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer" style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="btn-primary" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
