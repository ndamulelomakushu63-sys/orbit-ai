import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, TextInput } from '../components/ReactNativeShim';
import { ArrowLeft, LogOut, User, Lock, Bell, Shield, ChevronRight } from '../components/Icons';
import { useAppState } from '../services/state';
import { UserPlan } from '../types';
import { BottomNav } from '../components/BottomNav';

export const ProfileScreen: React.FC = () => {
  const { currentUser, setUsers, setMobileScreen, logout } = useAppState();

  // Settings states initialized from current user values
  const [nameVal, setNameVal] = useState(currentUser?.name || "");
  const [emailVal, setEmailVal] = useState(currentUser?.email || "");
  const [passcodeVal, setPasscodeVal] = useState(currentUser?.passcode || "");
  
  // Custom interactive toggles
  const [pushEnabled, setPushEnabled] = useState(true);
  const [dataPrivacyConsent, setDataPrivacyConsent] = useState(true);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  if (!currentUser) {
    return (
      <SafeAreaView className="bg-slate-50 flex flex-col h-full justify-between">
        <View className="px-5 py-4 bg-white border-b border-slate-100 flex flex-row items-center gap-3 select-none">
          <TouchableOpacity 
            onClick={() => setMobileScreen("chat")}
            className="p-1.5 hover:bg-slate-50 rounded-full text-slate-600 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </TouchableOpacity>
          <Text className="text-base font-bold text-slate-800 tracking-tight">Account Profile</Text>
        </View>

        <View className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6">
          <View className="w-14 h-14 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <User className="w-6 h-6 text-blue-600" />
          </View>
          <View className="space-y-2">
            <Text className="text-lg font-black text-slate-900 tracking-tight">Unlock Your Profile</Text>
            <Text className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
              Create a free account to customize your profile, save your chat conversations, and unlock more advanced features.
            </Text>
          </View>
          <View className="w-full max-w-xs space-y-3">
            <TouchableOpacity 
              onClick={() => setMobileScreen("register")}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-center text-xs font-bold shadow-xs cursor-pointer"
            >
              Create Free Account
            </TouchableOpacity>
            <TouchableOpacity 
              onClick={() => setMobileScreen("login")}
              className="w-full py-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-full text-center text-xs font-bold cursor-pointer"
            >
              Sign In
            </TouchableOpacity>
          </View>
        </View>

        <BottomNav id="profile_bottom_nav" />
      </SafeAreaView>
    );
  }

  const handleUpdateAccount = () => {
    if (!nameVal.trim() || !emailVal.trim()) {
      alert("Please enter a valid name and email address.");
      return;
    }

    setUsers(prev => prev.map(u => {
      if (u.uid === currentUser.uid) {
        return {
          ...u,
          name: nameVal,
          email: emailVal,
          passcode: passcodeVal
        };
      }
      return u;
    }));

    setUpdateSuccess(true);
    setTimeout(() => setUpdateSuccess(false), 3000);
    alert("Profile details and security settings saved successfully.");
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
          <Text className="text-base font-bold text-slate-800 tracking-tight">Account Profile</Text>
        </View>

        <TouchableOpacity 
          onClick={logout}
          className="p-1.5 bg-red-50 hover:bg-red-100 rounded-lg flex flex-row items-center gap-1.5 justify-center cursor-pointer text-red-600"
        >
          <LogOut className="w-4 h-4 text-red-650" />
          <Text className="text-xs text-red-655 font-bold font-sans">Sign Out</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 bg-slate-50 p-4" contentContainerClassName="space-y-4 pb-6">
        
        {/* AVATAR HERO CARD */}
        <View className="bg-white p-5 border border-slate-200/55 rounded-3xl flex flex-row items-center gap-4 shadow-2xs">
          <View className="w-11 h-11 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-blue-600">
            <User className="w-5 h-5 text-blue-600" />
          </View>
          <View className="flex-1 min-w-0 text-left">
            <Text className="text-sm font-bold text-slate-900 leading-tight block text-left truncate">{currentUser.name}</Text>
            <Text className="text-[10.5px] text-slate-450 mt-0.5 block text-left truncate font-medium">{currentUser.email}</Text>
            <View className="flex flex-row items-center gap-1.5 mt-2">
              <span className={`w-1.5 h-1.5 rounded-full ${currentUser.plan === UserPlan.PRO ? 'bg-amber-500 animate-pulse' : 'bg-slate-400'}`} />
              <Text className="text-[9px] text-slate-400 font-bold font-sans uppercase tracking-widest leading-none">
                Plan Level: {currentUser.plan}
              </Text>
            </View>
          </View>
        </View>

        {/* ACCOUNT SETTINGS FORM BOX */}
        <View className="bg-white p-5 border border-slate-200/55 rounded-3xl space-y-4 shadow-2xs">
          <Text className="text-xs font-bold text-slate-850 border-b border-slate-100 pb-2 block">Account Settings</Text>
          
          <View className="space-y-1.5 text-xs">
            <Text className="text-[9px] font-bold text-slate-450 uppercase tracking-widest pl-0.5">Edit Name</Text>
            <TextInput 
              placeholder="Your Full Name"
              value={nameVal}
              onChange={(e: any) => setNameVal(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:bg-white font-sans"
            />
          </View>

          <View className="space-y-1.5 text-xs">
            <Text className="text-[9px] font-bold text-slate-450 uppercase tracking-widest pl-0.5">Edit Email</Text>
            <TextInput 
              placeholder="Your Email Address"
              value={emailVal}
              onChange={(e: any) => setEmailVal(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 border border-slate-250 rounded-xl outline-none focus:border-blue-400 focus:bg-white font-sans"
            />
          </View>
        </View>

        {/* SECURITY CREDENTIALS GROUP */}
        <View className="bg-white p-5 border border-slate-200/55 rounded-3xl space-y-4 shadow-2xs">
          <View className="flex flex-row items-center gap-2 pb-2 border-b border-slate-100">
            <Lock className="w-4 h-4 text-slate-500" />
            <Text className="text-xs font-bold text-slate-805 tracking-tight font-sans">Security Settings</Text>
          </View>

          <View className="space-y-1.5 text-xs">
            <Text className="text-[9px] font-bold text-slate-450 uppercase tracking-widest pl-0.5">Password Passcode</Text>
            <TextInput 
              placeholder="Minimum 4 characters"
              value={passcodeVal}
              onChange={(e: any) => setPasscodeVal(e.target.value)}
              type="password"
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:bg-white font-mono"
            />
          </View>
        </View>

        {/* NOTIFICATION PREFERENCES */}
        <View className="bg-white p-5 border border-slate-200/55 rounded-3xl space-y-3.5 shadow-2xs">
          <View className="flex flex-row items-center gap-2 pb-2 border-b border-slate-100">
            <Bell className="w-4 h-4 text-slate-500" />
            <Text className="text-xs font-bold text-slate-805 tracking-tight font-sans">Notification Settings</Text>
          </View>

          <View className="flex flex-row justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-200/50">
            <View className="flex-1 pr-2">
              <Text className="text-[11px] font-semibold text-slate-750">System Notifications</Text>
              <Text className="text-[9px] text-slate-400 mt-0.5 leading-normal">Send automated task alerts and upgrade warnings</Text>
            </View>
            <button
              onClick={() => setPushEnabled(!pushEnabled)}
              className={`w-9 h-5 rounded-full transition duration-250 flex items-center p-0.5 cursor-pointer ${pushEnabled ? 'bg-blue-600 justify-end' : 'bg-slate-350 justify-start'}`}
            >
              <span className="w-4 h-4 bg-white rounded-full shadow-3xs" />
            </button>
          </View>
        </View>

        {/* PRIVACY CONSENTS */}
        <View className="bg-white p-5 border border-slate-200/55 rounded-3xl space-y-3.5 shadow-2xs">
          <View className="flex flex-row items-center gap-2 pb-2 border-b border-slate-100">
            <Shield className="w-4 h-4 text-slate-500" />
            <Text className="text-xs font-bold text-slate-805 tracking-tight font-sans">Privacy Settings</Text>
          </View>

          <View className="flex flex-row justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-200/50">
            <View className="flex-1 pr-2">
              <Text className="text-[11px] font-semibold text-slate-750">Anonymous Chat Processing</Text>
              <Text className="text-[9px] text-slate-400 mt-0.5 leading-normal">Permit processing prompts to speed up machine outputs</Text>
            </View>
            <button
              onClick={() => setDataPrivacyConsent(!dataPrivacyConsent)}
              className={`w-9 h-5 rounded-full transition duration-250 flex items-center p-0.5 cursor-pointer ${dataPrivacyConsent ? 'bg-blue-600 justify-end' : 'bg-slate-350 justify-start'}`}
            >
              <span className="w-4 h-4 bg-white rounded-full shadow-3xs" />
            </button>
          </View>
        </View>

        {/* SUBSCRIPTION QUICK LINK SHORTCUT */}
        <View className="bg-white p-5 border border-slate-200/55 rounded-3xl shadow-2xs space-y-2.5">
          <Text className="text-xs font-bold text-slate-800 uppercase tracking-widest pl-0.5 block">Billing Option Shortcut</Text>
          
          <TouchableOpacity 
            onClick={() => setMobileScreen("upgrade")}
            className="w-full p-4 border border-blue-150 bg-blue-50/5 hover:bg-blue-50/20 active:bg-blue-50/30 rounded-2xl flex flex-row justify-between items-center cursor-pointer text-left"
          >
            <View className="text-left">
              <Text className="text-xs font-bold text-blue-900 leading-tight block">Manage Active Plans</Text>
              <Text className="text-[9px] text-blue-700 mt-1 leading-normal block">Verify pricing bills, renewal cycles, and cancellation policy logs.</Text>
            </View>
            <ChevronRight className="w-4 h-4 text-blue-600 flex-shrink-0" />
          </TouchableOpacity>
        </View>

        {/* SAVE SUBMIT BUTTON */}
        <TouchableOpacity 
          onClick={handleUpdateAccount}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center justify-center text-xs shadow-3xs cursor-pointer font-sans"
        >
          Save All Credentials
        </TouchableOpacity>

        {updateSuccess && (
          <Text className="text-[10px] text-green-600 font-bold text-center">Settings saved correctly!</Text>
        )}

      </ScrollView>

      <BottomNav />

    </SafeAreaView>
  );
};
