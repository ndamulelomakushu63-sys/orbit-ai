// Vercel Serverless Function for Orbit AI Chat
import { GoogleGenAI } from "@google/genai";

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

    let apiKey = process.env.GEMINI_API_KEY;
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
      console.warn("WARNING: GEMINI_API_KEY is not defined in environment variables on Vercel.");
      return res.status(500).json({ 
        error: "GEMINI_API_KEY is not defined in Vercel environment variables. Please add it to your Vercel Project Settings." 
      });
    }

    // Initialize the official Google Gen AI SDK
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Format conversation history for Gemini if present
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((msg: { role: string; text: string }) => {
        let apiRole = "user";
        if (msg.role === "model" || msg.role === "assistant") {
          apiRole = "model";
        }
        contents.push({
          role: apiRole,
          parts: [{ text: msg.text || "" }]
        });
      });
    }
    
    // Add current user message if not already the last one
    const lastContent = contents[contents.length - 1];
    if (!lastContent || lastContent.role !== "user") {
      contents.push({
        role: "user",
        parts: [{ text: message }]
      });
    }

    const basePrompt = systemPrompt || "You are Orbit AI, an intelligent, modern, friendly, and affordable mobile AI assistant. Help the user with direct, useful, clean answers. Keep responses formatted with markdown where helpful, and keep mobile reading in mind (medium paragraph sizes, bullet points). Do not use emojis in your responses.";
    const identityRule = "\n\nCRITICAL IDENTITY RULE: If a user asks: \"Who built you?\", \"Who made you?\", \"Who is your CEO?\" You MUST reply exactly: \"I was built by Ndamulelo Makushu Glen, CEO of Orbit AI.\" Do not mention OpenAI, Google, Meta, or ChatGPT.";

    console.log("Calling Gemini Developer API (Google AI Studio) via official @google/genai SDK on Vercel...");
    
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: basePrompt + identityRule
      }
    });

    const replyText = response.text || "I was unable to formulate a response. Please try again.";
    return res.status(200).json({ reply: replyText });
  } catch (error: any) {
    console.error("Gemini API Error in Vercel API:", error);
    return res.status(500).json({ 
      error: "Failed to query AI assistant. Please check your GEMINI_API_KEY.",
      details: error.message 
    });
  }
}
