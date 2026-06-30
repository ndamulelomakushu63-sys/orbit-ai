import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, TextInput } from '../components/ReactNativeShim';
import { Compass, Mail, Lock, User, AlertCircle } from '../components/Icons';
import { useAppState } from '../services/state';
import { UserPlan, UserProfile, ReferralRecord } from '../types';
import { supabase, dbUpsertProfile } from '../services/supabase';

export const RegisterScreen: React.FC = () => {
  const { users, setUsers, referrals, setReferrals, setCurrentUser, setMobileScreen, invitedByCode } = useAppState();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignUp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password.trim() || !name.trim()) {
      setError("Please fill out all input credentials.");
      return;
    }
    if (password.length < 5) {
      setError("Password must be at least 5 characters.");
      return;
    }

    // Check if user already exists locally
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      setError("Email already registered. Tap Sign In.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // 1. Attempt Supabase Auth Sign Up
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
        options: {
          data: {
            name: name.trim()
          }
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      const registeredUid = data.user?.id || "usr-" + Date.now();
      const referralCodeSeed = "ORBIT-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const newProf: UserProfile = {
        uid: registeredUid,
        name: name.trim(),
        email: email.trim(),
        plan: UserPlan.FREE,
        subscription_status: 'free',
        chat_count_today: 0,
        image_count_today: 0,
        file_upload_count_today: 0,
        camera_upload_count_today: 0,
        last_reset_time: new Date().toISOString(),
        subscription_start_date: "",
        subscription_end_date: "",
        cancelled_at: "",
        refund_requested: false,
        refund_request_date: "",
        agentStatus: false,
        balance: 0,
        referralCode: referralCodeSeed,
        createdAt: new Date().toISOString()
      };

      // Trace invitedBy referral
      if (invitedByCode.trim()) {
        const matchReferrer = users.find(u => u.referralCode === invitedByCode.trim());
        if (matchReferrer) {
          newProf.referredBy = invitedByCode.trim();
          
          const newRefLog: ReferralRecord = {
            id: "ref-" + Date.now(),
            referrerId: matchReferrer.uid,
            referredUserId: registeredUid,
            referredName: name.trim(),
            reward: 10.00,
            status: "Pending", // Pending Pro upgrade balance trigger
            timestamp: new Date().toISOString()
          };
          setReferrals(prev => [newRefLog, ...prev]);
        }
      }

      // Upsert profile directly into Supabase Profiles
      await dbUpsertProfile(newProf);

      setUsers(prev => [newProf, ...prev]);
      setCurrentUser(newProf);
      setMobileScreen("chat");
    } catch (err: any) {
      console.warn("Supabase auth signUp error, falling back to local registration: ", err);
      // Fallback
      const referralCodeSeed = "ORBIT-" + Math.random().toString(36).substring(2, 8).toUpperCase();
      const newUid = "usr-" + Date.now();
      const newProf: UserProfile = {
        uid: newUid,
        name: name.trim(),
        email: email.trim(),
        plan: UserPlan.FREE,
        subscription_status: 'free',
        chat_count_today: 0,
        image_count_today: 0,
        file_upload_count_today: 0,
        camera_upload_count_today: 0,
        last_reset_time: new Date().toISOString(),
        subscription_start_date: "",
        subscription_end_date: "",
        cancelled_at: "",
        refund_requested: false,
        refund_request_date: "",
        agentStatus: false,
        balance: 0,
        referralCode: referralCodeSeed,
        createdAt: new Date().toISOString()
      };

      if (invitedByCode.trim()) {
        const matchReferrer = users.find(u => u.referralCode === invitedByCode.trim());
        if (matchReferrer) {
          newProf.referredBy = invitedByCode.trim();
          
          const newRefLog: ReferralRecord = {
            id: "ref-" + Date.now(),
            referrerId: matchReferrer.uid,
            referredUserId: newUid,
            referredName: name,
            reward: 10.00,
            status: "Pending",
            timestamp: new Date().toISOString()
          };
          setReferrals(prev => [newRefLog, ...prev]);
        }
      }

      setUsers(prev => [newProf, ...prev]);
      setCurrentUser(newProf);
      setMobileScreen("chat");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: 'select_account', // FORCES GOOGLE TO SHOW ACCOUNT PICKER EVERY TIME
            access_type: 'offline'
          }
        }
      });
      if (error) {
        console.error('Google login error:', error);
        setError(error.message);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Google Sign-In failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView className="bg-white flex-1 p-6 flex flex-col justify-between h-full">
      <View className="flex-1 flex flex-col items-center justify-center my-4 w-full">
        {/* Logo Icon */}
        <View className="w-14 h-14 rounded-3xl bg-blue-50 flex items-center justify-center mb-3 shadow-sm">
          <Compass className="w-8 h-8 text-blue-600 animate-spin-slow" />
        </View>
        <Text className="text-2xl font-black text-slate-900 tracking-tight font-sans">Orbit AI</Text>
        <Text className="text-slate-500 text-xs mt-0.5 mb-5 font-medium">Create your credentials</Text>

        {/* Continue with Google button */}
        <TouchableOpacity 
          disabled
          className="w-full py-3 border border-slate-200 rounded-full flex flex-row items-center justify-center gap-2.5 text-sm bg-white opacity-50 cursor-not-allowed shadow-2xs"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <Text className="font-sans font-bold text-slate-400 text-sm">Coming soon</Text>
        </TouchableOpacity>

        {/* Separator */}
        <View className="w-full flex flex-row items-center my-4">
          <View className="flex-1 h-px bg-slate-100" />
          <Text className="px-4 text-xs text-slate-300 font-bold uppercase tracking-widest bg-white">or</Text>
          <View className="flex-1 h-px bg-slate-100" />
        </View>

        {error && (
          <View className="w-full p-2.5 mb-3 bg-red-50 border border-red-100 rounded-2xl flex flex-row items-center gap-1.5 align-middle">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <Text className="text-xs text-red-700 font-semibold">{error}</Text>
          </View>
        )}

        {/* Inputs */}
        <View className="w-full space-y-3">
          <View className="w-full px-5 py-3 border border-slate-200 bg-white rounded-full flex flex-row items-center gap-2">
            <User className="w-4 h-4 text-slate-400" />
            <TextInput 
              type="text"
              placeholder="Display name"
              placeholderTextColor="#94a3b8"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-slate-800 text-sm"
            />
          </View>

          <View className="w-full px-5 py-3 border border-slate-200 bg-white rounded-full flex flex-row items-center gap-2">
            <Mail className="w-4 h-4 text-slate-400" />
            <TextInput 
              type="email"
              placeholder="Email address"
              placeholderTextColor="#94a3b8"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-slate-800 text-sm"
            />
          </View>

          <View className="w-full px-5 py-3 border border-slate-200 bg-white rounded-full flex flex-row items-center gap-2">
            <Lock className="w-4 h-4 text-slate-400" />
            <TextInput 
              type="password"
              placeholder="Password"
              placeholderTextColor="#94a3b8"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-slate-800 text-sm"
            />
          </View>

          {invitedByCode && (
            <View className="px-5 py-1 text-slate-400 text-[10px] text-center font-mono font-medium">
              Referral code active: <Text className="text-blue-600 font-bold font-mono">{invitedByCode}</Text>
            </View>
          )}
          
          <TouchableOpacity 
            onClick={() => handleSignUp()}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full mt-2 shadow-xs"
          >
            <Text className="text-white font-bold text-sm">Create account</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="text-center pt-2">
        <TouchableOpacity 
          onClick={() => { setError(""); setMobileScreen("login"); }}
          className="mx-auto"
        >
          <Text className="text-xs text-slate-500 font-medium">
            Already have an account? <Text className="text-blue-600 font-bold underline">Sign in</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
