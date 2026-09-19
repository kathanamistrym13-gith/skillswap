const mongoose = require('mongoose');

const swapRequestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  requesterId: { type: String, required: true, index: true },
  recipientId: { type: String, required: true, index: true },
  offeredSkill: { type: String, required: true },
  wantedSkill: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected', 'completed'], 
    default: 'pending' 
  },
  swapType: {
    type: String,
    enum: ['Standard', 'Project-Based', 'Micro-Session'],
    default: 'Standard'
  },
  message: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SwapRequest', swapRequestSchema);
