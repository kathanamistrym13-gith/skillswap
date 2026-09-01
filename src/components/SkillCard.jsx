import './SkillCard.css';
import { Tag, Trash2, BookOpen, ShieldCheck, Award } from 'lucide-react';

export default function SkillCard({ skill, onDelete, onVerify, variant = 'offer' }) {
  const isWant = variant === 'want' || skill.type === 'want';
  const isVerified = Boolean(skill.verified);

  return (
    <div className={`skill-card glass-panel group ${isWant ? 'skill-card-want' : ''} ${isVerified ? 'skill-card-verified' : ''}`}>
      <div className="skill-content">
        <div className={`skill-icon ${isWant ? 'skill-icon-want' : ''} ${isVerified ? 'skill-icon-verified' : ''}`}>
          {isWant ? <BookOpen size={20} /> : <Tag size={20} />}
        </div>
        <div className="skill-info">
          <div className="skill-title-row">
            <h3 className="skill-title">{skill.name}</h3>
            {isVerified && (
              <span className="skill-verified-badge" title="Verified Skill Certification">
                <ShieldCheck size={14} /> Verified
              </span>
            )}
          </div>
          <p className="skill-level">
            {isWant ? `Want to Learn · ${skill.level || 'Beginner'}` : skill.level || 'Beginner'}
          </p>
        </div>
      </div>
      
      <div className="skill-actions">
        {!isWant && !isVerified && onVerify && (
          <button 
            onClick={() => onVerify(skill)}
            className="skill-verify-btn"
            title="Take assessment to verify skill"
          >
            <Award size={16} /> Verify
          </button>
        )}

        {onDelete && (
          <button 
            onClick={() => onDelete(skill.id)}
            className="skill-delete-btn"
            title="Remove Skill"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

