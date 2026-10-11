import React, { useEffect } from 'react';
import { View, Text, SafeAreaView } from '../components/ReactNativeShim';
import { useAppState } from '../services/state';

export const SplashScreen: React.FC = () => {
  const { currentUser, setMobileScreen } = useAppState();

  useEffect(() => {
    const timer = setTimeout(() => {
      setMobileScreen("home");
    }, 300);
    return () => clearTimeout(timer);
  }, [currentUser, setMobileScreen]);

  return (
    <SafeAreaView id="splash_screen" className="bg-[#0F0F0F] flex items-center justify-center h-full w-full select-none p-6 text-center">
      <View className="flex items-center justify-center space-y-2">
        <Text className="text-[32px] font-bold text-white font-sans tracking-tight block text-center">
          Orbit AI
        </Text>
        <Text className="text-xs text-slate-400 font-sans text-center max-w-xs">
          South Africa's AI Companion &amp; Productivity Ecosystem
        </Text>
      </View>
    </SafeAreaView>
  );
};
