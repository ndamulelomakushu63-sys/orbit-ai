import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, Award, CheckCircle, ExternalLink, AlertCircle, Clock, 
  HelpCircle, ShieldCheck, Sparkles, RefreshCw, Lock, Zap
} from 'lucide-react';
import { useAppState } from '../services/state';
import { 
  dbFetchRewardBalance, 
  dbFetchOrbitRewardRecord,
  dbInsertAuditLog,
  supabase
} from '../services/supabase';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
}

interface QuizSubmissionResult {
  success: boolean;
  passed: boolean;
  score: number;
  totalQuestions: number;
  scorePercentage: number;
  creditsEarned: number;
  newBalance: number;
  breakdown: {
    id: string;
    question: string;
    isCorrect: boolean;
    correctAnswer: string;
    explanation: string;
  }[];
  message: string;
}

export const OrbitRewardsScreen: React.FC = () => {
  const { currentUser, setUsers, referrals, setMobileScreen } = useAppState();

  // Read verified referrals directly from state
  const myReferrals = currentUser ? referrals.filter(r => r.referrerId === currentUser.uid) : [];
  const [dbVerifiedReferralsCount, setDbVerifiedReferralsCount] = useState<number>(0);
  const [dbUnlocked, setDbUnlocked] = useState<boolean>(false);
  const [userCredits, setUserCredits] = useState<number>(0);
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(true);

  // Referral qualification (4 verified sign-ups or Pro)
  const isPro = currentUser?.plan === 'pro' || (currentUser?.subscription_status && currentUser.subscription_status.startsWith('pro'));
  const verifiedReferralsCount = Math.max(myReferrals.length, dbVerifiedReferralsCount);
  const isQualified = isPro || dbUnlocked || verifiedReferralsCount >= 4;

  // Showdown Quiz Interactive State
  const [activeQuizSessionId, setActiveQuizSessionId] = useState<string | null>(null);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, number>>({});
  const [quizLoading, setQuizLoading] = useState<boolean>(false);
  const [quizSubmitting, setQuizSubmitting] = useState<boolean>(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [quizResult, setQuizResult] = useState<QuizSubmissionResult | null>(null);

  // Pro Redemption State
  const [redeemingPro, setRedeemingPro] = useState<boolean>(false);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  // Fetch balances and qualification status
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      setLoadingMetrics(true);
      try {
        if (!currentUser) {
          if (isMounted) setLoadingMetrics(false);
          return;
        }

        // 1. Fetch Orbit Rewards record
        const orbitRecord = await dbFetchOrbitRewardRecord(currentUser.uid);
        if (orbitRecord && isMounted) {
          setDbUnlocked(orbitRecord.unlocked);
          setDbVerifiedReferralsCount(orbitRecord.verifiedReferralsCount);
        }

        // 2. Fetch reward balance
        const balRecord = await dbFetchRewardBalance(currentUser.uid);
        if (balRecord && isMounted) {
          setUserCredits(balRecord.totalEarnings || 0);
        }

        // 3. Log audit event
        await dbInsertAuditLog(currentUser.uid, 'REWARDS_SCREEN_VIEWED', {
          isQualified,
          verifiedReferralsCount
        });

      } catch (err) {
        console.warn("[Rewards Screen] Data load notice:", err);
      } finally {
        if (isMounted) setLoadingMetrics(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.uid, myReferrals.length]);

  // Start new Showdown Quiz session via server endpoint
  const handleStartQuiz = async () => {
    if (!currentUser) {
      setMobileScreen('login');
      return;
    }

    setQuizLoading(true);
    setQuizError(null);
    setQuizResult(null);
    setUserAnswers({});
    setCurrentQuestionIndex(0);

    try {
      const res = await fetch(`/api/rewards/quiz/questions?userId=${currentUser.uid}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to start quiz session.");
      }

      setActiveQuizSessionId(data.sessionId);
      setQuizQuestions(data.questions);
    } catch (err: any) {
      setQuizError(err.message || "Unable to start quiz session. Please try again later.");
    } finally {
      setQuizLoading(false);
    }
  };

  // Record an answer for current question
  const handleSelectOption = (optionIndex: number) => {
    if (!quizQuestions[currentQuestionIndex]) return;
    const qId = quizQuestions[currentQuestionIndex].id;
    setUserAnswers(prev => ({
      ...prev,
      [qId]: optionIndex
    }));
  };

  // Next Question
  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  // Previous Question
  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Submit Quiz to server for evaluation
  const handleSubmitQuiz = async () => {
    if (!currentUser || !activeQuizSessionId) return;

    setQuizSubmitting(true);
    setQuizError(null);

    try {
      const res = await fetch('/api/rewards/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.uid,
          sessionId: activeQuizSessionId,
          answers: userAnswers
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit quiz.");
      }

      setQuizResult(data);
      if (data.passed) {
        setUserCredits(data.newBalance);
      }
      setActiveQuizSessionId(null);
    } catch (err: any) {
      setQuizError(err.message || "Failed to submit quiz. Please try again.");
    } finally {
      setQuizSubmitting(false);
    }
  };

  // Cancel Quiz
  const handleCancelQuiz = () => {
    setActiveQuizSessionId(null);
    setQuizQuestions([]);
    setUserAnswers({});
    setCurrentQuestionIndex(0);
    setQuizError(null);
  };

  // Redeem Credits for Orbit Pro
  const handleRedeemPro = async () => {
    if (!currentUser) return;

    setRedeemingPro(true);
    setRedeemError(null);
    setRedeemSuccess(null);

    try {
      const res = await fetch('/api/rewards/redeem-pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.uid })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to redeem credits.");
      }

      setRedeemSuccess(data.message);
      setUserCredits(data.remainingCredits);

      // Update current user state to Pro
      setUsers(prev => prev.map(u => {
        if (u.uid === currentUser.uid) {
          return {
            ...u,
            plan: 'pro' as any,
            subscription_status: 'pro_monthly'
          };
        }
        return u;
      }));

    } catch (err: any) {
      setRedeemError(err.message || "Failed to redeem credits.");
    } finally {
      setRedeemingPro(false);
    }
  };

  const currentQ = quizQuestions[currentQuestionIndex];
  const answeredCount = Object.keys(userAnswers).length;
  const isCurrentAnswered = currentQ ? userAnswers[currentQ.id] !== undefined : false;

  return (
    <div id="orbit_rewards_screen" className="flex flex-col h-full w-full bg-white text-slate-900 overflow-hidden relative font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3.5 shrink-0 select-none">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <button 
            onClick={() => setMobileScreen("chat")} 
            className="flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900 py-1 transition-colors cursor-pointer"
            aria-label="Back to chat"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
            <span>Back to Chat</span>
          </button>

          <span className="text-sm font-bold text-slate-900 tracking-tight">Orbit Rewards &amp; Showdown</span>

          <button
            onClick={() => setMobileScreen('resources')}
            className="text-xs text-slate-600 hover:text-slate-900 font-medium py-1 px-2.5 rounded-lg border border-slate-200 transition cursor-pointer"
          >
            Guides
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 pb-28">
          
          {/* Section 1: Programme Overview */}
          <section className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
              <Award className="w-3.5 h-3.5" />
              <span>Skill-Based Educational Rewards</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Orbit Rewards &amp; Showdown Quizzes
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Earn legitimate, non-monetary <strong>Orbit Credits</strong> by demonstrating mastery of prompt engineering, POPIA compliance, and AI productivity tools. Qualified members can redeem their earned credits directly for Orbit Pro subscriptions without paying cash.
            </p>
          </section>

          <hr className="border-slate-200" />

          {/* Section 2: How the System Works */}
          <section className="space-y-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Programme Structure</span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Transparent Qualification &amp; Credit Rules
            </h2>
            
            <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
              <div className="flex items-start gap-3">
                <span className="font-bold text-slate-900 shrink-0">1.</span>
                <div>
                  <strong className="text-slate-900 font-semibold">Community Qualification:</strong>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    To prevent automated bot abuse, members must refer four verified users through their official Agent link (or hold an active Pro plan) to unlock the Showdown Quiz arena.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="font-bold text-slate-900 shrink-0">2.</span>
                <div>
                  <strong className="text-slate-900 font-semibold">Server-Evaluated Showdown Quizzes:</strong>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    Answer 5 randomized technical questions on prompt engineering, digital security, and business tools. Scores are audited on the server—an 80% passing grade (4/5) awards 20 Orbit Credits.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="font-bold text-slate-900 shrink-0">3.</span>
                <div>
                  <strong className="text-slate-900 font-semibold">Pro Subscription Redemption:</strong>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    Accumulate 100 Orbit Credits to redeem 1 Month of full Orbit Pro access. Credits are non-cash, non-transferable platform utility tokens.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="font-bold text-slate-900 shrink-0">4.</span>
                <div>
                  <strong className="text-slate-900 font-semibold">Strict Anti-Fraud Safeguards:</strong>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    Single-use session tokens, rate limits, and server-side answer verification protect against replayed requests, manipulated scorecards, and self-referral rings.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <hr className="border-slate-200" />

          {/* Section 3: Google Publisher Policy Compliance Notice */}
          <section className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-900">
              <ShieldCheck className="w-4 h-4 text-slate-800" />
              <span>Policy Transparency Notice</span>
            </div>
            <p className="leading-relaxed">
              <strong>Non-Incentivised Advertising:</strong> Orbit AI strictly complies with Google Publisher Policies. We do not award credits, money, or incentives for viewing or clicking ordinary display advertisements.
            </p>
            <p className="leading-relaxed text-slate-500">
              Web-based ad-view rewards are currently disabled pending official Google Rewarded Ad SDK integration. All platform credits are earned exclusively through legitimate community referrals and educational quizzes.
            </p>
          </section>

          <hr className="border-slate-200" />

          {/* Section 4: Member Dashboard & Qualification Meter */}
          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Member Space</span>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight mt-0.5">
                  Your Referral Status &amp; Credit Ledger
                </h2>
              </div>

              {currentUser && userCredits >= 100 && (
                <button
                  onClick={handleRedeemPro}
                  disabled={redeemingPro}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{redeemingPro ? "Redeeming..." : "Redeem 100 Credits for Pro"}</span>
                </button>
              )}
            </div>

            {redeemSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{redeemSuccess}</span>
              </div>
            )}

            {redeemError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{redeemError}</span>
              </div>
            )}

            {!currentUser ? (
              <div className="py-4 space-y-3">
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  You are currently exploring Orbit Rewards as a visitor. Please sign in or create an account to view your referral attribution link, enter Showdown Quizzes, and track your credit balance.
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => setMobileScreen('login')}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => setMobileScreen('register')}
                    className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    Create Free Account
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Metric Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-y border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block">Status</span>
                    <span className={`font-semibold ${isQualified ? "text-emerald-700" : "text-amber-700"}`}>
                      {isQualified ? "Unlocked" : "Locked (Threshold 4)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Verified Referrals</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {verifiedReferralsCount} / 4
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Orbit Credits</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {userCredits} Credits
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Pro Redemption</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {userCredits >= 100 ? "Ready (100 Needed)" : `${100 - userCredits} Needed`}
                    </span>
                  </div>
                </div>

                {/* Locked Guidance */}
                {!isQualified && (
                  <div className="space-y-2 py-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                      <Lock className="w-4 h-4 text-slate-500" />
                      <span>Unlock Showdown Quizzes</span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600">
                      You need <strong className="text-slate-900">{Math.max(0, 4 - verifiedReferralsCount)}</strong> more verified referrals to unlock the Showdown Quiz arena. Share your official Agent Program link with colleagues or friends.
                    </p>
                    <button
                      onClick={() => setMobileScreen("agent")}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition cursor-pointer"
                    >
                      <span>View My Agent Referral Link</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Unlocked Showdown Arena */}
                {isQualified && !activeQuizSessionId && !quizResult && (
                  <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-blue-600" />
                          <span>Showdown Quiz Arena</span>
                        </h3>
                        <p className="text-xs text-slate-500">
                          Pass 5 questions (80% score) to earn 20 Orbit Credits.
                        </p>
                      </div>

                      <button
                        onClick={handleStartQuiz}
                        disabled={quizLoading}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1.5"
                      >
                        {quizLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PlayIcon className="w-3.5 h-3.5" />}
                        <span>{quizLoading ? "Loading..." : "Start Showdown Quiz"}</span>
                      </button>
                    </div>

                    {quizError && (
                      <p className="text-xs text-rose-600">{quizError}</p>
                    )}
                  </div>
                )}

                {/* Active Interactive Quiz Session */}
                {activeQuizSessionId && currentQ && (
                  <div className="p-5 bg-white rounded-xl border border-slate-300 space-y-5 shadow-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">Question {currentQuestionIndex + 1} of {quizQuestions.length}</span>
                        <span className="text-slate-400">&bull;</span>
                        <span className="text-slate-500 font-mono">{answeredCount} of {quizQuestions.length} answered</span>
                      </div>
                      <button
                        onClick={handleCancelQuiz}
                        className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    {/* Question text */}
                    <div className="space-y-3">
                      <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-snug">
                        {currentQ.question}
                      </h3>

                      {/* Options */}
                      <div className="space-y-2">
                        {currentQ.options.map((opt, optIdx) => {
                          const isSelected = userAnswers[currentQ.id] === optIdx;
                          return (
                            <button
                              key={optIdx}
                              onClick={() => handleSelectOption(optIdx)}
                              className={`w-full text-left p-3 rounded-lg border text-xs sm:text-sm transition cursor-pointer flex items-center gap-3 ${
                                isSelected
                                  ? 'bg-slate-900 border-slate-900 text-white font-medium'
                                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
                              }`}
                            >
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 border ${
                                isSelected ? 'border-white text-white' : 'border-slate-300 text-slate-500'
                              }`}>
                                {String.fromCharCode(65 + optIdx)}
                              </span>
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                      <button
                        onClick={handlePrevQuestion}
                        disabled={currentQuestionIndex === 0}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-40 cursor-pointer"
                      >
                        Previous
                      </button>

                      {currentQuestionIndex < quizQuestions.length - 1 ? (
                        <button
                          onClick={handleNextQuestion}
                          disabled={!isCurrentAnswered}
                          className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-semibold disabled:opacity-40 cursor-pointer"
                        >
                          Next
                        </button>
                      ) : (
                        <button
                          onClick={handleSubmitQuiz}
                          disabled={quizSubmitting || answeredCount < quizQuestions.length}
                          className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-40 cursor-pointer flex items-center gap-1.5"
                        >
                          {quizSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                          <span>{quizSubmitting ? "Evaluating..." : "Submit for Verification"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Quiz Result View */}
                {quizResult && (
                  <div className={`p-5 rounded-xl border space-y-4 ${
                    quizResult.passed ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {quizResult.passed ? (
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-amber-600" />
                        )}
                        <h3 className="text-sm font-bold text-slate-900">
                          {quizResult.passed ? "Quiz Passed!" : "Quiz Completed - Try Again"}
                        </h3>
                      </div>

                      <span className="text-xs font-mono font-bold text-slate-800">
                        Score: {quizResult.scorePercentage}% ({quizResult.score}/{quizResult.totalQuestions})
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">
                      {quizResult.message}
                    </p>

                    {/* Answer Breakdown */}
                    <div className="space-y-3 pt-2 border-t border-slate-200/60">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                        Detailed Breakdown &amp; Explanations:
                      </span>
                      {quizResult.breakdown.map((item, idx) => (
                        <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800">Question {idx + 1}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              item.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {item.isCorrect ? "Correct" : "Incorrect"}
                            </span>
                          </div>
                          <p className="text-slate-600">{item.question}</p>
                          <p className="text-[11px] text-slate-800 font-medium pt-1">
                            Correct Answer: <span className="text-emerald-700">{item.correctAnswer}</span>
                          </p>
                          <p className="text-[11px] text-slate-500 italic">
                            Explanation: {item.explanation}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 flex items-center justify-end">
                      <button
                        onClick={() => { setQuizResult(null); }}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <hr className="border-slate-200" />

          {/* Section 5: Support & Transparency */}
          <section className="space-y-3 text-xs text-slate-600 leading-relaxed">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block">Assistance</span>
            <h2 className="text-base font-bold text-slate-900">Need Help or Questions?</h2>
            <p>
              For inquiries regarding referral qualification, quiz scoring, or Pro subscription redemption, please contact Orbit AI support at <strong className="text-slate-800 font-medium">ndamulelomakushu63@gmail.com</strong>.
            </p>
          </section>

          {/* Footer note */}
          <footer className="text-xs text-slate-400 pt-4 border-t border-slate-100 space-y-1">
            <p>&copy; 2026 Orbit AI Rewards &amp; Showdown. Governed under Orbit AI Community Terms.</p>
            <p>Non-transferable utility credits. Not redeemable for cash or legal tender.</p>
          </footer>

        </main>
      </div>
    </div>
  );
};

function PlayIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
