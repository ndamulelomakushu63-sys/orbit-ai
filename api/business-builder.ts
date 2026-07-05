import OpenAI from 'openai';

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

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      return res.status(500).json({ 
        error: "OPENAI_API_KEY is not defined. Please check your Vercel Environment Variables." 
      });
    }

    const openai = new OpenAI({
      apiKey: openaiApiKey,
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

    console.log("Calling OpenAI Chat Completion API on Vercel (Business Builder) via direct fetch...");

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
          content: "You are the Orbit AI Business Builder consultant, an educational business planner. You help users structure realistic business ideas into launch plans. You never promise profits, success, or offer investment or legal advice. You maintain a helpful, detailed, and highly safe tone, outputting structured JSON according to the schema requested."
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

    console.log(`OpenAI Business Builder API HTTP Status Code: ${openAiResponse.status}`);

    const responseText = await openAiResponse.text();
    console.log(`OpenAI Business Builder API Raw Response Body:`, responseText);

    if (!openAiResponse.ok) {
      console.error(`OpenAI Business Builder API request failed on Vercel with status ${openAiResponse.status}`);
      return res.status(openAiResponse.status).send(responseText);
    }

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (parseErr: any) {
      console.error("Failed to parse OpenAI Business Builder response as JSON:", parseErr);
      return res.status(500).send(`Failed to parse OpenAI response: ${responseText}`);
    }

    const resultText = responseData.choices?.[0]?.message?.content;
    if (!resultText) {
      throw new Error("No response text received from OpenAI");
    }

    const plan = JSON.parse(resultText.trim());
    return res.status(200).json({ plan });
  } catch (error: any) {
    console.error("Business Builder Generator Vercel API Error (full details):", error);
    return res.status(500).json({
      error: error.message || "An unexpected error occurred.",
      details: String(error)
    });
  }
}
