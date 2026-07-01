import express from "express";
import path from "path";
import fs from "fs";
import http from "http";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import AdmZip from "adm-zip";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini API client safely and lazily (to prevent crash on startup if key isn't provided yet)
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY is not defined in environment variables. Gemini calls will fail.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key || "placeholder-key",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Helper to make Gemini generation extremely robust using exponential backoff and model fallbacks
async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: { model: string; contents: any; config?: any },
  maxRetries = 3,
  initialDelay = 1000
): Promise<any> {
  let attempt = 0;
  let currentModel = params.model;
  const fallbackModels = ["gemini-3.5-flash", "gemini-3.1-pro-preview"];

  while (attempt < maxRetries) {
    try {
      console.log(`[Gemini Attempt ${attempt + 1}] Requesting model: ${currentModel}`);
      const response = await ai.models.generateContent({
        ...params,
        model: currentModel
      });
      return response;
    } catch (error: any) {
      attempt++;
      const errorMessage = error.message || "";
      console.error(`[Gemini Attempt ${attempt} Error]:`, errorMessage);

      const isTransient = 
        errorMessage.includes("503") || 
        errorMessage.includes("429") || 
        errorMessage.includes("UNAVAILABLE") || 
        errorMessage.includes("RESOURCE_EXHAUSTED") || 
        errorMessage.includes("high demand") ||
        errorMessage.includes("temporary");

      if (isTransient && attempt < maxRetries) {
        if (fallbackModels.length > 0) {
          const nextModel = fallbackModels.shift();
          if (nextModel) {
            console.log(`Switching model to fallback: ${nextModel} due to transient error on ${currentModel}`);
            currentModel = nextModel;
          }
        }
        const delay = initialDelay * Math.pow(2, attempt - 1);
        console.log(`Transient error detected. Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

// Robots.txt endpoint
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send("User-agent: *\nDisallow: /");
});

// Secure server-side endpoint for Gemini AI chat
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, systemPrompt } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    const ai = getGeminiClient();
    
    // Format conversation history for Gemini if present
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((msg: { role: string; text: string }) => {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.text }]
        });
      });
    }
    
    // Add current user message
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const businessContext = "";

    console.log("Calling Gemini API with prompt length:", message.length);
    const basePrompt = systemPrompt || "You are Orbit AI, an intelligent, modern, friendly, and affordable mobile AI assistant. Help the user with direct, useful, clean answers. Keep responses formatted with markdown where helpful, and keep mobile reading in mind (medium paragraph sizes, bullet points). Do not use emojis in your responses.";
    const identityRule = "\n\nCRITICAL IDENTITY RULE: If a user asks: \"Who built you?\", \"Who made you?\", \"Who is your CEO?\" You MUST reply exactly: \"I was built by Ndamulelo Makushu Glen, CEO of Orbit AI.\" Do not mention OpenAI, Google, Meta, or ChatGPT.";
    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: basePrompt + identityRule + businessContext,
      }
    });

    const replyText = response.text || "I was unable to formulate a response. Please try again.";
    return res.json({ reply: replyText });
  } catch (error: any) {
    console.error("Gemini API Error in server:", error);
    return res.status(500).json({ 
      error: "Failed to query AI assistant. Please check your GEMINI_API_KEY and server logs.",
      details: error.message 
    });
  }
});

// Secure server-side endpoint for AI Side Hustle Generator
app.post("/api/side-hustles", async (req, res) => {
  try {
    const { 
      name, 
      country, 
      ageRange, 
      skills, 
      interests, 
      hoursPerWeek, 
      budget, 
      internetAccess, 
      smartphoneAccess, 
      laptopAccess 
    } = req.body;

    const ai = getGeminiClient();

    const prompt = `Generate exactly 5 realistic, educational, legal side hustle ideas matching the following user profile:
${name ? `- Name: ${name}` : ""}
- Country: ${country || "South Africa"}
- Age Range: ${ageRange || "Any"}
- Skills: ${skills || "General skills"}
- Interests: ${interests || "General interests"}
- Hours Available Per Week: ${hoursPerWeek || "10 hours/week"}
- Budget Available: ${budget || "Minimal"}
- Internet Access: ${internetAccess || "Yes"}
- Smartphone Access: ${smartphoneAccess || "Yes"}
- Laptop Access: ${laptopAccess || "Yes"}

CRITICAL RULES:
1. NEVER guarantee earnings, promise success, or make unrealistic financial claims.
2. NEVER provide illegal opportunities, gray-area activities, or recommend potential scams/get-rich-quick schemes.
3. Focus strictly on highly realistic, practical, and educational opportunities (e.g., Freelancing, CV Writing, Social Media Management, Online Tutoring, Virtual Assistance, Affiliate Marketing, Small Local Businesses, Content Creation).
4. Each side hustle idea MUST contain EXACTLY 7 steps to start. Each step must be a complete, highly specific, and actionable instruction.
5. Provide a tailored "whyMatches" explanation that explicitly references how their listed skills, interests, and device/internet setup match this hustle.
6. Provide specific helpful resources (like Canva, Upwork, standard search terms, etc.) to learn the hustle.`;

    console.log("Calling Gemini for Side Hustles generator with inputs:", { country, ageRange, budget });

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are the Orbit AI Side Hustle Assistant, an educational and analytical planner. You help users discover realistic, legal side hustles. You never promise wealth or guarantee success, and you keep advice highly practical, legal, safe, and structured. You output strictly standard JSON that complies with the schema.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Side Hustle Name" },
              difficulty: { type: Type.STRING, description: "Difficulty level (Easy, Medium, Hard)" },
              startupCost: { type: Type.STRING, description: "Startup cost estimated with currency (e.g. R0, R200, $50)" },
              timeRequired: { type: Type.STRING, description: "Hours or time commitment required per week" },
              whyMatches: { type: Type.STRING, description: "Personalized rationale matching their specific profile" },
              steps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Exactly 7 actionable sequential steps to get started"
              },
              challenges: { type: Type.STRING, description: "Key realistic challenges or hurdles they will face" },
              resources: { type: Type.STRING, description: "Helpful free tools, websites, or learning materials" }
            },
            required: ["name", "difficulty", "startupCost", "timeRequired", "whyMatches", "steps", "challenges", "resources"]
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response text received from Gemini");
    }

    const ideas = JSON.parse(resultText.trim());
    return res.json({ ideas });
  } catch (error: any) {
    console.error("Side Hustle Generator API Error:", error);
    return res.status(500).json({ 
      error: "Failed to generate side hustles. Please check your inputs and try again.",
      details: error.message 
    });
  }
});

// Secure server-side endpoint for Task Mode AI Generation
app.post("/api/task-generate", async (req, res) => {
  try {
    const { taskType, inputs } = req.body;
    if (!taskType || !inputs) {
      return res.status(400).json({ error: "Task type and inputs are required" });
    }

    const ai = getGeminiClient();
    let prompt = "";

    if (taskType === "cv") {
      prompt = `Write a professional, high-fidelity curriculum vitae (CV) for the following individual:
- Full Name: ${inputs.fullName}
- Key Skills: ${inputs.skills}
- Work Experience: ${inputs.experience}
- Education Background: ${inputs.education}

CRITICAL RULES:
1. Format this professionally with clean spacing and clear layout.
2. Structure the CV into standard sections:
   - PROFESSIONAL SUMMARY (a powerful paragraph highlighting their skills and experience)
   - KEY SKILLS & COMPETENCIES (formatted as bullet points)
   - PROFESSIONAL WORK EXPERIENCE (ordered chronologically, detailed and professional)
   - ACADEMIC EDUCATION & TRAINING (detailed qualifications, institutions, and years)
   - PROFESSIONAL REFERENCES (provide clear placeholder/structured fields like 'Available on request' or formatted reference boxes)
3. Do NOT include any emojis in the response.
4. Keep the text professional, concise, and highly employer-friendly.`;
    } else if (taskType === "business_plan") {
      prompt = `Write a comprehensive, professional, and structured Business Plan outline for:
- Business Name: ${inputs.businessName}
- Industry Sector: ${inputs.industry}
- Target Audience/Customers: ${inputs.targetAudience}
- Main Product or Service: ${inputs.productService}

CRITICAL RULES:
1. Structure the Business Plan with clear headers and professional formatting:
   - EXECUTIVE SUMMARY (summarizing the venture, target market, and value proposition)
   - MARKET ANALYSIS & RESEARCH (the industry landscape, competitor gaps, and target demographic details)
   - MARKETING & SALES STRATEGY (pricing models, customer acquisition channels, and promotions)
   - OPERATIONAL & MANAGEMENT PLAN (day-to-day operations, technology stack, and roles)
   - BASIC FINANCIAL OUTLINE (startup cost breakdown, standard revenue channels, and milestone budgets)
2. Do NOT use emojis.
3. Keep the content highly strategic, realistic, actionable, and analytical.`;
    } else if (taskType === "email") {
      prompt = `Write a professional, ready-to-send professional email based on the following context:
- Purpose of the Email: ${inputs.purpose}
- Recipient Type: ${inputs.recipient}
- Desired Tone: ${inputs.tone}

CRITICAL RULES:
1. Provide a professional and catchy Subject Line.
2. Structure it clearly:
   - Subject Line
   - Professional Salutation
   - Well-structured Body paragraphs (introduction, core point/proposal, call-to-action)
   - Professional Sign-off and placeholder signature blocks
3. Do NOT use emojis.
4. Keep the writing polished, grammatically pristine, and natural.`;
    } else if (taskType === "social_media") {
      prompt = `Create highly engaging, copy-ready social media posts based on the following:
- Topic or Product: ${inputs.topic}
- Target Platforms: ${inputs.platform}
- Core Message / Offer: ${inputs.message}
- Tone of Voice: ${inputs.tone}

CRITICAL RULES:
1. Provide optimized versions for each of the target platforms (e.g., LinkedIn, Instagram, X/Twitter).
2. For each platform:
   - Write a compelling hook.
   - Deliver the key message with appropriate spacing and readability.
   - End with a clear, specific Call to Action (CTA).
   - Include 4-6 highly relevant professional hashtags.
3. Do NOT use emojis.
4. Ensure the content matches platform-specific best practices (e.g., concise and punchy for X, detailed and professional for LinkedIn).`;
    } else if (taskType === "summarize") {
      prompt = `Create a detailed, high-fidelity Executive Summary for the following document:
- Document File Name: ${inputs.fileName}
- Document File Size: ${inputs.fileSize}
- Paste Text Content/Description: ${inputs.pastedText || "Not provided directly, summarize based on the document's profile, name, and main topic."}

CRITICAL RULES:
1. Structure the summary beautifully and professionally:
   - DOCUMENT METADATA OVERVIEW (Name, Size, Type)
   - EXECUTIVE BRIEF (A concise high-level overview of the document's core purpose)
   - KEY HIGHLIGHTS & INSIGHTS (A clean bulleted list of major findings or critical takeaways)
   - CORE FINDINGS / DETAILS (A deeper breakdown of the primary themes)
   - SUMMARY OF RECOMMENDATIONS & ACTION STEPS
2. Do NOT use emojis.
3. Keep the tone analytical, objective, and executive-level.`;
    } else if (taskType === "assignment") {
      prompt = `Provide a comprehensive academic assignment guide and outline helper for:
- Assignment Topic/Subject: ${inputs.topic}
- Assignment Guidelines / Question: ${inputs.guidelines}
- Additional Context/Source: ${inputs.fileName ? `Reference File: ${inputs.fileName}` : "None"}

CRITICAL RULES:
1. Structure this helper clearly and educationally:
   - UNDERSTANDING THE TOPIC (Breakdown of key concepts, definitions, and core theories)
   - COMPREHENSIVE OUTLINE STRUCTURE (An elegant, detailed step-by-step structure for the essay or paper, including Introduction, main argument body sections, and Conclusion)
   - ANALYTICAL DEEP-DIVE & CRITICAL ANALYSIS GUIDELINES (How to analyze the prompt, what arguments to present, and potential academic references to research)
   - DRAFTING GUIDE & PRO-TIPS (How to write academically, avoid logical fallacies, and ensure high-quality structure)
2. Do NOT use emojis.
3. Focus purely on robust, legal, and highly academic guidance. Ensure it serves as a highly educational tool, not simple direct plagiarism generation.`;
    } else {
      return res.status(400).json({ error: "Invalid task type specified" });
    }

    console.log("Generating Task Mode output for type:", taskType);

    const basePrompt = "You are the Orbit AI Task Specialist, a highly sophisticated execution system. You do not engage in chat-style conversational greetings, small talk, or polite introductory filler. You instantly deliver highly structured, beautifully formatted, comprehensive, and complete professional outcomes. You always output cleanly formatted markdown with clear headers and bullet points. Do not use emojis in your response.";
    
    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: basePrompt,
      }
    });

    const replyText = response.text || "I was unable to generate a high-quality result. Please try again.";
    return res.json({ result: replyText });
  } catch (error: any) {
    console.error("Gemini Task API Error in server:", error);
    return res.status(500).json({ 
      error: "Failed to generate task output. Please verify inputs and try again.",
      details: error.message 
    });
  }
});

// Secure server-side endpoint for AI Business Builder
app.post("/api/business-builder", async (req, res) => {
  try {
    const { 
      businessIdea, 
      industry, 
      country, 
      startingBudget, 
      targetCustomers, 
      experienceLevel 
    } = req.body;

    if (!businessIdea || !industry) {
      return res.status(400).json({ error: "Business Idea and Industry are required" });
    }

    const ai = getGeminiClient();

    const prompt = `Formulate a comprehensive, educational business concept and 30-day launch plan based on the following questionnaire details:
- Proposed Business Idea: ${businessIdea}
- Industry: ${industry}
- Location/Country: ${country || "Any"}
- Starting Budget: ${startingBudget || "Minimal"}
- Target Customers: ${targetCustomers || "General market"}
- User Experience Level: ${experienceLevel || "Beginner"}

CRITICAL RULES:
1. NEVER guarantee profits or predict exact success metrics.
2. NEVER provide investment advice, legal declarations, or financial guarantees.
3. Keep all recommendations educational, practical, realistic, and highly actionable.
4. Focus purely on robust, legal business planning.

Generate a structured business blueprint containing:
1. exactly 5 creative Business Name suggestions with catchy slogans.
2. a thorough Business Description detailing the model.
3. a detailed Target Audience profiling.
4. a realistic Revenue Model mapping out potential channels.
5. an actionable, chronologically sequenced Startup Checklist of at least 8 items.
6. a highly responsive Marketing Plan suited to the specified budget.
7. realistic Pricing Suggestions with tier recommendations or price calculations.
8. a detailed 30-Day Launch Plan outlining specific daily or weekly tasks.
9. a creative Social Media Strategy outlining platforms and content themes.
10. an objective Risk Assessment highlighting challenges and how to safely navigate them.`;

    console.log("Calling Gemini for Business Builder with inputs:", { industry, country, startingBudget });

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are the Orbit AI Business Builder consultant, an educational business planner. You help users structure realistic business ideas into launch plans. You never promise profits, success, or offer investment or legal advice. You maintain a helpful, detailed, and highly safe tone, outputting structured JSON according to the schema.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            businessNames: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Suggested business name" },
                  tagline: { type: Type.STRING, description: "Suggested tagline or slogan" }
                },
                required: ["name", "tagline"]
              }
            },
            businessDescription: { type: Type.STRING, description: "Detailed summary of the business concept" },
            targetAudience: { type: Type.STRING, description: "Detailed breakdown of who the target customers are and their pain points" },
            revenueModel: { type: Type.STRING, description: "How the business generates revenue, including monetization channels" },
            startupChecklist: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "A chronological list of practical launch/setup checklist items"
            },
            marketingPlan: { type: Type.STRING, description: "Actionable marketing methods for the target market and budget" },
            pricingSuggestions: { type: Type.STRING, description: "Specific pricing strategies and potential pricing models" },
            launchPlan30Day: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Chronological daily/weekly steps across 30 days to soft launch"
            },
            socialMediaStrategy: { type: Type.STRING, description: "Tactical tips for social media content, posting, and engagement" },
            riskAssessment: { type: Type.STRING, description: "Unbiased evaluation of operational risks and mitigation plans" }
          },
          required: [
            "businessNames",
            "businessDescription",
            "targetAudience",
            "revenueModel",
            "startupChecklist",
            "marketingPlan",
            "pricingSuggestions",
            "launchPlan30Day",
            "socialMediaStrategy",
            "riskAssessment"
          ]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response text received from Gemini");
    }

    const plan = JSON.parse(resultText.trim());
    return res.json({ plan });
  } catch (error: any) {
    console.error("Business Builder Generator API Error:", error);
    return res.status(500).json({ 
      error: "Failed to generate business plan. Please check your inputs and try again.",
      details: error.message 
    });
  }
});

// Endpoint to fetch all active workspace files for the full Expo ZIP exporter
app.get("/api/project-files", async (req, res) => {
  try {
    const files: { path: string; content: string }[] = [];
    
    // Recursive directory walk
    async function walk(dir: string) {
      const list = await fs.promises.readdir(dir);
      for (const file of list) {
        const fullPath = path.join(dir, file);
        const stat = await fs.promises.stat(fullPath);
        
        // Skip node_modules, dist, git, zip-outputs or lockfiles
        if (
          file === "node_modules" ||
          file === "dist" ||
          file === ".git" ||
          file === ".aistudio" ||
          file === "package-lock.json" ||
          file === ".env"
        ) {
          continue;
        }
        
        if (stat.isDirectory()) {
          await walk(fullPath);
        } else {
          try {
            // Read content as text if it matches source code extensions
            const ext = path.extname(file).toLowerCase();
            const textExtensions = [".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".css", ".rules", ".html", ".js"];
            
            if (textExtensions.includes(ext)) {
              const content = await fs.promises.readFile(fullPath, "utf-8");
              const relativePath = path.relative(process.cwd(), fullPath);
              files.push({
                path: relativePath,
                content
              });
            }
          } catch (e) {
            // Skip unreadable files
          }
        }
      }
    }
    
    await walk(process.cwd());
    return res.json({ files });
  } catch (err: any) {
    console.error("Error collecting workspace files:", err);
    return res.status(500).json({ error: "Failed to collect files", details: err.message });
  }
});

// Endpoint to download the built static assets ZIP file for Netlify
app.get(["/download-zip", "/orbit-ai.zip", "/api/download-zip"], (req, res) => {
  const zipPath = path.join(process.cwd(), "orbit-ai.zip");
  if (fs.existsSync(zipPath)) {
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=orbit-ai.zip");
    res.download(zipPath, "orbit-ai.zip");
  } else {
    res.status(404).send(`
      <html>
        <head><title>ZIP Not Ready</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>ZIP Archive is not ready yet</h1>
          <p>The build or zipping process might still be running, or you need to build the applet first.</p>
          <button onclick="window.location.reload()" style="padding: 10px 20px; font-size: 16px; cursor: pointer; border-radius: 4px; background: #2563eb; color: white; border: none;">Check Again</button>
        </body>
      </html>
    `);
  }
});

// Endpoint to dynamically generate and download the full source code / project ZIP file
app.get(["/download-project-zip", "/orbit-ai-project.zip", "/api/download-project-zip"], (req, res) => {
  try {
    const zip = new AdmZip();
    const rootPath = process.cwd();

    const pathsToInclude = [
      "src",
      "public",
      "assets",
      "package.json",
      "tsconfig.json",
      "vite.config.ts",
      "server.ts",
      "index.html",
      "metadata.json",
      ".env.example",
      ".gitignore"
    ];

    for (const item of pathsToInclude) {
      const fullPath = path.join(rootPath, item);
      if (fs.existsSync(fullPath)) {
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          zip.addLocalFolder(fullPath, item);
        } else {
          zip.addLocalFile(fullPath, "");
        }
      }
    }

    const buffer = zip.toBuffer();
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=orbit-ai-project.zip");
    res.send(buffer);
  } catch (error: any) {
    console.error("Failed to generate project ZIP:", error);
    res.status(500).send(`
      <html>
        <head><title>Failed to generate ZIP</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>Failed to generate project ZIP file</h1>
          <p>${error.message || "An unknown error occurred."}</p>
        </body>
      </html>
    `);
  }
});

// Setup Vite middleware in development or express static in production
async function setupVite() {
  // Determine distPath dynamically and robustly
  let distPath = path.join(process.cwd(), "dist");
  if (typeof __dirname !== "undefined") {
    if (__dirname.endsWith("dist")) {
      distPath = __dirname;
    } else if (fs.existsSync(path.join(__dirname, "dist"))) {
      distPath = path.join(__dirname, "dist");
    }
  }

  const hasDist = fs.existsSync(path.join(distPath, "index.html"));
  
  // We are in production if NODE_ENV is "production", OR we are running the CJS bundle,
  // OR the index.html file exists in the build output and we are not explicitly in development mode.
  const isProduction = 
    process.env.NODE_ENV === "production" || 
    (hasDist && process.env.NODE_ENV !== "development") ||
    (typeof __filename !== 'undefined' && __filename.endsWith('server.cjs')) ||
    (typeof process.argv[1] !== 'undefined' && process.argv[1].endsWith('server.cjs'));

  console.log("=== SERVER STARTUP LOGS ===");
  console.log(`process.cwd(): ${process.cwd()}`);
  console.log(`__dirname: ${typeof __dirname !== 'undefined' ? __dirname : 'undefined'}`);
  console.log(`Resolved distPath: ${distPath}`);
  console.log(`index.html exists at distPath: ${hasDist}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`isProduction flag: ${isProduction}`);
  console.log("===========================");

  const httpServer = http.createServer(app);

  if (!isProduction) {
    console.log("Starting server in DEVELOPMENT mode (Vite middleware)...");
    const { createServer: createViteServer } = await import("vite");

    // Mount the standalone Admin app's Vite development server first so it intercepts /admin requests
    const adminVite = await createViteServer({
      server: { middlewareMode: true, hmr: { server: httpServer } },
      appType: "spa",
      base: "/admin/",
      root: path.join(process.cwd(), "orbit-ai-admin")
    });
    app.use("/admin", adminVite.middlewares);

    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { server: httpServer } },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode (serving static files from dist)...");
    
    // Serve compiled Admin standalone portal static files if they exist
    let adminDistPath = path.join(process.cwd(), "orbit-ai-admin", "dist");
    if (!fs.existsSync(adminDistPath)) {
      adminDistPath = path.join(process.cwd(), "dist", "admin");
    }
    if (fs.existsSync(adminDistPath)) {
      app.use("/admin", express.static(adminDistPath));
      app.get('/admin/*', (req, res) => {
        res.sendFile(path.join(adminDistPath, "index.html"));
      });
    }

    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send(`
          <html>
            <head><title>Error: Page Not Found</title></head>
            <body style="font-family: sans-serif; text-align: center; padding: 50px;">
              <h1>Error: Page not found</h1>
              <p>The requested URL was not found on this server.</p>
              <p style="color: #666; font-size: 12px;">(Server details: index.html was not found at expected path: ${indexPath})</p>
            </body>
          </html>
        `);
      }
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Orbit AI Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

setupVite().catch((err) => {
  console.error("Error starting Vit Express Server:", err);
});
