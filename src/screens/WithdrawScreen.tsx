import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, TextInput } from '../components/ReactNativeShim';
import { ArrowLeft, AlertCircle, Building, User, Lock, Send } from '../components/Icons';
import { useAppState } from '../services/state';
import { WithdrawalRecord, WithdrawalStatus } from '../types';

export const WithdrawScreen: React.FC = () => {
  const { currentUser, setUsers, withdrawals, setWithdrawals, setMobileScreen } = useAppState();

  const [fullName, setFullName] = useState("");
  const [bankName, setBankName] = useState("First National Bank (FNB)");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleWithdraw = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;

    if (!fullName.trim() || !accountNumber.trim() || !accountHolder.trim() || !amount.trim()) {
      setError("Please complete all payout input credentials.");
      return;
    }

    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) {
      setError("Please submit a valid cash payout amount starting from R1.00");
      return;
    }

    if (value > (currentUser.balance || 0)) {
      setError(`Requested amount exceeds your current available earnings balance of R${currentUser.balance?.toFixed(2)}.`);
      return;
    }

    setError("");
    setLoading(true);

    setTimeout(() => {
      // 1. Log payment request in list with status PENDING
      const record: WithdrawalRecord = {
        id: "with-" + Date.now(),
        userId: currentUser.uid,
        userName: currentUser.name,
        userEmail: currentUser.email,
        fullName,
        bankName,
        accountNumber,
        accountHolder,
        amount: value,
        status: WithdrawalStatus.PENDING,
        timestamp: new Date().toISOString()
      };

      setWithdrawals(prev => [record, ...prev]);

      // 2. Subtract balance from current user
      setUsers(prev => prev.map(u => {
        if (u.uid === currentUser.uid) {
          const nextBal = (u.balance || 0) - value;
          return {
            ...u,
            balance: nextBal < 0 ? 0 : nextBal
          };
        }
        return u;
      }));

      setLoading(false);
      alert(`Withdrawal request of R${value.toFixed(2)} submitted successfully! It is pending administrator approval inside the Admin Dashboard.`);
      setMobileScreen("agent");
    }, 1200);
  };

  if (!currentUser) return null;

  return (
    <SafeAreaView className="bg-white flex flex-col h-full">
      {/* Header bar */}
      <View className="px-5 py-4 border-b border-slate-100 flex flex-row items-center justify-between">
        <View className="flex flex-row items-center gap-3">
          <TouchableOpacity 
            onClick={() => setMobileScreen("agent")}
            className="p-1.5 hover:bg-slate-50 rounded-full text-slate-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </TouchableOpacity>
          <Text className="text-base font-bold text-slate-800 tracking-tight">Withdrawal Form</Text>
        </View>

        <Text className="text-xs text-slate-400 font-bold font-mono">SA Payout bank</Text>
      </View>

      <ScrollView className="bg-slate-50 p-4" contentContainerClassName="space-y-4 pb-6">
        
        {/* Wallet disclaimer */}
        <View className="bg-white px-4 py-3 rounded-2xl border border-slate-100 flex flex-row justify-between items-center shadow-3xs">
          <Text className="text-xs text-slate-500 font-bold">Your Available Earnings:</Text>
          <Text className="text-sm font-black text-green-600">R{currentUser.balance?.toFixed(2) || "0.00"}</Text>
        </View>

        {error && (
          <View className="p-3 bg-red-50 border border-red-100 rounded-2xl flex flex-row items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <Text className="text-xs text-red-700 font-semibold">{error}</Text>
          </View>
        )}

        {/* Inputs */}
        <form onSubmit={handleWithdraw} className="space-y-3.5">
          <View className="space-y-1">
            <Text className="text-[9px] text-slate-400 font-bold uppercase tracking-wider pl-1.5">Payout Amount (ZAR)</Text>
            <View className="px-4.5 py-3 border border-slate-200 bg-white rounded-2xl">
              <TextInput 
                placeholder="e.g. 150.00"
                placeholderTextColor="#cbd5e1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                step="0.01"
                className="text-xs text-slate-850 font-semibold"
              />
            </View>
          </View>

          <View className="space-y-1">
            <Text className="text-[9px] text-slate-400 font-bold uppercase tracking-wider pl-1.5">EFT Bank Account Name</Text>
            <select
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 bg-white rounded-2xl text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-850 font-medium"
            >
              <option value="First National Bank (FNB)">First National Bank (FNB)</option>
              <option value="Standard Bank">Standard Bank</option>
              <option value="Nedbank">Nedbank</option>
              <option value="ABSA Bank">ABSA Bank</option>
              <option value="Capitec Bank">Capitec Bank</option>
              <option value="Discovery Bank">Discovery Bank</option>
              <option value="TymeBank">TymeBank</option>
            </select>
          </View>

          <View className="space-y-1">
            <Text className="text-[9px] text-slate-400 font-bold uppercase tracking-wider pl-1.5">Account Holder Name</Text>
            <View className="px-4.5 py-3 border border-slate-200 bg-white rounded-2xl flex flex-row items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              <TextInput 
                placeholder="e.g. Sipho Khumalo"
                placeholderTextColor="#cbd5e1"
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                className="text-xs text-slate-850"
              />
            </View>
          </View>

          <View className="space-y-1">
            <Text className="text-[9px] text-slate-400 font-bold uppercase tracking-wider pl-1.5">Account Number</Text>
            <View className="px-4.5 py-3 border border-slate-200 bg-white rounded-2xl flex flex-row items-center gap-2">
              <Building className="w-4 h-4 text-slate-400" />
              <TextInput 
                placeholder="e.g. 62890483921"
                placeholderTextColor="#cbd5e1"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                maxLength={14}
                className="text-xs text-slate-850 font-mono"
              />
            </View>
          </View>

          <View className="space-y-1">
            <Text className="text-[9px] text-slate-400 font-bold uppercase tracking-wider pl-1.5">Verifier Full Name</Text>
            <View className="px-4.5 py-3 border border-slate-200 bg-white rounded-2xl flex flex-row items-center gap-2">
              <User className="w-4 h-4 text-slate-400" />
              <TextInput 
                placeholder="e.g. Sipho S Khumalo"
                placeholderTextColor="#cbd5e1"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="text-xs text-slate-850"
              />
            </View>
          </View>

          <View className="pt-2">
            <TouchableOpacity 
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-2xl flex flex-row items-center justify-center gap-1.5 shadow-md shadow-blue-200"
            >
              <Send className="w-4 h-4 text-white" />
              <Text className="text-white text-xs font-bold font-sans">
                {loading ? "Registering Request..." : "Submit Payout Request"}
              </Text>
            </TouchableOpacity>
          </View>
        </form>
      </ScrollView>
    </SafeAreaView>
  );
};
