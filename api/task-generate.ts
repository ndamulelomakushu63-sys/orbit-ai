import '../src/services/env-sanitizer.js';
import { fetchChatCompletion } from '../src/services/ai-helper.js';

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

    let prompt = "";

    if (taskType === "cv") {
      const jobDescBlock = inputs.jobDescription ? `\n- TARGET JOB DESCRIPTION TO TAILOR FOR: ${inputs.jobDescription}` : "";

      prompt = `You are a World-Class Executive Career Consultant and ATS Optimization Specialist for global recruitment in 2026.
Generate a complete, high-fidelity Curriculum Vitae (CV), a matching professional Cover Letter, an ATS & Quality Audit Score, and AI Career Coaching guidance.

USER PROFILED INPUTS:
- Full Name: ${inputs.fullName || "Candidate Name"}
- Target Position / Title: ${inputs.position || "Professional Candidate"}
- Contact Details:
  * Phone: ${inputs.phoneNumber || "Not provided"}
  * Email: ${inputs.email || "Not provided"}
  * Location (City & Country): ${inputs.location || "Not provided"}
  * LinkedIn: ${inputs.linkedIn || "Not provided"}
  * Portfolio/Website: ${inputs.portfolio || "Not provided"}
- Highest Education: ${inputs.educationLevel || inputs.education || "Not provided"}
- Institution & Graduation Date: ${inputs.educationInstitution || "Not provided"}
- Work Experience Summary: ${inputs.experience || "Entry level / Transitioning"}
- Key Skills: ${inputs.skills || "General Professional Skills"}
- Spoken Languages: ${inputs.languages || "English"}
- Certifications & Licences: ${inputs.certificates || "None"}
- Key Projects: ${inputs.projects || "None"}
- Personal Achievements: ${inputs.achievements || "None"}
- References Preference: ${inputs.includeReferences || "Available upon request"}
- Additional Context: ${inputs.extra || "None"}
- Preferred CV Theme: ${inputs.style || "Professional"}${jobDescBlock}

CRITICAL INSTRUCTIONS & RULES:
1. Conduct an automatic grammar, spelling, punctuation, and structural validation across every line.
2. Ensure strict ATS compliance: standard headings, clean spacing, bullet points with powerful action verbs, and no complex tables/graphics.
3. Every Work Experience entry MUST include bullet points with quantifiable achievements, percentages, or metrics where applicable.
4. Categorize Skills explicitly into:
   - Technical Skills
   - Professional Skills
   - Soft Skills
5. References MUST default to "Available upon request" unless specific reference contact details were explicitly provided.
6. If a target job description was provided above, tailor the summary, experience bullets, and skill keywords specifically to match that job description for maximum ATS relevance!

MUST RETURN A VALID JSON OBJECT ONLY (NO MARKDOWN CODEBLOCKS, NO WRAPPER TEXT) WITH THIS EXACT SCHEMA:
{
  "cv": "Full markdown text of the CV following standard headings:\\n# [FULL NAME]\\n### [PROFESSIONAL TITLE]\\nPhone: [Phone] | Email: [Email] | Location: [Location] | LinkedIn: [LinkedIn] | Portfolio: [Portfolio]\\n\\n## PROFESSIONAL SUMMARY\\n(3-5 powerful, value-driven sentences with metrics)\\n\\n## SKILLS & COMPETENCIES\\n### Technical Skills\\n* ...\\n### Professional Skills\\n* ...\\n### Soft Skills\\n* ...\\n\\n## WORK EXPERIENCE\\n(Detailed positions with company, location, dates, responsibilities, and quantified bullet points)\\n\\n## EDUCATION & QUALIFICATIONS\\n(Qualification, Institution, Graduation Date)\\n\\n## CERTIFICATIONS & LICENCES\\n(Relevant certifications/licences)\\n\\n## KEY PROJECTS\\n(If applicable)\\n\\n## LANGUAGES\\n(Languages with proficiency levels)\\n\\n## REFERENCES\\n(Available upon request or details)",

  "coverLetter": "A complete, tailored 3-4 paragraph Cover Letter in formal business letter format matching the target position and candidate background.",

  "score": {
    "atsScore": 95,
    "qualityScore": 96,
    "strengths": ["Strong action verbs", "Quantified achievements", "Clean ATS section hierarchy"],
    "weaknesses": ["Could add more industry-specific certifications"],
    "suggestions": ["Include target job key terms if applying to automated HR portals"]
  },

  "careerCoach": {
    "interviewTips": ["Highlight your experience with quantifiable project metrics", "Prepare behavioral stories using the STAR method"],
    "missingSkills": ["Advanced Cloud Architecture", "Data Analytics & Dashboarding"],
    "careerRecommendations": ["Senior Lead Specialist", "Technical Project Consultant"],
    "recommendedCourses": ["Google Professional Certificate", "AWS Certified Developer"]
  }
}`;
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

    const basePrompt = `You are the Orbit AI Task Specialist, an executive-level, university-standard execution system. You do not engage in chat-style conversational greetings, small talk, or polite introductory filler. You deliver immediate, highly structured, executive-ready, and academically professional outcomes.

CRITICAL FORMATTING MANDATES FOR ALL RESPONSES:
1. Do NOT use markdown heading symbols (#, ##, ###) or fill responses with hashtags or asterisks (*****).
2. For section titles, use clean UPPERCASE BOLD text (e.g. **EXECUTIVE SUMMARY**, **KEY FINDINGS**, **RECOMMENDED ACTION PLAN**) on its own line with proper paragraph spacing.
3. Use clean bullet points (* or -) and numbered lists (1., 2., 3.) where appropriate.
4. Use professional spacing and proper paragraphs.
5. Do NOT use emojis or informal colloquialisms.
6. Match the clean, executive-ready formatting quality of university-standard academic reports and CVs.
7. Answer strictly what was requested without filler.`;
    
    console.log("Calling OpenAI Chat Completion API on Vercel (Task Specialist) via AI-Helper...");

    const messages = [
      {
        role: "system",
        content: basePrompt
      },
      {
        role: "user",
        content: prompt
      }
    ];

    const responseData = await fetchChatCompletion(messages, 0.5);

    const replyText = responseData.choices?.[0]?.message?.content || "I was unable to generate a high-quality result. Please try again.";

    if (taskType === "cv") {
      try {
        let cleanStr = replyText.trim();
        if (cleanStr.startsWith("```json")) {
          cleanStr = cleanStr.replace(/^```json/, "").replace(/```$/, "").trim();
        } else if (cleanStr.startsWith("```")) {
          cleanStr = cleanStr.replace(/^```/, "").replace(/```$/, "").trim();
        }
        const parsed = JSON.parse(cleanStr);
        return res.status(200).json({
          result: parsed.cv || replyText,
          coverLetter: parsed.coverLetter || "",
          score: parsed.score || null,
          careerCoach: parsed.careerCoach || null
        });
      } catch (jsonErr) {
        console.warn("CV JSON parse warning, falling back to raw text:", jsonErr);
        return res.status(200).json({ result: replyText });
      }
    }

    return res.status(200).json({ result: replyText });
  } catch (error: any) {
    console.error("Task Mode Generator Vercel API Error (full details):", error);
    return res.status(500).json({
      error: error.message || "An unexpected error occurred.",
      details: String(error)
    });
  }
}
