import './env-sanitizer.js';
import { createClient } from '@supabase/supabase-js';
import { 
  UserProfile, SubscriptionRecord, ReferralRecord, 
  WithdrawalRecord, Conversation, ChatMessage, UserPlan, 
  AppNotification, SupportTicket,
  ObdiLead, Business
} from '../types.js';

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

let rawUrl: string | undefined;
let rawKey: string | undefined;

try {
  // Use a dynamic Function evaluation to hide import.meta from static analysis and bundlers
  const meta = new Function("return import.meta")();
  rawUrl = meta?.env?.VITE_SUPABASE_URL;
  rawKey = meta?.env?.VITE_SUPABASE_ANON_KEY;
} catch (e) {
  // Safe fallback if import.meta is not defined in the environment
}

if (!rawUrl && typeof process !== 'undefined') {
  rawUrl = process.env?.VITE_SUPABASE_URL;
}
if (!rawKey && typeof process !== 'undefined') {
  rawKey = process.env?.VITE_SUPABASE_ANON_KEY;
}

const supabaseUrl = getValidUrl(rawUrl, DEFAULT_SUPABASE_URL);
const supabaseAnonKey = getValidKey(rawKey, DEFAULT_SUPABASE_ANON_KEY);

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "CRITICAL CONFIGURATION ERROR: Required Supabase environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) are missing, empty, or invalid placeholders. Please set them in your environment configuration before running Orbit AI."
  );
}

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
      .from('withdrawal_requests')
      .select('*');
    if (error) throw error;
    if (!data) return null;
    return data.map(item => ({
      id: item.id,
      userId: item.user_id,
      userName: item.full_name || "",
      userEmail: item.email || "",
      fullName: item.full_name || "",
      bankName: item.bank_name || "",
      accountNumber: item.account_number || "",
      accountHolder: item.account_holder || "",
      branchCode: item.branch_code || "",
      accountType: item.account_type || "",
      processedAt: item.processed_at || "",
      adminNotes: item.admin_notes || "",
      amount: Number(item.amount),
      status: item.status,
      timestamp: item.created_at || item.timestamp || new Date().toISOString()
    }));
  } catch (err) {
    console.warn("Supabase withdrawals fetch failed: ", err);
    return null;
  }
}

export async function dbUpsertWithdrawal(w: WithdrawalRecord): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('withdrawal_requests')
      .upsert({
        id: w.id,
        user_id: w.userId,
        full_name: w.fullName,
        email: w.userEmail || "",
        bank_name: w.bankName,
        account_number: w.accountNumber,
        account_holder: w.accountHolder,
        branch_code: w.branchCode || "",
        account_type: w.accountType || "",
        processed_at: w.processedAt || null,
        admin_notes: w.adminNotes || null,
        amount: w.amount,
        status: w.status,
        created_at: w.timestamp
      }, { onConflict: 'id' });
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase withdrawal upsert failed: ", err);
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



// --- 12. OBDI LEADS OPERATIONS ---
export async function dbFetchObdiLeads(): Promise<ObdiLead[] | null> {
  try {
    const { data, error } = await supabase
      .from('obdi_leads')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as ObdiLead[];
  } catch (err) {
    console.warn("Supabase obdi_leads fetch failed: ", err);
    return null;
  }
}

export async function dbUpsertObdiLead(lead: ObdiLead): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('obdi_leads')
      .upsert(lead);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase obdi_lead upsert failed: ", err);
    return false;
  }
}

export async function dbDeleteObdiLead(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('obdi_leads')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase obdi_lead delete failed: ", err);
    return false;
  }
}

export async function dbUploadObdiPhoto(file: File, filename: string): Promise<string | null> {
  try {
    const bucket = supabase.storage.from('obdi-photos');
    const { data, error } = await bucket.upload(filename, file, {
      cacheControl: '3600',
      upsert: true
    });
    if (error) throw error;
    if (!data) return null;
    const { data: publicUrlData } = bucket.getPublicUrl(filename);
    return publicUrlData?.publicUrl || null;
  } catch (err) {
    console.warn("Supabase obdi-photos bucket upload failed: ", err);
    return null;
  }
}

// --- 13. BUSINESS MODE OPERATIONS ---
export function mapDbToBusiness(item: any): Business {
  return {
    id: item.id,
    name: item.name,
    ownerName: item.owner_name,
    description: item.description,
    category: item.category,
    townCity: item.town_city,
    physicalAddress: item.physical_address,
    phoneNumber: item.phone_number,
    whatsappNumber: item.whatsapp_number || "",
    email: item.email || "",
    openingHours: item.opening_hours || "Mon - Fri: 08:00 - 17:00",
    startingPrice: item.starting_price || "",
    socialMediaLinks: item.social_media_links || {},
    photos: item.photos || [],
    specials: item.specials || [],
    isPublic: item.is_public || false,
    isPaid: item.is_paid || false,
    paymentStatus: item.payment_status || "Unpaid",
    status: item.status || "Pending",
    createdAt: item.created_at || "",
    userId: item.user_id || "",
    province: item.province || "",
    villageSuburb: item.village_suburb || "",
    preferredContactTime: item.preferred_contact_time || "",
    paymentId: item.payment_id || "",
    paymentReference: item.payment_reference || "",
    amountPaid: item.amount_paid ? Number(item.amount_paid) : 0,
    paymentDate: item.payment_date || "",
    latitude: item.latitude !== undefined && item.latitude !== null ? Number(item.latitude) : undefined,
    longitude: item.longitude !== undefined && item.longitude !== null ? Number(item.longitude) : undefined,
    rating: item.rating !== undefined && item.rating !== null ? Number(item.rating) : 5.0,
    popularity: item.popularity !== undefined && item.popularity !== null ? Number(item.popularity) : 0
  };
}

export function mapBusinessToDb(b: Business): any {
  return {
    id: b.id,
    name: b.name,
    owner_name: b.ownerName,
    description: b.description,
    category: b.category,
    town_city: b.townCity,
    physical_address: b.physicalAddress,
    phone_number: b.phoneNumber,
    whatsapp_number: b.whatsappNumber || null,
    email: b.email || null,
    opening_hours: b.openingHours || 'Mon - Fri: 08:00 - 17:00',
    starting_price: b.startingPrice || null,
    social_media_links: b.socialMediaLinks || {},
    photos: b.photos || [],
    specials: b.specials || [],
    is_public: b.isPublic || false,
    is_paid: b.isPaid || false,
    payment_status: b.paymentStatus || 'Unpaid',
    status: b.status || 'Pending',
    user_id: b.userId || null,
    province: b.province || null,
    village_suburb: b.villageSuburb || null,
    preferred_contact_time: b.preferredContactTime || null,
    payment_id: b.paymentId || null,
    payment_reference: b.paymentReference || null,
    amount_paid: b.amountPaid || null,
    payment_date: b.paymentDate || null,
    latitude: b.latitude !== undefined && b.latitude !== null ? Number(b.latitude) : null,
    longitude: b.longitude !== undefined && b.longitude !== null ? Number(b.longitude) : null,
    rating: b.rating !== undefined && b.rating !== null ? Number(b.rating) : null,
    popularity: b.popularity !== undefined && b.popularity !== null ? Number(b.popularity) : null
  };
}

export async function dbFetchApprovedBusinesses(): Promise<Business[] | null> {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .or('status.eq.Approved,status.eq.approved');
    if (error) throw error;
    if (!data) return [];
    return data.map(mapDbToBusiness);
  } catch (err) {
    console.warn("Supabase fetch approved businesses failed:", err);
    return null;
  }
}

export async function dbFetchUserBusinesses(userId: string): Promise<Business[] | null> {
  try {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('user_id', userId);
    if (error) throw error;
    if (!data) return [];
    return data.map(mapDbToBusiness);
  } catch (err) {
    console.warn("Supabase fetch user businesses failed:", err);
    return null;
  }
}

export async function dbRegisterBusiness(business: Business): Promise<boolean> {
  try {
    const dbData = mapBusinessToDb(business);
    const { error } = await supabase
      .from('businesses')
      .upsert(dbData);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase register business failed:", err);
    return false;
  }
}

export async function dbRegisterBusinessDraft(reg: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('business_registrations')
      .upsert(reg);
    if (error) {
      console.error("Supabase business draft upsert error:", error);
      throw error;
    }
    return true;
  } catch (err) {
    console.error("Supabase register business draft failed with error detail:", err);
    return false;
  }
}

export async function dbFetchUserRegistrations(email: string): Promise<any[] | null> {
  try {
    const { data, error } = await supabase
      .from('business_registrations')
      .select('*')
      .eq('email', email);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn("Supabase fetch user registrations failed:", err);
    return null;
  }
}

