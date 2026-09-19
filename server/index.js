const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const http = require('http');
const { Server } = require('socket.io');
const express = require('express');
const app = require('./app');
const connectDB = require('./db');
const Message = require('./models/Message');

const server = http.createServer(app);

// Connect to database
connectDB().catch(err => console.error('MongoDB initial connection error:', err));

// --- SERVE FRONTEND WHEN RUNNING LOCALLY/STANDALONE ---
app.use(express.static(path.join(__dirname, '..', 'dist')));

// --- SOCKET.IO SETUP ---
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});
const connectedUsers = new Map(); // userId -> socketId

// Attach to app instance
app.set('io', io);
app.set('connectedUsers', connectedUsers);

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// --- SOCKET.IO HANDLERS ---
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('register', (userId) => {
    if (userId) {
      connectedUsers.set(String(userId), socket.id);
      socket.userId = String(userId);
    }
  });

  socket.on('send_message', async (data) => {
    const { senderId, receiverId, text } = data;
    const msgId = generateId();
    const timestamp = Date.now();

    const newMessage = new Message({
      id: msgId,
      sender_id: senderId,
      receiver_id: receiverId,
      text,
      timestamp
    });

    try {
      await newMessage.save();
      const messagePayload = { id: msgId, senderId, receiverId, text, timestamp };
      const receiverSocketId = connectedUsers.get(String(receiverId));
      if (receiverSocketId) io.to(receiverSocketId).emit('receive_message', messagePayload);
      socket.emit('message_sent', messagePayload);
    } catch (err) {
      console.error('Error saving message:', err);
    }
  });

  socket.on('call_user', (data) => {
    const targetId = String(data.userToCall);
    const receiverSocketId = connectedUsers.get(targetId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('incoming_call', {
        signal: data.signalData,
        from: String(data.from),
        name: data.name || 'SkillSwap Partner',
        callId: data.callId
      });
    } else {
      socket.emit('call_failed', { reason: 'User is offline or unreachable' });
    }
  });

  socket.on('answer_call', (data) => {
    const callerSocketId = connectedUsers.get(String(data.to));
    if (callerSocketId) {
      io.to(callerSocketId).emit('call_accepted', data.signal);
    }
  });

  socket.on('end_call', (data) => {
    const otherSocketId = connectedUsers.get(String(data.to));
    if (otherSocketId) io.to(otherSocketId).emit('call_ended');
  });

  socket.on('shared_notes_update', (data) => {
    const otherSocketId = connectedUsers.get(data.to);
    if (otherSocketId) io.to(otherSocketId).emit('shared_notes_update', data);
  });

  socket.on('whiteboard_draw', (data) => {
    const otherSocketId = connectedUsers.get(data.to);
    if (otherSocketId) io.to(otherSocketId).emit('whiteboard_draw', data);
  });

  socket.on('whiteboard_clear', (data) => {
    const otherSocketId = connectedUsers.get(data.to);
    if (otherSocketId) io.to(otherSocketId).emit('whiteboard_clear', data);
  });

  socket.on('typing', (data) => {
    const receiverSocketId = connectedUsers.get(data.receiverId);
    if (receiverSocketId) io.to(receiverSocketId).emit('typing', { senderId: data.senderId });
  });

  socket.on('stop_typing', (data) => {
    const receiverSocketId = connectedUsers.get(data.receiverId);
    if (receiverSocketId) io.to(receiverSocketId).emit('stop_typing', { senderId: data.senderId });
  });

  socket.on('disconnect', () => {
    for (const [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) connectedUsers.delete(userId);
    }
  });
});

// --- SPA FALLBACK ROUTE ---
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

// --- START SERVER ---
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`SkillXchange server running on http://localhost:${PORT}`);
});

module.exports = server;
