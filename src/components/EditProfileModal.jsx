import { useState, useEffect } from 'react';
import { X, User, Mail, Phone, MapPin, Globe, Linkedin, Github, Twitter, Camera, Save, Check } from 'lucide-react';
import Button from './Button';
import './EditProfileModal.css';

const DEFAULT_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150'
];

export default function EditProfileModal({ isOpen, onClose, currentUser, onSave }) {
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', bio: '', location: '',
    avatar: '', linkedin: '', github: '', twitter: '', website: '',
    timezone: 'UTC', availability: 'Flexible', communicationStyle: 'Text & Video'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Sync form data when modal opens or user changes
  useEffect(() => {
    if (isOpen && currentUser) {
      setFormData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || '',
        bio: currentUser.bio || '',
        location: currentUser.location || '',
        avatar: currentUser.avatar || '',
        linkedin: currentUser.linkedin || '',
        github: currentUser.github || '',
        twitter: currentUser.twitter || '',
        website: currentUser.website || '',
        timezone: currentUser.timezone || 'UTC',
        availability: currentUser.availability || 'Flexible',
        communicationStyle: currentUser.communicationStyle || 'Text & Video'
      });
      setError('');
      setSuccess(false);
    }
  }, [isOpen, currentUser]);

  if (!isOpen || !currentUser) return null;


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      setError('Name and Email are required.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      await onSave(formData);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 800);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be under 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="modal-overlay fade-in">
      <div className="edit-profile-modal glass-panel glow-border">
        <div className="modal-header">
          <div className="header-title">
            <h2>Edit Your Profile</h2>
            <p className="text-muted text-sm">Update your contact details, avatar and social media links</p>
          </div>
          <button className="btn-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="edit-profile-form">
          {error && <div className="profile-alert alert-error">{error}</div>}
          {success && <div className="profile-alert alert-success"><Check size={16} /> Profile updated successfully!</div>}

          {/* Avatar Selector */}
          <div className="avatar-section">
            <div className="current-avatar-preview">
              {formData.avatar ? (
                <img src={formData.avatar} alt="Avatar" className="preview-img" />
              ) : (
                <div className="avatar-placeholder"><User size={32} /></div>
              )}
            </div>
            <div className="avatar-inputs">
              <label className="input-label"><Camera size={14} /> Avatar Image</label>
              
              <div className="avatar-upload-row">
                <label className="btn-upload-file">
                  <Camera size={15} /> Upload from Device
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileUpload} 
                    style={{ display: 'none' }} 
                  />
                </label>

                <span className="upload-or-text">or URL:</span>

                <input 
                  type="url"
                  name="avatar"
                  placeholder="https://example.com/avatar.jpg"
                  value={formData.avatar.startsWith('data:') ? '' : formData.avatar}
                  onChange={handleChange}
                  className="modal-input-field avatar-url-input"
                />
              </div>

              <div className="avatar-presets">
                <span className="preset-label">Pick Preset:</span>
                {DEFAULT_AVATARS.map((url, i) => (
                  <img 
                    key={i} 
                    src={url} 
                    alt={`Preset ${i}`} 
                    className={`preset-thumb ${formData.avatar === url ? 'active' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, avatar: url }))}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="form-grid">
            <div className="input-group">
              <label className="input-label"><User size={14} /> Full Name *</label>
              <input 
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleChange}
                className="modal-input-field"
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label"><Mail size={14} /> Email Address *</label>
              <input 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange}
                className="modal-input-field"
                required
              />
            </div>

            <div className="input-group">
              <label className="input-label"><Phone size={14} /> Phone Number</label>
              <input 
                type="tel" 
                name="phone" 
                placeholder="+1 (555) 000-0000"
                value={formData.phone} 
                onChange={handleChange}
                className="modal-input-field"
              />
            </div>

            <div className="input-group">
              <label className="input-label"><MapPin size={14} /> Location</label>
              <input 
                type="text" 
                name="location" 
                placeholder="City, Country"
                value={formData.location} 
                onChange={handleChange}
                className="modal-input-field"
              />
            </div>
          </div>

          <div className="input-group mt-3">
            <label className="input-label">Bio / Summary</label>
            <textarea 
              name="bio"
              rows={3}
              placeholder="Tell the community what skills you teach and want to learn..."
              value={formData.bio}
              onChange={handleChange}
              className="modal-textarea-field"
            />
          </div>

          {/* Social Links Section */}
          <div className="social-links-section mt-4">
            <h3>Social & Web Profiles</h3>
            
            <div className="form-grid mt-2">
              <div className="input-group">
                <label className="input-label"><Linkedin size={14} /> LinkedIn URL</label>
                <input 
                  type="url" 
                  name="linkedin" 
                  placeholder="https://linkedin.com/in/username"
                  value={formData.linkedin} 
                  onChange={handleChange}
                  className="modal-input-field"
                />
              </div>

              <div className="input-group">
                <label className="input-label"><Github size={14} /> GitHub URL</label>
                <input 
                  type="url" 
                  name="github" 
                  placeholder="https://github.com/username"
                  value={formData.github} 
                  onChange={handleChange}
                  className="modal-input-field"
                />
              </div>

              <div className="input-group">
                <label className="input-label"><Twitter size={14} /> Twitter / X URL</label>
                <input 
                  type="url" 
                  name="twitter" 
                  placeholder="https://x.com/username"
                  value={formData.twitter} 
                  onChange={handleChange}
                  className="modal-input-field"
                />
              </div>

              <div className="input-group">
                <label className="input-label"><Globe size={14} /> Website / Portfolio</label>
                <input 
                  type="url" 
                  name="website" 
                  placeholder="https://yourportfolio.com"
                  value={formData.website} 
                  onChange={handleChange}
                  className="modal-input-field"
                />
              </div>
            </div>
          </div>

          {/* Matchmaking Preferences */}
          <div className="matchmaking-section mt-4">
            <h3>Matchmaking Preferences</h3>
            
            <div className="form-grid mt-2">
              <div className="input-group">
                <label className="input-label">Timezone</label>
                <select 
                  name="timezone" 
                  value={formData.timezone} 
                  onChange={handleChange}
                  className="modal-input-field select-field"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="Europe/London">London (GMT)</option>
                  <option value="Europe/Madrid">Central Europe (CET)</option>
                  <option value="Asia/Dubai">Dubai (GST)</option>
                  <option value="Asia/Kolkata">India (IST)</option>
                  <option value="Asia/Tokyo">Tokyo (JST)</option>
                  <option value="Australia/Sydney">Sydney (AEDT)</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Availability</label>
                <select 
                  name="availability" 
                  value={formData.availability} 
                  onChange={handleChange}
                  className="modal-input-field select-field"
                >
                  <option value="Flexible">Flexible</option>
                  <option value="Weekdays">Weekdays</option>
                  <option value="Weekends">Weekends</option>
                  <option value="Evenings">Evenings</option>
                  <option value="Mornings">Mornings</option>
                </select>
              </div>

              <div className="input-group">
                <label className="input-label">Communication Style</label>
                <select 
                  name="communicationStyle" 
                  value={formData.communicationStyle} 
                  onChange={handleChange}
                  className="modal-input-field select-field"
                >
                  <option value="Text & Video">Text & Video</option>
                  <option value="Video Calls">Video Calls Only</option>
                  <option value="Text & Voice">Text & Voice</option>
                  <option value="Chat Only">Chat Only</option>
                </select>
              </div>
            </div>
          </div>

          <div className="modal-footer mt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="btn-save-profile">
              <Save size={16} />
              {loading ? 'Saving Changes...' : 'Save Profile'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
