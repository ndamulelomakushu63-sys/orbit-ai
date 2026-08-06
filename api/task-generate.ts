import '../src/services/env-sanitizer.js';
import { fetchChatCompletion } from '../src/services/ai-helper.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { taskType, inputs, attachments } = req.body || {};
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
      const userInstruction = inputs.pastedText && inputs.pastedText.trim() ? inputs.pastedText.trim() : "";
      const docName = inputs.fileName || "Uploaded Document";

      prompt = `ATTACHED DOCUMENT / FILE:
${docName} (Size: ${inputs.fileSize || "N/A"})

${userInstruction ? `USER INSTRUCTION / NOTES:\n${userInstruction}\n` : ""}

CRITICAL PROCESSING ORDER & MANDATES FOR DOCUMENT SUMMARIZER:
1. FIRST: Read, analyze, and understand the uploaded file, PDF, image, photo, screenshot, or document context completely.
2. READ THE USER INSTRUCTION: If specific instructions or questions were provided in the user instruction box, execute ONLY those instructions. If no specific instruction was given, create a high-fidelity Executive Summary of the document.
3. DO NOT MAKE ASSUMPTIONS, DO NOT GUESS, DO NOT IGNORE THE INSTRUCTION.
4. OUTPUT FORMATTING MANDATES:
   - Produce executive / university-standard formatting.
   - Do NOT use markdown heading symbols (#, ##, ###) or fill responses with hashtags or asterisks (*****).
   - Use clean UPPERCASE BOLD text for section headers on their own line with proper paragraph spacing.
   - Use clean, proper numbering, proper spacing, clear paragraphs, and clean bullet points.
   - Do NOT use emojis. Answer strictly what was requested without filler.`;
    } else if (taskType === "assignment") {
      const subject = inputs.topic && inputs.topic.trim() ? inputs.topic.trim() : "General Academic";
      const instruction = inputs.guidelines && inputs.guidelines.trim() 
        ? inputs.guidelines.trim() 
        : "Process the uploaded document or assignment according to academic standards.";
      const fileRef = inputs.fileName ? `ATTACHED FILE / DOCUMENT: ${inputs.fileName}` : "";

      prompt = `ACADEMIC SUBJECT / DISCIPLINE:
${subject}

USER INSTRUCTION (THIS DETERMINES THE TASK TO EXECUTE):
${instruction}

${fileRef}

CRITICAL PROCESSING ORDER & MANDATES FOR ASSIGNMENT HELPER:
1. FIRST: Read, analyze, and understand the uploaded file, PDF, image, photo, screenshot, or document context completely.
2. READ THE SUBJECT: Use "${subject}" strictly to provide academic context, correct formulas, terminology, and domain precision.
3. READ THE USER INSTRUCTION: Execute ONLY and EXACTLY what the user wrote in the instruction box: "${instruction}".
4. DO NOT MAKE ASSUMPTIONS, DO NOT GUESS, DO NOT IGNORE THE USER'S INSTRUCTION.
   - If user instruction says "Answer this question paper from Question 1 to Question 10": Read every question from the uploaded document, understand every question, answer every question step-by-step with complete, real academic solutions. Maintain proper question numbering (e.g. Question 1, Answer..., Question 2, Answer...). Do NOT summarize. Do NOT explain what the file contains. Answer the paper directly!
   - If user instruction says "Summarize this PDF": Provide a clean summary only. Do NOT answer questions.
   - If user instruction says "Extract all formulas": Extract formulas only.
   - If user instruction says "Translate this document into English": Translate only.
   - If user instruction says "Explain Question 4 only": Explain Question 4 only.
   - If user instruction says "Mark the mistakes inside this assignment": Identify mistakes only.
5. STICK TO USER INSTRUCTION ONLY: The uploaded document is ONLY context. The user's written instruction determines the exact task.
6. OUTPUT FORMATTING MANDATES:
   - Produce university-standard academic formatting.
   - Do NOT use markdown heading symbols (#, ##, ###) or fill responses with hashtags or asterisks (*****).
   - Use clean UPPERCASE BOLD text for section titles (e.g. **QUESTION 1**, **ANSWER**, **SOLUTIONS**) on its own line with proper spacing.
   - Use clean, proper numbering (1., 2., 3. or Question 1, Question 2), proper line spacing, clear paragraphs, and clean bullet points (* or -).
   - Do NOT use emojis or informal filler.`;
    } else {
      return res.status(400).json({ error: "Invalid task type specified" });
    }

    const basePrompt = `You are the Orbit AI Task Specialist, an executive-level, university-standard execution system. You do not engage in chat-style conversational greetings, small talk, or polite introductory filler. You deliver immediate, highly structured, executive-ready, and academically professional outcomes.

CRITICAL FORMATTING & EXECUTION MANDATES FOR ALL RESPONSES:
1. The uploaded file or document is ONLY context. The user's written instruction determines the exact task to perform.
2. Read and analyze any uploaded file, image, photo, screenshot, or PDF completely first. Then execute ONLY what the user instructed.
3. Do NOT make assumptions, guess, summarize, or describe files unless explicitly requested by the user instruction.
4. Do NOT use markdown heading symbols (#, ##, ###) or fill responses with hashtags or asterisks (*****).
5. For section titles, use clean UPPERCASE BOLD text (e.g. **QUESTION 1**, **EXECUTIVE SUMMARY**, **KEY FINDINGS**) on its own line with proper paragraph spacing.
6. Use clean bullet points (* or -) and numbered lists (1., 2., 3.) where appropriate.
7. Use professional spacing and proper paragraphs.
8. Do NOT use emojis or informal colloquialisms.
9. Match the clean, executive-ready formatting quality of university-standard academic reports, question paper solutions, and CVs.
10. Answer strictly what was requested without filler.`;
    
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

    const responseData = await fetchChatCompletion(messages, 0.5, attachments || []);

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
