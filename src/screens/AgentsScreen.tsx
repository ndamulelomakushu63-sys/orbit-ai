import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView } from '../components/ReactNativeShim';
import { ArrowLeft, Copy } from '../components/Icons';
import { useAppState } from '../services/state';
import { UserPlan } from '../types';

export const AgentsScreen: React.FC = () => {
  const { 
    currentUser, 
    setUsers,
    setMobileScreen 
  } = useAppState();

  const [copiedCode, setCopiedCode] = useState(false);

  if (!currentUser) return null;

  const handleCopyCode = () => {
    if (currentUser.referralCode) {
      navigator.clipboard.writeText(`https://orbitai.co.za/join?ref=${currentUser.referralCode}`);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleMainActionClick = () => {
    if (currentUser.plan !== UserPlan.PRO) {
      setMobileScreen("upgrade");
    } else {
      if (!currentUser.referralCode) {
        // Generate code
        const refCode = "ORBIT-" + Math.random().toString(36).substring(2, 8).toUpperCase();
        
        setUsers(p => p.map(u => {
          if (u.uid === currentUser.uid) {
            return {
              ...u,
              agentStatus: true,
              referralCode: refCode
            };
          }
          return u;
        }));
        
        // Also update the local object instantly to trigger render reactively
        currentUser.agentStatus = true;
        currentUser.referralCode = refCode;
        
        alert("Congratulations! Your companion referral agent link is generated.");
      } else {
        // Copy if already generated
        handleCopyCode();
      }
    }
  };

  return (
    <SafeAreaView className="bg-white flex flex-col h-full overflow-hidden select-none">
      
      {/* HEADER SECTION */}
      <View className="px-5 py-4 bg-white flex flex-row items-center justify-between select-none">
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
              R {currentUser.balance !== undefined ? currentUser.balance.toFixed(2) : "0.00"}
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
        <View className="pt-2">
          <Text className="text-2xl font-bold text-black font-sans tracking-tight block text-left">Agent Dashboard</Text>
        </View>

        {/* HOW TO BECOME AN AGENT CORE CONTEXT CONTAINER */}
        <View className="bg-white border border-black rounded-[18px] p-6 space-y-6 text-left">
          <Text className="text-lg font-bold text-black font-sans tracking-tight block text-left">How to become a agent</Text>
          
          {/* STEP BY STEP DESCRIPTIONS */}
          <View className="space-y-4 text-left">
            <View className="flex flex-row items-start text-left">
              <Text className="text-[11.5px] text-black font-medium leading-relaxed block text-left font-sans">
                <span className="font-extrabold text-black">Pay first :</span> Upgrade to Pro R99/month to unlock agent mode
              </Text>
            </View>

            <View className="flex flex-row items-start text-left">
              <Text className="text-[11.5px] text-black font-medium leading-relaxed block text-left font-sans">
                <span className="font-extrabold text-black">Tap button :</span> Press "Become an agent"below to generate your link
              </Text>
            </View>

            <View className="flex flex-row items-start text-left">
              <Text className="text-[11.5px] text-black font-medium leading-relaxed block text-left font-sans">
                <span className="font-extrabold text-black">Copy Link :</span> Share your private website link. Earn R10 for every signup.
              </Text>
            </View>

            <View className="flex flex-row items-start text-left">
              <Text className="text-[11.5px] text-black font-medium leading-relaxed block text-left font-sans">
                <span className="font-extrabold text-black">Earn Money :</span> You get R10 for every person who subscribes using your link
              </Text>
            </View>

            <View className="flex flex-row items-start text-left">
              <Text className="text-[11.5px] text-black font-medium leading-relaxed block text-left font-sans">
                <span className="font-extrabold text-black">Withdraw:</span> Minimum R50 balance. Tap "Withdraw" anytime to cash out
              </Text>
            </View>
          </View>

          {/* REALTIME VISUAL REFERRAL COUNTER */}
          <View className="flex flex-row justify-between items-center pt-8">
            <Text className="text-base text-black font-bold font-sans">Referrals</Text>
            <Text className="text-base text-black font-bold font-sans">
              0/200
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
              <Text className="text-[11px] text-black font-medium select-all truncate font-sans">
                {currentUser.referralCode 
                  ? `https://orbitai.co.za/join?ref=${currentUser.referralCode}` 
                  : "Link appears here"}
              </Text>
              <TouchableOpacity 
                onClick={handleCopyCode}
                disabled={!currentUser.referralCode}
                className={`p-1.5 rounded-md transition-colors ${
                  currentUser.referralCode ? 'hover:bg-slate-100 text-black cursor-pointer' : 'text-slate-300'
                }`}
              >
                <Copy className="w-4 h-4" />
              </TouchableOpacity>
            </View>
          )}

          {copiedCode && (
            <Text className="text-[10px] text-green-600 font-bold font-sans text-center -mt-2 block">
              Referral link copied!
            </Text>
          )}

          {/* ACTION BUTTON SUBMITTER */}
          <View className="pt-2">
            <TouchableOpacity 
              onClick={handleMainActionClick}
              className="w-full py-4 border border-black rounded-[8px] bg-white hover:bg-slate-50/70 flex items-center justify-center cursor-pointer transition-colors duration-200"
            >
              <Text className="text-xs font-bold text-black font-sans uppercase tracking-wider">
                {currentUser.plan !== UserPlan.PRO ? "Upgrade to Pro" : (currentUser.referralCode ? "Copy Your Invite Link" : "Become an agent")}
              </Text>
            </TouchableOpacity>
          </View>

        </View>

      </ScrollView>

    </SafeAreaView>
  );
};
