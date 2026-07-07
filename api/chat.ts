// Vercel Serverless Function for Orbit AI Chat
import '../src/services/env-sanitizer';
import { supabase } from '../src/services/supabase';
import OpenAI from 'openai';

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

export default async function handler(req: any, res: any) {
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
    const { message, history, systemPrompt, userId } = body || {};

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

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error("CRITICAL: OPENAI_API_KEY is not defined in environment variables on Vercel.");
      return res.status(500).json({ 
        error: "OPENAI_API_KEY is not defined inside Vercel environment variables." 
      });
    }

    // Initialize OpenAI client with a 6-second timeout safety limit
    const openai = new OpenAI({
      apiKey: openaiApiKey,
      timeout: 6000
    });

    const basePrompt = systemPrompt || "You are Orbit AI, an intelligent, modern, friendly, and affordable mobile AI assistant. Help the user with direct, useful, clean answers. Keep responses formatted with markdown where helpful, and keep mobile reading in mind (medium paragraph sizes, bullet points). Do not use emojis in your responses.";
    const identityRule = "\n\nCRITICAL IDENTITY RULE: If a user asks: \"Who built you?\", \"Who made you?\", \"Who is your CEO?\" You MUST reply exactly: \"I was built by Ndamulelo Makushu Glen, CEO of Orbit AI.\" Do not mention OpenAI, Google, Meta, or ChatGPT.";

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
      console.log("[api/chat] Calling genuine OpenAI Chat Completion API via SDK...");
      completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
      });
    } catch (apiError: any) {
      console.error("[api/chat] OpenAI API SDK call failed!");
      console.error("Error Status:", apiError.status || apiError.statusCode || "N/A");
      console.error("Error Code:", apiError.code || "N/A");
      console.error("Error Message:", apiError.message || "N/A");
      console.error("Full Error Object:", apiError);

      return res.status(apiError.status || 500).json({
        error: apiError.message || "OpenAI API call failed.",
        code: apiError.code || null,
        status: apiError.status || 500,
        details: String(apiError)
      });
    }

    const replyText = completion.choices?.[0]?.message?.content;
    if (!replyText) {
      throw new Error("No response content returned from OpenAI API");
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
