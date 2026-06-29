import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, TextInput } from '../components/ReactNativeShim';
import { ArrowLeft, CreditCard, AlertCircle, Calendar, Sparkles, Check, ChevronRight } from '../components/Icons';
import { useAppState } from '../services/state';
import { UserPlan } from '../types';

export const PaymentsScreen: React.FC = () => {
  const { 
    currentUser, 
    setUsers, 
    subscriptions, 
    setSubscriptions, 
    cardDetails, 
    setCardDetails, 
    setMobileScreen 
  } = useAppState();

  const [cardHolder, setCardHolder] = useState(cardDetails.cardholderName);
  const [cardNumber, setCardNumber] = useState(cardDetails.cardNumber);
  const [cardExpiry, setCardExpiry] = useState(cardDetails.expiry);
  const [cardCvv, setCardCvv] = useState(cardDetails.cvv);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!currentUser) return null;

  // Filter subscriptions matching this session user
  const userSubs = subscriptions.filter(s => s.userId === currentUser.uid);

  const handleUpdateCard = () => {
    if (!cardHolder.trim() || !cardNumber.trim() || !cardExpiry.trim() || !cardCvv.trim()) {
      alert("Please enter consistent billing details to update your banking vault.");
      return;
    }

    setCardDetails({
      cardNumber,
      expiry: cardExpiry,
      cvv: cardCvv,
      cardholderName: cardHolder
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
    alert("Bespoke secure payment threshold details updated.");
  };

  const handleCancelPremium = () => {
    if (confirm("Are you sure you want to cancel your active Pro tier subscription? You will be downgraded to the Free tier immediately according to the cancellation policy.")) {
      
      // Update plan to FREE in matching user collection
      setUsers(prev => prev.map(u => {
        if (u.uid === currentUser.uid) {
          return {
            ...u,
            plan: UserPlan.FREE
          };
        }
        return u;
      }));

      // Update matching subscription records
      setSubscriptions(prev => prev.map(s => {
        if (s.userId === currentUser.uid && s.status === 'Active') {
          return {
            ...s,
            status: 'Cancelled' as const
          };
        }
        return s;
      }));

      alert("Your subscription has been cancelled. If cancelled within 7 days from register, your refund is now processing.");
    }
  };

  return (
    <SafeAreaView className="bg-slate-50 flex flex-col h-full justify-between">
      
      {/* HEADER SECTION */}
      <View className="px-5 py-4 bg-white border-b border-slate-100 flex flex-row items-center justify-between select-none">
        <View className="flex flex-row items-center gap-3">
          <TouchableOpacity 
            onClick={() => setMobileScreen("chat")}
            className="p-1.5 hover:bg-slate-50 rounded-full text-slate-600 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </TouchableOpacity>
          <Text className="text-base font-bold text-slate-800 tracking-tight">Payments &amp; Billing</Text>
        </View>
      </View>

      <ScrollView className="flex-1 bg-slate-50 p-4" contentContainerClassName="space-y-4 pb-6">
        
        {/* CRITICAL 7-DAY CANCELLATION NOTICE HEADER */}
        <View className="bg-amber-50/70 p-4 border border-amber-200 rounded-3xl flex flex-row gap-3 shadow-3xs">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <View className="flex-1">
            <Text className="text-xs font-bold text-amber-900 leading-tight">V1 Cancellation Notice</Text>
            <Text className="text-[10.5px] text-amber-800 leading-normal mt-1 font-medium font-sans">
              "Subscriptions may be cancelled within 7 days according to the applicable cancellation policy."
            </Text>
          </View>
        </View>

        {/* ACTIVE PLAN INSIGHT VIEW */}
        <View className="bg-white p-5 border border-slate-200/55 rounded-3xl space-y-3.5 shadow-2xs">
          <View className="flex flex-row justify-between items-start pb-2.5 border-b border-slate-100">
            <View>
              <Text className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block font-sans">Corporate Tier Status</Text>
              <Text className="text-sm font-bold text-slate-900 leading-tight mt-1">{currentUser.plan} Plan Active</Text>
            </View>
            <span className={`text-[9px] font-bold px-2 py-0.5 border rounded-full ${
              currentUser.plan === UserPlan.PRO 
                ? 'bg-amber-50 text-amber-700 border-amber-200' 
                : 'bg-slate-50 text-slate-500 border-slate-200'
            }`}>
              {currentUser.plan === UserPlan.PRO ? 'PRO ACTIVE' : 'FREE USER'}
            </span>
          </View>

          {currentUser.plan === UserPlan.PRO ? (
            <View className="space-y-3 pt-1 text-xs">
              <View className="flex flex-row justify-between text-slate-500">
                <Text className="text-slate-450 font-medium">Billed Price</Text>
                <Text className="font-bold text-slate-800">R99.00 / month</Text>
              </View>

              <View className="flex flex-row justify-between text-slate-500">
                <Text className="text-slate-450 font-medium">Billing Frequency</Text>
                <Text className="font-bold text-slate-800">Monthly auto-renewal</Text>
              </View>

              <View className="flex flex-row justify-between text-slate-500">
                <Text className="text-slate-450 font-medium">Next Renewal Date</Text>
                <Text className="font-bold text-slate-800">
                  {new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}
                </Text>
              </View>

              <View className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                <TouchableOpacity 
                  onClick={handleCancelPremium}
                  className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl flex items-center justify-center font-bold text-xs cursor-pointer transition select-none"
                >
                  Cancel Active Subscription
                </TouchableOpacity>
                <Text className="text-[9px] text-slate-400 text-center leading-normal">Downgrade executes immediately. Balance checks follow standard refund frameworks.</Text>
              </View>
            </View>
          ) : (
            <View className="space-y-3 pt-1 text-xs select-none">
              <Text className="text-[11px] text-slate-500 leading-relaxed font-sans mt-0.5">
                Your profile is bound to the restricted free query threshold. Upgrade to unlock full high-priority features.
              </Text>
              <TouchableOpacity 
                onClick={() => setMobileScreen("upgrade")}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-bold rounded-xl flex items-center justify-center text-xs shadow-3xs cursor-pointer font-sans"
              >
                Change or Upgrade Plan
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* PAYMENT METHOD MANAGEMENT CARD CREDIT SECURED */}
        <View className="bg-white p-5 border border-slate-200/55 rounded-3xl space-y-4 shadow-2xs">
          <View className="flex flex-row items-center gap-2 pb-2.5 border-b border-slate-100">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <Text className="text-xs font-bold text-slate-900 tracking-tight font-sans">Card Vault &amp; Credentials</Text>
          </View>

          <View className="space-y-3">
            <View className="space-y-1">
              <Text className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Cardholder Name</Text>
              <TextInput 
                placeholder="Holder Name"
                value={cardHolder}
                onChange={(e: any) => setCardHolder(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:bg-white font-sans"
              />
            </View>

            <View className="space-y-1">
              <Text className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Card Number</Text>
              <TextInput 
                placeholder="Number String"
                value={cardNumber}
                onChange={(e: any) => setCardNumber(e.target.value)}
                className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:bg-white font-mono"
              />
            </View>

            <View className="grid grid-cols-2 gap-3">
              <View className="space-y-1">
                <Text className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Expiry Date</Text>
                <TextInput 
                  placeholder="MM/YY"
                  value={cardExpiry}
                  onChange={(e: any) => setCardExpiry(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:bg-white font-mono"
                />
              </View>

              <View className="space-y-1 text-xs">
                <Text className="text-[9px] font-bold uppercase tracking-widest text-slate-400 font-sans">CVV Codes</Text>
                <TextInput 
                  placeholder="321"
                  value={cardCvv}
                  onChange={(e: any) => setCardCvv(e.target.value)}
                  type="password"
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:bg-white font-mono"
                />
              </View>
            </View>

            <TouchableOpacity 
              onClick={handleUpdateCard}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center text-xs shadow-3xs cursor-pointer font-sans"
            >
              Update Vault Card
            </TouchableOpacity>

            {saveSuccess && (
              <Text className="text-[10px] text-green-600 text-center font-bold">Banking vault card credentials updated successfully.</Text>
            )}
          </View>
        </View>

        {/* PAYMENT INVOICES HISTORY */}
        <View className="space-y-2">
          <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Payment History Receipts</Text>
          
          {userSubs.length === 0 ? (
            <View className="p-5 bg-white border border-slate-200/50 rounded-2xl items-center text-center select-none">
              <Text className="text-xs font-bold text-slate-400 font-sans">No invoice records logged</Text>
              <Text className="text-[9px] text-slate-400 mt-0.5 max-w-[200px] leading-relaxed">Invoice statements appear dynamically upon premium upgrades.</Text>
            </View>
          ) : (
            <View className="bg-white border border-slate-200/50 rounded-3xl overflow-hidden divide-y divide-slate-100">
              {userSubs.map((sub) => (
                <View 
                  key={sub.id}
                  className="p-4 flex flex-row justify-between items-center bg-white"
                >
                  <View className="flex-1 min-w-0 text-left">
                    <Text className="text-[11px] font-bold text-slate-800 text-left">{sub.plan} Plan Premium Package</Text>
                    <Text className="text-[9.5px] text-slate-400 text-left mt-0.5 font-mono">
                      Date: {new Date(sub.createdAt).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}
                    </Text>
                  </View>

                  <View className="items-end shrink-0">
                    <Text className="text-xs font-mono font-black text-slate-800">R{sub.amount.toFixed(2)}</Text>
                    <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 border rounded mt-1 block ${
                      sub.status === 'Active' 
                        ? 'bg-green-50 text-green-700 border-green-150' 
                        : 'bg-red-50 text-red-700 border-red-150'
                    }`}>
                      {sub.status}
                    </span>
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
