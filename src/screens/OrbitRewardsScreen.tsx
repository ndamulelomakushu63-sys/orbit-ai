import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, ExternalLink, AlertCircle, Clock } from '../components/Icons';
import { useAppState } from '../services/state';
import { WithdrawalRecord, WithdrawalStatus, OrbitRewardHistoryItem } from '../types';
import { 
  dbFetchRewardBalance, 
  dbUpsertRewardBalance, 
  dbFetchRewardHistory, 
  dbInsertRewardHistoryItem,
  dbUpsertWithdrawal,
  dbFetchOrbitRewardRecord,
  dbUpsertOrbitRewardRecord,
  dbFetchRewardSettings,
  dbStartAdSession,
  dbCompleteAdSession,
  dbClaimAdSession,
  dbInsertAuditLog
} from '../services/supabase';
import { getRewardedAdsService, RewardedAd } from '../services/rewardedAds';
import { GoogleAdSenseUnit } from '../components/GoogleAdSenseUnit';

export const OrbitRewardsScreen: React.FC = () => {
  const { currentUser, setUsers, referrals, withdrawals, setWithdrawals, setMobileScreen } = useAppState();

  // Read referral progress directly from state
  const myReferrals = currentUser ? referrals.filter(r => r.referrerId === currentUser.uid) : [];

  // Orbit Rewards database state
  const [dbUnlocked, setDbUnlocked] = useState<boolean>(false);
  const [dbVerifiedReferralsCount, setDbVerifiedReferralsCount] = useState<number>(0);
  const [maxDailyAds, setMaxDailyAds] = useState<number>(20);
  const [minWithdrawal, setMinWithdrawal] = useState<number>(100);

  // Determine unlock status directly from database record or referral threshold (>=4)
  const verifiedReferralsCount = Math.max(myReferrals.length, dbVerifiedReferralsCount);
  const isUnlocked = dbUnlocked || verifiedReferralsCount >= 4;

  // Rewards metrics state
  const [todayAdCount, setTodayAdCount] = useState<number>(0);
  const [monthlyEarnings, setMonthlyEarnings] = useState<number>(0);
  const [lifetimeEarnings, setLifetimeEarnings] = useState<number>(0);
  const [rewardHistory, setRewardHistory] = useState<OrbitRewardHistoryItem[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(true);
  const [activityTab, setActivityTab] = useState<'rewards' | 'withdrawals'>('rewards');

  // Ad playback modal state
  const [activeAdModal, setActiveAdModal] = useState<RewardedAd | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [adCountdown, setAdCountdown] = useState<number>(0);
  const [adTotalDuration, setAdTotalDuration] = useState<number>(0);
  const [isAdPlaying, setIsAdPlaying] = useState<boolean>(false);
  const [adCompleted, setAdCompleted] = useState<boolean>(false);
  const [adError, setAdError] = useState<string>("");
  const [claimingReward, setClaimingReward] = useState<boolean>(false);

  // Withdrawal modal state
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
  const [withdrawFullName, setWithdrawFullName] = useState<string>(currentUser?.name || "");
  const [withdrawBankName, setWithdrawBankName] = useState<string>("Capitec Bank");
  const [withdrawAccountNumber, setWithdrawAccountNumber] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("100");
  const [withdrawBranchCode, setWithdrawBranchCode] = useState<string>("");
  const [withdrawAccountType, setWithdrawAccountType] = useState<string>("Savings");
  const [withdrawError, setWithdrawError] = useState<string>("");
  const [withdrawSuccess, setWithdrawSuccess] = useState<string>("");
  const [withdrawLoading, setWithdrawLoading] = useState<boolean>(false);

  // Load Reward history, settings & balances from Supabase
  useEffect(() => {
    let isMounted = true;

    const loadRewardsData = async () => {
      setLoadingMetrics(true);
      try {
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Fetch settings from reward_settings table
        const settings = await dbFetchRewardSettings();
        if (settings && isMounted) {
          setMaxDailyAds(settings.maxDailyAds || 20);
          setMinWithdrawal(settings.minWithdrawal || 100);
        }

        if (!currentUser) {
          if (isMounted) setLoadingMetrics(false);
          return;
        }

        // 2. Fetch Orbit Rewards record from orbit_rewards table in Supabase
        const orbitRecord = await dbFetchOrbitRewardRecord(currentUser.uid);
        if (orbitRecord && isMounted) {
          setDbUnlocked(orbitRecord.unlocked);
          setDbVerifiedReferralsCount(orbitRecord.verifiedReferralsCount);
        }

        // 3. Fetch balance record from reward_balances table in Supabase
        const balRecord = await dbFetchRewardBalance(currentUser.uid);
        if (balRecord && isMounted) {
          if (balRecord.lastAdDate !== todayStr) {
            setTodayAdCount(0);
          } else {
            setTodayAdCount(balRecord.todayAdCount || 0);
          }
          setMonthlyEarnings(balRecord.monthlyEarnings || 0);
          setLifetimeEarnings(balRecord.totalEarnings || currentUser.balance || 0);
        } else if (isMounted) {
          setLifetimeEarnings(currentUser.balance || 0);
        }

        // 4. Fetch history from reward_history table in Supabase
        const historyData = await dbFetchRewardHistory(currentUser.uid);
        if (historyData && isMounted) {
          setRewardHistory(historyData);
          const now = new Date();
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();

          const thisMonthItems = historyData.filter(item => {
            const d = new Date(item.timestamp);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
          });
          const monthSum = thisMonthItems.reduce((acc, curr) => acc + curr.rewardAmount, 0);
          setMonthlyEarnings(monthSum);
        }

        // 5. Audit event: screen viewed
        await dbInsertAuditLog(currentUser.uid, 'ORBIT_REWARDS_VIEWED', {
          unlocked: orbitRecord?.unlocked || verifiedReferralsCount >= 4,
          verifiedReferralsCount
        });

      } catch (err) {
        console.warn("Error loading reward metrics from Supabase:", err);
      } finally {
        if (isMounted) setLoadingMetrics(false);
      }
    };

    loadRewardsData();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.uid, myReferrals.length]);

  // Start watching advert
  const handleWatchAdClick = async (ad: RewardedAd) => {
    if (!currentUser) return;

    if (todayAdCount >= maxDailyAds) {
      alert(`Daily limit reached (${maxDailyAds}/${maxDailyAds}). Please return tomorrow to participate in more sessions.`);
      return;
    }

    const sessionId = await dbStartAdSession(currentUser.uid, ad.id);
    setActiveSessionId(sessionId);

    await dbInsertAuditLog(currentUser.uid, 'AD_WATCH_STARTED', {
      adId: ad.id,
      adTitle: ad.title,
      sessionId
    });

    setActiveAdModal(ad);
    setAdError("");
    setAdCompleted(false);
    setIsAdPlaying(true);
    setAdTotalDuration(ad.durationSeconds);
    setAdCountdown(ad.durationSeconds);
  };

  // Timer countdown for ad modal
  useEffect(() => {
    if (!isAdPlaying || adCountdown <= 0) {
      if (isAdPlaying && adCountdown <= 0) {
        setIsAdPlaying(false);
        setAdCompleted(true);
        if (currentUser && activeSessionId) {
          dbCompleteAdSession(activeSessionId);
        }
      }
      return;
    }

    const timer = setInterval(() => {
      setAdCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isAdPlaying, adCountdown, currentUser, activeSessionId]);

  // Claim verified reward
  const handleClaimReward = async () => {
    if (!currentUser || !activeAdModal || claimingReward) return;

    try {
      setClaimingReward(true);
      const rewardVal = activeAdModal.rewardEst;
      const todayStr = new Date().toISOString().split('T')[0];

      if (activeSessionId) {
        await dbClaimAdSession(activeSessionId, rewardVal);
      }

      const nextBalance = (currentUser.balance || 0) + rewardVal;
      const nextTotalEarnings = lifetimeEarnings + rewardVal;
      const nextMonthlyEarnings = monthlyEarnings + rewardVal;
      const nextTodayCount = todayAdCount + 1;

      await dbUpsertRewardBalance({
        userId: currentUser.uid,
        totalEarnings: nextTotalEarnings,
        pendingEarnings: 0,
        monthlyEarnings: nextMonthlyEarnings,
        todayAdCount: nextTodayCount,
        lastAdDate: todayStr
      });

      const newHistoryItem: OrbitRewardHistoryItem = {
        id: `rwd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: currentUser.uid,
        adId: activeAdModal.id,
        adTitle: activeAdModal.title,
        rewardAmount: rewardVal,
        timestamp: new Date().toISOString()
      };

      await dbInsertRewardHistoryItem(newHistoryItem);

      await dbInsertAuditLog(currentUser.uid, 'AD_REWARD_CLAIMED', {
        adId: activeAdModal.id,
        rewardAmount: rewardVal,
        newBalance: nextBalance
      });

      setUsers(prev => prev.map(u => u.uid === currentUser.uid ? { ...u, balance: nextBalance } : u));
      setLifetimeEarnings(nextTotalEarnings);
      setMonthlyEarnings(nextMonthlyEarnings);
      setTodayAdCount(nextTodayCount);
      setRewardHistory(prev => [newHistoryItem, ...prev]);

      setActiveAdModal(null);
      setActiveSessionId(null);
      setAdCompleted(false);

    } catch (err: any) {
      console.error("Error claiming reward:", err);
      setAdError("Failed to claim reward. Please try again.");
    } finally {
      setClaimingReward(false);
    }
  };

  const handleCloseAdModal = () => {
    setActiveAdModal(null);
    setActiveSessionId(null);
    setIsAdPlaying(false);
    setAdCompleted(false);
    setAdError("");
  };

  // Handle withdrawal submission
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setWithdrawError("");
    setWithdrawSuccess("");

    const value = parseFloat(withdrawAmount);
    if (isNaN(value) || value < minWithdrawal) {
      setWithdrawError(`Minimum withdrawal amount is R${minWithdrawal.toFixed(2)}.`);
      return;
    }

    if ((currentUser.balance || 0) < value) {
      setWithdrawError(`Insufficient funds. Your current balance is R${(currentUser.balance || 0).toFixed(2)}.`);
      return;
    }

    if (!withdrawAccountNumber.trim() || withdrawAccountNumber.length < 6) {
      setWithdrawError("Please enter a valid South African bank account number.");
      return;
    }

    if (!withdrawFullName.trim()) {
      setWithdrawError("Please enter the full account holder name.");
      return;
    }

    try {
      setWithdrawLoading(true);
      const reqId = `WTH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const newRecord: WithdrawalRecord = {
        id: reqId,
        userId: currentUser.uid,
        userName: withdrawFullName.trim(),
        amount: value,
        bankName: withdrawBankName,
        accountNumber: withdrawAccountNumber.trim(),
        branchCode: withdrawBranchCode.trim() || undefined,
        accountType: withdrawAccountType,
        status: WithdrawalStatus.PENDING,
        timestamp: new Date().toISOString()
      };

      await dbUpsertWithdrawal(newRecord);

      const nextBalance = (currentUser.balance || 0) - value;
      await dbUpsertRewardBalance({
        userId: currentUser.uid,
        totalEarnings: lifetimeEarnings,
        pendingEarnings: value,
        monthlyEarnings: monthlyEarnings,
        todayAdCount: todayAdCount,
        lastAdDate: new Date().toISOString().split('T')[0]
      });

      await dbInsertAuditLog(currentUser.uid, 'WITHDRAWAL_REQUESTED', {
        amount: value,
        bankName: withdrawBankName,
        requestId: reqId
      });

      setWithdrawals(prev => [newRecord, ...prev]);
      setUsers(prev => prev.map(u => u.uid === currentUser.uid ? { ...u, balance: nextBalance } : u));

      setWithdrawSuccess(`Withdrawal request of R${value.toFixed(2)} submitted successfully.`);
      setWithdrawAmount("100");
      setTimeout(() => {
        setShowWithdrawModal(false);
        setWithdrawSuccess("");
      }, 2000);

    } catch (err: any) {
      console.error("Withdrawal error:", err);
      setWithdrawError(err.message || "Failed to submit withdrawal request.");
    } finally {
      setWithdrawLoading(false);
    }
  };

  const userWithdrawals = currentUser ? withdrawals.filter(w => w.userId === currentUser.uid) : [];

  return (
    <div id="orbit_rewards_screen" className="flex flex-col h-full w-full bg-white text-slate-900 overflow-hidden relative font-sans">
      {/* Clean Top Header */}
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

          <span className="text-sm font-bold text-slate-900 tracking-tight">Orbit Rewards</span>

          <button
            onClick={() => setMobileScreen('about')}
            className="text-xs text-slate-500 hover:text-slate-800 transition cursor-pointer"
          >
            About
          </button>
        </div>
      </header>

      {/* Main Content Area - Clean, Mature, Minimal Interface */}
      <div 
        className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <main id="orbit-rewards-publisher-content" className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8 pb-24">
          
          {/* Section 1: Programme Overview */}
          <section className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Programme Overview</span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Orbit Rewards Programme &amp; Payout Information
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Orbit Rewards is an engagement programme integrated directly into Orbit AI. Through verified sponsor campaigns and commercial partnerships, eligible South African participants can interact with verified brand sessions and accumulate rewards denominated in South African Rand (ZAR). Earnings are recorded in real time and can be paid out directly to verified South African bank accounts via EFT.
            </p>
          </section>

          <hr className="border-slate-200" />

          {/* Section 2: How the Programme Works */}
          <section className="space-y-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">How It Works</span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Participation &amp; Verification Steps
            </h2>
            
            <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
              <div className="flex items-start gap-3">
                <span className="font-bold text-slate-900 shrink-0">1.</span>
                <div>
                  <strong className="text-slate-900 font-semibold">Account Registration &amp; Qualification:</strong>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    Any registered Orbit AI member can view programme guidelines. To activate daily rewarded ad sessions, users must qualify by either referring four verified users through their official Agent link or upgrading to Orbit Pro.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="font-bold text-slate-900 shrink-0">2.</span>
                <div>
                  <strong className="text-slate-900 font-semibold">Verified Sponsor Sessions:</strong>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    Once unlocked, members can view available sponsor adverts. Each session runs for a fixed duration (typically 15 to 30 seconds) and requires full completion before credit is issued.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="font-bold text-slate-900 shrink-0">3.</span>
                <div>
                  <strong className="text-slate-900 font-semibold">Real-Time ZAR Balance Accrual:</strong>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    Upon completion of an ad session, the reward value is audited and credited directly to the member's wallet balance in South African Rand.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="font-bold text-slate-900 shrink-0">4.</span>
                <div>
                  <strong className="text-slate-900 font-semibold">Direct EFT Bank Payouts:</strong>
                  <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                    When your wallet balance reaches the minimum threshold of R100.00, you can submit a payout request. Payouts are transferred directly via EFT to your nominated South African bank account.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <hr className="border-slate-200" />

          {/* Section 3: Rules, Limits & Conditions */}
          <section className="space-y-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Terms &amp; Limits</span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Programme Rules &amp; Transparent Limits
            </h2>

            <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 list-disc pl-5 leading-relaxed">
              <li>
                <strong className="text-slate-900">Daily Session Limit:</strong> A standard cap of 20 completed sessions per 24-hour cycle is enforced to maintain fair usage and protect partner campaigns.
              </li>
              <li>
                <strong className="text-slate-900">Minimum Withdrawal Threshold:</strong> Payouts can be requested once your balance reaches a minimum of R100.00.
              </li>
              <li>
                <strong className="text-slate-900">Supported South African Banks:</strong> Capitec, First National Bank (FNB), Standard Bank, Absa, Nedbank, TymeBank, Discovery Bank, and Bank Zero.
              </li>
              <li>
                <strong className="text-slate-900">Processing Timeline:</strong> Withdrawal requests undergo routine security and account checks, with EFT transfers typically cleared within 24 to 48 business hours.
              </li>
              <li>
                <strong className="text-slate-900">Fraud Prevention &amp; Integrity:</strong> Automated scripts, bots, click farms, and proxy manipulation are strictly prohibited. Violating accounts are permanently suspended and accrued balances are forfeited.
              </li>
              <li>
                <strong className="text-slate-900">Non-Incentivised Ad Policy:</strong> Orbit AI complies strictly with Google Publisher Policies. Google AdSense advertisements shown on this site are independent editorial displays. We never offer rewards, compensation, or incentives for viewing or clicking Google-served advertisements.
              </li>
            </ul>
          </section>

          <hr className="border-slate-200" />

          {/* Section 4: Policy-Compliant Google AdSense Advertisement Area */}
          {/* Reserved, clearly defined, appropriately spaced area isolated from action buttons */}
          <section className="space-y-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sponsored Notice</span>
            <p className="text-xs text-slate-500 leading-relaxed">
              The display space below supports Orbit AI's platform infrastructure. Advertisements are provided through verified publisher networks and do not confer rewards or incentives.
            </p>

            <GoogleAdSenseUnit 
              hasContentReady={!loadingMetrics} 
              isModalActive={Boolean(activeAdModal || showWithdrawModal)} 
            />
          </section>

          <hr className="border-slate-200" />

          {/* Section 5: Member Dashboard & Activity */}
          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Member Space</span>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight mt-0.5">
                  Your Programme Status &amp; Wallet
                </h2>
              </div>

              {currentUser && isUnlocked && (
                <button
                  type="button"
                  onClick={() => {
                    setWithdrawError("");
                    setWithdrawSuccess("");
                    setShowWithdrawModal(true);
                  }}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Request Payout
                </button>
              )}
            </div>

            {!currentUser ? (
              <div className="py-4 space-y-3">
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  You are currently viewing Orbit Rewards as a guest. To view your personal referral count, participate in sponsor sessions, and request bank payouts, please sign in or register for a free account.
                </p>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setMobileScreen('login')}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setMobileScreen('register')}
                    className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    Create Free Account
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Minimal Metrics Table / Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-y border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 block">Status</span>
                    <span className="font-semibold text-slate-900">
                      {isUnlocked ? "Unlocked" : "Locked (Threshold 4)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Verified Referrals</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {verifiedReferralsCount} / 4
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Today's Sessions</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {todayAdCount} / {maxDailyAds}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Wallet Balance</span>
                    <span className="font-bold text-slate-900 font-mono">
                      R {(currentUser?.balance || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Locked guidance */}
                {!isUnlocked && (
                  <div className="space-y-2 py-2">
                    <p className="text-xs sm:text-sm text-slate-600">
                      Your rewards account is currently locked. You have <strong className="text-slate-900 font-semibold">{verifiedReferralsCount}</strong> of <strong className="text-slate-900 font-semibold">4</strong> required verified referrals. Share your link via the Agent Program to unlock rewarded sessions.
                    </p>
                    <button
                      type="button"
                      onClick={() => setMobileScreen("agent")}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition cursor-pointer"
                    >
                      <span>Go to Agent Program Link</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Unlocked sponsor sessions */}
                {isUnlocked && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900">Available Sponsor Sessions</h3>
                      <span className="text-xs text-slate-500 font-mono">
                        {Math.max(0, maxDailyAds - todayAdCount)} remaining today
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {getRewardedAdsService().getAvailableAds().map(ad => {
                        const isDisabled = todayAdCount >= maxDailyAds;
                        return (
                          <div key={ad.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900">{ad.title}</span>
                                <span className="text-[10px] text-slate-500">({ad.category})</span>
                              </div>
                              <p className="text-xs text-slate-500">{ad.description}</p>
                              <span className="text-[10px] text-slate-400 block">
                                Sponsor: {ad.sponsor} &bull; Duration: {ad.durationSeconds}s
                              </span>
                            </div>

                            <div className="flex items-center gap-4 shrink-0 self-start sm:self-center">
                              <span className="text-xs font-bold text-slate-900 font-mono">
                                +R {ad.rewardEst.toFixed(2)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleWatchAdClick(ad)}
                                disabled={isDisabled}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                                  isDisabled
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                                }`}
                              >
                                {isDisabled ? 'Daily Cap Reached' : 'Start Session'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Activity History Tabs */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-3 border-b border-slate-200 pb-2">
                    <button
                      type="button"
                      onClick={() => setActivityTab('rewards')}
                      className={`text-xs font-semibold pb-1 transition cursor-pointer ${
                        activityTab === 'rewards'
                          ? 'text-slate-900 border-b-2 border-slate-900'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Session History ({rewardHistory.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivityTab('withdrawals')}
                      className={`text-xs font-semibold pb-1 transition cursor-pointer ${
                        activityTab === 'withdrawals'
                          ? 'text-slate-900 border-b-2 border-slate-900'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Withdrawals ({userWithdrawals.length})
                    </button>
                  </div>

                  {activityTab === 'rewards' && (
                    <div>
                      {rewardHistory.length === 0 ? (
                        <p className="text-xs text-slate-400 py-3">No completed sessions logged yet.</p>
                      ) : (
                        <div className="divide-y divide-slate-100 text-xs">
                          {rewardHistory.slice(0, 10).map(item => (
                            <div key={item.id} className="py-2.5 flex items-center justify-between">
                              <div>
                                <span className="font-medium text-slate-800 block">{item.adTitle}</span>
                                <span className="text-[10px] text-slate-400">{new Date(item.timestamp).toLocaleString()}</span>
                              </div>
                              <span className="font-semibold text-slate-900 font-mono">+R {item.rewardAmount.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {activityTab === 'withdrawals' && (
                    <div>
                      {userWithdrawals.length === 0 ? (
                        <p className="text-xs text-slate-400 py-3">No withdrawal requests submitted yet.</p>
                      ) : (
                        <div className="divide-y divide-slate-100 text-xs">
                          {userWithdrawals.map(w => (
                            <div key={w.id} className="py-2.5 flex items-center justify-between">
                              <div>
                                <span className="font-medium text-slate-800 block">
                                  R {w.amount.toFixed(2)} &bull; {w.bankName}
                                </span>
                                <span className="text-[10px] text-slate-400">{new Date(w.timestamp).toLocaleDateString()}</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                w.status === WithdrawalStatus.PAID
                                  ? 'bg-slate-100 text-slate-800'
                                  : w.status === WithdrawalStatus.APPROVED
                                  ? 'bg-slate-100 text-slate-800'
                                  : w.status === WithdrawalStatus.REJECTED
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}>
                                {w.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          <hr className="border-slate-200" />

          {/* Section 6: Help, Support & Transparency */}
          <section className="space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Assistance</span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Support &amp; Inquiries
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              If you experience any issues with referral attribution, session tracking, or bank transfer processing, our support team is available to assist you.
            </p>
            <div className="pt-1 text-xs text-slate-500 space-y-1">
              <div><strong className="text-slate-700">Official Support:</strong> ndamulelomakushu63@gmail.com</div>
              <div><strong className="text-slate-700">Platform:</strong> Orbit AI (orbitai.co.za)</div>
              <div><strong className="text-slate-700">Jurisdiction:</strong> Republic of South Africa</div>
            </div>
          </section>

          {/* Footer note */}
          <footer className="text-xs text-slate-400 pt-4 border-t border-slate-100 space-y-1">
            <p>&copy; 2026 Orbit AI Rewards Programme. All rights reserved.</p>
            <p>Governed in compliance with POPIA and South African banking standards.</p>
          </footer>

        </main>
      </div>

      {/* Modal: Partner Session Player Modal (Clean & minimal) */}
      {activeAdModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Partner Session</span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">{activeAdModal.title}</h3>
              </div>
              <span className="text-xs text-slate-400">{activeAdModal.sponsor}</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {activeAdModal.description}
            </p>

            <div className="flex items-center justify-between text-xs py-2 border-y border-slate-100">
              <span className="text-slate-500">Reward value: <strong className="text-slate-900 font-mono">+R {activeAdModal.rewardEst.toFixed(2)}</strong></span>
              <span className="text-slate-500 flex items-center gap-1 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{adCountdown}s remaining</span>
              </span>
            </div>

            {/* Verification status */}
            <div className="space-y-1">
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-slate-900 rounded-full transition-all duration-300"
                  style={{ width: adCompleted ? '100%' : `${((adTotalDuration - adCountdown) / adTotalDuration) * 100}%` }}
                />
              </div>
            </div>

            {adCompleted ? (
              <button
                type="button"
                onClick={handleClaimReward}
                disabled={claimingReward}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{claimingReward ? "Crediting..." : `Claim R${activeAdModal.rewardEst.toFixed(2)} Credit`}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCloseAdModal}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition cursor-pointer"
              >
                Cancel Session
              </button>
            )}

            {adError && (
              <p className="text-xs text-rose-600 text-center">{adError}</p>
            )}
          </div>
        </div>
      )}

      {/* Modal: Withdrawal Request Form (Clean & minimal) */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">EFT Payout</span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">Request Bank Withdrawal</h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Enter your South African banking details below. Minimum payout threshold is <strong className="text-slate-900 font-semibold">R100.00</strong>.
            </p>

            {withdrawError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{withdrawError}</span>
              </div>
            )}

            {withdrawSuccess && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{withdrawSuccess}</span>
              </div>
            )}

            <form onSubmit={handleWithdrawSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input 
                  type="text"
                  value={withdrawFullName}
                  onChange={e => setWithdrawFullName(e.target.value)}
                  placeholder="e.g. Sipho Khumalo"
                  required
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
                <select 
                  value={withdrawBankName}
                  onChange={e => setWithdrawBankName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-slate-800"
                >
                  <option value="Capitec Bank">Capitec Bank</option>
                  <option value="First National Bank (FNB)">First National Bank (FNB)</option>
                  <option value="Standard Bank">Standard Bank</option>
                  <option value="Absa Bank">Absa Bank</option>
                  <option value="Nedbank">Nedbank</option>
                  <option value="TymeBank">TymeBank</option>
                  <option value="Discovery Bank">Discovery Bank</option>
                  <option value="Bank Zero">Bank Zero</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account Number</label>
                  <input 
                    type="text"
                    value={withdrawAccountNumber}
                    onChange={e => setWithdrawAccountNumber(e.target.value)}
                    placeholder="123456789"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account Type</label>
                  <select 
                    value={withdrawAccountType}
                    onChange={e => setWithdrawAccountType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-slate-800"
                  >
                    <option value="Savings">Savings</option>
                    <option value="Cheque">Cheque / Current</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Code (Optional)</label>
                  <input 
                    type="text"
                    value={withdrawBranchCode}
                    onChange={e => setWithdrawBranchCode(e.target.value)}
                    placeholder="e.g. 250655"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-slate-800 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (ZAR)</label>
                  <input 
                    type="number"
                    value={withdrawAmount}
                    onChange={e => setWithdrawAmount(e.target.value)}
                    placeholder="100"
                    min="100"
                    required
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none focus:border-slate-800 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={withdrawLoading}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  {withdrawLoading ? "Submitting..." : "Submit Withdrawal Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
