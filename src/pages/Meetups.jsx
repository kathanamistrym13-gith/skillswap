import { useState } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Calendar, Users, Plus, Search, Clock, Award, Sparkles, CheckCircle2, X } from 'lucide-react';
import Button from '../components/Button';
import './Meetups.css';

const INITIAL_EVENTS = [
  {
    id: 'e1',
    title: 'San Francisco Tech & Design Swap Meet',
    host: 'Sarah Jenkins',
    location: 'Coffee Bar, Downtown SF',
    date: 'Saturday, Aug 12 · 2:00 PM',
    attendees: 18,
    maxAttendees: 25,
    category: 'Programming & Design',
    description: 'Bring your laptop! An informal 2-hour meet & greet to swap coding, UI/UX, and AI tips over coffee.',
    joined: false
  },
  {
    id: 'e2',
    title: 'Language Exchange & Cultural Hour',
    host: 'Miguel Santos',
    location: 'Central Park Pavilion',
    date: 'Sunday, Aug 13 · 11:00 AM',
    attendees: 12,
    maxAttendees: 15,
    category: 'Languages',
    description: 'Practice English, Spanish, Japanese, and French in a relaxed park setting.',
    joined: true
  },
  {
    id: 'e3',
    title: 'Acoustic Guitar & Songwriting Circle',
    host: 'Elena Rostova',
    location: 'Community Center Room B',
    date: 'Wednesday, Aug 16 · 6:30 PM',
    attendees: 8,
    maxAttendees: 10,
    category: 'Music',
    description: 'Bring an instrument! We will exchange chord techniques and work on song arrangements together.',
    joined: false
  }
];

export default function Meetups() {
  const [events, setEvents] = useState(INITIAL_EVENTS);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Event Form State
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('Programming');
  const [description, setDescription] = useState('');

  const toggleJoin = (id) => {
    setEvents(events.map(ev => {
      if (ev.id === id) {
        const joined = !ev.joined;
        return {
          ...ev,
          joined,
          attendees: joined ? ev.attendees + 1 : ev.attendees - 1
        };
      }
      return ev;
    }));
  };

  const handleCreateEvent = (e) => {
    e.preventDefault();
    if (!title.trim() || !location.trim()) return;

    const newEv = {
      id: `e-${Date.now()}`,
      title,
      host: 'You',
      location,
      date: date || 'Upcoming',
      attendees: 1,
      maxAttendees: 20,
      category,
      description,
      joined: true
    };

    setEvents([newEv, ...events]);
    setTitle('');
    setLocation('');
    setDate('');
    setDescription('');
    setShowCreateModal(false);
  };

  const filtered = events.filter(e => 
    e.title.toLowerCase().includes(search.toLowerCase()) || 
    e.location.toLowerCase().includes(search.toLowerCase()) ||
    e.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="meetups-page container fade-in">
      <div className="meetups-header">
        <div className="meetups-header-title">
          <h1>
            <span className="icon-wrapper-brand"><MapPin size={24} /></span>
            <span>Skill Meetups & Events</span>
          </h1>
          <p className="text-muted">Connect in-person or virtually in local group skill-sharing workshops.</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus size={16} /> Host an Event
        </Button>
      </div>

      <div className="meetup-search-box glass-panel mb-4">
        <Search size={18} className="meetup-search-icon" />
        <input 
          type="text" 
          placeholder="Search meetups by title, city, or skill..." 
          value={search} 
          onChange={(e) => setSearch(e.target.value)} 
        />
      </div>

      <div className="events-grid">
        {filtered.map(ev => (
          <div key={ev.id} className="event-card glass-panel">
            <div className="event-badge">{ev.category}</div>
            <h3 className="event-title">{ev.title}</h3>
            
            <div className="event-details">
              <div className="detail-item"><Calendar size={14} /> {ev.date}</div>
              <div className="detail-item"><MapPin size={14} /> {ev.location}</div>
              <div className="detail-item"><Users size={14} /> {ev.attendees} / {ev.maxAttendees} attending</div>
            </div>

            <p className="event-desc">{ev.description}</p>

            <div className="event-footer">
              <span className="event-host">Hosted by <strong>{ev.host}</strong></span>
              <Button 
                variant={ev.joined ? 'secondary' : 'primary'} 
                onClick={() => toggleJoin(ev.id)}
                className="btn-join-event"
              >
                {ev.joined ? <><CheckCircle2 size={14} /> Attending</> : 'RSVP / Join'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Host Event Modal — rendered at document.body via Portal */}
      {showCreateModal && createPortal(
        <div
          className="meetup-modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setShowCreateModal(false)}
        >
          <div className="meetup-modal-card">
            <div className="meetup-modal-header">
              <div>
                <span className="meetup-modal-eyebrow"><Sparkles size={13}/> Skill Meetup</span>
                <h2>Host a Skill Meetup</h2>
              </div>
              <button className="meetup-modal-close" onClick={() => setShowCreateModal(false)} aria-label="Close">
                <X size={18}/>
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="meetup-modal-form">
              <div className="meetup-input-group">
                <label>Event Title</label>
                <input
                  type="text"
                  placeholder="e.g. SF Python & AI Coffee Exchange"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="meetup-input-group">
                <label>Location / Meeting Link</label>
                <input
                  type="text"
                  placeholder="e.g. Starbucks, 4th St or Zoom Link"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                />
              </div>

              <div className="meetup-form-row">
                <div className="meetup-input-group">
                  <label>Date &amp; Time</label>
                  <input
                    type="text"
                    placeholder="e.g. Saturday, Aug 20 at 3:00 PM"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>

                <div className="meetup-input-group">
                  <label>Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="Programming">Programming &amp; Tech</option>
                    <option value="Design">Design &amp; Art</option>
                    <option value="Languages">Languages &amp; Culture</option>
                    <option value="Music">Music &amp; Performance</option>
                    <option value="Business">Business &amp; Strategy</option>
                  </select>
                </div>
              </div>

              <div className="meetup-input-group">
                <label>Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe what people will learn and what to bring..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="meetup-modal-actions">
                <button type="button" className="meetup-btn-cancel" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button type="submit" className="meetup-btn-publish">
                  <Plus size={16}/> Publish Meetup
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
