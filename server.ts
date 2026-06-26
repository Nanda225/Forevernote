import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { validatePromptInput, sanitizePromptString, validateEmail, validateTitle, validateInviteCode, validateRequestSize } from "./src/utils/validation";

dotenv.config();

// ============================================================================
// SECURITY: MIDDLEWARE & CONFIGURATION
// ============================================================================

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:3000").split(",").map(o => o.trim());
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!SESSION_SECRET && process.env.NODE_ENV === "production") {
  console.error("FATAL: SESSION_SECRET environment variable is required in production!");
  process.exit(1);
}

// ============================================================================
// SECURITY: RATE LIMITING
// ============================================================================

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skip: (req) => req.path === "/api/health", // Skip health checks
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Strict limit for auth endpoints
  message: "Too many authentication attempts, please try again later.",
  skipSuccessfulRequests: true, // Don't count successful requests
});

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Max 50 AI calls per hour per IP
  message: "AI service rate limit exceeded, please try again later.",
});

// ============================================================================
// LAZY AI CLIENT INITIALIZATION
// ============================================================================

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY is not defined. Falling back to pre-designed responses.");
      throw new Error("GEMINI_API_KEY environment variable is required to access the live AI model");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// ============================================================================
// RESILIENT AI CONTENT GENERATION WITH RETRY LOGIC
// ============================================================================

async function generateContentWithRetry(prompt: string): Promise<string> {
  const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    let attempts = 3;
    let delay = 600; // milliseconds

    while (attempts > 0) {
      try {
        const response = await getAiClient().models.generateContent({
          model: modelName,
          contents: prompt,
        });

        if (response?.text) {
          return response.text;
        }
        throw new Error("Empty response from AI client");
      } catch (err: any) {
        lastError = err;
        console.warn(`Attempt failed with model ${modelName} (${attempts} attempts left). Error: ${err.message || err}`);
        
        const errorStr = (err.message || String(err)).toLowerCase();
        const shouldFailoverImmediately = err.status === 429 || err.status === 503 || 
                                         errorStr.includes("429") || errorStr.includes("503") || 
                                         errorStr.includes("quota") || errorStr.includes("rate limit") ||
                                         errorStr.includes("resource_exhausted") ||
                                         errorStr.includes("unavailable") ||
                                         errorStr.includes("high demand") ||
                                         errorStr.includes("overloaded");

        if (shouldFailoverImmediately) {
          console.warn(`Quota or service limit hit for ${modelName}. Moving to next fallback model immediately.`);
          break;
        }

        const isTransient = !err.status || err.status >= 500;
        if (!isTransient) {
          break;
        }

        attempts--;
        if (attempts > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 1.8;
        }
      }
    }
  }

  throw lastError || new Error("Failed to generate content after retries and fallback.");
}

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================

async function startServer() {
  const app = express();
  const PORT = 3000;

  // ========================================================================
  // SECURITY: ENFORCE HTTPS IN PRODUCTION
  // ========================================================================
  
  if (process.env.NODE_ENV === "production") {
    app.use((req, res, next) => {
      if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
        return res.redirect(301, `https://${req.get('host')}${req.url}`);
      }
      next();
    });
  }

  // ========================================================================
  // SECURITY: HELMET HEADERS
  // ========================================================================
  
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        connectSrc: ["'self'", "https://ai.google.dev", "https://*.firebaseio.com", "https://firestore.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "data:"],
        frameSrc: ["'self'"],
        objectSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: parseInt(process.env.HSTS_MAX_AGE || "31536000"),
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    noSniff: true,
    xssFilter: true,
  }));

  // ========================================================================
  // SECURITY: CORS CONFIGURATION
  // ========================================================================
  
  app.use((req, res, next) => {
    const origin = req.get('origin');
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
      res.set('Access-Control-Allow-Origin', origin);
      res.set('Access-Control-Allow-Credentials', 'true');
      res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.set('Access-Control-Max-Age', '86400');
    }
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Enable trust proxy for correct client IP detection
  app.enable("trust proxy");

  // Disable server fingerprinting
  app.disable("x-powered-by");

  // ========================================================================
  // SECURITY: MIDDLEWARE
  // ========================================================================
  
  app.use(express.json({ limit: '100kb' })); // Limit payload size
  app.use(generalLimiter);

  // ========================================================================
  // SECURITY: REQUEST VALIDATION MIDDLEWARE
  // ========================================================================
  
  app.use((req, res, next) => {
    if (req.method === 'POST' || req.method === 'PUT') {
      const validation = validateRequestSize(req.body, 100); // 100KB limit
      if (!validation.isValid) {
        return res.status(400).json({ error: validation.error });
      }
    }
    next();
  });

  // ========================================================================
  // HEALTH CHECK ENDPOINT
  // ========================================================================
  
  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // ========================================================================
  // API ROUTES WITH SECURITY
  // ========================================================================

  // Letter Generation Endpoint
  app.post("/api/letter/generate", aiLimiter, async (req, res) => {
    try {
      const { title, type, date, description, style, userName, partnerName } = req.body;

      // Validate required fields
      if (!title || !type || !description) {
        return res.status(400).json({ error: "Title, type, and description are required fields" });
      }

      // Input validation
      const titleValidation = validateTitle(title, 200);
      if (!titleValidation.isValid) {
        return res.status(400).json({ error: titleValidation.error });
      }

      const descValidation = validatePromptInput(description, 3000);
      if (!descValidation.isValid) {
        return res.status(400).json({ error: descValidation.error });
      }

      // Sanitize user inputs for safe AI prompt injection
      const safeName = sanitizePromptString(userName || 'me');
      const safePartner = sanitizePromptString(partnerName || 'my favorite person');
      const safeDesc = sanitizePromptString(description);

      const prompt = `Write a deeply personalized relationship milestone greeting/letter from ${safeName} to their ${partnerName ? `partner ${safePartner}` : 'friend/partner'} celebrating "${title}".

Here is the story/description of what happened: "${safeDesc}".

Generate it in a style that is ${sanitizePromptString(style || 'Romantic')}.

Requirements:
1. Write it as a heartfelt, organic letter
2. Keep it concise, engaging, and in 2-3 short paragraphs
3. Format as markdown with "Dearest..." opening
4. Avoid robotic transitions
5. Focus on genuine human emotion`;

      const letterText = await generateContentWithRetry(prompt);
      return res.json({ letter: letterText });
    } catch (error: any) {
      console.warn("Letter generation fallback:", error.message);
      
      const pName = partnerName || "My Favorite Person";
      const uName = userName || "Your Love";
      
      const letterContent = `Dearest ${pName},\n\nLooking at this moment, my heart overflows with gratitude for you.\n\nEvery day with you is a gift, and I'm endlessly grateful for our journey together.\n\nWith all my heart,\n${uName}`;

      return res.json({ letter: letterContent, isFallback: true });
    }
  });

  // Storyteller Refinement Endpoint
  app.post("/api/storyteller/refine", aiLimiter, async (req, res) => {
    try {
      const { title, content, voice, userName, partnerName } = req.body;

      if (!title || !content || !voice) {
        return res.status(400).json({ error: "Title, content, and narrative voice are required" });
      }

      const titleValidation = validateTitle(title, 200);
      if (!titleValidation.isValid) {
        return res.status(400).json({ error: titleValidation.error });
      }

      const contentValidation = validatePromptInput(content, 5000);
      if (!contentValidation.isValid) {
        return res.status(400).json({ error: contentValidation.error });
      }

      const safeTitle = sanitizePromptString(title);
      const safeContent = sanitizePromptString(content);
      const safeVoice = sanitizePromptString(voice);

      const prompt = `Refine this story entry into emotionally rich narrative:
Title: "${safeTitle}"
Style: ${safeVoice}
Entry: "${safeContent}"

Create 2-3 beautiful paragraphs with vivid imagery while maintaining the original essence.`;

      const refinedStory = await generateContentWithRetry(prompt);
      return res.json({ story: refinedStory });
    } catch (error: any) {
      console.warn("Storyteller refinement fallback:", error.message);
      return res.json({ story: content, isFallback: true });
    }
  });

  // Chat Reply Endpoint
  app.post("/api/chat/reply", aiLimiter, async (req, res) => {
    try {
      const { messageText, style, userName } = req.body;

      if (!messageText) {
        return res.status(400).json({ error: "Message text is required" });
      }

      const msgValidation = validatePromptInput(messageText, 1000);
      if (!msgValidation.isValid) {
        return res.status(400).json({ error: msgValidation.error });
      }

      const safeName = sanitizePromptString(userName || 'my dearest');
      const safeMsg = sanitizePromptString(messageText);

      const prompt = `You are a loving, supportive romantic partner. Reply to this message in 1-2 sentences with style "${sanitizePromptString(style || 'cute')}": "${safeMsg}"`;

      const replyText = await generateContentWithRetry(prompt);
      return res.json({ reply: replyText.trim() });
    } catch (error: any) {
      console.warn("Chat reply fallback:", error.message);
      return res.json({ reply: "Aww, that is so sweet of you! Love you! 😘", isFallback: true });
    }
  });

  // Invitation Letter Endpoint
  app.post("/api/invite/generate", aiLimiter, async (req, res) => {
    try {
      const { senderName, nickname, inviteCode, vibe, highlights, designTemplate, appUrl } = req.body;

      const inviteValidation = validateInviteCode(inviteCode);
      if (!inviteValidation.isValid) {
        return res.status(400).json({ error: inviteValidation.error });
      }

      const senderValidation = validateTitle(senderName, 100);
      if (!senderValidation.isValid) {
        return res.status(400).json({ error: "Invalid sender name" });
      }

      const selectedTemplate = sanitizePromptString((designTemplate as string) || "classic");
      const targetUrl = appUrl || "https://ai.studio/build";

      const prompt = `Create a beautiful ForeverNote invitation from ${sanitizePromptString(senderName)} to ${sanitizePromptString(nickname)}.
Design: "${selectedTemplate}", Vibe: ${sanitizePromptString(vibe || 'heartwarming')}
Include invite code: "${inviteCode}"
Return as JSON with "letter" and "htmlLetter" fields.`;

      const responseText = await generateContentWithRetry(prompt);
      
      let cleanedJson = responseText.trim();
      if (cleanedJson.startsWith("```json")) cleanedJson = cleanedJson.substring(7);
      if (cleanedJson.startsWith("```")) cleanedJson = cleanedJson.substring(3);
      if (cleanedJson.endsWith("```")) cleanedJson = cleanedJson.substring(0, cleanedJson.length - 3);
      cleanedJson = cleanedJson.trim();

      try {
        const parsed = JSON.parse(cleanedJson);
        return res.json({ letter: parsed.letter, htmlLetter: parsed.htmlLetter });
      } catch (parseErr) {
        return res.json({ letter: responseText, htmlLetter: responseText, isFallback: true });
      }
    } catch (error: any) {
      console.warn("Invitation generation fallback:", error.message);
      return res.json({ letter: "ForeverNote invitation", htmlLetter: "<div>Invitation</div>", isFallback: true });
    }
  });

  // ========================================================================
  // STATIC FILE SERVING & SPA FALLBACK
  // ========================================================================

  let rootDir = "";
  try {
    rootDir = __dirname;
  } catch (e) {
    rootDir = process.cwd();
  }

  const distPath = rootDir.endsWith("dist") ? rootDir : path.join(rootDir, "dist");
  const hasBuildAssets = fs.existsSync(path.join(distPath, 'index.html'));
  
  const isProduction = 
    process.env.NODE_ENV === "production" || 
    (hasBuildAssets && process.env.DISABLE_HMR !== "true");

  console.log(`[Server Init] Mode: ${isProduction ? "Production" : "Development"}`);

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    app.get('*', async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (err: any) {
        vite.ssrFixStacktrace(err);
        next(err);
      }
    });
  } else {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // ========================================================================
  // ERROR HANDLING MIDDLEWARE
  // ========================================================================

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Error]', err.message);
    res.status(500).json({ 
      error: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message 
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🔒 Server running on http://0.0.0.0:${PORT} (Mode: ${isProduction ? "Production" : "Development"})`);
    if (process.env.NODE_ENV === "production") {
      console.log(`✅ Security: HTTPS enforced, Helmet enabled, Rate limiting active`);
    }
  });
}

startServer();
