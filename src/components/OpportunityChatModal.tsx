import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Send, MessageSquare, Check, CheckCheck, ShieldCheck, User, Building2, 
  Clock, Sparkles, AlertCircle, RefreshCw 
} from './Icons';
import { Opportunity, OpportunityApplication, OpportunityMessage } from '../types';
import { 
  dbFetchOpportunityMessages, 
  dbSendOpportunityMessage, 
  dbMarkOpportunityMessagesAsRead 
} from '../services/supabase';

interface OpportunityChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: Opportunity;
  application?: OpportunityApplication | null;
  currentUser: any;
  userRole?: 'applicant' | 'employer';
}

export const OpportunityChatModal: React.FC<OpportunityChatModalProps> = ({
  isOpen,
  onClose,
  opportunity: opp,
  application,
  currentUser,
  userRole = 'applicant'
}) => {
  const [messages, setMessages] = useState<OpportunityMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isApplicant = userRole === 'applicant';

  // Determine consistent applicant identity for conversation pairing
  const getApplicantIdentifier = () => {
    if (userRole === 'employer') {
      return application?.applicantId || application?.applicantEmail || 'applicant';
    }
    // For applicant: prefer currentUser UID or email or stored applicant ID
    let persistentId = currentUser?.uid || currentUser?.email;
    if (!persistentId) {
      persistentId = localStorage.getItem('orbit_applicant_id');
      if (!persistentId) {
        persistentId = `guest_app_${Date.now()}`;
        localStorage.setItem('orbit_applicant_id', persistentId);
      }
    }
    return persistentId;
  };

  const getApplicantName = () => {
    if (userRole === 'employer') {
      return application?.applicantName || 'Applicant';
    }
    return currentUser?.name || currentUser?.email?.split('@')[0] || 'Applicant';
  };

  const getApplicantEmail = () => {
    if (userRole === 'employer') {
      return application?.applicantEmail || '';
    }
    return currentUser?.email || '';
  };

  const applicantId = getApplicantIdentifier();
  const applicantName = getApplicantName();
  const applicantEmail = getApplicantEmail();

  const otherPartyName = isApplicant 
    ? opp.companyOrInstitution 
    : applicantName;

  const roleSubtitle = isApplicant 
    ? `Hiring Team • ${opp.title}` 
    : `Candidate • REF: ${application?.id ? application.id.substring(0, 8).toUpperCase() : 'APP'}`;

  // Quick inquiry chips
  const applicantChips = [
    'Is this opportunity still open for applications?',
    'When will shortlisted candidates be contacted?',
    'Can I update or submit additional supporting documents?',
    'Are working hours on-site, hybrid, or remote?',
    'I have submitted my application and would love to follow up.'
  ];

  const employerChips = [
    'Thank you for your application. We would like to schedule an interview.',
    'Could you please confirm your availability this week for an interview?',
    'Your application has been shortlisted by our admissions/hiring team.',
    'Please verify and upload your latest academic transcript or CV.',
    'Thank you for following up. We are actively reviewing your dossier.'
  ];

  const suggestionChips = isApplicant ? applicantChips : employerChips;

  useEffect(() => {
    if (isOpen && opp) {
      loadMessages(true);

      // Periodic refresh to catch live replies without manual reload
      const interval = setInterval(() => {
        loadMessages(false);
      }, 3500);

      return () => clearInterval(interval);
    }
  }, [isOpen, opp?.id, applicantId, application?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async (showLoadingSpinner: boolean = false) => {
    if (showLoadingSpinner) setIsLoadingMessages(true);
    try {
      const fetched = await dbFetchOpportunityMessages(opp.id, applicantId, application?.id);
      setMessages(fetched);

      // Mark unread messages as read
      if (fetched.some(m => m.senderRole !== userRole && !m.read)) {
        await dbMarkOpportunityMessagesAsRead(opp.id, applicantId, userRole);
      }
    } catch (e) {
      console.warn("Error loading chat messages:", e);
    } finally {
      if (showLoadingSpinner) setIsLoadingMessages(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || inputText).trim();
    if (!content) return;
    setInputText('');
    setIsSending(true);

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg: OpportunityMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      conversationId: `${opp.id}__${applicantId}`,
      opportunityId: opp.id,
      opportunityTitle: opp.title,
      companyName: opp.companyOrInstitution,
      applicationId: application?.id,
      applicantId: applicantId,
      applicantName: applicantName,
      applicantEmail: applicantEmail,
      senderId: isApplicant ? applicantId : (currentUser?.uid || 'employer_user'),
      senderName: isApplicant ? applicantName : `${opp.companyOrInstitution} Hiring Team`,
      senderRole: userRole,
      recipientId: isApplicant ? (opp.creatorId || opp.companyOrInstitution) : applicantId,
      recipientName: otherPartyName,
      text: content,
      timestamp: timeStr,
      createdAt: new Date().toISOString(),
      read: false,
      status: 'sent'
    };

    // Optimistically update
    setMessages(prev => [...prev, newMsg]);

    // Persist real message to database (Supabase + localStorage fallback)
    await dbSendOpportunityMessage(newMsg);
    setIsSending(false);
  };

  if (!isOpen || !opp) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in text-left font-sans">
      <div className="bg-white w-full max-w-lg h-[620px] max-h-[92vh] rounded-2xl overflow-hidden shadow-2xl flex flex-col border border-slate-200">
        
        {/* Chat Header */}
        <div className="p-4 px-5 bg-white border-b border-slate-100 flex items-center justify-between shrink-0 shadow-2xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm shrink-0 border border-blue-100 overflow-hidden">
              {isApplicant ? (
                opp.logoUrl ? (
                  <img src={opp.logoUrl} alt={opp.companyOrInstitution} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <Building2 className="w-5 h-5 text-blue-600" />
                )
              ) : (
                <div className="w-full h-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                  {applicantName.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm text-slate-900 truncate">
                  {otherPartyName}
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Active Orbit Chat" />
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                {roleSubtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => loadMessages(true)}
              title="Refresh conversation"
              className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingMessages ? 'animate-spin text-blue-600' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Opportunity Banner Bar */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between gap-2 text-[11px] text-slate-650 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-semibold text-slate-800 truncate">{opp.title}</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 whitespace-nowrap">{opp.opportunityType || opp.category}</span>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100/70 text-blue-800 shrink-0">
            {isApplicant ? 'Direct Employer Channel' : 'Candidate Conversation'}
          </span>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 overflow-y-auto bg-slate-50/40 flex flex-col gap-3">
          {isLoadingMessages && messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-xs text-slate-400 gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
              <span>Loading conversation history...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 gap-2 text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
                <MessageSquare className="w-6 h-6" />
              </div>
              <p className="font-bold text-xs text-slate-800">No messages yet</p>
              <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                {isApplicant
                  ? `Send a message directly to ${opp.companyOrInstitution} regarding application requirements, interviews, or updates.`
                  : `Start a direct conversation with ${applicantName} to invite them for an interview or request additional documents.`}
              </p>
            </div>
          ) : (
            <>
              <div className="text-center my-1">
                <span className="text-[10px] font-medium bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">
                  All messages are saved and synced securely in Orbit
                </span>
              </div>

              {messages.map((msg) => {
                const isMyMessage = msg.senderRole === userRole;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] ${
                      isMyMessage ? 'self-end items-end' : 'self-start items-start'
                    }`}
                  >
                    <span className="text-[10px] text-slate-400 px-1 mb-0.5">
                      {msg.senderName}
                    </span>

                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        isMyMessage
                          ? 'bg-blue-600 text-white rounded-tr-xs shadow-xs'
                          : 'bg-white text-slate-850 border border-slate-200 rounded-tl-xs shadow-2xs'
                      }`}
                    >
                      {msg.text}
                    </div>

                    <div className="flex items-center gap-1 mt-0.5 px-1">
                      <span className="text-[10px] text-slate-400">
                        {msg.timestamp}
                      </span>
                      {isMyMessage && (
                        <span title={msg.read ? 'Read by recipient' : 'Sent to recipient'}>
                          {msg.read ? (
                            <CheckCheck className="w-3.5 h-3.5 text-blue-600" />
                          ) : (
                            <Check className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-3 py-2 bg-white border-t border-slate-100 overflow-x-auto flex items-center gap-1.5 shrink-0 scrollbar-none">
          {suggestionChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setInputText(chip)}
              className="px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-650 rounded-lg text-[11px] whitespace-nowrap transition cursor-pointer shrink-0 font-medium border border-slate-200/50"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={isApplicant ? `Ask ${opp.companyOrInstitution}...` : `Reply to ${applicantName}...`}
            className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500 text-slate-850 placeholder:text-slate-400"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white rounded-xl transition cursor-pointer shadow-xs shrink-0 flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
