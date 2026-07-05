import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { 
  UserProfile, SubscriptionRecord, ReferralRecord, 
  WithdrawalRecord, Conversation, ChatMessage, UserPlan, WithdrawalStatus,
  AIAgent, AppNotification, SupportTicket, CardDetails,
  ObdiLead
} from '../types';
import {
  supabase,
  dbFetchProfiles,
  dbUpsertProfile,
  dbFetchSubscriptions,
  dbUpsertSubscription,
  dbFetchConversations,
  dbUpsertConversation,
  dbFetchChatMessages,
  dbUpsertChatMessage,
  dbFetchReferrals,
  dbUpsertReferral,
  dbFetchWithdrawals,
  dbUpsertWithdrawal,
  dbFetchNotifications,
  dbUpsertNotification,
  dbFetchSupportTickets,
  dbUpsertSupportTicket,
  dbFetchObdiLeads,
  dbUpsertObdiLead,
  dbDeleteObdiLead
} from './supabase';

interface AppContextType {
  users: UserProfile[];
  setUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
  subscriptions: SubscriptionRecord[];
  setSubscriptions: React.Dispatch<React.SetStateAction<SubscriptionRecord[]>>;
  referrals: ReferralRecord[];
  setReferrals: React.Dispatch<React.SetStateAction<ReferralRecord[]>>;
  withdrawals: WithdrawalRecord[];
  setWithdrawals: React.Dispatch<React.SetStateAction<WithdrawalRecord[]>>;
  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  chatMessages: ChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  currentUser: UserProfile | null;
  setCurrentUser: (user: UserProfile | null) => void;
  mobileScreen: string;
  setMobileScreen: (screen: string) => void;
  activeConversationId: string;
  setActiveConversationId: (id: string) => void;
  isAiTyping: boolean;
  setIsAiTyping: (typing: boolean) => void;
  invitedByCode: string;
  setInvitedByCode: (code: string) => void;
  logout: () => void;
  triggerChatMessage: (promptMsg: string, replyToMessageId?: string) => Promise<void>;
  createNewConversation: () => string;
  
  // Custom added structures
  agents: AIAgent[];
  setAgents: React.Dispatch<React.SetStateAction<AIAgent[]>>;
  activeAgentId: string;
  setActiveAgentId: (id: string) => void;
  notifications: AppNotification[];
  setNotifications: React.Dispatch<React.SetStateAction<AppNotification[]>>;
  supportTickets: SupportTicket[];
  setSupportTickets: React.Dispatch<React.SetStateAction<SupportTicket[]>>;
  cardDetails: CardDetails;
  setCardDetails: React.Dispatch<React.SetStateAction<CardDetails>>;
  incrementUsageLimit: (type: 'chat' | 'image' | 'file' | 'camera') => { allowed: boolean; count: number; limit: number };
  limitModalType: 'chat' | 'image' | 'file' | 'camera' | 'premium' | null;
  setLimitModalType: (type: 'chat' | 'image' | 'file' | 'camera' | 'premium' | null) => void;
  obdiLeads: ObdiLead[];
  setObdiLeads: React.Dispatch<React.SetStateAction<ObdiLead[]>>;

}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- 1. Load users array from localStorage or build defaults ---
  const [users, setUsers] = useState<UserProfile[]>(() => {
    const local = localStorage.getItem("orbit_users");
    if (local) return JSON.parse(local);
    return [
      {
        uid: "user-1",
        name: "Solly Molapisi",
        email: "solly@gmail.com",
        plan: UserPlan.FREE,
        subscription_status: "free",
        agentStatus: false,
        balance: 0,
        referralCode: "ORBIT-SM8204",
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        uid: "user-2",
        name: "Sipho Khumalo",
        email: "sipho.k@gmail.com",
        plan: UserPlan.PRO,
        subscription_status: "pro_yearly",
        agentStatus: true,
        balance: 140.00,
        referralCode: "ORBIT-SP9210",
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        uid: "user-3",
        name: "Amara Adebayo",
        email: "amara@adebayo.co",
        plan: UserPlan.FREE,
        subscription_status: "free",
        agentStatus: true,
        balance: 80.00,
        referralCode: "ORBIT-AA3921",
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  });

  // Current session User
  const [currentUser, setCurrentUserInternal] = useState<UserProfile | null>(() => {
    const local = localStorage.getItem("orbit_current_user_uid");
    if (local) {
      const match = users.find(u => u.uid === local);
      if (match) return match;
    }
    return null;
  });

  useEffect(() => {
    if (currentUser) {
      const updatedMatch = users.find(u => u.uid === currentUser.uid);
      if (updatedMatch && JSON.stringify(updatedMatch) !== JSON.stringify(currentUser)) {
        setCurrentUserInternal(updatedMatch);
      }
    }
  }, [users, currentUser]);

  const setCurrentUser = (user: UserProfile | null) => {
    if (user) {
      localStorage.setItem("orbit_current_user_uid", user.uid);
    } else {
      localStorage.removeItem("orbit_current_user_uid");
    }
    setCurrentUserInternal(user);
  };

  // --- Subscriptions array ---
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>(() => {
    const local = localStorage.getItem("orbit_subscriptions");
    if (local) return JSON.parse(local);
    return [
      {
        id: "sub-1",
        userId: "user-2",
        plan: "Yearly",
        amount: 1188.00,
        status: "Active",
        renewalDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(Date.now() - 65 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  });

  // --- Referral records ---
  const [referrals, setReferrals] = useState<ReferralRecord[]>(() => {
    const local = localStorage.getItem("orbit_referrals");
    if (local) return JSON.parse(local);
    return [
      {
        id: "ref-1",
        referrerId: "user-2",
        referredUserId: "user-1",
        referredName: "Solly Molapisi",
        reward: 10.00,
        status: "Pending",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "ref-2",
        referrerId: "user-2",
        referredUserId: "user-3",
        referredName: "Amara Adebayo",
        reward: 10.00,
        status: "Paid",
        timestamp: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  });

  // --- Withdrawals ---
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>(() => {
    const local = localStorage.getItem("orbit_withdrawals");
    if (local) return JSON.parse(local);
    return [
      {
        id: "with-1",
        userId: "user-2",
        userName: "Sipho Khumalo",
        userEmail: "sipho.k@gmail.com",
        fullName: "Sipho Khumalo",
        bankName: "First National Bank (FNB)",
        accountNumber: "62890483921",
        accountHolder: "S Khumalo",
        amount: 80.00,
        status: WithdrawalStatus.APPROVED,
        timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "with-2",
        userId: "user-3",
        userName: "Amara Adebayo",
        userEmail: "amara@adebayo.co",
        fullName: "Amara Adebayo",
        bankName: "Standard Bank",
        accountNumber: "10183921094",
        accountHolder: "A Adebayo",
        amount: 120.00,
        status: WithdrawalStatus.PENDING,
        timestamp: new Date(Date.now() - 4 * 12 * 60 * 60 * 1000).toISOString()
      }
    ];
  });

  // --- Conversations ---
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const local = localStorage.getItem("orbit_conversations");
    if (local) return JSON.parse(local);
    return [
      {
        id: "conv-1",
        title: "Coding interactive components",
        lastMessage: "I generated the React components using flexbox design.",
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      },
      {
        id: "conv-2",
        title: "Introduction setup",
        lastMessage: "Hello! I am Orbit AI, your South African AI virtual companion.",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  });

  // --- Messages ---
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const local = localStorage.getItem("orbit_messages");
    if (local) return JSON.parse(local);
    return [
      {
        id: "msg-1",
        conversationId: "conv-1",
        message: "Can you help me build a quick tailwind interface?",
        role: "user",
        timestamp: new Date(Date.now() - 65 * 60 * 1000).toISOString()
      },
      {
        id: "msg-2",
        conversationId: "conv-1",
        message: "I generated the React components using flexbox design layouts with custom rounded utilities. Give it a run!",
        role: "model",
        timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString()
      },
      {
        id: "msg-3",
        conversationId: "conv-2",
        message: "Help me register",
        role: "user",
        timestamp: new Date(Date.now() - 24 * 60 * 1000 - 5 * 60).toISOString()
      },
      {
        id: "msg-4",
        conversationId: "conv-2",
        message: "Hello! I am Orbit AI, your South African AI virtual companion. Set up your email and passcode to begin chatting in real-time.",
        role: "model",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }
    ];
  });

  // --- 8. Custom Agents list ---
  const [agents, setAgents] = useState<AIAgent[]>(() => {
    const local = localStorage.getItem("orbit_agents");
    if (local) return JSON.parse(local);
    return [
      {
        id: "agent-1",
        name: "Standard Orbit Assistant",
        category: "General",
        description: "Friendly South African mobile AI virtual companion.",
        systemPrompt: "You are the Standard Orbit AI, a professional, smart virtual companion. Answer clearly using beautiful markdown, structure, and simple explanations. Do not use emojis in your responses."
      },
      {
        id: "agent-2",
        name: "Mzansi Copilot",
        category: "Writing",
        description: "Engaging content writer tailored for the local South African context.",
        systemPrompt: "You are the Mzansi Copilot. You are an expert copywriter specialized in creating beautiful newsletter articles, advertising templates, and descriptive essays. Speak professionally and address the South African market context. Do not use emojis in your responses."
      },
      {
        id: "agent-3",
        name: "BizDev Strategist",
        category: "Business",
        description: "Expert business plans, sales frameworks, and marketing ideas.",
        systemPrompt: "You are the BizDev Strategist. You help design detailed local commercial plans, marketing ideas, tax structures, and sales strategies. Explain complex elements step-by-step. Do not use emojis in your responses."
      },
      {
        id: "agent-4",
        name: "Skhokho Code Mentor",
        category: "Coding",
        description: "Elite coder providing premium TypeScript & React Native solutions.",
        systemPrompt: "You are Skhokho Code Mentor. You are an elite veteran programmer. Guide the user through technical implementations, debugging React Native files, and custom designs with code snippets. Do not use emojis in your responses."
      }
    ];
  });

  // --- 9. Active AI Agent ID ---
  const [activeAgentId, setActiveAgentId] = useState<string>(() => {
    return localStorage.getItem("orbit_active_agent_id") || "agent-1";
  });

  // --- 10. Notifications log ---
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const local = localStorage.getItem("orbit_notifications");
    if (local) return JSON.parse(local);
    return [
      {
        id: "notif-1",
        title: "Welcome to Orbit AI",
        message: "You can now chat in real-time with our specialized AI assistant agents.",
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        read: false,
        type: "system"
      },
      {
        id: "notif-2",
        title: "Referral Account Ready",
        message: "Activate your referral code to unlock R10 rewards per registration.",
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        read: true,
        type: "agent"
      }
    ];
  });

  // --- 11. Support Tickets ---
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(() => {
    const local = localStorage.getItem("orbit_support_tickets");
    if (local) return JSON.parse(local);
    return [
      {
        id: "ticket-1",
        subject: "Trial Period Cancellations",
        message: "Can I cancel my active premium subscription safely within 7 days?",
        status: "Resolved",
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        reply: "Yes. In accordance with our Version 1 billing policies, you may cancel your subscription within 7 days. Your payment history and plans can be managed under the Payments portal."
      }
    ];
  });

  // --- 12. Billing/Card Details ---
  const [cardDetails, setCardDetails] = useState<CardDetails>(() => {
    const local = localStorage.getItem("orbit_card_details");
    if (local) return JSON.parse(local);
    return {
      cardNumber: "4000 1234 5678 9012",
      expiry: "12/29",
      cvv: "321",
      cardholderName: "Sipho Khumalo"
    };
  });



  const [obdiLeads, setObdiLeads] = useState<ObdiLead[]>(() => {
    const local = localStorage.getItem("orbit_obdi_leads");
    if (local) return JSON.parse(local);
    return [];
  });

  // Sync to localStorage
  useEffect(() => { localStorage.setItem("orbit_users", JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem("orbit_subscriptions", JSON.stringify(subscriptions)); }, [subscriptions]);
  useEffect(() => { localStorage.setItem("orbit_referrals", JSON.stringify(referrals)); }, [referrals]);
  useEffect(() => { localStorage.setItem("orbit_withdrawals", JSON.stringify(withdrawals)); }, [withdrawals]);
  useEffect(() => { localStorage.setItem("orbit_conversations", JSON.stringify(conversations)); }, [conversations]);
  useEffect(() => { localStorage.setItem("orbit_messages", JSON.stringify(chatMessages)); }, [chatMessages]);
  useEffect(() => { localStorage.setItem("orbit_agents", JSON.stringify(agents)); }, [agents]);
  useEffect(() => { localStorage.setItem("orbit_active_agent_id", activeAgentId); }, [activeAgentId]);
  useEffect(() => { localStorage.setItem("orbit_notifications", JSON.stringify(notifications)); }, [notifications]);
  useEffect(() => { localStorage.setItem("orbit_support_tickets", JSON.stringify(supportTickets)); }, [supportTickets]);
  useEffect(() => { localStorage.setItem("orbit_card_details", JSON.stringify(cardDetails)); }, [cardDetails]);

  useEffect(() => { localStorage.setItem("orbit_obdi_leads", JSON.stringify(obdiLeads)); }, [obdiLeads]);

  // --- SUPABASE SYNC AND STARTUP LOADERS ---
  const [supabaseLoading, setSupabaseLoading] = useState<boolean>(true);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean>(false);

  useEffect(() => {
    async function loadAllFromSupabase() {
      try {
        const dbProfiles = await dbFetchProfiles();
        if (dbProfiles && dbProfiles.length > 0) {
          setUsers(prev => {
            const dbUids = new Set(dbProfiles.map(u => u.uid));
            const localOnly = prev.filter(u => !dbUids.has(u.uid));
            return [...localOnly, ...dbProfiles];
          });
          setSupabaseConnected(true);
        }
        
        const dbSubs = await dbFetchSubscriptions();
        if (dbSubs && dbSubs.length > 0) {
          setSubscriptions(dbSubs);
        }

        const dbRefs = await dbFetchReferrals();
        if (dbRefs && dbRefs.length > 0) {
          setReferrals(dbRefs);
        }

        const dbWithdrawals = await dbFetchWithdrawals();
        if (dbWithdrawals && dbWithdrawals.length > 0) {
          setWithdrawals(dbWithdrawals);
        }

        const dbConvs = await dbFetchConversations();
        if (dbConvs && dbConvs.length > 0) {
          setConversations(dbConvs);
        }

        const dbMsgs = await dbFetchChatMessages();
        if (dbMsgs && dbMsgs.length > 0) {
          setChatMessages(dbMsgs);
        }



        const dbNotifs = await dbFetchNotifications();
        if (dbNotifs && dbNotifs.length > 0) {
          setNotifications(dbNotifs);
        }

        const dbTickets = await dbFetchSupportTickets();
        if (dbTickets && dbTickets.length > 0) {
          setSupportTickets(dbTickets);
        }

        const dbObdiLeads = await dbFetchObdiLeads();
        if (dbObdiLeads && dbObdiLeads.length > 0) {
          setObdiLeads(dbObdiLeads);
        }

        // Handle current auth session state
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          const matchedProfile = dbProfiles?.find(u => u.uid === session.user.id);
          if (matchedProfile) {
            setCurrentUser(matchedProfile);
          } else {
            // Check if profile matches email in local store
            const fallbackProfile = users.find(u => u.email.toLowerCase() === session.user.email?.toLowerCase());
            if (fallbackProfile) {
              setCurrentUser(fallbackProfile);
            }
          }
        }
      } catch (err) {
        console.warn("Could not synchronize data from Supabase backend yet: ", err);
      } finally {
        setSupabaseLoading(false);
      }
    }
    loadAllFromSupabase();

    // Listen to real-time Auth State Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session && session.user) {
        const dbProfiles = await dbFetchProfiles();
        const matchedProfile = dbProfiles?.find(u => u.uid === session.user.id);
        if (matchedProfile) {
          setCurrentUser(matchedProfile);
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // PayFast Query Parameter Listener
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const isSuccess = searchParams.get("payment_success") === "true";
    const isCancelled = searchParams.get("payment_cancelled") === "true";

    if (isSuccess) {
      console.log("[PayFast] Successful payment returned. Pulling latest subscription from database...");
      
      // Clear URL parameters elegantly
      window.history.replaceState({}, document.title, window.location.pathname);

      // Force refresh data from Supabase
      const syncLatestFromSupabase = async () => {
        try {
          const dbProfiles = await dbFetchProfiles();
          if (dbProfiles && dbProfiles.length > 0) {
            setUsers(prev => {
              const dbUids = new Set(dbProfiles.map(u => u.uid));
              const localOnly = prev.filter(u => !dbUids.has(u.uid));
              return [...localOnly, ...dbProfiles];
            });
          }
          const dbSubs = await dbFetchSubscriptions();
          if (dbSubs && dbSubs.length > 0) {
            setSubscriptions(dbSubs);
          }
          
          // Re-evaluate current user profile if session exists
          const { data: { session } } = await supabase.auth.getSession();
          if (session && session.user && dbProfiles) {
            const matchedProfile = dbProfiles.find(u => u.uid === session.user.id);
            if (matchedProfile) {
              setCurrentUser(matchedProfile);
            }
          }
          
          alert("Thank you! Your subscription was upgraded to PRO successfully! All premium features are now unlocked.");
        } catch (err) {
          console.error("Failed to sync upgraded payment details:", err);
        }
      };
      
      // Delay slightly to give the webhook (ITN) a moment to finish its database upsert in the background
      setTimeout(syncLatestFromSupabase, 1500);
    } else if (isCancelled) {
      window.history.replaceState({}, document.title, window.location.pathname);
      alert("Your payment checkout session was cancelled. You have not been charged and remain on the Free plan.");
    }
  }, []);

  // --- Real-time Upsert Synchronization Hooks ---
  const syncedProfiles = useRef<Set<string>>(new Set());
  const syncedSubscriptions = useRef<Set<string>>(new Set());
  const syncedReferrals = useRef<Set<string>>(new Set());
  const syncedWithdrawals = useRef<Set<string>>(new Set());
  const syncedConversations = useRef<Set<string>>(new Set());
  const syncedChatMessages = useRef<Set<string>>(new Set());

  const syncedNotifications = useRef<Set<string>>(new Set());
  const syncedSupportTickets = useRef<Set<string>>(new Set());

  // Profile Sync: only sync the current authenticated user's profile
  useEffect(() => {
    if (!currentUser) return;
    const key = `${currentUser.uid}-${JSON.stringify(currentUser)}`;
    if (syncedProfiles.current.has(key)) return;

    dbUpsertProfile(currentUser).then(success => {
      if (success) syncedProfiles.current.add(key);
    });
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    users.forEach(u => {
      if (u.uid !== currentUser.uid) return; // RLS restriction
      const key = `${u.uid}-${JSON.stringify(u)}`;
      if (syncedProfiles.current.has(key)) return;

      dbUpsertProfile(u).then(success => {
        if (success) syncedProfiles.current.add(key);
      });
    });
  }, [users, currentUser]);

  // Subscriptions: only sync current user's subscriptions
  useEffect(() => {
    if (!currentUser) return;
    subscriptions.forEach(sub => {
      if (sub.userId !== currentUser.uid) return;
      const key = `${sub.id}-${JSON.stringify(sub)}`;
      if (syncedSubscriptions.current.has(key)) return;

      dbUpsertSubscription(sub).then(success => {
        if (success) syncedSubscriptions.current.add(key);
      });
    });
  }, [subscriptions, currentUser]);

  // Referrals: only sync current user's referrals
  useEffect(() => {
    if (!currentUser) return;
    referrals.forEach(ref => {
      if (ref.referrerId !== currentUser.uid && ref.referredUserId !== currentUser.uid) return;
      const key = `${ref.id}-${JSON.stringify(ref)}`;
      if (syncedReferrals.current.has(key)) return;

      dbUpsertReferral(ref).then(success => {
        if (success) syncedReferrals.current.add(key);
      });
    });
  }, [referrals, currentUser]);

  // Withdrawals: only sync current user's withdrawals
  useEffect(() => {
    if (!currentUser) return;
    withdrawals.forEach(w => {
      if (w.userId !== currentUser.uid) return;
      const key = `${w.id}-${JSON.stringify(w)}`;
      if (syncedWithdrawals.current.has(key)) return;

      dbUpsertWithdrawal(w).then(success => {
        if (success) syncedWithdrawals.current.add(key);
      });
    });
  }, [withdrawals, currentUser]);

  // Conversations: only sync current user's conversations
  useEffect(() => {
    if (!currentUser) return;
    conversations.forEach(c => {
      const key = `${c.id}-${JSON.stringify(c)}`;
      if (syncedConversations.current.has(key)) return;

      dbUpsertConversation(c, currentUser.uid).then(success => {
        if (success) syncedConversations.current.add(key);
      });
    });
  }, [conversations, currentUser]);

  // Chat Messages: only sync current user's messages
  useEffect(() => {
    if (!currentUser) return;
    chatMessages.forEach(m => {
      const key = `${m.id}-${JSON.stringify(m)}`;
      if (syncedChatMessages.current.has(key)) return;

      dbUpsertChatMessage(m).then(success => {
        if (success) syncedChatMessages.current.add(key);
      });
    });
  }, [chatMessages, currentUser]);



  // Notifications: only sync current user's notifications
  useEffect(() => {
    if (!currentUser) return;
    notifications.forEach(n => {
      const key = `${n.id}-${JSON.stringify(n)}`;
      if (syncedNotifications.current.has(key)) return;

      dbUpsertNotification(n, currentUser.uid).then(success => {
        if (success) syncedNotifications.current.add(key);
      });
    });
  }, [notifications, currentUser]);

  // Support Tickets: only sync current user's support tickets
  useEffect(() => {
    if (!currentUser) return;
    supportTickets.forEach(t => {
      const key = `${t.id}-${JSON.stringify(t)}`;
      if (syncedSupportTickets.current.has(key)) return;

      dbUpsertSupportTicket(t, currentUser.uid).then(success => {
        if (success) syncedSupportTickets.current.add(key);
      });
    });
  }, [supportTickets, currentUser]);



  const [mobileScreen, setMobileScreen] = useState<string>("splash");
  const [activeConversationId, setActiveConversationId] = useState<string>("conv-1");
  const [isAiTyping, setIsAiTyping] = useState<boolean>(false);
  const [invitedByCode, setInvitedByCode] = useState<string>("ORBIT-SP9210");
  const [limitModalType, setLimitModalType] = useState<'chat' | 'image' | 'file' | 'camera' | 'premium' | null>(null);

  const logout = () => {
    supabase.auth.signOut().catch(err => {
      console.warn("Supabase auth signOut error: ", err);
    });
    setCurrentUser(null);
    setMobileScreen("login");
  };

  const createNewConversation = () => {
    const newId = "conv-" + Date.now();
    const newConv: Conversation = {
      id: newId,
      title: `Conversation ${conversations.length + 1}`,
      lastMessage: "No messages yet",
      timestamp: new Date().toISOString()
    };
    setConversations(prev => [newConv, ...prev]);
    setActiveConversationId(newId);
    return newId;
  };

  const triggerChatMessage = async (promptMsg: string, replyToMessageId?: string) => {
    if (!promptMsg.trim()) return;
    const userMsgText = promptMsg;

    // --- STEP 1: CHECK LIMIT BEFORE SENDING ---
    let limitData: any = null;
    let usingLocalLimits = false;
    const isProUser = currentUser ? (currentUser.plan === UserPlan.PRO || currentUser.subscription_status === "pro_monthly" || currentUser.subscription_status === "pro_yearly") : false;

    if (!isProUser) {
      let currentCount = 0;

      if (currentUser) {
        try {
          const { data, error } = await supabase
            .from("user_limits")
            .select("*")
            .eq("user_id", currentUser.uid)
            .single();

          if (error) {
            if (error.code === 'PGRST116') {
              const { data: insertedData, error: insertError } = await supabase
                .from("user_limits")
                .insert({
                  user_id: currentUser.uid,
                  messages_used: 0,
                  is_pro: false,
                  last_reset: new Date().toISOString()
                })
                .select()
                .single();

              if (insertError) throw insertError;
              limitData = insertedData;
              currentCount = 0;
            } else {
              throw error;
            }
          } else if (data) {
            limitData = data;
            currentCount = data.messages_used;
          }
        } catch (err) {
          console.warn("Supabase user_limits check failed, falling back to local:", err);
          usingLocalLimits = true;
          const updatedUser = checkAndResetLimits(currentUser);
          currentCount = updatedUser.chat_count_today ?? 0;
        }
      } else {
        usingLocalLimits = true;
        currentCount = 0;
      }

      if (currentCount >= 15) {
        setLimitModalType('chat');
        alert("You have reached your free limit of 15 messages. Upgrade to Pro.");
        return;
      }
    }

    const msgId = "msg-" + Date.now();
    const newMsg: ChatMessage = {
      id: msgId,
      messageId: msgId,
      conversationId: activeConversationId,
      message: userMsgText,
      role: "user",
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      replyToMessageId: replyToMessageId
    };

    setChatMessages(prev => [...prev, newMsg]);
    setIsAiTyping(true);

    try {
      const activeHistory = chatMessages
        .filter(m => m.conversationId === activeConversationId)
        .map(m => ({ role: m.role, text: m.message }));

      const currentAgent = agents.find(a => a.id === activeAgentId);
      const systemPrompt = currentAgent ? currentAgent.systemPrompt : undefined;

      // --- STEP 2: SEND MESSAGE TO OPENAI ---
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMsgText,
          history: activeHistory,
          systemPrompt,
          userId: currentUser?.uid
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `HTTP error! Status: ${res.status}`);
      }

      const data = await res.json();
      
      if (data.reply) {
        const replyId = "msg-" + Date.now() + "-reply";
        const modelMsg: ChatMessage = {
          id: replyId,
          messageId: replyId,
          conversationId: activeConversationId,
          message: data.reply,
          role: "model",
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString()
        };
        setChatMessages(prev => [...prev, modelMsg]);

        // Update conversation lastMessage
        setConversations(prev => prev.map(c => {
          if (c.id === activeConversationId) {
            return {
              ...c,
              lastMessage: data.reply.length > 60 ? data.reply.substring(0, 57) + "..." : data.reply,
              timestamp: new Date().toISOString()
            };
          }
          return c;
        }));

        // --- STEP 3: INCREMENT USAGE AFTER SUCCESS ---
        if (currentUser && !isProUser) {
          // Always increment locally to prevent loopholes
          const updatedUser = { ...checkAndResetLimits(currentUser) };
          const nextLocalCount = (updatedUser.chat_count_today ?? 0) + 1;
          updatedUser.chat_count_today = nextLocalCount;
          setUsers(prev => prev.map(u => u.uid === currentUser.uid ? updatedUser : u));
          setCurrentUser(updatedUser);

          // Update Supabase if using remote limits
          if (!usingLocalLimits) {
            try {
              const currentDbCount = limitData ? limitData.messages_used : 0;
              const nextDbCount = currentDbCount + 1;
              const { error: updateError } = await supabase
                .from("user_limits")
                .update({ messages_used: nextDbCount })
                .eq("user_id", currentUser.uid);

              if (updateError) {
                console.error("Failed to update message usage in Supabase:", updateError);
              } else {
                console.log(`Successfully updated messages_used in user_limits to ${nextDbCount}`);
              }
            } catch (err) {
              console.error("Failed to update message usage in Supabase:", err);
            }
          }
        }
      } else {
        throw new Error(data.error || "Fallback AI error");
      }
    } catch (e: any) {
      // Offline/missing key fallback if API fails
      const reason = e?.message || "Internal Server Communication Error";
      const errorMsgId = "msg-" + Date.now() + "-error";
      
      let errorHeading = "I was unable to retrieve a response from the OpenAI server engine.";
      let troubleshootingText = "";

      const lowerReason = reason.toLowerCase();
      if (lowerReason.includes("quota") || lowerReason.includes("limit") || lowerReason.includes("exceeded") || lowerReason.includes("billing") || lowerReason.includes("insufficient_quota")) {
        errorHeading = "The OpenAI API reported that the account has reached its usage limit or has insufficient quota.";
        troubleshootingText = `### Troubleshooting Steps
1. Visit the **OpenAI Platform Dashboard** at [https://platform.openai.com/](https://platform.openai.com/).
2. Check your **Billing** settings to ensure a valid payment method is attached and you have active credits.
3. Verify your monthly **Usage Limits** are not exceeded.`;
      } else if (lowerReason.includes("incorrect api key") || lowerReason.includes("invalid") || lowerReason.includes("api_key") || lowerReason.includes("key is missing") || lowerReason.includes("not defined")) {
        errorHeading = "The OpenAI API reported an invalid or missing API key.";
        troubleshootingText = `### Troubleshooting Steps
1. Check the **Settings > Secrets** panel in the top menu of the AI Studio workspace.
2. Ensure that there is a secret named **OPENAI_API_KEY** with a valid OpenAI API key.
3. If running locally, please add \`OPENAI_API_KEY=your_key\` inside your \".env\" file and restart your local dev server.`;
      } else {
        troubleshootingText = `### Troubleshooting Steps
1. Verify your network connection and ensure you are connected to the internet.
2. Verify that **OPENAI_API_KEY** is configured properly in your environment.`;
      }

      const modelErrorMsg: ChatMessage = {
        id: errorMsgId,
        messageId: errorMsgId,
        conversationId: activeConversationId,
        message: `${errorHeading}\n\n### Error Details\n**Reason:** ${reason}\n\n${troubleshootingText}`,
        role: "model",
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      setChatMessages(prev => [...prev, modelErrorMsg]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const checkAndResetLimits = (user: UserProfile): UserProfile => {
    const now = Date.now();
    const lastReset = user.last_reset_time ? new Date(user.last_reset_time).getTime() : 0;
    const isFree = !user.subscription_status || user.subscription_status === 'free';
    
    if (isFree && (now - lastReset >= 24 * 60 * 60 * 1000 || !user.last_reset_time)) {
      return {
        ...user,
        chat_count_today: 0,
        image_count_today: 0,
        file_upload_count_today: 0,
        camera_upload_count_today: 0,
        last_reset_time: new Date().toISOString()
      };
    }
    return user;
  };

  const incrementUsageLimit = (type: 'chat' | 'image' | 'file' | 'camera'): { allowed: boolean; count: number; limit: number } => {
    if (!currentUser) return { allowed: false, count: 0, limit: 0 };
    
    const subStatus = currentUser.subscription_status;
    const isPro = subStatus === "pro_monthly" || subStatus === "pro_yearly";
    
    if (isPro) {
      return { allowed: true, count: 0, limit: 999999 };
    }

    // Free user logic - always clone to avoid reference mutation bugs
    let updatedUser = { ...checkAndResetLimits(currentUser) };
    
    let currentCount = 0;
    let limit = 0;
    
    if (type === 'chat') {
      currentCount = updatedUser.chat_count_today ?? 0;
      limit = 15;
    } else if (type === 'image') {
      currentCount = updatedUser.image_count_today ?? 0;
      limit = 2;
    } else if (type === 'file') {
      currentCount = updatedUser.file_upload_count_today ?? 0;
      limit = 2;
    } else if (type === 'camera') {
      currentCount = updatedUser.camera_upload_count_today ?? 0;
      limit = 2;
    }

    if (currentCount >= limit) {
      // If we did check and reset but it's still over, we block. 
      // Ensure we save the updated reset fields if we updated them.
      if (updatedUser.last_reset_time !== currentUser.last_reset_time) {
        setUsers(prev => prev.map(u => u.uid === currentUser.uid ? updatedUser : u));
        setCurrentUser(updatedUser);
      }
      return { allowed: false, count: currentCount, limit };
    }

    // Increment count
    const incrementedCount = currentCount + 1;
    if (type === 'chat') {
      updatedUser.chat_count_today = incrementedCount;
    } else if (type === 'image') {
      updatedUser.image_count_today = incrementedCount;
    } else if (type === 'file') {
      updatedUser.file_upload_count_today = incrementedCount;
    } else if (type === 'camera') {
      updatedUser.camera_upload_count_today = incrementedCount;
    }

    setUsers(prev => prev.map(u => u.uid === currentUser.uid ? updatedUser : u));
    setCurrentUser(updatedUser);
    return { allowed: true, count: incrementedCount, limit };
  };

  return (
    <AppContext.Provider value={{
      users, setUsers,
      subscriptions, setSubscriptions,
      referrals, setReferrals,
      withdrawals, setWithdrawals,
      conversations, setConversations,
      chatMessages, setChatMessages,
      currentUser, setCurrentUser,
      mobileScreen, setMobileScreen,
      activeConversationId, setActiveConversationId,
      isAiTyping, setIsAiTyping,
      invitedByCode, setInvitedByCode,
      logout,
      triggerChatMessage,
      createNewConversation,
      agents, setAgents,
      activeAgentId, setActiveAgentId,
      notifications, setNotifications,
      supportTickets, setSupportTickets,
      cardDetails, setCardDetails,
      incrementUsageLimit,
      limitModalType,
      setLimitModalType,
      obdiLeads, setObdiLeads
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppState = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppState must be used within AppStateProvider");
  return context;
};
