const mongoose = require('mongoose');

const callSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  from: { type: String, required: true, index: true },
  to: { type: String, required: true, index: true },
  callerName: { type: String, default: 'SkillSwap User' },
  offerSignal: { type: Object, default: null },
  answerSignal: { type: Object, default: null },
  status: { 
    type: String, 
    enum: ['ringing', 'connected', 'ended', 'rejected'], 
    default: 'ringing' 
  },
  createdAt: { type: Date, default: Date.now, expires: 300 } // Auto-cleans after 5 minutes
});

module.exports = mongoose.model('Call', callSchema);
