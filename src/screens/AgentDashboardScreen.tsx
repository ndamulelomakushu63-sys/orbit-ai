import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView } from '../components/ReactNativeShim';
import { ArrowLeft, Copy, Check } from '../components/Icons';
import { useAppState } from '../services/state';
import { supabase, dbFetchProfileById } from '../services/supabase';
import { UserProfile, ReferralRecord } from '../types';

export const AgentDashboardScreen: React.FC = () => {
  const { currentUser, setMobileScreen } = useAppState();
  const [profile, setProfile] = useState<UserProfile | null>(currentUser);
  const [referralHistory, setReferralHistory] = useState<ReferralRecord[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;

    // Direct read from Supabase
    const fetchSupabaseData = async () => {
      const p = await dbFetchProfileById(currentUser.uid);
      if (p) setProfile(p);

      const { data: refsData } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', currentUser.uid)
        .order('timestamp', { ascending: false });

      if (refsData) {
        setReferralHistory(refsData.map(r => ({
          id: r.id,
          referrerId: r.referrer_id,
          referredUserId: r.referred_user_id,
          referredName: r.referred_name || 'Referred User',
          reward: Number(r.reward || 10),
          status: r.status,
          timestamp: r.timestamp
        })));
      }
    };

    fetchSupabaseData();

    // Real-time subscription to Supabase changes
    const channel = supabase
      .channel(`agent_dash_${currentUser.uid}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${currentUser.uid}`
      }, () => {
        fetchSupabaseData();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'referrals',
        filter: `referrer_id=eq.${currentUser.uid}`
      }, () => {
        fetchSupabaseData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.uid]);

  if (!currentUser) return null;

  const currentProf = profile || currentUser;
  const agentId = currentProf.agent_id || currentProf.referralCode || "AGT-XXXXXX";
  const referralLink = currentProf.referral_link || `https://orbitai.co.za/register?ref=${agentId}`;
  
  // Calculate verified referrals count directly from database
  const verifiedCount = currentProf.verified_referrals !== undefined 
    ? currentProf.verified_referrals 
    : referralHistory.filter(r => r.status === 'Paid' || r.status === 'Verified').length;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <SafeAreaView className="bg-white flex flex-col h-full">
      {/* Header bar and exit control */}
      <View className="px-5 py-4 border-b border-slate-100 flex flex-row items-center justify-between">
        <View className="flex flex-row items-center gap-3">
          <TouchableOpacity 
            onClick={() => setMobileScreen("profile")}
            className="p-1.5 hover:bg-slate-50 rounded-full text-slate-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </TouchableOpacity>
          <Text className="text-base font-bold text-slate-800 tracking-tight">Agent Referral Dashboard</Text>
        </View>

        <View className="flex flex-row items-center gap-2">
          <span className="text-[10px] bg-green-50 text-green-700 font-extrabold px-2 py-0.5 rounded-full border border-green-200">
            Realtime Sync
          </span>
          <View className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
        </View>
      </View>

      <ScrollView className="bg-slate-50 p-4" contentContainerClassName="space-y-4 pb-8" showsVerticalScrollIndicator={false}>
        
        {/* Core Wallet balances panel block */}
        <View className="bg-blue-600 rounded-3xl p-5 text-white flex flex-col justify-between shadow-md shadow-blue-200">
          <View>
            <Text className="text-[10px] text-white/70 font-bold uppercase tracking-widest block font-sans">Available Earnings</Text>
            <Text className="text-3xl font-black text-white mt-1 leading-none tracking-tight">
              R{currentProf.balance !== undefined ? currentProf.balance.toFixed(2) : "0.00"}
            </Text>
          </View>

          <View className="flex flex-row justify-between items-center pt-5 mt-5 border-t border-white/20">
            <View>
              <Text className="text-[9px] text-white/60 font-bold uppercase tracking-wider block font-sans">Permanent Agent ID</Text>
              <Text className="text-sm font-black text-white font-mono mt-0.5">{agentId}</Text>
            </View>

            <TouchableOpacity 
              onClick={() => {
                if ((currentProf.balance || 0) <= 0) {
                  alert("You have an empty rewards wallet. Earn first before submitting withdrawals!");
                  return;
                }
                setMobileScreen("withdraw");
              }}
              className="px-4 py-2 bg-white text-blue-600 text-xs font-black rounded-full shadow-md shadow-blue-900/10 hover:bg-slate-50"
            >
              <Text className="text-blue-600 text-xs font-extrabold font-sans">Withdraw Cash</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Permanent Referral Link Card */}
        <View className="bg-white p-4 border border-slate-200/60 rounded-3xl space-y-3 shadow-2xs">
          <View className="flex flex-row justify-between items-center">
            <Text className="text-xs font-bold text-slate-800 font-sans">Permanent Referral Link</Text>
            <Text className="text-[10px] text-slate-400 font-mono font-bold">ID: {agentId}</Text>
          </View>

          <View className="flex flex-row items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2.5">
            <Text className="text-xs text-slate-700 flex-1 truncate font-mono select-all font-medium">
              {referralLink}
            </Text>
          </View>

          <TouchableOpacity 
            onClick={handleCopyLink}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl flex flex-row items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            {copiedLink ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-white" />}
            <Text className="text-xs font-bold text-white font-sans">
              {copiedLink ? "Link Copied to Clipboard!" : "Copy Permanent Referral Link"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Referral Progress & Verified Stats */}
        <View className="bg-white border border-slate-200/60 rounded-3xl p-5 shadow-2xs space-y-4">
          <View className="flex flex-row justify-between items-start">
            <View className="space-y-1">
              <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-sans">
                Verified Referrals
              </Text>
              <Text className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                {verifiedCount} <span className="text-xs font-normal text-slate-400">Verified</span>
              </Text>
            </View>
            <View className="bg-blue-50 border border-blue-100 rounded-full px-3 py-1">
              <Text className="text-xs font-black text-blue-600 font-mono">
                {verifiedCount} Verified
              </Text>
            </View>
          </View>

          {/* Referral Progress Bar */}
          <View className="space-y-1.5">
            <View className="flex flex-row justify-between items-center">
              <Text className="text-[10px] font-bold text-slate-500">Referral Progress</Text>
              <Text className="text-[10px] font-bold text-blue-600 font-mono">{verifiedCount} total</Text>
            </View>
            <View className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <View 
                className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, (verifiedCount / 10) * 100)}%` }}
              />
            </View>
          </View>

          <Text className="text-[11px] text-slate-500 leading-normal font-medium">
            Earn R10.00 credited to your balance for every referred user who completes verification.
          </Text>
        </View>

        {/* Referral History from Supabase */}
        <View className="bg-white border border-slate-200/60 rounded-3xl p-5 space-y-4 shadow-2xs">
          <View className="flex flex-row justify-between items-center">
            <Text className="text-xs font-bold text-slate-800 uppercase tracking-wider block font-sans">Referral History</Text>
            <Text className="text-[10px] text-slate-400 font-bold font-mono">{referralHistory.length} Total</Text>
          </View>

          <View className="space-y-2.5">
            {referralHistory.length === 0 ? (
              <View className="items-center justify-center py-6">
                <Text className="text-xs text-slate-400 font-medium">No referrals recorded yet.</Text>
                <Text className="text-[10px] text-slate-300 mt-1 leading-normal text-center">
                  Share your permanent referral link to start earning R10 per verified referral!
                </Text>
              </View>
            ) : (
              referralHistory.map((ref, idx) => (
                <View 
                  key={ref.id || idx}
                  className="flex flex-row justify-between items-center pb-3 border-b border-slate-100 last:border-b-0"
                >
                  <View className="flex-1 pr-2 min-w-0">
                    <Text className="text-xs font-bold text-slate-800 truncate block leading-tight">
                      {ref.referredName || 'Referred User'}
                    </Text>
                    <Text className="text-[9px] text-slate-400 font-mono font-semibold mt-1">
                      {new Date(ref.timestamp).toLocaleDateString()}
                    </Text>
                  </View>

                  <View className="items-end shrink-0">
                    <Text className="text-xs font-black font-sans text-green-600">
                      +R{ref.reward ? ref.reward.toFixed(2) : "10.00"}
                    </Text>
                    
                    <Text className={`text-[8px] mt-0.5 block font-bold font-sans ${
                      ref.status === 'Paid' || ref.status === 'Verified' ? 'text-green-600'
                      : 'text-amber-500'
                    }`}>
                      {ref.status === 'Paid' ? 'Verified' : ref.status}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Policy Terms */}
        <View className="bg-white rounded-3xl border border-slate-200/60 p-5 shadow-2xs space-y-3 text-left">
          <Text className="text-xs font-bold text-slate-900 uppercase tracking-wider font-sans">Agent Program Terms</Text>
          <Text className="text-[11px] text-slate-600 leading-relaxed font-sans">
            Your permanent Agent ID is assigned for life. Share your link to earn R10 for every verified referral, deposited directly into your Orbit balance.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};
