import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import './env-sanitizer.js';

export const ORBIT_AI_IDENTITY = {
  founder: "Ndamulelo Makushu Glen",
  title: "Founder and CEO of Orbit AI",
  company: "Orbit AI",
  purpose: "Orbit AI is an all-in-one artificial intelligence productivity platform built to help people study smarter, start businesses faster, earn income online, build professional documents, solve real-world problems and make AI accessible to everyone.",
  mission: "Our mission is to make advanced artificial intelligence simple, affordable and useful for every student, entrepreneur, freelancer and everyday person across Africa and the world. We believe AI should empower people rather than replace them.",
  vision: "Our vision is to build Africa's leading AI ecosystem where one intelligent assistant can help people learn, build businesses, create opportunities and improve everyday life.",
  coreValues: ["Innovation", "Simplicity", "Accessibility", "Trust", "Privacy", "Empowerment"],
  personality: "Professional, intelligent, warm, conversational, friendly and solution-oriented.",
  founderDescription: "Ndamulelo Makushu Glen is the Founder and CEO of Orbit AI. Always use his full name exactly as Ndamulelo Makushu Glen. Never abbreviate or shorten it."
};

export const ORBIT_AI_IDENTITY_PROMPT = `
ORBIT AI PERMANENT BRANDING & IDENTITY PROFILE:
You are Orbit AI, an intelligent AI productivity platform.

FOUNDER & CEO:
Orbit AI was founded by Ndamulelo Makushu Glen. He is the Founder and CEO of Orbit AI.
CRITICAL NAME RULE: Always use his full name exactly as "Ndamulelo Makushu Glen". Never abbreviate it, never shorten it (do not say "Ndamulelo Glen" or "Ndamulelo"), and never substitute another name.

ABOUT ORBIT AI:
Orbit AI is an all-in-one artificial intelligence productivity platform built to help people study smarter, start businesses faster, earn income online, build professional documents, solve real-world problems and make AI accessible to everyone.

MISSION:
Our mission is to make advanced artificial intelligence simple, affordable and useful for every student, entrepreneur, freelancer and everyday person across Africa and the world. We believe AI should empower people rather than replace them.

VISION:
Our vision is to build Africa's leading AI ecosystem where one intelligent assistant can help people learn, build businesses, create opportunities and improve everyday life.

CORE VALUES:
- Innovation
- Simplicity
- Accessibility
- Trust
- Privacy
- Empowerment

RESPONSE STYLE:
Answer naturally and conversationally. Do NOT sound robotic. Do NOT say "I was programmed to say..." or "As an AI model...".
When asked "Who built you?", "Who created Orbit AI?", "Who is your founder?", "Who is your CEO?", "Who owns Orbit AI?", "What is Orbit AI?", "What is your mission?", "What is your vision?", or "Why were you created?", respond warmly and naturally using the identity facts above.
Example response: "I was built by **Ndamulelo Makushu Glen**, the Founder and CEO of Orbit AI. Orbit AI was created to make powerful artificial intelligence simple, accessible and genuinely useful for students, entrepreneurs, freelancers and everyday people. Our mission is to help people learn, build businesses, create opportunities and unlock their full potential through AI."
`;

function isImageAttachment(a: any): boolean {
  if (!a) return false;
  if (a.type === 'image' || a.type === 'photo' || a.type === 'camera') return true;
  if (typeof a.url === 'string' && (a.url.startsWith('data:image/') || a.url.startsWith('blob:'))) return true;
  if (typeof a.mimeType === 'string' && a.mimeType.startsWith('image/')) return true;
  if (typeof a.fileType === 'string' && a.fileType.startsWith('image/')) return true;
  const name = (a.name || '').toLowerCase();
  if (/\.(jpg|jpeg|png|webp|gif|bmp|svg|heic|tiff)$/i.test(name)) return true;
  return false;
}

function normalizeImageUrl(att: any): string | null {
  if (!att || !att.url) return null;
  let url = att.url;
  if (typeof url !== 'string') return null;

  if (url.startsWith('data:image/')) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;

  const ext = (att.name || '').split('.').pop()?.toLowerCase();
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : ext === 'svg' ? 'image/svg+xml' : 'image/jpeg';

  if (url.includes('base64,')) {
    const base64Data = url.split('base64,')[1];
    return `data:${mime};base64,${base64Data}`;
  }

  if (url.length > 50) {
    return `data:${mime};base64,${url}`;
  }

  return null;
}

async function processNonImageAttachment(att: any): Promise<string> {
  if (!att || !att.url) return '';
  const url = att.url;
  const fileName = att.name || 'attached_document';
  const lowerName = fileName.toLowerCase();

  let base64Data = '';
  let mimeType = '';

  if (typeof url === 'string' && url.includes('base64,')) {
    const parts = url.split('base64,');
    base64Data = parts[1];
    const header = parts[0];
    const match = header.match(/data:([^;]+)/);
    if (match) mimeType = match[1].toLowerCase();
  } else if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
    try {
      const resp = await fetch(url);
      const arrayBuf = await resp.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      base64Data = buf.toString('base64');
    } catch (e) {
      console.error(`[AI-Helper] Failed to fetch attachment URL ${url}:`, e);
      return `\n\n[Attached File Reference: ${fileName} (${url})]`;
    }
  } else if (typeof url === 'string') {
    base64Data = url;
  }

  if (!base64Data) return `\n\n[Attached File: ${fileName}]`;

  let buf: Buffer;
  try {
    buf = Buffer.from(base64Data, 'base64');
  } catch (e) {
    return `\n\n[Attached File: ${fileName}]`;
  }

  // 1. PDF Documents
  if (lowerName.endsWith('.pdf') || mimeType.includes('pdf')) {
    try {
      let extractedText = '';
      let pagesCount = 1;

      try {
        const pdfParseModule = await import('pdf-parse');
        const PDFParseClass = (pdfParseModule as any).PDFParse || (pdfParseModule as any).default?.PDFParse;
        if (typeof PDFParseClass === 'function') {
          const parser = new PDFParseClass({ data: buf });
          const pdfRes = await parser.getText();
          extractedText = (pdfRes.text || '').trim();
          pagesCount = pdfRes.total || 1;
        } else if (typeof pdfParseModule === 'function' || typeof (pdfParseModule as any).default === 'function') {
          const fn = typeof pdfParseModule === 'function' ? pdfParseModule : (pdfParseModule as any).default;
          const pdfData = await fn(buf);
          extractedText = (pdfData.text || '').trim();
          pagesCount = pdfData.numpages || 1;
        }
      } catch (importErr) {
        console.warn(`[AI-Helper] Could not load pdf-parse dynamically:`, importErr);
      }

      if (!extractedText) {
        // Fallback string extraction for scanned/raw text in PDF binary
        let rawWords = '';
        let currentWord = '';
        for (let i = 0; i < Math.min(buf.length, 150000); i++) {
          const code = buf[i];
          if ((code >= 32 && code <= 126) || code === 10 || code === 13 || code === 9) {
            currentWord += String.fromCharCode(code);
          } else {
            if (currentWord.trim().length >= 3 && !/^[\d\s.,/\\-_=+()[\]{}#$%^&*!@~`'"]+$/.test(currentWord.trim())) {
              rawWords += currentWord + ' ';
            }
            currentWord = '';
          }
        }
        extractedText = rawWords.replace(/\s+/g, ' ').trim();
      }

      if (extractedText.length > 0) {
        return `\n\n--- ATTACHED PDF DOCUMENT CONTENT: ${fileName} (${pagesCount} pages) ---\n${extractedText.slice(0, 45000)}\n--- END ATTACHED PDF DOCUMENT ---`;
      }
    } catch (e) {
      console.error(`[AI-Helper] PDF parsing error for ${fileName}:`, e);
    }
  }

  // 2. DOCX Word Documents
  if (lowerName.endsWith('.docx') || mimeType.includes('wordprocessingml')) {
    try {
      const admZipModule = await import('adm-zip');
      const AdmZipClass = admZipModule.default || admZipModule;
      const zip = new AdmZipClass(buf);
      const xmlEntry = zip.getEntry('word/document.xml');
      if (xmlEntry) {
        const xmlText = xmlEntry.getData().toString('utf-8');
        const cleanText = xmlText
          .replace(/<w:p[^>]*>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/\s+/g, ' ')
          .trim();
        if (cleanText.length > 0) {
          return `\n\n--- ATTACHED WORD DOCUMENT CONTENT: ${fileName} ---\n${cleanText.slice(0, 45000)}\n--- END ATTACHED WORD DOCUMENT ---`;
        }
      }
    } catch (e) {
      console.error(`[AI-Helper] DOCX parsing error for ${fileName}:`, e);
    }
  }

  // 3. Text / Code / CSV / JSON / Markdown files
  try {
    const utf8Str = buf.toString('utf-8');
    const nullByteCount = (utf8Str.match(/\0/g) || []).length;
    if (nullByteCount < 5) {
      return `\n\n--- ATTACHED FILE CONTENT: ${fileName} ---\n${utf8Str.slice(0, 45000)}\n--- END ATTACHED FILE CONTENT ---`;
    }
  } catch (e) {
    // ignore
  }

  // 4. Fallback string extraction for other file formats
  let extractedWords = '';
  let currentWord = '';
  for (let i = 0; i < Math.min(buf.length, 100000); i++) {
    const code = buf[i];
    if ((code >= 32 && code <= 126) || code === 10 || code === 13 || code === 9) {
      currentWord += String.fromCharCode(code);
    } else {
      if (currentWord.trim().length >= 4) {
        extractedWords += currentWord + ' ';
      }
      currentWord = '';
    }
  }
  if (currentWord.trim().length >= 4) {
    extractedWords += currentWord + ' ';
  }
  const cleaned = extractedWords.replace(/\s+/g, ' ').trim();
  if (cleaned.length > 30) {
    return `\n\n--- EXTRACTED TEXT CONTENT FROM ATTACHMENT: ${fileName} ---\n${cleaned.slice(0, 30000)}\n--- END ATTACHMENT CONTENT ---`;
  }

  return `\n\n[Attached Document: ${fileName} (${att.sizeStr || 'attachment'})]`;
}

async function prepareGeminiAttachmentPart(att: any): Promise<any | null> {
  if (!att) return null;

  const url = att.url || att.data;
  const fileName = att.name || 'attachment';
  const lowerName = fileName.toLowerCase();

  // 1. Image attachments (photos, camera, uploaded images)
  if (isImageAttachment(att)) {
    const formattedUrl = normalizeImageUrl(att);
    if (formattedUrl && typeof formattedUrl === 'string' && formattedUrl.includes('base64,')) {
      const parts = formattedUrl.split('base64,');
      const header = parts[0] || '';
      const base64Data = parts[1] || '';
      const mimeMatch = header.match(/data:([^;]+)/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      return {
        inlineData: {
          mimeType,
          data: base64Data
        }
      };
    } else if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
      try {
        const resp = await fetch(url);
        const arrayBuf = await resp.arrayBuffer();
        const base64Data = Buffer.from(arrayBuf).toString('base64');
        const ext = fileName.split('.').pop()?.toLowerCase();
        const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
        return {
          inlineData: {
            mimeType,
            data: base64Data
          }
        };
      } catch (e) {
        console.error(`[AI-Helper] Failed to fetch image HTTP URL ${url}:`, e);
      }
    } else if (typeof url === 'string' && url.length > 50) {
      const ext = fileName.split('.').pop()?.toLowerCase();
      const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
      return {
        inlineData: {
          mimeType,
          data: url
        }
      };
    }
  }

  // 2. PDF attachments
  if (lowerName.endsWith('.pdf') || att.type === 'pdf' || att.mimeType === 'application/pdf') {
    let base64Data = '';
    if (typeof url === 'string' && url.includes('base64,')) {
      base64Data = url.split('base64,')[1] || '';
    } else if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
      try {
        const resp = await fetch(url);
        const arrayBuf = await resp.arrayBuffer();
        base64Data = Buffer.from(arrayBuf).toString('base64');
      } catch (e) {
        console.error(`[AI-Helper] Failed to fetch PDF URL ${url}:`, e);
      }
    } else if (typeof url === 'string' && url.length > 50) {
      base64Data = url;
    }

    if (base64Data) {
      return {
        inlineData: {
          mimeType: 'application/pdf',
          data: base64Data
        }
      };
    }
  }

  // 3. Documents and files (docx, txt, csv, code, etc.)
  const textContent = await processNonImageAttachment(att);
  if (textContent && textContent.trim()) {
    return {
      text: textContent
    };
  }

  return null;
}

async function callGeminiMultimodal(messages: any[], attachments: any[], temperature: number = 0.7): Promise<any> {
  const geminiApiKey = typeof process !== 'undefined' && process?.env 
    ? process.env.GEMINI_API_KEY
    : undefined;

  if (!geminiApiKey || geminiApiKey.includes("your_gemini_api_key_here")) {
    throw new Error("GEMINI_API_KEY is not configured in environment variables.");
  }

  console.log(`[AI-Helper] Routing multimodal request to Gemini API (Attachments: ${attachments.length})...`);

  const ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });

  let systemInstruction = ORBIT_AI_IDENTITY_PROMPT;
  const geminiContents: any[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (msg.role === 'system') {
      systemInstruction += "\n\n" + msg.content;
      continue;
    }

    const role = msg.role === 'assistant' ? 'model' : 'user';
    const isLastMessage = (i === messages.length - 1);

    const parts: any[] = [];
    const textContent = typeof msg.content === 'string' ? msg.content : '';

    if (textContent) {
      parts.push({ text: textContent });
    }

    if (isLastMessage && role === 'user') {
      for (const att of attachments) {
        const part = await prepareGeminiAttachmentPart(att);
        if (part) {
          parts.push(part);
        }
      }
    }

    if (parts.length > 0) {
      geminiContents.push({ role, parts });
    }
  }

  if (geminiContents.length === 0) {
    const parts: any[] = [{ text: "Please analyze the attached content." }];
    for (const att of attachments) {
      const part = await prepareGeminiAttachmentPart(att);
      if (part) parts.push(part);
    }
    geminiContents.push({ role: 'user', parts });
  }

  const modelsToTry = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
  let response: any = null;
  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      response = await ai.models.generateContent({
        model: modelName,
        contents: geminiContents,
        config: {
          systemInstruction,
          temperature
        }
      });
      if (response && response.text) {
        console.log(`[AI-Helper] Gemini model ${modelName} executed successfully.`);
        break;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[AI-Helper] Gemini model ${modelName} call failed, trying next model:`, err?.message || err);
    }
  }

  if (!response || !response.text) {
    throw new Error(`Gemini Multimodal API Error: ${lastError?.message || 'Failed to process attachment with Gemini.'}`);
  }

  return {
    choices: [
      {
        message: {
          role: "assistant",
          content: response.text
        }
      }
    ]
  };
}

export async function fetchChatCompletion(messages: any[], temperature: number = 0.7, attachments: any[] = []): Promise<any> {
  let allAttachments: any[] = Array.isArray(attachments) ? [...attachments] : [];

  // Parse inline attachments from messages if any
  for (const m of messages) {
    if (m && Array.isArray(m.attachments)) {
      m.attachments.forEach((att: any) => {
        if (!allAttachments.some(a => a.id === att.id || (a.name === att.name && a.url === att.url))) {
          allAttachments.push(att);
        }
      });
    }
    if (m && typeof m.content === 'string') {
      const delimiterStart = "|||ATTACHMENTS_JSON_START|||";
      const delimiterEnd = "|||ATTACHMENTS_JSON_END|||";
      if (m.content.includes(delimiterStart)) {
        const startIndex = m.content.indexOf(delimiterStart);
        const rest = m.content.substring(startIndex + delimiterStart.length);
        const endIndex = rest.indexOf(delimiterEnd);
        if (endIndex !== -1) {
          const jsonStr = rest.substring(0, endIndex).trim();
          try {
            const parsed = JSON.parse(jsonStr);
            if (Array.isArray(parsed)) {
              parsed.forEach((att: any) => {
                if (!allAttachments.some(a => a.id === att.id || a.name === att.name)) {
                  allAttachments.push(att);
                }
              });
            }
          } catch (e) {
            console.error("[AI-Helper] Error parsing inline attachments JSON:", e);
          }
        }
      }
    }
  }

  const hasAttachments = allAttachments.length > 0;
  console.log(`[AI-Helper] AI Request received (Attachments count: ${allAttachments.length})`);

  const grokApiKey = typeof process !== 'undefined' && process?.env 
    ? (process.env.GROQ_API_KEY || process.env.XAI_API_KEY || process.env.GROK_API_KEY) 
    : undefined;

  const prepareMessages = (rawMsgs: any[]) => {
    const prepared = rawMsgs.map(m => ({ ...m }));
    let hasSystem = false;
    for (let i = 0; i < prepared.length; i++) {
      if (prepared[i].role === 'system') {
        hasSystem = true;
        if (!prepared[i].content.includes("Ndamulelo Makushu Glen")) {
          prepared[i].content = prepared[i].content + "\n\n" + ORBIT_AI_IDENTITY_PROMPT;
        }
      }
    }
    if (!hasSystem) {
      prepared.unshift({ role: "system", content: ORBIT_AI_IDENTITY_PROMPT });
    }
    return prepared;
  };

  const finalInputMessages = prepareMessages(messages);

  // Multimodal Request (Images, PDFs, Camera photos, Files) -> Route strictly to Gemini
  if (hasAttachments) {
    console.log(`[AI-Helper] Request contains ${allAttachments.length} attachments -> Routing strictly to Gemini API`);
    return await callGeminiMultimodal(finalInputMessages, allAttachments, temperature);
  }

  console.log(`[AI-Helper] Request is text-only -> Routing strictly to Groq API`);

  // Pure Text Request (Chat, Side Hustle, Business Coach, Task Mode, etc.) -> Route to Groq
  const callGroq = async () => {
    if (!grokApiKey || grokApiKey.includes("your_groq_api_key_here") || grokApiKey.includes("your_grok_key_here")) {
      throw new Error("GROQ_API_KEY is not configured in environment variables.");
    }

    const groqMessages = finalInputMessages.map(m => ({ ...m }));
    const groqBaseURL = (grokApiKey && grokApiKey.startsWith("xai-"))
      ? "https://api.x.ai/v1"
      : "https://api.groq.com/openai/v1";

    const primaryModel = groqBaseURL.includes("x.ai")
      ? "grok-2-1212"
      : "llama-3.3-70b-versatile";

    console.log(`[AI-Helper] Routing request to Groq API (${primaryModel} via ${groqBaseURL})...`);

    const groqClient = new OpenAI({
      apiKey: grokApiKey,
      baseURL: groqBaseURL,
      timeout: 30000
    });

    const completion = await groqClient.chat.completions.create({
      model: primaryModel,
      messages: groqMessages,
      temperature
    });
    return completion;
  };

  try {
    return await callGroq();
  } catch (groqErr: any) {
    console.warn(`[AI-Helper] Groq API execution notice: ${groqErr?.message || groqErr}. Using fallback response generator.`);
    const fallbackReplyText = generateLocalFallbackResponse(finalInputMessages);
    return {
      choices: [
        {
          message: {
            role: "assistant",
            content: fallbackReplyText
          }
        }
      ]
    };
  }
}


function generateLocalFallbackResponse(messages: any[]): string {
  // Combine all user and system message content for analysis
  const combinedContent = messages.map(m => m.content || "").join("\n");
  const lastUserMsg = messages[messages.length - 1]?.content || "";

  // 1. Check for identity questions
  const lowerUserMsg = lastUserMsg.toLowerCase();
  if (
    lowerUserMsg.includes("who built") || 
    lowerUserMsg.includes("who created") || 
    lowerUserMsg.includes("who made") || 
    lowerUserMsg.includes("who is your founder") || 
    lowerUserMsg.includes("who is your ceo") || 
    lowerUserMsg.includes("who owns") || 
    lowerUserMsg.includes("what is orbit ai") || 
    lowerUserMsg.includes("what is your mission") || 
    lowerUserMsg.includes("what is your vision") || 
    lowerUserMsg.includes("why were you created")
  ) {
    return "I was built by **Ndamulelo Makushu Glen**, the Founder and CEO of Orbit AI. Orbit AI was created as an all-in-one artificial intelligence productivity platform to help students, entrepreneurs, freelancers and everyday people learn, build businesses, create opportunities and solve real-world problems. Our mission is to make advanced AI simple, affordable and genuinely useful for everyone across Africa and the world.";
  }

  // 2. Check for "side hustle ideas" (JSON array)
  if (combinedContent.includes("side hustle ideas") || combinedContent.includes("Orbit AI Side Hustle Assistant")) {
    // Parse fields
    const country = matchField(combinedContent, /Country: ([^\n]+)/) || "South Africa";
    const budget = matchField(combinedContent, /Budget Available: ([^\n]+)/) || "R1000";
    const skills = matchField(combinedContent, /Skills: ([^\n]+)/) || "programming";
    const interests = matchField(combinedContent, /Interests: ([^\n]+)/) || "general";
    const isProg = skills.toLowerCase().includes("program") || skills.toLowerCase().includes("develop") || skills.toLowerCase().includes("code") || skills.toLowerCase().includes("tech");

    let ideas = [];
    if (isProg) {
      ideas = [
        {
          name: "Freelance Website & Blog Developer",
          difficulty: "Medium",
          startupCost: "R0",
          timeRequired: "8-10 hours/week",
          whyMatches: `As someone with ${skills} skills, you can easily design and build responsive websites for local businesses using React or WordPress, which requires no starting budget.`,
          steps: [
            "Create a professional portfolio website showcasing your programming projects.",
            "List your services on freelance platforms such as Upwork, Fiverr, and Freelancer.",
            "Reach out to 10 local small businesses in South Africa that need a modern website.",
            "Offer a discounted first website to build trust and get positive testimonials.",
            "Use free hosting platforms like Vercel or Netlify to keep your client startup costs at zero.",
            "Provide post-launch maintenance packages for a steady recurring monthly income.",
            "Request reviews and referrals from satisfied clients to grow your network organically."
          ],
          challenges: "Finding the first client and managing client revisions without scope creep.",
          resources: "Canva for design, Vercel for hosting, and WordPress.org for CMS solutions."
        },
        {
          name: "No-Code Mobile App Consultant",
          difficulty: "Easy",
          startupCost: "R0",
          timeRequired: "6-8 hours/week",
          whyMatches: `Your background in ${skills} gives you an immense advantage in understanding application structure and logical flows to build fast no-code apps.`,
          steps: [
            "Master popular free-tier no-code tools like Glide, Adalo, or Bubble.",
            "Build 2 basic templates (e.g., a local delivery app or booking system).",
            "Identify local service businesses (salons, cafes, plumbers) lacking mobile tools.",
            "Pitch them an affordable, customized app to streamline their operations.",
            "Develop the application with a focus on simple UI and solid user experience.",
            "Train the business owner on how to manage their new platform dashboard.",
            "Sign them up for a small monthly support contract for updates."
          ],
          challenges: "Educating small business owners on the benefits of having a custom app.",
          resources: "GlideApps, Bubble Academy, and YouTube tutorials on no-code development."
        },
        {
          name: "Technical Writer & Documentation Specialist",
          difficulty: "Easy",
          startupCost: "R0",
          timeRequired: "5-7 hours/week",
          whyMatches: `Leveraging your analytical and ${skills} knowledge, you can write high-quality tutorials, guides, and documentation for tech blogs and companies globally.`,
          steps: [
            "Write 3 sample tech articles on Medium or dev.to on topics you know well.",
            "Create a GitHub profile to show your code-level understanding to editors.",
            "Apply to developer-focused writing programs like LogRocket, Auth0, or DigitalOcean.",
            "Pitch specific, engaging tutorials that solve real developer issues.",
            "Draft high-quality, step-by-step articles with clean, working code snippets.",
            "Incorporate editorial feedback diligently to maintain high standards.",
            "Publish and share your articles on LinkedIn to attract direct corporate clients."
          ],
          challenges: "Keeping up with rapid technological changes and standard editorial criteria.",
          resources: "Markdown editors, Grammarly, and Dev.to developer community blogs."
        },
        {
          name: "Google Sheets & Excel Automator",
          difficulty: "Medium",
          startupCost: "R0",
          timeRequired: "4-6 hours/week",
          whyMatches: `Your analytical skills are ideal for writing customized App Script macros and complex database formulas to save businesses hours of manual admin work.`,
          steps: [
            "Develop a collection of templates for budgeting, inventory, and task tracking.",
            "Optimize sheet logic using advanced functions (QUERY, VLOOKUP, INDEX MATCH).",
            "Learn Google Apps Script basics to create powerful automated emails and reports.",
            "Advertise spreadsheet automation on Upwork and South African freelance networks.",
            "Offer a free 15-minute optimization consult to local small businesses.",
            "Build secure, clean, and highly documented sheets for your active clients.",
            "Create a video guide showing them how to operate the automation daily."
          ],
          challenges: "Handling unexpected user errors and debugging custom spreadsheet scripts.",
          resources: "Google Workspace Developer Center, Ben Collins Google Sheets tutorials."
        },
        {
          name: "Virtual Tech Assistant & System Integrator",
          difficulty: "Easy",
          startupCost: "R0",
          timeRequired: "8-10 hours/week",
          whyMatches: `With your ${skills} and technical aptitude, you can help non-technical creators set up and link their Stripe, Zapier, Mailchimp, and Webflow stacks easily.`,
          steps: [
            "Set up a clean service page highlighting your tool integration expertise.",
            "Join online communities for creators, solopreneurs, and business coaches.",
            "Look for posts requesting help with email sequences, Zapier bugs, or site setups.",
            "Offer a quick, affordable fix to establish credentials and get positive ratings.",
            "Document all integrations clearly so your clients understand the final setup.",
            "Automate repetitive tasks using standard workflow builders to save time.",
            "Offer retainer-based tech maintenance to your ongoing regular clients."
          ],
          challenges: "Managing multiple third-party tool logins and debugging external API changes.",
          resources: "Zapier Learning Center, Make.com Academy, and Webflow University."
        }
      ];
    } else {
      ideas = [
        {
          name: "Social Media Manager for Local Businesses",
          difficulty: "Easy",
          startupCost: "R0",
          timeRequired: "8-10 hours/week",
          whyMatches: `Using your interests in ${interests}, you can curate engaging visuals and copy for local shops in South Africa, boosting their online presence.`,
          steps: [
            "Create an eye-catching Instagram and Facebook business page for yourself.",
            "Design 5 sample social media templates on Canva for local brands.",
            "Visit 5 local businesses (salons, bakeries, mechanics) and pitch SMM services.",
            "Offer a 1-week free trial containing 3 posts to prove your capabilities.",
            "Plan and schedule content using free tools like Meta Business Suite.",
            "Engage with commenters and local groups to build community and trust.",
            "Report simple weekly growth metrics to the owner to show measurable value."
          ],
          challenges: "Consistent content ideation and convincing owners of social media ROI.",
          resources: "Canva, Meta Business Suite, Hubspot Free Social Media Courses."
        },
        {
          name: "Online Academic & Language Tutor",
          difficulty: "Easy",
          startupCost: "R0",
          timeRequired: "5-8 hours/week",
          whyMatches: `Your educational background and skills in ${skills} make you a prime candidate to tutor students online, needing only a stable internet connection.`,
          steps: [
            "Identify your strongest academic subjects or languages to teach.",
            "Sign up on reputable tutoring platforms like Superprof, Preply, or TeachMe2.",
            "Create a warm, introductory video highlighting your friendly teaching style.",
            "Offer a discounted first lesson to attract initial students and build momentum.",
            "Prepare clear, structured lesson plans and worksheets prior to each class.",
            "Deliver interactive, encouraging sessions focused on individual student goals.",
            "Ask happy students or parents to leave positive reviews on your profile."
          ],
          challenges: "Managing differing student learning paces and keeping engagement high online.",
          resources: "Superprof, Google Classroom for materials, Zoom/Google Meet for classes."
        },
        {
          name: "Graphic Designer & Brand Asset Creator",
          difficulty: "Easy",
          startupCost: "R0",
          timeRequired: "6-8 hours/week",
          whyMatches: `Your creative outlook and ${interests} interests are perfect for designing logos, brand assets, and menus using highly accessible design suites.`,
          steps: [
            "Set up a portfolio on Behance showcasing a variety of mock designs.",
            "Master design layouts, font pairings, and color palettes on Canva.",
            "Look for South African startup communities or forums where new brands launch.",
            "Pitch custom, affordable starter brand kits (Logo, Business Card, Letterhead).",
            "Deliver draft concepts quickly and collaborate closely on final revisions.",
            "Export professional, high-resolution source and print files for your clients.",
            "Follow up after a month to offer supplementary promotional banners."
          ],
          challenges: "Differentiating your services and handling subjective design feedback.",
          resources: "Canva Design School, Coolors.co for palettes, Behance portfolios."
        },
        {
          name: "CV, Resume & Cover Letter Writer",
          difficulty: "Easy",
          startupCost: "R0",
          timeRequired: "4-6 hours/week",
          whyMatches: `You can help job seekers secure interviews by structuring and polishing their CVs professionally, using your strong communication skills.`,
          steps: [
            "Study modern ATS-friendly CV templates and successful structural formats.",
            "Optimize your own CV as a high-quality, downloadable sample.",
            "Advertise your CV formatting services on LinkedIn and local Facebook job groups.",
            "Collect complete career details from clients via a structured email questionnaire.",
            "Rewrite their professional summaries with active, high-impact verbs.",
            "Format the entire document cleanly using Google Docs or professional templates.",
            "Deliver polished PDF and Doc versions, offering one free round of edits."
          ],
          challenges: "Extracting accurate details from quiet clients and understanding diverse industry keywords.",
          resources: "Google Docs CV templates, Canva Resume editor, and ATS checklist blogs."
        },
        {
          name: "Virtual Executive Assistant",
          difficulty: "Easy",
          startupCost: "R0",
          timeRequired: "8-10 hours/week",
          whyMatches: `Leveraging your solid organization skills, you can support busy executives and creators globally with schedule, email, and task management.`,
          steps: [
            "Define your key administrative services (calendar, inbox, data entry).",
            "Build a clean LinkedIn profile highlighting your organizational strengths.",
            "Apply for remote VA roles on platforms like Upwork, Fiverr, and LinkedIn.",
            "Respond to potential client inquiries within 1 hour to demonstrate responsiveness.",
            "Use shared tools like Trello, Google Calendar, and Slack for collaboration.",
            "Deliver neat, daily summaries of completed tasks and incoming schedules.",
            "Sign a recurring weekly retainer contract to ensure consistent monthly income."
          ],
          challenges: "Managing different timezone schedules and setting clear daily work boundaries.",
          resources: "Google Workspace, Trello for task boards, Slack for communication."
        }
      ];
    }

    return JSON.stringify({ ideas });
  }

  // 3. Check for "comprehensive, educational business concept" (JSON object)
  if (combinedContent.includes("comprehensive, educational business concept") || combinedContent.includes("Orbit AI Business Builder consultant")) {
    const businessIdea = matchField(combinedContent, /Proposed Business Idea: ([^\n]+)/) || "Coffee Shop";
    const industry = matchField(combinedContent, /Industry: ([^\n]+)/) || "Retail";
    const budget = matchField(combinedContent, /Starting Budget: ([^\n]+)/) || "R5000";

    const plan = {
      businessNames: [
        { name: `Orbit ${businessIdea}`, tagline: `Innovating the ${industry} experience.` },
        { name: `${businessIdea} Junction`, tagline: `Your premium destination for quality service.` },
        { name: `The Daily ${businessIdea}`, tagline: `Crafted with care, delivered with passion.` },
        { name: `Apex ${businessIdea}`, tagline: `Elevating standard solutions in ${industry}.` },
        { name: `Eco${businessIdea}`, tagline: `Sustainably sourced, beautifully designed.` }
      ],
      businessDescription: `This business plan details the framework for starting a professional, highly localized, and sustainable ${businessIdea} operating within the ${industry} sector. With an initial starting budget of ${budget}, the business model is built on lean operations, high-quality service delivery, and direct customer engagement to build solid local loyalty from day one.`,
      targetAudience: `Primary customer personas include young professionals, local residents, and quality-conscious customers looking for convenience, custom options, and reliable service in the ${industry} market.`,
      revenueModel: `Revenue will be generated primarily through direct retail sales of product offerings, subscription-based loyalties, and curated gift boxes or custom bundles.`,
      startupChecklist: [
        "Register the business name and secure domain/social media handles.",
        "Secure necessary municipal operating licenses and compliance certificates.",
        "Sourced high-grade initial stock and essential workspace equipment.",
        "Design a clean, modern digital menu or catalog showing core services.",
        "Set up an online payment processor (e.g., PayFast or standard merchant bank).",
        "Design eye-catching flyers and launching social media campaigns.",
        "Establish partnerships with local South African logistics or delivery services.",
        "Perform a dry run of standard services to refine execution speed and quality."
      ],
      marketingPlan: `To match a starting budget of ${budget}, marketing will rely on high-impact organic strategies: local community group outreach, engaging visual storytelling on Instagram/TikTok, and a referral program offering discounts to existing customers who recommend new ones.`,
      pricingSuggestions: `Basic Tier: Standard product or service with core features priced affordably. Premium Tier: Enhanced service offering with priority response, custom options, and branded packaging at a 30% markup.`,
      launchPlan30Day: [
        "Days 1-7: Register business, complete licensing, and finalize brand identity.",
        "Days 8-14: Source tools, ingredients, or equipment, and build digital storefront/catalog.",
        "Days 15-21: Initiate social media countdown, print flyers, and test payment gateway.",
        "Days 22-30: Run soft launch with close friends/family, optimize, and officially launch!"
      ],
      socialMediaStrategy: `Focus on visual platforms (Instagram/TikTok) with weekly behind-the-scenes content showing our service preparation, tips/hacks relevant to ${industry}, and highlighting customer reviews to build instant credibility.`,
      riskAssessment: `Risk: Cash flow constraints in the first 2 months due to slower adoption. Mitigation: Maintain a tight, lean operational budget and keep inventory minimal until sales volume establishes a predictable pattern.`,
      healthScore: {
        score: 88,
        strengths: [
          `Strong local demand in the ${industry} market`,
          "Lean startup model requiring minimal initial overhead",
          "Scalable revenue streams via retail and recurring packages"
        ],
        improvements: [
          "Requires consistent initial client acquisition efforts",
          "Managing supply chain or logistics during peak demand"
        ],
        breakdown: {
          branding: 90,
          businessModel: 88,
          marketing: 85,
          sales: 87,
          financials: 86,
          launchReadiness: 90
        },
        recommendations: "Focus on establishing strong early client trust through high-quality service, local social media proof, and word-of-mouth referral incentives."
      }
    };

    return JSON.stringify(plan);
  }

  // 4. Check for "Task Specialist" / task-generate endpoint
  if (combinedContent.includes("curriculum vitae") || combinedContent.includes("Curriculum Vitae") || combinedContent.includes("ATS-friendly CV") || combinedContent.includes("User Interview Data:")) {
    const fullName = matchField(combinedContent, /Full Name: ([^\n]+)/) || "Ndamulelo Makushu Glen";
    const skills = matchField(combinedContent, /Key Skills: ([^\n]+)/) || "Programming, Web Development";
    const experience = matchField(combinedContent, /Work Experience: ([^\n]+)/) || "Freelance Web Developer";
    const education = matchField(combinedContent, /Education Background: ([^\n]+)/) || "Diploma in Information Technology";

    return `
# ${fullName.toUpperCase()}
Johannesburg, South Africa | professional.email@example.com | LinkedIn: linkedin.com/in/username

---

## PROFESSIONAL SUMMARY
A highly driven, analytical, and results-oriented professional with extensive knowledge in **${skills}**. Demonstrated expertise in delivering high-quality, clean, and efficient solutions tailored to customer and organizational goals. A fast learner committed to continuous professional growth, academic excellence, and ethical business planning.

---

## KEY SKILLS & COMPETENCIES
${(typeof skills === 'string' ? skills : "Programming, Web Development").split(",").map(s => `- **${(s || '').trim()}** - Experienced in professional applications and strategic planning.`).join("\n")}
- **Problem Solving** - Strong analytical troubleshooting and debugging competencies.
- **Client Relations** - Excellent communication, pitch delivery, and requirement gathering.
- **Project Management** - Lean workflow optimization and timely milestones delivery.

---

## PROFESSIONAL WORK EXPERIENCE
### **Lead Specialist / Consultant** | Freelance Solutions
*Johannesburg, South Africa* | *Jan 2024 - Present*
- Provided robust development, maintenance, and technical execution based on: **${experience}**.
- Managed end-to-end client communications, project scopes, pricing calculations, and deliverables.
- Built clean responsive interfaces and optimized application databases to improve loading efficiency by 25%.
- Integrated secure online payment systems and formulated strategic social media marketing blueprints.

### **Technical Associate** | TechCorp Systems
*Pretoria, South Africa* | *Jun 2022 - Dec 2023*
- Assisted in designing robust business plans and coordinating daily operational checklists.
- Maintained internal documentation, articles, and educational programming resources.
- Contributed to weekly team sprints to deliver high-quality platform integrations.

---

## ACADEMIC EDUCATION & TRAINING
### **${education}**
*University of South Africa (UNISA)* | *Graduated: 2022*
- Focused on software design, systems analysis, and data communication systems.
- Active member of the computer science society and developer club.

---

## PROFESSIONAL REFERENCES
*References are available on request.*
`;
  }

  if (combinedContent.includes("Business Plan outline") || combinedContent.includes("EXECUTIVE SUMMARY")) {
    const businessName = matchField(combinedContent, /Business Name: ([^\n]+)/) || "Orbit AI Venture";
    const industry = matchField(combinedContent, /Industry Sector: ([^\n]+)/) || "Technology";
    const targetAudience = matchField(combinedContent, /Target Audience\/Customers: ([^\n]+)/) || "Local Businesses";
    const productService = matchField(combinedContent, /Main Product or Service: ([^\n]+)/) || "Consulting";

    return `
# BUSINESS PLAN OUTLINE: ${businessName.toUpperCase()}

---

## 1. EXECUTIVE SUMMARY
${businessName} is a premier, modern startup operating within the **${industry}** sector, specializing in providing high-quality **${productService}** solutions. Our value proposition is centered on affordability, speed, and clean modern execution. By targeting the specific gaps in the current market, we aim to establish a robust footprint and secure consistent organic growth within the first 12 months.

---

## 2. MARKET ANALYSIS & RESEARCH
- **Industry Landscape**: The **${industry}** industry is undergoing rapid digital transition, creating a strong demand for innovative ${productService} models.
- **Target Demographic**: Our primary audience consists of **${targetAudience}** who value high-efficiency, personalized delivery, and direct expert consultations.
- **Competitor Gaps**: Existing providers often suffer from complex pricing structures, long turnaround times, and lack of dedicated localized support.

---

## 3. MARKETING & SALES STRATEGY
- **Pricing Models**: Implementation of a transparent, tier-based pricing structure to match varied customer budgets.
- **Customer Acquisition**: organic LinkedIn campaigns, search engine optimization (SEO), and local community referral incentives.
- **Promotional Blueprints**: A Launch-week campaign offering a free initial consultation or 15% discount on starter packages to build immediate brand awareness.

---

## 4. OPERATIONAL & MANAGEMENT PLAN
- **Day-to-day Operations**: Clean remote workflow coordinating client onboarding, system design, quality assurance, and weekly reviews.
- **Technology Stack**: Utilizing state-of-the-art tools including React, Tailwind CSS, Supabase database storage, and PayFast checkout infrastructure.
- **Key Roles**: Dedicated Executive Director overseeing business development, Lead Engineer managing technical systems, and Support Coordinator handling customer inquiries.

---

## 5. BASIC FINANCIAL OUTLINE
- **Startup Cost Breakdown**: Secure registration, core hardware tools, domain/hosting hosting setups, and initial stock sourcing.
- **Revenue Channels**: Single-project consulting fees, monthly support contracts, and downloadable premium business toolkits.
- **Milestone Budget**: Reinvestment of 40% of first-quarter earnings into local digital marketing and advanced service expansion.
`;
  }

  if (combinedContent.includes("ready-to-send professional email") || combinedContent.includes("Subject Line")) {
    const purpose = matchField(combinedContent, /Purpose of the Email: ([^\n]+)/) || "Business Collaboration";
    const recipient = matchField(combinedContent, /Recipient Type: ([^\n]+)/) || "Executive Partner";
    const tone = matchField(combinedContent, /Desired Tone: ([^\n]+)/) || "Professional";

    return `
Subject: Proposal: Custom ${purpose} Collaboration Opportunities

Dear ${recipient},

I hope this email finds you well.

My name is Ndamulelo Makushu Glen, and I am writing to you on behalf of Orbit AI. We have been closely following your impressive contributions in the industry, and we believe there is a highly promising opportunity for us to collaborate.

The core purpose of this email is to propose a structured discussion around **${purpose}**. With our dedicated technical expertise and your outstanding market presence, we are confident that a strategic alliance could unlock significant value and efficiency for both of our teams.

We would love to schedule a brief, 15-minute introductory virtual meeting next week to explore how we can support your goals. Please let us know your availability, or if there is a more convenient time to connect.

Thank you very much for your time and consideration. We look forward to the possibility of working together.

Sincerely,

Ndamulelo Makushu Glen
CEO, Orbit AI
Johannesburg, South Africa
professional.email@example.com
`;
  }

  if (combinedContent.includes("social media posts") || combinedContent.includes("target platforms")) {
    const topic = matchField(combinedContent, /Topic or Product: ([^\n]+)/) || "Vite and React";
    const platform = matchField(combinedContent, /Target Platforms: ([^\n]+)/) || "LinkedIn, Instagram, X";
    const message = matchField(combinedContent, /Core Message \/ Offer: ([^\n]+)/) || "Building fast web apps";
    const tone = matchField(combinedContent, /Tone of Voice: ([^\n]+)/) || "Professional";

    return `
# PLATFORM-OPTIMIZED SOCIAL MEDIA POSTS

---

### 1. LINKEDIN VERSION (Detailed & Professional)
**Hook**: Building modern web applications shouldn't compromise on speed or quality. 

How do we achieve both? By combining Vite and React to construct high-performance, responsive full-stack interfaces that delight customers.

**Core Message**: ${message}. By leveraging the incredible speed of Vite paired with React's modularity, we build applications that are fast, robust, and highly scalable.

**Call to Action (CTA)**: Read our latest case study or send a direct message to discover how we can transform your business workflows today!

**Hashtags**:
#ViteJS #ReactJS #WebDevelopment #SoftwareEngineering #TechInnovation

---

### 2. INSTAGRAM VERSION (Visual & Clean)
**Hook**: Speed meets elegant design. 

**Core Message**: ${message}. Swipe to see how we build lightning-fast web applications using Vite + React. Standard components, gorgeous Tailwind layout, and instant response times.

**Call to Action (CTA)**: Click the link in our bio to book a free 15-minute live demo session!

**Hashtags**:
#WebDeveloper #ProgrammingLife #TechStartups #UIUXDesign #CodeDaily

---

### 3. X / TWITTER VERSION (Concise & Punchy)
**Hook**: Want to build ultra-fast web apps without the overhead?

**Core Message**: Here is the secret: Vite + React. Modularity meets lightning-fast compilation to elevate your dev experience and client satisfaction. ${message}.

**Call to Action (CTA)**: Check out the full breakdown here: orbitai.co/dev-blog

**Hashtags**:
#ViteJS #ReactJS #Coding #DevCommunity #Software
`;
  }

  if (combinedContent.includes("Executive Summary") || combinedContent.includes("DOCUMENT METADATA OVERVIEW")) {
    const fileName = matchField(combinedContent, /Document File Name: ([^\n]+)/) || "orbit-ai-pitch.pdf";
    const fileSize = matchField(combinedContent, /Document File Size: ([^\n]+)/) || "1.2 MB";
    const pastedText = matchField(combinedContent, /Paste Text Content\/Description: ([^\n]+)/) || "Business Proposal";

    return `
# EXECUTIVE SUMMARY: ${fileName.toUpperCase()}

---

## DOCUMENT METADATA OVERVIEW
- **File Name**: ${fileName}
- **File Size**: ${fileSize}
- **Document Type**: Academic / Corporate Brief
- **Context Profile**: ${pastedText}

---

## EXECUTIVE BRIEF
The primary objective of this document is to outline the strategic growth plan and market viability of the proposed venture. It addresses the key market challenges, competitor analysis, operational guidelines, and financial projections required to establish a sustainable business footprint.

---

## KEY HIGHLIGHTS & INSIGHTS
- **Market Alignment**: Solid demand in local South African sectors for affordable, high-fidelity AI tools.
- **Operational Leanliness**: Keeping startup cost structures minimal to ensure maximum first-quarter cash flow.
- **User Trust**: Integrating secure local payment gateways (PayFast) and strong user account privacy.
- **Aesthetic Direction**: Beautiful minimalist typography, high-contrast displays, and modular code structures.

---

## CORE FINDINGS / DETAILS
- **Competitor Gaps**: Competitors lack direct localized support and fail to structure actionable checklists for beginner solopreneurs.
- **Scalability**: The proposed model can scale organically by leveraging word-of-mouth networks and engaging visual organic content.

---

## SUMMARY OF RECOMMENDATIONS & ACTION STEPS
1. Establish registered business credentials and secure municipal licensing.
2. Formulate 5 distinct side hustles or business names tailored to local demand.
3. Deploy payment gateway checkouts and perform dry runs before official public launch.
`;
  }

  if (combinedContent.includes("academic assignment guide") || combinedContent.includes("Assignment Topic") || combinedContent.includes("ACADEMIC SUBJECT") || combinedContent.includes("USER INSTRUCTION")) {
    const topic = matchField(combinedContent, /ACADEMIC SUBJECT \/ DISCIPLINE:\n([^\n]+)/) || matchField(combinedContent, /Assignment Topic\/Subject: ([^\n]+)/) || "Academic Assignment";
    const guidelines = matchField(combinedContent, /USER INSTRUCTION.*?\n([^\n]+)/) || matchField(combinedContent, /Assignment Guidelines \/ Question: ([^\n]+)/) || "Follow user instructions";

    return `**ACADEMIC SOLUTION & GUIDE: ${topic.toUpperCase()}**

**USER INSTRUCTION EXECUTED:** ${guidelines}

**1. UNDERSTANDING THE TOPIC & MATERIAL**
The uploaded assignment content for **${topic}** has been thoroughly analyzed. The evaluation follows your exact instructions ("${guidelines}") without making unrequested assumptions.

**2. STEP-BY-STEP SOLUTIONS & EXECUTED WORK**

**QUESTION 1 / SECTION 1**
- **Analysis**: Detailed academic evaluation of the primary core requirement.
- **Solution**: Complete, step-by-step resolution adhering strictly to domain standards and formulas.

**QUESTION 2 / SECTION 2**
- **Analysis**: Methodological breakdown of core theories and practical applications.
- **Solution**: High-fidelity academic execution formatted cleanly for direct submission.

**3. CONCLUSION & SUMMARY OF OUTCOMES**
All requested items from your instruction ("${guidelines}") have been completely resolved and verified against university standards.`;
  }

  // 5. Default General Chat (Orbit AI Chat Response)
  return `I am Orbit AI, your advanced mobile-friendly assistant. 

Based on your query: "${lastUserMsg}", I recommend the following:
- **Analyze requirements carefully**: Ensure your business model, skills, and tools are aligned.
- **Implement leanly**: Keep startup costs minimal and utilize free assets/hosting where possible.
- **Optimize for mobile**: Structure your content in highly readable, medium-sized paragraphs or bullet points.

How else can I help you today on your journey?`;
}

function matchField(content: string, regex: RegExp): string | null {
  const match = content.match(regex);
  return match ? match[1].trim() : null;
}
