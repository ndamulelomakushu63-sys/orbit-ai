import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity } from '../components/ReactNativeShim';
import { CheckCircle, Sparkles } from '../components/Icons';
import { useAppState } from '../services/state';

export const PaymentSuccessScreen: React.FC = () => {
  const { setMobileScreen } = useAppState();

  return (
    <SafeAreaView className="bg-white flex items-center justify-center p-6 h-full">
      <View className="flex-1 items-center justify-center space-y-5 max-w-xs text-center">
        
        {/* Celebration bubble */}
        <View className="relative">
          <View className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center border border-green-100 animate-pulse">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </View>
          <View className="absolute -top-1 -right-1 w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-bounce" />
          </View>
        </View>

        <View className="space-y-1">
          <Text className="text-xl font-black text-slate-950 font-sans">Payment Approved!</Text>
          <Text className="text-xs text-slate-400 font-medium leading-relaxed">
            Congratulations! You have successfully upgraded to the <Text className="text-blue-600 font-bold">Orbit AI Pro</Text> tier.
          </Text>
        </View>

        <View className="p-3 bg-slate-50 border border-slate-100 rounded-2xl">
          <Text className="text-[10px] text-slate-500 font-medium leading-relaxed">
            Your daily prompt limitations are removed. If referred by a friend, their R10 rewards have been instantly debited to their wallet sync balance.
          </Text>
        </View>

        <TouchableOpacity 
          onClick={() => setMobileScreen("chat")}
          className="w-full py-3 bg-slate-900 hover:bg-slate-950 text-white font-bold text-xs rounded-full shadow-xs"
        >
          <Text className="text-white text-xs font-bold font-sans">Return to Workspace</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
