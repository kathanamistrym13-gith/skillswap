// server/aiSuperchargers.js
// AI Superchargers Engine: Practice Simulator, Career Copilot, Post-Session Notetaker

const https = require('https');
const { getSkillSimilarity } = require('./aiMatcher');

/**
 * Helper to call Google Gemini API with fallback handling
 */
async function callGemini(prompt, temperature = 0.5, maxOutputTokens = 2500) {
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const isValidGeminiKey = GEMINI_KEY && GEMINI_KEY.length > 20 && !GEMINI_KEY.includes('YOUR_GEMINI');

  if (!isValidGeminiKey) {
    throw new Error('No valid Gemini API key configured.');
  }

  const postData = JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature, maxOutputTokens }
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

  // Try extracting JSON
  try {
    return JSON.parse(rawText);
  } catch (_) {}

  try {
    const stripped = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    return JSON.parse(stripped);
  } catch (_) {}

  try {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
  } catch (_) {}

  return { rawText };
}

/**
 * Intelligent Semantic Entity, Conversational Intent & Utterance Analyzer
 */
function analyzeUserUtterance(text, mode = 'interview') {
  if (!text || typeof text !== 'string') text = '';
  const clean = text.trim();
  const lower = clean.toLowerCase();
  const normalized = lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s'?]/g, ' ');
  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  // 1. Detect Greetings, Small Talk & "How are you"
  const isHowAreYou = normalized.includes('how are you') || normalized.includes('how r u') || normalized.includes('how are u') || 
                      normalized.includes("how's it going") || normalized.includes("how is it going") || normalized.includes("what's up") ||
                      normalized.includes("how is your day") || normalized.includes("how are you doing") || normalized.includes("como estas") ||
                      normalized.includes("que tal") || normalized.includes("comment ca va") || normalized.includes("wie gehts");

  const isGreeting = isHowAreYou || normalized.includes('hello') || normalized.includes('hi') || normalized.includes('hey') || 
                     normalized.includes('good morning') || normalized.includes('good afternoon') || normalized.includes('good evening') ||
                     normalized.includes('hola') || normalized.includes('bonjour') || normalized.includes('hallo') || normalized.includes('konnichiwa') ||
                     normalized.includes('namaste') || normalized.includes('ciao');

  // 2. Detect AI Identity / Purpose inquiries
  const isAboutAi = lower.includes('who are you') || lower.includes('what is your name') || lower.includes('what are you') ||
                    lower.includes('tell me about you') || lower.includes('what can you do') || lower.includes('introduce yourself');

  // 3. Detect Gratitude
  const isGratitude = lower.includes('thank you') || lower.includes('thanks') || lower.includes('gracias') || lower.includes('merci') || lower.includes('danke');

  // 4. Detect Sentiment / Readiness
  const isNervous = lower.includes('nervous') || lower.includes('scared') || lower.includes('worried') || lower.includes('anxious');
  const isReady = lower.includes('ready') || lower.includes("let's start") || lower.includes("lets start") || lower.includes("let's do this") || lower.includes("lets do this");

  // 5. Detect Question Intent
  const isAskingQuestion = isHowAreYou || isAboutAi || lower.startsWith('what') || lower.startsWith('how') || lower.startsWith('why') || 
                           lower.startsWith('can you') || lower.startsWith('could you') || lower.startsWith('is there') ||
                           lower.startsWith('explain') || clean.includes('?');

  // 6. Detect Uncertainty
  const isUncertain = lower.includes("don't know") || lower.includes("not sure") || lower.includes("haven't used") ||
                      lower.includes("never worked with") || lower.includes("no experience");

  // 7. Detect Metrics & Numbers
  const metricMatches = clean.match(/(\d+(?:\.\d+)?%|\d+x|\$\d+(?:k|m|b)?|\d+\s*(?:ms|seconds|minutes|users|requests|qps|rps|scale|concurrent|nodes))/gi) || [];
  const hasMetrics = metricMatches.length > 0;

  // 8. Detect Technical Entities
  const techKeywords = [
    'useeffect', 'usememo', 'usecallback', 'usestate', 'usereducer', 'usecontext', 'custom hook', 'hooks',
    'memory leak', 'cleanup', 'react query', 'swr', 'zustand', 'redux', 'recoil', 'context api',
    'react 19', 'react', 'next.js', 'server components', 'rsc', 'ssr', 'ssg', 'csr', 'hydration',
    'vue', 'angular', 'svelte', 'typescript', 'javascript', 'event loop', 'microtask', 'promise', 'async await',
    'debounce', 'throttle', 'virtual dom', 'reconciliation', 'fiber', 'error boundary',
    'node.js', 'express', 'nestjs', 'fastapi', 'django', 'python', 'golang', 'rust', 'java', 'spring',
    'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb', 'cassandra', 'indexing', 'b-tree',
    'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'terraform', 'ci/cd', 'github actions',
    'rest', 'graphql', 'grpc', 'websockets', 'kafka', 'rabbitmq', 'microservices', 'monolith',
    'system design', 'caching', 'sharding', 'replication', 'load balancing', 'cdn', 'rate limiting',
    'jest', 'vitest', 'cypress', 'playwright', 'testing', 'unit test', 'integration test', 'e2e',
    'security', 'jwt', 'oauth', 'cors', 'xss', 'csrf', 'ssl', 'encryption'
  ];

  const detectedTech = techKeywords.filter(tk => lower.includes(tk));

  // 9. Detect Filler words
  const fillerCount = (clean.match(/\b(um|uh|like|basically|actually|kind of|sort of|you know)\b/gi) || []).length;

  return {
    text: clean,
    wordCount,
    isHowAreYou,
    isGreeting,
    isAboutAi,
    isGratitude,
    isNervous,
    isReady,
    isAskingQuestion,
    isUncertain,
    hasMetrics,
    metricMatches,
    detectedTech,
    fillerCount
  };
}

/**
 * Encyclopedic Technical Question & Answer Responder
 * Generates rich, highly elaborated explanations across hundreds of technical topics
 */
function getElaboratedTechnicalExplanation(userText, targetRole) {
  const lower = userText.toLowerCase();

  // useEffect & Memory Leaks & Cleanup
  if (lower.includes('useeffect') || lower.includes('memory leak') || lower.includes('cleanup')) {
    return {
      explanation: `In React, memory leaks inside 'useEffect' occur when asynchronous operations, subscriptions, DOM event listeners, or intervals continue running after a component has unmounted. To prevent this, your effect must return a cleanup function. For network requests, you instantiate an 'AbortController' and call 'controller.abort()' inside the cleanup; for timers, you call 'clearInterval(timerId)'; and for global events, you call 'window.removeEventListener(...)'. In React 18, components in StrictMode mount, unmount, and remount immediately in development to verify that your cleanup functions properly tear down all side effects.`,
      followUp: `Given that architecture, how do you handle race conditions when a user rapidly toggles between two different IDs, causing an earlier slow API request to resolve after a newer one?`,
      replies: [
        "We pass an AbortController signal to fetch so stale requests are canceled immediately.",
        "We use React Query which automatically handles request deduplication and cancellation."
      ]
    };
  }

  // useMemo vs useCallback vs Memoization
  if (lower.includes('usememo') || lower.includes('usecallback') || lower.includes('memoize') || lower.includes('memoization')) {
    return {
      explanation: `'useMemo' and 'useCallback' are React performance optimization hooks designed around referential equality. 'useMemo' caches the *computed return value* of an expensive calculation (such as sorting or filtering a 5,000-item array) and only recomputes it when dependencies change. In contrast, 'useCallback' caches the *function definition itself* so that passing an inline handler to a memoized child component (wrapped in React.memo) does not break referential equality and trigger unnecessary re-renders. However, over-using these hooks adds memory overhead and dependency comparison cost, so you should only reach for them when profiling proves a real render bottleneck.`,
      followUp: `How do you decide between wrapping components with React.memo versus pushing state down closer to leaf nodes to isolate re-renders?`,
      replies: [
        "We prioritize lifting content up or pushing state down before reaching for React.memo.",
        "We use React DevTools Profiler to identify components with high commit durations before optimizing."
      ]
    };
  }

  // State Management: Redux vs Zustand vs React Query vs Context
  if (lower.includes('redux') || lower.includes('zustand') || lower.includes('react query') || lower.includes('context') || lower.includes('state management')) {
    return {
      explanation: `Modern frontend architecture clearly separates *Server State* from *Client UI State*. Server state (asynchronous, cached, shared data from remote APIs) is best managed with libraries like React Query or SWR, which provide automatic background re-fetching, cache deduplication, pagination, and optimistic updates. For purely client-side UI state (like modal toggles, multi-step wizard state, or active filters), lightweight atomic libraries like Zustand or Redux Toolkit offer predictable state machines with selector-based subscriptions, preventing entire component trees from re-rendering on slice changes.`,
      followUp: `When managing complex global state with asynchronous mutations, what is your strategy for implementing optimistic updates with automatic rollback on network failure?`,
      replies: [
        "We snapshot previous cache state in onMutate, update the UI immediately, and rollback in onError.",
        "We use fine-grained Zustand stores combined with AbortController for cancelable requests."
      ]
    };
  }

  // Debounce vs Throttle
  if (lower.includes('debounce') || lower.includes('throttle')) {
    return {
      explanation: `'Debounce' and 'Throttle' are rate-limiting techniques used to control how frequently an event handler executes. Debouncing delays execution until a specified quiet period has elapsed with no new events—making it ideal for search auto-complete inputs or window resize handlers where you only want the final value. Throttling, on the other hand, guarantees that the handler executes at a fixed maximum frequency (e.g., at most once every 200ms), which is essential for infinite scroll listeners, mouse move tracking, and drag-and-drop interactions.`,
      followUp: `In React, how do you implement a custom 'useDebounce' hook that properly cleans up pending setTimeout timers when the input value or component unmounts?`,
      replies: [
        "We store the timeout in a useEffect and return clearTimeout in the cleanup callback.",
        "We leverage useDeferredValue in React 19 to yield rendering priority to user keystrokes."
      ]
    };
  }

  // Next.js & React Server Components (RSC) vs SSR vs CSR
  if (lower.includes('next.js') || lower.includes('server component') || lower.includes('rsc') || lower.includes('ssr') || lower.includes('hydration')) {
    return {
      explanation: `React Server Components (RSC) represent a paradigm shift in full-stack web architecture. Unlike traditional Server-Side Rendering (SSR)—which generates initial HTML on the server but still sends the entire JavaScript bundle to the browser for client-side hydration—RSCs execute exclusively on the server and stream serialized UI primitives without adding a single byte of JavaScript to the client bundle. Server Components can directly access databases, file systems, and internal microservices with zero API boilerplate, while interactive Client Components ('use client') handle browser events, state hooks, and animations.`,
      followUp: `How do you structure the boundaries between Server Components and Client Components to maximize streaming performance and minimize bundle size?`,
      replies: [
        "We push 'use client' directives to leaf nodes and pass Server Components as children props.",
        "We use Suspense boundaries around async Server Components to stream slow data blocks independently."
      ]
    };
  }

  // Event Loop, Microtasks & Macrotasks
  if (lower.includes('event loop') || lower.includes('microtask') || lower.includes('macrotask') || lower.includes('promise') || lower.includes('async')) {
    return {
      explanation: `JavaScript is single-threaded and executes non-blocking asynchronous operations via the Event Loop. When asynchronous tasks complete, they are placed into two main queues: the Microtask queue (which holds Promise callbacks, 'queueMicrotask', and MutationObserver) and the Macrotask/Task queue (which holds 'setTimeout', 'setInterval', and I/O callbacks). The Event Loop continually checks the Call Stack. As soon as the call stack is empty, it processes *all* pending microtasks to completion before picking the next macrotask and allowing browser rendering. This is why Promise resolutions always execute before a 'setTimeout(fn, 0)'.`,
      followUp: `How does unhandled Promise rejection or microtask starvation (e.g. infinite recursive microtasks) affect the browser UI rendering thread?`,
      replies: [
        "Recursive microtasks starve the macrotask queue and block the browser from repainting the frame.",
        "We use requestIdleCallback or chunked web workers to prevent long-running tasks from freezing the UI."
      ]
    };
  }

  // Database Indexing, PostgreSQL & Query Optimization
  if (lower.includes('indexing') || lower.includes('postgresql') || lower.includes('database') || lower.includes('b-tree') || lower.includes('sql')) {
    return {
      explanation: `In relational databases like PostgreSQL, indexes drastically reduce query execution time from full table scans (O(N)) to logarithmic lookups (O(log N)). The default index type is the B-Tree, which keeps data sorted and efficiently handles equality ('='), range queries ('<', '>'), and prefix sorting. When creating composite indexes on multiple columns (e.g. 'user_id, created_at'), the column order matters: queries must filter by the leftmost prefix to utilize the index. Using 'EXPLAIN ANALYZE' allows you to inspect the execution plan, verify whether Index Scans or Bitmap Heap Scans are used, and identify costly disk I/O bottlenecks.`,
      followUp: `What are the trade-offs of having too many indexes on a high-write transactional table, and how do you handle index bloat?`,
      replies: [
        "Every write, update, and delete requires updating all index trees, which slows down write throughput.",
        "We run VACUUM ANALYZE and use partial indexes on active records to minimize storage overhead."
      ]
    };
  }

  // CORS & Web Security
  if (lower.includes('cors') || lower.includes('cross-origin') || lower.includes('security') || lower.includes('jwt') || lower.includes('xss') || lower.includes('csrf')) {
    return {
      explanation: `Cross-Origin Resource Sharing (CORS) is a browser-enforced security mechanism based on the Same-Origin Policy. When a web application on Origin A makes a request to Origin B, the browser automatically sends a preflight 'OPTIONS' request if the request uses non-simple HTTP methods (like PUT or DELETE) or custom headers (like Authorization). The server must respond with appropriate headers such as 'Access-Control-Allow-Origin', 'Access-Control-Allow-Methods', and 'Access-Control-Allow-Headers'. CORS is designed to protect users from malicious websites executing authenticated requests against third-party APIs using stored cookies.`,
      followUp: `Why is storing sensitive JWT authentication tokens in HttpOnly cookies with SameSite=Strict generally safer than storing them in localStorage?`,
      replies: [
        "HttpOnly cookies cannot be read by JavaScript, protecting them from XSS token theft.",
        "SameSite=Strict prevents the browser from sending cookies on cross-site requests, mitigating CSRF."
      ]
    };
  }

  // Docker & Containers & Kubernetes
  if (lower.includes('docker') || lower.includes('kubernetes') || lower.includes('container') || lower.includes('microservices')) {
    return {
      explanation: `Docker containers provide lightweight process isolation by leveraging Linux kernel features: cgroups (which allocate and limit CPU, memory, and I/O) and namespaces (which isolate process trees, network interfaces, and mount points). Unlike virtual machines that require a guest operating system hypervisor, containers share the host kernel, resulting in near-instant boot times and minimal resource overhead. In production, orchestrators like Kubernetes manage container lifecycles, automated horizontal pod autoscaling (HPA), rolling zero-downtime updates, service discovery, and self-healing restarts.`,
      followUp: `How do you design multi-stage Docker builds to produce slim, secure production images that exclude build dependencies and compilers?`,
      replies: [
        "We use a Node builder stage for npm install and build, then copy only dist artifacts to an Alpine runtime.",
        "We run containers as non-root users and scan images for CVE vulnerabilities in CI/CD."
      ]
    };
  }

  // General fallback technical explanation
  return {
    explanation: `In production software engineering for ${targetRole}, building scalable, resilient systems requires separating concerns, designing idempotent APIs, and establishing predictable data pipelines. Whether dealing with state synchronization, database query latency, or distributed caching, top engineering teams prioritize observable metrics (P95/P99 latency, error budgets) and fault-tolerant recovery boundaries.`,
    followUp: `When designing this component for your application, what were the primary architectural trade-offs between delivery speed, operational complexity, and long-term maintainability?`,
    replies: [
      "We prioritized simple, modular abstractions first and optimized bottlenecks only after profiling.",
      "We built comprehensive unit and integration tests to ensure safe refactoring as requirements evolve."
    ]
  };
}

/**
 * 1. AI Practice & Roleplay Simulator Handler
 */
async function simulatePracticePartner({ mode = 'interview', scenario = 'Frontend Engineer', history = [], userMessage = '', targetLanguage = 'Spanish', targetRole = 'Frontend React Developer', level = 'Intermediate' }) {
  const turnCount = history.filter(h => h.sender === 'user').length;
  const isFirstTurn = turnCount === 0 && (!userMessage || userMessage.trim().length < 3);

  const prompt = `You are an elite, highly engaging real-time AI practice partner for SkillSwap.
Current Mode: "${mode}"
Scenario/Topic: "${scenario}"
Target Language (if language mode): "${targetLanguage}"
Target Role (if interview mode): "${targetRole}"
Difficulty Level: "${level}"

Conversation History:
${history.slice(-6).map(h => `${h.sender === 'user' ? 'Learner' : 'AI Coach'}: ${h.text}`).join('\n')}

Latest Learner Utterance: "${userMessage || 'Hello, I am ready to start!'}"

CRITICAL INSTRUCTIONS FOR GENERATING ELABORATED RESPONSES:
1. NEVER REPEAT THE QUESTION OR SAY EMPTY FILLERS LIKE "FASCINATING POINT":
   - Always give an in-depth, intellectually elaborated 3-5 sentence response.
   - If the user asks a question (technical, conceptual, or general like "How are you?"), ANSWER IT THOROUGHLY with real concepts, mechanics, and concrete examples.
   - If the user shares an answer or technical decision, break down why that approach works, explain the underlying engineering principles, share industry trade-offs (e.g. how companies like Meta, Netflix, or Stripe do it), and present a sharp applied follow-up.
   - If user asks for advice or shares feelings (e.g. nervous), coach them warmly and give actionable communication frameworks.

2. MODE REQUIREMENTS:
   - If mode === 'language':
     * Converse fluently and naturally in ${targetLanguage}.
     * If user greets or asks "how are you", answer warmly in ${targetLanguage} and talk about your day before asking a friendly question.
     * In "feedback.correction", provide a specific grammar or phonetic tip for their exact sentence.
     * In "feedback.positive", praise natural vocabulary or polite phrasing.
   - If mode === 'interview':
     * Act as an experienced Staff Principal Engineer / Hiring Manager for ${targetRole}.
     * Deliver clear, authoritative architectural insights.
     * Evaluate their architecture, data structures, trade-offs, and STAR structure.
   - If mode === 'pitch':
     * Act as a seasoned angel investor / VC.
     * Give constructive, sharp feedback on hook, problem statement, traction numbers, CAC, and LTV.

Respond ONLY with a valid JSON object matching this structure:
{
  "reply": "Your detailed, elaborated conversational response directly answering what the user asked/said with concrete concepts and follow-up guidance",
  "scores": {
    "metric1Name": "Clarity",
    "metric1Value": 88,
    "metric2Name": "Technical Depth",
    "metric2Value": 85,
    "metric3Name": "Confidence",
    "metric3Value": 90,
    "overall": 87
  },
  "feedback": {
    "positive": "Specific highlight referencing what the user did well in their exact answer",
    "improvement": "Actionable advice targeting their specific sentence or technical gap",
    "correction": "Targeted tip, phonetic advice, or STAR formulation"
  },
  "suggestedNextReplies": [
    "Specific relevant next reply option 1",
    "Specific relevant next reply option 2"
  ]
}`;

  try {
    const result = await callGemini(prompt, 0.6);
    if (result && result.reply) {
      return result;
    }
  } catch (err) {
    // Fall through to real-time semantic intelligence engine
  }

  // Real-Time Conversational & Semantic Intelligence Engine
  const analysis = analyzeUserUtterance(userMessage, mode);

  // -------------------------------------------------------------
  // MODE 1: LANGUAGE PARTNER SIMULATOR
  // -------------------------------------------------------------
  if (mode === 'language') {
    const langGreetings = {
      'Spanish': {
        hello: `¡Hola! Bienvenido a tu práctica conversacional de Español (${level}).`,
        howAreYouReply: `¡Estoy muy bien, muchas gracias por preguntar! Me alegra mucho estar practicando contigo hoy. ¿Y tú, cómo estás y cómo ha estado tu día?`,
        aboutAiReply: `Soy tu compañero de conversación con IA en SkillSwap. Estoy aquí para ayudarte a practicar tu español de manera natural, corregir tu gramática y mejorar tu pronunciación. ¿De qué te gustaría hablar hoy?`,
        gratitudeReply: `¡De nada! Es un gran placer ayudarte a mejorar tu fluidez. ¿Continuamos con el siguiente tema?`,
        tips: `Phonetic tip: Las vocales en español (a, e, i, o, u) son cortas y puras. Evita diptongarlas como en inglés.`
      },
      'French': {
        hello: `Bonjour! Bienvenue à votre session de conversation en Français (${level}).`,
        howAreYouReply: `Je vais très bien, merci beaucoup de demander! Je suis ravi de pratiquer avec vous aujourd'hui. Et vous, comment allez-vous?`,
        aboutAiReply: `Je suis votre partenaire de pratique linguistique IA sur SkillSwap, conçu pour vous aider à développer votre fluidité en français. De quoi aimeriez-vous discuter?`,
        gratitudeReply: `Je vous en prie! C'est un plaisir de vous accompagner. Continuons!`,
        tips: `Phonetic tip: La lettre 'r' en français est gutturale, prononcée doucement au fond de la gorge.`
      },
      'German': {
        hello: `Hallo! Willkommen zu deinem Deutsch-Sprachtraining (${level}).`,
        howAreYouReply: `Mir geht es sehr gut, vielen Dank der Nachfrage! Ich freue mich auf unsere heutige Konversation. Wie geht es dir heute?`,
        aboutAiReply: `Ich bin dein KI-Sprachpartner auf SkillSwap und helfe dir, flüssig und sicher Deutsch zu sprechen. Worüber möchtest du sprechen?`,
        gratitudeReply: `Sehr gerne! Es macht Spaß, gemeinsam zu üben. Lass uns weitermachen!`,
        tips: `Phonetic tip: Achte auf Umlaute (ä, ö, ü) und das stimmlose 'ch' in 'ich' und 'möchte'.`
      },
      'Japanese': {
        hello: `こんにちは！日本語の会話シミュレーターへようこそ (${level})。`,
        howAreYouReply: `とても元気です、聞いてくれてありがとうございます！今日はどんな会話を練習しましょうか？`,
        aboutAiReply: `私はSkillSwapのAI日本語練習パートナーです。自然な日常会話や敬語の練習をお手伝いします。`,
        gratitudeReply: `どういたしまして！一緒に楽しく上達していきましょう。`,
        tips: `Phonetic tip: 助詞（は、が、を、に）の使い分けと、長音を意識しましょう。`
      },
      'Mandarin': {
        hello: `你好！欢迎来到中文口语对话训练室 (${level})。`,
        howAreYouReply: `我很好，非常感谢你的问候！今天你想练习些什么话题呢？`,
        aboutAiReply: `我是SkillSwap上的AI中文对话伙伴，可以陪你练习日常交流、商务用语和发音纠错。`,
        gratitudeReply: `不客气！很高兴能和你一起练习中文。`,
        tips: `Phonetic tip: 掌握好四个声调的高低变化，特别是第二声和第三声。`
      },
      'Hindi': {
        hello: `नमस्ते! आपके हिंदी अभ्यास सत्र में स्वागत है (${level})।`,
        howAreYouReply: `मैं बहुत अच्छा हूँ, पूछने के लिए धन्यवाद! आप कैसे हैं और आज आपका दिन कैसा चल रहा है?`,
        aboutAiReply: `मैं SkillSwap पर आपका AI हिंदी अभ्यास साथी हूँ। मैं आपको धाराप्रवाह हिंदी बोलने और व्याकरण सुधारने में मदद करूँगा।`,
        gratitudeReply: `आपका स्वागत है! मुझे खुशी है कि हम साथ अभ्यास कर रहे हैं।`,
        tips: `Phonetic tip: महाप्राण ध्वनियों (ख, घ, थ, फ) में हवा का दबाव ध्यानपूर्वक रखें।`
      },
      'Italian': {
        hello: `Ciao! Benvenuto alla tua sessione di conversazione in Italiano (${level}).`,
        howAreYouReply: `Sto benissimo, grazie mille per avermelo chiesto! E tu, come stai oggi?`,
        aboutAiReply: `Sono il tuo partner di conversazione AI su SkillSwap, qui per aiutarti a perfezionare la tua fluidità in italiano. Di cosa vorresti parlare?`,
        gratitudeReply: `Prego, è un piacere! Continuiamo la nostra conversazione.`,
        tips: `Phonetic tip: Fai attenzione alle doppie consonanti (es. 'cappuccino', 'bello').`
      },
      'English (Advanced ESL)': {
        hello: `Hello and welcome to your Advanced English Executive Fluency Arena.`,
        howAreYouReply: `I'm doing great, thank you for asking! I'm excited to practice with you today. How is your day going so far?`,
        aboutAiReply: `I'm your AI Practice Partner on SkillSwap, designed to help you master professional fluency, eliminate filler words, and speak with executive confidence. What topic would you like to explore?`,
        gratitudeReply: `You're very welcome! Let's keep this great momentum going.`,
        tips: `Phonetic tip: Focus on connected speech—smoothly blend ending consonants into beginning vowels (e.g. 'work_on_it').`
      }
    };

    const curLang = langGreetings[targetLanguage] || langGreetings['Spanish'];

    // 1. If user says "How are you"
    if (analysis.isHowAreYou) {
      return {
        reply: curLang.howAreYouReply,
        scores: { metric1Name: "Clarity", metric1Value: 92, metric2Name: "Fluency", metric2Value: 88, metric3Name: "Vocabulary", metric3Value: 90, overall: 90 },
        feedback: {
          positive: "Polite and natural opening greeting!",
          improvement: "Follow up your greeting by sharing a brief note about what you did today.",
          correction: curLang.tips
        },
        suggestedNextReplies: [
          targetLanguage === 'Spanish' ? "¡Estoy muy bien! Hoy tuve un día productivo en el trabajo." : "I'm doing well! I had a productive day working on projects.",
          targetLanguage === 'Spanish' ? "Todo bien por aquí, con ganas de mejorar mi español." : "Doing great, excited to practice and level up my fluency."
        ]
      };
    }

    // 2. If user asks "Who are you"
    if (analysis.isAboutAi) {
      return {
        reply: curLang.aboutAiReply,
        scores: { metric1Name: "Clarity", metric1Value: 90, metric2Name: "Fluency", metric2Value: 88, metric3Name: "Vocabulary", metric3Value: 88, overall: 89 },
        feedback: {
          positive: "Clear phrasing and conversational initiative.",
          improvement: "Try forming compound questions to extend the dialogue.",
          correction: curLang.tips
        },
        suggestedNextReplies: [
          targetLanguage === 'Spanish' ? "Me gustaría practicar cómo describir mi trabajo y pasatiempos." : "I'd like to practice talking about my career and hobbies.",
          targetLanguage === 'Spanish' ? "¿Podemos hacer un simulacro de entrevista de trabajo?" : "Can we do a mock interview simulation in this language?"
        ]
      };
    }

    // 3. If user says "Thank you"
    if (analysis.isGratitude) {
      return {
        reply: curLang.gratitudeReply,
        scores: { metric1Name: "Clarity", metric1Value: 94, metric2Name: "Fluency", metric2Value: 90, metric3Name: "Vocabulary", metric3Value: 90, overall: 91 },
        feedback: {
          positive: "Polite conversational etiquette.",
          improvement: "Keep the dialogue flowing by sharing your perspective on the current topic.",
          correction: curLang.tips
        },
        suggestedNextReplies: [
          targetLanguage === 'Spanish' ? "¡Sí! Cuéntame sobre algún lugar que me recomiendes visitar." : "Yes! Tell me about a place you'd recommend visiting.",
          targetLanguage === 'Spanish' ? "Me gustaría practicar vocabulario sobre tecnología y negocios." : "I'd like to practice business and technology vocabulary."
        ]
      };
    }

    if (isFirstTurn) {
      const initialQuestions = {
        'Spanish': "¿Cómo estás hoy? Para comenzar, cuéntame sobre tu trabajo o qué actividades te gusta hacer en tu tiempo libre.",
        'French': "Comment allez-vous aujourd'hui? Pour commencer, parlez-moi de votre travail ou de vos activités préférées.",
        'German': "Wie geht es dir heute? Erzähl mir zu Beginn etwas über deine Arbeit oder deine Hobbys.",
        'Japanese': "今日はどんな一日でしたか？まずは自己紹介やお仕事、好きな趣味について教えてください。",
        'Mandarin': "今天过得怎么样？请简单介绍一下你的工作或者你平时的兴趣爱好。",
        'Hindi': "आज आपका दिन कैसा रहा? शुरुआत के लिए मुझे अपने काम या अपनी रुचियों के बारे में बताएं।",
        'Italian': "Come stai oggi? Per iniziare, raccontami qualcosa del tuo lavoro o dei tuoi hobby preferiti.",
        'English (Advanced ESL)': "How are you doing today? To kick off our session, tell me a bit about your current projects, career goals, or what you worked on today."
      };
      const initialQ = initialQuestions[targetLanguage] || initialQuestions['Spanish'];

      return {
        reply: `${curLang.hello} ${initialQ}`,
        scores: { metric1Name: "Clarity", metric1Value: 88, metric2Name: "Fluency", metric2Value: 85, metric3Name: "Vocabulary", metric3Value: 86, overall: 86 },
        feedback: {
          positive: "Great readiness to begin spontaneous conversation.",
          improvement: "Try to express complete thoughts with subordinate clauses.",
          correction: curLang.tips
        },
        suggestedNextReplies: [
          targetLanguage === 'Spanish' ? "Trabajo como desarrollador de software y me encanta la tecnología." : "I work as a software engineer and I'm passionate about modern web technologies.",
          targetLanguage === 'Spanish' ? "En mi tiempo libre me gusta viajar, probar comida nueva y aprender idiomas." : "In my free time I love learning new languages, building side projects, and traveling."
        ]
      };
    }

    // Dynamic NLP response to user's particular language response
    const snippet = userMessage.slice(0, 45);
    const userWords = analysis.wordCount;
    const fluencyScore = Math.min(98, Math.max(70, 78 + Math.min(userWords, 20) * 1));
    const vocabScore = Math.min(97, Math.max(72, 80 + Math.min(userWords, 15) * 1));
    const clarityScore = Math.min(98, Math.max(75, 84 + (userWords > 6 ? 6 : 0)));
    const overallScore = Math.round((fluencyScore + vocabScore + clarityScore) / 3);

    let localizedReply = '';
    let positiveHighlight = '';
    let grammarAdvice = '';
    let nextSuggested = [];

    if (targetLanguage === 'Spanish') {
      if (analysis.text.toLowerCase().includes('trabajo') || analysis.text.toLowerCase().includes('proyecto') || analysis.text.toLowerCase().includes('program') || analysis.text.toLowerCase().includes('react')) {
        localizedReply = `¡Excelente iniciativa! Trabajar en proyectos tecnológicos es una forma fantástica de practicar vocabulario profesional. Cuando colaboras con otros ingenieros en español, la comunicación clara sobre la arquitectura y la entrega a tiempo es esencial. ¿Cómo describirías la dinámica de tu equipo o cómo organizan sus tareas diarias?`;
        positiveHighlight = `Excelente uso de vocabulario técnico en contexto.`;
        grammarAdvice = `Tip gramatical: Recuerda concordar el género (el problema / la solución).`;
        nextSuggested = [
          "Organizamos el trabajo usando metodologías ágiles y reuniones diarias de sincronización.",
          "Dividimos los proyectos en sprints de dos semanas con revisiones de código exhaustivas."
        ];
      } else if (analysis.text.toLowerCase().includes('viaj') || analysis.text.toLowerCase().includes('comid') || analysis.text.toLowerCase().includes('gust') || analysis.text.toLowerCase().includes('tiempo libre')) {
        localizedReply = `¡Viajar y explorar culturas gastronómicas es una de las mejores experiencias! Los países hispanohablantes tienen una riqueza culinaria inmensa, desde las tapas en España hasta los moles en México y los asados en Argentina. Si tuvieras que organizar un viaje de dos semanas a un destino de habla hispana, ¿qué lugares incluirías en tu itinerario?`;
        positiveHighlight = `Fluidez natural y buena entonación en tu respuesta.`;
        grammarAdvice = `Para expresar deseos futuros condicionales, utiliza el condicional: 'Me gustaría visitar...' o 'Iría a...'`;
        nextSuggested = [
          "Me encantaría visitar España para conocer Barcelona, Madrid y Sevilla.",
          "Iría a México para explorar Oaxaca, Ciudad de México y sus ruinas arqueológicas."
        ];
      } else {
        localizedReply = `¡Comprendo perfectamente tu perspectiva! Expresar tus ideas con tus propias palabras es la clave para ganar confianza y soltura conversacional. Para profundizar aún más, ¿podrías darme un ejemplo práctico de cómo aplicas esto en tu día a día o qué impacto ha tenido en tus proyectos?`;
        positiveHighlight = `Buena estructura comunicativa y claridad de expresión.`;
        grammarAdvice = `Conector útil: Utiliza 'por lo tanto', 'además' o 'sin embargo' para entrelazar oraciones fluidas.`;
        nextSuggested = [
          "Por ejemplo, esto me ayuda a ser mucho más productivo y estructurado en mi rutina.",
          "Creo que me ha permitido aprender de manera continua y resolver problemas más rápido."
        ];
      }
    } else {
      const lowerText = analysis.text.toLowerCase();
      if (lowerText.includes('project') || lowerText.includes('productive') || lowerText.includes('work') || lowerText.includes('today')) {
        localizedReply = `That's wonderful to hear! Having a productive day always builds great momentum. What specific projects or technologies were you working on today, and did you hit any interesting milestones or overcome a tricky bug?`;
        positiveHighlight = `Positive, proactive tone and clear articulation.`;
        grammarAdvice = `Vocabulary tip: Use dynamic verbs like 'spearheaded', 'refactored', or 'streamlined' when discussing your accomplishments.`;
        nextSuggested = [
          "I was optimizing our React state management and building out clean reusable components.",
          "I was debugging an API integration issue and writing unit tests to prevent future regressions."
        ];
      } else if (lowerText.includes('learn') || lowerText.includes('skill') || lowerText.includes('study') || lowerText.includes('practice')) {
        localizedReply = `Continuous learning is one of the most valuable habits in technology. When mastering new concepts, applying them immediately in hands-on sandboxes makes knowledge stick. What sparked your interest in this area, and what is the next milestone on your learning roadmap?`;
        positiveHighlight = `Curious mindset and dedication to self-improvement.`;
        grammarAdvice = `Transition tip: Connect your learning goals using phrases like 'To build on this foundation...' or 'My immediate priority is...'`;
        nextSuggested = [
          "I want to master system design and build scalable distributed architectures.",
          "I'm focusing on strengthening my full-stack TypeScript and cloud deployment skills."
        ];
      } else if (lowerText.includes('travel') || lowerText.includes('hobby') || lowerText.includes('food') || lowerText.includes('weekend') || lowerText.includes('free time')) {
        localizedReply = `That sounds like a great way to recharge outside of engineering! Maintaining strong interests outside of screen time fosters creativity and long-term stamina. How do those experiences help you approach problem-solving from fresh angles?`;
        positiveHighlight = `Engaging, relatable personal storytelling.`;
        grammarAdvice = `Fluency tip: Use sensory and descriptive adjectives to bring your personal anecdotes to life.`;
        nextSuggested = [
          "It helps me clear my mind and return to complex technical problems with fresh perspective.",
          "It teaches me adaptability and how to communicate effectively across diverse backgrounds."
        ];
      } else {
        localizedReply = `You framed that idea with clarity. In professional engineering discussions, articulating the reasoning behind your decisions creates alignment across teams. To build further on that, what were the primary factors that influenced your thinking?`;
        positiveHighlight = `Clear logical progression and concise expression.`;
        grammarAdvice = `Vocabulary tip: Substitute general descriptors like 'good' or 'hard' with nuanced terms like 'impactful', 'demanding', or 'pivotal'.`;
        nextSuggested = [
          "The primary factor was maximizing user experience while keeping system complexity manageable.",
          "We prioritized maintainability so our team could iterate quickly in future sprints."
        ];
      }
    }

    return {
      reply: localizedReply,
      scores: {
        metric1Name: "Clarity",
        metric1Value: clarityScore,
        metric2Name: "Fluency",
        metric2Value: fluencyScore,
        metric3Name: "Vocabulary",
        metric3Value: vocabScore,
        overall: overallScore
      },
      feedback: {
        positive: positiveHighlight,
        improvement: "Expand your answers with specific rationale or supporting real-world examples.",
        correction: grammarAdvice
      },
      suggestedNextReplies: nextSuggested
    };
  }

  // -------------------------------------------------------------
  // MODE 2: TECHNICAL & BEHAVIORAL MOCK INTERVIEW
  // -------------------------------------------------------------
  if (mode === 'interview') {
    // 1. Direct response to "How are you"
    if (analysis.isHowAreYou) {
      return {
        reply: `I'm doing great, thank you for asking! I'm genuinely excited to be conducting your ${targetRole} technical interview today. How are you feeling, and are you ready to jump into our first architectural scenario?`,
        scores: { metric1Name: "Clarity", metric1Value: 95, metric2Name: "Technical Depth", metric2Value: 85, metric3Name: "Confidence", metric3Value: 92, overall: 91 },
        feedback: {
          positive: "Warm, professional opening demeanor.",
          improvement: "In technical interviews, pairing a greeting with an enthusiastic readiness statement sets a strong positive tone.",
          correction: "Executive Presence: A friendly opening builds immediate rapport with the hiring panel."
        },
        suggestedNextReplies: [
          "I'm feeling great and ready! Let's jump into the first architectural challenge.",
          "Doing well, thank you! I'm excited to discuss my recent full-stack projects."
        ]
      };
    }

    // 2. Direct response to "Who are you"
    if (analysis.isAboutAi) {
      return {
        reply: `I am your AI Technical Interviewer & Hiring Manager for ${targetRole} on SkillSwap. My job is to evaluate your system architecture reasoning, trade-off analysis, and STAR communication, and give you real-time feedback so you can ace real interviews. Shall we begin with your first technical scenario?`,
        scores: { metric1Name: "Clarity", metric1Value: 92, metric2Name: "Technical Depth", metric2Value: 86, metric3Name: "Confidence", metric3Value: 90, overall: 89 },
        feedback: {
          positive: "Clear and direct question.",
          improvement: "Whenever you are ready, describe an engineering problem you recently solved.",
          correction: "STAR Tip: Focus on Situation, Task, Action, and Result."
        },
        suggestedNextReplies: [
          "Yes, let's begin! Give me a challenging architectural scenario.",
          "I'd like to focus on state management and database scalability questions."
        ]
      };
    }

    // 3. Direct response to "I am nervous"
    if (analysis.isNervous) {
      return {
        reply: `It is completely normal to feel nervous! Remember that technical interviews are simply collaborative architectural discussions between engineering peers. Take a deep breath—you know your fundamentals well. When you're ready, tell me about a project you are genuinely proud of building.`,
        scores: { metric1Name: "Clarity", metric1Value: 90, metric2Name: "Technical Depth", metric2Value: 82, metric3Name: "Confidence", metric3Value: 80, overall: 84 },
        feedback: {
          positive: "Authentic and honest communication.",
          improvement: "Structure your thoughts by taking a 3-second pause before answering to organize your points.",
          correction: "Mindset Tip: Treat the interviewer as a teammate working through an architecture whiteboard."
        },
        suggestedNextReplies: [
          "Thank you, I feel better! I built a full-stack dashboard with React and Node.js.",
          "Let's do this! I'm ready to walk you through a recent optimization challenge."
        ]
      };
    }

    // 4. Direct response to "Thank you"
    if (analysis.isGratitude) {
      return {
        reply: `You're very welcome! You're doing great so far. Let's keep this momentum going: In your current tech stack, how do you handle automated testing, CI/CD pipelines, and preventing regression bugs before shipping to production?`,
        scores: { metric1Name: "Clarity", metric1Value: 94, metric2Name: "Technical Depth", metric2Value: 88, metric3Name: "Confidence", metric3Value: 90, overall: 91 },
        feedback: {
          positive: "Polite and professional engagement.",
          improvement: "Detail your testing pyramid (unit, integration, and E2E smoke tests).",
          correction: "DevOps Best Practice: Mention GitHub Actions, Jest/Vitest, and Playwright."
        },
        suggestedNextReplies: [
          "We run Jest unit tests on commit and Cypress E2E smoke tests in GitHub Actions prior to staging deploy.",
          "We enforce 85% branch coverage and use feature flags for safe canary rollouts."
        ]
      };
    }

    // 5. Initial First Turn Greeting
    if (isFirstTurn) {
      return {
        reply: `Welcome to your ${targetRole} technical interview! I'm looking forward to our session today. Let's begin with a foundational architectural question: Can you walk me through a challenging feature or service you designed and built recently, what trade-offs you evaluated, and why you chose your final technical approach?`,
        scores: { metric1Name: "Clarity", metric1Value: 90, metric2Name: "Technical Depth", metric2Value: 88, metric3Name: "Confidence", metric3Value: 86, overall: 88 },
        feedback: {
          positive: "Ready for high-impact technical evaluation.",
          improvement: "Structure answers using the STAR format (Situation, Task, Action, Result) with measurable metrics.",
          correction: "Hiring Manager Tip: Emphasize 'I did X' rather than 'We did X' to showcase your individual ownership."
        },
        suggestedNextReplies: [
          "I architected a scalable Next.js and Node.js micro-frontend that cut page load times by 45%.",
          "I redesigned our PostgreSQL database indexing and Redis caching layer to handle 10k QPS spikes."
        ]
      };
    }

    // 6. Direct Elaborated Technical Q&A
    if (analysis.isAskingQuestion || analysis.detectedTech.length > 0) {
      const techQnA = getElaboratedTechnicalExplanation(userMessage, targetRole);
      
      const techDepthScore = Math.min(98, Math.max(82, 84 + analysis.detectedTech.length * 4 + (analysis.hasMetrics ? 6 : 0)));
      const clarityScore = Math.min(97, Math.max(80, 86 + (analysis.wordCount > 10 ? 6 : 0)));
      const confidenceScore = Math.min(98, Math.max(78, 85 + (analysis.isUncertain ? -6 : 6)));
      const overallScore = Math.round((techDepthScore + clarityScore + confidenceScore) / 3);

      return {
        reply: `${techQnA.explanation} ${techQnA.followUp}`,
        scores: {
          metric1Name: "Clarity",
          metric1Value: clarityScore,
          metric2Name: "Technical Depth",
          metric2Value: techDepthScore,
          metric3Name: "Confidence",
          metric3Value: confidenceScore,
          overall: overallScore
        },
        feedback: {
          positive: `Precise technical articulation regarding ${analysis.detectedTech.join(', ') || 'software architecture'}.`,
          improvement: "Tie technical explanations directly to real-world performance metrics (e.g. bundle size, P99 latency).",
          correction: "Staff Engineer Mindset: Always evaluate failure modes and trade-offs when presenting an architectural solution."
        },
        suggestedNextReplies: techQnA.replies
      };
    }

    // 7. General Elaborated Answer Handling
    const words = analysis.wordCount;
    const hasNumbers = analysis.hasMetrics;
    const depthScore = Math.min(96, Math.max(75, 78 + (words > 20 ? 8 : 4) + (hasNumbers ? 8 : 0)));
    const clarityScore = Math.min(97, Math.max(78, 84 + (words > 12 ? 6 : 0)));
    const confidenceScore = Math.min(98, Math.max(75, 82 + (hasNumbers ? 8 : 4)));
    const overallScore = Math.round((depthScore + clarityScore + confidenceScore) / 3);

    const elaboratedReply = `That is a thoughtful breakdown of your approach. In enterprise production systems for ${targetRole}, having clear mental models around data consistency, graceful degradation, and error boundaries separates senior engineers from mid-level developers. When you implemented that solution, how did you structure monitoring, distributed logging, and automated alerting to detect unexpected anomalies before users reported them?`;

    return {
      reply: elaboratedReply,
      scores: {
        metric1Name: "Clarity",
        metric1Value: clarityScore,
        metric2Name: "Technical Depth",
        metric2Value: depthScore,
        metric3Name: "Confidence",
        metric3Value: confidenceScore,
        overall: overallScore
      },
      feedback: {
        positive: "Strong logical structure and clear progression of engineering steps.",
        improvement: "Incorporate specific observability tools (like Datadog, Prometheus, or Sentry) into your answers.",
        correction: "STAR Method: Dedicate 50% of your explanation to your specific engineering actions and 30% to quantifiable results."
      },
      suggestedNextReplies: [
        "We set up Datadog APM tracing with P95 latency alerts and Sentry error boundary captures.",
        "We implemented Prometheus metrics and Grafana dashboards tracking 4 golden signals: latency, traffic, errors, and saturation."
      ]
    };
  }

  // -------------------------------------------------------------
  // MODE 3: PITCH & PUBLIC SPEAKING COACH
  // -------------------------------------------------------------
  if (analysis.isHowAreYou) {
    return {
      reply: `I'm doing well and energized to hear your pitch today! You have the floor whenever you are ready. What is the high-pain problem, your unique solution, and who is your target customer?`,
      scores: { metric1Name: "Clarity", metric1Value: 92, metric2Name: "Structure", metric2Value: 88, metric3Name: "Impact", metric3Value: 90, overall: 90 },
      feedback: {
        positive: "Warm opening rapport.",
        improvement: "Transition seamlessly from your greeting into an unforgettable 10-second opening hook.",
        correction: "Pitch Strategy: A confident, relaxed greeting sets executive presence."
      },
      suggestedNextReplies: [
        "Every day, 50M learners struggle to find practice partners. SkillSwap connects them instantly via peer micro-swaps.",
        "Traditional knowledge transfer is broken and expensive. Our AI marketplace provides real-time 1-on-1 practice."
      ]
    };
  }

  if (isFirstTurn) {
    return {
      reply: `Welcome to the Pitch Arena! You have the floor. Deliver your elevator pitch: What is the high-pain problem, your unique technological solution, your target customer, and what makes your approach 10x better than existing alternatives?`,
      scores: { metric1Name: "Clarity", metric1Value: 92, metric2Name: "Structure", metric2Value: 86, metric3Name: "Impact", metric3Value: 88, overall: 89 },
      feedback: {
        positive: "Great presence and ready to pitch.",
        improvement: "Hook the audience in the first 10 seconds before detailing technical specs.",
        correction: "Pitch Framework: Hook ➔ Pain Point ➔ Unique Solution ➔ Traction & Unit Economics ➔ The Ask."
      },
      suggestedNextReplies: [
        "Every day, 50M professionals want to learn new skills but tutoring is too expensive. SkillSwap solves this with a peer-to-peer 2-way skill exchange.",
        "Traditional knowledge transfer is broken. Our AI-assisted marketplace matches complementary learners for real-time 1-on-1 collaborative practice."
      ]
    };
  }

  // Dynamic Investor / Audience Response
  const hasNumbers = analysis.hasMetrics;
  const words = analysis.wordCount;
  const clarityScore = Math.min(98, Math.max(75, 84 + (words > 15 ? 6 : 0) - analysis.fillerCount * 4));
  const structureScore = Math.min(97, Math.max(72, 80 + (hasNumbers ? 10 : 0) + (words > 20 ? 6 : 0)));
  const impactScore = Math.min(99, Math.max(74, 82 + (hasNumbers ? 8 : 4)));
  const overallScore = Math.round((clarityScore + structureScore + impactScore) / 3);

  let pitchReply = '';
  let positiveHighlight = '';
  let improvementAdvice = '';
  let dynamicReplies = [];

  if (analysis.text.toLowerCase().includes('compet') || analysis.text.toLowerCase().includes('better') || analysis.text.toLowerCase().includes('unique')) {
    pitchReply = `Differentiating yourself in a crowded market requires more than feature velocity—it requires a defensible unfair advantage. Whether that moat is built on two-sided network effects, proprietary training datasets, or high switching costs, early investors want to know why a capitalized incumbent cannot replicate your product in three months. How does your unit economics or distribution flywheel create a sustainable barrier to entry?`;
    positiveHighlight = `Sharp competitive awareness and clear differentiation claim.`;
    improvementAdvice = `Define your moat using defensible structural advantages (e.g., proprietary 2-way matching data).`;
    dynamicReplies = [
      "Our moat is built on two-sided liquidity and hyper-localized peer reputation graphs with 78% retention.",
      "Our AI simulator fine-tuned on 100k real sessions creates proprietary coaching feedback loops."
    ];
  } else if (hasNumbers) {
    pitchReply = `Those traction metrics (${analysis.metricMatches.join(', ')}) demonstrate clear early product-market validation. In venture capital, investors look for capital efficiency: what is your blended Customer Acquisition Cost (CAC) across organic versus paid channels, what is your 12-month net revenue retention (NRR), and how does your LTV/CAC ratio scale as you move from individual learners into B2B enterprise cohorts?`;
    positiveHighlight = `Compelling traction metrics (${analysis.metricMatches.join(', ')}). Investors love hard numbers.`;
    improvementAdvice = `Pair CAC metrics with payback period (e.g., 'CAC payback in under 4 months').`;
    dynamicReplies = [
      "Our organic referral loop gives us an effective CAC of $1.80 with an LTV of $140, yielding an 8x ratio.",
      "We operate an organic community flywheel where 42% of learners become mentors, driving zero marginal CAC."
    ];
  } else {
    pitchReply = `You have framed a relatable problem with clear narrative energy. To make this an institutional-grade investment pitch, let's crystallize the business model: What is your exact monetization engine (e.g. marketplace rake, tiered SaaS subscriptions, or enterprise licensing), what are your gross margins, and what milestones will you achieve with your next funding tranche?`;
    positiveHighlight = `Engaging delivery, relatable problem formulation, and strong vocal clarity.`;
    improvementAdvice = `Include precise monetization mechanics (subscription, transaction fee, or enterprise licensing).`;
    dynamicReplies = [
      "We monetize via a 15% platform transaction fee on premium verified certificates and a $29/mo Pro tier.",
      "We offer B2B corporate team learning subscriptions with integrated skill telemetry and post-session summaries."
    ];
  }

  return {
    reply: pitchReply,
    scores: {
      metric1Name: "Clarity",
      metric1Value: clarityScore,
      metric2Name: "Structure",
      metric2Value: structureScore,
      metric3Name: "Impact",
      metric3Value: impactScore,
      overall: overallScore
    },
    feedback: {
      positive: positiveHighlight,
      improvement: improvementAdvice,
      correction: "Executive Delivery: Replace passive language ('we hope to') with definitive execution terms ('we are executing on')."
    },
    suggestedNextReplies: dynamicReplies
  };
}

/**
 * 2. AI "Skill Gap to Dream Job" Career Copilot Handler
 */
async function analyzeCareerSkillGap({ targetJobTitle = 'Full Stack Engineer', jobDescription = '', userSkills = [], allUsers = [], allSkills = {} }) {
  const userSkillNames = userSkills.map(s => (s.name || s).toLowerCase());

  const prompt = `You are a premier Tech Career Architect.
Target Job Title: "${targetJobTitle}"
Job Description or Context: "${jobDescription || 'Standard requirements for modern ' + targetJobTitle}"
Candidate's Current Skills: ${JSON.stringify(userSkillNames)}

Analyze the skill gaps required to become a top 1% candidate for this role.

Extract:
1. "matchedSkills": Array of strings (skills candidate has that directly match).
2. "partialSkills": Array of strings (related skills candidate has that need upskilling or expansion).
3. "missingSkills": Array of strings (essential high-demand skills the candidate completely lacks for this role).
4. "readinessScore": Integer (0-100) reflecting candidate readiness.
5. "summary": 2-3 sentence strategic executive summary of their path to this role.
6. "roadmap": Array of 4-6 milestone objects { "phase": 1, "title": "...", "focusSkill": "...", "duration": "Week 1-2", "description": "...", "keyDeliverable": "..." }

Respond ONLY with a valid JSON object matching this structure:
{
  "targetJobTitle": "${targetJobTitle}",
  "readinessScore": 72,
  "summary": "...",
  "matchedSkills": ["React", "JavaScript"],
  "partialSkills": ["Node.js", "REST APIs"],
  "missingSkills": ["TypeScript", "Docker", "GraphQL", "System Design"],
  "roadmap": [
    { "phase": 1, "title": "TypeScript Mastery & Strict Typing", "focusSkill": "TypeScript", "duration": "Week 1-2", "description": "Refactor React apps with TypeScript interfaces and generics.", "keyDeliverable": "Full-stack typed CRUD project" }
  ]
}`;

  let analysis = null;

  try {
    analysis = await callGemini(prompt, 0.4);
  } catch (err) {
    // Expected fallback
  }

  // Robust procedural generator fallback
  if (!analysis || !Array.isArray(analysis.missingSkills) || analysis.missingSkills.length === 0) {
    const defaultRequirements = {
      'frontend': ['React', 'TypeScript', 'Next.js', 'State Management', 'Testing (Jest/Playwright)', 'Web Performance', 'GraphQL', 'TailwindCSS'],
      'backend': ['Node.js', 'PostgreSQL', 'Docker', 'Redis', 'Microservices', 'System Design', 'CI/CD Pipelines', 'REST & GraphQL'],
      'fullstack': ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'System Design', 'TailwindCSS', 'Redis'],
      'ai': ['Python', 'PyTorch', 'LangChain', 'Prompt Engineering', 'Vector Databases', 'FastAPI', 'Data Pipelines', 'Docker'],
      'design': ['Figma', 'Design Systems', 'UX Research', 'Interactive Prototyping', 'Wireframing', 'Design Tokens', 'User Testing'],
      'devops': ['Docker', 'Kubernetes', 'Terraform', 'CI/CD Pipelines', 'AWS/GCP Cloud', 'Linux Architecture', 'Monitoring & Grafana']
    };

    let reqs = defaultRequirements.fullstack;
    const titleLower = targetJobTitle.toLowerCase();
    if (titleLower.includes('front')) reqs = defaultRequirements.frontend;
    else if (titleLower.includes('back')) reqs = defaultRequirements.backend;
    else if (titleLower.includes('ai') || titleLower.includes('ml') || titleLower.includes('data')) reqs = defaultRequirements.ai;
    else if (titleLower.includes('design') || titleLower.includes('ui') || titleLower.includes('ux')) reqs = defaultRequirements.design;
    else if (titleLower.includes('devops') || titleLower.includes('cloud') || titleLower.includes('sre')) reqs = defaultRequirements.devops;

    const matched = [];
    const partial = [];
    const missing = [];

    reqs.forEach(r => {
      const isMatched = userSkillNames.some(us => us === r.toLowerCase() || (us.length > 2 && r.toLowerCase().includes(us)));
      if (isMatched) {
        matched.push(r);
      } else if (r.includes('Testing') || r.includes('Performance') || r.includes('Design') || r.includes('GraphQL')) {
        partial.push(r);
      } else {
        missing.push(r);
      }
    });

    if (matched.length === 0 && userSkillNames.length > 0) {
      matched.push(userSkills[0]?.name || 'Problem Solving');
    }

    const calculatedReadiness = Math.min(95, Math.max(35, Math.round(((matched.length * 1.5 + partial.length * 0.7) / reqs.length) * 100)));

    analysis = {
      targetJobTitle,
      readinessScore: calculatedReadiness,
      summary: `Your profile demonstrates strong foundations in ${matched.slice(0, 2).join(' & ') || 'core software development'}. Bridging your skills in ${missing.slice(0, 2).join(' and ')} through peer swaps will elevate you to the top tier of candidates for ${targetJobTitle} roles.`,
      matchedSkills: matched.length > 0 ? matched : ['Software Architecture', 'Communication'],
      partialSkills: partial.length > 0 ? partial : ['API Design', 'State Architecture'],
      missingSkills: missing.length > 0 ? missing : ['System Design', 'Cloud Deployment', 'Performance Optimization'],
      roadmap: [
        { phase: 1, title: `Foundations of ${missing[0] || 'Modern Architecture'}`, focusSkill: missing[0] || 'Core Architecture', duration: 'Weeks 1-2', description: `Master syntax, mental models, and core patterns of ${missing[0] || 'architecture'}.`, keyDeliverable: 'Working sandbox prototype' },
        { phase: 2, title: `Full-Stack Integration & ${missing[1] || 'State Flow'}`, focusSkill: missing[1] || 'Data Flow', duration: 'Weeks 3-4', description: 'Connect components into a scalable end-to-end service.', keyDeliverable: 'Integrated production module' },
        { phase: 3, title: 'System Scalability & Production Hardening', focusSkill: 'System Design', duration: 'Weeks 5-6', description: 'Implement caching, containerization, and automated test coverage.', keyDeliverable: 'Deployed cloud repository with CI/CD' },
        { phase: 4, title: 'Portfolio Showcase & Mock Technical Interviews', focusSkill: 'Interview Prep', duration: 'Weeks 7-8', description: 'Complete 3 peer mock interview sessions on SkillSwap and publish project demo.', keyDeliverable: 'Live Demo URL + Resume bullet points' }
      ]
    };
  }

  // Find mentors across SkillSwap who teach the missing skills!
  const recommendedMentors = [];
  const missingList = (analysis.missingSkills || []).map(m => m.toLowerCase());

  allUsers.forEach(u => {
    const uSkills = allSkills[u.id] || [];
    const teachesMissing = uSkills.filter(s => {
      const sName = (s.name || '').toLowerCase();
      const isTeaching = s.type === 'offer' || s.level === 'Advanced' || s.level === 'Expert' || s.level === 'Intermediate';
      if (!isTeaching) return false;
      return missingList.some(ms => ms.includes(sName) || sName.includes(ms) || getSkillSimilarity(sName, ms) >= 0.7);
    });

    if (teachesMissing.length > 0) {
      recommendedMentors.push({
        user: u,
        matchingSkills: teachesMissing.map(s => s.name),
        missingSkillsCovered: teachesMissing.map(s => s.name),
        rating: u.rating || 5.0,
        swapsCompleted: u.swapsCompleted || 0
      });
    }
  });

  // If no direct mentors in DB, generate top community mentor suggestions from active users
  if (recommendedMentors.length === 0 && allUsers.length > 0) {
    allUsers.slice(0, 4).forEach(u => {
      const uSkills = allSkills[u.id] || [];
      const offered = uSkills.filter(s => s.type === 'offer').map(s => s.name);
      recommendedMentors.push({
        user: u,
        matchingSkills: offered.length > 0 ? offered : ['Software Engineering', 'System Design'],
        missingSkillsCovered: analysis.missingSkills.slice(0, 2),
        rating: u.rating || 4.9,
        swapsCompleted: u.swapsCompleted || 5
      });
    });
  }

  recommendedMentors.sort((a, b) => (b.matchingSkills.length * 10 + b.rating) - (a.matchingSkills.length * 10 + a.rating));

  return {
    ...analysis,
    recommendedMentors: recommendedMentors.slice(0, 6)
  };
}

/**
 * 3. Post-Session AI Notetaker & Action Item Generator
 */
async function generateSessionSummary({ sessionContext = '', notes = '', transcript = '', skillTopic = 'Skill Exchange Session', partnerName = 'Learning Partner' }) {
  const prompt = `You are an elite AI Learning Notetaker & Executive Study Coach for SkillSwap.
Topic of Session: "${skillTopic}"
Partner Name: "${partnerName}"
Shared Notes from Session: "${notes || 'Covered key concepts, practical exercises, and debugging.'}"
Session Context / Chat snippets: "${transcript || sessionContext || '1-on-1 peer exchange'}"

Generate a crystal-clear, structured post-session takeaway guide for the learner.

Extract:
1. "title": Catchy, professional title (e.g. "Mastering React Custom Hooks & State Flow with Sarah")
2. "duration": e.g. "45 Minutes"
3. "executiveSummary": 3-4 sentence comprehensive recap of what was mastered.
4. "keyConcepts": Array of 3-5 bullet strings explaining critical takeaways.
5. "codeSnippets": Array of 1-3 objects { "title": "Example snippet title", "language": "javascript/python/css", "code": "..." }
6. "actionItems": Array of 3-5 checklist items { "id": 1, "task": "...", "priority": "High/Medium", "estimatedHours": "1-2h" }
7. "nextSessionAgenda": Array of 2-3 suggested focus topics for the upcoming session.
8. "mentorPraise": Warm encouraging closing remark.

Respond ONLY with a valid JSON object matching this structure:
{
  "title": "...",
  "duration": "45 min",
  "executiveSummary": "...",
  "keyConcepts": ["...", "..."],
  "codeSnippets": [
    { "title": "Custom Hook Pattern", "language": "javascript", "code": "function useDebounce(value, delay) {\\n  const [debounced, setDebounced] = useState(value);\\n  useEffect(() => {\\n    const handler = setTimeout(() => setDebounced(value), delay);\\n    return () => clearTimeout(handler);\\n  }, [value, delay]);\\n  return debounced;\\n}" }
  ],
  "actionItems": [
    { "id": 1, "task": "Implement useDebounce in your search component", "priority": "High", "estimatedHours": "1h" },
    { "id": 2, "task": "Add cleanup functions to all existing useEffect instances", "priority": "Medium", "estimatedHours": "45m" }
  ],
  "nextSessionAgenda": [
    "Optimizing performance with useMemo and useCallback",
    "Integrating Context API with custom reducer hooks"
  ],
  "mentorPraise": "Outstanding progress today! You grasped the subtle lifecycle implications remarkably fast."
}`;

  try {
    const summary = await callGemini(prompt, 0.4);
    if (summary && summary.executiveSummary) {
      return summary;
    }
  } catch (err) {
    // Expected fallback
  }

  // Robust procedural fallback
  return {
    title: `${skillTopic} Mastery Session with ${partnerName}`,
    duration: '45 min',
    executiveSummary: `During this high-impact session on ${skillTopic}, both partners explored practical patterns, resolved architectural questions, and aligned on industry best practices. Real-time exercises helped reinforce mental models and syntax mechanics.`,
    keyConcepts: [
      `Core mental model and design paradigms of ${skillTopic}.`,
      'Deconstructing common edge cases and error patterns during implementation.',
      'Practical performance and readability optimizations.',
      'Structuring modular components for longevity and testability.'
    ],
    codeSnippets: [
      {
        title: `${skillTopic} Core Implementation Pattern`,
        language: 'javascript',
        code: `// ${skillTopic} - Verified Pattern\nasync function handleExecution(params) {\n  try {\n    const response = await processRequest(params);\n    return { success: true, data: response };\n  } catch (error) {\n    console.error('Execution error:', error);\n    return { success: false, error: error.message };\n  }\n}`
      }
    ],
    actionItems: [
      { id: 1, task: `Build a standalone playground project demonstrating today's ${skillTopic} concepts`, priority: 'High', estimatedHours: '1.5h' },
      { id: 2, task: 'Refactor 1 legacy module using the cleaner pattern discussed', priority: 'Medium', estimatedHours: '1h' },
      { id: 3, task: 'Write down 2-3 edge cases encountered for review in the next swap', priority: 'Low', estimatedHours: '30m' }
    ],
    nextSessionAgenda: [
      `Advanced deep-dive into ${skillTopic} optimization and state edge cases`,
      'Live code review of homework exercises and pair programming challenge'
    ],
    mentorPraise: `Fantastic engagement throughout today's session! You asked insightful questions that showed genuine curiosity and sharp intuition.`
  };
}

module.exports = {
  simulatePracticePartner,
  analyzeCareerSkillGap,
  generateSessionSummary
};
