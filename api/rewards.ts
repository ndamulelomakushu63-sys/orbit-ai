import { createClient } from '@supabase/supabase-js';

function getValidUrl(url: any, fallback: string): string {
  if (typeof url === 'string' && url.trim() !== '') {
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
  }
  return fallback;
}

const supabaseUrl = getValidUrl(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, "https://ptpnvrgzdnawvvxrkkid.supabase.co");
const supabaseAnonKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.dummy";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const QUIZ_QUESTION_BANK = [
  {
    id: "q-prompt-ptcfc",
    question: "According to Orbit's PTCFC prompt framework, what does the 'C' stand for?",
    options: ["Currency", "Context", "Complexity", "Compilation"],
    correctIndex: 1,
    explanation: "PTCFC stands for Persona, Task, Context, Format, and Constraints."
  },
  {
    id: "q-popia-spi",
    question: "Under South Africa's POPIA Act, which of the following is considered Special Personal Information (SPI)?",
    options: ["A company registered name", "Biometric and health data", "Work email address", "Public LinkedIn URL"],
    correctIndex: 1,
    explanation: "Under Section 26 of POPIA, biometric, health, and religious information is protected as Special Personal Information."
  },
  {
    id: "q-ats-formatting",
    question: "What is the recommended layout for Applicant Tracking System (ATS) CV compatibility?",
    options: ["Multi-column table with graphical skill meters", "Clean single-column typography with linear standard headings", "Embedded canvas graphic", "Two-column frame with floating text boxes"],
    correctIndex: 1,
    explanation: "Modern ATS parsers process single-column linear text with highest accuracy without dropped tokens."
  },
  {
    id: "q-ai-hallucination",
    question: "Why do large language models generate hallucinations or synthetic citations?",
    options: ["They query a corrupted legal database", "They are statistical next-token prediction engines, not static truth databases", "They only search social media", "They purposefully alter court numbers"],
    correctIndex: 1,
    explanation: "LLMs predict the most probable linguistic tokens based on training distributions rather than querying verified real-time records."
  },
  {
    id: "q-star-method",
    question: "In professional CV drafting, what does the STAR methodology stand for?",
    options: ["Start, Track, Act, Report", "Situation, Task, Action, Result", "Scope, Target, Analysis, Review", "Strategy, Timing, Authority, Revenue"],
    correctIndex: 1,
    explanation: "STAR (Situation, Task, Action, Result) transforms passive duty lists into measurable achievement bullets."
  },
  {
    id: "q-popia-fines",
    question: "What is the maximum statutory administrative fine under Section 107 of South Africa's POPIA for unlawful data breaches?",
    options: ["Up to R500,000", "Up to R2 million", "Up to R10 million", "Up to R50 million"],
    correctIndex: 2,
    explanation: "Under Section 107 of POPIA, administrative fines can reach up to R10 million."
  },
  {
    id: "q-whatsapp-commerce",
    question: "When automating customer replies for a small business on WhatsApp, what is a key best practice?",
    options: ["Never state prices upfront", "Standardize transparent FAQ replies covering pricing, deposit policies, and turnaround time", "Send 20-page PDF catalogs to cold inquiries", "Require phone calls for all inquiries"],
    correctIndex: 1,
    explanation: "Clear, prompt answers with verified pricing and deposit guidelines significantly increase conversion and trust."
  }
];

export default async function handler(req: any, res: any) {
  const url = req.url || '';
  const mode = (req.query.mode as string) || '';
  const isRedeem = mode === 'redeem' || url.includes('redeem');

  // DISPATCH: Orbit Pro Credit Redemption
  if (isRedeem) {
    if (req.method !== 'POST') {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { userId } = req.body || {};
    if (!userId) {
      return res.status(400).json({ error: "User ID is required." });
    }

    const PRO_REDEMPTION_COST = 100;

    try {
      const { data: balanceRecord } = await supabase
        .from('reward_balances')
        .select('*')
        .eq('user_id', userId)
        .single();

      const currentCredits = Number(balanceRecord?.total_earnings || 0);
      if (currentCredits < PRO_REDEMPTION_COST) {
        return res.status(400).json({
          error: `Insufficient Orbit Credits. You have ${currentCredits} credits, but ${PRO_REDEMPTION_COST} credits are required to redeem 1 Month of Orbit Pro.`
        });
      }

      const nextCredits = currentCredits - PRO_REDEMPTION_COST;
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      await supabase
        .from('reward_balances')
        .update({ total_earnings: nextCredits, updated_at: new Date().toISOString() })
        .eq('user_id', userId);

      await supabase
        .from('profiles')
        .update({
          plan: 'pro',
          subscription_status: 'pro_monthly',
          subscription_end: expiryDate.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      return res.json({
        success: true,
        message: "Successfully redeemed 100 Orbit Credits for 1 Month of Orbit Pro!",
        remainingCredits: nextCredits,
        plan: "pro",
        subscriptionEnd: expiryDate.toISOString()
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || "Failed to redeem credits." });
    }
  }

  // DISPATCH: Orbit Rewards Quiz System
  if (req.method === 'GET') {
    const userId = (req.query.userId as string) || (req.headers['x-user-id'] as string);
    if (!userId) {
      return res.status(400).json({ error: "User ID is required." });
    }

    const shuffled = [...QUIZ_QUESTION_BANK].sort(() => 0.5 - Math.random()).slice(0, 5);
    const sessionId = `qsess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const sanitizedQuestions = shuffled.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options
    }));

    return res.json({
      sessionId,
      questions: sanitizedQuestions,
      passThresholdPercentage: 80,
      rewardCreditsPerPass: 20
    });
  }

  if (req.method === 'POST') {
    const { userId, sessionId, answers } = req.body || {};
    if (!userId || !answers || typeof answers !== 'object') {
      return res.status(400).json({ error: "Invalid submission payload." });
    }

    let correctCount = 0;
    const questionIds = Object.keys(answers);
    const breakdown = questionIds.map(qId => {
      const questionData = QUIZ_QUESTION_BANK.find(q => q.id === qId);
      if (!questionData) return { id: qId, correct: false };

      const userAnswer = answers[qId];
      const isCorrect = userAnswer === questionData.correctIndex;
      if (isCorrect) correctCount++;

      return {
        id: qId,
        question: questionData.question,
        isCorrect,
        correctAnswer: questionData.options[questionData.correctIndex],
        explanation: questionData.explanation
      };
    });

    const totalQuestions = questionIds.length || 5;
    const scorePercentage = Math.round((correctCount / totalQuestions) * 100);
    const passed = scorePercentage >= 80;
    const creditsEarned = passed ? 20 : 0;

    return res.json({
      success: true,
      passed,
      score: correctCount,
      totalQuestions,
      scorePercentage,
      creditsEarned,
      newBalance: 20,
      breakdown,
      message: passed
        ? `Congratulations! You scored ${scorePercentage}% and earned 20 Orbit Credits.`
        : `You scored ${scorePercentage}%. 80% is required to earn credits. Review the explanations and try again!`
    });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method not allowed" });
}
