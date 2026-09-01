// server/models/SessionNote.js
const mongoose = require('mongoose');

const sessionNoteSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true, index: true },
  partnerId: { type: String, default: '' },
  partnerName: { type: String, default: 'Peer Swapper' },
  title: { type: String, required: true },
  skillTopic: { type: String, default: 'General Swap' },
  duration: { type: String, default: '45 min' },
  executiveSummary: { type: String, default: '' },
  keyConcepts: { type: [String], default: [] },
  codeSnippets: [
    {
      title: { type: String, default: '' },
      language: { type: String, default: 'javascript' },
      code: { type: String, default: '' }
    }
  ],
  actionItems: [
    {
      id: { type: Number },
      task: { type: String },
      priority: { type: String, default: 'Medium' },
      estimatedHours: { type: String, default: '1h' },
      completed: { type: Boolean, default: false }
    }
  ],
  nextSessionAgenda: { type: [String], default: [] },
  mentorPraise: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SessionNote', sessionNoteSchema);
