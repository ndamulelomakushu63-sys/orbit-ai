import { createClient } from '@supabase/supabase-js';
import { 
  UserProfile, SubscriptionRecord, ReferralRecord, 
  WithdrawalRecord, Conversation, ChatMessage, UserPlan, 
  AppNotification, SupportTicket, Business, BusinessRegistration 
} from '../types';

// Supabase project credentials provided
const DEFAULT_SUPABASE_URL = "https://ptpnvrgzdnawvvxrkkid.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0cG52cmd6ZG5hd3Z2eHJra2lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3Mzg3ODcsImV4cCI6MjA5ODMxNDc4N30.MUUTitnP27N5Alvyq3W_ntVc8P0NhjhaVWllfU9u_IM";

function getValidUrl(url: any, fallback: string): string {
  if (typeof url === 'string' && url.trim() !== '') {
    const trimmed = url.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
  }
  return fallback;
}

function getValidKey(key: any, fallback: string): string {
  if (typeof key === 'string' && key.trim() !== '') {
    const trimmed = key.trim();
    if (trimmed.length > 10 && !trimmed.includes('[PASTE') && !trimmed.includes('YOUR_PUBLISHABLE_KEY')) {
      return trimmed;
    }
  }
  return fallback;
}

const rawUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const rawKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = getValidUrl(rawUrl, DEFAULT_SUPABASE_URL);
const supabaseAnonKey = getValidKey(rawKey, DEFAULT_SUPABASE_ANON_KEY);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Helper functions for Database interactions with Try-Catch boundaries to prevent app crashes if tables are not fully provisioned yet

// --- 1. PROFILES DB OPERATIONS ---
export async function dbFetchProfiles(): Promise<UserProfile[] | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*');
    if (error) throw error;
    if (!data) return null;
    
    return data.map(item => ({
      uid: item.id,
      name: item.name || '',
      email: item.email || '',
      plan: (item.plan as UserPlan) || UserPlan.FREE,
      subscription_status: item.subscription_status,
      chat_count_today: item.chat_count_today || 0,
      image_count_today: item.image_count_today || 0,
      file_upload_count_today: item.file_upload_count_today || 0,
      camera_upload_count_today: item.camera_upload_count_today || 0,
      last_reset_time: item.last_reset_time,
      subscription_start_date: item.subscription_start_date,
      subscription_end_date: item.subscription_end_date,
      cancelled_at: item.cancelled_at,
      refund_requested: item.refund_requested || false,
      refund_request_date: item.refund_request_date,
      agentStatus: item.agent_status || false,
      balance: Number(item.balance || 0),
      referralCode: item.referral_code || '',
      referredBy: item.referred_by || undefined,
      activeAgentId: item.active_agent_id || 'assistant',
      createdAt: item.created_at || new Date().toISOString()
    }));
  } catch (err) {
    console.warn("Supabase profiles select failed, falling back to local: ", err);
    return null;
  }
}

export async function dbUpsertProfile(p: UserProfile): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: p.uid,
        name: p.name,
        email: p.email,
        plan: p.plan,
        subscription_status: p.subscription_status,
        chat_count_today: p.chat_count_today,
        image_count_today: p.image_count_today,
        file_upload_count_today: p.file_upload_count_today,
        camera_upload_count_today: p.camera_upload_count_today,
        last_reset_time: p.last_reset_time,
        subscription_start_date: p.subscription_start_date,
        subscription_end_date: p.subscription_end_date,
        cancelled_at: p.cancelled_at,
        refund_requested: p.refund_requested,
        refund_request_date: p.refund_request_date,
        agent_status: p.agentStatus,
        balance: p.balance,
        referral_code: p.referralCode,
        referred_by: p.referredBy,
        active_agent_id: p.activeAgentId || 'assistant',
        created_at: p.createdAt
      }, { onConflict: 'id' });
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase upsert profile failed: ", err);
    return false;
  }
}

// --- 2. SUBSCRIPTIONS DB OPERATIONS ---
export async function dbFetchSubscriptions(): Promise<SubscriptionRecord[] | null> {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*');
    if (error) throw error;
    if (!data) return null;
    return data.map(item => ({
      id: item.id,
      userId: item.user_id,
      plan: item.plan,
      amount: Number(item.amount),
      status: item.status,
      renewalDate: item.renewal_date,
      createdAt: item.created_at
    }));
  } catch (err) {
    console.warn("Supabase subscriptions fetch failed: ", err);
    return null;
  }
}

export async function dbUpsertSubscription(sub: SubscriptionRecord): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('subscriptions')
      .upsert({
        id: sub.id,
        user_id: sub.userId,
        plan: sub.plan,
        amount: sub.amount,
        status: sub.status,
        renewal_date: sub.renewalDate,
        created_at: sub.createdAt
      });
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase subscriptions upsert failed: ", err);
    return false;
  }
}

// --- 3. CONVERSATIONS DB OPERATIONS ---
export async function dbFetchConversations(userId?: string): Promise<Conversation[] | null> {
  try {
    let query = supabase.from('conversations').select('*');
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (error) throw error;
    if (!data) return null;
    return data.map(item => ({
      id: item.id,
      title: item.title,
      lastMessage: item.last_message || '',
      timestamp: item.timestamp
    }));
  } catch (err) {
    console.warn("Supabase conversations fetch failed: ", err);
    return null;
  }
}

export async function dbUpsertConversation(c: Conversation, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('conversations')
      .upsert({
        id: c.id,
        user_id: userId,
        title: c.title,
        last_message: c.lastMessage,
        timestamp: c.timestamp
      });
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase conversation upsert failed: ", err);
    return false;
  }
}

export async function dbDeleteConversation(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase conversation delete failed: ", err);
    return false;
  }
}

// --- 4. CHAT MESSAGES DB OPERATIONS ---
export async function dbFetchChatMessages(): Promise<ChatMessage[] | null> {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*');
    if (error) throw error;
    if (!data) return null;
    return data.map(item => ({
      id: item.id,
      conversationId: item.conversation_id,
      message: item.message,
      role: item.role,
      timestamp: item.timestamp,
      createdAt: item.created_at
    }));
  } catch (err) {
    console.warn("Supabase chat messages fetch failed: ", err);
    return null;
  }
}

export async function dbUpsertChatMessage(m: ChatMessage): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('chat_messages')
      .upsert({
        id: m.id,
        conversation_id: m.conversationId,
        message: m.message,
        role: m.role,
        timestamp: m.timestamp,
        created_at: m.createdAt || m.timestamp
      });
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase chat message upsert failed: ", err);
    return false;
  }
}

export async function dbDeleteChatMessagesForConversation(convId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('chat_messages')
      .delete()
      .eq('conversation_id', convId);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase chat messages deletion failed: ", err);
    return false;
  }
}

// --- 5. REFERRALS DB OPERATIONS ---
export async function dbFetchReferrals(): Promise<ReferralRecord[] | null> {
  try {
    const { data, error } = await supabase
      .from('referrals')
      .select('*');
    if (error) throw error;
    if (!data) return null;
    return data.map(item => ({
      id: item.id,
      referrerId: item.referrer_id,
      referredUserId: item.referred_user_id,
      referredName: item.referred_name,
      reward: Number(item.reward),
      status: item.status,
      timestamp: item.timestamp
    }));
  } catch (err) {
    console.warn("Supabase referrals fetch failed: ", err);
    return null;
  }
}

export async function dbUpsertReferral(r: ReferralRecord): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('referrals')
      .upsert({
        id: r.id,
        referrer_id: r.referrerId,
        referred_user_id: r.referredUserId,
        referred_name: r.referredName,
        reward: r.reward,
        status: r.status,
        timestamp: r.timestamp
      });
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase referral upsert failed: ", err);
    return false;
  }
}

// --- 6. WITHDRAWALS DB OPERATIONS ---
export async function dbFetchWithdrawals(): Promise<WithdrawalRecord[] | null> {
  try {
    const { data, error } = await supabase
      .from('withdrawals')
      .select('*');
    if (error) throw error;
    if (!data) return null;
    return data.map(item => ({
      id: item.id,
      userId: item.user_id,
      userName: item.user_name,
      userEmail: item.user_email,
      fullName: item.full_name,
      bankName: item.bank_name,
      accountNumber: item.account_number,
      accountHolder: item.account_holder,
      amount: Number(item.amount),
      status: item.status,
      timestamp: item.timestamp
    }));
  } catch (err) {
    console.warn("Supabase withdrawals fetch failed: ", err);
    return null;
  }
}

export async function dbUpsertWithdrawal(w: WithdrawalRecord): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('withdrawals')
      .upsert({
        id: w.id,
        user_id: w.userId,
        user_name: w.userName,
        user_email: w.userEmail,
        full_name: w.fullName,
        bank_name: w.bankName,
        account_number: w.accountNumber,
        account_holder: w.accountHolder,
        amount: w.amount,
        status: w.status,
        timestamp: w.timestamp
      });
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase withdrawal upsert failed: ", err);
    return false;
  }
}

// --- 7. BUSINESS DIRECTORY LISTINGS ---
export async function dbFetchBusinesses(): Promise<Business[] | null> {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*');
    if (error) throw error;
    if (!data) return null;
    return data.map(item => ({
      id: item.id,
      name: item.name,
      ownerName: item.owner_name,
      description: item.description,
      category: item.category,
      townCity: item.town_city,
      physicalAddress: item.physical_address,
      phoneNumber: item.phone_number,
      whatsAppNumber: item.whatsapp_number || undefined,
      email: item.email || undefined,
      openingHours: item.opening_hours || undefined,
      socialMediaLinks: item.social_media_links || undefined,
      photos: item.photos || [],
      specials: item.specials || [],
      isPublic: item.is_public,
      isPaid: item.is_paid,
      createdAt: item.created_at
    }));
  } catch (err) {
    console.warn("Supabase businesses fetch failed: ", err);
    return null;
  }
}

export async function dbUpsertBusiness(b: Business): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('businesses')
      .upsert({
        id: b.id,
        name: b.name,
        owner_name: b.ownerName,
        description: b.description,
        category: b.category,
        town_city: b.townCity,
        physical_address: b.physicalAddress,
        phone_number: b.phoneNumber,
        whatsapp_number: b.whatsAppNumber,
        email: b.email,
        opening_hours: b.openingHours,
        social_media_links: b.socialMediaLinks || {},
        photos: b.photos || [],
        specials: b.specials || [],
        is_public: b.isPublic,
        is_paid: b.isPaid,
        created_at: b.createdAt
      });
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase business upsert failed: ", err);
    return false;
  }
}

export async function dbDeleteBusiness(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('businesses')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase business delete failed: ", err);
    return false;
  }
}

// --- 8. BUSINESS REGISTRATIONS ---
export async function dbFetchBusinessRegistrations(): Promise<BusinessRegistration[] | null> {
  try {
    const { data, error } = await supabase
      .from('business_registrations')
      .select('*');
    if (error) throw error;
    if (!data) return null;
    return data.map(item => ({
      id: item.id,
      businessName: item.business_name,
      ownerName: item.owner_name,
      phoneNumber: item.phone_number,
      whatsAppNumber: item.whatsapp_number || undefined,
      email: item.email || undefined,
      category: item.category,
      townCity: item.town_city,
      physicalAddress: item.physical_address,
      description: item.description,
      preferredVisitDate: item.preferred_visit_date,
      additionalNotes: item.additional_notes || undefined,
      isPaid: item.is_paid || false,
      status: item.status,
      createdAt: item.created_at
    }));
  } catch (err) {
    console.warn("Supabase business registrations fetch failed: ", err);
    return null;
  }
}

export async function dbUpsertBusinessRegistration(reg: BusinessRegistration): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('business_registrations')
      .upsert({
        id: reg.id,
        business_name: reg.businessName,
        owner_name: reg.ownerName,
        phone_number: reg.phoneNumber,
        whatsapp_number: reg.whatsAppNumber,
        email: reg.email,
        category: reg.category,
        town_city: reg.townCity,
        physical_address: reg.physicalAddress,
        description: reg.description,
        preferred_visit_date: reg.preferredVisitDate,
        additional_notes: reg.additionalNotes,
        is_paid: reg.isPaid,
        status: reg.status,
        created_at: reg.createdAt
      });
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase business registration upsert failed: ", err);
    return false;
  }
}

// --- 9. NOTIFICATIONS ---
export async function dbFetchNotifications(userId?: string): Promise<AppNotification[] | null> {
  try {
    let query = supabase.from('notifications').select('*');
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (error) throw error;
    if (!data) return null;
    return data.map(item => ({
      id: item.id,
      title: item.title,
      message: item.message,
      read: item.read,
      timestamp: item.timestamp,
      type: item.type
    }));
  } catch (err) {
    console.warn("Supabase notifications fetch failed: ", err);
    return null;
  }
}

export async function dbUpsertNotification(n: AppNotification, userId?: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .upsert({
        id: n.id,
        user_id: userId || null,
        title: n.title,
        message: n.message,
        read: n.read,
        timestamp: n.timestamp,
        type: n.type
      });
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase notification upsert failed: ", err);
    return false;
  }
}

// --- 10. SUPPORT TICKETS ---
export async function dbFetchSupportTickets(userId?: string): Promise<SupportTicket[] | null> {
  try {
    let query = supabase.from('support_tickets').select('*');
    if (userId) {
      query = query.eq('user_id', userId);
    }
    const { data, error } = await query;
    if (error) throw error;
    if (!data) return null;
    return data.map(item => ({
      id: item.id,
      subject: item.subject,
      message: item.message,
      status: item.status,
      timestamp: item.timestamp,
      reply: item.reply || undefined
    }));
  } catch (err) {
    console.warn("Supabase tickets fetch failed: ", err);
    return null;
  }
}

export async function dbUpsertSupportTicket(t: SupportTicket, userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('support_tickets')
      .upsert({
        id: t.id,
        user_id: userId,
        subject: t.subject,
        message: t.message,
        status: t.status,
        timestamp: t.timestamp,
        reply: t.reply || null
      });
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase support ticket upsert failed: ", err);
    return false;
  }
}

// --- 11. BUCKET MEDIA PHOTO UPLOADS ---
export async function dbUploadBusinessPhoto(file: File, filename: string): Promise<string | null> {
  try {
    const bucket = supabase.storage.from('business-photos');
    const { data, error } = await bucket.upload(filename, file, {
      cacheControl: '3600',
      upsert: true
    });
    if (error) throw error;
    if (!data) return null;
    const { data: publicUrlData } = bucket.getPublicUrl(filename);
    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.warn("Supabase photo upload failed: ", err);
    return null;
  }
}
