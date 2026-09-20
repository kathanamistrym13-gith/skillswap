import { useEffect, useState } from 'react';
import { MessageSquare, CheckCircle, Video, Award, AlertCircle, X, Sparkles } from 'lucide-react';
import './ToastNotification.css';

export default function ToastNotification({ toast, onDismiss, onClick }) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast]);

  const handleClose = (e) => {
    if (e) e.stopPropagation();
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 300);
  };

  const handleClick = () => {
    if (onClick) {
      onClick(toast);
    }
    handleClose();
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'message':
        return <MessageSquare size={18} />;
      case 'task':
      case 'success':
        return <CheckCircle size={18} />;
      case 'call':
        return <Video size={18} />;
      case 'xp':
        return <Sparkles size={18} />;
      default:
        return <Award size={18} />;
    }
  };

  return (
    <div
      className={`toast-card type-${toast.type || 'info'} ${isExiting ? 'exiting' : ''}`}
      onClick={handleClick}
      role="alert"
    >
      <div className="toast-icon-box">
        {getIcon()}
      </div>

      <div className="toast-content">
        <div className="toast-header-row">
          <h5 className="toast-title">{toast.title}</h5>
          <span className="toast-time">Just now</span>
        </div>
        <p className="toast-message">{toast.message}</p>
        {toast.xp && (
          <div className="toast-xp-pill">
            <Sparkles size={12} /> +{toast.xp} XP
          </div>
        )}
      </div>

      <button className="toast-close-btn" onClick={handleClose} title="Dismiss">
        <X size={16} />
      </button>
    </div>
  );
}
