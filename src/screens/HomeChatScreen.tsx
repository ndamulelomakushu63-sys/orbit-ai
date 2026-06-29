import React, { useState, useRef, useEffect } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, TextInput, ScrollView } from '../components/ReactNativeShim';
import { Sparkles, User, Send, RefreshCw, AlertCircle, Plus, Shield, Check, Image, Camera, FileText, MoreVertical, Orbit, Info } from '../components/Icons';
import { FormattedMessage } from '../components/FormattedMessage';
import { useAppState } from '../services/state';
import { UserPlan, ChatMessage } from '../types';
import { Reply, Trash2, X } from 'lucide-react';

export const HomeChatScreen: React.FC = () => {
  const { 
    currentUser, 
    chatMessages, 
    setChatMessages,
    setConversations,
    activeConversationId, 
    isAiTyping, 
    setMobileScreen, 
    triggerChatMessage,
    incrementUsageLimit,
    limitModalType,
    setLimitModalType
  } = useAppState();

  const [inputText, setInputText] = useState("");
  const [showAttachments, setShowAttachments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  // Custom interactive modal states
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

  // States for Reply and Delete features
  const [selectedMessageForMenu, setSelectedMessageForMenu] = useState<ChatMessage | null>(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState<ChatMessage | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const pressTimer = useRef<any>(null);

  const handlePressStart = (msg: ChatMessage) => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => {
      setSelectedMessageForMenu(msg);
      setShowActionMenu(true);
    }, 500);
  };

  const handlePressEnd = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  const scrollRef = useRef<HTMLDivElement>(null);

  const activeMessages = chatMessages.filter(m => m.conversationId === activeConversationId);

  // Auto scroll to latest replies
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, isAiTyping]);

  useEffect(() => {
    // Dismiss dropdown menu when clicking elsewhere
    const handleClickOutside = () => {
      // Small timeout to allow target clicks
      setTimeout(() => {
        // Just empty callback
      }, 100);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const msg = inputText;
    setInputText("");
    const replyId = replyingToMessage?.id;
    setReplyingToMessage(null);
    await triggerChatMessage(msg, replyId);
  };

  const subStatus = currentUser?.subscription_status;
  const isPro = subStatus === "pro_monthly" || subStatus === "pro_yearly";

  const handlePremiumRoute = (screen: string) => {
    setShowMenu(false);
    if (isPro) {
      setMobileScreen(screen);
    } else {
      setLimitModalType('premium');
    }
  };

  const handleSuggestionClick = async (suggestion: string) => {
    setInputText("");
    await triggerChatMessage(suggestion);
  };

  const handleAttachment = (type: string) => {
    setShowAttachments(false);

    let checkType: 'chat' | 'image' | 'file' | 'camera' = 'file';
    let modalToShow: 'chat' | 'image' | 'file' | 'camera' | 'premium' | null = null;

    if (type === "Camera" || type === "Photos") {
      checkType = 'camera';
      modalToShow = 'camera';
    } else if (type === "Document") {
      checkType = 'file';
      modalToShow = 'file';
    } else if (type === "AI Image") {
      checkType = 'image';
      modalToShow = 'image';
    }

    const check = incrementUsageLimit(checkType);
    if (!check.allowed) {
      setLimitModalType(modalToShow);
      return;
    }

    if (type === "AI Image") {
      const promptText = prompt("Enter prompt for AI Image generation (e.g., 'A modern Cape Town skyline at sunset'):");
      if (!promptText || !promptText.trim()) return;

      alert(`AI Image generation simulated successfully: "${promptText}"`);
      const fakeImageText = `[AI Generated Image: "${promptText}" - Resolution: 1024x1024]`;
      setInputText(prev => prev + (prev ? " " : "") + fakeImageText);
    } else {
      alert(`Active ${type} device integration opened in simulation mode.`);
      const fakeFileText = `[Attached: ${type.toUpperCase()}_FILE_${Math.floor(100 + Math.random() * 900)}.JPG]`;
      setInputText(prev => prev + (prev ? " " : "") + fakeFileText);
    }
  };

  const handleClearThread = () => {
    if (confirm("Clear all active messages in this chat conversation?")) {
      setChatMessages(prev => prev.filter(m => m.conversationId !== activeConversationId));
      setConversations(c => c.map(item => {
        if (item.id === activeConversationId) {
          return {
            ...item,
            lastMessage: "Conversation cleared.",
            timestamp: new Date().toISOString()
          };
        }
        return item;
      }));
      setShowMenu(false);
    }
  };

  return (
    <SafeAreaView className="bg-white flex flex-col h-full overflow-hidden justify-between relative">
      
      {/* WHATSAPP-STYLE HEADER BAR */}
      <View className="h-[52px] px-4 bg-white border-b border-slate-100 flex flex-row items-center justify-between select-none relative z-50">
        <Text className="font-bold text-[18px] text-[#1F1F1F] font-sans">Orbit AI</Text>

        {/* 3-DOT MENU TRIGGER */}
        <div className="relative">
          <TouchableOpacity 
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 text-slate-600 hover:bg-slate-50 rounded-full transition cursor-pointer"
            title="Menu Options"
          >
            <MoreVertical className="w-5 h-5" />
          </TouchableOpacity>

          {/* Absolute Popup Menu - drops directly below the 3-dot icon and is right-aligned */}
          {showMenu && (
            <div className="absolute right-0 top-full mt-[4px] w-[260px] bg-white border border-slate-200/85 rounded-2xl shadow-xl py-1 z-50 animate-fade-in text-left">
              <TouchableOpacity 
                onClick={() => handlePremiumRoute("agents")}
                className="px-4 h-[48px] flex flex-row items-center justify-start hover:bg-slate-50 cursor-pointer w-full text-left"
              >
                <Text className="text-[16px] font-medium text-[#1F1F1F] font-sans text-left w-full whitespace-nowrap">Agent Dashboard</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onClick={() => { setShowMenu(false); setMobileScreen("profile"); }}
                className="px-4 h-[48px] flex flex-row items-center justify-start hover:bg-slate-50 cursor-pointer w-full text-left"
              >
                <Text className="text-[16px] font-medium text-[#1F1F1F] font-sans text-left w-full whitespace-nowrap">Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onClick={() => { setShowMenu(false); setMobileScreen("upgrade"); }}
                className="px-4 h-[48px] flex flex-row items-center justify-start hover:bg-slate-50 cursor-pointer w-full text-left"
              >
                <Text className="text-[16px] font-medium text-[#1F1F1F] font-sans text-left w-full whitespace-nowrap">Payment / Billing</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onClick={() => handlePremiumRoute("side-hustle")}
                className="px-4 h-[48px] flex flex-row items-center justify-start hover:bg-slate-50 cursor-pointer w-full text-left"
              >
                <Text className="text-[16px] font-medium text-[#1F1F1F] font-sans text-left w-full whitespace-nowrap">AI Side Hustle Generator</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onClick={() => handlePremiumRoute("business-builder")}
                className="px-4 h-[48px] flex flex-row items-center justify-start hover:bg-slate-50 cursor-pointer w-full text-left"
              >
                <Text className="text-[16px] font-medium text-[#1F1F1F] font-sans text-left w-full whitespace-nowrap">AI Business Builder</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onClick={() => { setShowMenu(false); setMobileScreen("business"); }}
                className="px-4 h-[48px] flex flex-row items-center justify-start hover:bg-slate-50 cursor-pointer w-full text-left"
              >
                <Text className="text-[16px] font-medium text-[#1F1F1F] font-sans text-left w-full whitespace-nowrap">Business Mode</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onClick={() => { setShowMenu(false); handleClearThread(); }}
                className="px-4 h-[48px] flex flex-row items-center justify-start hover:bg-slate-50 cursor-pointer w-full text-left"
              >
                <Text className="text-[16px] font-medium text-[#1F1F1F] font-sans text-left w-full whitespace-nowrap">Clear Workspace</Text>
              </TouchableOpacity>
            </div>
          )}
        </div>
      </View>

      {/* FOOTER TO HEADER LAYOUT: 3 links above the chat window in a single horizontal row */}
      <View className="flex flex-row justify-center items-center py-2 bg-slate-50 border-b border-slate-100 gap-4 select-none">
        <TouchableOpacity onClick={() => setShowAbout(true)} className="py-0.5 px-1 hover:opacity-80">
          <Text className="text-[11px] text-slate-500 hover:text-slate-800 font-sans font-medium">About</Text>
        </TouchableOpacity>
        <Text className="text-[10px] text-slate-300">|</Text>
        <TouchableOpacity onClick={() => setShowPrivacy(true)} className="py-0.5 px-1 hover:opacity-80">
          <Text className="text-[11px] text-slate-500 hover:text-slate-800 font-sans font-medium">Privacy Policy</Text>
        </TouchableOpacity>
        <Text className="text-[10px] text-slate-300">|</Text>
        <TouchableOpacity onClick={() => setShowTerms(true)} className="py-0.5 px-1 hover:opacity-80">
          <Text className="text-[11px] text-slate-500 hover:text-slate-800 font-sans font-medium">Terms of Use</Text>
        </TouchableOpacity>
      </View>

      {/* WHATSAPP-STYLE PLAIN WHITE CHAT STREAM AREA */}
      <ScrollView 
         id="chat-scroll-wrapper"
         ref={scrollRef}
         className="bg-white flex-1 px-4 pt-1.5 pb-2"
         contentContainerClassName="space-y-2.5 pb-4"
         showsVerticalScrollIndicator={false}
       >
         {activeMessages.length === 0 ? (
           <View className="flex items-center justify-center text-center p-4 space-y-4 my-auto pt-4">
             <View className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center">
               <Orbit className="w-6 h-6 text-blue-500" />
             </View>
             <View className="space-y-1">
               <Text className="text-slate-900 font-bold text-sm">Orbit AI Chat Companion</Text>
               <Text className="text-slate-400 text-xs text-center px-4 leading-relaxed font-sans font-medium">
                 Ask coding questions, draft professional emails, analyze legal text, or plan business milestones. South Africa's dedicated companion engine is ready.
               </Text>
             </View>
             
             {/* Quick Starters / Suggestions without emojis */}
             <View className="grid grid-cols-2 gap-2 w-full pt-2 max-w-xs text-left">
              <TouchableOpacity 
                onClick={() => handleSuggestionClick("Draft a professional POPIA compliance checklist")}
                className="bg-slate-50 border border-slate-200/60 p-3 rounded-2xl text-[11px] leading-tight hover:border-blue-400 transition text-left cursor-pointer"
              >
                <Text className="text-[11px] text-slate-600 font-bold font-sans">POPIA quick list</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onClick={() => handleSuggestionClick("Write a python class for compounding interest rates")}
                className="bg-slate-50 border border-slate-200/60 p-3 rounded-2xl text-[11px] leading-tight hover:border-blue-400 transition text-left cursor-pointer"
              >
                <Text className="text-[11px] text-slate-600 font-bold font-sans">Write compound interest code</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onClick={() => handleSuggestionClick("Review a sample South African service level agreement outline")}
                className="bg-slate-50 border border-slate-200/60 p-3 rounded-2xl text-[11px] leading-tight hover:border-blue-400 transition text-left cursor-pointer"
              >
                <Text className="text-[11px] text-slate-600 font-bold font-sans">SLA document outline</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onClick={() => handleSuggestionClick("Draft cold business letters for Pretoria retail space")}
                className="bg-slate-50 border border-slate-200/60 p-3 rounded-2xl text-[11px] leading-tight hover:border-blue-400 transition text-left cursor-pointer"
              >
                <Text className="text-[11px] text-slate-600 font-bold font-sans">Business sales letter</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          activeMessages.map((msg, idx) => {
            const isError = msg.id.includes("-error");
            return (
              <View 
                key={msg.id || idx} 
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} w-full space-y-1`}
              >
                {/* WHATSAPP-STYLE MSG BUBBLE */}
                <View 
                  onMouseDown={() => handlePressStart(msg)}
                  onMouseUp={handlePressEnd}
                  onMouseLeave={handlePressEnd}
                  onTouchStart={() => handlePressStart(msg)}
                  onTouchEnd={handlePressEnd}
                  onTouchMove={handlePressEnd}
                  onContextMenu={(e: any) => {
                    e.preventDefault();
                    setSelectedMessageForMenu(msg);
                    setShowActionMenu(true);
                  }}
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl relative shadow-3xs cursor-pointer select-none transition-all active:scale-[0.98] ${
                    msg.role === 'user' 
                      ? 'bg-[#d9fdd3] rounded-tr-none' // WhatsApp Light Green bubble 
                      : isError 
                        ? 'bg-red-50 border border-red-150 rounded-tl-none'
                        : 'bg-slate-100 rounded-tl-none' // Recipient standard grey bubble
                  }`}
                >
                  {msg.replyToMessageId && (() => {
                    const parentMsg = chatMessages.find(m => m.id === msg.replyToMessageId);
                    if (!parentMsg) return null;
                    return (
                      <View className="mb-2 p-1.5 bg-black/5 rounded-lg border-l-4 border-blue-500 text-left select-none max-w-full">
                        <Text className="text-[9px] font-bold text-blue-600 block">
                          {parentMsg.role === 'user' ? 'You' : 'Orbit AI'}
                        </Text>
                        <Text className="text-[10px] text-slate-600 truncate block">
                          {parentMsg.message}
                        </Text>
                      </View>
                    );
                  })()}

                  {isError && (
                    <View className="flex flex-row items-center gap-1.5 mb-1.5 font-semibold text-red-900 border-b border-red-100 pb-1 align-middle">
                      <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0" />
                      <Text className="text-red-900 font-bold text-xs select-none font-sans">API Alert</Text>
                    </View>
                  )}
                  <FormattedMessage text={msg.message} isUser={msg.role === 'user'} />
                  
                  <Text className={`text-[8px] mt-1 block text-right font-mono ${msg.role === 'user' ? 'text-slate-500' : isError ? 'text-red-400' : 'text-slate-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>

                {isError && (
                  <TouchableOpacity
                    onClick={() => {
                      const lastUser = [...activeMessages].slice(0, activeMessages.indexOf(msg)).reverse().find(m => m.role === 'user');
                      if (lastUser) {
                        triggerChatMessage(lastUser.message);
                      } else {
                        const firstUser = activeMessages.find(m => m.role === 'user');
                        if (firstUser) triggerChatMessage(firstUser.message);
                      }
                    }}
                    className="flex flex-row items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-150 text-slate-700 rounded-full border border-slate-200 transition text-[9px] font-bold cursor-pointer ml-1 select-none font-sans active:opacity-75"
                  >
                    <RefreshCw className="w-2.5 h-2.5 text-slate-500" />
                    <span>Retry sending last prompt</span>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}

        {isAiTyping && (
          <View className="flex flex-row justify-start w-full">
            <View className="bg-slate-100 p-3 rounded-2xl rounded-tl-none flex flex-row gap-1 items-center shadow-3xs">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </View>
          </View>
        )}
      </ScrollView>

      {/* FLOATING ATTACHMENT ACTION MENU */}
      {showAttachments && (
        <View className="bg-slate-50 border-t border-slate-100 p-4 grid grid-cols-4 gap-2 animate-slide-up select-none shadow-inner">
          <TouchableOpacity 
            onClick={() => handleAttachment("Camera")}
            className="bg-white p-2.5 rounded-2xl border border-slate-200/70 hover:bg-slate-50 items-center justify-center flex flex-col gap-1 cursor-pointer"
          >
            <Camera className="w-5 h-5 text-slate-500" />
            <Text className="text-[9px] font-bold text-slate-600">Camera Roll</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onClick={() => handleAttachment("Photos")}
            className="bg-white p-2.5 rounded-2xl border border-slate-200/70 hover:bg-slate-50 items-center justify-center flex flex-col gap-1 cursor-pointer"
          >
            <Image className="w-5 h-5 text-slate-500" />
            <Text className="text-[9px] font-bold text-slate-600">Photo Library</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onClick={() => handleAttachment("Document")}
            className="bg-white p-2.5 rounded-2xl border border-slate-200/70 hover:bg-slate-50 items-center justify-center flex flex-col gap-1 cursor-pointer"
          >
            <FileText className="w-5 h-5 text-slate-500" />
            <Text className="text-[9px] font-bold text-slate-600">Browse Files</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onClick={() => handleAttachment("AI Image")}
            className="bg-white p-2.5 rounded-2xl border border-slate-200/70 hover:bg-slate-50 items-center justify-center flex flex-col gap-1 cursor-pointer"
          >
            <Sparkles className="w-5 h-5 text-blue-500" />
            <Text className="text-[9px] font-bold text-slate-600">AI Image</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* WHATSAPP-STYLE REPLY PREVIEW BAR */}
      {replyingToMessage && (
        <View className="px-4 py-2.5 bg-slate-100 border-t border-slate-200 flex flex-row items-center justify-between animate-fade-in select-none">
          <View className="border-l-4 border-blue-500 pl-2.5 text-left flex-1 max-w-[85%]">
            <Text className="text-[10px] font-black text-blue-600 block uppercase tracking-wider">
              {replyingToMessage.role === 'user' ? 'Replying to you' : 'Replying to Orbit AI'}
            </Text>
            <Text className="text-xs text-slate-600 truncate block mt-0.5 font-sans font-medium">
              {replyingToMessage.message}
            </Text>
          </View>
          <TouchableOpacity 
            onClick={() => setReplyingToMessage(null)}
            className="p-1.5 hover:bg-slate-200/60 rounded-full text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </TouchableOpacity>
        </View>
      )}

      {/* WHATSAPP WHITESPACE-OPTIMIZED INPUT BAR */}
      <View className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex flex-row items-center gap-2 select-none">
        
        {/* INPUT TIER CONTAINER */}
        <View className="flex-1 bg-white border border-slate-200/80 rounded-full px-3.5 py-1 flex flex-row items-center shadow-3xs">
          
          {/* Bottom-left INSIDE input bar: "+" plus icon */}
          <TouchableOpacity 
            onClick={() => setShowAttachments(!showAttachments)}
            className={`mr-2.5 p-1 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              showAttachments ? 'bg-slate-100 text-slate-800' : 'text-slate-450 hover:bg-slate-50'
            }`}
          >
            <Plus className="w-5 h-5" />
          </TouchableOpacity>

          {/* INPUT ELEMENT */}
          <TextInput 
            value={inputText}
            placeholder={isAiTyping ? "Orbit companion typing..." : "Message Orbit companion..."}
            placeholderTextColor="#94a3b8"
            onChange={(e: any) => setInputText(e.target.value)}
            disabled={isAiTyping}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            className="text-xs w-full outline-none py-1 bg-transparent font-sans text-slate-800"
          />
        </View>

        {/* GREEN CIRCULAR SEND BUTTON */}
        <TouchableOpacity 
          onClick={handleSend}
          disabled={!inputText.trim() || isAiTyping}
          className={`w-9.5 h-9.5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
            inputText.trim() && !isAiTyping ? 'bg-[#00a884] shadow-sm transform scale-100 active:scale-95' : 'bg-slate-250 select-none opacity-50'
          }`}
        >
          <Send className="w-4.5 h-4.5 text-white" />
        </TouchableOpacity>
      </View>

      {/* PORTAL TERMS OF USE MODAL */}
      {showTerms && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[9999] p-4 select-none animate-fade-in">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm border border-slate-200 shadow-xl max-h-[80%] flex flex-col justify-between text-left">
            <View className="text-left space-y-5">
              <Text className="text-2xl font-black text-slate-900 tracking-tight block text-left">Terms of Use</Text>
              
              <Text className="text-[12px] text-slate-700 leading-relaxed block text-left font-sans font-medium">
                You must be 13+ to use this app. Don't spam, harass, or post illegal stuff. Don't misuse the AI to break laws. Be respectful.
              </Text>

              <Text className="text-[12px] text-slate-700 leading-relaxed block text-left font-sans font-medium">
                We can suspend accounts that break rules. AI responses may be inaccurate. The app is provided "as is" with no guarantees. Use at your own risk.
              </Text>

              <Text className="text-[12px] text-slate-700 leading-relaxed block text-left font-sans font-medium">
                We may update these terms. Continued use means you accept changes. Contact support@orbitai.com for help.
              </Text>
            </View>
            <TouchableOpacity 
              onClick={() => setShowTerms(false)}
              className="mt-6 py-3 bg-black hover:bg-neutral-800 text-white rounded-xl text-center text-xs font-bold cursor-pointer"
            >
              Close
            </TouchableOpacity>
          </View>
        </div>
      )}

      {/* PORTAL PRIVACY POLICY MODAL */}
      {showPrivacy && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[9999] p-4 select-none animate-fade-in">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm border border-slate-200 shadow-xl max-h-[80%] flex flex-col justify-between text-left">
            <View className="text-left space-y-5">
              <Text className="text-2xl font-black text-slate-900 tracking-tight block text-left">Privacy Policy</Text>
              
              <Text className="text-[12px] text-slate-700 leading-relaxed block text-left font-sans font-medium">
                We only collect your name, mobile number, and messages to run the app. We never sell your data. Your chats and AI prompts are yours.
              </Text>

              <Text className="text-[12px] text-slate-700 leading-relaxed block text-left font-sans font-medium">
                We use basic security to protect your info. If you delete your account, we delete your data within 30 days.
              </Text>

              <Text className="text-[12px] text-slate-700 leading-relaxed block text-left font-sans font-medium">
                Questions? Email us at support@orbitai.com. By using the app, you agree to this policy.
              </Text>
            </View>
            <TouchableOpacity 
              onClick={() => setShowPrivacy(false)}
              className="mt-6 py-3 bg-black hover:bg-neutral-800 text-white rounded-xl text-center text-xs font-bold cursor-pointer"
            >
              Close
            </TouchableOpacity>
          </View>
        </div>
      )}

      {/* PORTAL ABOUT SYSTEM MODAL */}
      {showAbout && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[9999] p-4 select-none animate-fade-in">
          <View className="bg-white rounded-3xl p-6 w-full max-w-sm border border-slate-200 shadow-xl max-h-[80%] flex flex-col justify-between text-left">
            <View className="text-left space-y-5">
              <Text className="text-2xl font-black text-slate-900 tracking-tight block text-left">About</Text>
              
              <Text className="text-[12px] text-slate-700 leading-relaxed block text-left font-sans font-medium">
                Orbit AI is a smart assistant for daily tasks, quick answers, and creative help. Built to be fast, private, and always improving.
              </Text>

              <View className="mt-[24px]">
                <Text className="text-[12px] text-slate-500 font-sans font-medium block text-left">
                  Designed and founded by Ndamulelo Makushu Glen
                </Text>
              </View>
            </View>
            <TouchableOpacity 
              onClick={() => setShowAbout(false)}
              className="mt-6 py-3 bg-black hover:bg-neutral-800 text-white rounded-xl text-center text-xs font-bold cursor-pointer"
            >
              Close
            </TouchableOpacity>
          </View>
        </div>
      )}

      {/* LIMITS AND PREMIUM LOCK POPUPS */}
      {(() => {
        if (!limitModalType) return null;
        let title = "";
        let message = "";
        if (limitModalType === 'chat') {
          title = "Daily Free Limit Reached";
          message = "You have used all 20 free AI messages for today. Upgrade to Orbit Pro for unlimited AI chat, unlimited uploads, AI Business Builder, AI Side Hustle Generator, and Agent access. You may continue using your free messages again after 24 hours if you choose not to upgrade.";
        } else if (limitModalType === 'image') {
          title = "Image Limit Reached";
          message = "You have used your 2 free image generations for today. Upgrade to Orbit Pro for unlimited image generation. You may try again after 24 hours.";
        } else if (limitModalType === 'file') {
          title = "File Upload Limit Reached";
          message = "You have used your free file uploads for today. Upgrade to Orbit Pro for unlimited file uploads. You may try again after 24 hours.";
        } else if (limitModalType === 'camera') {
          title = "Upload Limit Reached";
          message = "You have used your free camera/photo uploads for today. Upgrade to Orbit Pro for unlimited uploads. You may try again after 24 hours.";
        } else if (limitModalType === 'premium') {
          title = "Orbit Pro Required";
          message = "Upgrade to Orbit Pro to unlock premium business tools, referral earnings, and unlimited AI access.";
        }

        return (
          <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[9999] p-4 select-none animate-fade-in">
            <View className="bg-white rounded-3xl p-6 w-full max-w-xs border border-slate-200/80 shadow-2xl flex flex-col justify-between text-left space-y-5">
              <View className="text-left space-y-2.5">
                <Text className="text-lg font-black text-slate-950 tracking-tight block text-left font-sans">
                  {title}
                </Text>
                <Text className="text-xs text-slate-600 leading-relaxed block text-left font-sans font-medium">
                  {message}
                </Text>
              </View>
              <View className="flex flex-col gap-2">
                <TouchableOpacity 
                  onClick={() => {
                    setLimitModalType(null);
                    setMobileScreen("upgrade");
                  }}
                  className="py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-center text-xs font-bold cursor-pointer transition active:scale-98"
                >
                  Upgrade to Pro
                </TouchableOpacity>
                <TouchableOpacity 
                  onClick={() => setLimitModalType(null)}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-center text-xs font-bold cursor-pointer transition"
                >
                  Maybe Later
                </TouchableOpacity>
              </View>
            </View>
          </div>
        );
      })()}

      {/* WHATSAPP-STYLE ACTION OPTIONS MENU OVERLAY */}
      {showActionMenu && selectedMessageForMenu && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[9999] p-4 select-none animate-fade-in">
          <View className="bg-white rounded-3xl p-5 w-full max-w-xs border border-slate-200/80 shadow-2xl flex flex-col space-y-4 text-left">
            <View className="border-b border-slate-100 pb-2.5">
              <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Message Options</Text>
              <Text className="text-xs text-slate-600 truncate mt-1 block">
                "{selectedMessageForMenu.message}"
              </Text>
            </View>
            <View className="flex flex-col gap-2">
              <TouchableOpacity 
                onClick={() => {
                  setReplyingToMessage(selectedMessageForMenu);
                  setShowActionMenu(false);
                  setSelectedMessageForMenu(null);
                }}
                className="flex flex-row items-center gap-3 py-3 px-4 hover:bg-slate-50 rounded-xl cursor-pointer transition"
              >
                <Reply className="w-4 h-4 text-blue-500" />
                <Text className="text-xs font-bold text-slate-800">Reply</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onClick={() => {
                  setShowActionMenu(false);
                  setShowDeleteConfirm(true);
                }}
                className="flex flex-row items-center gap-3 py-3 px-4 hover:bg-red-50 text-red-600 rounded-xl cursor-pointer transition"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
                <Text className="text-xs font-bold text-red-600">Delete</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onClick={() => {
                  setShowActionMenu(false);
                  setSelectedMessageForMenu(null);
                }}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-center text-xs font-bold cursor-pointer transition mt-2"
              >
                Cancel
              </TouchableOpacity>
            </View>
          </View>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {showDeleteConfirm && selectedMessageForMenu && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[9999] p-4 select-none animate-fade-in">
          <View className="bg-white rounded-3xl p-6 w-full max-w-xs border border-slate-200/80 shadow-2xl flex flex-col justify-between text-left space-y-5">
            <View className="text-left space-y-2.5">
              <Text className="text-lg font-black text-slate-950 tracking-tight block text-left font-sans">
                Delete Message?
              </Text>
              <Text className="text-xs text-slate-600 leading-relaxed block text-left font-sans font-medium">
                {selectedMessageForMenu.role === 'user' 
                  ? "This message will be permanently removed from this conversation."
                  : "Delete this AI response from the conversation?"}
              </Text>
            </View>
            <View className="flex flex-col gap-2">
              <TouchableOpacity 
                onClick={() => {
                  const idToDelete = selectedMessageForMenu.id;
                  setChatMessages(prev => prev.filter(m => m.id !== idToDelete));
                  setShowDeleteConfirm(false);
                  setSelectedMessageForMenu(null);
                  if (replyingToMessage?.id === idToDelete) {
                    setReplyingToMessage(null);
                  }
                }}
                className="py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl text-center text-xs font-bold cursor-pointer transition active:scale-98"
              >
                Delete
              </TouchableOpacity>
              <TouchableOpacity 
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedMessageForMenu(null);
                }}
                className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-center text-xs font-bold cursor-pointer transition"
              >
                Cancel
              </TouchableOpacity>
            </View>
          </View>
        </div>
      )}

    </SafeAreaView>
  );
};
