import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView } from '../components/ReactNativeShim';
import { ArrowLeft, Bell, CheckCircle, Info, Calendar } from '../components/Icons';
import { useAppState } from '../services/state';

export const NotificationsScreen: React.FC = () => {
  const { notifications, setNotifications, setMobileScreen } = useAppState();
  const [filterType, setFilterType] = useState<'All' | 'system' | 'billing' | 'agent'>('All');

  const filteredNotifs = filterType === 'All' 
    ? notifications 
    : notifications.filter(n => n.type === filterType);

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    alert("All push alerts registered as read.");
  };

  const handleDeleteAll = () => {
    setNotifications([]);
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
          <Text className="text-base font-bold text-slate-800 tracking-tight">Notifications</Text>
        </View>

        {notifications.length > 0 && (
          <TouchableOpacity 
            onClick={handleMarkAllRead}
            className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer font-sans"
          >
            Mark all read
          </TouchableOpacity>
        )}
      </View>

      <ScrollView className="flex-1 bg-slate-50 p-4" contentContainerClassName="space-y-4 pb-6">
        
        {/* FILTER CATEGORIES */}
        <View className="flex flex-row gap-1.5 pb-1 select-none">
          {['All', 'system', 'billing', 'agent'].map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type as any)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider transition cursor-pointer ${
                filterType === type 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-slate-500 border border-slate-200/60 hover:bg-slate-50'
              }`}
            >
              {type === 'All' ? 'View All' : type}
            </button>
          ))}
        </View>

        {/* NOTIFICATIONS CONTAINER */}
        {filteredNotifs.length === 0 ? (
          <View className="p-8 bg-white border border-slate-200/50 rounded-3xl mt-4 items-center text-center space-y-2 select-none">
            <Bell className="w-8 h-8 text-slate-300" />
            <Text className="text-xs font-bold text-slate-700">All Quiet Here</Text>
            <Text className="text-[10px] text-slate-400 max-w-[200px] leading-relaxed">You have no unread notifications or system update alerts at this time.</Text>
          </View>
        ) : (
          <View className="space-y-2.5">
            {filteredNotifs.map((n) => (
              <View 
                key={n.id}
                className={`p-4 rounded-2xl border flex flex-col gap-1 transition ${
                  n.read 
                    ? 'bg-white border-slate-250/50' 
                    : 'bg-blue-50/5 border-blue-200 shadow-2xs'
                }`}
              >
                <View className="flex flex-row justify-between items-start gap-2">
                  <View className="flex flex-row gap-2 items-center">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${n.read ? 'bg-slate-350' : 'bg-blue-600 animate-pulse'}`} />
                    <Text className="text-xs font-bold text-slate-800 leading-tight">{n.title}</Text>
                  </View>
                  <Text className="text-[8px] font-mono text-slate-400 shrink-0">
                    {new Date(n.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </Text>
                </View>

                <Text className="text-[10.5px] text-slate-500 leading-relaxed font-sans mt-0.5">{n.message}</Text>
                
                <View className="flex flex-row justify-between items-center mt-2 pt-2 border-t border-slate-100">
                  <span className={`text-[8px] font-mono uppercase font-black px-1.5 py-0.5 border rounded-md ${
                    n.type === 'billing' 
                      ? 'bg-purple-50 text-purple-700 border-purple-100' 
                      : n.type === 'agent' 
                        ? 'bg-amber-50 text-amber-700 border-amber-100'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                  }`}>
                    {n.type}
                  </span>

                  {!n.read && (
                    <TouchableOpacity
                      onClick={() => {
                        setNotifications(prev => prev.map(notif => notif.id === n.id ? { ...notif, read: true } : notif));
                      }}
                      className="text-[9px] font-bold text-blue-500 hover:text-blue-700 cursor-pointer"
                    >
                      Dismiss alert
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}

            <TouchableOpacity 
              onClick={handleDeleteAll}
              className="text-center text-[10px] font-bold text-slate-400 hover:text-slate-600 py-3 block hover:underline cursor-pointer font-sans"
            >
              Clear all notifications
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>

    </SafeAreaView>
  );
};
