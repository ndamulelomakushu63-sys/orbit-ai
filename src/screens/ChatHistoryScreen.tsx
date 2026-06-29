import React from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView } from '../components/ReactNativeShim';
import { ArrowLeft, Trash2, Plus } from '../components/Icons';
import { useAppState } from '../services/state';

export const ChatHistoryScreen: React.FC = () => {
  const { 
    conversations, 
    setConversations, 
    activeConversationId, 
    setActiveConversationId, 
    chatMessages,
    setChatMessages,
    setMobileScreen, 
    createNewConversation 
  } = useAppState();

  const handleCreateNew = () => {
    const newId = createNewConversation();
    setMobileScreen("chat");
  };

  const handleDeleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Safety check - always keep at least one conversation
    if (conversations.length <= 1) {
      alert("You need to keep at least one chat logged in memory.");
      return;
    }

    const updated = conversations.filter(c => c.id !== id);
    setConversations(updated);

    // Delete corresponding messages
    const updatedMessages = chatMessages.filter(m => m.conversationId !== id);
    setChatMessages(updatedMessages);

    // Reset active matching conversation
    if (activeConversationId === id) {
      setActiveConversationId(updated[0].id);
    }
  };

  return (
    <SafeAreaView className="bg-white flex flex-col h-full">
      {/* Header bar and back control */}
      <View className="px-5 py-4 border-b border-slate-100 flex flex-row items-center justify-between">
        <View className="flex flex-row items-center gap-3">
          <TouchableOpacity 
            onClick={() => setMobileScreen("chat")}
            className="p-1.5 hover:bg-slate-50 rounded-full text-slate-600"
          >
            <ArrowLeft className="w-5 h-5" />
          </TouchableOpacity>
          <Text className="text-base font-bold text-slate-800 tracking-tight">Conversations history</Text>
        </View>

        <TouchableOpacity 
          onClick={handleCreateNew}
          className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg flex flex-row items-center gap-1 font-semibold"
        >
          <Plus className="w-4 h-4" />
          <Text className="text-xs text-blue-600 font-bold font-sans">New</Text>
        </TouchableOpacity>
      </View>

      {/* List content container */}
      <ScrollView className="bg-slate-50 p-4" contentContainerClassName="space-y-2 pb-6">
        {conversations.length === 0 ? (
          <View className="bg-white p-6 rounded-2xl border border-slate-100 items-center justify-center text-center">
            <Text className="text-xs text-slate-400 font-medium my-4">No historical conversations saved.</Text>
            <TouchableOpacity 
              onClick={handleCreateNew} 
              className="px-4 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-full"
            >
              <Text className="text-white text-xs leading-none">Create a Conversation</Text>
            </TouchableOpacity>
          </View>
        ) : (
          conversations.map((conv) => {
            const isSelected = activeConversationId === conv.id;
            return (
              <View
                key={conv.id}
                onClick={() => {
                  setActiveConversationId(conv.id);
                  setMobileScreen("chat");
                }}
                className={`p-4 bg-white border rounded-2xl flex flex-row justify-between items-center cursor-pointer transition-all active:opacity-75 hover:bg-slate-50/50 ${
                  isSelected ? 'border-blue-500 shadow-2xs ring-1 ring-blue-500/20' : 'border-slate-200/50'
                }`}
              >
                <View className="flex-1 min-w-0 pr-3">
                  <Text className={`text-xs font-bold truncate block ${isSelected ? 'text-blue-600' : 'text-slate-800'}`}>
                    {conv.title}
                  </Text>
                  <Text className="text-[10px] text-slate-400 font-medium truncate mt-1">
                    {conv.lastMessage || "No messages yet"}
                  </Text>
                  <Text className="text-[9px] text-slate-300 font-mono font-medium block mt-1.5">
                    {new Date(conv.timestamp).toLocaleDateString()} at {new Date(conv.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                <TouchableOpacity 
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                  className="p-1 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
                  title="Remove conversation"
                >
                  <Trash2 className="w-4 h-4" />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* System Helper Banner */}
      <View className="p-4 bg-white border-t border-slate-100 items-center">
        <Text className="text-[10px] text-slate-400 font-sans">
          Orbit cloud sync manages database models instantaneously.
        </Text>
      </View>
    </SafeAreaView>
  );
};
