// Vercel Serverless Function for Orbit AI Chat
import '../src/services/env-sanitizer.js';
import { supabase } from '../src/services/supabase.js';
import { fetchChatCompletion } from '../src/services/ai-helper.js';

// Safe timeout wrapper that catches late-rejections to prevent unhandled promise rejections on Vercel
function withTimeout<T>(promise: Promise<T> | any, ms: number = 3000): Promise<T> {
  const nativePromise = Promise.resolve(promise);
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Timeout of ${ms}ms exceeded`));
    }, ms);
  });

  const raced = Promise.race([
    nativePromise,
    timeoutPromise
  ]);

  // Clean up timeout timer when finished
  raced.then(
    () => clearTimeout(timeoutId),
    () => clearTimeout(timeoutId)
  );

  // Prevent uncaught background rejection if the timeout fires first
  nativePromise.catch((err) => {
    console.warn("[withTimeout] Background promise rejected after timeout/completion:", err);
  });

  return raced;
}

async function handleDebugOpenAI(req: any, res: any) {
  console.log("--- START DEBUG OPENAI ENDPOINT ---");
  const results: any = {
    envCheck: {
      hasOpenaiKey: !!process.env.OPENAI_API_KEY,
      openaiKeyLength: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0,
      openaiKeyPrefix: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.substring(0, 10) : "none",
      hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
      hasSupabaseAnonKey: !!process.env.VITE_SUPABASE_ANON_KEY,
    },
    openaiDirectFetchResult: null,
    openaiSdkResult: null,
    errors: []
  };

  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!openaiApiKey) {
    const msg = "CRITICAL: OPENAI_API_KEY is not defined in environment variables on Vercel.";
    console.error(msg);
    results.errors.push(msg);
    return res.status(500).json({ error: msg, results });
  }

  // Test 1: Direct Fetch to OpenAI Chat Completion API
  try {
    const url = "https://api.openai.com/v1/chat/completions";
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openaiApiKey}`
    };
    const bodyPayload = JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a debug assistant." },
        { role: "user", content: "Ping" }
      ],
      temperature: 0.1
    });

    const openAiResponse = await fetch(url, {
      method: "POST",
      headers,
      body: bodyPayload
    });

    const status = openAiResponse.status;
    const responseText = await openAiResponse.text();

    results.openaiDirectFetchResult = {
      status,
      body: responseText
    };

    if (!openAiResponse.ok) {
      results.errors.push(`Direct fetch failed with status ${status}: ${responseText}`);
    }
  } catch (err: any) {
    const errMsg = `Test 1 Crash: ${err.message || err}`;
    results.errors.push({
      message: errMsg,
      stack: err.stack
    });
  }

  // Test 2: SDK initialization and test
  try {
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a debug assistant." },
        { role: "user", content: "Ping" }
      ],
      temperature: 0.1
    });

    results.openaiSdkResult = {
      choices: response.choices
    };
  } catch (err: any) {
    const errMsg = `Test 2 Crash: ${err.message || err}`;
    results.errors.push({
      message: errMsg,
      stack: err.stack
    });
  }

  console.log("--- END DEBUG OPENAI ENDPOINT ---");
  return res.status(200).json(results);
}

export default async function handler(req: any, res: any) {
  // Check if routed for diagnostic debugging
  const isDebug = req.query?.action === 'debug' || req.query?.debug === 'true' || (req.url && req.url.includes('debug'));
  if (isDebug) {
    return handleDebugOpenAI(req, res);
  }

  console.log("--- START CHAT ENDPOINT CALL ---");
  
  // Ensure we always return JSON, even for general uncaught errors
  try {
    // Allow only POST requests
    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.warn("Failed to parse request body string:", e);
      }
    }
    const { message, attachments, history, systemPrompt, userId } = body || {};

    console.log(`Received request: userId=${userId}, messageLength=${message?.length || 0}`);

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
        console.log("Fetching user profile from Supabase...");
        const profilePromise = supabase
          .from("profiles")
          .select("plan, subscription_status")
          .eq("id", userId)
          .single();

        const { data: profile, error: profileErr } = await withTimeout(profilePromise, 3000);

        if (profileErr) {
          console.warn("Supabase profile fetch returned error, falling back:", profileErr);
        } else if (profile) {
          isPro = profile.plan === "Pro" || 
                  profile.subscription_status === "pro_monthly" || 
                  profile.subscription_status === "pro_yearly";
        }

        console.log(`User profile check completed. isPro=${isPro}`);

        if (!isPro) {
          console.log("User is on free plan. Checking limits...");
          const limitsPromise = supabase
            .from("user_limits")
            .select("*")
            .eq("user_id", userId)
            .single();

          const { data, error } = await withTimeout(limitsPromise, 3000);

          if (error) {
            if (error.code === "PGRST116") {
              console.log("Creating new user_limits record...");
              const insertPromise = supabase
                .from("user_limits")
                .insert({
                  user_id: userId,
                  messages_used: 0,
                  is_pro: false,
                  last_reset: new Date().toISOString()
                })
                .select()
                .single();
              const { data: insertedData } = await withTimeout(insertPromise, 3000);
              limitData = insertedData;
              currentCount = 0;
            } else {
              console.warn("Error fetching user_limits from Supabase:", error);
            }
          } else {
            limitData = data;
            currentCount = data?.messages_used || 0;
          }

          if (limitData) {
            const lastReset = limitData.last_reset ? new Date(limitData.last_reset).getTime() : 0;
            const now = Date.now();
            if (now - lastReset >= 24 * 60 * 60 * 1000) {
              console.log("Daily limit resetting (24 hours elapsed)...");
              currentCount = 0;
              const updatePromise = supabase
                .from("user_limits")
                .update({ messages_used: 0, last_reset: new Date().toISOString() })
                .eq("user_id", userId);
              await withTimeout(updatePromise, 3000);
            }
          }

          console.log(`Current messages used: ${currentCount}/15`);

          if (currentCount >= 15) {
            return res.status(403).json({ 
              error: "You have reached your free limit of 15 messages. Upgrade to Pro." 
            });
          }
        }
      } catch (dbError: any) {
        console.error("Supabase query failed or timed out in api/chat.ts, defaulting to free/unverified limits:", dbError);
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

    let completion;
    try {
      const activeProvider = (process.env.AI_PROVIDER || 'openai').toLowerCase().trim();
      console.log(`[api/chat] Routing request through AI provider abstraction (AI_PROVIDER=${activeProvider})...`);
      completion = await fetchChatCompletion(messages, 0.7, attachments || []);
    } catch (apiError: any) {
      console.error("[api/chat] AI provider call failed!");
      console.error("Error Status:", apiError.status || apiError.statusCode || "N/A");
      console.error("Error Code:", apiError.code || "N/A");
      console.error("Error Message:", apiError.message || "N/A");
      console.error("Full Error Object:", apiError);

      return res.status(apiError.status || 500).json({
        error: apiError.message || "AI API call failed.",
        code: apiError.code || null,
        status: apiError.status || 500,
        details: String(apiError)
      });
    }

    const replyText = completion.choices?.[0]?.message?.content;
    if (!replyText) {
      throw new Error("No response content returned from AI API");
    }

    // Increment usage count in database if successfully completed
    if (hasUserId && !isPro) {
      try {
        console.log("Updating usage counts in Supabase...");
        const nextCount = currentCount + 1;
        const updateLimitsPromise = supabase
          .from("user_limits")
          .update({ messages_used: nextCount })
          .eq("user_id", userId);

        const updateProfilePromise = supabase
          .from("profiles")
          .update({ chat_count_today: nextCount })
          .eq("id", userId);

        await Promise.all([
          withTimeout(updateLimitsPromise, 3000),
          withTimeout(updateProfilePromise, 3000)
        ]);
        console.log("Usage counts successfully updated.");
      } catch (dbUpdateError) {
        console.error("Failed to update user limits in Supabase after successful chat:", dbUpdateError);
      }
    }

    console.log("--- SUCCESSFUL CHAT ENDPOINT CALL ---");
    return res.status(200).json({ reply: replyText });

  } catch (error: any) {
    console.error("CRITICAL EXCEPTION IN CHAT ENDPOINT:", error);
    console.error(error.stack || "No stack trace available");
    
    return res.status(500).json({ 
      error: error.message || "An unexpected error occurred.",
      details: String(error),
      stack: error.stack || null
    });
  }
}
