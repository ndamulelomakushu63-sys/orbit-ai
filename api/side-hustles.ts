import OpenAI from 'openai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

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
    } = req.body || {};

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({ 
        error: "OPENAI_API_KEY is not defined. Please check your Vercel Environment Variables." 
      });
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
    });

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

    console.log("Calling OpenAI Chat Completion API on Vercel (Side Hustles) via direct fetch...");

    const url = "https://api.openai.com/v1/chat/completions";
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${openaiApiKey}`
    };
    const bodyPayload = JSON.stringify({
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
    });

    const openAiResponse = await fetch(url, {
      method: "POST",
      headers,
      body: bodyPayload
    });

    console.log(`OpenAI Side Hustles API HTTP Status Code: ${openAiResponse.status}`);

    const responseText = await openAiResponse.text();
    console.log(`OpenAI Side Hustles API Raw Response Body:`, responseText);

    if (!openAiResponse.ok) {
      console.error(`OpenAI Side Hustles API request failed on Vercel with status ${openAiResponse.status}`);
      return res.status(openAiResponse.status).send(responseText);
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseErr: any) {
      console.error("Failed to parse OpenAI Side Hustles response as JSON:", parseErr);
      return res.status(500).send(`Failed to parse OpenAI response: ${responseText}`);
    }

    const resultText = responseData.choices?.[0]?.message?.content;
    if (!resultText) {
      throw new Error("No response text received from OpenAI");
    }

    const parsedData = JSON.parse(resultText.trim());
    return res.status(200).json({ ideas: parsedData.ideas || [] });
  } catch (error: any) {
    console.error("Side Hustle Generator Vercel API Error (full details):", error);
    return res.status(500).json({
      error: error.message || "An unexpected error occurred.",
      details: String(error)
    });
  }
}
