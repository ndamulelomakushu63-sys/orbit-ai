import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView } from '../components/ReactNativeShim';
import { ArrowLeft, Sparkles, CheckCircle, ShieldCheck, ArrowRight } from '../components/Icons';
import { useAppState } from '../services/state';

export const AgentPublicPreviewScreen: React.FC = () => {
  const { setMobileScreen } = useAppState();

  const demoLink = "https://orbitai.co.za/?ref=DEMO123";

  return (
    <SafeAreaView className="bg-white flex flex-col h-full overflow-hidden select-none">
      {/* Top Navigation Header */}
      <View className="px-5 py-4 bg-white flex flex-row items-center justify-between border-b border-slate-100 select-none">
        <TouchableOpacity 
          onClick={() => setMobileScreen("chat")}
          className="p-1 hover:bg-slate-50 rounded-full cursor-pointer text-black"
          title="Back to Chat"
        >
          <ArrowLeft className="w-6 h-6 text-black" />
        </TouchableOpacity>
        
        <View className="flex flex-row items-center gap-2">
          <View className="border border-black/20 rounded-full px-3 py-1 bg-slate-50">
            <Text className="text-[11px] font-bold text-slate-750 font-sans tracking-wide">
              Marketing Preview
            </Text>
          </View>
        </View>
      </View>

      <ScrollView 
        className="flex-1 bg-white p-5" 
        contentContainerClassName="space-y-6 pb-12 text-left" 
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Title Section */}
        <View className="space-y-2 pt-1 text-left">
          <Text className="text-[11px] font-black text-slate-500 uppercase tracking-widest font-sans">
            Official Program Overview
          </Text>
          <Text className="text-2xl font-black text-black tracking-tight font-sans block">
            AGENT REFERRAL SYSTEM
          </Text>
          <Text className="text-sm font-semibold text-slate-800 font-sans">
            Turn your network into an opportunity.
          </Text>
          <Text className="text-xs text-slate-600 leading-relaxed font-sans pt-1">
            Share Orbit AI with others and earn R10 for eligible referred subscriptions through the official referral program.
          </Text>
        </View>

        {/* How It Works Section */}
        <View className="border border-slate-200 rounded-2xl p-5 bg-white space-y-4 text-left">
          <Text className="text-sm font-bold text-black uppercase tracking-wider font-sans border-b border-slate-100 pb-2">
            HOW IT WORKS
          </Text>

          <View className="space-y-3.5 text-left">
            <View className="flex flex-row items-start gap-3">
              <View className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                <Text className="text-[10px] font-bold text-white leading-none">1</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-black font-sans">Become an Orbit AI Agent</Text>
                <Text className="text-[11px] text-slate-600 font-sans mt-0.5 leading-normal">
                  Activate your agent status to participate in the verified referral program.
                </Text>
              </View>
            </View>

            <View className="flex flex-row items-start gap-3">
              <View className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                <Text className="text-[10px] font-bold text-white leading-none">2</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-black font-sans">Receive Your Unique Referral Link</Text>
                <Text className="text-[11px] text-slate-600 font-sans mt-0.5 leading-normal">
                  Your personalized agent ID is embedded directly in your permanent invitation link.
                </Text>
              </View>
            </View>

            <View className="flex flex-row items-start gap-3">
              <View className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                <Text className="text-[10px] font-bold text-white leading-none">3</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-black font-sans">Share With Your Network</Text>
                <Text className="text-[11px] text-slate-600 font-sans mt-0.5 leading-normal">
                  Share your link with friends, businesses, students, and your community.
                </Text>
              </View>
            </View>

            <View className="flex flex-row items-start gap-3">
              <View className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                <Text className="text-[10px] font-bold text-white leading-none">4</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-black font-sans">Automatic Referral Tracking</Text>
                <Text className="text-[11px] text-slate-600 font-sans mt-0.5 leading-normal">
                  When eligible users subscribe through your referral, the referral is recorded and tracked automatically.
                </Text>
              </View>
            </View>

            <View className="flex flex-row items-start gap-3">
              <View className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                <Text className="text-[10px] font-bold text-white leading-none">5</Text>
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-black font-sans">Earn R10 Agent Commission</Text>
                <Text className="text-[11px] text-slate-600 font-sans mt-0.5 leading-normal">
                  Earn R10 for every verified eligible referral, credited straight to your balance.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Demo Referral Link Presentation Container */}
        <View className="border border-black rounded-2xl p-5 bg-white space-y-3 text-left">
          <View className="flex flex-row items-center justify-between">
            <Text className="text-xs font-bold text-black uppercase tracking-wider font-sans">
              DEMO REFERRAL LINK
            </Text>
            <View className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-mono font-bold text-slate-700">
              EXAMPLE ONLY
            </View>
          </View>

          <View className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 flex flex-row items-center justify-between">
            <Text className="text-xs font-mono text-slate-700 select-all truncate font-semibold">
              {demoLink}
            </Text>
          </View>

          <View className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3">
            <Text className="text-[11px] text-amber-900 leading-relaxed font-medium font-sans">
              <span className="font-bold">Preview Notice:</span> The actual referral link and automated referral tracking become available only when the user's account is eligible for the real Agent Referral System.
            </Text>
          </View>
        </View>

        {/* Benefits of Becoming an Orbit AI Agent */}
        <View className="border border-slate-200 rounded-2xl p-5 bg-white space-y-3.5 text-left">
          <Text className="text-sm font-bold text-black uppercase tracking-wider font-sans border-b border-slate-100 pb-2">
            AGENT PROGRAM BENEFITS
          </Text>

          <View className="space-y-3">
            <View className="flex flex-row items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-black flex-shrink-0 mt-0.5" />
              <View className="flex-1">
                <Text className="text-xs font-bold text-black font-sans">Direct Commission Earnings</Text>
                <Text className="text-[11px] text-slate-600 font-sans">
                  Earn R10 for every verified Pro subscription referred through your link.
                </Text>
              </View>
            </View>

            <View className="flex flex-row items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-black flex-shrink-0 mt-0.5" />
              <View className="flex-1">
                <Text className="text-xs font-bold text-black font-sans">Automated Tracking</Text>
                <Text className="text-[11px] text-slate-600 font-sans">
                  Real-time referral attribution without manual bookkeeping or spreadsheets.
                </Text>
              </View>
            </View>

            <View className="flex flex-row items-start gap-2.5">
              <CheckCircle className="w-4 h-4 text-black flex-shrink-0 mt-0.5" />
              <View className="flex-1">
                <Text className="text-xs font-bold text-black font-sans">Direct EFT Cashouts</Text>
                <Text className="text-[11px] text-slate-600 font-sans">
                  Withdraw accumulated earnings directly to your South African bank account once active.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Call to Action Container */}
        <View className="pt-2 pb-4 space-y-3">
          <TouchableOpacity 
            onClick={() => setMobileScreen("upgrade")}
            className="w-full py-4 border border-black rounded-xl bg-black hover:bg-slate-900 text-white flex flex-row items-center justify-center gap-2 cursor-pointer transition-colors shadow-sm"
          >
            <Text className="text-xs font-bold text-white font-sans uppercase tracking-wider">
              Upgrade to Orbit Pro to Unlock
            </Text>
            <ArrowRight className="w-4 h-4 text-white" />
          </TouchableOpacity>

          <TouchableOpacity 
            onClick={() => setMobileScreen("chat")}
            className="w-full py-3 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center cursor-pointer transition-colors"
          >
            <Text className="text-xs font-semibold text-slate-700 font-sans">
              Return to Chat
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
