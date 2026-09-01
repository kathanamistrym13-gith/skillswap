const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  sender_id: { type: String, required: true, index: true },
  receiver_id: { type: String, required: true, index: true },
  text: { type: String, required: true },
  timestamp: { type: Number, required: true, default: Date.now }
});

module.exports = mongoose.model('Message', messageSchema);
