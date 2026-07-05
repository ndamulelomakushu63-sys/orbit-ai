import { GoogleGenAI } from '@google/genai';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { 
      businessIdea, 
      industry, 
      country, 
      startingBudget, 
      targetCustomers, 
      experienceLevel 
    } = req.body || {};

    if (!businessIdea || !industry) {
      return res.status(400).json({ error: "Business Idea and Industry are required" });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(500).json({ 
        error: "GEMINI_API_KEY is not defined. Please check your Vercel Environment Variables." 
      });
    }

    const ai = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const prompt = `Formulate a comprehensive, educational business concept and 30-day launch plan based on the following questionnaire details:
- Proposed Business Idea: ${businessIdea}
- Industry: ${industry}
- Location/Country: ${country || "Any"}
- Starting Budget: ${startingBudget || "Minimal"}
- Target Customers: ${targetCustomers || "General market"}
- User Experience Level: ${experienceLevel || "Beginner"}

CRITICAL RULES:
1. NEVER guarantee profits or predict exact success metrics.
2. NEVER provide investment advice, legal declarations, or financial guarantees.
3. Keep all recommendations educational, practical, realistic, and highly actionable.
4. Focus purely on robust, legal business planning.

Generate a structured business blueprint containing:
1. exactly 5 creative Business Name suggestions with catchy slogans.
- Each suggestion must have 'name' and 'tagline' keys.
2. a thorough Business Description detailing the model.
3. a detailed Target Audience profiling.
4. a realistic Revenue Model mapping out potential channels.
5. an actionable, chronologically sequenced Startup Checklist of at least 8 items.
6. a highly responsive Marketing Plan suited to the specified budget.
7. realistic Pricing Suggestions with tier recommendations or price calculations.
8. a detailed 30-Day Launch Plan outlining specific daily or weekly tasks.
9. a creative Social Media Strategy outlining platforms and content themes.
10. an objective Risk Assessment highlighting challenges and how to safely navigate them.

Format the response as a valid JSON object matching this schema structure:
{
  "businessNames": [
    { "name": "...", "tagline": "..." }
  ],
  "businessDescription": "...",
  "targetAudience": "...",
  "revenueModel": "...",
  "startupChecklist": ["...", "..."],
  "marketingPlan": "...",
  "pricingSuggestions": "...",
  "launchPlan30Day": ["...", "..."],
  "socialMediaStrategy": "...",
  "riskAssessment": "..."
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are the Orbit AI Business Builder consultant, an educational business planner. You help users structure realistic business ideas into launch plans. You never promise profits, success, or offer investment or legal advice. You maintain a helpful, detailed, and highly safe tone, outputting structured JSON according to the schema requested.",
        responseMimeType: "application/json",
        temperature: 0.7
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No response text received from Gemini");
    }

    const plan = JSON.parse(resultText.trim());
    return res.status(200).json({ plan });
  } catch (error: any) {
    console.error("Business Builder Generator Vercel API Error:", error);
    return res.status(500).json({ 
      error: "Failed to generate business plan. Please try again.",
      details: error.message 
    });
  }
}
