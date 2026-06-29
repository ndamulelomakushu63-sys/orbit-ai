import React, { useEffect } from 'react';
import { View, Text, SafeAreaView } from '../components/ReactNativeShim';
import { useAppState } from '../services/state';

export const SplashScreen: React.FC = () => {
  const { currentUser, setMobileScreen } = useAppState();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentUser) {
        setMobileScreen("chat");
      } else {
        setMobileScreen("login");
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [currentUser, setMobileScreen]);

  return (
    <SafeAreaView id="splash_screen" className="bg-[#0F0F0F] flex items-center justify-center h-full w-full select-none">
      <View className="flex items-center justify-center">
        <Text className="text-[32px] font-bold text-white font-sans tracking-tight block text-center">
          Orbit AI
        </Text>
      </View>
    </SafeAreaView>
  );
};
