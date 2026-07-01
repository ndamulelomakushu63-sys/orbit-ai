import React from 'react';
import { View, Text, TouchableOpacity } from './ReactNativeShim';
import { Sparkles } from './Icons';
import { useAppState } from '../services/state';

export const BottomNav: React.FC = () => {
  const { mobileScreen, setMobileScreen } = useAppState();

  const tabs = [
    { id: 'chat', label: 'Chat', Icon: Sparkles },
  ];

  return (
    <View className="bg-white border-t border-slate-100 flex flex-row justify-around items-center py-2.5 pb-4 select-none">
      {tabs.map((tab) => {
        const isActive = mobileScreen === tab.id;
        const IconComponent = tab.Icon;

        return (
          <TouchableOpacity
            key={tab.id}
            onClick={() => setMobileScreen(tab.id)}
            className="flex flex-col items-center justify-center flex-1 py-1 cursor-pointer transition-all duration-150 active:scale-95 text-slate-400 group"
          >
            <View className={`p-1 rounded-xl transition-all duration-150 ${
              isActive 
                ? 'bg-blue-50 text-blue-600 scale-105' 
                : 'text-slate-450 group-hover:text-slate-700 hover:bg-slate-50'
            }`}>
              <IconComponent className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
            </View>
            <Text className={`text-[10px] mt-1 font-sans font-bold tracking-tight select-none ${
              isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
            }`}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};
