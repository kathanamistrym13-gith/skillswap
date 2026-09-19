# 🚀 Deploying SkillXchange (Fullstack) to Vercel

This guide walks you through deploying both the **Frontend** and **Backend Express API** to **Vercel**.

---

## 📋 Prerequisites

1. A free [Vercel Account](https://vercel.com).
2. A free [MongoDB Atlas Account](https://www.mongodb.com/cloud/atlas) for the database.
3. A [Google Gemini API Key](https://aistudio.google.com/) for AI Superchargers & Roadmaps.

---

## 🗄️ Step 1: Set Up MongoDB Atlas (Cloud Database)

Since Vercel runs serverless functions in the cloud, you need a cloud-hosted MongoDB database:

1. Log into [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and click **Create a Deployment** (choose the free **M0 Shared Cluster**).
2. Create a Database User with a username and password (e.g. `skillswap_admin`).
3. Under **Network Access**, add IP `0.0.0.0/0` (Allow access from anywhere, required for Vercel Serverless Functions).
4. Click **Connect** -> **Drivers** -> Copy your connection string:
   ```env
   mongodb+srv://<username>:<password>@cluster0.xxxxxx.mongodb.net/skillswap?retryWrites=true&w=majority
   ```

---

## ⚡ Step 2: Deploy to Vercel

### Option A: Deploy via GitHub (Recommended)

1. Push your repository to GitHub.
2. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New...** -> **Project**.
3. Import your **skillswap** repository.
4. Keep the Framework Preset as **Vite** (Vercel will detect `vercel.json`).
5. Open the **Environment Variables** section and add:

| Key | Value | Description |
| :--- | :--- | :--- |
| `MONGODB_URI` | `mongodb+srv://<user>:<password>@cluster0.../skillswap` | Your MongoDB Atlas connection string |
| `GEMINI_API_KEY` | `your_gemini_api_key` | Your Google Gemini API Key |
| `VITE_SOCKET_URL` | `https://your-skillswap-server.onrender.com` | *(Optional)* Only needed for live video calls & real-time chat |

6. Click **Deploy**! 🚀

---

### Option B: Deploy via Vercel CLI

```bash
# 1. Install Vercel CLI globally (if not installed)
npm i -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy
vercel

# 4. Set Environment Variables
vercel env add MONGODB_URI
vercel env add GEMINI_API_KEY

# 5. (Optional) Set Socket URL for video calls
vercel env add VITE_SOCKET_URL

# 6. Deploy to Production
vercel --prod
```

---

## ⚙️ How the Architecture Works on Vercel

- **Frontend (Vite / React)**: Built into static assets served via Vercel Edge CDN.
- **Backend API (`/api/*`)**: Handled by `api/index.js` running as a Serverless Function with a 30s timeout (for AI calls) and Mongoose connection pooling.
- **Routing**: `vercel.json` routes `/api/(.*)` to the serverless backend and all other routes to the React SPA (`index.html`).

---

## 📡 Video Calls & Real-Time Chat on Vercel

> [!IMPORTANT]
> Vercel Serverless Functions are **stateless and ephemeral** — they cannot maintain persistent WebSocket connections needed for WebRTC video call signaling and real-time chat.

**What works on Vercel without extra setup:**
- ✅ All REST APIs (auth, skills, swap requests, profiles)
- ✅ All AI features (Simulator, Roadmaps, Career Copilot, Notetaker)
- ✅ REST API message fallback (messages are saved to MongoDB)

**What requires a dedicated socket server (`VITE_SOCKET_URL`):**
- 📹 Video calling (WebRTC signaling via Socket.IO)
- 💬 Real-time instant messaging (typing indicators, live push)
- 🔔 Real-time notifications

### Setting Up a Free Socket Server on Render

1. Go to [render.com](https://render.com) and create a free account.
2. Click **New Web Service** → connect your GitHub repo.
3. Set:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
4. Add Environment Variables on Render:
   - `MONGODB_URI` = your MongoDB Atlas URI
   - `GEMINI_API_KEY` = your Gemini key
   - `PORT` = `3001`
5. Deploy. Copy the URL (e.g. `https://skillswap-server.onrender.com`).
6. In your **Vercel** project settings → **Environment Variables**, add:
   ```
   VITE_SOCKET_URL = https://skillswap-server.onrender.com
   ```
7. **Redeploy** on Vercel for the variable to take effect.

> [!TIP]
> Render's free tier may spin down after inactivity. Use [UptimeRobot](https://uptimerobot.com) (free) to ping your Render URL every 5 minutes to keep it awake.
