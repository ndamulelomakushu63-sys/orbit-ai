import React, { useState } from 'react';
import { View, Text, SafeAreaView, TouchableOpacity, ScrollView, TextInput } from '../components/ReactNativeShim';
import { ArrowLeft, HelpCircle, ChevronRight, Send, CheckCircle } from '../components/Icons';
import { useAppState } from '../services/state';

export const HelpSupportScreen: React.FC = () => {
  const { supportTickets, setSupportTickets, setMobileScreen } = useAppState();
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMsg, setTicketMsg] = useState('');
  
  // Interactive FAQ collapsible indexes
  const [expandedFaqIdx, setExpandedFaqIdx] = useState<number | null>(null);

  const faqs = [
    {
      q: "How do I secure the R10 referral rewards?",
      a: "Navigate to the Agents page and toggle to the Earning Agency tab. Once activated, copy your bespoke Orbit invite code. When referred users sign up and upgrade to a Pro tier, R10 is immediately wired onto your rewards profile balance."
    },
    {
      q: "Can I cancel my premium subscription at any time?",
      a: "Yes. Under our standard Version 1 cancellation policy, subscribers can register cancellations at any time. If submitted within 7 days of payment, you are fully eligible for a complete rebate of your subscription fee."
    },
    {
      q: "Which South African banking systems are supported?",
      a: "Our EFT rewards dispersion engine supports Standard Bank, First National Bank (FNB), Absa, Nedbank, Capitec, and TymeBank."
    }
  ];

  const handleCreateTicket = () => {
    if (!ticketSubject.trim() || !ticketMsg.trim()) {
      alert("Please supply both a clear subject and a message to post your help ticket.");
      return;
    }

    const newTicket = {
      id: "ticket-" + Date.now(),
      subject: ticketSubject,
      message: ticketMsg,
      status: "Open" as const,
      timestamp: new Date().toISOString()
    };

    setSupportTickets(prev => [newTicket, ...prev]);
    setTicketSubject('');
    setTicketMsg('');
    alert("Ticket lodged successfully! An Orbit AI technical engineer will reply inside this screen shortly.");

    // Simulate an offline staff resolution support reply in 4 seconds!
    setTimeout(() => {
      setSupportTickets(current => current.map(t => {
        if (t.id === newTicket.id) {
          return {
            ...t,
            status: "Resolved" as const,
            reply: "Thank you for contacting Orbit AI customer support. We have processed your inquiry and verified your profile status. Your concern is now successfully resolved."
          };
        }
        return t;
      }));
    }, 4000);
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
          <Text className="text-base font-bold text-slate-800 tracking-tight">Help &amp; Support</Text>
        </View>
      </View>

      <ScrollView className="flex-1 bg-slate-50 p-4" contentContainerClassName="space-y-4 pb-6">
        
        {/* FAQS SECTION COLLAPSIBLES */}
        <View className="space-y-2.5">
          <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Frequently Asked Questions</Text>
          
          <View className="bg-white border border-slate-200/50 rounded-3xl overflow-hidden divide-y divide-slate-100 shadow-2xs">
            {faqs.map((faq, idx) => {
              const isExpanded = expandedFaqIdx === idx;
              return (
                <View key={idx} className="flex flex-col">
                  <TouchableOpacity
                    onClick={() => setExpandedFaqIdx(isExpanded ? null : idx)}
                    className="p-4 flex flex-row justify-between items-center bg-white hover:bg-slate-50 transition duration-150 cursor-pointer text-left"
                  >
                    <Text className="text-xs font-bold text-slate-800 pr-2 text-left flex-1 font-sans">{faq.q}</Text>
                    <ChevronRight className={`w-4 h-4 text-slate-400 shrink-0 transform transition duration-150 ${isExpanded ? 'rotate-90 text-blue-600' : ''}`} />
                  </TouchableOpacity>
                  
                  {isExpanded && (
                    <View className="px-4 pb-4 pt-1 bg-blue-50/5 text-[11px] text-slate-500 leading-normal font-sans border-t border-slate-50">
                      {faq.a}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* SUBMIT HELP TICKET FORM */}
        <View className="bg-white p-5 border border-slate-200/55 rounded-3xl space-y-3.5 shadow-2xs">
          <Text className="text-xs font-bold text-slate-850 border-b border-slate-100 pb-2">Lodge Technical Help Card</Text>

          <View className="space-y-1">
            <Text className="text-[9px] font-bold uppercase tracking-widest text-slate-400 font-sans">Subject Category</Text>
            <TextInput 
              placeholder="e.g. Subscription Billing Issue"
              value={ticketSubject}
              onChange={(e: any) => setTicketSubject(e.target.value)}
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:bg-white font-sans"
            />
          </View>

          <View className="space-y-1">
            <Text className="text-[9px] font-bold uppercase tracking-widest text-slate-400 font-sans">Details &amp; Explanations</Text>
            <textarea 
              placeholder="Tell our South African staff what needs adjusting..."
              value={ticketMsg}
              onChange={(e: any) => setTicketMsg(e.target.value)}
              rows={3}
              className="w-full text-xs p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-400 focus:bg-white font-sans resize-none"
            />
          </View>

          <TouchableOpacity 
            onClick={handleCreateTicket}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center font-bold text-xs shadow-3xs cursor-pointer font-sans"
          >
            <Send className="w-3.5 h-3.5 text-white mr-1.5" />
            Post Support Query
          </TouchableOpacity>
        </View>

        {/* LOG OF PREVIOUS TICKETS */}
        {supportTickets.length > 0 && (
          <View className="space-y-2.5">
            <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1 block">Help Tickets History</Text>
            
            <View className="space-y-2.5">
              {supportTickets.map((t) => (
                <View 
                  key={t.id}
                  className="p-4 bg-white border border-slate-200/50 rounded-2xl flex flex-col gap-2 shadow-3xs"
                >
                  <View className="flex flex-row justify-between items-center pb-2 border-b border-slate-100/60 select-none">
                    <Text className="text-xs font-bold text-slate-800 truncate block mr-2 flex-1">{t.subject}</Text>
                    <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 border rounded-full ${
                      t.status === 'Resolved' 
                        ? 'bg-green-50 text-green-700 border-green-150' 
                        : 'bg-amber-50 text-amber-700 border-amber-150 animate-pulse'
                    }`}>
                      {t.status}
                    </span>
                  </View>

                  <Text className="text-[10.5px] text-slate-500 leading-normal font-sans">{t.message}</Text>
                  
                  {t.reply && (
                    <View className="p-3 bg-blue-50/20 border border-blue-105 rounded-xl space-y-1 mt-1">
                      <View className="flex flex-row items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-blue-600" />
                        <Text className="text-[10px] font-bold text-slate-800">Support Representative response:</Text>
                      </View>
                      <Text className="text-[10.5px] text-blue-800 leading-relaxed font-sans mt-0.5">{t.reply}</Text>
                    </View>
                  )}

                  <Text className="text-[8px] font-mono text-slate-400 mt-1 block select-none">
                    Lodged: {new Date(t.timestamp).toLocaleString()}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

      </ScrollView>

    </SafeAreaView>
  );
};
