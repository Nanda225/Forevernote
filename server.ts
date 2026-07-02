import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { 
  validatePromptInput, 
  sanitizePromptString, 
  validateTitle, 
  validateInviteCode, 
  sanitizeName, 
  validateRequestSize 
} from "./validation.js";

dotenv.config();

// Lazy-initialize the Gemini client to prevent crashes on startup if the API key is not yet configured.
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

// Resilient helper with automated exponential backoff retries and model failovers 
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
        
        // If it's a quota exceeded (429) or high demand / temporary availability issue (503),
        // we failover to the next available model immediately rather than waiting for retries.
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
          break; // Break current model's attempts loops and failover immediately
        }

        const isTransient = !err.status || err.status >= 500;
        if (!isTransient) {
          break; // break the inner attempt loop if it's a permanent configuration/syntax error
        }

        attempts--;
        if (attempts > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 1.8; // exponential backoff multiplier
        }
      }
    }
  }

  throw lastError || new Error("Failed to generate content after retries and fallback.");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable trust proxy for correct client IP detection behind Cloud Run reverse proxies
  app.enable("trust proxy");

  // Disable standard server footprint fingerprinting
  app.disable("x-powered-by");

  app.use(express.json());

  // 1. CORS Configuration with explicit white-listing
  const allowedOrigins = [
    "https://ais-dev-zurcbszlpln6mxvjm5ngqx-306030133164.asia-southeast1.run.app",
    "https://ais-pre-zurcbszlpln6mxvjm5ngqx-306030133164.asia-southeast1.run.app",
    "http://localhost:3000"
  ];
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    } else {
      res.setHeader("Access-Control-Allow-Origin", allowedOrigins[0]);
    }
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With,X-CSRF-Token");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // 2. HTTPS enforcement in production
  app.use((req, res, next) => {
    if (process.env.NODE_ENV === "production" && req.headers["x-forwarded-proto"] !== "https") {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
  });

  // 3. Helmet middleware with custom Content Security Policy and HSTS
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://apis.google.com", "https://*.googleapis.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://lh3.googleusercontent.com"],
        connectSrc: [
          "'self'", 
          "https://identitytoolkit.googleapis.com", 
          "https://securetoken.googleapis.com", 
          "https://firestore.googleapis.com",
          "https://*.googleapis.com",
          "https://ais-dev-zurcbszlpln6mxvjm5ngqx-306030133164.asia-southeast1.run.app",
          "https://ais-pre-zurcbszlpln6mxvjm5ngqx-306030133164.asia-southeast1.run.app"
        ],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        frameAncestors: ["'self'", "https://ai.studio", "https://*.google.com", "https://*.run.app"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));

  // 4. Anti-CSRF verification middleware for state-changing endpoints
  app.use((req, res, next) => {
    if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
      const origin = req.headers.origin;
      const referer = req.headers.referer;
      const allowedHosts = [
        "ais-dev-zurcbszlpln6mxvjm5ngqx-306030133164.asia-southeast1.run.app",
        "ais-pre-zurcbszlpln6mxvjm5ngqx-306030133164.asia-southeast1.run.app",
        "localhost:3000"
      ];
      
      let originHost = "";
      if (origin) {
        try {
          originHost = new URL(origin).host;
        } catch (e) {}
      }
      let refererHost = "";
      if (referer) {
        try {
          refererHost = new URL(referer).host;
        } catch (e) {}
      }

      const isValidOrigin = originHost && allowedHosts.includes(originHost);
      const isValidReferer = refererHost && allowedHosts.includes(refererHost);

      if (!isValidOrigin && !isValidReferer && process.env.NODE_ENV === "production") {
        return res.status(403).json({ error: "CSRF verification failed: invalid request source" });
      }
    }
    next();
  });

  // 5. Rate limiting for AI and input-intensive endpoints
  const aiRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // Limit each IP to 30 requests per windowMs
    message: { error: "Too many requests from this IP, please try again after 15 minutes." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  // Health check endpoint for Cloud Run and external monitoring status verification
  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // API Route for Letter Generation
  app.post("/api/letter/generate", aiRateLimiter, async (req, res) => {
    const sizeCheck = validateRequestSize(req.body);
    if (!sizeCheck.isValid) {
      return res.status(400).json({ error: sizeCheck.error });
    }

    const { title, type, date, description, style, userName, partnerName } = req.body;
    try {
      if (!title || !type || !description) {
        return res.status(400).json({ error: "Title, type, and description are required fields" });
      }

      // Input Validation & Sanitation
      const titleCheck = validateTitle(title);
      if (!titleCheck.isValid) {
        return res.status(400).json({ error: `Invalid Title: ${titleCheck.error}` });
      }

      const descCheck = validatePromptInput(description);
      if (!descCheck.isValid) {
        return res.status(400).json({ error: `Invalid Description: ${descCheck.error}` });
      }

      const cleanUserName = sanitizeName(userName);
      const cleanPartnerName = sanitizeName(partnerName);
      const cleanTitle = sanitizePromptString(title);
      const cleanType = sanitizePromptString(type);
      const cleanDate = sanitizePromptString(date || 'special day');
      const cleanStyle = sanitizePromptString(style || 'Romantic');
      const cleanDescription = sanitizePromptString(description);

      const prompt = `Write a deeply personalized relationship milestone greeting/letter from ${cleanUserName} to their partner ${cleanPartnerName} celebrating the milestone "${cleanTitle}" (Type: ${cleanType}, Date: ${cleanDate}).
      Here is the story/description of what happened: "${cleanDescription}".
      
      Generate it in a style that is ${cleanStyle}.
      
      Requirements:
      1. Write it as a heartfelt, organic letter, addressed from ${userName || 'me'} to ${partnerName || 'my favorite person'}.
      2. If style is "Romantic", make it warm, poetic, authentic, and classic.
      3. If style is "Playful", make it bubbly, fun, and warm.
      4. If style is "Cute", make it adorable, sweet, and simple.
      5. If style is "Nostalgic", make it highly sentimental, looking back at the journey.
      6. If style is "Sarcastic", make it witty, slightly teasing, but secretly deeply loving.
      7. If style is "GenZ Slang", make it include GenZ slang/slanguage (e.g. "no cap", "rent free", "slay", "rizz", "era", "lowkey", etc.) in a hilarious and adorable relationship way.
      8. Keep it concise, engaging, and in 2-3 short, beautifully written paragraphs.
      9. Format the response as a clear markdown document (e.g., matching letter structure with "Dearest..." and "Love,...").
      10. STRICTLY AVOID typical computer-like transitions and robotic phrases (DO NOT write: "As we embark on this new chapter", "Our journey is a testament to", "My love for you grows", or similar clichés).
      11. Focus on specific, raw, genuine human emotion. Make it feel as if a real person sat down late at night with a pen and scrap paper, pouring their truest feelings out of their chest.`;

      const letterText = await generateContentWithRetry(prompt);
      return res.json({ letter: letterText });
    } catch (error: any) {
      console.warn("Generating letter fallback due to API limit or error:", error);
      
      const pName = partnerName || "My Favorite Person";
      const uName = userName || "Your Love";
      const dateStr = date ? `on ${date}` : "on our special day";
      const lowerStyle = (style || "Romantic").toLowerCase();
      
      let letterContent = "";
      if (lowerStyle.includes("sarcastic") || lowerStyle.includes("witty")) {
        letterContent = `Dearest ${pName},

So, we actually made it to "${title}" ${dateStr}. Honestly, I'm just as surprised as you are. 

Considering how much you steal the blankets or chew with your mouth half-open, it's basically a scientific miracle! But in all seriousness, under all this teasing, you know I wouldn't trade our quiet, weird, and lovely moments for anything in the universe. Thank you for putting up with my quirks too. 

Love,
${uName}`;
      } else if (lowerStyle.includes("playful") || lowerStyle.includes("cute")) {
        letterContent = `Dearest ${pName},

Happy "${title}"! Can you believe it's been this long since our special moment ${dateStr}? 

Every single day with you is filled with so many silly giggles, sweet cuddles, and endless warm smiles. I'm so lucky to have you to share all my weird thoughts and warm coffees with. You really are my favorite human bean! 🌟 Thank you for keeping life so colorful.

Gigantic hugs and kisses,
${uName}`;
      } else if (lowerStyle.includes("genz") || lowerStyle.includes("slang")) {
        letterContent = `Dearest ${pName},

Happy "${title}"! Lowkey, you've been living rent-free in my head since ${dateStr}, and honestly, it's the absolute best vibe ever. No cap.

You have the ultimate rizz and you make my heart do backflips in our cozy little era. Thanks for being the main character in my life and always matching my energy perfectly. We are built different. 💅

With infinite love,
${uName}`;
      } else if (lowerStyle.includes("nostalgic") || lowerStyle.includes("sentence")) {
        letterContent = `Dearest ${pName},

Looking back to "${title}" ${dateStr}, my heart swells with a soft nostalgia. It feels like just yesterday we were taking those first tentative steps together, not knowing how deep our roots would grow.

Every memory we've collected since then has become a precious vintage chapter in my soul's scrapbooks. Thank you for holding my hand through every transition, every cold winter night, and every bright summer morning. You are my anchor.

Sentimental memories,
${uName}`;
      } else {
        // Romantic / default style
        letterContent = `Dearest ${pName},

Looking back at "${title}" ${dateStr}, my heart still overflows with the warmest joy. I remember how everything felt so right, how your laughter instantly felt like home, and how the rest of the world just drifted away into the background.

Every day by your side is a gift. You bring so much light, peace, and deep love into my life. Through every season, every laugh, and every quiet evening, I am so incredibly grateful to capture these beautiful times together with you.

With all my heart,
${uName}`;
      }

      return res.json({ 
        letter: letterContent,
        isFallback: true 
      });
    }
  });

  // API Route for Creative Storyteller Refinement
  app.post("/api/storyteller/refine", aiRateLimiter, async (req, res) => {
    const sizeCheck = validateRequestSize(req.body);
    if (!sizeCheck.isValid) {
      return res.status(400).json({ error: sizeCheck.error });
    }

    const { title, content, voice, userName, partnerName } = req.body;
    try {
      if (!title || !content || !voice) {
        return res.status(400).json({ error: "Title, content, and narrative voice are required" });
      }

      // Input Validation & Sanitation
      const titleCheck = validateTitle(title);
      if (!titleCheck.isValid) {
        return res.status(400).json({ error: `Invalid Title: ${titleCheck.error}` });
      }

      const contentCheck = validatePromptInput(content);
      if (!contentCheck.isValid) {
        return res.status(400).json({ error: `Invalid Content: ${contentCheck.error}` });
      }

      const cleanUserName = sanitizeName(userName);
      const cleanPartnerName = sanitizeName(partnerName);
      const cleanTitle = sanitizePromptString(title);
      const cleanVoice = sanitizePromptString(voice || 'Bard of Love');
      const cleanContent = sanitizePromptString(content);

      const prompt = `You are the master resident Storyteller inside the ForeverNote relationship scrapbook.
Your role is to take raw draft journal entries, notes, or memories written by a user and elevate them into a stunning, emotionally rich, literary narrative.

Narrator: ${cleanUserName}
Written for/about: ${cleanPartnerName}
Title: "${cleanTitle}"
Selected Literary Style: ${cleanVoice}

Raw Draft Entry:
"${cleanContent}"

Please craft the refined story according to the following guidelines:
1. Maintain the soul, facts, and emotional Core of the user's raw entry, but use exquisite vocabulary, flow, and visual imagery.
2. If style is "Bard of Love": Write like a soft, classic romantic poet. Emphasize warm glances, heartbeats, gentle touches, and eternal devotion.
3. If style is "Vintage Novelist": Write in the third or first person with rich prose, classic structure, atmospheric metaphors, as if it's a chapter from an antique leather-bound romance novel.
4. If style is "Modern Screenplay": Write it with cinematic scene setup, dialog annotations, and sensory details, focusing heavily on imagery, ambient lighting, and action beats (e.g. "We see the neon lights casting pink halos...").
5. If style is "Dreamy Poetic Whisper": Write it in a surreal, magical-realism prose style. Focus on stars, cosmic orbits, starlight, rivers, and the feeling that their connection lives inside a starry dream.
6. Make the story engaging and high-density, around 2-3 short, highly-aesthetic paragraphs.
7. Format the response beautifully using clean markdown structure. Use subtle titles or literary dividers.
8. NEVER use robotic transitions (e.g., "In conclusion", "As they looked ahead", "Their journey is a testament..."). Let it feel deeply organic, raw, and human.`;

      const refinedStory = await generateContentWithRetry(prompt);
      return res.json({ story: refinedStory });
    } catch (error: any) {
      console.warn("Storyteller refinement used local fallback:", error);
      
      const vName = voice || "Bard of Love";
      let headerPrefix = "✨ A Refined Memory ✨";
      if (vName.includes("Dreamy")) headerPrefix = "🌌 A Dreamy Cosmic Tale 🌌";
      else if (vName.includes("Vintage")) headerPrefix = "📖 A Vintage Chapter 📖";
      else if (vName.includes("Screenplay")) headerPrefix = "🎬 A Cinematic Scene 🎬";

      const refinedContent = `### ${headerPrefix}

**Title:** ${title}
*Told in the voice of the ${vName}*

${content}

---
*Captured inside our shared capsule. May this spark of memory live forever in our scrapbooks.*`;

      return res.json({ 
        story: refinedContent,
        isFallback: true
      });
    }
  });

  // API Route for Simulated Partner message replies via Gemini
  app.post("/api/chat/reply", aiRateLimiter, async (req, res) => {
    const sizeCheck = validateRequestSize(req.body);
    if (!sizeCheck.isValid) {
      return res.status(400).json({ error: sizeCheck.error });
    }

    const { messageText, style, userName } = req.body;
    try {
      if (!messageText) {
        return res.status(400).json({ error: "Message text is required" });
      }

      // Input Validation & Sanitation
      const msgCheck = validatePromptInput(messageText);
      if (!msgCheck.isValid) {
        return res.status(400).json({ error: `Invalid Message: ${msgCheck.error}` });
      }

      const cleanUserName = sanitizeName(userName);
      const cleanStyle = sanitizePromptString(style || 'cute');
      const cleanMessageText = sanitizePromptString(messageText);

      const prompt = `You are Liam, a deeply loving, supportive, and playful romantic partner. 
      Your special person ${cleanUserName} just sent you this private message in our cozy space: "${cleanMessageText}".
      
      Please reply to them in a way that matches the style style "${cleanStyle}".
      
      Requirements:
      1. Write a short, highly conversational response (1-2 short sentences maximum).
      2. Support a warm relationship feel, adding appropriate custom emojis (hearts, stars, hugs, etc.).
      3. Focus entirely on their message — react with genuine emotion, humor, or affection.
      4. Strive for absolute organic playfulness and heartwarming closeness. Avoid standard robotic AI transitions.`;

      const replyText = await generateContentWithRetry(prompt);
      return res.json({ reply: replyText.trim() });
    } catch (error: any) {
      console.warn("Chat reply used local fallback:", error);
      
      const msgLower = messageText.toLowerCase();
      let replyText = "Aww, that is so sweet of you! Love you! 😘";
      
      if (msgLower.includes("love") || msgLower.includes("heart") || msgLower.includes("dearest")) {
        replyText = `I love you so much more! You're my absolute world and my greatest joy. ❤️`;
      } else if (msgLower.includes("hello") || msgLower.includes("hi") || msgLower.includes("hey")) {
        replyText = `Hey there, my favorite person! Hope you're having the most wonderful day. 😊✨`;
      } else if (msgLower.includes("how are you") || msgLower.includes("doing")) {
        replyText = `I'm doing absolutely great, especially now that I'm talking to you! How is your day going? 💕`;
      } else if (msgLower.includes("night") || msgLower.includes("sleep") || msgLower.includes("dream")) {
        replyText = `Goodnight, my love! Dream of me and sleep tight. Can't wait to talk to you tomorrow. 🌙💤`;
      } else if (msgLower.includes("miss") || msgLower.includes("wish")) {
        replyText = `I miss you like crazy too! Sending you the biggest, warmest hug right now. 🤗💋`;
      } else {
        const fallbacks = [
          "My heart skips a beat when I read your words. Forever grateful to have you! ❤️",
          "You make my world so incredibly beautiful. Hugs and kisses! 💋",
          "That means the absolute world to me. Love you to the moon and back! 🌙✨",
          "You're my absolute favorite human. Can't wait for our next adventure! 🚂",
          "Aww, that put the biggest smile on my face! You are the absolute sweetest. 🥰"
        ];
        replyText = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      }

      return res.json({ 
        reply: replyText,
        isFallback: true
      });
    }
  });

  // API Route for Generating Heartfelt Invitation Letters with handwritten formatting & custom email template designs
  app.post("/api/invite/generate", aiRateLimiter, async (req, res) => {
    const sizeCheck = validateRequestSize(req.body);
    if (!sizeCheck.isValid) {
      return res.status(400).json({ error: sizeCheck.error });
    }

    const { senderName, nickname, inviteCode, vibe, highlights, designTemplate, appUrl } = req.body;

    const cleanSenderName = sanitizeName(senderName);
    const cleanNickname = sanitizeName(nickname);
    const cleanInviteCode = sanitizePromptString(inviteCode || '');
    const cleanVibe = sanitizePromptString(vibe || 'romantic');
    const cleanDesignTemplate = sanitizePromptString(designTemplate || 'classic');
    const cleanAppUrl = sanitizePromptString(appUrl || 'https://ai.studio/build');

    try {
      if (!inviteCode) {
        return res.status(400).json({ error: "Invite code is required to generate the invitation letter" });
      }

      // Input Validation & Sanitation
      const codeCheck = validateInviteCode(inviteCode);
      if (!codeCheck.isValid) {
        return res.status(400).json({ error: `Invalid Invite Code: ${codeCheck.error}` });
      }

      const safeHighlights = Array.isArray(highlights)
        ? highlights.map(h => sanitizePromptString(String(h)))
        : [];

      const selectedTemplate = cleanDesignTemplate;
      const targetUrl = cleanAppUrl;

      const vibeDesc = {
        "romantic": "deeply romantic, filled with warm emotional butterflies and poetic whispers",
        "playful": "bubbly, high-energy, exciting, filled with cute tease, inside jokes and sweet giggles",
        "cute": "cute, sweet, adorable, simple, extremely heartwarming and warm",
        "nostalgic": "sentimental, nostalgic, looking back on beautiful memories and look forward to capturing forever",
        "mysterious": "cozily mysterious, playful teaser, suggesting a special undercover digital lounge"
      }[cleanVibe] || "heartwarming, excited, and coziest handwriting style";

      const highlightsList = safeHighlights.length > 0 
        ? safeHighlights.join(", ") 
        : "private milestones, secure secret messages, sweet countdown reminders, and a shared space";

      const prompt = `You are a legendary relationship visual designer and master emotional calligrapher helping someone invite their loved one to a private digital couple's sanctuary called ForeverNote.
Write an exceptionally beautiful, engaging, and exciting invitation from ${cleanSenderName} to their dearest ${cleanNickname}.

We want this invitation to feel extremely interesting, creative, and utterly distinct from a standard boring email!

The design template selected is "${selectedTemplate}".
The active web link to open and join ForeverNote is: "${targetUrl}"
Describe these app sanctuary details organically:
- ForeverNote is a highly secure, private digital scrapbook & safe place built exclusively for the two of them.
- Selected highlighted features: ${highlightsList}.
- They need to copy and paste this unique Core Connection Invite Code: "${inviteCode}" to link their dashboards forever.

Generate the response in a JSON model strictly containing two fields:
{
  "letter": "A stunning, personalized plain-text invitation letter. It MUST use creative ASCII-art headers/dividers, cute emoji decorations, and custom borders suited for the template theme (e.g. customized train/flight ticket frames for 'ticket', vintage typewriter dashes for 'telegram', floral/polaroid layout styling for 'scrapbook', or cozy cosmic stars for 'cyber'). Keep the prose deeply authentic, warm, and in the tone of: ${vibeDesc}. Include the connection code: '${inviteCode}' and the join link URL: '${targetUrl}' clearly visible inside the plain-text letter to join. Strictly avoid cliché corporate phrases or generic intro statements. Include custom quirks like '(smiles while typing this)' or customized p.s. tags.",
  "htmlLetter": "A fully responsive, highly stylish HTML email template with custom INLINE CSS styling. Include beautiful container backgrounds (warm pastel pink for romantic, beige scroll texture for telegram, soft grid lines for scrapbook, deep indigo space background with glowing border for cyber), elegant display card grids, stylized tables or floating badges, decorated custom bullet points for highlighted features, a clear highlight box for the invite code '${inviteCode}', and a styled 'Join Our Shared World' button that points exactly to the web app URL: '${targetUrl}'. Make it look like a pristine premium designer greeting card."
}

Ensure the response is a standard, parseable JSON object. Do not wrap with markdown code fences unless standard raw text. ONLY output the valid JSON object string.

Template Guide specs:
- "ticket": Boarding pass to destiny / Love Train Ticket theme. (e.g. Destination: Our Forever Sanctuary, Class: Ultimate Romance, Seat: Right next to me).
- "telegram": Retro 1920s telegraph layout. (MESSAGE URGENT STOP - FOUND THE LOVELIEST PLACE STOP - SENDING KEY CODE STOP).
- "scrapbook": Warm cursive notes with polaroid borders, heart stickers, memories and doodles.
- "cyber": Cozy neon cyber world code blueprint design with stars, terminal echoes, and cosmic grids.`;

      const responseText = await generateContentWithRetry(prompt);
      
      // Attempt to clean up and parse JSON
      let cleanedJson = responseText.trim();
      if (cleanedJson.startsWith("```json")) {
        cleanedJson = cleanedJson.substring(7);
      }
      if (cleanedJson.startsWith("```")) {
        cleanedJson = cleanedJson.substring(3);
      }
      if (cleanedJson.endsWith("```")) {
        cleanedJson = cleanedJson.substring(0, cleanedJson.length - 3);
      }
      cleanedJson = cleanedJson.trim();

      try {
        const parsed = JSON.parse(cleanedJson);
        return res.json({
          letter: parsed.letter,
          htmlLetter: parsed.htmlLetter
        });
      } catch (parseErr) {
        console.warn("Fallback to literal response parsing:", parseErr);
        // Fallback layout if JSON parse failed
        return res.json({
          letter: responseText,
          htmlLetter: `<div style="font-family: sans-serif; padding: 25px; border-radius: 16px; background-color: #fffaf0; border: 2px dashed #ffb6c1; text-align: center;">
            <h2 style="color: #db2777; margin-bottom: 8px;">💖 ForeverNote Invitation 💖</h2>
            <p style="font-size: 14px; color: #4b5563; line-height: 1.6;">${responseText.replace(/\n/g, '<br>')}</p>
            <div style="background-color: #fff; padding: 12px; border-radius: 12px; border: 1px solid #ffd1dc; margin: 15px auto; display: inline-block; font-weight: bold; font-size: 16px; color: #db2777;">
              Invite Code: ${cleanInviteCode}
            </div>
          </div>`
        });
      }
    } catch (error: any) {
      console.warn("Invitation letter used local fallback:", error);
      
      const sName = cleanSenderName || "Your loved one";
      const pName = cleanNickname || "My favorite person";
      const code = cleanInviteCode;
      const targetUrl = cleanAppUrl;
      
      const letterText = `💌 COZY INVITATION TO OUR SHARED SANCTUARY 💌

Dearest ${pName},

I have built a private, secure digital scrapbook and coziest safe place made exclusively for the two of us, called ForeverNote! 💖

In our shared space, we can:
✨ Keep a beautiful live-updating memories scrapbook & timeline
✨ Exchange sweet countdowns for our special relationship days
✨ Coordinate our wishes in a secure shared vault
✨ Send secret personal cards to each other's dashboards

To connect our dashboards forever, open this link:
👉 ${targetUrl}

And enter our custom Connection Invite Code:
🔑 ${code}

I can't wait to fill this beautiful space with our love, stories, and laughter. See you inside, dearest!

With all my love,
${sName}`;

      const htmlText = `<div style="font-family: sans-serif; max-width: 600px; margin: 20px auto; padding: 30px; border-radius: 24px; background-color: #fffafb; border: 2px solid #fecdd3; box-shadow: 0 4px 20px rgba(225, 29, 72, 0.05); text-align: left;">
        <div style="text-align: center; margin-bottom: 25px;">
          <span style="font-size: 40px;">💌</span>
          <h2 style="color: #db2777; margin: 10px 0 5px 0; font-family: sans-serif; font-weight: 800;">Our Shared Sanctuary Awaits</h2>
          <p style="color: #6b7280; font-size: 14px; margin: 0;">An exclusive invite to join <strong>ForeverNote</strong></p>
        </div>
        
        <p style="font-size: 15px; color: #374151; line-height: 1.6; margin-bottom: 20px;">
          Dearest ${pName},
        </p>
        
        <p style="font-size: 15px; color: #374151; line-height: 1.6; margin-bottom: 20px;">
          I've created a beautiful private sanctuary for us to co-author our relationship journey, save our sweetest milestone moments, and send countdown thoughts to one another.
        </p>
        
        <div style="background-color: #ffffff; padding: 20px; border-radius: 16px; border: 1px solid #ffe4e6; margin-bottom: 25px;">
          <h4 style="color: #be185d; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Our Cozy Features</h4>
          <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 13.5px; line-height: 1.6;">
            <li>Private romantic memories timeline</li>
            <li>Real-time custom milestone countdowns</li>
            <li>Secure shared scrapbook wishes vault</li>
            <li>Encrypted chat space on our dashboards</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin-bottom: 25px;">
          <p style="color: #4b5563; font-size: 13px; margin-bottom: 8px;">Copy and paste this connection code inside the app to link:</p>
          <div style="background-color: #fce7f3; color: #db2777; padding: 12px 24px; border-radius: 12px; font-family: monospace; font-weight: bold; font-size: 18px; display: inline-block; letter-spacing: 0.1em; border: 1px dashed #f472b6;">
            ${code}
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 10px;">
          <a href="${targetUrl}" target="_blank" style="background-color: #db2777; color: #ffffff; padding: 14px 30px; border-radius: 16px; text-decoration: none; font-weight: bold; font-size: 15px; display: inline-block;">
            Join Our Shared World 💖
          </a>
        </div>
      </div>`;

      return res.json({ 
        letter: letterText,
        htmlLetter: htmlText,
        isFallback: true
      });
    }
  });

  // Robust environment and path detection using dynamic evaluation.
  let rootDir = "";
  try {
    rootDir = __dirname;
  } catch (e) {
    rootDir = process.cwd();
  }

  // If the directory of the file is 'dist', then the static built assets reside in the same folder.
  // Otherwise, they reside in the 'dist' subfolder.
  const distPath = rootDir.endsWith("dist") ? rootDir : path.join(rootDir, "dist");
  const hasBuildAssets = fs.existsSync(path.join(distPath, 'index.html'));
  
  // We are in production if we are running the compiled/bundled production script,
  // or if built assets exist, NODE_ENV is "production", and we are not in the AI Studio local dev workspace (which sets DISABLE_HMR=true).
  // If build assets do not exist, we MUST use Vite development mode to prevent "Page not found" / 404 errors.
  const isRunningProductionBundle = !!(process.argv[1] && (process.argv[1].endsWith("server.cjs") || process.argv[1].includes("dist")));
  const isProduction = 
    isRunningProductionBundle || 
    (hasBuildAssets && process.env.NODE_ENV === "production" && process.env.DISABLE_HMR !== "true");

  console.log(`[Server Initialization] Paths: rootDir=${rootDir}, distPath=${distPath}, hasBuildAssets=${hasBuildAssets}, DISABLE_HMR=${process.env.DISABLE_HMR}, NODE_ENV=${process.env.NODE_ENV} -> isProduction=${isProduction}`);

  if (!isProduction) {
    console.log("[Server Initialization] Starting in DEVELOPMENT mode with Vite live middleware.");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    // Catch-all route for SPA fallback in development mode
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
    console.log(`[Server Initialization] Starting in PRODUCTION mode. Serving static assets from: ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT} (Mode: ${isProduction ? "Production" : "Development"})`);
  });
}

startServer();
