import { GoogleGenAI, Type } from "@google/genai";

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
      return res.status(500).json({ 
        error: "GEMINI_API_KEY is not defined. Please check your Vercel Environment Variables." 
      });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
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
6. Provide specific helpful resources (like Canva, Upwork, standard search terms, etc.) to learn the hustle.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are the Orbit AI Side Hustle Assistant, an educational and analytical planner. You help users discover realistic, legal side hustles. You never promise wealth or guarantee success, and you keep advice highly practical, legal, safe, and structured. You output strictly standard JSON that complies with the schema.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Side Hustle Name" },
              difficulty: { type: Type.STRING, description: "Difficulty level (Easy, Medium, Hard)" },
              startupCost: { type: Type.STRING, description: "Startup cost estimated with currency (e.g. R0, R200, $50)" },
              timeRequired: { type: Type.STRING, description: "Hours or time commitment required per week" },
              whyMatches: { type: Type.STRING, description: "Personalized rationale matching their specific profile" },
              steps: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Exactly 7 actionable sequential steps to get started"
              },
              challenges: { type: Type.STRING, description: "Key realistic challenges or hurdles they will face" },
              resources: { type: Type.STRING, description: "Helpful free tools, websites, or learning materials" }
            },
            required: ["name", "difficulty", "startupCost", "timeRequired", "whyMatches", "steps", "challenges", "resources"]
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response text received from Gemini");
    }

    const ideas = JSON.parse(resultText.trim());
    return res.status(200).json({ ideas });
  } catch (error: any) {
    console.error("Side Hustle Generator Vercel API Error:", error);
    return res.status(500).json({ 
      error: "Failed to generate side hustles. Please try again.",
      details: error.message 
    });
  }
}
