const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const connectDB = require('./db');
const User = require('./models/User');
const Skill = require('./models/Skill');
const Message = require('./models/Message');
const SwapRequest = require('./models/SwapRequest');
const SessionNote = require('./models/SessionNote');
const { rankUserMatches } = require('./aiMatcher');
const { simulatePracticePartner, analyzeCareerSkillGap, generateSessionSummary } = require('./aiSuperchargers');

const app = express();

// --- DB CONNECTION MIDDLEWARE ---
app.use(async (req, res, next) => {
  // Only gate API routes that need the DB
  if (!req.path.startsWith('/api/') || req.path === '/api/health') {
    return next();
  }
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Database connection error:', err.message);
    return res.status(503).json({
      error: 'Database unavailable. Please check MONGODB_URI environment variable. Error: ' + err.message
    });
  }
});

// --- MIDDLEWARE ---
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

// Log requests
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production' || req.method !== 'GET') {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  }
  next();
});

// Helper functions and constants
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);
const USER_SELECT_FIELDS = 'id name email phone avatar bio rating swapsCompleted location linkedin github twitter website joinedAt credits xp level streak hoursTaught hoursLearned timezone availability communicationStyle followers following';

// Getter for io instance attached at runtime
app.getIO = function() {
  return app.get('io') || null;
};

// --- HEALTH CHECK ---
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// --- FOLLOW / UNFOLLOW ---
app.post('/api/users/:targetId/follow', async (req, res) => {
  const { targetId } = req.params;
  const { currentUserId } = req.body;

  if (!currentUserId || currentUserId === targetId) {
    return res.status(400).json({ error: 'Invalid user or cannot follow yourself' });
  }

  try {
    const targetUser = await User.findOne({ id: targetId });
    const currentUser = await User.findOne({ id: currentUserId });

    if (!targetUser || !currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isFollowing = currentUser.following?.includes(targetId);

    if (isFollowing) {
      currentUser.following = currentUser.following.filter(id => id !== targetId);
      targetUser.followers = targetUser.followers.filter(id => id !== currentUserId);
    } else {
      if (!currentUser.following) currentUser.following = [];
      if (!targetUser.followers) targetUser.followers = [];
      currentUser.following.push(targetId);
      targetUser.followers.push(currentUserId);
    }

    await currentUser.save();
    await targetUser.save();

    const updatedCurrent = await User.findOne({ id: currentUserId }).select(USER_SELECT_FIELDS);
    const updatedTarget = await User.findOne({ id: targetId }).select(USER_SELECT_FIELDS);

    const io = app.getIO();
    const connectedUsers = app.get('connectedUsers');
    if (io && connectedUsers) {
      const targetSocketId = connectedUsers.get(targetId);
      if (targetSocketId && !isFollowing) {
        io.to(targetSocketId).emit('new_follower', { follower: updatedCurrent });
      }
    }

    res.json({
      isFollowing: !isFollowing,
      currentUser: updatedCurrent,
      targetUser: updatedTarget
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- AUTH API ---
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email, password }).select(USER_SELECT_FIELDS);
    if (user) return res.json(user);
    res.status(401).json({ error: 'Invalid email or password' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body;
  const id = generateId();
  try {
    const newUser = new User({ id, name, email, password });
    await newUser.save();
    const createdUser = await User.findOne({ id }).select(USER_SELECT_FIELDS);
    res.json(createdUser);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    res.status(500).json({ error: err.message });
  }
});

// --- USERS API ---
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().select(USER_SELECT_FIELDS);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  const { name, email, phone, avatar, bio, location, linkedin, github, twitter, website, timezone, availability, communicationStyle } = req.body;

  try {
    const user = await User.findOne({ id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (avatar !== undefined) user.avatar = avatar;
    if (bio !== undefined) user.bio = bio;
    if (location !== undefined) user.location = location;
    if (linkedin !== undefined) user.linkedin = linkedin;
    if (github !== undefined) user.github = github;
    if (twitter !== undefined) user.twitter = twitter;
    if (website !== undefined) user.website = website;
    if (timezone !== undefined) user.timezone = timezone;
    if (availability !== undefined) user.availability = availability;
    if (communicationStyle !== undefined) user.communicationStyle = communicationStyle;

    await user.save();
    const updatedUser = await User.findOne({ id }).select(USER_SELECT_FIELDS);
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Real-time XP endpoint
app.post('/api/users/:id/add-xp', async (req, res) => {
  const { id } = req.params;
  const { xpAmount, reason } = req.body;
  const amount = parseInt(xpAmount) || 0;

  try {
    const user = await User.findOne({ id });
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.xp = (user.xp || 0) + amount;
    user.level = Math.floor(user.xp / 100) + 1;
    await user.save();

    const updatedUser = await User.findOne({ id }).select(USER_SELECT_FIELDS);

    const io = app.getIO();
    const connectedUsers = app.get('connectedUsers');
    if (io && connectedUsers) {
      const targetSocketId = connectedUsers.get(id);
      if (targetSocketId) {
        io.to(targetSocketId).emit('xp_updated', {
          user: updatedUser,
          gained: amount,
          reason: reason || 'Activity bonus'
        });
      }
    }

    res.json({ success: true, user: updatedUser, gained: amount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SKILLS API ---
app.get('/api/skills/:userId', async (req, res) => {
  try {
    const skills = await Skill.find({ user_id: req.params.userId }).lean();
    const mapped = skills.map(s => ({ 
      ...s, 
      type: s.type || 'offer',
      verified: Boolean(s.verified)
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/skills', async (req, res) => {
  try {
    const rows = await Skill.find().lean();
    const skillsMap = {};
    rows.forEach(skill => {
      const s = { 
        ...skill, 
        type: skill.type || 'offer',
        verified: Boolean(skill.verified)
      };
      if (!skillsMap[s.user_id]) skillsMap[s.user_id] = [];
      skillsMap[s.user_id].push(s);
    });
    res.json(skillsMap);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/skills', async (req, res) => {
  const { userId, name, level, type } = req.body;
  const id = generateId();
  try {
    const newSkill = new Skill({ id, user_id: userId, name, level, type: type || 'offer', verified: false });
    await newSkill.save();
    res.json({ id, userId, name, level, type: type || 'offer', verified: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/skills/:id/verify', async (req, res) => {
  try {
    const { id } = req.params;
    let skill = await Skill.findOne({ id });
    if (!skill) {
      skill = await Skill.findOne({ name: id });
    }
    if (!skill) {
      return res.status(404).json({ error: 'Skill not found' });
    }

    skill.verified = true;
    await skill.save();

    res.json({ success: true, skill: { ...skill.toObject(), verified: true } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/skills/:id', async (req, res) => {
  try {
    const result = await Skill.deleteOne({ id: req.params.id });
    res.json({ success: true, changes: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- MESSAGES API ---
app.get('/api/messages/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    const rows = await Message.find({
      $or: [{ sender_id: userId }, { receiver_id: userId }]
    }).sort({ timestamp: 1 });
    
    const formattedRows = rows.map(r => ({
      id: r.id,
      senderId: r.sender_id,
      receiverId: r.receiver_id,
      text: r.text,
      timestamp: r.timestamp
    }));
    res.json(formattedRows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/messages', async (req, res) => {
  const { senderId, receiverId, text } = req.body;
  if (!senderId || !receiverId || !text) {
    return res.status(400).json({ error: 'Missing required message parameters' });
  }

  const msgId = generateId();
  const timestamp = Date.now();

  try {
    const newMessage = new Message({
      id: msgId,
      sender_id: senderId,
      receiver_id: receiverId,
      text,
      timestamp
    });

    await newMessage.save();
    const messagePayload = { id: msgId, senderId, receiverId, text, timestamp };

    const io = app.getIO();
    const connectedUsers = app.get('connectedUsers');
    if (io && connectedUsers) {
      const receiverSocketId = connectedUsers.get(receiverId);
      if (receiverSocketId) io.to(receiverSocketId).emit('receive_message', messagePayload);
    }

    res.json(messagePayload);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- SWAP REQUESTS API ---
app.get('/api/swap-requests/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const requests = await SwapRequest.find({
      $or: [{ requesterId: userId }, { recipientId: userId }]
    }).sort({ createdAt: -1 });

    const userIds = new Set();
    requests.forEach(r => {
      userIds.add(r.requesterId);
      userIds.add(r.recipientId);
    });
    const users = await User.find({ id: { $in: Array.from(userIds) } }).select('id name email rating');
    const userMap = {};
    users.forEach(u => userMap[u.id] = u);

    const formattedRequests = requests.map(r => ({
      id: r.id,
      requesterId: r.requesterId,
      requesterName: userMap[r.requesterId]?.name || 'User',
      recipientId: r.recipientId,
      recipientName: userMap[r.recipientId]?.name || 'User',
      offeredSkill: r.offeredSkill,
      wantedSkill: r.wantedSkill,
      status: r.status,
      message: r.message,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }));

    res.json(formattedRequests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/swap-requests', async (req, res) => {
  const { requesterId, recipientId, offeredSkill, wantedSkill, message, swapType } = req.body;
  if (!requesterId || !recipientId || !offeredSkill || !wantedSkill) {
    return res.status(400).json({ error: 'Missing required request fields' });
  }

  try {
    const existing = await SwapRequest.findOne({
      requesterId,
      recipientId,
      offeredSkill,
      wantedSkill,
      status: 'pending'
    });

    if (existing) {
      return res.status(400).json({ error: 'A pending swap request already exists for these skills.' });
    }

    const id = generateId();
    const newRequest = new SwapRequest({
      id,
      requesterId,
      recipientId,
      offeredSkill,
      wantedSkill,
      message: message || `Hey! I'd love to swap my ${offeredSkill} skill for your ${wantedSkill} expertise. Let's learn together!`,
      swapType: swapType || 'Standard'
    });

    await newRequest.save();

    const msgId = generateId();
    const introMsg = new Message({
      id: msgId,
      sender_id: requesterId,
      receiver_id: recipientId,
      text: `🔄 Swap Request: I offer [${offeredSkill}] in exchange for [${wantedSkill}]. ${message || ''}`,
      timestamp: Date.now()
    });
    await introMsg.save();

    const io = app.getIO();
    const connectedUsers = app.get('connectedUsers');
    if (io && connectedUsers) {
      const recipientSocketId = connectedUsers.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('swap_request_received', newRequest);
        io.to(recipientSocketId).emit('receive_message', {
          id: msgId,
          senderId: requesterId,
          receiverId: recipientId,
          text: introMsg.text,
          timestamp: introMsg.timestamp
        });
      }
    }

    res.json(newRequest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/swap-requests/:requestId/status', async (req, res) => {
  const { requestId } = req.params;
  const { status } = req.body;

  if (!['accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    const swapReq = await SwapRequest.findOne({ id: requestId });
    if (!swapReq) {
      return res.status(404).json({ error: 'Swap request not found' });
    }

    swapReq.status = status;
    swapReq.updatedAt = Date.now();
    await swapReq.save();

    if (status === 'accepted') {
      await User.updateOne({ id: swapReq.requesterId }, { $inc: { swapsCompleted: 1 } });
      await User.updateOne({ id: swapReq.recipientId }, { $inc: { swapsCompleted: 1 } });
    }

    const io = app.getIO();
    const connectedUsers = app.get('connectedUsers');
    if (io && connectedUsers) {
      const requesterSocketId = connectedUsers.get(swapReq.requesterId);
      if (requesterSocketId) {
        io.to(requesterSocketId).emit('swap_request_status_updated', swapReq);
      }
      const recipientSocketId = connectedUsers.get(swapReq.recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit('swap_request_status_updated', swapReq);
      }
    }

    res.json(swapReq);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- AI MATCHING API ---
app.get('/api/ai-matches/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const users = await User.find().select(USER_SELECT_FIELDS);
    const skillsRows = await Skill.find();
    
    const skillsMap = {};
    skillsRows.forEach(skill => {
      if (!skillsMap[skill.user_id]) skillsMap[skill.user_id] = [];
      skillsMap[skill.user_id].push(skill);
    });

    const targetUser = users.find(u => u.id === userId) || { id: userId };
    const rankedMatches = rankUserMatches(targetUser, users, skillsMap);
    res.json(rankedMatches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- AI ROADMAP API ---
app.post('/api/ai/roadmap', async (req, res) => {
  const { skill, level } = req.body;
  if (!skill || !skill.trim()) return res.status(400).json({ error: 'Skill is required' });

  const s = skill.trim();
  const now = Date.now();
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const isValidGeminiKey = GEMINI_KEY && GEMINI_KEY !== 'YOUR_GEMINI_API_KEY_HERE' && GEMINI_KEY.length > 10;

  if (isValidGeminiKey) {
    const weeksCount = level === 'Beginner' ? 4 : level === 'Intermediate' ? 6 : 8;
    const prompt = [
      `You are a world-class learning coach. Create a structured ${weeksCount}-week learning roadmap for someone who wants to learn: "${s}" at the "${level}" level.`,
      ``,
      `IMPORTANT: The roadmap MUST be specifically about "${s}". Do NOT give a generic roadmap.`,
      ``,
      `Respond with ONLY a JSON object. No introduction, no explanation, no markdown code fences.`,
      `Use this exact structure:`,
      `{`,
      `  "title": "Descriptive title mentioning ${s}",`,
      `  "weeks": [`,
      `    { "week": 1, "title": "Week theme", "tasks": ["Specific task 1", "Specific task 2", "Specific task 3", "Specific task 4"] }`,
      `  ]`,
      `}`,
      ``,
      `Requirements:`,
      `- Exactly ${weeksCount} week objects in the array`,
      `- Exactly 4 tasks per week — concrete, actionable, measurable`,
      `- All content must be specific to learning "${s}" — not generic`,
      `- Level: ${level} (adjust depth accordingly)`,
      `- JSON only — no extra text before or after`
    ].join('\n');

    try {
      const https = require('https');
      const postData = JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 3000 }
      });

      const responseText = await new Promise((resolve, reject) => {
        const reqOpts = {
          hostname: 'generativelanguage.googleapis.com',
          path: `/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(GEMINI_KEY)}`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': GEMINI_KEY,
            'Content-Length': Buffer.byteLength(postData)
          }
        };

        const req = https.request(reqOpts, (res) => {
          let body = '';
          res.on('data', (chunk) => body += chunk);
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(body);
            } else {
              reject(new Error(`API Error Status ${res.statusCode}: ${body}`));
            }
          });
        });

        req.on('error', (e) => reject(e));
        req.write(postData);
        req.end();
      });

      const data = JSON.parse(responseText);
      const rawText = (data?.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();

      let parsed = null;
      try { parsed = JSON.parse(rawText); } catch (_) {}

      if (!parsed) {
        try {
          const stripped = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
          parsed = JSON.parse(stripped);
        } catch (_) {}
      }

      if (!parsed) {
        try {
          const match = rawText.match(/\{[\s\S]*\}/);
          if (match) parsed = JSON.parse(match[0]);
        } catch (_) {}
      }

      if (parsed && Array.isArray(parsed.weeks) && parsed.weeks.length > 0) {
        let tid = 1;
        const weeks = parsed.weeks.map((w, i) => ({
          week: i + 1,
          title: w.title || `Week ${i + 1}`,
          tasks: (w.tasks || []).map(text => ({ id: tid++, text: String(text), done: false }))
        }));
        const totalTasks = weeks.reduce((a, w) => a + w.tasks.length, 0);
        return res.json({
          id: `roadmap_${now}`, skill: s, level,
          title: parsed.title || `${s} Learning Path — ${level}`,
          estimatedCompletion: `${weeks.length} Weeks`,
          totalTasks, createdAt: new Date().toISOString(), aiGenerated: true, weeks
        });
      }
    } catch (apiErr) {
      console.error(`[Gemini API Error] for "${s}": ${apiErr.message}`);
    }
  }

  return buildFallback(s, level, now, res);
});

function buildFallback(skill, level, now, res) {
  const s = skill;
  const sl = s.toLowerCase();

  const ROADMAPS = {
    react: {
      weeks: [
        { title: 'JSX & Component Basics', tasks: ['Understand JSX syntax & how it compiles', 'Create functional components & export them', 'Pass data with props and PropTypes', 'Render dynamic lists with .map() & keys'] },
        { title: 'State & Hooks', tasks: ['Manage UI state with useState', 'Run side-effects with useEffect', 'Implement conditional rendering', 'Build controlled form inputs'] },
        { title: 'Routing & Data Fetching', tasks: ['Setup React Router v6 with BrowserRouter', 'Create dynamic routes with useParams', 'Fetch data from a REST API with useEffect', 'Handle loading and error states'] },
        { title: 'Advanced Patterns & Capstone', tasks: ['Share state globally with Context API', 'Extract logic into custom hooks', 'Optimise renders with useMemo & useCallback', 'Build & deploy a full React app to Vercel'] }
      ]
    },
    python: {
      weeks: [
        { title: 'Python Fundamentals', tasks: ['Variables, data types & operators', 'Control flow: if/else and loops', 'Define functions with arguments & return values', 'Work with lists, dicts, sets & tuples'] },
        { title: 'Object-Oriented Python', tasks: ['Create classes with __init__ & methods', 'Use inheritance & method overriding', 'Handle exceptions with try/except/finally', 'Organise code with modules & packages'] },
        { title: 'Libraries & Data', tasks: ['Manipulate tabular data with Pandas', 'Visualise data with Matplotlib & Seaborn', 'Make HTTP calls with the requests library', 'Read & write JSON, CSV and text files'] },
        { title: 'Capstone Project', tasks: ['Choose a project idea (CLI tool, API, scraper)', 'Build and test core features', 'Write unit tests with pytest', 'Publish to GitHub with a README'] }
      ]
    },
    javascript: {
      weeks: [
        { title: 'Core JS Concepts', tasks: ['Understand var/let/const & scoping rules', 'Write functions, arrow functions & closures', 'Select & manipulate DOM elements', 'Listen to and handle DOM events'] },
        { title: 'Async JavaScript & APIs', tasks: ['Use Promises and then/catch chains', 'Refactor to async/await syntax', 'Fetch data from public REST APIs', 'Handle JSON parsing & errors gracefully'] },
        { title: 'Modern ES6+ JavaScript', tasks: ['Destructure objects & arrays', 'Use spread/rest operators effectively', 'Master .map(), .filter() & .reduce()', 'Import & export with ES Modules'] },
        { title: 'Project & Tooling', tasks: ['Set up a project with Vite', 'Build a JavaScript-powered interactive UI', 'Write tests with Vitest or Jest', 'Deploy to GitHub Pages or Vercel'] }
      ]
    },
    'machine learning': {
      weeks: [
        { title: 'ML Foundations', tasks: ['Distinguish supervised vs. unsupervised learning', 'Implement linear regression with Scikit-learn', 'Split data into train/test & evaluate accuracy', 'Understand bias-variance tradeoff'] },
        { title: 'Core Algorithms', tasks: ['Train a Decision Tree & Random Forest', 'Understand KNN & Naive Bayes classifiers', 'Apply cross-validation & GridSearchCV', 'Evaluate with precision, recall & F1'] },
        { title: 'Neural Networks & Deep Learning', tasks: ['Build a multi-layer perceptron with Keras', 'Train a CNN on an image dataset', 'Prevent overfitting with dropout & regularisation', 'Use pretrained models via transfer learning'] },
        { title: 'End-to-End ML Project', tasks: ['Explore & clean a real Kaggle dataset', 'Engineer features & perform EDA', 'Compare 3+ models & tune hyperparameters', 'Deploy model as a REST API with FastAPI'] }
      ]
    },
    figma: {
      weeks: [
        { title: 'Figma Fundamentals', tasks: ['Navigate the Figma workspace & shortcuts', 'Create frames, shapes & vector paths', 'Apply typography, colour & fill styles', 'Group, name & organise layers'] },
        { title: 'Components & Auto Layout', tasks: ['Build reusable components & instances', 'Create component variants & properties', 'Use Auto Layout for responsive designs', 'Publish a shared component library'] },
        { title: 'Prototyping & Interactions', tasks: ['Connect frames with prototype flows', 'Add Smart Animate transitions', 'Build overlay modals & navigation', 'Share prototype link & gather feedback'] },
        { title: 'Real-World Case Study', tasks: ['Redesign an existing mobile app UI', 'Create a complete design system', 'Prepare developer handoff with annotations', 'Present the case study in your portfolio'] }
      ]
    },
    default: {
      weeks: [
        { title: `Foundations of ${s}`, tasks: [`Research what ${s} is and real-world applications`, `Set up your ${s} learning environment`, 'Study the core terminology and key concepts', 'Complete a beginner tutorial or course module'] },
        { title: 'Core Skill Building', tasks: [`Practice the fundamental ${s} techniques`, 'Follow step-by-step guided exercises', 'Study examples from professional practitioners', 'Join a relevant online community or forum'] },
        { title: 'Intermediate Application', tasks: [`Build your first practical ${s} project`, 'Review, refactor & improve your work', 'Dive into intermediate documentation or books', 'Get feedback from peers or mentors'] },
        { title: `Capstone: ${s} Mastery`, tasks: [`Build a comprehensive ${s} showcase project`, 'Document your process and lessons learned', 'Publish on GitHub or your personal portfolio', 'Share with the SkillXchange community'] }
      ]
    }
  };

  const ALIASES = {
    'react.js': 'react', 'reactjs': 'react',
    'ml': 'machine learning', 'ai': 'machine learning', 'deep learning': 'machine learning', 'nlp': 'machine learning',
    'js': 'javascript', 'node': 'javascript', 'nodejs': 'javascript', 'node.js': 'javascript',
    'ui': 'figma', 'ux': 'figma', 'ui/ux': 'figma', 'design': 'figma',
    'py': 'python', 'django': 'python', 'flask': 'python'
  };

  const key = ALIASES[sl] || (ROADMAPS[sl] ? sl : 'default');
  const template = ROADMAPS[key];

  const weeksPerLevel = { Beginner: 4, Intermediate: 4, Advanced: 4 };
  const numWeeks = Math.min(template.weeks.length, weeksPerLevel[level] || 4);

  let taskId = 1;
  const weeks = template.weeks.slice(0, numWeeks).map((w, i) => ({
    week: i + 1,
    title: w.title,
    tasks: w.tasks.map(text => ({ id: taskId++, text, done: false }))
  }));

  const totalTasks = weeks.reduce((sum, w) => sum + w.tasks.length, 0);

  return res.json({
    id: `roadmap_${now}`,
    skill: s,
    level,
    title: `${s} Learning Path — ${level}`,
    estimatedCompletion: `${numWeeks} Weeks`,
    totalTasks,
    createdAt: new Date().toISOString(),
    aiGenerated: false,
    weeks
  });
}

app.post('/api/ai/chat', async (req, res) => {
  const { message, context } = req.body;
  let reply = `I am your AI Mentor. You said: "${message}". How else can I assist your learning journey?`;
  
  if (message.toLowerCase().includes('quiz')) {
    reply = `Sure! Here is a quick quiz:\n\n1. What is the primary use case of ${context || 'this skill'}?\nA) Data storage\nB) UI Rendering\nC) Logic processing\n\nReply with your answer!`;
  } else if (message.toLowerCase().includes('explain')) {
    reply = `Let me explain ${context || 'that concept'}. It's essentially a way to structure your problem so that it can be solved efficiently using standard patterns. Think of it like a blueprint.`;
  }

  setTimeout(() => res.json({ reply }), 1000);
});

app.post('/api/ai/goals', async (req, res) => {
  const { goal } = req.body;
  const milestones = [
    { id: 1, title: 'Research & Planning', status: 'pending' },
    { id: 2, title: 'Acquire necessary tools/skills', status: 'pending' },
    { id: 3, title: 'First implementation draft', status: 'pending' },
    { id: 4, title: 'Review & Refine', status: 'pending' },
    { id: 5, title: 'Finalize goal achievement', status: 'pending' }
  ];
  setTimeout(() => res.json({ goal, milestones, motivation: "You can do this! Stay consistent." }), 1200);
});

// --- AI SUPERCHARGERS API ---
app.post('/api/ai/simulator/chat', async (req, res) => {
  try {
    const { mode, scenario, history, userMessage, targetLanguage, targetRole, level } = req.body;
    const response = await simulatePracticePartner({
      mode,
      scenario,
      history,
      userMessage,
      targetLanguage,
      targetRole,
      level
    });
    res.json(response);
  } catch (err) {
    console.error('Simulator API Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/career-copilot/analyze', async (req, res) => {
  try {
    const { targetJobTitle, jobDescription, userId } = req.body;
    
    const [allUsers, allSkillsDocs, userSkillsDocs] = await Promise.all([
      User.find().select(USER_SELECT_FIELDS).lean(),
      Skill.find().lean(),
      userId ? Skill.find({ $or: [{ user_id: userId }, { userId }] }).lean() : Promise.resolve([])
    ]);

    const skillsByUserId = {};
    allSkillsDocs.forEach(s => {
      const uid = s.user_id || s.userId;
      if (uid) {
        if (!skillsByUserId[uid]) skillsByUserId[uid] = [];
        skillsByUserId[uid].push(s);
      }
    });

    const analysis = await analyzeCareerSkillGap({
      targetJobTitle: targetJobTitle || 'Software Engineer',
      jobDescription: jobDescription || '',
      userSkills: userSkillsDocs || [],
      allUsers: allUsers || [],
      allSkills: skillsByUserId
    });

    res.json(analysis);
  } catch (err) {
    console.error('Career Copilot API Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ai/session-notetaker/generate', async (req, res) => {
  try {
    const { sessionContext, notes, transcript, skillTopic, partnerName } = req.body;
    const summary = await generateSessionSummary({
      sessionContext,
      notes,
      transcript,
      skillTopic,
      partnerName
    });
    res.json(summary);
  } catch (err) {
    console.error('Session Notetaker API Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/session-notes/:userId', async (req, res) => {
  try {
    const notes = await SessionNote.find({
      $or: [{ userId: req.params.userId }, { partnerId: req.params.userId }]
    }).sort({ createdAt: -1 });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/session-notes', async (req, res) => {
  try {
    const noteData = req.body;
    const id = noteData.id || generateId();
    const newNote = new SessionNote({
      ...noteData,
      id
    });
    await newNote.save();
    res.json(newNote);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/session-notes/:id/action-item', async (req, res) => {
  try {
    const { itemId, completed } = req.body;
    const note = await SessionNote.findOne({ id: req.params.id });
    if (!note) return res.status(404).json({ error: 'Session note not found' });

    note.actionItems = note.actionItems.map(item => {
      if (item.id === itemId || String(item._id) === String(itemId)) {
        item.completed = completed;
      }
      return item;
    });

    await note.save();
    res.json(note);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- ADMIN API ---
app.get('/api/admin/data', async (req, res) => {
  try {
    const users = await User.find().select('id name email bio rating swapsCompleted location joinedAt');
    const skills = await Skill.find();
    const messages = await Message.find().sort({ timestamp: -1 });
    res.json({ users, skills, messages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = app;
