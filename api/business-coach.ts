// Vercel Serverless Function for Orbit AI Business Coach
import '../src/services/env-sanitizer.js';
import { fetchChatCompletion } from '../src/services/ai-helper.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { question, businessContext, chatHistory } = req.body;
    if (!question) {
      return res.status(400).json({ error: "Question is required" });
    }

    const contextSummary = businessContext 
      ? `User's Generated Business Context:
- Name Suggestions: ${JSON.stringify(businessContext.businessNames || [])}
- Description: ${businessContext.businessDescription || ''}
- Target Audience: ${businessContext.targetAudience || ''}
- Revenue Model: ${businessContext.revenueModel || ''}
- Marketing Plan: ${businessContext.marketingPlan || ''}
- Pricing: ${businessContext.pricingSuggestions || ''}
- Health Score: ${businessContext.healthScore?.score || 'N/A'}/100`
      : "General Business Consultation";

    const messages = [
      {
        role: "system",
        content: `You are the Orbit AI Business Coach, an expert, practical, highly supportive startup consultant and advisor.
${contextSummary}

Provide detailed, actionable, highly tailored advice for the user's question.
- If asked for ads, social posts, or sales pitches, write out ready-to-use copy.
- If asked about pricing, customer acquisition, investors, or scaling, provide clear step-by-step instructions.
- Format responses cleanly with bold headings and structured bullet points.
- Maintain an encouraging, professional, educational tone.`
      },
      ...(chatHistory || []).map((m: any) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      })),
      {
        role: "user",
        content: question
      }
    ];

    const responseData = await fetchChatCompletion(messages, 0.7);
    const answer = responseData.choices?.[0]?.message?.content || "I apologize, I could not generate a response right now. Please try again.";

    return res.status(200).json({ answer });
  } catch (error: any) {
    console.error("Business Coach Vercel API Error:", error);
    return res.status(error.status || 500).json({ error: error.message || "An error occurred with the AI Business Coach." });
  }
}
