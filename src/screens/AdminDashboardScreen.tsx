import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from '../components/ReactNativeShim';
import { 
  Building, User, Mail, DollarSign, Award, Briefcase, 
  Search, Check, XCircle, Trash2, Shield, Info, Smartphone 
} from '../components/Icons';
import { useAppState } from '../services/state';
import { UserPlan, WithdrawalStatus, UserProfile, WithdrawalRecord } from '../types';

export const AdminDashboardScreen: React.FC = () => {
  const { 
    users, 
    setUsers, 
    withdrawals, 
    setWithdrawals, 
    referrals, 
    subscriptions 
  } = useAppState();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "pro" | "agent">("all");

  // Metrics calculation
  const totalSubscribers = users.filter(u => u.plan === UserPlan.PRO).length;
  const estimatedMRR = totalSubscribers * 99.99;
  const totalPayoutPending = withdrawals
    .filter(w => w.status === WithdrawalStatus.PENDING)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalRewardsDistributed = users.reduce((acc, curr) => acc + (curr.balance || 0), 0);

  // Filtered Users
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          u.uid.includes(searchQuery);
    
    if (!matchesSearch) return false;
    if (filterType === "pro") return u.plan === UserPlan.PRO;
    if (filterType === "agent") return u.agentStatus === true;
    return true;
  });

  // Action: Approve withdrawal
  const handleApprove = (id: string, withdrawal: WithdrawalRecord) => {
    setWithdrawals(prev => prev.map(w => {
      if (w.id === id) return { ...w, status: WithdrawalStatus.APPROVED };
      return w;
    }));
    alert(`EFT payout of R${withdrawal.amount.toFixed(2)} to ${withdrawal.fullName} (${withdrawal.bankName}) was successfully approved!`);
  };

  // Action: Reject withdrawal (refunding wallet balances)
  const handleReject = (id: string, withdrawal: WithdrawalRecord) => {
    setWithdrawals(prev => prev.map(w => {
      if (w.id === id) return { ...w, status: WithdrawalStatus.REJECTED };
      return w;
    }));

    // Refund user balance
    setUsers(prev => prev.map(u => {
      if (u.uid === withdrawal.userId) {
        return {
          ...u,
          balance: (u.balance || 0) + withdrawal.amount
        };
      }
      return u;
    }));

    alert(`EFT payout of R${withdrawal.amount.toFixed(2)} for ${withdrawal.fullName} has been declined. Funds were refunded to their wallet.`);
  };

  // Action: Toggle pro subscription admin
  const handleTogglePro = (userId: string) => {
    setUsers(p => p.map(u => {
      if (u.uid === userId) {
        return {
          ...u,
          plan: u.plan === UserPlan.PRO ? UserPlan.FREE : UserPlan.PRO
        };
      }
      return u;
    }));
  };

  // Action: Toggle agent status admin
  const handleToggleAgent = (userId: string) => {
    setUsers(p => p.map(u => {
      if (u.uid === userId) {
        const nextAgent = !u.agentStatus;
        const refCode = nextAgent ? ("ORBIT-" + Math.random().toString(36).substring(2, 8).toUpperCase()) : "";
        return {
          ...u,
          agentStatus: nextAgent,
          referralCode: refCode
        };
      }
      return u;
    }));
  };

  return (
    <ScrollView className="bg-slate-50 min-h-screen px-6 py-8" contentContainerClassName="space-y-8 max-w-7xl mx-auto pb-16">
      
      {/* Title banner */}
      <View className="flex flex-row justify-between items-center bg-white border border-slate-200/60 p-6 rounded-3xl shadow-3xs">
        <View>
          <Text className="text-xl font-bold text-slate-900 tracking-tight flex flex-row items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <Text className="text-xl font-bold text-slate-900 font-sans">Orbit AI Cloud Console</Text>
          </Text>
          <Text className="text-xs text-slate-400 mt-1 font-medium leading-relaxed">
            Administrative monitoring and EFT bank payout clearance dashboard
          </Text>
        </View>

        <span className="text-[10px] bg-green-50 text-green-700 font-black px-2.5 py-1 rounded-full border border-green-100 uppercase tracking-widest font-sans font-mono animate-pulse">
          ● Secure Sync Online
        </span>
      </View>

      {/* Grid of four core dynamic KPI indicator widgets */}
      <View className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <View className="bg-white p-5 border border-slate-200/60 rounded-3xl shadow-3xs">
          <Text className="text-[10px] text-slate-400 font-black tracking-widest uppercase block font-sans">Total Users</Text>
          <Text className="text-2xl font-black text-slate-800 mt-1.5">{users.length}</Text>
          <Text className="text-[9px] text-slate-400 font-medium mt-1">Direct and Google linked profiles</Text>
        </View>

        <View className="bg-white p-5 border border-slate-200/60 rounded-3xl shadow-3xs">
          <Text className="text-[10px] text-slate-400 font-black tracking-widest uppercase block font-sans">Pro Subscribers</Text>
          <Text className="text-2xl font-black text-slate-800 mt-1.5">{totalSubscribers}</Text>
          <Text className="text-[9px] text-orange-600 font-medium mt-1">Constituting active subscriber targets</Text>
        </View>

        <View className="bg-white p-5 border border-slate-200/60 rounded-3xl shadow-3xs">
          <Text className="text-[10px] text-slate-400 font-black tracking-widest uppercase block font-sans">Estimated MRR</Text>
          <Text className="text-2xl font-black text-blue-600 mt-1.5">R{estimatedMRR.toFixed(2)}</Text>
          <Text className="text-[9px] text-slate-400 font-medium mt-1">Aggregated billed subscriptions</Text>
        </View>

        <View className="bg-white p-5 border border-slate-200/60 rounded-3xl shadow-3xs">
          <Text className="text-[10px] text-slate-400 font-black tracking-widest uppercase block font-sans">Pending Payouts</Text>
          <Text className={`text-2xl font-black mt-1.5 ${totalPayoutPending > 0 ? 'text-amber-500' : 'text-slate-500'}`}>
            R{totalPayoutPending.toFixed(2)}
          </Text>
          <Text className="text-[9px] text-slate-400 font-medium mt-1">Awaiting bank EFT dispatch triggers</Text>
        </View>
      </View>

      <View className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: User Profiles database table */}
        <View className="lg:col-span-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-5">
          <View className="flex flex-row flex-wrap justify-between items-center gap-4 border-b border-slate-200/60 pb-5">
            <View>
              <Text className="text-sm font-bold text-slate-850">Registered User Accounts</Text>
              <Text className="text-[11px] text-slate-400 mt-0.5">Control subscriptions and agency codes</Text>
            </View>

            {/* Filter buttons */}
            <View className="flex flex-row gap-2 bg-slate-50 p-1 border border-slate-200/60 rounded-2xl text-[11px]">
              <button 
                onClick={() => setFilterType("all")} 
                className={`px-3 py-1.5 rounded-xl font-bold ${filterType === 'all' ? 'bg-white text-slate-800 shadow-3xs border border-slate-150' : 'text-slate-400 hover:text-slate-800'}`}
              >
                All
              </button>
              <button 
                onClick={() => setFilterType("pro")} 
                className={`px-3 py-1.5 rounded-xl font-bold ${filterType === 'pro' ? 'bg-white text-slate-800 shadow-3xs border border-slate-150' : 'text-slate-400 hover:text-slate-805'}`}
              >
                Pro
              </button>
              <button 
                onClick={() => setFilterType("agent")} 
                className={`px-3 py-1.5 rounded-xl font-bold ${filterType === 'agent' ? 'bg-white text-slate-800 shadow-3xs border border-slate-150' : 'text-slate-400 hover:text-slate-805'}`}
              >
                Agents
              </button>
            </View>
          </View>

          {/* Search Bar */}
          <View className="w-full px-4 .5 py-3.5 border border-slate-200 bg-slate-50 rounded-2xl flex flex-row items-center gap-2.5">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by profile name, email, or credentials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-slate-800 outline-none w-full border-none p-0"
            />
          </View>

          {/* Table Container */}
          <View className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-1.5">User</th>
                  <th className="py-3 px-1.5">Email / RegDate</th>
                  <th className="py-3 px-1.5">Plan Tier</th>
                  <th className="py-3 px-1.5">Agency Details</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-350 font-medium">No accounts linked to match request.</td>
                  </tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.uid} className="hover:bg-slate-50/40">
                      <td className="py-3.5 px-1.5">
                        <Text className="font-bold text-slate-800 block truncate max-w-[130px]">{u.name}</Text>
                        <Text className="text-[9px] font-mono text-slate-400 block mt-0.5">{u.uid}</Text>
                      </td>
                      <td className="py-3.5 px-1.5">
                        <Text className="text-slate-500 font-medium block truncate max-w-[140px]">{u.email}</Text>
                        <Text className="text-[9px] text-slate-400 block mt-0.5 font-mono">{new Date(u.createdAt).toLocaleDateString()}</Text>
                      </td>
                      <td className="py-3.5 px-1.5">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          u.plan === UserPlan.PRO 
                            ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                            : 'bg-slate-100 text-slate-500 border border-slate-150'
                        }`}>
                          {u.plan}
                        </span>
                      </td>
                      <td className="py-3.5 px-1.5">
                        {u.agentStatus ? (
                          <View>
                            <Text className="text-xs font-mono font-bold text-slate-850 block">{u.referralCode}</Text>
                            <Text className="text-[9px] text-green-600 font-bold block mt-0.5">Bal: R{u.balance?.toFixed(2) || "0.00"}</Text>
                          </View>
                        ) : (
                          <Text className="text-[9px] text-slate-400 font-medium font-sans">Inactive</Text>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1">
                        <button 
                          onClick={() => handleTogglePro(u.uid)}
                          className="px-2 py-1 border border-slate-200 hover:bg-slate-100 rounded text-[9px] font-bold transition-all text-slate-650 cursor-pointer"
                        >
                          Toggle Pro
                        </button>
                        <button 
                          onClick={() => handleToggleAgent(u.uid)}
                          className="px-2 py-1 border border-slate-200 hover:bg-slate-100 rounded text-[9px] font-bold transition-all text-slate-650 cursor-pointer"
                        >
                          Toggle Agent
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </View>
        </View>

        {/* Right Column: EFT Payout Control clearance desk */}
        <View className="lg:col-span-4 space-y-6">
          <View className="bg-white border border-slate-200 rounded-3xl p-5 shadow-3xs space-y-4">
            <View className="border-b border-slate-105 pb-3">
              <Text className="text-sm font-bold text-slate-850">Payout clearance desk</Text>
              <Text className="text-[10px] text-slate-400 mt-0.5">Approve user cash withdrawal requests</Text>
            </View>

            <View className="space-y-3 max-h-[480px] overflow-y-auto">
              {withdrawals.length === 0 ? (
                <Text className="text-xs text-slate-400 text-center block py-10 font-medium">
                  No payout history registered in DB storage.
                </Text>
              ) : (
                withdrawals.map((w) => (
                  <View 
                    key={w.id} 
                    className={`p-4 border rounded-2xl flex flex-col space-y-2.5 ${
                      w.status === WithdrawalStatus.PENDING 
                        ? 'border-amber-200 bg-amber-50/25' 
                        : w.status === WithdrawalStatus.APPROVED 
                        ? 'border-slate-150 bg-slate-50/30' 
                        : 'border-red-150 bg-red-50/10'
                    }`}
                  >
                    <View className="flex flex-row justify-between items-start">
                      <View>
                        <Text className="text-xs font-bold text-slate-800 block">{w.fullName}</Text>
                        <Text className="text-[9px] text-slate-400 mt-0.5 block truncate max-w-[150px]">{w.userEmail}</Text>
                      </View>
                      <Text className="text-sm font-black text-slate-900">R{w.amount.toFixed(2)}</Text>
                    </View>

                    <View className="bg-white p-2.5 rounded-xl border border-slate-100 space-y-0.5 text-[10px] text-slate-500 font-mono">
                      <Text className="block truncate font-mono">Bank: {w.bankName}</Text>
                      <Text className="block truncate font-mono">Acc: {w.accountNumber}</Text>
                      <Text className="block truncate font-mono">Holder: {w.accountHolder}</Text>
                    </View>

                    <View className="flex flex-row justify-between items-center bg-white px-2 py-1.5 rounded-xl border border-slate-100">
                      <Text className="text-[9px] text-slate-400 font-bold uppercase tracking-widest font-sans">Status:</Text>
                      <span className={`text-[9px] font-black uppercase text-right tracking-wider font-sans ${
                        w.status === WithdrawalStatus.PENDING ? 'text-amber-600'
                        : w.status === WithdrawalStatus.APPROVED ? 'text-green-600'
                        : 'text-red-500'
                      }`}>
                        {w.status}
                      </span>
                    </View>

                    {w.status === WithdrawalStatus.PENDING && (
                      <View className="flex flex-row gap-2 pt-1">
                        <TouchableOpacity
                          onClick={() => handleApprove(w.id, w)}
                          className="flex-1 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[10px] font-black flex flex-row items-center justify-center gap-1 shadow-2xs"
                        >
                          <Check className="w-3 h-3 text-white" />
                          <Text className="text-white text-[10px] font-black font-sans leading-none">Approve Pay</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onClick={() => handleReject(w.id, w)}
                          className="flex-1 py-1.5 bg-red-50 hover:bg-red-100 text-red-650 rounded-xl text-[10px] font-black flex flex-row items-center justify-center gap-1"
                        >
                          <XCircle className="w-3 h-3 text-red-500" />
                          <Text className="text-red-600 text-[10px] font-black font-sans leading-none">Reject</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};
