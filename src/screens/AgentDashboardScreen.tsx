import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView } from '../components/ReactNativeShim';
import { ArrowLeft, Copy, TrendingUp, ChevronLeft, Calendar } from '../components/Icons';
import { useAppState } from '../services/state';

export const AgentDashboardScreen: React.FC = () => {
  const { currentUser, referrals, withdrawals, setMobileScreen } = useAppState();

  const handleCopyLink = () => {
    if (!currentUser) return;
    const refLink = `orbitai.co.za/ref=${currentUser.referralCode}`;
    navigator.clipboard.writeText(refLink);
    alert("Referral link copied to account clipboard!");
  };

  if (!currentUser) return null;

  // Filter activities corresponding only to our logged in agent profile
  const myReferrals = referrals.filter(r => r.referrerId === currentUser.uid);
  const myWithdrawals = withdrawals.filter(w => w.userId === currentUser.uid);

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
          <Text className="text-base font-bold text-slate-800 tracking-tight">Agent Dashboard</Text>
        </View>

        <View className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
      </View>

      <ScrollView className="bg-slate-50 p-4" contentContainerClassName="space-y-4 pb-6">
        
        {/* Core Wallet balances panel block matching image layout precisely */}
        <View className="bg-blue-600 rounded-3xl p-5 text-white flex flex-col justify-between shadow-md shadow-blue-200">
          <View>
            <Text className="text-[10px] text-white/70 font-bold uppercase tracking-widest block font-sans">Available Earnings</Text>
            <Text className="text-3xl font-black text-white mt-1 leading-none tracking-tight">
              R{currentUser.balance?.toFixed(2) || "0.00"}
            </Text>
          </View>

          <View className="flex flex-row justify-between items-center pt-5 mt-5 border-t border-white/20">
            <View>
              <Text className="text-[9px] text-white/60 font-bold uppercase tracking-wider block font-sans">Referral Count</Text>
              <Text className="text-base font-bold text-white mt-0.5">{myReferrals.length}</Text>
            </View>

            <TouchableOpacity 
              onClick={() => {
                if ((currentUser.balance || 0) <= 0) {
                  alert("You have an empty rewards wallet. Earn first before submitting withdrawals!");
                  return;
                }
                setMobileScreen("withdraw");
              }}
              className="px-4 py-2 bg-white text-blue-600 text-xs font-black rounded-full shadow-md shadow-blue-900/10"
            >
              <Text className="text-blue-600 text-xs font-extrabold font-sans">Withdraw Cash</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Copy Referrals interface box */}
        <View className="bg-white p-4 border border-slate-200/50 rounded-3xl space-y-2.5 shadow-2xs">
          <Text className="text-xs font-bold text-slate-800">Share your private website link. Earn R10 for every signup.</Text>
          <View className="flex flex-row items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl p-2">
            <Text className="text-xs text-slate-500 flex-1 truncate font-mono pl-1.5 font-medium">
              orbitai.co.za/ref={currentUser.referralCode}
            </Text>
          </View>
          <TouchableOpacity 
            onClick={handleCopyLink}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-2xl flex flex-row items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Copy className="w-4 h-4 text-white" />
            <Text className="text-xs font-bold text-white font-sans">Copy Your Invite Link</Text>
          </TouchableOpacity>
        </View>

        {/* Real-Time Referrals Log lists in visual Slate boxes */}
        <View className="bg-white border border-slate-200/50 rounded-3xl p-5 space-y-4 shadow-2xs">
          <View className="flex flex-row justify-between items-center">
            <Text className="text-xs font-bold text-slate-800 uppercase tracking-wider block font-sans">Recent Activity</Text>
            <Text className="text-[10px] text-slate-400 font-bold">{myReferrals.length + myWithdrawals.length} events</Text>
          </View>

          <View className="space-y-2.5">
            {myReferrals.length === 0 && myWithdrawals.length === 0 ? (
              <View className="items-center justify-center py-6">
                <Text className="text-xs text-slate-350 font-medium">No referral payouts triggered yet.</Text>
                <Text className="text-[10px] text-slate-300 mt-1 leading-normal text-center">
                  Invite your friends to try Orbit and get R10 rewards when they activate Pro!
                </Text>
              </View>
            ) : (
              // List all Referrals
              [
                ...myReferrals.map(ref => ({
                  id: ref.id,
                  type: "referral",
                  title: `Referral Signup: ${ref.referredName}`,
                  label: ref.status === 'Paid' ? `Earned R${ref.reward.toFixed(2)}` : 'Requires Pro Tier Upgrade',
                  sub: new Date(ref.timestamp).toLocaleDateString(),
                  amount: ref.reward,
                  amountText: `+R${ref.reward.toFixed(2)}`,
                  isPositive: true,
                  statusText: ref.status,
                  rawDate: new Date(ref.timestamp)
                })),
                ...myWithdrawals.map(wit => ({
                  id: wit.id,
                  type: "withdrawal",
                  title: `Withdrawal: ${wit.fullName}`,
                  label: `Drained to ${wit.bankName}`,
                  sub: new Date(wit.timestamp).toLocaleDateString(),
                  amount: wit.amount,
                  amountText: `-R${wit.amount.toFixed(2)}`,
                  isPositive: false,
                  statusText: wit.status,
                  rawDate: new Date(wit.timestamp)
                }))
              ]
              .sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime())
              .map((activity, idx) => (
                <View 
                  key={activity.id || idx}
                  className="flex flex-row justify-between items-center pb-3 border-b border-slate-50 last:border-b-0"
                >
                  <View className="flex-1 pr-2 min-w-0">
                    <Text className="text-xs font-bold text-slate-800 truncate block leading-tight">{activity.title}</Text>
                    <View className="flex flex-row gap-1.5 items-center mt-1">
                      <Text className="text-[9px] text-slate-400 font-mono font-semibold">{activity.sub}</Text>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <Text className="text-[9px] text-slate-400 font-sans truncate font-medium">{activity.label}</Text>
                    </View>
                  </View>

                  <View className="items-end shrink-0">
                    <Text className={`text-xs font-black font-sans ${activity.isPositive ? 'text-green-600' : 'text-slate-700'}`}>
                      {activity.amountText}
                    </Text>
                    
                    {/* Status badge */}
                    <Text className={`text-[8px] mt-0.5 block font-bold font-sans ${
                      activity.statusText === 'Paid' || activity.statusText === 'Approved' ? 'text-green-600'
                      : activity.statusText === 'Pending' ? 'text-amber-500'
                      : 'text-red-500'
                    }`}>
                      {activity.statusText}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
