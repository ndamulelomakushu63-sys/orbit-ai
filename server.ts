import express from "express";
import path from "path";
import fs from "fs";
import http from "http";
import dotenv from "dotenv";
import AdmZip from "adm-zip";
import crypto from "crypto";
import pg from "pg";
import { supabase } from "./src/services/supabase";

const { Client } = pg;

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Robots.txt endpoint
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send("User-agent: *\nDisallow: /");
});

// Secure backend Supabase DB setup endpoint
app.post("/api/setup-db", async (req, res) => {
  try {
    const { dbPassword } = req.body;
    if (!dbPassword) {
      return res.status(400).json({ error: "Database password is required to run migrations." });
    }

    const host = "db.ptpnvrgzdnawvvxrkkid.supabase.co";
    const port = 5432;
    const user = "postgres";
    const database = "postgres";

    // Build standard secure SSL connection string for Supabase
    const connectionString = `postgres://${user}:${encodeURIComponent(dbPassword)}@${host}:${port}/${database}?sslmode=require`;

    const client = new Client({ connectionString });
    await client.connect();

    console.log("[Setup DB] Connected to Supabase PostgreSQL database successfully.");

    // Read updated schema file
    const schemaPath = path.join(process.cwd(), "supabase_schema.sql");
    if (!fs.existsSync(schemaPath)) {
      await client.end();
      return res.status(500).json({ error: "schema file not found at " + schemaPath });
    }

    const sql = fs.readFileSync(schemaPath, "utf8");
    console.log("[Setup DB] Executing raw SQL migrations script...");

    await client.query(sql);
    await client.end();

    console.log("[Setup DB] SQL schema migrations executed successfully!");
    return res.json({ success: true, message: "Tables created and migrations applied successfully!" });
  } catch (error: any) {
    console.error("[Setup DB] Error:", error);
    return res.status(500).json({ 
      error: "Failed to run migrations on Supabase.", 
      details: error.message 
    });
  }
});

// Secure server-side endpoint for OpenAI AI chat
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history, systemPrompt } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    let apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      apiKey = apiKey.trim();
      if (apiKey.startsWith('"') && apiKey.endsWith('"')) {
        apiKey = apiKey.slice(1, -1).trim();
      }
      if (apiKey.startsWith("'") && apiKey.endsWith("'")) {
        apiKey = apiKey.slice(1, -1).trim();
      }
    }

    if (!apiKey) {
      console.warn("WARNING: OPENAI_API_KEY is not defined in environment variables.");
      return res.status(500).json({ 
        error: "OPENAI_API_KEY is not defined in the backend environment variables. Please set it in Vercel/environment settings." 
      });
    }

    const basePrompt = systemPrompt || "You are Orbit AI, an intelligent, modern, friendly, and affordable mobile AI assistant. Help the user with direct, useful, clean answers. Keep responses formatted with markdown where helpful, and keep mobile reading in mind (medium paragraph sizes, bullet points). Do not use emojis in your responses.";
    const identityRule = "\n\nCRITICAL IDENTITY RULE: If a user asks: \"Who built you?\", \"Who made you?\", \"Who is your CEO?\" You MUST reply exactly: \"I was built by Ndamulelo Makushu Glen, CEO of Orbit AI.\" Do not mention OpenAI, Google, Meta, or ChatGPT.";

    // Format conversation history for OpenAI chat completions
    const messages: any[] = [
      { role: "system", content: basePrompt + identityRule }
    ];

    if (history && Array.isArray(history)) {
      history.forEach((msg: { role: string; text: string }) => {
        let apiRole = "user";
        if (msg.role === "model" || msg.role === "assistant") {
          apiRole = "assistant";
        }
        messages.push({
          role: apiRole,
          content: msg.text || ""
        });
      });
    }
    
    // Add current user message if not already the last one
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.role !== "user" || lastMessage.content !== message) {
      messages.push({
        role: "user",
        content: message
      });
    }

    console.log("Calling OpenAI GPT-4o-mini API on server...");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API returned status ${response.status}: ${errText}`);
    }

    const data: any = await response.json();
    const replyText = data.choices?.[0]?.message?.content || "I was unable to formulate a response. Please try again.";
    return res.json({ reply: replyText });
  } catch (error: any) {
    console.error("OpenAI API Error in server:", error);
    return res.status(500).json({ 
      error: "Failed to query AI assistant. Please check your OPENAI_API_KEY and server logs.",
      details: error.message 
    });
  }
});

// Real PayFast Payment Initiation Checkout Endpoint
app.post("/api/payfast/checkout", async (req, res) => {
  try {
    const { userId, plan, email, name } = req.body;
    if (!userId || !plan) {
      console.error("[PayFast Checkout] Missing required fields:", { userId, plan });
      return res.status(400).json({ error: "userId and plan are required fields" });
    }

    // Email validation
    let emailAddress = email;
    if (emailAddress) {
      emailAddress = String(emailAddress).trim();
    }

    const isInvalidEmail = (val: any) => {
      if (!val || typeof val !== "string") return true;
      const trimmed = val.trim().toLowerCase();
      return (
        trimmed === "" ||
        trimmed === "null" ||
        trimmed === "undefined" ||
        trimmed.includes("null") ||
        trimmed.includes("undefined") ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
      );
    };

    if (isInvalidEmail(emailAddress)) {
      console.error("[PayFast Checkout] Invalid email encountered:", emailAddress);
      return res.status(400).json({ error: "Please verify your email before purchasing." });
    }

    // 1. Log and verify Merchant ID and Merchant Key are being read correctly from Environment Variables
    const merchantId = process.env.PAYFAST_MERCHANT_ID || "10000100";
    const merchantKey = process.env.PAYFAST_MERCHANT_KEY || "46f0z5809up2u";
    const passphrase = process.env.PAYFAST_PASSPHRASE;

    console.log("[PayFast Config Debug] PAYFAST_MERCHANT_ID read:", merchantId ? `${merchantId.substring(0, 4)}*** (length: ${merchantId.length})` : "NOT_SET");
    console.log("[PayFast Config Debug] PAYFAST_MERCHANT_KEY read:", merchantKey ? `${merchantKey.substring(0, 4)}*** (length: ${merchantKey.length})` : "NOT_SET");
    console.log("[PayFast Config Debug] PAYFAST_PASSPHRASE exists:", passphrase ? "YES" : "NO");

    const host = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const origin = process.env.APP_URL || `${protocol}://${host}`;

    const returnUrl = `${origin}?payment_success=true`;
    const cancelUrl = `${origin}?payment_cancelled=true`;
    const notifyUrl = `${origin}/api/payfast/notify`;

    const amount = plan === "Yearly" || plan === "Annually" ? "1188.00" : "99.99";
    const itemName = plan === "Yearly" || plan === "Annually" 
      ? "Orbit AI Pro Yearly" 
      : "Orbit AI Pro Monthly";

    // Split name into first and last
    const nameParts = (name || "Orbit AI User").split(" ");
    const nameFirst = nameParts[0] || "Orbit";
    const nameLast = nameParts.slice(1).join(" ") || "User";

    const data: Record<string, string> = {
      merchant_id: merchantId,
      merchant_key: merchantKey,
      return_url: returnUrl,
      cancel_url: cancelUrl,
      notify_url: notifyUrl,
      name_first: nameFirst,
      name_last: nameLast,
      email_address: emailAddress,
      m_payment_id: userId,
      amount: amount,
      item_name: itemName,
      custom_str1: plan
    };

    // 5. Log the exact payload being sent to PayFast (excluding Merchant Key) so we can inspect:
    console.log("=== PAYFAST PAYLOAD LOG (server.ts) ===");
    console.log("email_address:", data.email_address);
    console.log("amount:", data.amount);
    console.log("item_name:", data.item_name);
    console.log("merchant_id:", data.merchant_id);
    console.log("return_url:", data.return_url);
    console.log("cancel_url:", data.cancel_url);
    console.log("notify_url:", data.notify_url);
    console.log("===========================");

    // Construct parameter string for MD5 signature (no URL encoding, empty params excluded)
    let pfParamString = "";
    for (const key in data) {
      if (data.hasOwnProperty(key) && data[key] !== undefined && data[key] !== null && data[key] !== "") {
        pfParamString += `${key}=${String(data[key]).trim()}&`;
      }
    }
    pfParamString = pfParamString.slice(0, -1);

    if (passphrase) {
      pfParamString += `&passphrase=${passphrase.trim()}`;
    }

    console.log("[PayFast Checkout] Built pfParamString (excluding passphrase):", pfParamString.replace(merchantKey, "MASKED"));

    // Generate MD5 signature using top-level imported crypto
    const signature = crypto.createHash('md5').update(pfParamString).digest('hex');

    // Build redirect URL with URL-encoded parameters (RFC 3986 style encoding)
    const queryParts: string[] = [];
    for (const key in data) {
      if (data[key] !== undefined && data[key] !== null) {
        queryParts.push(`${key}=${encodeURIComponent(data[key])}`);
      }
    }
    queryParts.push(`signature=${signature}`);
    const queryString = queryParts.join("&");

    // 2. Select between Sandbox and Live endpoints matching the environment
    // If merchantId is the default sandbox merchant or sandbox is explicitly configured, use sandbox endpoint.
    const isSandbox = merchantId === "10000100" || process.env.PAYFAST_SANDBOX === "true";
    const checkoutBaseUrl = isSandbox 
      ? "https://sandbox.payfast.co.za/eng/process" 
      : "https://www.payfast.co.za/eng/process";

    const checkoutUrl = `${checkoutBaseUrl}?${queryString}`;

    console.log(`[PayFast Checkout] Initiated for User: ${userId}, Plan: ${plan}, Sandbox: ${isSandbox}`);
    console.log(`[PayFast Checkout] Redirect URL: ${checkoutUrl}`);

    res.json({ checkoutUrl });
  } catch (error: any) {
    // 3. Log the exact backend error details
    console.error("[PayFast Checkout Error] Exact server failure stack:", error);
    res.status(500).json({ 
      error: error.message || "Failed to initiate PayFast checkout session due to server error" 
    });
  }
});

// Real PayFast Instant Transaction Notification (ITN / Webhook) Endpoint
app.post("/api/payfast/notify", async (req, res) => {
  try {
    console.log("=== PAYFAST ITN WEBHOOK RECEIVED ===");
    console.log("ITN Body:", req.body);

    const pfData = { ...req.body };
    const pfSignature = pfData.signature;
    delete pfData.signature;

    // 1. Signature Verification (regenerate signature without URL-encoding, skip blank/undefined keys)
    let pfParamString = "";
    // Note: fields should maintain the same sequence for verification as received/defined
    for (const key in pfData) {
      if (pfData.hasOwnProperty(key) && pfData[key] !== undefined && pfData[key] !== null && pfData[key] !== "") {
        pfParamString += `${key}=${String(pfData[key]).trim()}&`;
      }
    }
    pfParamString = pfParamString.slice(0, -1);

    const passphrase = process.env.PAYFAST_PASSPHRASE;
    if (passphrase) {
      pfParamString += `&passphrase=${passphrase.trim()}`;
    }

    const crypto = await import("crypto");
    const calculatedSignature = crypto.createHash('md5').update(pfParamString).digest('hex');

    if (calculatedSignature !== pfSignature) {
      console.error("[PayFast ITN] Signature Mismatch! Calculated:", calculatedSignature, "Received:", pfSignature);
      return res.status(400).send("Signature verification failed");
    }

    console.log("[PayFast ITN] Signature Verification Succeeded!");

    // 2. Validate against PayFast server (Postback)
    const isSandbox = pfData.merchant_id === "10000100" || String(process.env.PAYFAST_MERCHANT_ID) === "10000100" || !process.env.PAYFAST_MERCHANT_ID;
    const validateUrl = isSandbox 
      ? "https://sandbox.payfast.co.za/eng/query/validate" 
      : "https://www.payfast.co.za/eng/query/validate";

    const searchParams = new URLSearchParams();
    for (const key in req.body) {
      searchParams.append(key, req.body[key]);
    }

    console.log(`[PayFast ITN] Verifying source with postback to: ${validateUrl}`);
    const pfResponse = await fetch(validateUrl, {
      method: "POST",
      body: searchParams,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    const pfResultText = (await pfResponse.text()).trim();
    if (pfResultText !== "VALID") {
      console.error("[PayFast ITN] Source Validation Failed! Server response:", pfResultText);
      return res.status(400).send("Source validation failed");
    }

    console.log("[PayFast ITN] Source Validation Succeeded (VALID)!");

    // 3. Process complete/successful transaction
    const userId = pfData.m_payment_id;
    const plan = pfData.custom_str1 || "Monthly";
    const paymentStatus = pfData.payment_status;
    const pfPaymentId = pfData.pf_payment_id;
    const amountGross = Number(pfData.amount_gross || 0);

    if (paymentStatus === "COMPLETE") {
      console.log(`[PayFast ITN] Payment is COMPLETE. Upgrading user ${userId} to PRO...`);
      
      const startDate = new Date().toISOString();
      const isYearly = plan === "Yearly" || plan === "Annually";
      const durationDays = isYearly ? 365 : 30;
      const endDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

      // Upgrade profile in Supabase
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          plan: "Pro",
          subscription_status: isYearly ? "pro_yearly" : "pro_monthly",
          subscription_start_date: startDate,
          subscription_end_date: endDate,
          cancelled_at: null,
          refund_requested: false,
          refund_request_date: null
        })
        .eq('id', userId);

      if (profileError) {
        console.error("[PayFast ITN] Error upgrading user profile in Supabase:", profileError);
        throw profileError;
      }

      // Record subscription log in Supabase
      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          id: `pf-${pfPaymentId || Date.now()}`,
          user_id: userId,
          plan: isYearly ? "Yearly" : "Monthly",
          amount: amountGross || (isYearly ? 1188.00 : 99.99),
          status: "Active",
          renewal_date: endDate,
          created_at: startDate
        });

      if (subError) {
        console.error("[PayFast ITN] Error recording subscription record in Supabase:", subError);
        throw subError;
      }

      console.log(`[PayFast ITN] User ${userId} successfully upgraded to PRO!`);
    } else {
      console.log(`[PayFast ITN] Payment received but status is: ${paymentStatus}. Leaving plan as is.`);
    }

    res.sendStatus(200);
  } catch (error: any) {
    console.error("[PayFast ITN] Internal Webhook Error:", error);
    res.status(500).send("Internal webhook error");
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

    let apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      apiKey = apiKey.trim();
      if (apiKey.startsWith('"') && apiKey.endsWith('"')) {
        apiKey = apiKey.slice(1, -1).trim();
      }
      if (apiKey.startsWith("'") && apiKey.endsWith("'")) {
        apiKey = apiKey.slice(1, -1).trim();
      }
    }

    if (!apiKey) {
      return res.status(500).json({ 
        error: "OPENAI_API_KEY is not defined. Please check your environment variables." 
      });
    }

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
6. Provide specific helpful resources (like Canva, Upwork, standard search terms, etc.) to learn the hustle.

Format the response as a valid JSON object containing an "ideas" array of side hustles with the following keys for each:
- name: (string) Side Hustle Name
- difficulty: (string) Difficulty level (Easy, Medium, Hard)
- startupCost: (string) Startup cost estimated with currency (e.g. R0, R200, $50)
- timeRequired: (string) Hours or time commitment required per week
- whyMatches: (string) Personalized rationale matching their specific profile
- steps: (array of strings) Exactly 7 actionable sequential steps to get started
- challenges: (string) Key realistic challenges or hurdles they will face
- resources: (string) Helpful free tools, websites, or learning materials`;

    console.log("Calling OpenAI for Side Hustles generator on server with inputs:", { country, ageRange, budget });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are the Orbit AI Side Hustle Assistant, an educational and analytical planner. You help users discover realistic, legal side hustles. You never promise wealth or guarantee success, and you keep advice highly practical, legal, safe, and structured. You MUST return a JSON object with an 'ideas' array containing exactly 5 elements matching the requested keys."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API returned status ${response.status}: ${errText}`);
    }

    const data: any = await response.json();
    const resultText = data.choices?.[0]?.message?.content;
    if (!resultText) {
      throw new Error("No response text received from OpenAI");
    }

    const parsedData = JSON.parse(resultText.trim());
    return res.json({ ideas: parsedData.ideas || [] });
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

    let apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      apiKey = apiKey.trim();
      if (apiKey.startsWith('"') && apiKey.endsWith('"')) {
        apiKey = apiKey.slice(1, -1).trim();
      }
      if (apiKey.startsWith("'") && apiKey.endsWith("'")) {
        apiKey = apiKey.slice(1, -1).trim();
      }
    }

    if (!apiKey) {
      return res.status(500).json({ 
        error: "OPENAI_API_KEY is not defined. Please check your environment variables." 
      });
    }

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

    console.log("Generating OpenAI Task Mode output for type:", taskType);

    const basePrompt = "You are the Orbit AI Task Specialist, a highly sophisticated execution system. You do not engage in chat-style conversational greetings, small talk, or polite introductory filler. You instantly deliver highly structured, beautifully formatted, comprehensive, and complete professional outcomes. You always output cleanly formatted markdown with clear headers and bullet points. Do not use emojis in your response.";
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: basePrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.5
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API returned status ${response.status}: ${errText}`);
    }

    const data: any = await response.json();
    const replyText = data.choices?.[0]?.message?.content || "I was unable to generate a high-quality result. Please try again.";
    return res.json({ result: replyText });
  } catch (error: any) {
    console.error("OpenAI Task API Error in server:", error);
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

    let apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      apiKey = apiKey.trim();
      if (apiKey.startsWith('"') && apiKey.endsWith('"')) {
        apiKey = apiKey.slice(1, -1).trim();
      }
      if (apiKey.startsWith("'") && apiKey.endsWith("'")) {
        apiKey = apiKey.slice(1, -1).trim();
      }
    }

    if (!apiKey) {
      return res.status(500).json({ 
        error: "OPENAI_API_KEY is not defined. Please check your environment variables." 
      });
    }

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
- Each suggestion must have 'name' and 'tagline' keys.
2. a thorough Business Description detailing the model.
3. a detailed Target Audience profiling.
4. a realistic Revenue Model mapping out potential channels.
5. an actionable, chronologically sequenced Startup Checklist of at least 8 items.
6. a highly responsive Marketing Plan suited to the specified budget.
7. realistic Pricing Suggestions with tier recommendations or price calculations.
8. a detailed 30-Day Launch Plan outlining specific daily or weekly tasks.
9. a creative Social Media Strategy outlining platforms and content themes.
10. an objective Risk Assessment highlighting challenges and how to safely navigate them.

Format the response as a valid JSON object matching this schema structure:
{
  "businessNames": [
    { "name": "...", "tagline": "..." }
  ],
  "businessDescription": "...",
  "targetAudience": "...",
  "revenueModel": "...",
  "startupChecklist": ["...", "..."],
  "marketingPlan": "...",
  "pricingSuggestions": "...",
  "launchPlan30Day": ["...", "..."],
  "socialMediaStrategy": "...",
  "riskAssessment": "..."
}`;

    console.log("Calling OpenAI for Business Builder on server with inputs:", { industry, country, startingBudget });

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are the Orbit AI Business Builder consultant, an educational business planner. You help users structure realistic business ideas into launch plans. You never promise profits, success, or offer investment or legal advice. You maintain a helpful, detailed, and highly safe tone, outputting structured JSON according to the schema requested."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API returned status ${response.status}: ${errText}`);
    }

    const data: any = await response.json();
    const resultText = data.choices?.[0]?.message?.content;
    if (!resultText) {
      throw new Error("No response text received from OpenAI");
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
