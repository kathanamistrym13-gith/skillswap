const sqlite3 = require('sqlite3').verbose();
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const User = require('./models/User');
const Skill = require('./models/Skill');
const Message = require('./models/Message');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillswap';

async function migrate() {
  const sqliteDb = new sqlite3.Database(dbPath);
  await mongoose.connect(MONGODB_URI);
  console.log('Starting migration...');

  // Helper to run SQLite queries as promises
  const all = (query, params = []) => new Promise((resolve, reject) => {
    sqliteDb.all(query, params, (err, rows) => err ? reject(err) : resolve(rows));
  });

  try {
    // 1. Migrate Users
    const users = await all('SELECT * FROM users');
    console.log(`Migrating ${users.length} users...`);
    for (const user of users) {
      await User.findOneAndUpdate({ id: user.id }, user, { upsert: true });
    }

    // 2. Migrate Skills
    const skills = await all('SELECT * FROM skills');
    console.log(`Migrating ${skills.length} skills...`);
    for (const skill of skills) {
      await Skill.findOneAndUpdate({ id: skill.id }, skill, { upsert: true });
    }

    // 3. Migrate Messages
    const messages = await all('SELECT * FROM messages');
    console.log(`Migrating ${messages.length} messages...`);
    for (const msg of messages) {
      await Message.findOneAndUpdate({ id: msg.id }, msg, { upsert: true });
    }

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    sqliteDb.close();
    await mongoose.disconnect();
  }
}

migrate();
