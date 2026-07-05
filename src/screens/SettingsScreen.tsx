import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView } from '../components/ReactNativeShim';
import { Shield, Sparkles, RefreshCw, AlertCircle, HardDrive, Check } from '../components/Icons';
import { useAppState } from '../services/state';
import { BottomNav } from '../components/BottomNav';

export const SettingsScreen: React.FC = () => {
  const { currentUser, setConversations, setChatMessages } = useAppState();
  const [modelType, setModelType] = useState<'flash' | 'pro'>('flash');
  const [temperature, setTemperature] = useState<number>(0.7);
  const [purgedSuccess, setPurgedSuccess] = useState(false);

  const handlePurgeHistory = () => {
    if (confirm("Are you sure you want to delete all local conversation history? This cannot be undone.")) {
      setConversations([]);
      setChatMessages([]);
      setPurgedSuccess(true);
      setTimeout(() => setPurgedSuccess(false), 3000);
      alert("Local chat history of conversations successfully purged.");
    }
  };

  if (!currentUser) return null;

  return (
    <SafeAreaView className="bg-slate-50 flex flex-col h-full justify-between">
      
      {/* HEADER SECTION */}
      <View className="px-5 py-4 bg-white border-b border-slate-100 flex flex-row items-center justify-between select-none">
        <Text className="text-base font-bold text-slate-800 tracking-tight">System Settings</Text>
      </View>

      <ScrollView className="flex-1 bg-slate-50 p-4" contentContainerClassName="space-y-4 pb-6">
        
        {/* MODEL COMPANION SETTINGS */}
        <View className="bg-white p-5 border border-slate-200/55 rounded-3xl space-y-4 shadow-2xs">
          <View className="flex flex-row items-center gap-2 pb-2.5 border-b border-slate-100">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <Text className="text-xs font-bold text-slate-900 tracking-tight">OpenAI Model Select</Text>
          </View>

          <View className="space-y-2">
            <TouchableOpacity 
              onClick={() => setModelType('flash')}
              className={`p-3.5 rounded-2xl border text-left flex flex-row items-center justify-between cursor-pointer ${
                modelType === 'flash' 
                  ? 'border-blue-500 bg-blue-50/5' 
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <View className="flex-1 text-left min-w-0 pr-2">
                <Text className="text-xs font-bold text-slate-800">GPT-4o mini</Text>
                <Text className="text-[10px] text-slate-450 mt-1">Consistently fast latencies and light resource consumption.</Text>
              </View>
              {modelType === 'flash' && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
            </TouchableOpacity>

            <TouchableOpacity 
              onClick={() => setModelType('pro')}
              className={`p-3.5 rounded-2xl border text-left flex flex-row items-center justify-between cursor-pointer ${
                modelType === 'pro' 
                  ? 'border-blue-500 bg-blue-50/5' 
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <View className="flex-1 text-left min-w-0 pr-2">
                <Text className="text-xs font-bold text-slate-800">GPT-4o</Text>
                <Text className="text-[10px] text-slate-450 mt-1">Deep analysis capabilities, recommended for complex debugging blocks.</Text>
              </View>
              {modelType === 'pro' && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
            </TouchableOpacity>
          </View>
        </View>

        {/* TEMPERATURE ADJUSTER COGNITIVE slider params */}
        <View className="bg-white p-5 border border-slate-200/55 rounded-3xl space-y-4 shadow-2xs">
          <View className="flex flex-row items-center justify-between pb-2 border-b border-slate-100">
            <Text className="text-xs font-bold text-slate-900 tracking-tight">AI Temperature (Creativity)</Text>
            <Text className="text-xs font-mono font-bold text-blue-600">{temperature.toFixed(1)}</Text>
          </View>

          <View className="flex flex-row justify-between gap-2">
            {[0.2, 0.7, 1.0].map((val) => (
              <button
                key={val}
                onClick={() => setTemperature(val)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  temperature === val 
                    ? 'bg-blue-600 text-white shadow-3xs' 
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-150'
                }`}
              >
                {val === 0.2 ? 'Conservative' : val === 0.7 ? 'Balanced' : 'Creative'}
              </button>
            ))}
          </View>
          <Text className="text-[10px] text-slate-400 leading-normal">
            Lower temperatures produce highly consistent answers. High creative values increase randomness and personality flair.
          </Text>
        </View>

        {/* MEMORY PURGE PORTAL PANEL */}
        <View className="bg-white p-5 border border-slate-200/55 rounded-3xl space-y-4 shadow-2xs">
          <View className="flex flex-row items-center gap-2 pb-2 border-b border-slate-100">
            <HardDrive className="w-4 h-4 text-slate-500" />
            <Text className="text-xs font-bold text-slate-900 tracking-tight">Storage &amp; Local Offline Logs</Text>
          </View>

          <View className="flex flex-col gap-2">
            <View className="flex flex-row justify-between items-center bg-slate-50 p-3 rounded-2xl border border-slate-200/50">
              <View>
                <Text className="text-xs font-bold text-slate-750">Cache Size</Text>
                <Text className="text-[9px] text-slate-450">Conversations stored inside the companion storage</Text>
              </View>
              <Text className="text-xs font-mono font-bold text-slate-700">62 KB</Text>
            </View>

            <TouchableOpacity 
              onClick={handlePurgeHistory}
              className="w-full py-2.5 hover:bg-red-50 text-red-650 border border-red-200 rounded-xl flex items-center justify-center font-bold text-xs cursor-pointer transition"
            >
              Purge Local History
            </TouchableOpacity>

            {purgedSuccess && (
              <Text className="text-[10px] text-green-600 text-center font-semibold">Local chat records permanently discarded.</Text>
            )}
          </View>
        </View>

        {/* SECURITY & AUTH METRICS */}
        <View className="bg-white p-5 border border-slate-200/55 rounded-3xl space-y-3 shadow-2xs">
          <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-0.5 block">Diagnostics</Text>
          
          <View className="space-y-2 text-xs">
            <View className="flex flex-row justify-between text-slate-500">
              <Text className="text-slate-450 font-medium">Core Engine Status</Text>
              <Text className="font-bold text-green-600">Active Online</Text>
            </View>
            <View className="flex flex-row justify-between text-slate-500">
              <Text className="text-slate-450 font-medium font-sans">V1 Release Target</Text>
              <Text className="font-mono font-bold text-slate-700">React Native 0.72</Text>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* BOTTOM NAV TABS */}
      <BottomNav />
    </SafeAreaView>
  );
};
