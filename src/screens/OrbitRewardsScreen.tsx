import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, TextInput } from '../components/ReactNativeShim';
import { 
  ArrowLeft, Award, Play, CheckCircle, DollarSign, 
  AlertCircle, Lock, ShieldCheck, RefreshCw, Send, HelpCircle, Users, Clock, ExternalLink
} from '../components/Icons';
import { useAppState } from '../services/state';
import { WithdrawalRecord, WithdrawalStatus, OrbitRewardHistoryItem, OrbitRewardBalance } from '../types';
import { 
  supabase, 
  dbFetchRewardBalance, 
  dbUpsertRewardBalance, 
  dbFetchRewardHistory, 
  dbInsertRewardHistoryItem,
  dbUpsertWithdrawal,
  dbUpsertOrbitRewardRecord
} from '../services/supabase';
import { getRewardedAdsService, RewardedAd, AdWatchResult } from '../services/rewardedAds';

const MIN_WITHDRAWAL_AMOUNT = 100;
const MAX_DAILY_ADS = 20;

export const OrbitRewardsScreen: React.FC = () => {
  const { currentUser, setUsers, referrals, withdrawals, setWithdrawals, setMobileScreen } = useAppState();

  // Read referral progress directly from existing Agent Referral database (no duplicate links)
  const myReferrals = currentUser ? referrals.filter(r => r.referrerId === currentUser.uid) : [];
  const verifiedReferralsCount = myReferrals.length;
  const isUnlocked = verifiedReferralsCount >= 4;

  // Rewards metrics state
  const [todayAdCount, setTodayAdCount] = useState<number>(0);
  const [monthlyEarnings, setMonthlyEarnings] = useState<number>(0);
  const [lifetimeEarnings, setLifetimeEarnings] = useState<number>(0);
  const [rewardHistory, setRewardHistory] = useState<OrbitRewardHistoryItem[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(true);

  // Ad playback modal state
  const [activeAdModal, setActiveAdModal] = useState<RewardedAd | null>(null);
  const [adCountdown, setAdCountdown] = useState<number>(0);
  const [adTotalDuration, setAdTotalDuration] = useState<number>(0);
  const [isAdPlaying, setIsAdPlaying] = useState<boolean>(false);
  const [adCompleted, setAdCompleted] = useState<boolean>(false);
  const [adError, setAdError] = useState<string>("");
  const [claimingReward, setClaimingReward] = useState<boolean>(false);
  const [cancelAdFn, setCancelAdFn] = useState<(() => void) | null>(null);

  // Withdrawal modal state
  const [showWithdrawModal, setShowWithdrawModal] = useState<boolean>(false);
  const [withdrawFullName, setWithdrawFullName] = useState<string>(currentUser?.name || "");
  const [withdrawBankName, setWithdrawBankName] = useState<string>("Capitec Bank");
  const [withdrawAccountNumber, setWithdrawAccountNumber] = useState<string>("");
  const [withdrawAccountHolder, setWithdrawAccountHolder] = useState<string>(currentUser?.name || "");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("100");
  const [withdrawBranchCode, setWithdrawBranchCode] = useState<string>("");
  const [withdrawAccountType, setWithdrawAccountType] = useState<string>("Savings");
  const [withdrawError, setWithdrawError] = useState<string>("");
  const [withdrawSuccess, setWithdrawSuccess] = useState<string>("");
  const [withdrawLoading, setWithdrawLoading] = useState<boolean>(false);

  // Load Reward history & balances from Supabase
  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;

    const loadRewardsData = async () => {
      setLoadingMetrics(true);
      try {
        const todayStr = new Date().toISOString().split('T')[0];

        // 1. Fetch balance record
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

        // 2. Fetch history
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

        // 3. Upsert record for orbit_rewards status table
        await dbUpsertOrbitRewardRecord({
          id: `orb-rew-${currentUser.uid}`,
          userId: currentUser.uid,
          unlocked: verifiedReferralsCount >= 4,
          verifiedReferralsCount
        });

      } catch (err) {
        console.warn("Error loading reward metrics:", err);
      } finally {
        if (isMounted) setLoadingMetrics(false);
      }
    };

    loadRewardsData();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.uid, verifiedReferralsCount]);

  // Start watching advert
  const handleWatchAdClick = (ad: RewardedAd) => {
    if (todayAdCount >= MAX_DAILY_ADS) {
      alert(`Daily limit reached (${MAX_DAILY_ADS}/${MAX_DAILY_ADS}). Please return tomorrow to watch more rewarded ads.`);
      return;
    }

    setActiveAdModal(ad);
    setAdError("");
    setAdCompleted(false);
    setIsAdPlaying(true);
    setAdTotalDuration(ad.durationSeconds);
    setAdCountdown(ad.durationSeconds);

    const adsService = getRewardedAdsService();
    const cancel = adsService.showRewardedAd(
      ad,
      (remaining, total) => {
        setAdCountdown(remaining);
        setAdTotalDuration(total);
      },
      (result: AdWatchResult) => {
        setAdCompleted(true);
        setIsAdPlaying(false);
      },
      (errorMsg: string) => {
        setAdError(errorMsg);
        setIsAdPlaying(false);
      }
    );

    setCancelAdFn(() => cancel);
  };

  // Claim verified reward
  const handleClaimReward = async () => {
    if (!currentUser || !activeAdModal || claimingReward) return;

    setClaimingReward(true);
    try {
      const rewardVal = activeAdModal.rewardEst;
      const todayStr = new Date().toISOString().split('T')[0];
      const newTodayCount = todayAdCount + 1;
      const newMonthly = monthlyEarnings + rewardVal;
      const newLifetime = lifetimeEarnings + rewardVal;
      const newBalance = (currentUser.balance || 0) + rewardVal;

      // 1. Create history item
      const historyItem: OrbitRewardHistoryItem = {
        id: `rew-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        userId: currentUser.uid,
        adId: activeAdModal.id,
        adTitle: activeAdModal.title,
        rewardAmount: rewardVal,
        status: 'verified',
        timestamp: new Date().toISOString()
      };

      // 2. Local state update
      setTodayAdCount(newTodayCount);
      setMonthlyEarnings(newMonthly);
      setLifetimeEarnings(newLifetime);
      setRewardHistory(prev => [historyItem, ...prev]);

      setUsers(prev => prev.map(u => u.uid === currentUser.uid ? { ...u, balance: newBalance } : u));

      // 3. Supabase update
      await dbInsertRewardHistoryItem(historyItem);
      await dbUpsertRewardBalance({
        userId: currentUser.uid,
        totalEarnings: newLifetime,
        monthlyEarnings: newMonthly,
        todayAdCount: newTodayCount,
        lastAdDate: todayStr
      });

      await supabase
        .from('profiles')
        .update({ balance: newBalance })
        .eq('id', currentUser.uid);

      // Close modal
      setActiveAdModal(null);
      setAdCompleted(false);
      alert(`Success! You earned R${rewardVal.toFixed(2)} from ${activeAdModal.title}.`);
    } catch (err: any) {
      console.error("Error claiming reward:", err);
      alert("Reward claim failed: " + (err.message || String(err)));
    } finally {
      setClaimingReward(false);
    }
  };

  const handleCloseAdModal = () => {
    if (isAdPlaying && cancelAdFn) {
      if (!confirm("Are you sure you want to close? Your reward will be forfeited if closed before advert completion.")) {
        return;
      }
      cancelAdFn();
    }
    setActiveAdModal(null);
    setIsAdPlaying(false);
    setAdCompleted(false);
    setAdError("");
  };

  // Withdrawal Submission
  const handleWithdrawSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;

    if (
      !withdrawFullName.trim() ||
      !withdrawBankName.trim() ||
      !withdrawAccountNumber.trim() ||
      !withdrawAccountHolder.trim() ||
      !withdrawAmount.trim()
    ) {
      setWithdrawError("Please complete all banking details required for payout.");
      setWithdrawSuccess("");
      return;
    }

    const value = parseFloat(withdrawAmount);
    if (isNaN(value) || value < MIN_WITHDRAWAL_AMOUNT) {
      setWithdrawError(`Minimum withdrawal amount is R${MIN_WITHDRAWAL_AMOUNT}.00`);
      setWithdrawSuccess("");
      return;
    }

    if (value > (currentUser.balance || 0)) {
      setWithdrawError(`Requested amount exceeds your available balance of R${(currentUser.balance || 0).toFixed(2)}.`);
      setWithdrawSuccess("");
      return;
    }

    setWithdrawError("");
    setWithdrawSuccess("");
    setWithdrawLoading(true);

    try {
      // 1. Verify fresh balance from Supabase
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', currentUser.uid)
        .single();

      if (profileErr) {
        throw new Error(`Failed to verify wallet balance: ${profileErr.message}`);
      }

      const freshBalance = Number(profile?.balance || 0);
      if (value > freshBalance) {
        setWithdrawError(`Requested amount exceeds your wallet balance of R${freshBalance.toFixed(2)}.`);
        setWithdrawLoading(false);
        return;
      }

      // 2. Check for duplicate pending requests
      const { data: existingPending } = await supabase
        .from('withdrawal_requests')
        .select('id, status')
        .eq('user_id', currentUser.uid)
        .in('status', ['Pending', 'Approved']);

      if (existingPending && existingPending.length > 0) {
        setWithdrawError("You already have an active withdrawal request being processed.");
        setWithdrawLoading(false);
        return;
      }

      // 3. Create request record
      const reqId = `with-${Date.now()}`;
      const nowIso = new Date().toISOString();

      const newRecord: WithdrawalRecord = {
        id: reqId,
        userId: currentUser.uid,
        userName: currentUser.name,
        userEmail: currentUser.email,
        fullName: withdrawFullName,
        bankName: withdrawBankName,
        accountNumber: withdrawAccountNumber,
        accountHolder: withdrawAccountHolder,
        branchCode: withdrawBranchCode,
        accountType: withdrawAccountType,
        amount: value,
        status: WithdrawalStatus.PENDING,
        timestamp: nowIso
      };

      // 4. Upsert withdrawal request to Supabase
      await dbUpsertWithdrawal(newRecord);

      // 5. Update profile balance in Supabase
      const nextBalance = Math.max(0, freshBalance - value);
      await supabase
        .from('profiles')
        .update({ balance: nextBalance })
        .eq('id', currentUser.uid);

      // 6. Update local state
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
    <SafeAreaView className="flex-1 bg-slate-50 relative">
      {/* PROFESSIONAL TOP HEADER */}
      <View className="h-14 bg-white border-b border-slate-200 px-4 flex flex-row items-center justify-between shadow-2xs select-none">
        <TouchableOpacity 
          onClick={() => setMobileScreen("chat")} 
          className="flex flex-row items-center gap-2 py-1 px-2 -ml-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-slate-700" />
          <Text className="text-sm font-medium text-slate-700">Back</Text>
        </TouchableOpacity>

        <View className="flex flex-row items-center gap-2">
          <View className="w-2 h-2 rounded-full bg-blue-600" />
          <Text className="text-base font-semibold text-slate-900 tracking-tight">Orbit Rewards</Text>
        </View>

        <View className="w-12" />
      </View>

      <ScrollView className="flex-1 px-4 py-5 max-w-3xl mx-auto w-full space-y-5">

        {/* ============================================================ */}
        {/* 1. LOCKED STATE ( < 4 VERIFIED AGENT REFERRALS )             */}
        {/* ============================================================ */}
        {!isUnlocked && (
          <View className="space-y-4">
            
            {/* LOCKED MAIN CARD */}
            <View className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
              
              <View className="flex flex-row items-start gap-4">
                <View className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                  <Lock className="w-6 h-6 text-slate-600" />
                </View>
                <View className="space-y-1 flex-1">
                  <Text className="text-lg font-bold text-slate-900">Orbit Rewards Locked</Text>
                  <Text className="text-xs text-slate-600 leading-relaxed">
                    Requirement: Refer 4 verified users using your existing Agent Referral link.
                  </Text>
                </View>
              </View>

              {/* PROGRESS COUNTER & BAR */}
              <View className="space-y-2 pt-1 border-t border-slate-100">
                <View className="flex flex-row justify-between items-center text-xs">
                  <Text className="font-medium text-slate-600">Progress</Text>
                  <Text className="font-semibold text-blue-600 font-mono">
                    {verifiedReferralsCount} / 4 Verified Referrals
                  </Text>
                </View>

                {/* Modern Progress Bar */}
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                  <div 
                    className="h-full bg-blue-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (verifiedReferralsCount / 4) * 100)}%` }}
                  />
                </div>

                <Text className="text-[11px] text-slate-500 pt-0.5">
                  {4 - verifiedReferralsCount > 0
                    ? `${4 - verifiedReferralsCount} more verified referral${4 - verifiedReferralsCount > 1 ? 's' : ''} needed to automatically unlock Orbit Rewards.`
                    : "Requirement met. Unlocking Orbit Rewards..."}
                </Text>
              </View>

              {/* GUIDANCE BOX & AGENT REFERRAL NAVIGATION */}
              <View className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <View className="space-y-0.5 flex-1">
                  <Text className="text-xs font-semibold text-slate-800">Where do I find my referral link?</Text>
                  <Text className="text-[11px] text-slate-500 leading-normal">
                    Orbit Rewards connects directly to your official Agent Referral link. Share your link from the Agent Program to invite users.
                  </Text>
                </View>

                <TouchableOpacity
                  onClick={() => setMobileScreen("agent")}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg text-xs font-semibold flex flex-row items-center gap-1.5 transition-colors shrink-0"
                >
                  <span>View Agent Referral</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </TouchableOpacity>
              </View>

            </View>

            {/* VERIFIED REFERRALS SUMMARY */}
            <View className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <Text className="text-sm font-bold text-slate-900">Your Verified Referrals ({verifiedReferralsCount})</Text>

              {myReferrals.length === 0 ? (
                <View className="py-8 text-center items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Users className="w-6 h-6 text-slate-400 mb-1.5" />
                  <Text className="text-xs text-slate-600 font-medium">No verified referrals yet</Text>
                  <Text className="text-[11px] text-slate-400 mt-0.5">Share your link from the Agent Program to start tracking registrations.</Text>
                </View>
              ) : (
                <View className="space-y-2">
                  {myReferrals.map((ref, idx) => (
                    <View key={ref.id || idx} className="flex flex-row items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <View className="flex flex-row items-center gap-2.5">
                        <View className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                          {ref.referredName ? ref.referredName.charAt(0).toUpperCase() : 'U'}
                        </View>
                        <View>
                          <Text className="text-xs font-semibold text-slate-800">{ref.referredName || 'Referred User'}</Text>
                          <Text className="text-[10px] text-slate-400">{new Date(ref.timestamp).toLocaleDateString()}</Text>
                        </View>
                      </View>
                      <View className="bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex flex-row items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        <Text className="text-[10px] font-semibold text-emerald-700">Verified</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

          </View>
        )}

        {/* ============================================================ */}
        {/* 2. UNLOCKED STATE ( >= 4 VERIFIED AGENT REFERRALS )           */}
        {/* ============================================================ */}
        {isUnlocked && (
          <View className="space-y-5">

            {/* UNLOCKED DASHBOARD HEADER */}
            <View className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-2">
              <View className="flex flex-row items-center justify-between">
                <View className="flex flex-row items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <Text className="text-base font-bold text-slate-900">Orbit Rewards Dashboard</Text>
                </View>
                <View className="bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                  <Text className="text-[11px] font-semibold text-emerald-700">Active Account</Text>
                </View>
              </View>
              <Text className="text-xs text-slate-600 leading-relaxed">
                Watch verified daily adverts to accumulate earnings and submit EFT withdrawal requests directly to your bank account.
              </Text>
            </View>

            {/* STAT CARDS GRID */}
            <View className="grid grid-cols-2 md:grid-cols-4 gap-3">
              
              {/* WATCH ADS / DAILY PROGRESS */}
              <View className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-1">
                <View className="flex flex-row items-center justify-between">
                  <Text className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Watch Ads</Text>
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                </View>
                <Text className="text-lg font-bold text-slate-900 font-mono">{todayAdCount} / {MAX_DAILY_ADS}</Text>
                <Text className="text-[10px] text-slate-400">Daily Limit: 20 Ads</Text>
              </View>

              {/* DAILY PROGRESS / READY */}
              <View className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-1">
                <View className="flex flex-row items-center justify-between">
                  <Text className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Daily Progress</Text>
                  <Play className="w-3.5 h-3.5 text-blue-600" />
                </View>
                <Text className="text-lg font-bold text-blue-600 font-mono">
                  {Math.max(0, MAX_DAILY_ADS - todayAdCount)} Ready
                </Text>
                <Text className="text-[10px] text-slate-400">Available Today</Text>
              </View>

              {/* EARNINGS BALANCE */}
              <View className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-1">
                <View className="flex flex-row items-center justify-between">
                  <Text className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Earnings</Text>
                  <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                </View>
                <Text className="text-lg font-bold text-slate-900 font-mono">R {monthlyEarnings.toFixed(2)}</Text>
                <Text className="text-[10px] text-slate-400">Monthly Yield</Text>
              </View>

              {/* WITHDRAWAL BALANCE */}
              <View className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-1">
                <View className="flex flex-row items-center justify-between">
                  <Text className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Withdrawal</Text>
                  <Award className="w-3.5 h-3.5 text-blue-600" />
                </View>
                <Text className="text-lg font-bold text-slate-900 font-mono">R {(currentUser?.balance || 0).toFixed(2)}</Text>
                <Text className="text-[10px] text-slate-400">Available Balance</Text>
              </View>

            </View>

            {/* WATCH ADS SECTION */}
            <View className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
              <View className="flex flex-row items-center justify-between">
                <View className="flex flex-row items-center gap-2">
                  <Play className="w-4 h-4 text-blue-600" />
                  <Text className="text-sm font-bold text-slate-900">Available Rewarded Adverts</Text>
                </View>
                <Text className="text-xs font-medium text-slate-500 font-mono">{todayAdCount}/{MAX_DAILY_ADS} Completed</Text>
              </View>

              <Text className="text-xs text-slate-600">
                Select a sponsor advert to watch. Rewards are credited immediately after full ad playback completion.
              </Text>

              <View className="space-y-3">
                {getRewardedAdsService().getAvailableAds().map((ad) => {
                  const isDisabled = todayAdCount >= MAX_DAILY_ADS;
                  return (
                    <View 
                      key={ad.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col space-y-3"
                    >
                      <View className="flex flex-row items-start justify-between gap-3">
                        <View className="space-y-1 flex-1">
                          <View className="flex flex-row items-center gap-2">
                            <Text className="text-xs font-bold text-slate-900">{ad.title}</Text>
                            <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-medium">{ad.category}</span>
                          </View>
                          <Text className="text-[11px] text-slate-600">{ad.description}</Text>
                          <Text className="text-[10px] text-slate-500 font-medium">Sponsor: {ad.sponsor}</Text>
                        </View>

                        <View className="text-right shrink-0">
                          <Text className="text-xs font-bold text-slate-900 font-mono">+R {ad.rewardEst.toFixed(2)}</Text>
                          <Text className="text-[10px] text-slate-400">{ad.durationSeconds}s duration</Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        onClick={() => handleWatchAdClick(ad)}
                        disabled={isDisabled}
                        className={`w-full py-2.5 px-3 rounded-lg flex flex-row items-center justify-center gap-2 text-xs font-semibold transition-colors ${
                          isDisabled 
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-blue-600 hover:bg-blue-700 text-white shadow-2xs'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>{isDisabled ? 'Daily Limit Reached' : 'Watch Rewarded Advert'}</span>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* REWARD HISTORY SECTION */}
            <View className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <Text className="text-sm font-bold text-slate-900">Reward History</Text>

              {rewardHistory.length === 0 ? (
                <View className="py-6 text-center items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Clock className="w-5 h-5 text-slate-400 mb-1" />
                  <Text className="text-xs text-slate-500 font-medium">No advert rewards earned yet</Text>
                  <Text className="text-[11px] text-slate-400 mt-0.5">Watch an advert above to log your first verified reward.</Text>
                </View>
              ) : (
                <View className="space-y-2">
                  {rewardHistory.map((item) => (
                    <View key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-row items-center justify-between">
                      <View className="space-y-0.5">
                        <Text className="text-xs font-semibold text-slate-800">{item.adTitle}</Text>
                        <Text className="text-[10px] text-slate-400">{new Date(item.timestamp).toLocaleString()}</Text>
                      </View>
                      <View className="text-right flex flex-row items-center gap-2">
                        <Text className="text-xs font-bold text-blue-600 font-mono">+R {item.rewardAmount.toFixed(2)}</Text>
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-medium">Verified</span>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* WITHDRAWAL REQUESTS SECTION */}
            <View className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <View className="flex flex-row items-center justify-between">
                <View className="flex flex-row items-center gap-2">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <Text className="text-sm font-bold text-slate-900">Withdrawal Requests</Text>
                </View>

                <TouchableOpacity 
                  onClick={() => {
                    setWithdrawError("");
                    setWithdrawSuccess("");
                    setShowWithdrawModal(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex flex-row items-center gap-1.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Request Payout</span>
                </TouchableOpacity>
              </View>

              <Text className="text-xs text-slate-600">
                Minimum payout threshold: <strong className="text-slate-800">R100.00</strong>. Requests are processed via manual EFT review.
              </Text>

              {userWithdrawals.length === 0 ? (
                <View className="py-6 text-center items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <DollarSign className="w-5 h-5 text-slate-400 mb-1" />
                  <Text className="text-xs text-slate-500 font-medium">No withdrawal requests submitted</Text>
                  <Text className="text-[11px] text-slate-400 mt-0.5">Submit a request once your wallet balance reaches R100.</Text>
                </View>
              ) : (
                <View className="space-y-2">
                  {userWithdrawals.map((w) => (
                    <View key={w.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-row items-center justify-between">
                      <View className="space-y-0.5">
                        <Text className="text-xs font-bold text-slate-900 font-mono">R {w.amount.toFixed(2)}</Text>
                        <Text className="text-[10px] text-slate-500">{w.bankName} • {w.accountNumber ? `••••${w.accountNumber.slice(-4)}` : ''}</Text>
                        <Text className="text-[10px] text-slate-400">{new Date(w.timestamp).toLocaleDateString()}</Text>
                      </View>

                      <View className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                        w.status === WithdrawalStatus.PAID
                          ? 'bg-emerald-100 text-emerald-800'
                          : w.status === WithdrawalStatus.APPROVED
                          ? 'bg-blue-100 text-blue-800'
                          : w.status === WithdrawalStatus.REJECTED
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {w.status}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* OFFICIAL RULES */}
            <View className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
              <View className="flex flex-row items-center gap-2 border-b border-slate-100 pb-2.5">
                <HelpCircle className="w-4 h-4 text-slate-600" />
                <Text className="text-sm font-bold text-slate-900">Orbit Rewards Program Rules</Text>
              </View>

              <View className="space-y-2 text-xs text-slate-600">
                <View className="flex flex-row items-start gap-2">
                  <span className="font-semibold text-slate-400">1.</span>
                  <Text className="text-xs text-slate-700 flex-1">Maximum 20 rewarded ads per day per verified user.</Text>
                </View>
                <View className="flex flex-row items-start gap-2">
                  <span className="font-semibold text-slate-400">2.</span>
                  <Text className="text-xs text-slate-700 flex-1">Rewards require full advert playback completion to verify.</Text>
                </View>
                <View className="flex flex-row items-start gap-2">
                  <span className="font-semibold text-slate-400">3.</span>
                  <Text className="text-xs text-slate-700 flex-1">Automated bots, self-referrals, and fake accounts are strictly prohibited.</Text>
                </View>
                <View className="flex flex-row items-start gap-2">
                  <span className="font-semibold text-slate-400">4.</span>
                  <Text className="text-xs text-slate-700 flex-1">Payout calculations follow Orbit AI program guidelines and advertising revenue distribution.</Text>
                </View>
              </View>
            </View>

          </View>
        )}

      </ScrollView>

      {/* ============================================================ */}
      {/* MODAL: REWARDED AD PLAYER MODAL                              */}
      {/* ============================================================ */}
      {activeAdModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-2xl w-full max-w-md border border-slate-800 shadow-xl p-6 relative flex flex-col space-y-4">
            
            {/* Header / Sponsor */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs font-semibold text-slate-300 tracking-wider uppercase">Rewarded Advert</span>
              </div>
              <span className="text-xs text-slate-400 font-mono">{activeAdModal.sponsor}</span>
            </div>

            {/* Ad Banner Box */}
            <div className={`w-full h-40 rounded-xl bg-gradient-to-br ${activeAdModal.bannerGradient} p-4 flex flex-col justify-between relative shadow-inner overflow-hidden`}>
              <div className="space-y-1">
                <span className="bg-white/10 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md backdrop-blur-xs">
                  {activeAdModal.category}
                </span>
                <h3 className="text-base font-bold text-white leading-tight mt-1">{activeAdModal.title}</h3>
                <p className="text-xs text-slate-300 line-clamp-2">{activeAdModal.description}</p>
              </div>

              {/* Countdown & Yield */}
              <div className="flex justify-between items-end pt-2">
                <div className="bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-white/10">
                  <p className="text-[10px] text-slate-400">Reward</p>
                  <p className="text-xs font-bold text-emerald-400 font-mono">+R {activeAdModal.rewardEst.toFixed(2)}</p>
                </div>

                <div className="bg-black/40 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5 font-mono text-xs font-semibold text-slate-200">
                  <Clock className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  <span>{adCountdown}s</span>
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-slate-400">
                <span>Verification Progress</span>
                <span className="font-mono text-blue-400 font-medium">
                  {adCompleted ? "Completed" : `${Math.round(((adTotalDuration - adCountdown) / adTotalDuration) * 100)}%`}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: adCompleted ? '100%' : `${((adTotalDuration - adCountdown) / adTotalDuration) * 100}%` }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            {adCompleted ? (
              <button
                onClick={handleClaimReward}
                disabled={claimingReward}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{claimingReward ? "Claiming..." : `Claim R${activeAdModal.rewardEst.toFixed(2)} Reward`}</span>
              </button>
            ) : (
              <button
                onClick={handleCloseAdModal}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-xl transition-colors cursor-pointer"
              >
                Cancel Advert
              </button>
            )}

            {adError && (
              <p className="text-xs text-rose-400 text-center font-medium">{adError}</p>
            )}

          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: WITHDRAWAL REQUEST FORM MODAL                         */}
      {/* ============================================================ */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-200 shadow-xl p-6 relative flex flex-col space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Request EFT Withdrawal</h3>
              </div>
              <button 
                onClick={() => setShowWithdrawModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Enter your South African banking details below. Minimum payout amount is <strong className="text-slate-900">R100.00</strong>.
            </p>

            {withdrawError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{withdrawError}</span>
              </div>
            )}

            {withdrawSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-medium flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{withdrawSuccess}</span>
              </div>
            )}

            <form onSubmit={handleWithdrawSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <TextInput 
                  value={withdrawFullName}
                  onChange={(e: any) => setWithdrawFullName(e.target.value)}
                  placeholder="e.g. Sipho Khumalo"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bank Name</label>
                <select 
                  value={withdrawBankName}
                  onChange={(e) => setWithdrawBankName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
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
                  <TextInput 
                    value={withdrawAccountNumber}
                    onChange={(e: any) => setWithdrawAccountNumber(e.target.value)}
                    placeholder="123456789"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Account Type</label>
                  <select 
                    value={withdrawAccountType}
                    onChange={(e) => setWithdrawAccountType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                  >
                    <option value="Savings">Savings</option>
                    <option value="Cheque">Cheque / Current</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Branch Code (Optional)</label>
                  <TextInput 
                    value={withdrawBranchCode}
                    onChange={(e: any) => setWithdrawBranchCode(e.target.value)}
                    placeholder="e.g. 250655"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Amount (ZAR)</label>
                  <TextInput 
                    value={withdrawAmount}
                    onChange={(e: any) => setWithdrawAmount(e.target.value)}
                    placeholder="100"
                    type="number"
                    min="100"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={withdrawLoading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{withdrawLoading ? "Submitting..." : "Submit Withdrawal Request"}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </SafeAreaView>
  );
};
