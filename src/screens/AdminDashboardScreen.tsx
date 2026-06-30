import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from '../components/ReactNativeShim';
import { 
  Building, User, Mail, DollarSign, Award, Briefcase, 
  Search, Check, XCircle, Trash2, Shield, Info, Smartphone 
} from '../components/Icons';
import { Edit3, Plus, X, MessageSquare, Tag, Camera, Upload, Trash, CheckCircle, RefreshCw } from 'lucide-react';
import { useAppState } from '../services/state';
import { UserPlan, WithdrawalStatus, UserProfile, WithdrawalRecord, ObdiLead, Business } from '../types';
import { dbUpsertObdiLead, dbDeleteObdiLead, dbUploadObdiPhoto } from '../services/supabase';

export const AdminDashboardScreen: React.FC = () => {
  const { 
    users, 
    setUsers, 
    withdrawals, 
    setWithdrawals, 
    referrals, 
    subscriptions,
    businesses,
    setBusinesses,
    businessRegistrations,
    setBusinessRegistrations,
    obdiLeads,
    setObdiLeads
  } = useAppState();

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "pro" | "agent">("all");
  
  // Business Admin states
  const [editingBusinessId, setEditingBusinessId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    category: '',
    townCity: '',
    specials: ''
  });

  // OBDI Leads Admin states
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [uploadingPhotoLeadId, setUploadingPhotoLeadId] = useState<string | null>(null);
  const [leadSearchQuery, setLeadSearchQuery] = useState("");
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>("all");
  const [leadEditForm, setLeadEditForm] = useState<Partial<ObdiLead>>({});

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

  // Business Admin Actions
  const handleApproveBusiness = (id: string, name: string) => {
    setBusinesses(prev => prev.map(b => {
      if (b.name === name || b.id === id) {
        return { ...b, isPublic: true };
      }
      return b;
    }));
    setBusinessRegistrations(prev => prev.map(r => {
      if (r.businessName === name || r.id === id) {
        return { ...r, status: 'approved' as const };
      }
      return r;
    }));
    alert(`Business "${name}" has been successfully approved and is now live in Orbit AI!`);
  };

  const handleRejectBusiness = (id: string, name: string) => {
    setBusinessRegistrations(prev => prev.map(r => {
      if (r.businessName === name || r.id === id) {
        return { ...r, status: 'rejected' as const };
      }
      return r;
    }));
    setBusinesses(prev => prev.map(b => {
      if (b.name === name || b.id === id) {
        return { ...b, isPublic: false };
      }
      return b;
    }));
    alert(`Business registration for "${name}" has been declined.`);
  };

  const handleToggleBusinessActive = (id: string) => {
    setBusinesses(prev => prev.map(b => {
      if (b.id === id) {
        const nextStatus = !b.isPublic;
        alert(`Business "${b.name}" listing has been ${nextStatus ? 'Activated (Live)' : 'Deactivated (Hidden)'}.`);
        return { ...b, isPublic: nextStatus };
      }
      return b;
    }));
  };

  const handleDeleteBusiness = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the business listing for "${name}"? This action is permanent.`)) {
      setBusinesses(prev => prev.filter(b => b.id !== id));
      alert(`Business listing "${name}" has been deleted.`);
    }
  };

  const handleStartEditBusiness = (b: any) => {
    setEditingBusinessId(b.id);
    setEditForm({
      name: b.name,
      description: b.description,
      category: b.category,
      townCity: b.townCity,
      specials: b.specials && b.specials.length > 0 ? b.specials.join(', ') : ''
    });
  };

  const handleSaveEditBusiness = () => {
    if (!editForm.name.trim() || !editForm.description.trim()) {
      alert("Name and description are required.");
      return;
    }
    setBusinesses(prev => prev.map(b => {
      if (b.id === editingBusinessId) {
        return {
          ...b,
          name: editForm.name,
          description: editForm.description,
          category: editForm.category,
          townCity: editForm.townCity,
          specials: editForm.specials.trim() ? editForm.specials.split(',').map(s => s.trim()) : []
        };
      }
      return b;
    }));
    setEditingBusinessId(null);
    alert("Business details updated successfully!");
  };

  // OBDI Leads Operations
  const handleStartEditLead = (lead: ObdiLead) => {
    setEditingLeadId(lead.id);
    setLeadEditForm({ ...lead });
  };

  const handleSaveEditLead = async () => {
    if (!leadEditForm.business_name || !leadEditForm.owner_name || !leadEditForm.address) {
      alert("Business Name, Owner Name, and Address are required!");
      return;
    }

    const updatedLead = leadEditForm as ObdiLead;
    
    // Save to Supabase
    const success = await dbUpsertObdiLead(updatedLead);
    if (success) {
      setObdiLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
      setEditingLeadId(null);
      alert("OBDI lead updated successfully in database!");

      // Auto-publish to standard directory businesses state if status is set to 'live'
      if (updatedLead.status === 'live') {
        const alreadyInDirectory = businesses.some(b => b.name === updatedLead.business_name);
        if (!alreadyInDirectory) {
          const newBiz: Business = {
            id: 'biz-' + Date.now(),
            name: updatedLead.business_name,
            ownerName: updatedLead.owner_name,
            description: updatedLead.ai_description || 'Professional local service registered via OBDI inspection portal.',
            category: 'Other', // default fallback
            townCity: updatedLead.address.split(',').pop()?.trim() || 'Thohoyandou',
            physicalAddress: updatedLead.address,
            phoneNumber: updatedLead.phone,
            whatsAppNumber: updatedLead.contact_phone || updatedLead.phone,
            email: updatedLead.email || '',
            openingHours: 'Mon - Fri: 08:00 - 17:00',
            socialMediaLinks: {},
            photos: extractPhotoUrls(updatedLead.notes || '').length > 0 ? [extractPhotoUrls(updatedLead.notes || '')[0]] : ['https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&auto=format&fit=crop&q=60'],
            specials: updatedLead.specials ? [updatedLead.specials] : [],
            isPublic: true,
            isPaid: true,
            createdAt: new Date().toISOString()
          };
          setBusinesses(prev => [newBiz, ...prev]);
          alert(`Lead published: "${updatedLead.business_name}" is now live in the Orbit AI explore directory!`);
        }
      }
    } else {
      alert("Failed to update lead in Supabase database.");
    }
  };

  const handleDeleteLead = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete the lead for "${name}" from Supabase?`)) {
      const success = await dbDeleteObdiLead(id);
      if (success) {
        setObdiLeads(prev => prev.filter(l => l.id !== id));
        alert("Lead deleted successfully!");
      } else {
        alert("Failed to delete lead from database.");
      }
    }
  };

  const handleUploadLeadPhoto = async (leadId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingPhotoLeadId(leadId);
    try {
      const filename = `lead_${leadId}_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
      const publicUrl = await dbUploadObdiPhoto(file, filename);

      if (publicUrl) {
        // Find current lead and append photo URL to notes field
        const targetLead = obdiLeads.find(l => l.id === leadId);
        if (targetLead) {
          const updatedNotes = `${targetLead.notes || ''}\nPhoto: ${publicUrl}`;
          const updatedLead = { ...targetLead, notes: updatedNotes, status: 'photos_uploaded' as const };
          
          const success = await dbUpsertObdiLead(updatedLead);
          if (success) {
            setObdiLeads(prev => prev.map(l => l.id === leadId ? updatedLead : l));
            alert("Professional photo uploaded and saved successfully to lead notes!");
          } else {
            alert("Photo uploaded but failed to update lead record in Supabase.");
          }
        }
      } else {
        alert("Upload to 'obdi-photos' bucket failed. Make sure bucket permissions are open.");
      }
    } catch (err) {
      console.warn("Upload handler error: ", err);
      alert("An error occurred during photo upload.");
    } finally {
      setUploadingPhotoLeadId(null);
    }
  };

  const extractPhotoUrls = (text: string): string[] => {
    if (!text) return [];
    const matches = text.match(/https?:\/\/[^\s,]+/g);
    return matches || [];
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

      {/* Business Mode Registrations & Directory Management section */}
      <View className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-5 text-left">
        <div className="border-b border-slate-200/60 pb-4 text-left">
          <Text className="text-sm font-bold text-slate-850">Business Directory Management</Text>
          <Text className="text-[11px] text-slate-400 mt-0.5">Approve registrations, edit listings, manage current specials and directory settings</Text>
        </div>

        <View className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Section 1: Business Registrations (Visits & Scheduling) */}
          <View className="space-y-4 text-left">
            <View className="bg-slate-50 p-3 rounded-2xl border border-slate-150">
              <Text className="text-xs font-black text-slate-800 uppercase tracking-wider block">Visit Schedules & Applications ({businessRegistrations.length})</Text>
              <Text className="text-[10px] text-slate-400 mt-0.5 font-sans leading-relaxed">
                R159 payments are verified automatically. Arrange physical or virtual interviews to finalize media profiles.
              </Text>
            </View>

            <View className="space-y-3 max-h-[380px] overflow-y-auto">
              {businessRegistrations.length === 0 ? (
                <View className="p-6 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl items-center text-center select-none">
                  <Building className="w-6 h-6 text-slate-300 mb-1" />
                  <Text className="text-[11px] font-bold text-slate-400 font-sans">No pending registrations</Text>
                </View>
              ) : (
                businessRegistrations.map(reg => (
                  <View key={reg.id} className="p-4 border border-slate-200 bg-slate-50/30 rounded-2xl space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <Text className="text-xs font-black text-slate-850 block">{reg.businessName}</Text>
                        <Text className="text-[9px] text-slate-400 font-sans mt-0.5 block">{reg.category} • {reg.townCity}</Text>
                      </div>
                      <span className={`text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded border ${
                        reg.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                        reg.status === 'approved' ? 'bg-green-50 text-green-600 border-green-200' :
                        'bg-red-50 text-red-500 border-red-200'
                      }`}>
                        {reg.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-sans">
                      <div className="bg-white p-2 rounded-xl border border-slate-100">
                        <span className="text-[8px] uppercase font-bold text-slate-400 block font-sans">Owner</span>
                        <span className="font-bold text-slate-700 truncate block font-sans">{reg.ownerName}</span>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-slate-100">
                        <span className="text-[8px] uppercase font-bold text-slate-400 block font-sans">Visit Date</span>
                        <span className="font-bold text-slate-700 block font-sans">{reg.preferredVisitDate}</span>
                      </div>
                    </div>

                    <div className="p-2 bg-white rounded-xl border border-slate-100 text-[10px] text-slate-500 font-sans">
                      <span className="text-[8px] uppercase font-bold text-slate-400 block font-sans">Contact info</span>
                      <div className="flex flex-col gap-0.5 mt-0.5 font-sans text-slate-600">
                        <span>Phone: {reg.phoneNumber}</span>
                        {reg.whatsAppNumber && <span>WhatsApp: {reg.whatsAppNumber}</span>}
                        <span>Email: {reg.email}</span>
                      </div>
                    </div>

                    {reg.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApproveBusiness(reg.id, reg.businessName)}
                          className="flex-1 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-[10px] font-black cursor-pointer shadow-3xs transition"
                        >
                          Approve & Go Live
                        </button>
                        <button
                          onClick={() => handleRejectBusiness(reg.id, reg.businessName)}
                          className="flex-1 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-[10px] font-bold cursor-pointer transition"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </View>
                ))
              )}
            </View>
          </View>

          {/* Section 2: Active Directory Listings */}
          <View className="space-y-4 text-left">
            <View className="bg-slate-50 p-3 rounded-2xl border border-slate-150">
              <Text className="text-xs font-black text-slate-800 uppercase tracking-wider block">Live Directory listings ({businesses.length})</Text>
              <Text className="text-[10px] text-slate-400 mt-0.5 font-sans leading-relaxed">
                Manage live descriptions, add/remove special discount tags, or change listing statuses.
              </Text>
            </View>

            <View className="space-y-3 max-h-[380px] overflow-y-auto">
              {businesses.map(b => (
                <View key={b.id} className="p-3 bg-white border border-slate-150 rounded-2xl space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <Text className="text-xs font-black text-slate-850 block">{b.name}</Text>
                      <Text className="text-[9.5px] text-slate-400 font-sans block">{b.category} • {b.townCity}</Text>
                    </div>
                    <span className={`text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded border ${
                      b.isPublic ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-slate-100 text-slate-400 border-slate-200'
                    }`}>
                      {b.isPublic ? 'Live' : 'Inactive'}
                    </span>
                  </div>

                  {b.specials && b.specials.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {b.specials.map((s, idx) => (
                        <span key={idx} className="text-[8.5px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-1.5 py-0.5 font-sans flex items-center gap-1">
                          <Tag className="w-2.5 h-2.5 text-amber-500" />
                          <span>{s}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 pt-1.5 border-t border-slate-100">
                    <button
                      onClick={() => handleToggleBusinessActive(b.id)}
                      className={`px-2.5 py-1 rounded-lg text-[9.5px] font-black cursor-pointer transition ${
                        b.isPublic ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-blue-600 text-white font-sans'
                      }`}
                    >
                      {b.isPublic ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleStartEditBusiness(b)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg text-[9.5px] font-black cursor-pointer transition flex items-center gap-1"
                    >
                      <Edit3 className="w-2.5 h-2.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteBusiness(b.id, b.name)}
                      className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-650 border border-red-200 rounded-lg text-[9.5px] font-black cursor-pointer transition ml-auto"
                    >
                      Delete
                    </button>
                  </div>
                </View>
              ))}
            </View>
          </View>

        </View>
      </View>

      {/* INLINE EDIT MODAL FOR BUSINESS DIRECTORY */}
      {editingBusinessId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative text-left">
            <button 
              onClick={() => setEditingBusinessId(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 text-left border-b border-slate-100 pb-2">
              <Text className="text-base font-black text-slate-900 leading-tight">Edit Business Listing</Text>
              <Text className="text-[11px] text-slate-400 font-sans">Modify public directory metadata.</Text>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">Business Name</label>
                <input 
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">Category</label>
                  <select
                    value={editForm.category}
                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-sans h-[38px]"
                  >
                    <option value="Restaurants">Restaurants</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Hotels & Lodges">Hotels & Lodges</option>
                    <option value="Cafes">Cafes</option>
                    <option value="Hair Salons">Hair Salons</option>
                    <option value="Barber Shops">Barber Shops</option>
                    <option value="Beauty">Beauty</option>
                    <option value="Car Wash">Car Wash</option>
                    <option value="Mechanics">Mechanics</option>
                    <option value="Clothing Stores">Clothing Stores</option>
                    <option value="Supermarkets">Supermarkets</option>
                    <option value="Pharmacies">Pharmacies</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Fitness & Gyms">Fitness & Gyms</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">Town / City</label>
                  <input 
                    type="text"
                    value={editForm.townCity}
                    onChange={(e) => setEditForm({ ...editForm, townCity: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-sans"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">Specials (comma separated)</label>
                <input 
                  type="text"
                  placeholder="e.g. Free softdrink, Buy 1 get 1 free"
                  value={editForm.specials}
                  onChange={(e) => setEditForm({ ...editForm, specials: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">Description</label>
                <textarea 
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-sans h-24 text-left"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  onClick={handleSaveEditBusiness}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-3xs transition"
                >
                  Save Listing Updates
                </button>
                <button 
                  onClick={() => setEditingBusinessId(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs cursor-pointer transition border border-slate-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OBDI REAL-TIME LEADS MANAGER (SUPABASE PIPELINE) */}
      <View className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-5 text-left">
        <div className="flex justify-between items-center border-b border-slate-200/60 pb-4">
          <div className="text-left">
            <Text className="text-sm font-bold text-slate-850 flex items-center gap-1.5">
              <Camera className="w-5 h-5 text-blue-600 animate-pulse" />
              <span>OBDI Business Registration & Media Pipeline</span>
            </Text>
            <Text className="text-[11px] text-slate-400 mt-0.5">
              Live inspection tracking, professional photo uploads, and database lead publishing
            </Text>
          </div>
          <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded-full border border-blue-100 font-mono">
            {obdiLeads.length} Total Leads
          </span>
        </div>

        {/* Filters and search for leads */}
        <View className="flex flex-col md:flex-row gap-3">
          <View className="flex-1 px-4 py-3 border border-slate-200 bg-slate-50 rounded-2xl flex flex-row items-center gap-2.5">
            <Search className="w-4 h-4 text-slate-400" />
            <input 
              type="text"
              placeholder="Search leads by business name, owner name, or address..."
              value={leadSearchQuery}
              onChange={(e) => setLeadSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-slate-800 outline-none w-full border-none p-0"
            />
          </View>

          <View className="flex flex-row gap-2 select-none overflow-x-auto no-scrollbar pb-1">
            {['all', 'new', 'paid_new', 'visit_needed', 'photos_uploaded', 'ready_to_publish', 'live', 'rejected'].map(status => (
              <button
                key={status}
                onClick={() => setLeadStatusFilter(status)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold tracking-wide whitespace-nowrap transition-all uppercase ${
                  leadStatusFilter === status 
                    ? 'bg-blue-600 text-white shadow-3xs' 
                    : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {status.replace('_', ' ')}
              </button>
            ))}
          </View>
        </View>

        {/* List of Leads */}
        <View className="space-y-4">
          {obdiLeads.filter(lead => {
            const matchesSearch = 
              lead.business_name.toLowerCase().includes(leadSearchQuery.toLowerCase()) ||
              lead.owner_name.toLowerCase().includes(leadSearchQuery.toLowerCase()) ||
              lead.address.toLowerCase().includes(leadSearchQuery.toLowerCase());
            
            if (!matchesSearch) return false;
            if (leadStatusFilter !== 'all' && lead.status !== leadStatusFilter) return false;
            return true;
          }).length === 0 ? (
            <View className="p-10 bg-slate-50 border border-dashed border-slate-200 rounded-3xl items-center text-center">
              <Camera className="w-8 h-8 text-slate-300 mb-2" />
              <Text className="text-xs font-bold text-slate-400 font-sans">No OBDI leads registered in this status</Text>
              <Text className="text-[10px] text-slate-400 mt-1 max-w-sm leading-relaxed">
                Leads are created instantly when customers complete their R159 registration payment in the Business Mode.
              </Text>
            </View>
          ) : (
            <View className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {obdiLeads.filter(lead => {
                const matchesSearch = 
                  lead.business_name.toLowerCase().includes(leadSearchQuery.toLowerCase()) ||
                  lead.owner_name.toLowerCase().includes(leadSearchQuery.toLowerCase()) ||
                  lead.address.toLowerCase().includes(leadSearchQuery.toLowerCase());
                
                if (!matchesSearch) return false;
                if (leadStatusFilter !== 'all' && lead.status !== leadStatusFilter) return false;
                return true;
              }).map(lead => {
                const photos = extractPhotoUrls(lead.notes || '');
                return (
                  <View key={lead.id} className="p-5 border border-slate-200 hover:border-slate-300 bg-slate-50/20 rounded-3xl space-y-4 shadow-3xs transition-all relative">
                    <div className="flex justify-between items-start gap-2">
                      <div className="text-left">
                        <Text className="text-sm font-black text-slate-850 block">{lead.business_name}</Text>
                        <Text className="text-[10px] text-slate-400 font-sans block mt-0.5">Owner: {lead.owner_name}</Text>
                      </div>
                      <span className={`text-[8px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                        lead.status === 'live' ? 'bg-green-50 text-green-600 border-green-200' :
                        lead.status === 'paid_new' ? 'bg-purple-50 text-purple-600 border-purple-200' :
                        lead.status === 'visit_needed' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                        lead.status === 'photos_uploaded' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' :
                        lead.status === 'ready_to_publish' ? 'bg-violet-50 text-violet-600 border-violet-200' :
                        lead.status === 'rejected' ? 'bg-red-50 text-red-500 border-red-200' :
                        'bg-blue-50 text-blue-600 border-blue-200'
                      }`}>
                        {lead.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-2xl border border-slate-100 text-xs text-slate-600 space-y-1 text-left">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans">
                        <Smartphone className="w-3.5 h-3.5 text-blue-500" />
                        <span>Contacts & Coordinates</span>
                      </div>
                      <Text className="block mt-1 font-sans">Phone: {lead.phone}</Text>
                      {lead.email && <Text className="block font-sans">Email: {lead.email}</Text>}
                      <Text className="block font-sans">Address: {lead.address}</Text>
                    </div>

                    <div className="p-3 bg-white rounded-2xl border border-slate-100 text-xs text-slate-600 text-left">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-sans mb-1">
                        <Info className="w-3.5 h-3.5 text-blue-500" />
                        <span>Visit Notes & Specials</span>
                      </div>
                      <Text className="block leading-relaxed font-sans">{lead.notes || 'No inspection notes added yet.'}</Text>
                      {lead.specials && (
                        <div className="mt-2 flex items-center gap-1.5 font-sans font-bold text-amber-700 bg-amber-50/50 p-1.5 rounded-lg border border-amber-100 text-[10px]">
                          <Tag className="w-3.5 h-3.5" />
                          <span>Special: {lead.specials}</span>
                        </div>
                      )}
                    </div>

                    {/* Photo upload gallery section */}
                    <div className="space-y-2">
                      <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400 block font-sans text-left">
                        Professional Photos ({photos.length})
                      </Text>
                      {photos.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {photos.map((url, idx) => (
                            <div key={idx} className="w-12 h-12 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 relative group">
                              <img src={url} alt="Lead Media" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              <a 
                                href={url} 
                                target="_blank" 
                                rel="noreferrer"
                                className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[8px] font-black uppercase font-sans"
                              >
                                View
                              </a>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <label className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-200 text-slate-600 rounded-xl font-bold text-[10px] shadow-3xs cursor-pointer select-none flex items-center justify-center gap-1.5 transition">
                          {uploadingPhotoLeadId === lead.id ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-600" />
                              <span>Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Camera className="w-3.5 h-3.5 text-slate-500" />
                              <span>Upload Photo</span>
                            </>
                          )}
                          <input 
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleUploadLeadPhoto(lead.id, e)}
                            className="hidden"
                            disabled={uploadingPhotoLeadId !== null}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => handleStartEditLead(lead)}
                        className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black cursor-pointer shadow-3xs transition text-center"
                      >
                        Edit / Publish
                      </button>
                      <button
                        onClick={() => handleDeleteLead(lead.id, lead.business_name)}
                        className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-650 rounded-xl text-[10px] font-black cursor-pointer transition"
                      >
                        Delete
                      </button>
                    </div>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* INLINE EDIT MODAL FOR OBDI LEADS */}
      {editingLeadId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative text-left">
            <button 
              onClick={() => setEditingLeadId(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1 text-left border-b border-slate-100 pb-2">
              <Text className="text-base font-black text-slate-900 leading-tight">Edit OBDI Lead</Text>
              <Text className="text-[11px] text-slate-400 font-sans">Update visit notes, promotional specials, and status.</Text>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">Business Name</label>
                <input 
                  type="text"
                  value={leadEditForm.business_name || ''}
                  onChange={(e) => setLeadEditForm({ ...leadEditForm, business_name: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">Owner Name</label>
                  <input 
                    type="text"
                    value={leadEditForm.owner_name || ''}
                    onChange={(e) => setLeadEditForm({ ...leadEditForm, owner_name: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">Lead Status</label>
                  <select
                    value={leadEditForm.status || ''}
                    onChange={(e) => setLeadEditForm({ ...leadEditForm, status: e.target.value as any })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-sans h-[38px]"
                  >
                    <option value="new">new</option>
                    <option value="paid_new">paid_new (Paid R159)</option>
                    <option value="visit_needed">visit_needed</option>
                    <option value="photos_uploaded">photos_uploaded</option>
                    <option value="ready_to_publish">ready_to_publish</option>
                    <option value="live">live (Publish to Orbit AI Directory)</option>
                    <option value="rejected">rejected</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">Contact Phone</label>
                  <input 
                    type="text"
                    value={leadEditForm.contact_phone || ''}
                    onChange={(e) => setLeadEditForm({ ...leadEditForm, contact_phone: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">Specials (e.g. 50% discount on cocktail)</label>
                  <input 
                    type="text"
                    value={leadEditForm.specials || ''}
                    onChange={(e) => setLeadEditForm({ ...leadEditForm, specials: e.target.value })}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-sans"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">Physical Address</label>
                <input 
                  type="text"
                  value={leadEditForm.address || ''}
                  onChange={(e) => setLeadEditForm({ ...leadEditForm, address: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-sans">Visit Notes & Media URLs</label>
                <textarea 
                  value={leadEditForm.notes || ''}
                  onChange={(e) => setLeadEditForm({ ...leadEditForm, notes: e.target.value })}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 font-sans h-24 text-left"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  onClick={handleSaveEditLead}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-3xs transition text-center"
                >
                  Save Lead Details
                </button>
                <button 
                  onClick={() => setEditingLeadId(null)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold text-xs cursor-pointer transition border border-slate-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ScrollView>
  );
};
