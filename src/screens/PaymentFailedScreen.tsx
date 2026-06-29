import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity } from '../components/ReactNativeShim';
import { XCircle, AlertCircle } from '../components/Icons';
import { useAppState } from '../services/state';

export const PaymentFailedScreen: React.FC = () => {
  const { setMobileScreen } = useAppState();

  return (
    <SafeAreaView className="bg-white flex items-center justify-center p-6 h-full">
      <View className="flex-1 items-center justify-center space-y-5 max-w-xs text-center">
        
        <View className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center border border-red-100">
          <XCircle className="w-12 h-12 text-red-500" />
        </View>

        <View className="space-y-1">
          <Text className="text-xl font-black text-slate-950 font-sans">Checkout Cancelled</Text>
          <Text className="text-xs text-slate-400 font-medium leading-relaxed">
            Your payment authorization session was declined or cancelled. No cash amounts were charged.
          </Text>
        </View>

        <TouchableOpacity 
          onClick={() => setMobileScreen("upgrade")}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-full shadow-xs"
        >
          <Text className="text-white text-xs font-bold font-sans">Retry checkout</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onClick={() => setMobileScreen("chat")}
          className="text-xs text-slate-500 hover:text-slate-800 font-bold underline"
        >
          <Text className="text-xs text-slate-500 font-bold underline font-sans">Go back to chat</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
