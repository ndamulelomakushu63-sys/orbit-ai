// Vercel Serverless Function for Orbit AI Chat
import { supabase } from '../src/services/supabase';
import OpenAI from 'openai';

export default async function handler(req: any, res: any) {
  // Allow only POST requests
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.warn("Failed to parse request body string:", e);
      }
    }
    const { message, history, systemPrompt, userId } = body || {};

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
    }

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.warn("WARNING: OPENAI_API_KEY is not defined in environment variables on Vercel.");
      return res.status(500).json({ 
        error: "OPENAI_API_KEY is not defined inside Vercel environment variables." 
      });
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
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

    console.log("Calling OpenAI GPT-4o-mini API on Vercel...");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      temperature: 0.7
    });

    const replyText = response.choices[0]?.message?.content || "I was unable to formulate a response. Please try again.";

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

    return res.status(200).json({ reply: replyText });
  } catch (error: any) {
    console.error("OpenAI API Error in Vercel API (full details):", error);
    
    // Log full properties for deep diagnostics
    if (typeof error === 'object' && error !== null) {
      try {
        console.error("Stringified OpenAI API Error details:", JSON.stringify(error, null, 2));
      } catch (jsonErr) {
        console.error("Could not stringify OpenAI API error:", jsonErr);
      }
    }

    // Extract OpenAI specific error payload
    const openAiErrorObj = error.error || {};
    const errCode = openAiErrorObj.code || error.code || "unknown";
    const errMsg = openAiErrorObj.message || error.message || "An unexpected OpenAI error occurred.";
    const errType = openAiErrorObj.type || error.type || "unknown";

    return res.status(500).json({ 
      error: errMsg,
      details: `OpenAI Error Type: ${errType}, Code: ${errCode}`,
      code: errCode,
      type: errType
    });
  }
}
