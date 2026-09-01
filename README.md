# 🔄 SkillSwap — Peer-to-Peer Skill Exchange Platform

> **Trade your knowledge. Grow together.**

SkillSwap is a modern, AI-powered platform where users exchange skills directly with each other — no money, just knowledge. Teach what you know, learn what you want.

---

## ✨ Features

| Feature | Description |
|:--|:--|
| 🔐 **Auth System** | Secure signup/login with JWT sessions |
| 🔍 **Smart Explore** | Browse & filter users by skills, category, proficiency |
| 🤝 **AI Matchmaking** | Bidirectional compatibility scoring to find ideal swap partners |
| 💬 **Real-Time Chat** | Socket.io powered instant messaging |
| 📹 **Video Calls** | WebRTC P2P video sessions — no third-party app needed |
| 🤖 **AI Career Copilot** | Personalized career path & skill gap analysis |
| 🧪 **AI Practice Simulator** | Scenario-based challenges and mock assessments |
| 🗺️ **Dynamic Roadmaps** | AI-generated step-by-step learning roadmaps |
| 🏆 **Gamification** | XP, levels, karma points, badges, and leaderboard |
| 🌐 **Community Forums** | Category-based discussions and knowledge sharing |
| 📅 **Meetups** | Schedule and join group learning sessions |
| 📊 **Analytics** | Personal learning stats and platform insights |
| 💼 **Portfolio** | Showcase your skills and completed swaps |

---

## 🛠️ Tech Stack

**Frontend:**
- React 19 + Vite 8
- React Router v7
- Axios + Socket.io Client
- Lucide React Icons

**Backend:**
- Node.js + Express 5
- MongoDB + Mongoose
- Socket.io (WebSockets)
- WebRTC via Simple-Peer

**AI Features:**
- Google Gemini API (Career Copilot, Roadmaps, Simulator)

---

## 🚀 Local Development

```bash
# 1. Clone the repo
git clone https://github.com/kathanamistrym13-gith/kathanamistrym13-gith.git
cd kathanamistrym13-gith

# 2. Install frontend dependencies
npm install

# 3. Install backend dependencies
cd server && npm install && cd ..

# 4. Set up environment variables
cp .env.example server/.env
# Edit server/.env with your MongoDB URI and Gemini API Key

# 5. Run backend
node server/index.js

# 6. Run frontend (in a new terminal)
npm run dev
```

---

## ☁️ Deployment

This project is deployed on **Vercel** with:
- Frontend → Static site via Vite build
- Backend API → Serverless functions via `api/index.js`
- Database → MongoDB Atlas (cloud)

See [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md) for full deployment instructions.

---

## 📁 Project Structure

```
skillswap/
├── api/                  # Vercel serverless backend entry
│   └── index.js
├── server/               # Express backend
│   ├── app.js            # Express app with all routes
│   ├── index.js          # Standalone HTTP + Socket.io server
│   ├── db.js             # MongoDB connection
│   ├── models/           # Mongoose data models
│   └── aiSuperchargers.js # Gemini AI features
├── src/                  # React frontend
│   ├── pages/            # Page components
│   ├── components/       # Reusable UI components
│   ├── context/          # React Context (Auth, Notifications)
│   └── styles/           # Global CSS
├── vercel.json           # Vercel routing config
└── vite.config.js        # Vite build config
```

---

## 👥 Team

Built with ❤️ by a 4-person team for a college project presentation.

---

## 📄 License

MIT License — free to use and modify.
