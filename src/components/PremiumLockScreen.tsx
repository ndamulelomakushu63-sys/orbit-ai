import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity } from './ReactNativeShim';
import { ArrowLeft, Lock } from 'lucide-react';
import { useAppState } from '../services/state';

interface PremiumLockScreenProps {
  title?: string;
  description: string;
  backTo?: string; // Screen to go back to, e.g., "chat"
}

export const PremiumLockScreen: React.FC<PremiumLockScreenProps> = ({ 
  title = "Premium Feature", 
  description,
  backTo = "chat"
}) => {
  const { setMobileScreen } = useAppState();

  return (
    <SafeAreaView id="premium_lock_screen" className="bg-slate-50 flex flex-col h-full justify-between">
      {/* HEADER SECTION */}
      <View className="px-5 py-4 bg-white border-b border-slate-100 flex flex-row items-center justify-between select-none">
        <View className="flex flex-row items-center gap-3">
          <TouchableOpacity 
            onClick={() => setMobileScreen(backTo)}
            className="p-1.5 hover:bg-slate-50 rounded-full text-slate-600 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </TouchableOpacity>
          <Text className="text-base font-bold text-slate-800 tracking-tight">{title}</Text>
        </View>
      </View>

      {/* CENTERED LOCK CARD */}
      <View className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50">
        <View className="bg-white p-8 border border-slate-200/50 rounded-3xl space-y-6 shadow-sm max-w-sm w-full text-center flex flex-col items-center">
          
          {/* Lock Icon */}
          <View className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
            <Lock className="w-8 h-8 text-blue-600" />
          </View>

          {/* Texts */}
          <View className="space-y-2">
            <Text className="text-xl font-extrabold text-slate-900 tracking-tight font-sans">
              {title}
            </Text>
            <Text className="text-sm text-slate-500 leading-relaxed font-sans font-medium">
              {description}
            </Text>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            onClick={() => setMobileScreen("upgrade")}
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-full flex flex-row items-center justify-center gap-2 transition cursor-pointer select-none"
          >
            <Text className="text-white font-bold text-sm">Upgrade to Pro</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* PLACEHOLDER TO MATCH BOTTOMNAV HEIGHT OR WE CAN JUST DISPLAY THE FULL SCREEN */}
      <View className="h-1" />
    </SafeAreaView>
  );
};
