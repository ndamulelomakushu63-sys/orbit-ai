import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, TextInput } from '../components/ReactNativeShim';
import { ArrowLeft, AlertCircle, Building, User, Lock, Send, CheckCircle } from '../components/Icons';
import { useAppState } from '../services/state';
import { WithdrawalRecord, WithdrawalStatus } from '../types';
import { supabase } from '../services/supabase';

// Configurable minimum withdrawal amount constant
const MIN_WITHDRAWAL_AMOUNT = 50;

export const WithdrawScreen: React.FC = () => {
  const { currentUser, setUsers, withdrawals, setWithdrawals, setMobileScreen } = useAppState();

  const [fullName, setFullName] = useState("");
  const [bankName, setBankName] = useState("First National Bank (FNB)");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountHolder, setAccountHolder] = useState("");
  const [amount, setAmount] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [accountType, setAccountType] = useState("Savings");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleWithdraw = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentUser) return;

    if (
      !fullName.trim() ||
      !bankName.trim() ||
      !accountNumber.trim() ||
      !accountHolder.trim() ||
      !amount.trim() ||
      !branchCode.trim() ||
      !accountType.trim()
    ) {
      setError("Please complete all payout input credentials.");
      setSuccessMessage("");
      return;
    }

    const value = parseFloat(amount);
    if (isNaN(value) || value < MIN_WITHDRAWAL_AMOUNT) {
      setError(`Please submit a valid cash payout amount starting from R${MIN_WITHDRAWAL_AMOUNT}.00`);
      setSuccessMessage("");
      return;
    }

    if (value > (currentUser.balance || 0)) {
      setError(`Requested amount exceeds your current available earnings balance of R${currentUser.balance?.toFixed(2)}.`);
      setSuccessMessage("");
      return;
    }

    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      // Fetch the latest user profile balance directly from Supabase to prevent race conditions or stale local balance bypasses
      const { data: profile, error: profileFetchErr } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', currentUser.uid)
        .single();

      if (profileFetchErr) {
        throw new Error(`Failed to verify latest wallet balance from database: ${profileFetchErr.message}`);
      }

      const latestSupabaseBalance = Number(profile?.balance || 0);

      if (value > latestSupabaseBalance) {
        setError(`Requested amount exceeds your actual available balance of R${latestSupabaseBalance.toFixed(2)}.`);
        setSuccessMessage("");
        setLoading(false);
        return;
      }

      // B: Prevent duplicate withdrawal requests
      // Check if user already has an active pending or approved withdrawal request in Supabase
      const { data: existing, error: checkErr } = await supabase
        .from('withdrawal_requests')
        .select('status')
        .eq('user_id', currentUser.uid)
        .in('status', ['Pending', 'Approved']);

      if (checkErr) {
        console.warn("Could not check duplicate requests on Supabase:", checkErr);
      } else if (existing && existing.length > 0) {
        setError("An existing withdrawal request is already being processed.");
        setSuccessMessage("");
        setLoading(false);
        return;
      }

      // Save new row into the withdrawal_requests table in Supabase
      const { data: insertData, error: dbErr } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: currentUser.uid,
          full_name: fullName,
          email: currentUser.email,
          amount: value,
          bank_name: bankName,
          account_holder: accountHolder,
          account_number: accountNumber,
          branch_code: branchCode,
          account_type: accountType,
          status: "Pending"
        })
        .select();

      if (dbErr) {
        throw dbErr;
      }

      // A: Update user's balance inside the profiles table in Supabase
      const nextBal = latestSupabaseBalance - value;
      const safeNextBal = nextBal < 0 ? 0 : nextBal;

      const { error: profileErr } = await supabase
        .from('profiles')
        .update({ balance: safeNextBal })
        .eq('id', currentUser.uid);

      if (profileErr) {
        throw profileErr;
      }

      // 1. Subtract balance from current user locally
      setUsers(prev => prev.map(u => {
        if (u.uid === currentUser.uid) {
          return {
            ...u,
            balance: safeNextBal
          };
        }
        return u;
      }));

      // 2. Add a record locally so transaction history still shows up in UI
      const generatedId = (insertData && insertData[0]?.id) || ("with-" + Date.now());
      const record: WithdrawalRecord = {
        id: generatedId,
        userId: currentUser.uid,
        userName: currentUser.name,
        userEmail: currentUser.email,
        fullName,
        bankName,
        accountNumber,
        accountHolder,
        amount: value,
        status: WithdrawalStatus.PENDING,
        timestamp: new Date().toISOString(),
        branchCode,
        accountType
      };
      setWithdrawals(prev => [record, ...prev]);

      setSuccessMessage("Withdrawal request submitted successfully.");
      alert("Withdrawal request submitted successfully.");

      // Clear the form
      setFullName("");
      setBankName("First National Bank (FNB)");
      setAccountNumber("");
      setAccountHolder("");
      setAmount("");
      setBranchCode("");
      setAccountType("Savings");
    } catch (err: any) {
      console.error("Supabase withdrawal save error:", err);
      setError(err.message || String(err));
      setSuccessMessage("");
    } finally {
      setLoading(false);
    }
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

        {successMessage && (
          <View className="p-3 bg-green-50 border border-green-100 rounded-2xl flex flex-row items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
            <Text className="text-xs text-green-700 font-semibold">{successMessage}</Text>
          </View>
        )}

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
            <Text className="text-[9px] text-slate-400 font-bold uppercase tracking-wider pl-1.5">Branch Code</Text>
            <View className="px-4.5 py-3 border border-slate-200 bg-white rounded-2xl flex flex-row items-center gap-2">
              <Building className="w-4 h-4 text-slate-400" />
              <TextInput 
                placeholder="e.g. 250655"
                placeholderTextColor="#cbd5e1"
                value={branchCode}
                onChange={(e) => setBranchCode(e.target.value)}
                className="text-xs text-slate-850 font-mono"
              />
            </View>
          </View>

          <View className="space-y-1">
            <Text className="text-[9px] text-slate-400 font-bold uppercase tracking-wider pl-1.5">Account Type</Text>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 bg-white rounded-2xl text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-850 font-medium"
            >
              <option value="Savings">Savings</option>
              <option value="Cheque">Cheque</option>
              <option value="Transmission">Transmission</option>
            </select>
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
