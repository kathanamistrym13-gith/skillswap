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

6. Click **Deploy**! 🚀

---

### Option B: Deploy via Vercel CLI

If you have the Vercel CLI installed:

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

# 5. Deploy to Production
vercel --prod
```

---

## ⚙️ How the Architecture Works on Vercel

- **Frontend (Vite / React)**: Built into static assets served via Vercel Edge CDN at lightning speeds.
- **Backend API (`/api/*`)**: Handled by [api/index.js](file:///c:/Users/Kathan%20Mistry/Downloads/skillswap/api/index.js) running as high-performance Serverless Functions with Mongoose connection pooling.
- **Routing**: [vercel.json](file:///c:/Users/Kathan%20Mistry/Downloads/skillswap/vercel.json) routes `/api/(.*)` to the serverless backend function and all other routes `/(.*)` to the React single page app (`index.html`).

---

## 📡 WebSockets & Video Calls Note

- **REST APIs & AI Features**: All authentication, skills, swap requests, AI simulator, AI roadmap generator, career copilot, and session notetaker run smoothly on Vercel.
- **Persistent WebSockets / Video Signaling**: Vercel serverless functions are ephemeral (stateless). For real-time WebRTC video calling and instant WebSocket push notifications across different devices in production:
  - You can optionally deploy the `server/index.js` Node server to [Render](https://render.com) or [Railway](https://railway.app) (both offer free tiers).
  - Then in Vercel's Environment Variables, set:
    ```env
    VITE_SOCKET_URL=https://your-server-name.onrender.com
    ```
