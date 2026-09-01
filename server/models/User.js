const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, default: "" },
  avatar: { type: String, default: "" },
  bio: { type: String, default: "Exploring and sharing skills on SkillSwap." },
  location: { type: String, default: "Global" },
  linkedin: { type: String, default: "" },
  github: { type: String, default: "" },
  twitter: { type: String, default: "" },
  website: { type: String, default: "" },
  rating: { type: Number, default: 5.0 },
  swapsCompleted: { type: Number, default: 0 },
  joinedAt: { type: Date, default: Date.now },
  // Gamification fields
  credits: { type: Number, default: 5 },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  streak: { type: Number, default: 0 },
  hoursTaught: { type: Number, default: 0 },
  hoursLearned: { type: Number, default: 0 },
  // Matchmaking fields
  timezone: { type: String, default: "UTC" },
  availability: { type: String, default: "Flexible" },
  communicationStyle: { type: String, default: "Text & Video" },
  // Social Follow fields
  followers: { type: [String], default: [] },
  following: { type: [String], default: [] }
});

module.exports = mongoose.model('User', userSchema);
