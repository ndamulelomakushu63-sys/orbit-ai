/**
 * AI Helper Utility
 * Implements a robust OpenAI Chat Completion fetch wrapper with automatic
 * seamless fallback to Gemini API if OpenAI fails (e.g. with 401 Unauthorized,
 * which happens when the OpenAI key is invalid or expired).
 */

export async function fetchChatCompletion(messages: any[], temperature: number = 0.7): Promise<any> {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  console.log(`[AI-Helper] Starting Chat Completion request. OpenAI key available: ${!!openaiApiKey}, Gemini key available: ${!!geminiApiKey}`);

  // Try OpenAI first if the key is defined
  if (openaiApiKey && !openaiApiKey.includes("your_openai_api_key_here")) {
    try {
      console.log("[AI-Helper] Attempting to call OpenAI Chat Completion API...");
      const url = "https://api.openai.com/v1/chat/completions";
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          temperature
        })
      });

      if (response.ok) {
        console.log("[AI-Helper] OpenAI Chat Completion call succeeded!");
        return await response.json();
      }

      const responseText = await response.text();
      console.warn(`[AI-Helper] OpenAI API returned status ${response.status}. Body: ${responseText.substring(0, 200)}`);
      
      // If it's a 401 or 403, we definitely want to fall back
      if (response.status === 401 || response.status === 403) {
        console.warn("[AI-Helper] OpenAI auth error detected. Proceeding to Gemini fallback...");
      } else {
        throw new Error(`OpenAI API request failed with status ${response.status}: ${responseText}`);
      }
    } catch (err: any) {
      console.error("[AI-Helper] OpenAI request threw an error:", err.message || err);
    }
  } else {
    console.warn("[AI-Helper] OpenAI API key is missing or set to placeholder. Proceeding directly to Gemini fallback...");
  }

  // Fallback to Gemini API
  if (!geminiApiKey) {
    throw new Error("Both OpenAI API key and Gemini API key are missing or invalid.");
  }

  console.log("[AI-Helper] Executing Gemini API fallback...");

  try {
    const systemMessage = messages.find(msg => msg.role === 'system');
    const systemInstruction = systemMessage ? systemMessage.content : undefined;

    const contents = messages
      .filter(msg => msg.role !== 'system')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content) }]
      }));

    const payload: any = {
      contents,
      generationConfig: {
        temperature,
      }
    };

    if (systemInstruction) {
      payload.systemInstruction = {
        parts: [{ text: systemInstruction }]
      };
    }

    // Determine if the Gemini API key is an OAuth access token (does not start with 'AIzaSy' or starts with 'ya29.')
    const isOAuthToken = !geminiApiKey.startsWith("AIzaSy") || geminiApiKey.startsWith("ya29.");
    
    let url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (isOAuthToken) {
      console.log("[AI-Helper] Gemini credential detected as OAuth Access Token. Injecting Authorization Bearer header...");
      headers["Authorization"] = `Bearer ${geminiApiKey}`;
    } else {
      console.log("[AI-Helper] Gemini credential detected as API Key. Appending key parameter to query...");
      url += `?key=${geminiApiKey}`;
    }
    
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API call failed with status ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log("[AI-Helper] Gemini API fallback call succeeded!");

    // Format exactly like OpenAI's chat completions JSON response
    return {
      choices: [
        {
          message: {
            role: "assistant",
            content: text
          }
        }
      ]
    };
  } catch (geminiErr: any) {
    console.error("[AI-Helper] Gemini fallback failed too:", geminiErr.message || geminiErr);
    throw geminiErr;
  }
}
