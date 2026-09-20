const mongoose = require('mongoose');

const callHistorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  callId: { type: String, required: true, index: true },
  callerId: { type: String, required: true, index: true },
  receiverId: { type: String, required: true, index: true },
  callerName: { type: String, default: 'SkillSwap User' },
  receiverName: { type: String, default: 'SkillSwap User' },
  status: { 
    type: String, 
    enum: ['completed', 'missed', 'rejected', 'ended', 'ringing'], 
    default: 'ringing' 
  },
  callType: {
    type: String,
    enum: ['video', 'audio'],
    default: 'video'
  },
  duration: { type: Number, default: 0 }, // In seconds
  startedAt: { type: Date, default: Date.now },
  endedAt: { type: Date, default: null },
  timestamp: { type: Number, required: true, default: Date.now }
});

module.exports = mongoose.model('CallHistory', callHistorySchema);
