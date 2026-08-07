import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView } from '../components/ReactNativeShim';
import { ArrowLeft, Copy, Check } from '../components/Icons';
import { useAppState } from '../services/state';
import { UserPlan, UserProfile, ReferralRecord } from '../types';
import { supabase, dbFetchProfileById, getReferralLink } from '../services/supabase';

export const AgentsScreen: React.FC = () => {
  const { 
    currentUser, 
    setMobileScreen
  } = useAppState();

  const [profile, setProfile] = useState<UserProfile | null>(currentUser);
  const [referralHistory, setReferralHistory] = useState<ReferralRecord[]>([]);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (!currentUser?.uid) return;

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

    const channel = supabase
      .channel(`agents_screen_${currentUser.uid}`)
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
  const refLink = getReferralLink(agentId);

  const verifiedCount = currentProf.verified_referrals !== undefined 
    ? currentProf.verified_referrals 
    : referralHistory.filter(r => r.status === 'Paid' || r.status === 'Verified').length;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(refLink);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleMainActionClick = () => {
    if (currentUser.plan !== UserPlan.PRO) {
      setMobileScreen("upgrade");
    } else {
      handleCopyCode();
    }
  };

  return (
    <SafeAreaView className="bg-white flex flex-col h-full overflow-hidden select-none">
      
      {/* HEADER SECTION */}
      <View className="px-5 py-4 bg-white flex flex-row items-center justify-between select-none border-b border-slate-100">
        <TouchableOpacity 
          onClick={() => setMobileScreen("chat")}
          className="p-1 hover:bg-slate-50 rounded-full cursor-pointer"
        >
          <ArrowLeft className="w-6 h-6 text-black" />
        </TouchableOpacity>
        
        <View className="flex flex-row items-center gap-2">
          {/* BALANCE DISPLAY BOX */}
          <View className="border border-black rounded-[8px] px-3.5 py-1 flex flex-col items-start justify-center min-w-[110px]">
            <Text className="text-[10px] text-slate-500 font-medium leading-tight self-start font-sans">Balance</Text>
            <Text className="text-xs font-bold text-black leading-tight self-start font-sans">
              R {currentProf.balance !== undefined ? currentProf.balance.toFixed(2) : "0.00"}
            </Text>
          </View>
          
          {/* WITHDRAW ACTION BUTTON */}
          <TouchableOpacity 
            onClick={() => setMobileScreen("withdraw")}
            className="border border-black rounded-[8px] px-4 py-2 hover:bg-slate-50 flex items-center justify-center cursor-pointer min-h-[38px]"
          >
            <Text className="text-xs font-bold text-black font-sans">Withdraw</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 bg-white p-5" contentContainerClassName="space-y-6 pb-8" showsVerticalScrollIndicator={false}>
        
        {/* BOARD NAME TEXT */}
        <View className="pt-2 flex flex-row items-center justify-between">
          <Text className="text-2xl font-bold text-black font-sans tracking-tight block text-left">Agent Referral Dashboard</Text>
          <Text className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">ID: {agentId}</Text>
        </View>

        {/* HOW TO BECOME AN AGENT CORE CONTEXT CONTAINER */}
        <View className="bg-white border border-black rounded-[18px] p-6 space-y-6 text-left">
          <Text className="text-lg font-bold text-black font-sans tracking-tight block text-left">How Agent Referrals Work</Text>
          
          {/* STEP BY STEP DESCRIPTIONS */}
          <View className="space-y-4 text-left">
            <View className="flex flex-row items-start text-left">
              <Text className="text-[11.5px] text-black font-medium leading-relaxed block text-left font-sans">
                <span className="font-extrabold text-black">1. Copy Link:</span> Share your permanent referral link below with friends.
              </Text>
            </View>

            <View className="flex flex-row items-start text-left">
              <Text className="text-[11.5px] text-black font-medium leading-relaxed block text-left font-sans">
                <span className="font-extrabold text-black">2. Registration:</span> When friends register, your Agent ID ({agentId}) is tagged.
              </Text>
            </View>

            <View className="flex flex-row items-start text-left">
              <Text className="text-[11.5px] text-black font-medium leading-relaxed block text-left font-sans">
                <span className="font-extrabold text-black">3. Verification:</span> When verified, you instantly earn R10.00 credited to your balance.
              </Text>
            </View>

            <View className="flex flex-row items-start text-left">
              <Text className="text-[11.5px] text-black font-medium leading-relaxed block text-left font-sans">
                <span className="font-extrabold text-black">4. Withdraw:</span> Cash out earnings anytime to your EFT bank account.
              </Text>
            </View>
          </View>

          {/* REALTIME VISUAL REFERRAL COUNTER */}
          <View className="flex flex-row justify-between items-center pt-4 border-t border-slate-100">
            <View>
              <Text className="text-base text-black font-bold font-sans">Verified Referrals</Text>
              <Text className="text-xs text-slate-500">Real-time status</Text>
            </View>
            <Text className="text-xl text-black font-black font-mono">
              {verifiedCount}
            </Text>
          </View>

          {/* ACTIVE INVITER LINK CONTAINER OR PRO FORBIDDEN ALERT */}
          {currentUser.plan !== UserPlan.PRO ? (
            <View className="py-3 px-2">
              <Text className="text-xs text-red-600 font-bold tracking-tight text-center font-sans">
                Upgrade to Pro to unlock your referral link
              </Text>
            </View>
          ) : (
            <View className="w-full border border-black rounded-[8px] px-4 py-3 bg-white flex flex-row justify-between items-center">
              <Text className="text-[11px] text-black font-medium select-all truncate font-sans font-mono">
                {refLink}
              </Text>
              <TouchableOpacity 
                onClick={handleCopyCode}
                className="p-1.5 rounded-md hover:bg-slate-100 text-black cursor-pointer"
              >
                {copiedCode ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </TouchableOpacity>
            </View>
          )}

          {copiedCode && (
            <Text className="text-[10px] text-green-600 font-bold font-sans text-center -mt-2 block">
              Permanent referral link copied!
            </Text>
          )}

          {/* ACTION BUTTON SUBMITTER */}
          <View className="pt-2">
            <TouchableOpacity 
              onClick={handleMainActionClick}
              className="w-full py-4 border border-black rounded-[8px] bg-white hover:bg-slate-50/70 flex items-center justify-center cursor-pointer transition-colors duration-200"
            >
              <Text className="text-xs font-bold text-black font-sans uppercase tracking-wider">
                {currentUser.plan !== UserPlan.PRO ? "Upgrade to Pro" : "Copy Your Invite Link"}
              </Text>
            </TouchableOpacity>
          </View>

        </View>

        {/* REFERRAL HISTORY LIST */}
        <View className="bg-white border border-black rounded-[18px] p-6 space-y-4 text-left">
          <View className="flex flex-row justify-between items-center">
            <Text className="text-base font-bold text-black font-sans">Referral History</Text>
            <Text className="text-xs font-mono font-bold text-slate-500">{referralHistory.length} Total</Text>
          </View>

          {referralHistory.length === 0 ? (
            <Text className="text-xs text-slate-400 font-medium py-2">No referrals recorded yet.</Text>
          ) : (
            <View className="space-y-2.5">
              {referralHistory.map((ref, idx) => (
                <View key={ref.id || idx} className="flex flex-row justify-between items-center pb-2.5 border-b border-slate-100 last:border-b-0">
                  <View>
                    <Text className="text-xs font-bold text-black">{ref.referredName}</Text>
                    <Text className="text-[10px] text-slate-400">{new Date(ref.timestamp).toLocaleDateString()}</Text>
                  </View>
                  <View className="items-end">
                    <Text className="text-xs font-bold text-green-600">+R{ref.reward ? ref.reward.toFixed(2) : "10.00"}</Text>
                    <Text className="text-[9px] font-bold text-slate-500 uppercase">{ref.status === 'Paid' ? 'Verified' : ref.status}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

      </ScrollView>

    </SafeAreaView>
  );
};
