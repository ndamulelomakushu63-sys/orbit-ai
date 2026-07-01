export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { taskType, inputs } = req.body || {};
    if (!taskType || !inputs) {
      return res.status(400).json({ error: "Task type and inputs are required" });
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
      return res.status(500).json({ 
        error: "OPENAI_API_KEY is not defined. Please check your Vercel Environment Variables." 
      });
    }

    let prompt = "";

    if (taskType === "cv") {
      prompt = `Write a professional, high-fidelity curriculum vitae (CV) for the following individual:
- Full Name: ${inputs.fullName}
- Key Skills: ${inputs.skills}
- Work Experience: ${inputs.experience}
- Education Background: ${inputs.education}

CRITICAL RULES:
1. Format this professionally with clean spacing and clear layout.
2. Structure the CV into standard sections:
   - PROFESSIONAL SUMMARY (a powerful paragraph highlighting their skills and experience)
   - KEY SKILLS & COMPETENCIES (formatted as bullet points)
   - PROFESSIONAL WORK EXPERIENCE (ordered chronologically, detailed and professional)
   - ACADEMIC EDUCATION & TRAINING (detailed qualifications, institutions, and years)
   - PROFESSIONAL REFERENCES (provide clear placeholder/structured fields like 'Available on request' or formatted reference boxes)
3. Do NOT include any emojis in the response.
4. Keep the text professional, concise, and highly employer-friendly.`;
    } else if (taskType === "business_plan") {
      prompt = `Write a comprehensive, professional, and structured Business Plan outline for:
- Business Name: ${inputs.businessName}
- Industry Sector: ${inputs.industry}
- Target Audience/Customers: ${inputs.targetAudience}
- Main Product or Service: ${inputs.productService}

CRITICAL RULES:
1. Structure the Business Plan with clear headers and professional formatting:
   - EXECUTIVE SUMMARY (summarizing the venture, target market, and value proposition)
   - MARKET ANALYSIS & RESEARCH (the industry landscape, competitor gaps, and target demographic details)
   - MARKETING & SALES STRATEGY (pricing models, customer acquisition channels, and promotions)
   - OPERATIONAL & MANAGEMENT PLAN (day-to-day operations, technology stack, and roles)
   - BASIC FINANCIAL OUTLINE (startup cost breakdown, standard revenue channels, and milestone budgets)
2. Do NOT use emojis.
3. Keep the content highly strategic, realistic, actionable, and analytical.`;
    } else if (taskType === "email") {
      prompt = `Write a professional, ready-to-send professional email based on the following context:
- Purpose of the Email: ${inputs.purpose}
- Recipient Type: ${inputs.recipient}
- Desired Tone: ${inputs.tone}

CRITICAL RULES:
1. Provide a professional and catchy Subject Line.
2. Structure it clearly:
   - Subject Line
   - Professional Salutation
   - Well-structured Body paragraphs (introduction, core point/proposal, call-to-action)
   - Professional Sign-off and placeholder signature blocks
3. Do NOT use emojis.
4. Keep the writing polished, grammatically pristine, and natural.`;
    } else if (taskType === "social_media") {
      prompt = `Create highly engaging, copy-ready social media posts based on the following:
- Topic or Product: ${inputs.topic}
- Target Platforms: ${inputs.platform}
- Core Message / Offer: ${inputs.message}
- Tone of Voice: ${inputs.tone}

CRITICAL RULES:
1. Provide optimized versions for each of the target platforms (e.g., LinkedIn, Instagram, X/Twitter).
2. For each platform:
   - Write a compelling hook.
   - Deliver the key message with appropriate spacing and readability.
   - End with a clear, specific Call to Action (CTA).
   - Include 4-6 highly relevant professional hashtags.
3. Do NOT use emojis.
4. Ensure the content matches platform-specific best practices (e.g., concise and punchy for X, detailed and professional for LinkedIn).`;
    } else if (taskType === "summarize") {
      prompt = `Create a detailed, high-fidelity Executive Summary for the following document:
- Document File Name: ${inputs.fileName}
- Document File Size: ${inputs.fileSize}
- Paste Text Content/Description: ${inputs.pastedText || "Not provided directly, summarize based on the document's profile, name, and main topic."}

CRITICAL RULES:
1. Structure the summary beautifully and professionally:
   - DOCUMENT METADATA OVERVIEW (Name, Size, Type)
   - EXECUTIVE BRIEF (A concise high-level overview of the document's core purpose)
   - KEY HIGHLIGHTS & INSIGHTS (A clean bulleted list of major findings or critical takeaways)
   - CORE FINDINGS / DETAILS (A deeper breakdown of the primary themes)
   - SUMMARY OF RECOMMENDATIONS & ACTION STEPS
2. Do NOT use emojis.
3. Keep the tone analytical, objective, and executive-level.`;
    } else if (taskType === "assignment") {
      prompt = `Provide a comprehensive academic assignment guide and outline helper for:
- Assignment Topic/Subject: ${inputs.topic}
- Assignment Guidelines / Question: ${inputs.guidelines}
- Additional Context/Source: ${inputs.fileName ? `Reference File: ${inputs.fileName}` : "None"}

CRITICAL RULES:
1. Structure this helper clearly and educationally:
   - UNDERSTANDING THE TOPIC (Breakdown of key concepts, definitions, and core theories)
   - COMPREHENSIVE OUTLINE STRUCTURE (An elegant, detailed step-by-step structure for the essay or paper, including Introduction, main argument body sections, and Conclusion)
   - ANALYTICAL DEEP-DIVE & CRITICAL ANALYSIS GUIDELINES (How to analyze the prompt, what arguments to present, and potential academic references to research)
   - DRAFTING GUIDE & PRO-TIPS (How to write academically, avoid logical fallacies, and ensure high-quality structure)
2. Do NOT use emojis.
3. Focus purely on robust, legal, and highly academic guidance. Ensure it serves as a highly educational tool, not simple direct plagiarism generation.`;
    } else {
      return res.status(400).json({ error: "Invalid task type specified" });
    }

    const basePrompt = "You are the Orbit AI Task Specialist, a highly sophisticated execution system. You do not engage in chat-style conversational greetings, small talk, or polite introductory filler. You instantly deliver highly structured, beautifully formatted, comprehensive, and complete professional outcomes. You always output cleanly formatted markdown with clear headers and bullet points. Do not use emojis in your response.";
    
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: basePrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.5
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API returned status ${response.status}: ${errText}`);
    }

    const data: any = await response.json();
    const replyText = data.choices?.[0]?.message?.content || "I was unable to generate a high-quality result. Please try again.";
    return res.status(200).json({ result: replyText });
  } catch (error: any) {
    console.error("Task Mode Generator Vercel API Error:", error);
    return res.status(500).json({ 
      error: "Failed to generate task output. Please try again.",
      details: error.message 
    });
  }
}
