// Vercel Serverless Function for Orbit AI Chat

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
    const { message, history, systemPrompt } = body || {};

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
      console.warn("WARNING: OPENAI_API_KEY is not defined in environment variables on Vercel.");
      return res.status(500).json({ 
        error: "OPENAI_API_KEY is not defined in Vercel environment variables. Please add it to your Vercel Project Settings." 
      });
    }

    const basePrompt = systemPrompt || "You are Orbit AI, an intelligent, modern, friendly, and affordable mobile AI assistant. Help the user with direct, useful, clean answers. Keep responses formatted with markdown where helpful, and keep mobile reading in mind (medium paragraph sizes, bullet points). Do not use emojis in your responses.";
    const identityRule = "\n\nCRITICAL IDENTITY RULE: If a user asks: \"Who built you?\", \"Who made you?\", \"Who is your CEO?\" You MUST reply exactly: \"I was built by Ndamulelo Makushu Glen, CEO of Orbit AI.\" Do not mention OpenAI, Google, Meta, or ChatGPT.";

    // Format conversation history for OpenAI Chat completions
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

    console.log("Calling OpenAI GPT-4o-mini API on Vercel...");
    
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
    return res.status(200).json({ reply: replyText });
  } catch (error: any) {
    console.error("OpenAI API Error in Vercel API:", error);
    return res.status(500).json({ 
      error: "Failed to query AI assistant. Please check your OPENAI_API_KEY.",
      details: error.message 
    });
  }
}
