import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, TextInput } from '../components/ReactNativeShim';
import { Compass, Mail, Lock, AlertCircle } from '../components/Icons';
import { useAppState } from '../services/state';
import { UserPlan, UserProfile } from '../types';
import { supabase, dbFetchProfiles } from '../services/supabase';

export const LoginScreen: React.FC = () => {
  const { users, setUsers, setCurrentUser, setMobileScreen } = useAppState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please provide both email and passcode.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // 1. Attempt real Supabase Auth sign in
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (!authError && data.user) {
        // Fetch profile
        const dbProfiles = await dbFetchProfiles();
        const match = dbProfiles?.find(u => u.uid === data.user.id);
        if (match) {
          setCurrentUser(match);
          setMobileScreen("chat");
          setIsLoading(false);
          return;
        }
      }

      // 2. If Supabase auth fails (e.g. invalid credentials or missing auth record), check local/demo accounts
      const match = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (match) {
        setCurrentUser(match);
        setError("");
        setMobileScreen("chat");
      } else {
        setError(authError?.message || "No profile linked to this email address.");
      }
    } catch (err: any) {
      console.warn("Supabase auth error, falling back to local: ", err);
      // Fallback
      const match = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (match) {
        setCurrentUser(match);
        setMobileScreen("chat");
      } else {
        setError("Sign in failed. No profile linked to this email address.");
      }
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
        <View className="w-14 h-14 rounded-3xl bg-blue-50 flex items-center justify-center mb-4 shadow-sm">
          <Compass className="w-8 h-8 text-blue-600 animate-spin-slow" />
        </View>
        <Text className="text-2xl font-black text-slate-900 tracking-tight font-sans">Orbit AI</Text>
        <Text className="text-slate-500 text-xs mt-1 font-medium tracking-wide uppercase">Clean Assistant Suite</Text>

        {/* Continue with Google button */}
        <TouchableOpacity 
          onClick={handleGoogleSignIn}
          className="w-full mt-6 py-3 border border-slate-200 rounded-full flex flex-row items-center justify-center gap-2.5 text-sm bg-white hover:bg-slate-50 shadow-2xs"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <Text className="text-slate-700 font-semibold text-sm">Continue with Google</Text>
        </TouchableOpacity>

        {/* Divider separator */}
        <View className="w-full flex flex-row items-center my-5">
          <View className="flex-1 h-px bg-slate-100" />
          <Text className="px-4 text-xs text-slate-300 font-bold uppercase tracking-widest bg-white">or</Text>
          <View className="flex-1 h-px bg-slate-100" />
        </View>

        {error && (
          <View className="w-full p-3 mb-4 bg-red-50 border border-red-100 rounded-2xl flex flex-row items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <Text className="text-xs text-red-700 font-semibold">{error}</Text>
          </View>
        )}

        {/* Form elements mimicking React Native wrapper structure */}
        <View className="w-full space-y-3.5">
          <View className="w-full px-5 py-3 border border-slate-200 bg-slate-50 rounded-full flex flex-row items-center gap-2">
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

          <View className="w-full px-5 py-3 border border-slate-200 bg-slate-50 rounded-full flex flex-row items-center gap-2">
            <Lock className="w-4 h-4 text-slate-400" />
            <TextInput 
              type="password"
              placeholder="Passcode"
              placeholderTextColor="#94a3b8"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-slate-800 text-sm"
            />
          </View>
          
          <TouchableOpacity 
            onClick={() => handleSignIn()}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full mt-2 shadow-xs"
          >
            <Text className="text-white font-bold text-sm">Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="pt-2 text-center">
        <TouchableOpacity 
          onClick={() => { setError(""); setMobileScreen("register"); }}
          className="mx-auto"
        >
          <Text className="text-xs text-slate-500 font-medium">
            New to Orbit AI? <Text className="text-blue-600 font-bold underline">Create accounts</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
