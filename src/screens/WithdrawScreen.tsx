import React, { useState, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, TextInput } from '../components/ReactNativeShim';
import { ArrowLeft, AlertCircle, Building, User, Lock, Send, CheckCircle } from '../components/Icons';
import { useAppState } from '../services/state';
import { WithdrawalRecord, WithdrawalStatus } from '../types';
import { 
  supabase, 
  dbFetchRewardBalance, 
  dbUpsertRewardBalance, 
  dbFetchRewardSettings,
  dbInsertAuditLog,
  dbUpsertWithdrawal
} from '../services/supabase';

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
  const [dbAvailableBalance, setDbAvailableBalance] = useState<number | null>(null);
  const [minWithdrawalAmount, setMinWithdrawalAmount] = useState<number>(50);

  // Load latest balance from reward_balances table in Supabase
  useEffect(() => {
    if (!currentUser) return;

    let isMounted = true;
    const fetchFreshBalance = async () => {
      try {
        const settings = await dbFetchRewardSettings();
        if (settings && isMounted) {
          setMinWithdrawalAmount(settings.minWithdrawal || 50);
        }

        const balRecord = await dbFetchRewardBalance(currentUser.uid);
        const { data: profile } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', currentUser.uid)
          .single();

        if (isMounted) {
          const profileBal = Number(profile?.balance || 0);
          const rewardBal = Number(balRecord?.totalEarnings || profileBal);
          const maxBal = Math.max(profileBal, rewardBal);
          setDbAvailableBalance(maxBal);
        }
      } catch (err) {
        console.warn("Failed to load reward balance for withdrawal:", err);
      }
    };

    fetchFreshBalance();
  }, [currentUser?.uid]);

  const activeBalance = dbAvailableBalance !== null ? dbAvailableBalance : (currentUser?.balance || 0);

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
    if (isNaN(value) || value < minWithdrawalAmount) {
      setError(`Please submit a valid cash payout amount starting from R${minWithdrawalAmount}.00`);
      setSuccessMessage("");
      return;
    }

    if (value > activeBalance) {
      setError(`Requested amount exceeds your current available earnings balance of R${activeBalance.toFixed(2)}.`);
      setSuccessMessage("");
      return;
    }

    setError("");
    setSuccessMessage("");
    setLoading(true);

    try {
      // 1. Fetch the latest user reward_balance & profile balance directly from Supabase
      const balRecord = await dbFetchRewardBalance(currentUser.uid);
      const { data: profile, error: profileFetchErr } = await supabase
        .from('profiles')
        .select('balance')
        .eq('id', currentUser.uid)
        .single();

      if (profileFetchErr) {
        throw new Error(`Failed to verify latest wallet balance from database: ${profileFetchErr.message}`);
      }

      const latestProfileBal = Number(profile?.balance || 0);
      const latestRewardBal = Number(balRecord?.totalEarnings || latestProfileBal);
      const verifiedAvailableBal = Math.max(latestProfileBal, latestRewardBal);

      if (value > verifiedAvailableBal) {
        setError(`Requested amount exceeds your actual available balance of R${verifiedAvailableBal.toFixed(2)}.`);
        setSuccessMessage("");
        setLoading(false);
        return;
      }

      // 2. Prevent duplicate withdrawal requests in withdrawal_requests
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

      // 3. Save new row into withdrawal_requests table in Supabase
      const reqId = `with-${Date.now()}`;
      const newRecord: WithdrawalRecord = {
        id: reqId,
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

      await dbUpsertWithdrawal(newRecord);

      // 4. Update user's balance inside profiles & reward_balances in Supabase
      const nextBal = verifiedAvailableBal - value;
      const safeNextBal = nextBal < 0 ? 0 : nextBal;

      await supabase
        .from('profiles')
        .update({ balance: safeNextBal })
        .eq('id', currentUser.uid);

      await dbUpsertRewardBalance({
        userId: currentUser.uid,
        totalEarnings: safeNextBal,
        monthlyEarnings: Number(balRecord?.monthlyEarnings || 0),
        todayAdCount: Number(balRecord?.todayAdCount || 0),
        lastAdDate: new Date().toISOString().split('T')[0]
      });

      // 5. Audit log
      await dbInsertAuditLog(currentUser.uid, 'WITHDRAWAL_REQUESTED', {
        amount: value,
        bankName,
        requestId: reqId
      });

      // 6. Update local state
      setDbAvailableBalance(safeNextBal);
      setUsers(prev => prev.map(u => u.uid === currentUser.uid ? { ...u, balance: safeNextBal } : u));
      setWithdrawals(prev => [newRecord, ...prev]);

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
    <SafeAreaView className="bg-slate-50 flex flex-col h-full min-h-screen">
      {/* Header bar */}
      <View className="px-6 py-4 bg-white border-b border-slate-200/80 flex flex-row items-center justify-between sticky top-0 z-10">
        <View className="flex flex-row items-center gap-3">
          <TouchableOpacity 
            onClick={() => setMobileScreen("agent")}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition"
          >
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </TouchableOpacity>
          <View>
            <Text className="text-base font-bold text-slate-900 tracking-tight">Withdraw Funds</Text>
            <Text className="text-xs text-slate-500 font-medium">Agent Referral Payouts</Text>
          </View>
        </View>

        <View className="flex flex-row items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <Text className="text-xs font-semibold text-emerald-700">256-Bit Encrypted</Text>
        </View>
      </View>

      <ScrollView className="flex-1 p-4 sm:p-6" contentContainerClassName="max-w-2xl mx-auto w-full space-y-6 pb-12">
        
        {/* HERO BALANCE & PAYOUT AMOUNT CARD */}
        <View className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-800 space-y-5">
          <View className="flex flex-row items-center justify-between">
            <View className="space-y-1">
              <Text className="text-xs font-medium text-slate-400 uppercase tracking-wider">Available Earnings</Text>
              <Text className="text-3xl font-extrabold text-white tracking-tight font-sans">
                R{activeBalance.toFixed(2)}
              </Text>
            </View>
            <View className="px-3 py-1 bg-slate-800 border border-slate-700/80 rounded-xl text-right">
              <Text className="text-[10px] text-slate-400 uppercase font-semibold block">Min. Payout</Text>
              <Text className="text-xs font-bold text-slate-200">R{minWithdrawalAmount}.00</Text>
            </View>
          </View>

          {/* Amount Input inside Hero Card */}
          <View className="pt-2 border-t border-slate-800 space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Withdrawal Amount (ZAR)
            </label>
            <View className="relative flex flex-row items-center bg-slate-950 border border-slate-800 focus-within:border-blue-500 rounded-xl overflow-hidden transition">
              <span className="pl-4 pr-2 text-base font-bold text-slate-400 select-none">R</span>
              <TextInput 
                placeholder={`min ${minWithdrawalAmount}.00`}
                placeholderTextColor="#64748b"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                type="number"
                step="0.01"
                className="w-full py-3.5 pr-4 bg-transparent text-white text-base font-semibold focus:outline-none font-sans"
              />
            </View>
          </View>
        </View>

        {/* FEEDBACK BANNERS */}
        {successMessage && (
          <View className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-row items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <Text className="text-sm text-emerald-800 font-medium leading-snug">{successMessage}</Text>
          </View>
        )}

        {error && (
          <View className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex flex-row items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <Text className="text-sm text-rose-800 font-medium leading-snug">{error}</Text>
          </View>
        )}

        {/* PAYOUT DETAILS FORM */}
        <form onSubmit={handleWithdraw} className="space-y-6">
          
          {/* SECTION 1: DESTINATION BANK ACCOUNT */}
          <View className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
            <View className="flex flex-row items-center gap-2 pb-3 border-b border-slate-100">
              <Building className="w-4 h-4 text-blue-600" />
              <Text className="text-sm font-bold text-slate-900 tracking-tight">Destination Bank Account</Text>
            </View>

            <View className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Bank Name */}
              <View className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Bank Name
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 transition cursor-pointer"
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

              {/* Account Holder Name */}
              <View className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Account Holder Name
                </label>
                <View className="relative flex flex-row items-center bg-slate-50/80 border border-slate-200 focus-within:bg-white focus-within:border-blue-600 rounded-xl overflow-hidden transition">
                  <User className="w-4 h-4 text-slate-400 ml-4 shrink-0" />
                  <TextInput 
                    placeholder="e.g. Sipho Khumalo"
                    placeholderTextColor="#94a3b8"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    className="w-full py-3 px-3 bg-transparent text-sm font-medium text-slate-900 focus:outline-none font-sans"
                  />
                </View>
              </View>

              {/* Account Number */}
              <View className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Account Number
                </label>
                <View className="relative flex flex-row items-center bg-slate-50/80 border border-slate-200 focus-within:bg-white focus-within:border-blue-600 rounded-xl overflow-hidden transition">
                  <CreditCard className="w-4 h-4 text-slate-400 ml-4 shrink-0" />
                  <TextInput 
                    placeholder="e.g. 62890483921"
                    placeholderTextColor="#94a3b8"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    maxLength={14}
                    className="w-full py-3 px-3 bg-transparent text-sm font-semibold font-mono text-slate-900 focus:outline-none"
                  />
                </View>
              </View>

              {/* Branch Code */}
              <View className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Branch Code
                </label>
                <View className="relative flex flex-row items-center bg-slate-50/80 border border-slate-200 focus-within:bg-white focus-within:border-blue-600 rounded-xl overflow-hidden transition">
                  <Building className="w-4 h-4 text-slate-400 ml-4 shrink-0" />
                  <TextInput 
                    placeholder="e.g. 250655"
                    placeholderTextColor="#94a3b8"
                    value={branchCode}
                    onChange={(e) => setBranchCode(e.target.value)}
                    className="w-full py-3 px-3 bg-transparent text-sm font-semibold font-mono text-slate-900 focus:outline-none"
                  />
                </View>
              </View>

              {/* Account Type */}
              <View className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Account Type
                </label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50/80 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 transition cursor-pointer"
                >
                  <option value="Savings">Savings</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Transmission">Transmission</option>
                </select>
              </View>
            </View>
          </View>

          {/* SECTION 2: IDENTITY VERIFICATION */}
          <View className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
            <View className="flex flex-row items-center gap-2 pb-3 border-b border-slate-100">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <Text className="text-sm font-bold text-slate-900 tracking-tight">Identity Verification</Text>
            </View>

            <View className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Verifier Full Name
              </label>
              <View className="relative flex flex-row items-center bg-slate-50/80 border border-slate-200 focus-within:bg-white focus-within:border-blue-600 rounded-xl overflow-hidden transition">
                <User className="w-4 h-4 text-slate-400 ml-4 shrink-0" />
                <TextInput 
                  placeholder="e.g. Sipho S Khumalo"
                  placeholderTextColor="#94a3b8"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full py-3 px-3 bg-transparent text-sm font-medium text-slate-900 focus:outline-none font-sans"
                />
              </View>
              <Text className="text-[11px] text-slate-500 pt-1 leading-normal">
                Must match the legal account holder registered with your banking institution for EFT clearance.
              </Text>
            </View>
          </View>

          {/* SUBMIT BUTTON */}
          <View className="pt-2 space-y-3">
            <TouchableOpacity 
              type="submit"
              disabled={loading}
              className={`w-full py-4 rounded-xl flex flex-row items-center justify-center gap-2.5 transition cursor-pointer select-none font-semibold text-sm text-white shadow-sm ${
                loading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99]'
              }`}
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 text-white animate-spin" />
                  <Text className="text-white font-semibold">Processing Payout...</Text>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-white" />
                  <Text className="text-white font-semibold">Submit Payout Request</Text>
                </>
              )}
            </TouchableOpacity>

            <Text className="text-center text-xs text-slate-400 font-medium">
              Payouts are verified and dispatched directly to your SA bank account.
            </Text>
          </View>
        </form>
      </ScrollView>
    </SafeAreaView>
  );
};
