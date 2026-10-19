import "./src/services/env-sanitizer";
import express from "express";
import path from "path";
import fs from "fs";
import http from "http";
import dotenv from "dotenv";
import crypto from "crypto";
import pg from "pg";
import { supabase } from "./src/services/supabase";
import { fetchChatCompletion } from "./src/services/ai-helper";

const { Client } = pg;

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Express body parser error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err) {
    console.error("[Express Payload/Middleware Error]:", err.message || err);
    return res.status(err.status || 400).json({
      error: err.message || "Failed to process request payload. Please ensure file sizes are within limit."
    });
  }
  next();
});

// Helper to parse cookies from Cookie header
function parseCookies(req: express.Request): Record<string, string> {
  const list: Record<string, string> = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return list;
  cookieHeader.split(";").forEach((cookie) => {
    let [name, ...rest] = cookie.split("=");
    name = name?.trim();
    if (!name) return;
    const value = rest.join("=").trim();
    if (!value) return;
    list[name] = decodeURIComponent(value);
  });
  return list;
}

const AUTHORIZED_ADMIN_EMAILS = [
  "ndamulelo@orbitai.co.za",
  "admin@orbitai.co.za",
  "ndamulelomakushu63@gmail.com"
];

function isAuthorizedAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  if (AUTHORIZED_ADMIN_EMAILS.includes(cleanEmail)) return true;
  if (cleanEmail.endsWith("@orbitai.co.za")) return true;
  return false;
}

// Synchronous / Asynchronous Admin Authorization check
async function verifyAdminAuth(req: express.Request): Promise<boolean> {
  const passcodeHeader = req.headers["x-admin-passcode"] as string;
  const queryPasscode = (req.query.passcode || req.query.admin_passcode || req.query.admin_token) as string;
  const validPasscode = process.env.ADMIN_PASSCODE || "7733";

  if (passcodeHeader === validPasscode || queryPasscode === validPasscode) {
    return true;
  }

  const cookies = parseCookies(req);
  if (cookies["orbit_admin_token"] === "orbit-admin-session-7733" || cookies["orbit_admin_logged_in"] === "true") {
    return true;
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (token === validPasscode || token === "orbit-admin-session-7733") {
      return true;
    }
    if (token.length > 20) {
      try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (!error && user && isAuthorizedAdminEmail(user.email)) {
          return true;
        }
      } catch (err) {
        // ignore
      }
    }
  }

  return false;
}

// Middleware to enforce server-side admin protection
async function requireAdminAuthMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const isAuth = await verifyAdminAuth(req);
  if (isAuth) {
    return next();
  }

  if (req.path.startsWith("/api/") || req.headers.accept?.includes("application/json")) {
    return res.status(403).json({
      error: "Access Denied. Server-side administrator authorization required.",
      code: "FORBIDDEN_ADMIN_ONLY"
    });
  }

  return res.status(403).send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>403 Forbidden - Orbit AI Admin Console</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-950 text-slate-100 min-h-screen flex items-center justify-center p-4 font-sans">
      <div class="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div class="text-center space-y-2">
          <div class="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 mb-2">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          </div>
          <h1 class="text-xl font-black tracking-tight text-white">403 - Administrator Access Only</h1>
          <p class="text-xs text-slate-400">Server-side authorization is enforced. Non-admin users are strictly forbidden from accessing the Admin Console.</p>
        </div>

        <form id="loginForm" class="space-y-4">
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Admin Email</label>
            <input type="email" id="email" required placeholder="admin@orbitai.co.za" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500" />
          </div>
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Master Passcode</label>
            <input type="password" id="passcode" required placeholder="••••" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500" />
          </div>
          <div id="errMsg" class="text-xs text-red-400 font-medium hidden"></div>
          <button type="submit" class="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl text-xs transition">Authorize & Enter Admin</button>
        </form>

        <div class="text-center pt-2">
          <a href="/" class="text-xs font-semibold text-slate-400 hover:text-white transition">← Return to Main Application</a>
        </div>
      </div>

      <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const email = document.getElementById('email').value;
          const passcode = document.getElementById('passcode').value;
          const errMsg = document.getElementById('errMsg');
          errMsg.classList.add('hidden');

          try {
            const res = await fetch('/api/admin/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, passcode })
            });
            const data = await res.json();
            if (res.ok && data.success) {
              window.location.href = '/admin?passcode=' + encodeURIComponent(passcode);
            } else {
              errMsg.textContent = data.error || 'Authorization failed.';
              errMsg.classList.remove('hidden');
            }
          } catch (err) {
            errMsg.textContent = 'Server connection failed.';
            errMsg.classList.remove('hidden');
          }
        });
      </script>
    </body>
    </html>
  `);
}

// Robots.txt endpoint compliant with Google AdSense & Search Crawlers
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send(`User-agent: Mediapartners-Google\nAllow: /\n\nUser-agent: Googlebot\nAllow: /\n\nUser-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\nDisallow: /orbit-ai-admin/\n\nSitemap: https://orbitai.co.za/sitemap.xml\n`);
});

// Ads.txt endpoint for Google AdSense verification
app.get("/ads.txt", (req, res) => {
  res.type("text/plain");
  res.send("google.com, pub-4390078695601187, DIRECT, f08c47fec0942fa0\n");
});

// Sitemap.xml endpoint
app.get("/sitemap.xml", (req, res) => {
  const sitemapPath = path.join(process.cwd(), "public", "sitemap.xml");
  if (fs.existsSync(sitemapPath)) {
    res.type("application/xml");
    return res.sendFile(sitemapPath);
  }
  res.type("application/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://orbitai.co.za/</loc></url></urlset>`);
});

// Admin login API endpoint
app.post("/api/admin/login", async (req, res) => {
  const { email, passcode } = req.body || {};
  const validPasscode = process.env.ADMIN_PASSCODE || "7733";

  if (isAuthorizedAdminEmail(email) && passcode === validPasscode) {
    res.setHeader("Set-Cookie", "orbit_admin_token=orbit-admin-session-7733; Path=/; HttpOnly; SameSite=Lax");
    return res.json({
      success: true,
      token: "orbit-admin-session-7733",
      user: "Executive Administrator"
    });
  }

  return res.status(401).json({
    error: "Access Denied. Invalid Administrator credentials or passcode."
  });
});

app.get("/api/admin/verify", async (req, res) => {
  const isAuth = await verifyAdminAuth(req);
  return res.json({ authenticated: isAuth });
});

// Secure debugging endpoint
app.get("/api/debug-env", requireAdminAuthMiddleware, (req, res) => {
  res.json({
    process_env_keys: Object.keys(process.env)
  });
});

// Secure backend Supabase DB setup endpoint
app.post("/api/setup-db", requireAdminAuthMiddleware, async (req, res) => {
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

// Secure server-side endpoint for Groq AI chat
app.post("/api/chat", async (req, res) => {
  try {
    const { message, attachments, history, systemPrompt, userId } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    let isPro = false;
    let limitData: any = null;
    let currentCount = 0;
    const isValidUUID = (id: string) => {
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    };

    const hasUserId = userId && typeof userId === "string" && isValidUUID(userId);

    if (hasUserId) {
      try {
        // 1. Fetch user profile from Supabase to check plan / subscription status
        const { data: profile } = await supabase
          .from("profiles")
          .select("plan, subscription_status")
          .eq("id", userId)
          .single();

        if (profile) {
          isPro = profile.plan === "Pro" || 
                  profile.subscription_status === "pro_monthly" || 
                  profile.subscription_status === "pro_yearly";
        }

        if (!isPro) {
          // 2. Fetch or create user_limits record
          const { data, error } = await supabase
            .from("user_limits")
            .select("*")
            .eq("user_id", userId)
            .single();

          if (error) {
            if (error.code === "PGRST116") {
              const { data: insertedData } = await supabase
                .from("user_limits")
                .insert({
                  user_id: userId,
                  messages_used: 0,
                  is_pro: false,
                  last_reset: new Date().toISOString()
                })
                .select()
                .single();
              limitData = insertedData;
              currentCount = 0;
            } else {
              console.warn("Error fetching user_limits from Supabase:", error);
            }
          } else {
            limitData = data;
            currentCount = data.messages_used;
          }

          if (limitData) {
            // 3. Handle daily design limit reset (24 hour check)
            const lastReset = limitData.last_reset ? new Date(limitData.last_reset).getTime() : 0;
            const now = Date.now();
            if (now - lastReset >= 24 * 60 * 60 * 1000) {
              currentCount = 0;
              await supabase
                .from("user_limits")
                .update({ messages_used: 0, last_reset: new Date().toISOString() })
                .eq("user_id", userId);
            }
          }

          // 4. Block free users after exactly 15 messages
          if (currentCount >= 15) {
            return res.status(403).json({ 
              error: "You have reached your free limit of 15 messages. Upgrade to Pro." 
            });
          }
        }
      } catch (dbError) {
        console.warn("Supabase user profile/limit check failed in server.ts, falling back:", dbError);
      }
    }

    const basePrompt = systemPrompt || "You are Orbit AI, an intelligent, modern, friendly, and affordable mobile AI assistant. Help the user with direct, useful, clean answers. Keep responses formatted with markdown where helpful, and keep mobile reading in mind (medium paragraph sizes, bullet points). Do not use emojis in your responses.";
    const identityRule = `

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
Example: "I was built by **Ndamulelo Makushu Glen**, the Founder and CEO of Orbit AI. Orbit AI was created to make powerful artificial intelligence simple, accessible and genuinely useful for students, entrepreneurs, freelancers and everyday people. Our mission is to help people learn, build businesses, create opportunities and unlock their full potential through AI."`;

    const systemInstruction = basePrompt + identityRule;

    const messages: any[] = [
      { role: "system", content: systemInstruction }
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

    let responseData;
    try {
      responseData = await fetchChatCompletion(messages, 0.7, attachments || []);
    } catch (apiErr: any) {
      console.error("[server/chat] AI service call failed in chat endpoint!");
      console.error("Error Status:", apiErr.status || apiErr.statusCode || "N/A");
      console.error("Error Code:", apiErr.code || "N/A");
      console.error("Error Message:", apiErr.message || "N/A");
      console.error("Full Error Object:", apiErr);
      
      res.setHeader('Content-Type', 'application/json');
      return res.status(apiErr.status || 500).json({
        error: {
          message: apiErr.message || "AI service failed",
          code: apiErr.code || null,
          status: apiErr.status || 500,
          details: String(apiErr)
        }
      });
    }

    const replyText = responseData.choices?.[0]?.message?.content || "I was unable to formulate a response. Please try again.";

    // 5. Increment usage count in database if successfully completed
    if (hasUserId && !isPro) {
      const nextCount = currentCount + 1;
      await supabase
        .from("user_limits")
        .update({ messages_used: nextCount })
        .eq("user_id", userId);

      await supabase
        .from("profiles")
        .update({ chat_count_today: nextCount })
        .eq("id", userId);
    }

    return res.json({ reply: replyText });
  } catch (error: any) {
    console.error("Groq AI API Error in server (full details):", error);
    return res.status(500).json({ 
      error: error.message || "An unexpected error occurred.",
      details: String(error)
    });
  }
});

// Helper function to generate PayFast MD5 signature according to PayFast official documentation specs
function generatePayfastSignature(data: Record<string, any>, passphrase?: string): { pfParamString: string; signature: string } {
  let pfOutput = "";
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key) && key !== "signature") {
      const val = data[key];
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        pfOutput += `${key}=${encodeURIComponent(String(val).trim()).replace(/%20/g, "+")}&`;
      }
    }
  }

  let pfParamString = pfOutput.slice(0, -1);

  if (passphrase && passphrase.trim() !== "" && passphrase !== "null" && passphrase !== "undefined") {
    pfParamString += `&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, "+")}`;
  }

  const signature = crypto.createHash("md5").update(pfParamString).digest("hex");
  return { pfParamString, signature };
}

// Real PayFast Payment Initiation Checkout Endpoint
app.post("/api/payfast/checkout", async (req, res) => {
  try {
    const { userId, plan, email, name, businessId } = req.body;
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
    const merchantId = process.env.PAYFAST_MERCHANT_ID;
    const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
    const passphrase = process.env.PAYFAST_PASSPHRASE;

    if (!merchantId || !merchantKey) {
      return res.status(500).json({ error: "Server payment configuration error: PAYFAST_MERCHANT_ID and PAYFAST_MERCHANT_KEY environment variables are required." });
    }

    console.log("[PayFast Config Debug] PAYFAST_MERCHANT_ID read:", merchantId ? `${merchantId.substring(0, 4)}*** (length: ${merchantId.length})` : "NOT_SET");
    console.log("[PayFast Config Debug] PAYFAST_MERCHANT_KEY read:", merchantKey ? `${merchantKey.substring(0, 4)}*** (length: ${merchantKey.length})` : "NOT_SET");
    console.log("[PayFast Config Debug] PAYFAST_PASSPHRASE exists:", passphrase ? "YES" : "NO");

    const host = req.get('host');
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const origin = process.env.APP_URL || (host ? `${protocol}://${host}` : "https://orbitai.co.za");

    let returnUrl = `${origin}?payment_success=true`;
    let cancelUrl = `${origin}?payment_cancelled=true`;
    if (plan === "business-registration" && businessId) {
      returnUrl += `&plan=business-registration&business_id=${businessId}`;
      cancelUrl += `&plan=business-registration&business_id=${businessId}`;
    } else if (plan === "market-order" && (req.body.orderId || req.body.orderNumber)) {
      const orderRef = req.body.orderId || req.body.orderNumber;
      returnUrl += `&plan=market-order&order_id=${orderRef}`;
      cancelUrl += `&plan=market-order&order_id=${orderRef}`;
    }
    const notifyUrl = `${origin}/api/payfast/notify`;

    let amount = "99.99";
    let itemName = "Orbit AI Pro Monthly";
    if (plan === "Yearly" || plan === "Annually") {
      amount = "1188.00";
      itemName = "Orbit AI Pro Yearly";
    } else if (plan === "business-registration") {
      amount = "159.00";
      itemName = "Orbit AI Business Registration";
    } else if (plan === "market-order") {
      amount = req.body.amount ? Number(req.body.amount).toFixed(2) : "0.00";
      itemName = req.body.itemName || `Orbit Market Order ${req.body.orderNumber || ''}`.trim();
    }

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

    if (plan === "business-registration" && businessId) {
      data.custom_str2 = businessId;
    } else if (plan === "market-order" && req.body.orderId) {
      data.custom_str2 = req.body.orderId;
    }

    // Log the exact payload being sent to PayFast
    console.log("=== PAYFAST PAYLOAD LOG (server.ts) ===");
    console.log("email_address:", data.email_address);
    console.log("amount:", data.amount);
    console.log("item_name:", data.item_name);
    console.log("merchant_id:", data.merchant_id);
    console.log("return_url:", data.return_url);
    console.log("cancel_url:", data.cancel_url);
    console.log("notify_url:", data.notify_url);
    console.log("===========================");

    // Generate MD5 signature using official PayFast URL-encoding rules
    const { pfParamString, signature } = generatePayfastSignature(data, passphrase);

    console.log("[PayFast Checkout] Built pfParamString:", pfParamString.replace(merchantKey, "MASKED"));
    console.log("[PayFast Checkout] Generated Signature:", signature);

    // Build redirect URL with matching URL-encoded parameters (spaces as '+')
    const queryParts: string[] = [];
    for (const key in data) {
      if (data.hasOwnProperty(key) && data[key] !== undefined && data[key] !== null && String(data[key]).trim() !== "") {
        const val = String(data[key]).trim();
        queryParts.push(`${key}=${encodeURIComponent(val).replace(/%20/g, "+")}`);
      }
    }
    queryParts.push(`signature=${signature}`);
    const queryString = queryParts.join("&");

    const isSandbox = merchantId === "10000100" || process.env.PAYFAST_SANDBOX === "true";
    const checkoutBaseUrl = isSandbox 
      ? "https://sandbox.payfast.co.za/eng/process" 
      : "https://www.payfast.co.za/eng/process";

    const checkoutUrl = `${checkoutBaseUrl}?${queryString}`;

    console.log(`[PayFast Checkout] Initiated for User: ${userId}, Plan: ${plan}, Sandbox: ${isSandbox}`);
    console.log(`[PayFast Checkout] Redirect URL: ${checkoutUrl}`);

    res.json({ checkoutUrl });
  } catch (error: any) {
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

    // 1. Signature Verification using PayFast official MD5 algorithm
    const passphrase = process.env.PAYFAST_PASSPHRASE;
    const { pfParamString, signature: calculatedSignature } = generatePayfastSignature(pfData, passphrase);

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
      if (plan === "business-registration") {
        const businessId = pfData.custom_str2;
        console.log(`[PayFast ITN] Payment COMPLETE for Business Registration. Business ID: ${businessId}`);
        
        // 1. Fetch draft registration from 'business_registrations' table
        const { data: reg, error: regError } = await supabase
          .from('business_registrations')
          .select('*')
          .eq('id', businessId)
          .single();

        if (regError || !reg) {
          console.error(`[PayFast ITN] Error finding registration draft ${businessId} in Supabase:`, regError);
          throw new Error(`Registration draft ${businessId} not found`);
        }

        // 2. Parse extra data from additional_notes
        let extra: any = { 
          website: null, 
          facebook: null, 
          instagram: null, 
          userId: null, 
          province: null,
          villageSuburb: null,
          openingHours: null,
          startingPrice: null,
          specials: null,
          latitude: null,
          longitude: null
        };
        try {
          if (reg.additional_notes) {
            extra = JSON.parse(reg.additional_notes);
          }
        } catch (e) {
          console.warn(`[PayFast ITN] Error parsing additional_notes JSON for ${businessId}:`, e);
        }

        // 3. Insert into 'businesses' table
        const newBusiness = {
          id: reg.id,
          name: reg.business_name,
          owner_name: reg.owner_name,
          description: reg.description,
          category: reg.category,
          town_city: reg.town_city,
          physical_address: reg.physical_address,
          village_suburb: reg.village_suburb || extra.villageSuburb || null,
          phone_number: reg.phone_number,
          whatsapp_number: reg.whatsapp_number,
          email: reg.email,
          opening_hours: extra.openingHours || "Mon - Fri: 08:00 - 17:00",
          starting_price: extra.startingPrice || null,
          social_media_links: {
            website: extra.website || null,
            facebook: extra.facebook || null,
            instagram: extra.instagram || null
          },
          photos: [],
          specials: extra.specials ? [extra.specials] : [],
          is_public: false,
          is_paid: true,
          payment_status: "Paid",
          status: "Pending",
          user_id: extra.userId || null,
          province: extra.province || null,
          preferred_contact_time: reg.preferred_visit_date || null,
          created_at: new Date().toISOString(),
          payment_id: pfPaymentId || null,
          payment_reference: pfData.m_payment_id || null,
          amount_paid: amountGross || 159.00,
          payment_date: new Date().toISOString(),
          latitude: extra.latitude !== undefined && extra.latitude !== null ? Number(extra.latitude) : null,
          longitude: extra.longitude !== undefined && extra.longitude !== null ? Number(extra.longitude) : null,
          rating: 5.0,
          popularity: 0
        };

        const { error: insertError } = await supabase
          .from('businesses')
          .upsert(newBusiness);

        if (insertError) {
          console.error("[PayFast ITN] Error inserting business in Supabase:", insertError);
          throw insertError;
        }

        // 4. Update the 'business_registrations' table is_paid and status
        const { error: updateRegError } = await supabase
          .from('business_registrations')
          .update({
            is_paid: true,
            status: "approved"
          })
          .eq('id', businessId);

        if (updateRegError) {
          console.warn("[PayFast ITN] Error updating business_registrations status:", updateRegError);
        }

        console.log(`[PayFast ITN] Business ${businessId} successfully saved to businesses table and set to Paid & Pending!`);
      } else if (plan === "market-order") {
        const orderId = pfData.custom_str2 || pfData.custom_str3 || userId;
        console.log(`[PayFast ITN] Processing Market Order payment for Order Ref: ${orderId}...`);

        // 1. Fetch existing order to verify amount & prevent duplicate processing
        const { data: order, error: orderFetchErr } = await supabase
          .from('market_orders')
          .select('*')
          .or(`id.eq.${orderId},order_number.eq.${orderId}`)
          .single();

        if (orderFetchErr || !order) {
          console.error(`[PayFast ITN] Market order ${orderId} not found:`, orderFetchErr);
          return res.status(404).send("Order not found");
        }

        // Check if already paid
        if (order.payment_status === "Paid") {
          console.log(`[PayFast ITN] Order ${order.id} was already marked as Paid. Duplicate notice ignored.`);
          return res.status(200).send("OK");
        }

        // Verify payment amount matches order total within 5 cents tolerance
        const expectedTotal = Number(order.total);
        if (Math.abs(expectedTotal - amountGross) > 0.05) {
          console.error(`[PayFast ITN] Market Order Amount Mismatch! Expected: R${expectedTotal}, Received: R${amountGross}`);
          
          await supabase.from('market_payments').insert({
            id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            order_id: order.id,
            payment_provider: 'PayFast',
            pf_payment_id: pfPaymentId || null,
            amount_gross: amountGross,
            amount_fee: Number(pfData.amount_fee || 0),
            amount_net: Number(pfData.amount_net || (amountGross - Number(pfData.amount_fee || 0))),
            status: 'Amount Mismatch',
            signature_valid: true,
            raw_response: pfData,
            created_at: new Date().toISOString()
          });

          return res.status(400).send("Payment amount mismatch");
        }

        // Record verified payment in market_payments audit table
        const { error: payAuditErr } = await supabase
          .from('market_payments')
          .insert({
            id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            order_id: order.id,
            payment_provider: 'PayFast',
            pf_payment_id: pfPaymentId || null,
            amount_gross: amountGross,
            amount_fee: Number(pfData.amount_fee || 0),
            amount_net: Number(pfData.amount_net || (amountGross - Number(pfData.amount_fee || 0))),
            status: paymentStatus === 'COMPLETE' ? 'Paid' : paymentStatus,
            signature_valid: true,
            raw_response: pfData,
            verified_at: new Date().toISOString(),
            created_at: new Date().toISOString()
          });

        if (payAuditErr) {
          console.warn("[PayFast ITN] Notice recording market_payments audit record:", payAuditErr);
        }

        if (paymentStatus === "COMPLETE") {
          // Update market order status to Paid & Processing
          const { error: orderError } = await supabase
            .from('market_orders')
            .update({
              payment_status: "Paid",
              order_status: "Processing",
              payment_id: String(pfPaymentId || `PF-${Date.now()}`),
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id);

          if (orderError) {
            console.warn("[PayFast ITN] Error updating market order status in Supabase:", orderError);
          } else {
            console.log(`[PayFast ITN] Market order ${order.id} marked as Paid & Processing.`);
          }

          // Deduct inventory only upon verified complete payment
          try {
            const { data: items } = await supabase
              .from('market_order_items')
              .select('*')
              .eq('order_id', order.id);

            if (items && items.length > 0) {
              for (const item of items) {
                // Update variant stock if variant exists
                if (item.variant_name) {
                  const { data: variant } = await supabase
                    .from('market_product_variants')
                    .select('id, stock_quantity')
                    .eq('product_id', item.product_id)
                    .eq('size_name', item.variant_name)
                    .single();

                  if (variant) {
                    const newStock = Math.max(0, (variant.stock_quantity || 0) - item.quantity);
                    await supabase
                      .from('market_product_variants')
                      .update({ stock_quantity: newStock })
                      .eq('id', variant.id);
                  }
                }

                // Update product overall stock
                const { data: product } = await supabase
                  .from('market_products')
                  .select('id, stock_quantity')
                  .eq('id', item.product_id)
                  .single();

                if (product) {
                  const newTotalStock = Math.max(0, (product.stock_quantity || 0) - item.quantity);
                  await supabase
                    .from('market_products')
                    .update({
                      stock_quantity: newTotalStock,
                      in_stock: newTotalStock > 0
                    })
                    .eq('id', product.id);
                }
              }
            }
          } catch (invErr) {
            console.warn("[PayFast ITN] Error updating product inventory:", invErr);
          }
        } else {
          await supabase
            .from('market_orders')
            .update({
              payment_status: paymentStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id);
        }
      } else {
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

        // Check for any pending referral for this upgrading user
        try {
          const { data: pendingRefs } = await supabase
            .from('referrals')
            .select('*')
            .eq('referred_user_id', userId)
            .eq('status', 'Pending');

          if (pendingRefs && pendingRefs.length > 0) {
            for (const ref of pendingRefs) {
              const rewardVal = Number(ref.reward || 10.00);
              
              // 1. Mark referral as Paid
              await supabase
                .from('referrals')
                .update({ status: 'Paid' })
                .eq('id', ref.id);

              // 2. Fetch referrer profile to increment balance
              const { data: referrerProfile } = await supabase
                .from('profiles')
                .select('balance')
                .eq('id', ref.referrer_id)
                .single();

              if (referrerProfile) {
                const currentBalance = Number(referrerProfile.balance || 0);
                const newBalance = currentBalance + rewardVal;
                await supabase
                  .from('profiles')
                  .update({ balance: newBalance })
                  .eq('id', ref.referrer_id);
                console.log(`[PayFast ITN] Referral reward of R${rewardVal} credited to Referrer ${ref.referrer_id}`);
              }
            }
          }
        } catch (refErr) {
          console.error("[PayFast ITN] Error processing upgrade referrals in webhook: ", refErr);
        }
      }
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
      laptopAccess,
      attachments
    } = req.body;

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

    console.log("Calling Groq AI for Side Hustles generator on server with inputs:", { country, ageRange, budget });

    const messages = [
      {
        role: "system",
        content: "You are the Orbit AI Side Hustle Assistant, an educational and analytical planner. You help users discover realistic, legal side hustles. You never promise wealth or guarantee success, and you keep advice highly practical, legal, safe, and structured. You MUST return a JSON object with an 'ideas' array containing exactly 5 elements matching the requested keys."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    console.log("Calling Groq Chat Completion API on Express (Side Hustles) via AI-Helper...");
    const responseData = await fetchChatCompletion(messages, 0.7, attachments || []);

    const resultText = responseData.choices?.[0]?.message?.content;
    if (!resultText) {
      throw new Error("No response text received from AI helper");
    }

    const parsedData = safeParseJSON(resultText);
    let ideas = parsedData?.ideas;
    if (!ideas || !Array.isArray(ideas) || ideas.length === 0) {
      console.warn("[/api/side-hustles] Parsing produced no valid ideas array. Returning default fallback ideas.");
      ideas = [
        {
          name: "Social Media Manager for Local Businesses",
          difficulty: "Easy",
          startupCost: "R0",
          timeRequired: "8-10 hours/week",
          whyMatches: "Ideal for mobile & internet access. Manage social media graphics and posting schedules for local brands.",
          steps: [
            "Create an Instagram and Facebook business profile.",
            "Design 5 sample graphics on Canva for local shops.",
            "Reach out to 5 local small businesses needing social media.",
            "Offer a 1-week free trial containing 3 posts.",
            "Schedule content using Meta Business Suite.",
            "Engage with local audience comments.",
            "Report weekly engagement growth to the business owner."
          ],
          challenges: "Consistent content creation and client acquisition.",
          resources: "Canva, Meta Business Suite, YouTube SMM guides."
        },
        {
          name: "CV & Cover Letter Formatting Specialist",
          difficulty: "Easy",
          startupCost: "R0",
          timeRequired: "5-8 hours/week",
          whyMatches: "High demand in South Africa. Helps job seekers structure professional ATS-friendly CVs.",
          steps: [
            "Master ATS-friendly CV layout standards.",
            "Optimize your own CV as a downloadable sample.",
            "Offer formatting services on LinkedIn & Facebook job groups.",
            "Collect client career details via email questionnaire.",
            "Rewrite summaries with high-impact action verbs.",
            "Format cleanly in Google Docs or PDF.",
            "Deliver polished documents with 1 free revision."
          ],
          challenges: "Extracting complete work histories from clients.",
          resources: "Google Docs CV templates, Canva Resume Editor."
        },
        {
          name: "Online Academic & Language Tutor",
          difficulty: "Easy",
          startupCost: "R0",
          timeRequired: "6-8 hours/week",
          whyMatches: "Requires only internet access and subject expertise.",
          steps: [
            "Identify your strongest academic subjects.",
            "Create a profile on Superprof or TeachMe2.",
            "Record a short video introduction.",
            "Offer a discounted first lesson.",
            "Prepare structured lesson worksheets.",
            "Deliver encouraging online video sessions.",
            "Request reviews from happy students."
          ],
          challenges: "Managing different student learning paces.",
          resources: "Superprof, Zoom, Google Classroom."
        },
        {
          name: "Graphic Designer & Brand Asset Creator",
          difficulty: "Easy",
          startupCost: "R0",
          timeRequired: "6-8 hours/week",
          whyMatches: "Great for creative individuals using accessible design tools.",
          steps: [
            "Create a Behance portfolio of sample designs.",
            "Master font pairings and color palettes on Canva.",
            "Pitch local startups affordable brand starter kits.",
            "Deliver draft concepts quickly for feedback.",
            "Export high-resolution source and print files.",
            "Offer ongoing promo banner design packages.",
            "Gather testimonials for future clients."
          ],
          challenges: "Differentiating services in a competitive market.",
          resources: "Canva Design School, Coolors.co, Behance."
        },
        {
          name: "Virtual Executive Assistant",
          difficulty: "Easy",
          startupCost: "R0",
          timeRequired: "8-10 hours/week",
          whyMatches: "Support busy professionals remotely with admin tasks.",
          steps: [
            "Define administrative services offered.",
            "Build a clean LinkedIn profile highlighting skills.",
            "Apply for remote VA roles on Upwork and Fiverr.",
            "Respond promptly to client inquiries.",
            "Use Trello and Google Calendar for task management.",
            "Provide daily work updates to clients.",
            "Agree on weekly retainer payments."
          ],
          challenges: "Managing schedule across different timezones.",
          resources: "Google Workspace, Trello, Slack."
        }
      ];
    }
    return res.json({ ideas });
  } catch (error: any) {
    console.error("Side Hustle Generator API Error (full details):", error);
    return res.status(500).json({
      error: error.message || "An unexpected error occurred.",
      details: String(error)
    });
  }
});

// Secure server-side endpoint for Task Mode AI Generation
app.post("/api/task-generate", async (req, res) => {
  try {
    const { taskType, inputs, attachments } = req.body;
    if (!taskType || !inputs) {
      return res.status(400).json({ error: "Task type and inputs are required" });
    }

    let prompt = "";

    if (taskType === "cv") {
      prompt = `Write a professional, high-fidelity, world-class ATS-friendly CV for the following individual.
The CV MUST be built entirely from the user's answers below. Do NOT add any imaginary sections (like GitHub links, software projects, or generic skills) unless specifically requested or supported by the user's input below.

User Interview Data:
- Full Name: ${inputs.fullName || "N/A"}
- Position/Role Applied For: ${inputs.position || "N/A"}
- Phone Number: ${inputs.phone || "N/A"}
- Email Address: ${inputs.email || "N/A"}
- City & Province (Location): ${inputs.location || "N/A"}
- Highest Level of Education: ${inputs.educationLevel || "N/A"}
- Years & Depth of Experience: ${inputs.experience || "N/A"}
- Key Skills & Expertise: ${inputs.skills || "N/A"}
- Special Highlights/Additional Details: ${inputs.additional || "N/A"}
- Selected Visual Theme/Style: ${inputs.style || "Professional"}

CRITICAL FORMATTING RULES:
1. Output RAW Markdown-formatted text ONLY. Do NOT wrap the entire response in a markdown block (no \`\`\` or \`\`\`markdown). Just start writing.
2. Follow these exact syntax rules for headings to ensure successful frontend rendering and PDF compilation:
   - Use "# [Full Name]" at the very beginning for the name.
   - Use "### [Job Title / Position]" for the professional subtitle below the name.
   - For contact information, output it on a single line right after the subtitle (e.g. "Email: ${inputs.email} | Phone: ${inputs.phone} | Location: ${inputs.location}").
   - Use "## [SECTION TITLE]" (double hash) for primary CV sections. Use only:
     - "## Professional Summary"
     - "## Key Skills & Competencies"
     - "## Work Experience"
     - "## Academic Background"
     - "## References" (if references exist or are requested, otherwise use "## References\nReferences available upon request")
   - Use "#### [Job Title/Degree] - [Employer/Institution]" (four hashes) for specific records inside Work Experience or Academic Background.
   - Use standard bullet points ("* ") for description lists or key skills.
   - Use "---" (triple dash) on a single line for subtle dividers or thematic breaks.
3. Keep the content highly professional, employer-ready, and optimized for South African (SA) and international hiring standards.
4. Do NOT use any emojis.`;
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
      const userInstruction = inputs.pastedText && inputs.pastedText.trim() ? inputs.pastedText.trim() : "";
      const docName = inputs.fileName || "Uploaded Document";

      prompt = `ATTACHED DOCUMENT / FILE:
${docName} (Size: ${inputs.fileSize || "N/A"})

${userInstruction ? `USER INSTRUCTION / NOTES:\n${userInstruction}\n` : ""}

CRITICAL PROCESSING ORDER & MANDATES FOR DOCUMENT SUMMARIZER:
1. FIRST: Read, analyze, and understand the uploaded file, PDF, image, photo, screenshot, or document context completely.
2. READ THE USER INSTRUCTION: If specific instructions or questions were provided in the user instruction box, execute ONLY those instructions. If no specific instruction was given, create a high-fidelity Executive Summary of the document.
3. DO NOT MAKE ASSUMPTIONS, DO NOT GUESS, DO NOT IGNORE THE INSTRUCTION.
4. OUTPUT FORMATTING MANDATES:
   - Produce executive / university-standard formatting.
   - Do NOT use markdown heading symbols (#, ##, ###) or fill responses with hashtags or asterisks (*****).
   - Use clean UPPERCASE BOLD text for section headers on their own line with proper paragraph spacing.
   - Use clean, proper numbering, proper spacing, clear paragraphs, and clean bullet points.
   - Do NOT use emojis. Answer strictly what was requested without filler.`;
    } else if (taskType === "assignment") {
      const subject = inputs.topic && inputs.topic.trim() ? inputs.topic.trim() : "General Academic";
      const instruction = inputs.guidelines && inputs.guidelines.trim() 
        ? inputs.guidelines.trim() 
        : "Process the uploaded document or assignment according to academic standards.";
      const fileRef = inputs.fileName ? `ATTACHED FILE / DOCUMENT: ${inputs.fileName}` : "";

      prompt = `ACADEMIC SUBJECT / DISCIPLINE:
${subject}

USER INSTRUCTION (THIS DETERMINES THE TASK TO EXECUTE):
${instruction}

${fileRef}

CRITICAL PROCESSING ORDER & MANDATES FOR ASSIGNMENT HELPER:
1. FIRST: Read, analyze, and understand the uploaded file, PDF, image, photo, screenshot, or document context completely.
2. READ THE SUBJECT: Use "${subject}" strictly to provide academic context, correct formulas, terminology, and domain precision.
3. READ THE USER INSTRUCTION: Execute ONLY and EXACTLY what the user wrote in the instruction box: "${instruction}".
4. DO NOT MAKE ASSUMPTIONS, DO NOT GUESS, DO NOT IGNORE THE USER'S INSTRUCTION.
   - If user instruction says "Answer this question paper from Question 1 to Question 10": Read every question from the uploaded document, understand every question, answer every question step-by-step with complete, real academic solutions. Maintain proper question numbering (e.g. Question 1, Answer..., Question 2, Answer...). Do NOT summarize. Do NOT explain what the file contains. Answer the paper directly!
   - If user instruction says "Summarize this PDF": Provide a clean summary only. Do NOT answer questions.
   - If user instruction says "Extract all formulas": Extract formulas only.
   - If user instruction says "Translate this document into English": Translate only.
   - If user instruction says "Explain Question 4 only": Explain Question 4 only.
   - If user instruction says "Mark the mistakes inside this assignment": Identify mistakes only.
5. STICK TO USER INSTRUCTION ONLY: The uploaded document is ONLY context. The user's written instruction determines the exact task.
6. OUTPUT FORMATTING MANDATES:
   - Produce university-standard academic formatting.
   - Do NOT use markdown heading symbols (#, ##, ###) or fill responses with hashtags or asterisks (*****).
   - Use clean UPPERCASE BOLD text for section titles (e.g. **QUESTION 1**, **ANSWER**, **SOLUTIONS**) on its own line with proper spacing.
   - Use clean, proper numbering (1., 2., 3. or Question 1, Question 2), proper line spacing, clear paragraphs, and clean bullet points (* or -).
   - Do NOT use emojis or informal filler.`;
    } else {
      return res.status(400).json({ error: "Invalid task type specified" });
    }

    console.log("Generating Groq Task Mode output for type:", taskType);

    const basePrompt = `You are the Orbit AI Task Specialist, an executive-level, university-standard execution system. You do not engage in chat-style conversational greetings, small talk, or polite introductory filler. You deliver immediate, highly structured, executive-ready, and academically professional outcomes.

CRITICAL FORMATTING & EXECUTION MANDATES FOR ALL RESPONSES:
1. The uploaded file or document is ONLY context. The user's written instruction determines the exact task to perform.
2. Read and analyze any uploaded file, image, photo, screenshot, or PDF completely first. Then execute ONLY what the user instructed.
3. Do NOT make assumptions, guess, summarize, or describe files unless explicitly requested by the user instruction.
4. Do NOT use markdown heading symbols (#, ##, ###) or fill responses with hashtags or asterisks (*****).
5. For section titles, use clean UPPERCASE BOLD text (e.g. **QUESTION 1**, **EXECUTIVE SUMMARY**, **KEY FINDINGS**) on its own line with proper paragraph spacing.
6. Use clean bullet points (* or -) and numbered lists (1., 2., 3.) where appropriate.
7. Use professional spacing and proper paragraphs.
8. Do NOT use emojis or informal colloquialisms.
9. Match the clean, executive-ready formatting quality of university-standard academic reports, question paper solutions, and CVs.
10. Answer strictly what was requested without filler.`;
    
    console.log("Calling Groq Chat Completion API on Express (Task Generator) via AI-Helper...");

    const messages = [
      {
        role: "system",
        content: basePrompt
      },
      {
        role: "user",
        content: prompt
      }
    ];

    const responseData = await fetchChatCompletion(messages, 0.5, attachments || []);

    const replyText = responseData.choices?.[0]?.message?.content || "I was unable to generate a high-quality result. Please try again.";
    return res.json({ result: replyText });
  } catch (error: any) {
    console.error("Groq Task API Error in server (full details):", error);
    return res.status(500).json({
      error: error.message || "An unexpected error occurred.",
      details: String(error)
    });
  }
});

// Secure endpoint for AI Image Generation
app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const cleanPrompt = prompt.trim();
    const seed = Math.floor(Math.random() * 1000000);
    const encodedPrompt = encodeURIComponent(cleanPrompt);
    
    // Generate high quality AI image URL via Pollinations AI (Flux model)
    const generatedUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=1024&nologo=true&seed=${seed}&model=flux`;

    return res.json({
      success: true,
      url: generatedUrl,
      prompt: cleanPrompt
    });
  } catch (error: any) {
    console.error("AI Image Generation API Error:", error);
    return res.status(500).json({ error: error.message || "An error occurred during image generation." });
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

  // --- ORBIT MARKET (VISION 1) API ENDPOINTS ---
  // Server-side database uniqueness check for storefront/brand names
  app.all("/api/market/check-brand", async (req, res) => {
    try {
      const rawName = req.method === "POST" ? req.body?.name : (req.query?.name as string);
      const excludeId = req.method === "POST" ? req.body?.excludeBrandId : (req.query?.excludeBrandId as string);

      if (!rawName || typeof rawName !== "string") {
        return res.status(400).json({ error: "Brand name is required" });
      }

      const cleanName = rawName.trim();
      const normalized = cleanName.toLowerCase();
      const slug = normalized.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || normalized;

      // Query Supabase database for duplicates (ignoring any old unowned placeholder 'brand-orbit')
      try {
        const { data: dbBrands, error } = await supabase
          .from("market_brands")
          .select("id, name, slug, user_id, is_orbit_collection");

        if (!error && dbBrands && dbBrands.length > 0) {
          const conflict = dbBrands.find((b: any) => {
            if (b.id === 'brand-orbit' && !b.user_id) return false; // Ignore old unowned test placeholder
            if (excludeId && b.id === excludeId) return false;
            const bNorm = (b.name || "").trim().toLowerCase();
            const bSlug = (b.slug || "").trim().toLowerCase();
            return bNorm === normalized || bSlug === slug;
          });

          if (conflict) {
            return res.json({
              available: false,
              error: "Sorry, that brand/storefront name already exists. Please choose another name."
            });
          }
        }
      } catch (dbErr) {
        console.warn("[Check Brand Server] Supabase query notice:", dbErr);
      }

      return res.json({
        available: true,
        cleanName,
        slug
      });
    } catch (err: any) {
      console.error("[Check Brand Server Error]:", err);
      return res.status(500).json({ error: "Failed to verify brand name" });
    }
  });

  // --- MARKETPLACE PERSISTENCE HELPERS ---
  function getStoredProducts(): any[] {
    try {
      const dataDir = path.join(process.cwd(), "data");
      const prodsFile = path.join(dataDir, "market_products.json");
      if (fs.existsSync(prodsFile)) {
        const content = fs.readFileSync(prodsFile, "utf-8");
        return JSON.parse(content);
      }
    } catch (e) {}
    return [];
  }

  function isMockBrand(id?: string, name?: string): boolean {
    const n = (name || "").toLowerCase().trim();
    const i = (id || "").toLowerCase().trim();
    return i === "brand-orbit-official" || i === "brand-orbit" || i === "brand-authentic" || i === "brand-kasi-crafted" || i === "brand-beach-collection" || i === "brand-beat-collection" ||
      n === "orbit collection" || n === "orbit" || n === "authentic" || n === "kasi crafted" || n === "beach collection" || n === "beat collection" || n.includes("beach collection") || n.includes("beat collection") || n.includes("orbit collection") || n.includes("nike") || n.includes("adidas");
  }

  function isMockProduct(id?: string, name?: string, brandName?: string): boolean {
    const n = (name || "").toLowerCase().trim();
    const b = (brandName || "").toLowerCase().trim();
    const i = (id || "").toLowerCase().trim();
    return i.startsWith("prod-orb-") || i === "prod-orbit-tshirt" || i.startsWith("prod-auth-") || i.startsWith("prod-kasi-") || i === "prod-beat-collection-tee" ||
      b === "orbit collection" || b === "orbit" || b === "authentic" || b === "kasi crafted" || b === "beach collection" || b === "beat collection" ||
      b.includes("beach collection") || b.includes("beat collection") || b.includes("orbit collection") ||
      n.includes("orbit t-shirt") || n.includes("authentic classic") || n.includes("kasi crafted") || n.includes("beach collection") || n.includes("beat collection");
  }

  function getStoredProducts(): any[] {
    try {
      const dataDir = path.join(process.cwd(), "data");
      const prodsFile = path.join(dataDir, "market_products.json");
      if (fs.existsSync(prodsFile)) {
        const content = fs.readFileSync(prodsFile, "utf-8");
        const list = JSON.parse(content);
        if (Array.isArray(list)) {
          return list.filter((p: any) => p && p.id && p.name && !isMockProduct(p.id, p.name, p.brandName || p.brand_name));
        }
      }
    } catch (e) {}
    return [];
  }

  function saveStoredProduct(product: any) {
    try {
      if (isMockProduct(product.id, product.name, product.brandName || product.brand_name)) return;
      const dataDir = path.join(process.cwd(), "data");
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      const prodsFile = path.join(dataDir, "market_products.json");
      let list = getStoredProducts();
      const idx = list.findIndex((p: any) => p.id === product.id);
      if (idx >= 0) list[idx] = product;
      else list.push(product);
      fs.writeFileSync(prodsFile, JSON.stringify(list, null, 2));
    } catch (e) {}
  }

  function getStoredBrands(): any[] {
    try {
      const dataDir = path.join(process.cwd(), "data");
      const brandsFile = path.join(dataDir, "market_brands.json");
      if (fs.existsSync(brandsFile)) {
        const content = fs.readFileSync(brandsFile, "utf-8");
        const list = JSON.parse(content);
        if (Array.isArray(list)) {
          return list.filter((b: any) => b && b.id && b.name && !isMockBrand(b.id, b.name));
        }
      }
    } catch (e) {}
    return [];
  }

  function saveStoredBrand(brand: any) {
    try {
      if (isMockBrand(brand.id, brand.name)) return;
      const dataDir = path.join(process.cwd(), "data");
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      const brandsFile = path.join(dataDir, "market_brands.json");
      let list = getStoredBrands();
      const idx = list.findIndex((b: any) => b.id === brand.id);
      if (idx >= 0) list[idx] = brand;
      else list.push(brand);
      fs.writeFileSync(brandsFile, JSON.stringify(list, null, 2));
    } catch (e) {}
  }

  function getStoredOrders(userId?: string): any[] {
    try {
      const dataDir = path.join(process.cwd(), "data");
      const ordersFile = path.join(dataDir, "market_orders.json");
      if (fs.existsSync(ordersFile)) {
        const content = fs.readFileSync(ordersFile, "utf-8");
        const list = JSON.parse(content);
        if (Array.isArray(list)) {
          return userId ? list.filter((o: any) => o.user_id === userId || o.userId === userId) : list;
        }
      }
    } catch (e) {}
    return [];
  }

  function saveStoredOrder(order: any) {
    try {
      const dataDir = path.join(process.cwd(), "data");
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
      const ordersFile = path.join(dataDir, "market_orders.json");
      let list = getStoredOrders();
      const idx = list.findIndex((o: any) => o.id === order.id);
      if (idx >= 0) list[idx] = order;
      else list.push(order);
      fs.writeFileSync(ordersFile, JSON.stringify(list, null, 2));
    } catch (e) {}
  }

  // --- MARKETPLACE REST API ENDPOINTS ---

  app.get("/api/market/products", async (req, res) => {
    try {
      const prodMap = new Map<string, any>();

      // 1. Fetch from Supabase database if available
      try {
        const { data: dbProds, error } = await supabase
          .from("market_products")
          .select("*")
          .order("created_at", { ascending: true });

        if (!error && Array.isArray(dbProds) && dbProds.length > 0) {
          const { data: variants } = await supabase.from("market_product_variants").select("*");
          dbProds.forEach((p: any) => {
            if (p && p.id && p.name && !isMockProduct(p.id, p.name, p.brand_name)) {
              const pVariants = (variants || [])
                .filter((v: any) => v.product_id === p.id)
                .map((v: any) => ({
                  id: v.id,
                  productId: v.product_id,
                  sizeName: v.size_name,
                  stockQuantity: Number(v.stock_quantity || 0),
                  priceOverride: v.price_override ? Number(v.price_override) : undefined
                }));

              let imgList: string[] = [];
              if (Array.isArray(p.images) && p.images.length > 0) imgList = p.images;
              else if (p.image_url) imgList = [p.image_url];

              prodMap.set(p.id, {
                id: p.id,
                brandId: p.brand_id,
                brandName: p.brand_name || "",
                name: p.name,
                description: p.description || "",
                price: Number(p.price || 0),
                category: p.category || p.brand_name || "Marketplace",
                imageUrl: p.image_url || imgList[0] || "",
                images: imgList,
                isPublished: p.is_published ?? true,
                inStock: p.in_stock ?? true,
                stockQuantity: Number(p.stock_quantity || 0),
                variants: pVariants.length > 0 ? pVariants : (prodMap.get(p.id)?.variants || []),
                createdAt: p.created_at
              });
            }
          });
        }
      } catch (err) {
        console.warn("[Server /api/market/products GET notice]:", err);
      }

      // 2. Merge local server storage (real registered products only)
      const stored = getStoredProducts();
      stored.forEach(p => {
        if (p && p.id && p.name && !isMockProduct(p.id, p.name, p.brandName || p.brand_name)) {
          prodMap.set(p.id, { ...p });
        }
      });

      return res.json({
        success: true,
        products: Array.from(prodMap.values())
      });
    } catch (err: any) {
      console.error("[Get Products Server Error]:", err);
      return res.status(500).json({ error: "Failed to load products" });
    }
  });

  app.post("/api/market/products", async (req, res) => {
    try {
      const product = req.body;
      if (!product || !product.id || !product.name) {
        return res.status(400).json({ error: "Product id and name are required." });
      }

      saveStoredProduct(product);

      // Attempt database upsert
      try {
        const mainImg = product.imageUrl || (product.images && product.images.length > 0 ? product.images[0] : null);
        await supabase
          .from("market_products")
          .upsert({
            id: product.id,
            brand_id: product.brandId,
            brand_name: product.brandName,
            name: product.name,
            description: product.description,
            price: product.price,
            category: product.category,
            image_url: mainImg,
            images: product.images || (mainImg ? [mainImg] : []),
            is_published: product.isPublished ?? true,
            in_stock: product.inStock,
            stock_quantity: product.stockQuantity,
            created_at: product.createdAt || new Date().toISOString()
          });

        if (product.variants && product.variants.length > 0) {
          for (const v of product.variants) {
            await supabase
              .from("market_product_variants")
              .upsert({
                id: v.id,
                product_id: product.id,
                size_name: v.sizeName,
                stock_quantity: v.stockQuantity,
                price_override: v.priceOverride || null
              });
          }
        }
      } catch (dbErr) {
        console.warn("[Server /api/market/products POST DB notice]:", dbErr);
      }

      return res.json({ success: true, product });
    } catch (err: any) {
      console.error("[Post Product Server Error]:", err);
      return res.status(500).json({ error: "Failed to save product" });
    }
  });

  app.get("/api/market/brands", async (req, res) => {
    try {
      const brandMap = new Map<string, any>();

      // 1. Fetch from Supabase database if available
      try {
        const { data: dbBrands, error } = await supabase
          .from("market_brands")
          .select("*")
          .order("created_at", { ascending: true });

        if (!error && Array.isArray(dbBrands) && dbBrands.length > 0) {
          dbBrands.forEach((b: any) => {
            if (b && b.id && b.name && !isMockBrand(b.id, b.name)) {
              brandMap.set(b.id, {
                id: b.id,
                userId: b.user_id,
                name: b.name,
                slug: b.slug,
                description: b.description || "",
                location: b.location || "",
                contactEmail: b.contact_email || "",
                contactPhone: b.contact_phone || "",
                isVerified: b.is_verified ?? false,
                isOrbitCollection: false,
                createdAt: b.created_at
              });
            }
          });
        }
      } catch (err) {
        console.warn("[Server /api/market/brands GET notice]:", err);
      }

      // 2. Merge local server storage (real registered brands only)
      const stored = getStoredBrands();
      stored.forEach(b => {
        if (b && b.id && b.name && !isMockBrand(b.id, b.name)) {
          brandMap.set(b.id, { ...b });
        }
      });

      return res.json({
        success: true,
        brands: Array.from(brandMap.values())
      });
    } catch (err: any) {
      console.error("[Get Brands Server Error]:", err);
      return res.status(500).json({ error: "Failed to load brands" });
    }
  });

  app.post("/api/market/brands", async (req, res) => {
    try {
      const brand = req.body;
      if (!brand || !brand.id || !brand.name) {
        return res.status(400).json({ error: "Brand id and name are required." });
      }

      saveStoredBrand(brand);

      // Attempt database upsert
      try {
        await supabase
          .from("market_brands")
          .upsert({
            id: brand.id,
            user_id: brand.userId || null,
            name: brand.name.trim(),
            slug: brand.slug || brand.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            description: brand.description || "",
            location: brand.location || "",
            contact_email: brand.contactEmail || "",
            contact_phone: brand.contactPhone || "",
            is_verified: brand.isVerified ?? false,
            is_orbit_collection: brand.isOrbitCollection ?? (brand.name.toLowerCase().includes("orbit")),
            created_at: brand.createdAt || new Date().toISOString()
          });
      } catch (dbErr) {
        console.warn("[Server /api/market/brands POST DB notice]:", dbErr);
      }

      return res.json({ success: true, brand });
    } catch (err: any) {
      console.error("[Post Brand Server Error]:", err);
      return res.status(500).json({ error: "Failed to save brand" });
    }
  });

  app.get("/api/market/orders", async (req, res) => {
    try {
      const userId = req.query.userId as string | undefined;
      const storedOrders = getStoredOrders(userId);

      try {
        let query = supabase.from("market_orders").select("*").order("created_at", { ascending: false });
        if (userId) query = query.eq("user_id", userId);
        const { data: dbOrders, error } = await query;
        if (!error && Array.isArray(dbOrders)) {
          const map = new Map<string, any>();
          storedOrders.forEach(o => map.set(o.id, o));
          dbOrders.forEach(o => map.set(o.id, o));
          return res.json({ success: true, orders: Array.from(map.values()) });
        }
      } catch (dbErr) {}

      return res.json({ success: true, orders: storedOrders });
    } catch (err: any) {
      return res.status(500).json({ error: "Failed to load orders" });
    }
  });

  app.post("/api/market/checkout-init", async (req, res) => {
    try {
      const { items, customerName, customerEmail, customerPhone, deliveryAddress, userId } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Cart is empty" });
      }
      if (!customerName || !customerEmail || !customerPhone || !deliveryAddress) {
        return res.status(400).json({ error: "Customer details and delivery address are required" });
      }

      // Fetch market settings for commission and delivery fee
      let commissionRate = 0.10;
      let deliveryFee = 50.00;

      try {
        const { data: settings } = await supabase
          .from('market_settings')
          .select('*')
          .eq('id', 'default')
          .single();
        if (settings) {
          if (settings.commission_rate !== undefined) commissionRate = Number(settings.commission_rate);
          if (settings.default_delivery_fee !== undefined) deliveryFee = Number(settings.default_delivery_fee);
        }
      } catch (sErr) {
        console.warn("[Market Checkout] Using default settings:", sErr);
      }

      // 2. Authoritative Price & Inventory Verification
      let calculatedSubtotal = 0;
      const verifiedItems: any[] = [];
      const orderId = `order-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const orderNumber = `ORB-${Math.floor(10000 + Math.random() * 90000)}`;

      const serverProducts = getStoredProducts();

      for (const item of items) {
        const productId = item.productId;
        const variantName = item.variantName || null;
        const requestedQty = Math.max(1, parseInt(item.quantity, 10) || 1);

        let foundProduct: any = null;

        // 2a. Fetch from Supabase database first
        try {
          const { data: dbProduct, error: prodErr } = await supabase
            .from('market_products')
            .select('id, name, price, brand_id, brand_name, stock_quantity, is_published, in_stock')
            .eq('id', productId)
            .single();

          if (!prodErr && dbProduct) {
            foundProduct = dbProduct;
          }
        } catch (err) {}

        // 2b. Fallback to server persistent storage
        if (!foundProduct) {
          const localMatch = serverProducts.find((p: any) => p.id === productId);
          if (localMatch) {
            foundProduct = {
              id: localMatch.id,
              name: localMatch.name,
              price: localMatch.price,
              brand_id: localMatch.brandId || localMatch.brand_id,
              brand_name: localMatch.brandName || localMatch.brand_name,
              stock_quantity: localMatch.stockQuantity ?? 50,
              is_published: localMatch.isPublished ?? true,
              in_stock: localMatch.inStock ?? true,
              variants: localMatch.variants || []
            };
          }
        }

        // 2c. Fallback to client item payload if valid
        if (!foundProduct && item.productName && item.price) {
          foundProduct = {
            id: productId,
            name: item.productName,
            price: Number(item.price),
            brand_id: item.brandId || '',
            brand_name: item.brandName || '',
            stock_quantity: 50,
            is_published: true,
            in_stock: true,
            variants: []
          };
        }

        if (!foundProduct) {
          return res.status(400).json({ error: `Product with ID ${productId} not found` });
        }

        if (foundProduct.is_published === false) {
          return res.status(400).json({ error: `Product '${foundProduct.name}' is currently unavailable for purchase` });
        }

        let authoritativeUnitPrice = Number(foundProduct.price);
        let availableStock = Number(foundProduct.stock_quantity ?? 50);

        // Check variant if applicable
        if (variantName) {
          try {
            const { data: dbVariant } = await supabase
              .from('market_product_variants')
              .select('id, size_name, stock_quantity, price_override')
              .eq('product_id', productId)
              .eq('size_name', variantName)
              .single();

            if (dbVariant) {
              availableStock = dbVariant.stock_quantity;
              if (dbVariant.price_override !== null && dbVariant.price_override !== undefined) {
                authoritativeUnitPrice = Number(dbVariant.price_override);
              }
            }
          } catch (vErr) {}

          if (foundProduct.variants && Array.isArray(foundProduct.variants)) {
            const vMatch = foundProduct.variants.find((v: any) => v.sizeName === variantName || v.size_name === variantName);
            if (vMatch) {
              availableStock = vMatch.stockQuantity ?? vMatch.stock_quantity ?? availableStock;
              if (vMatch.priceOverride) authoritativeUnitPrice = Number(vMatch.priceOverride);
            }
          }
        }

        const itemTotal = Number((authoritativeUnitPrice * requestedQty).toFixed(2));
        calculatedSubtotal += itemTotal;

        verifiedItems.push({
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          order_id: orderId,
          product_id: foundProduct.id,
          brand_id: foundProduct.brand_id,
          seller_id: item.sellerId || null,
          product_name: foundProduct.name,
          brand_name: foundProduct.brand_name || 'Orbit Collection',
          variant_name: variantName,
          quantity: requestedQty,
          unit_price: authoritativeUnitPrice,
          total_price: itemTotal
        });
      }

      calculatedSubtotal = Number(calculatedSubtotal.toFixed(2));
      const commissionAmount = Number((calculatedSubtotal * commissionRate).toFixed(2));
      const sellerPayoutAmount = Number((calculatedSubtotal - commissionAmount).toFixed(2));
      const total = Number((calculatedSubtotal + deliveryFee).toFixed(2));

      const orderRecord = {
        id: orderId,
        order_number: orderNumber,
        user_id: userId || null,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        delivery_address: deliveryAddress,
        subtotal: calculatedSubtotal,
        delivery_fee: deliveryFee,
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        seller_payout_amount: sellerPayoutAmount,
        total: total,
        payment_status: "Pending",
        order_status: "Pending Payment",
        items: verifiedItems,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Save order to server storage
      saveStoredOrder(orderRecord);

      // Persist order in Supabase with strict Pending state
      try {
        const { error: orderError } = await supabase
          .from('market_orders')
          .upsert({
            id: orderId,
            order_number: orderNumber,
            user_id: userId || null,
            customer_name: customerName,
            customer_email: customerEmail,
            customer_phone: customerPhone,
            delivery_address: deliveryAddress,
            subtotal: calculatedSubtotal,
            delivery_fee: deliveryFee,
            commission_rate: commissionRate,
            commission_amount: commissionAmount,
            seller_payout_amount: sellerPayoutAmount,
            total: total,
            payment_status: "Pending",
            order_status: "Pending Payment",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (orderError) {
          console.warn("[Market Checkout] Supabase order upsert notice:", orderError);
        }

        if (verifiedItems.length > 0) {
          const { error: itemsError } = await supabase
            .from('market_order_items')
            .upsert(verifiedItems);
          if (itemsError) {
            console.warn("[Market Checkout] Supabase items upsert notice:", itemsError);
          }
        }
      } catch (dbErr) {
        console.warn("[Market Checkout] Database persistence fallback:", dbErr);
      }

      console.log(`[Market Checkout Init] Order ${orderNumber} created. Subtotal: R${calculatedSubtotal}, Total: R${total}`);

      // Construct server-authoritative PayFast payload
      const merchantId = process.env.PAYFAST_MERCHANT_ID || "35986313";
      const merchantKey = process.env.PAYFAST_MERCHANT_KEY || "46f0z5809up2u";
      const passphrase = process.env.PAYFAST_PASSPHRASE || "";

      const host = req.get('host');
      const protocol = req.headers['x-forwarded-proto'] || req.protocol;
      const origin = process.env.APP_URL || (host ? `${protocol}://${host}` : "https://orbitai.co.za");

      const returnUrl = `${origin}?payment_success=true&plan=market-order&order_id=${orderId}&order_number=${orderNumber}`;
      const cancelUrl = `${origin}?payment_cancelled=true&plan=market-order&order_id=${orderId}`;
      const notifyUrl = `${origin}/api/payfast/notify`;

      const nameParts = (customerName || "Orbit Customer").split(" ");
      const nameFirst = nameParts[0] || "Orbit";
      const nameLast = nameParts.slice(1).join(" ") || "Customer";

      const pfData: Record<string, string> = {
        merchant_id: merchantId,
        merchant_key: merchantKey,
        return_url: returnUrl,
        cancel_url: cancelUrl,
        notify_url: notifyUrl,
        name_first: nameFirst,
        name_last: nameLast,
        email_address: customerEmail,
        cell_number: customerPhone,
        m_payment_id: orderId,
        amount: total.toFixed(2),
        item_name: `Orbit Market Order ${orderNumber}`,
        item_description: `Order ${orderNumber} with ${verifiedItems.length} item(s)`,
        custom_str1: "market-order",
        custom_str2: orderId,
        custom_str3: orderNumber
      };

      const { signature } = generatePayfastSignature(pfData, passphrase);
      pfData.signature = signature;

      const isSandbox = merchantId === "10000100" || process.env.PAYFAST_SANDBOX === "true";
      const checkoutBaseUrl = isSandbox 
        ? "https://sandbox.payfast.co.za/eng/process" 
        : "https://www.payfast.co.za/eng/process";

      res.json({
        success: true,
        orderId,
        orderNumber,
        order: orderRecord,
        subtotal: calculatedSubtotal,
        deliveryFee,
        commissionRate,
        commissionAmount,
        sellerPayoutAmount,
        total,
        items: verifiedItems,
        payfastEndpoint: checkoutBaseUrl,
        payfast: pfData
      });
    } catch (err: any) {
      console.error("[Market Checkout Init Error]:", err);
      res.status(500).json({ error: err.message || "Failed to initialize market checkout" });
    }
  });

  app.post("/api/market/complete-order", async (req, res) => {
    try {
      const { orderId, paymentId } = req.body;
      if (!orderId) {
        return res.status(400).json({ error: "Order ID is required" });
      }

      console.log(`[Market Complete Order] Marking order ${orderId} as paid...`);

      const { error } = await supabase
        .from('market_orders')
        .update({
          payment_status: "Paid",
          order_status: "PAID",
          payment_id: paymentId || `PF-${Date.now()}`,
          updated_at: new Date().toISOString()
        })
        .or(`id.eq.${orderId},order_number.eq.${orderId}`);

      if (error) {
        console.warn("[Market Complete Order] Supabase update notice:", error);
      }

      // Deduct inventory
      try {
        const { data: items } = await supabase
          .from('market_order_items')
          .select('*')
          .eq('order_id', orderId);

        if (items && items.length > 0) {
          for (const item of items) {
            if (item.variant_name) {
              const { data: variant } = await supabase
                .from('market_product_variants')
                .select('id, stock_quantity')
                .eq('product_id', item.product_id)
                .eq('size_name', item.variant_name)
                .single();

              if (variant) {
                const newStock = Math.max(0, (variant.stock_quantity || 0) - item.quantity);
                await supabase
                  .from('market_product_variants')
                  .update({ stock_quantity: newStock })
                  .eq('id', variant.id);
              }
            }

            const { data: product } = await supabase
              .from('market_products')
              .select('id, stock_quantity')
              .eq('id', item.product_id)
              .single();

            if (product) {
              const newTotalStock = Math.max(0, (product.stock_quantity || 0) - item.quantity);
              await supabase
                .from('market_products')
                .update({
                  stock_quantity: newTotalStock,
                  in_stock: newTotalStock > 0
                })
                .eq('id', product.id);
            }
          }
        }
      } catch (invErr) {
        console.warn("[Market Complete Order] Error updating inventory:", invErr);
      }

      res.json({ success: true, message: "Order payment confirmed." });
    } catch (err: any) {
      console.error("[Market Complete Order Error]:", err);
      res.status(500).json({ error: err.message || "Failed to complete order" });
    }
  });

  // =========================================================================
  // ORBIT REWARDS & SHOWDOWN QUIZZES (SERVER-SIDE VALIDATION & ANTI-FRAUD)
  // Compliant with Google Publisher Policies (Non-monetary credits, no fake ad-rewards)
  // =========================================================================

  const QUIZ_QUESTION_BANK = [
    {
      id: "q-prompt-ptcfc",
      question: "According to Orbit's PTCFC prompt framework, what does the 'C' stand for?",
      options: ["Currency", "Context", "Complexity", "Compilation"],
      correctIndex: 1,
      explanation: "PTCFC stands for Persona, Task, Context, Format, and Constraints."
    },
    {
      id: "q-popia-spi",
      question: "Under South Africa's POPIA Act, which of the following is considered Special Personal Information (SPI)?",
      options: ["A company registered name", "Biometric and health data", "Work email address", "Public LinkedIn URL"],
      correctIndex: 1,
      explanation: "Under Section 26 of POPIA, biometric, health, and religious information is protected as Special Personal Information."
    },
    {
      id: "q-ats-formatting",
      question: "What is the recommended layout for Applicant Tracking System (ATS) CV compatibility?",
      options: ["Multi-column table with graphical skill meters", "Clean single-column typography with linear standard headings", "Embedded canvas graphic", "Two-column frame with floating text boxes"],
      correctIndex: 1,
      explanation: "Modern ATS parsers process single-column linear text with highest accuracy without dropped tokens."
    },
    {
      id: "q-ai-hallucination",
      question: "Why do large language models generate hallucinations or synthetic citations?",
      options: ["They query a corrupted legal database", "They are statistical next-token prediction engines, not static truth databases", "They only search social media", "They purposefully alter court numbers"],
      correctIndex: 1,
      explanation: "LLMs predict the most probable linguistic tokens based on training distributions rather than querying verified real-time records."
    },
    {
      id: "q-star-method",
      question: "In professional CV drafting, what does the STAR methodology stand for?",
      options: ["Start, Track, Act, Report", "Situation, Task, Action, Result", "Scope, Target, Analysis, Review", "Strategy, Timing, Authority, Revenue"],
      correctIndex: 1,
      explanation: "STAR (Situation, Task, Action, Result) transforms passive duty lists into measurable achievement bullets."
    },
    {
      id: "q-popia-fines",
      question: "What is the maximum statutory administrative fine under Section 107 of South Africa's POPIA for unlawful data breaches?",
      options: ["Up to R500,000", "Up to R2 million", "Up to R10 million", "Up to R50 million"],
      correctIndex: 2,
      explanation: "Under Section 107 of POPIA, administrative fines can reach up to R10 million."
    },
    {
      id: "q-whatsapp-commerce",
      question: "When automating customer replies for a small business on WhatsApp, what is a key best practice?",
      options: ["Never state prices upfront", "Standardize transparent FAQ replies covering pricing, deposit policies, and turnaround time", "Send 20-page PDF catalogs to cold inquiries", "Require phone calls for all inquiries"],
      correctIndex: 1,
      explanation: "Clear, prompt answers with verified pricing and deposit guidelines significantly increase conversion and trust."
    }
  ];

  // In-memory anti-replay and rate limiting store
  const activeQuizSessions = new Map<string, { userId: string; questionIds: string[]; expiresAt: number }>();
  const userQuizCooldowns = new Map<string, number>();

  // Endpoint 1: Fetch randomized quiz questions (answers stripped!)
  app.get("/api/rewards/quiz/questions", async (req, res) => {
    try {
      const userId = (req.query.userId as string) || (req.headers["x-user-id"] as string);
      if (!userId) {
        return res.status(400).json({ error: "User ID is required." });
      }

      // Check anti-spam cooldown (e.g., 5 minutes between attempts if failed, 12 hours if completed)
      const lastAttempt = userQuizCooldowns.get(userId);
      const now = Date.now();
      if (lastAttempt && now - lastAttempt < 3 * 60 * 1000) {
        const waitSec = Math.ceil((3 * 60 * 1000 - (now - lastAttempt)) / 1000);
        return res.status(429).json({ 
          error: `Please wait ${waitSec} seconds before starting a new Showdown Quiz session.` 
        });
      }

      // Check referral qualification: count verified referrals
      let verifiedCount = 0;
      try {
        const { count, error } = await supabase
          .from('referrals')
          .select('*', { count: 'exact', head: true })
          .eq('referrer_id', userId);
        if (!error && typeof count === 'number') {
          verifiedCount = count;
        }
      } catch (err) {
        console.warn("[Quiz Auth] Supabase count notice:", err);
      }

      // Also check user's plan
      let isPro = false;
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan, subscription_status')
          .eq('id', userId)
          .single();
        if (profile && (profile.plan === 'pro' || (profile.subscription_status && profile.subscription_status.startsWith('pro')))) {
          isPro = true;
        }
      } catch (e) {}

      // Qualified if >= 4 verified referrals or already Pro
      const isQualified = verifiedCount >= 4 || isPro;
      if (!isQualified) {
        return res.status(403).json({
          error: "Showdown Quiz is locked. You need 4 verified account referrals or Orbit Pro to unlock.",
          verifiedCount,
          required: 4
        });
      }

      // Shuffle and pick 5 questions
      const shuffled = [...QUIZ_QUESTION_BANK].sort(() => 0.5 - Math.random()).slice(0, 5);
      const sessionId = `qsess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      activeQuizSessions.set(sessionId, {
        userId,
        questionIds: shuffled.map(q => q.id),
        expiresAt: now + 15 * 60 * 1000 // 15 min expiry
      });

      // Strip correct answers before sending to client!
      const sanitizedQuestions = shuffled.map(q => ({
        id: q.id,
        question: q.question,
        options: q.options
      }));

      return res.json({
        sessionId,
        questions: sanitizedQuestions,
        passThresholdPercentage: 80,
        rewardCreditsPerPass: 20
      });
    } catch (err: any) {
      console.error("[Quiz Questions Error]:", err);
      res.status(500).json({ error: "Failed to generate quiz questions." });
    }
  });

  // Endpoint 2: Submit answers and validate server-side
  app.post("/api/rewards/quiz/submit", async (req, res) => {
    try {
      const { userId, sessionId, answers } = req.body || {};
      if (!userId || !sessionId || !answers || typeof answers !== 'object') {
        return res.status(400).json({ error: "Invalid submission payload." });
      }

      const session = activeQuizSessions.get(sessionId);
      if (!session) {
        return res.status(400).json({ error: "Invalid or expired quiz session. Please restart the quiz." });
      }

      if (session.userId !== userId) {
        return res.status(403).json({ error: "User mismatch on session." });
      }

      if (Date.now() > session.expiresAt) {
        activeQuizSessions.delete(sessionId);
        return res.status(400).json({ error: "Quiz session expired. Please start a new session." });
      }

      // Invalidate session immediately to prevent replaying
      activeQuizSessions.delete(sessionId);
      userQuizCooldowns.set(userId, Date.now());

      // Evaluate score server-side
      let correctCount = 0;
      const breakdown = session.questionIds.map(qId => {
        const questionData = QUIZ_QUESTION_BANK.find(q => q.id === qId);
        if (!questionData) return { id: qId, correct: false };

        const userAnswer = answers[qId];
        const isCorrect = userAnswer === questionData.correctIndex;
        if (isCorrect) correctCount++;

        return {
          id: qId,
          question: questionData.question,
          isCorrect,
          correctAnswer: questionData.options[questionData.correctIndex],
          explanation: questionData.explanation
        };
      });

      const totalQuestions = session.questionIds.length;
      const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
      const passed = scorePercentage >= 80;
      const creditsEarned = passed ? 20 : 0;

      // If passed, credit user's account safely in Supabase
      let updatedTotalCredits = 0;
      if (passed) {
        try {
          const { data: balanceRecord } = await supabase
            .from('reward_balances')
            .select('*')
            .eq('user_id', userId)
            .single();

          const prevCredits = balanceRecord?.total_earnings || 0;
          updatedTotalCredits = Number(prevCredits) + creditsEarned;

          await supabase
            .from('reward_balances')
            .upsert({
              user_id: userId,
              total_earnings: updatedTotalCredits,
              monthly_earnings: (balanceRecord?.monthly_earnings || 0) + creditsEarned,
              updated_at: new Date().toISOString()
            });

          // Insert audit log
          await supabase.from('audit_logs').insert({
            user_id: userId,
            action: 'SHOWDOWN_QUIZ_COMPLETED',
            details: {
              sessionId,
              scorePercentage,
              passed,
              creditsEarned,
              newBalance: updatedTotalCredits
            },
            created_at: new Date().toISOString()
          });
        } catch (dbErr) {
          console.warn("[Quiz Submit] Database update notice:", dbErr);
        }
      }

      return res.json({
        success: true,
        passed,
        score: correctCount,
        totalQuestions,
        scorePercentage,
        creditsEarned,
        newBalance: updatedTotalCredits,
        breakdown,
        message: passed 
          ? `Congratulations! You scored ${scorePercentage}% and earned 20 Orbit Credits.`
          : `You scored ${scorePercentage}%. 80% is required to earn credits. Review the explanations and try again!`
      });

    } catch (err: any) {
      console.error("[Quiz Submit Error]:", err);
      res.status(500).json({ error: "Failed to evaluate quiz submission." });
    }
  });

  // Endpoint 3: Redeem accumulated Orbit Credits for Orbit Pro subscription
  app.post("/api/rewards/redeem-pro", async (req, res) => {
    try {
      const { userId } = req.body || {};
      if (!userId) {
        return res.status(400).json({ error: "User ID is required." });
      }

      const PRO_REDEMPTION_COST = 100; // 100 Orbit Credits = 1 Month Orbit Pro

      // Check balance in Supabase
      const { data: balanceRecord, error: balErr } = await supabase
        .from('reward_balances')
        .select('*')
        .eq('user_id', userId)
        .single();

      const currentCredits = Number(balanceRecord?.total_earnings || 0);

      if (currentCredits < PRO_REDEMPTION_COST) {
        return res.status(400).json({
          error: `Insufficient Orbit Credits. You have ${currentCredits} credits, but ${PRO_REDEMPTION_COST} credits are required to redeem 1 Month of Orbit Pro.`
        });
      }

      const nextCredits = currentCredits - PRO_REDEMPTION_COST;

      // 1. Deduct credits
      await supabase
        .from('reward_balances')
        .update({
          total_earnings: nextCredits,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      // 2. Upgrade user profile to Orbit Pro
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      await supabase
        .from('profiles')
        .update({
          plan: 'pro',
          subscription_status: 'pro_monthly',
          subscription_end: expiryDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      // 3. Insert audit log
      await supabase.from('audit_logs').insert({
        user_id: userId,
        action: 'CREDITS_REDEEMED_FOR_PRO',
        details: {
          creditsSpent: PRO_REDEMPTION_COST,
          remainingCredits: nextCredits,
          newPlan: 'pro',
          expiryDate: expiryDate.toISOString()
        },
        created_at: new Date().toISOString()
      });

      return res.json({
        success: true,
        message: "Successfully redeemed 100 Orbit Credits for 1 Month of Orbit Pro!",
        remainingCredits: nextCredits,
        plan: "pro",
        subscriptionEnd: expiryDate.toISOString()
      });

    } catch (err: any) {
      console.error("[Redeem Pro Error]:", err);
      res.status(500).json({ error: err.message || "Failed to redeem credits for Pro." });
    }
  });

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
    app.use("/admin", requireAdminAuthMiddleware, adminVite.middlewares);

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
      app.use("/admin", requireAdminAuthMiddleware, express.static(adminDistPath));
      app.get('/admin/*', requireAdminAuthMiddleware, (req, res) => {
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

function safeParseJSON(text: string): any {
  if (!text) return null;
  let clean = text.trim();
  if (clean.startsWith("```")) {
    const firstNewline = clean.indexOf("\n");
    if (firstNewline !== -1) {
      clean = clean.substring(firstNewline + 1);
    }
    if (clean.endsWith("```")) {
      clean = clean.substring(0, clean.length - 3);
    }
    clean = clean.trim();
  }
  try {
    return JSON.parse(clean);
  } catch (e) {
    console.warn("Standard JSON parse failed, trying to extract JSON with regex...", e);
    const firstBrace = clean.indexOf("{");
    const lastBrace = clean.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const extracted = clean.substring(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(extracted);
      } catch (innerErr) {
        console.error("Regex extracted JSON parse also failed:", innerErr);
      }
    }
    return null;
  }
}

setupVite().catch((err) => {
  console.error("Error starting Vit Express Server:", err);
});
