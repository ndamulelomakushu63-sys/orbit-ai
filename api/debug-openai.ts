import '../src/services/env-sanitizer';
import OpenAI from 'openai';

export default async function handler(req: any, res: any) {
  console.log("--- START DEBUG OPENAI ENDPOINT ---");
  
  // Log request info
  console.log("Request Method:", req.method);
  console.log("Request Headers:", JSON.stringify(req.headers));
  console.log("Request Body:", JSON.stringify(req.body));

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
    console.log("Test 1: Starting direct fetch to OpenAI Chat Completion API...");
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
    
    console.log(`Test 1 Status Code: ${status}`);
    console.log(`Test 1 Response Body: ${responseText}`);

    results.openaiDirectFetchResult = {
      status,
      body: responseText
    };

    if (!openAiResponse.ok) {
      results.errors.push(`Direct fetch failed with status ${status}: ${responseText}`);
    }
  } catch (err: any) {
    const errMsg = `Test 1 Crash: ${err.message || err}`;
    console.error(errMsg, err.stack);
    results.errors.push({
      message: errMsg,
      stack: err.stack
    });
  }

  // Test 2: SDK initialization and test
  try {
    console.log("Test 2: Starting OpenAI SDK initialization and call...");
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

    console.log("Test 2 Success:", JSON.stringify(response));
    results.openaiSdkResult = {
      choices: response.choices
    };
  } catch (err: any) {
    const errMsg = `Test 2 Crash: ${err.message || err}`;
    console.error(errMsg, err.stack);
    results.errors.push({
      message: errMsg,
      stack: err.stack
    });
  }

  console.log("--- END DEBUG OPENAI ENDPOINT ---");
  return res.status(200).json(results);
}
