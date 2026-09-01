const mongoose = require('mongoose');

const skillSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  user_id: { type: String, required: true, index: true },
  name: { type: String, required: true },
  level: { type: String, required: true },
  type: { type: String, enum: ['offer', 'want'], default: 'offer' }, // 'offer' = can teach, 'want' = wants to learn
  verified: { type: Boolean, default: false }
});

module.exports = mongoose.model('Skill', skillSchema);

