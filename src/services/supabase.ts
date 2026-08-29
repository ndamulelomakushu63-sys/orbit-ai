import './env-sanitizer.js';
import { createClient } from '@supabase/supabase-js';
import { 
  UserProfile, SubscriptionRecord, ReferralRecord, 
  WithdrawalRecord, Conversation, ChatMessage, UserPlan, 
  AppNotification, SupportTicket,
  ObdiLead, Business,
  MarketBrand, MarketProduct, MarketProductVariant, MarketOrder, MarketOrderItem, MarketSettings, MarketOrderStatus
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
  rawUrl = import.meta.env?.VITE_SUPABASE_URL;
  rawKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;
} catch (e) {
  // Safe fallback if import.meta is not defined in the environment
}

if (!rawUrl && typeof process !== 'undefined' && process?.env) {
  rawUrl = process.env.VITE_SUPABASE_URL;
}
if (!rawKey && typeof process !== 'undefined' && process?.env) {
  rawKey = process.env.VITE_SUPABASE_ANON_KEY;
}

const supabaseUrl = getValidUrl(rawUrl, DEFAULT_SUPABASE_URL);
const supabaseAnonKey = getValidKey(rawKey, DEFAULT_SUPABASE_ANON_KEY);

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Required Supabase environment variables are missing or empty. Using default project credentials.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});

// Helper functions for Database interactions with Try-Catch boundaries to prevent app crashes if tables are not fully provisioned yet

// --- 1. PROFILES DB OPERATIONS ---
export function generateAgentId(): string {
  const prefixes = ["AGT", "ORB", "GLEN"];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix + suffix;
}

export function getReferralLink(referralCode: string): string {
  const code = (referralCode || '').trim() || 'AGT82KQ';
  return `https://orbitai.vercel.app/?ref=${code}`;
}

export function parseProfileFromDb(item: any): UserProfile {
  const rawAgentId = item.agent_id || item.referral_code || '';
  const agentId = (rawAgentId && rawAgentId.trim()) ? rawAgentId.trim() : generateAgentId();
  const refLink = getReferralLink(agentId);
  const verifiedCount = Number(item.verified_referrals ?? item.verified_referrals_count ?? 0);
  const referredByVal = item.referred_by || item.referredBy || null;

  return {
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
    agentStatus: item.agent_status !== undefined ? item.agent_status : true,
    balance: Number(item.balance || 0),
    referralCode: agentId,
    agent_id: agentId,
    agentId: agentId,
    referral_link: refLink,
    referralLink: refLink,
    referredBy: referredByVal,
    referred_by: referredByVal,
    verifiedReferrals: verifiedCount,
    verified_referrals: verifiedCount,
    activeAgentId: item.active_agent_id || 'assistant',
    createdAt: item.created_at || new Date().toISOString()
  };
}

export async function dbFetchProfiles(): Promise<UserProfile[] | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*');
    if (error) throw error;
    if (!data) return null;
    return data.map(item => parseProfileFromDb(item));
  } catch (err) {
    console.warn("Supabase profiles select failed, falling back to local: ", err);
    return null;
  }
}

export async function dbFetchProfileById(uid: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();
    if (error || !data) return null;
    return parseProfileFromDb(data);
  } catch (err) {
    console.warn("dbFetchProfileById error:", err);
    return null;
  }
}

export async function dbFetchProfileByAgentId(agentId: string): Promise<UserProfile | null> {
  if (!agentId || !agentId.trim()) return null;
  const cleanId = agentId.trim();
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`agent_id.eq.${cleanId},referral_code.eq.${cleanId}`)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      const { data: d2 } = await supabase.from('profiles').select('*').eq('agent_id', cleanId).limit(1).maybeSingle();
      if (d2) return parseProfileFromDb(d2);
      const { data: d3 } = await supabase.from('profiles').select('*').eq('referral_code', cleanId).limit(1).maybeSingle();
      if (d3) return parseProfileFromDb(d3);
      return null;
    }
    return parseProfileFromDb(data);
  } catch (err) {
    console.warn("dbFetchProfileByAgentId error:", err);
    return null;
  }
}

export async function dbUpsertProfile(p: UserProfile): Promise<boolean> {
  try {
    const agentId = p.agent_id || p.agentId || p.referralCode || generateAgentId();
    const refLink = getReferralLink(agentId);
    const referredByVal = p.referred_by !== undefined ? p.referred_by : (p.referredBy !== undefined ? p.referredBy : null);
    const verifiedCount = p.verified_referrals !== undefined ? p.verified_referrals : (p.verifiedReferrals !== undefined ? p.verifiedReferrals : 0);

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
        agent_status: p.agentStatus ?? true,
        balance: p.balance ?? 0,
        referral_code: agentId,
        agent_id: agentId,
        referral_link: refLink,
        referred_by: referredByVal,
        verified_referrals: verifiedCount,
        verified_referrals_count: verifiedCount,
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

export async function dbVerifyReferralForUser(referredUserId: string): Promise<boolean> {
  try {
    const { data: userProfile, error: uErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', referredUserId)
      .single();

    if (uErr || !userProfile) return false;

    const referredByCode = userProfile.referred_by || userProfile.referredBy;
    if (!referredByCode) return false;

    const referrer = await dbFetchProfileByAgentId(referredByCode);
    if (!referrer) return false;

    // Update pending referral record
    const { data: pendingRefs } = await supabase
      .from('referrals')
      .select('*')
      .eq('referred_user_id', referredUserId)
      .eq('referrer_id', referrer.uid);

    if (pendingRefs && pendingRefs.length > 0) {
      for (const ref of pendingRefs) {
        if (ref.status !== 'Paid' && ref.status !== 'Verified') {
          await supabase
            .from('referrals')
            .update({ status: 'Paid' })
            .eq('id', ref.id);
        }
      }
    } else {
      await supabase.from('referrals').insert({
        id: `ref-${Date.now()}`,
        referrer_id: referrer.uid,
        referred_user_id: referredUserId,
        referred_name: userProfile.name || userProfile.email || 'Referred User',
        reward: 10.00,
        status: 'Paid',
        timestamp: new Date().toISOString()
      });
    }

    const currentVerified = Number(referrer.verified_referrals ?? referrer.verifiedReferrals ?? 0);
    const newVerified = currentVerified + 1;
    const currentBalance = Number(referrer.balance || 0);
    const newBalance = currentBalance + 10.00;

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        verified_referrals: newVerified,
        verified_referrals_count: newVerified,
        balance: newBalance
      })
      .eq('id', referrer.uid);

    if (updateErr) {
      console.error("[Verification] Error updating referrer profile:", updateErr);
      return false;
    }

    console.log(`[Verification] Verified referral for ${referredUserId}. Referrer ${referrer.uid} updated: verified_referrals=${newVerified}, balance=R${newBalance}`);
    return true;
  } catch (err) {
    console.error("[Verification] Exception verifying referral:", err);
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

// --- 13. ORBIT REWARDS DB OPERATIONS ---
export async function dbFetchRewardHistory(userId: string): Promise<any[] | null> {
  try {
    const { data, error } = await supabase
      .from('reward_history')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });
    if (error) throw error;
    if (!data) return [];
    return data.map(item => ({
      id: item.id,
      userId: item.user_id,
      adId: item.ad_id,
      adTitle: item.ad_title,
      rewardAmount: Number(item.reward_amount),
      status: item.status,
      timestamp: item.timestamp
    }));
  } catch (err) {
    console.warn("Supabase reward history fetch failed:", err);
    return null;
  }
}

export async function dbInsertRewardHistoryItem(item: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('reward_history')
      .insert({
        id: item.id,
        user_id: item.userId,
        ad_id: item.adId,
        ad_title: item.adTitle,
        reward_amount: item.rewardAmount,
        status: item.status || 'verified',
        timestamp: item.timestamp || new Date().toISOString()
      });
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase reward history insert failed:", err);
    return false;
  }
}

export async function dbFetchRewardBalance(userId: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('reward_balances')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (error) throw error;
    if (!data) return null;
    return {
      userId: data.user_id,
      totalEarnings: Number(data.total_earnings || 0),
      monthlyEarnings: Number(data.monthly_earnings || 0),
      todayAdCount: Number(data.today_ad_count || 0),
      lastAdDate: data.last_ad_date || new Date().toISOString().split('T')[0],
      updatedAt: data.updated_at
    };
  } catch (err) {
    console.warn("Supabase reward balance fetch failed:", err);
    return null;
  }
}

export async function dbUpsertRewardBalance(balance: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('reward_balances')
      .upsert({
        user_id: balance.userId,
        total_earnings: balance.totalEarnings,
        monthly_earnings: balance.monthlyEarnings,
        today_ad_count: balance.todayAdCount,
        last_ad_date: balance.lastAdDate,
        updated_at: new Date().toISOString()
      });
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase reward balance upsert failed:", err);
    return false;
  }
}

export async function dbFetchOrbitRewardRecord(userId: string): Promise<any | null> {
  try {
    const { data, error } = await supabase
      .from('orbit_rewards')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (error && error.code !== 'PGRST116') {
      console.warn("Supabase orbit reward record fetch error:", error);
    }
    
    if (data) {
      return {
        id: data.id,
        userId: data.user_id,
        unlocked: Boolean(data.unlocked),
        verifiedReferralsCount: Number(data.verified_referrals_count || 0),
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    }

    // If no record exists yet, check referrals table directly in Supabase
    const { count, error: countErr } = await supabase
      .from('referrals')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', userId);

    const referralCount = (countErr || count === null) ? 0 : count;
    const isUnlocked = referralCount >= 4;
    const recId = `orb-rew-${userId}`;

    // Upsert initial orbit_rewards record
    await supabase.from('orbit_rewards').upsert({
      id: recId,
      user_id: userId,
      unlocked: isUnlocked,
      verified_referrals_count: referralCount,
      updated_at: new Date().toISOString()
    });

    return {
      id: recId,
      userId,
      unlocked: isUnlocked,
      verifiedReferralsCount: referralCount,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  } catch (err) {
    console.warn("Supabase orbit reward record fetch failed:", err);
    return null;
  }
}

export async function dbUpsertOrbitRewardRecord(rec: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('orbit_rewards')
      .upsert({
        id: rec.id,
        user_id: rec.userId,
        unlocked: rec.unlocked,
        verified_referrals_count: rec.verifiedReferralsCount,
        updated_at: new Date().toISOString()
      });
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase orbit reward record upsert failed:", err);
    return false;
  }
}

export async function dbFetchRewardSettings(): Promise<{ maxDailyAds: number; minWithdrawal: number; policyNotice: string } | null> {
  try {
    const { data, error } = await supabase
      .from('reward_settings')
      .select('*')
      .eq('id', 'default')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.warn("Supabase reward settings fetch error:", error);
    }

    if (data) {
      return {
        maxDailyAds: Number(data.max_daily_ads || 20),
        minWithdrawal: Number(data.min_withdrawal || 100),
        policyNotice: data.policy_notice || ''
      };
    }

    return {
      maxDailyAds: 20,
      minWithdrawal: 100,
      policyNotice: 'Maximum 20 rewarded ads per day per verified user.'
    };
  } catch (err) {
    console.warn("Supabase reward settings fetch failed:", err);
    return {
      maxDailyAds: 20,
      minWithdrawal: 100,
      policyNotice: ''
    };
  }
}

export async function dbStartAdSession(userId: string, adId: string): Promise<string | null> {
  try {
    const sessionId = `ad-sess-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const { error } = await supabase
      .from('ad_watch_sessions')
      .insert({
        id: sessionId,
        user_id: userId,
        ad_id: adId,
        started_at: new Date().toISOString(),
        status: 'in_progress',
        reward_claimed: false
      });

    if (error) throw error;
    return sessionId;
  } catch (err) {
    console.warn("Supabase start ad session failed:", err);
    return null;
  }
}

export async function dbCompleteAdSession(sessionId: string, verificationHash: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('ad_watch_sessions')
      .update({
        completed_at: new Date().toISOString(),
        status: 'completed',
        verification_hash: verificationHash
      })
      .eq('id', sessionId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase complete ad session failed:", err);
    return false;
  }
}

export async function dbClaimAdSession(sessionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('ad_watch_sessions')
      .update({
        reward_claimed: true
      })
      .eq('id', sessionId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase claim ad session failed:", err);
    return false;
  }
}

export async function dbInsertAuditLog(userId: string, actionType: string, details?: any): Promise<boolean> {
  try {
    const logId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const { error } = await supabase
      .from('reward_audit_logs')
      .insert({
        id: logId,
        user_id: userId,
        action_type: actionType,
        details: details || {},
        created_at: new Date().toISOString()
      });

    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase audit log insert failed:", err);
    return false;
  }
}

// ==========================================
// 12. ORBIT MARKET (VISION 1) DB OPERATIONS
// ==========================================

export const DEFAULT_MARKET_BRANDS: MarketBrand[] = [
  {
    id: 'brand-orbit',
    name: 'Orbit Collection',
    slug: 'orbit-collection',
    description: 'Official Orbit AI merchandise and minimalist streetwear apparel.',
    location: 'South Africa',
    isVerified: true,
    isOrbitCollection: true,
    status: 'Active',
    createdAt: new Date().toISOString()
  }
];

export const DEFAULT_MARKET_PRODUCTS: MarketProduct[] = [];

export async function dbUploadMarketProductImage(file: File, filename?: string): Promise<string | null> {
  try {
    const cleanName = filename || `product_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    // Try bucket upload first
    const bucket = supabase.storage.from('obdi-photos');
    const { data, error } = await bucket.upload(`market/${cleanName}`, file, {
      cacheControl: '3600',
      upsert: true
    });
    if (!error && data) {
      const { data: pub } = bucket.getPublicUrl(`market/${cleanName}`);
      if (pub?.publicUrl) return pub.publicUrl;
    }
  } catch (err) {
    console.warn("Storage upload fallback to base64 reader:", err);
  }

  // Reliable client-side base64 fallback for instant preview & persistence
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export async function dbFetchMarketBrands(): Promise<MarketBrand[]> {
  try {
    const { data, error } = await supabase
      .from('market_brands')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      const local = localStorage.getItem('orbit_market_brands');
      if (local) {
        try { return JSON.parse(local); } catch (e) {}
      }
      return DEFAULT_MARKET_BRANDS;
    }

    return data.map((b: any) => ({
      id: b.id,
      userId: b.user_id,
      name: b.name,
      slug: b.slug,
      description: b.description || '',
      location: b.location || '',
      contactEmail: b.contact_email || '',
      contactPhone: b.contact_phone || '',
      isVerified: b.is_verified ?? false,
      isOrbitCollection: b.is_orbit_collection ?? false,
      createdAt: b.created_at
    }));
  } catch (err) {
    console.warn("Supabase fetch market brands failed, using fallback:", err);
    return DEFAULT_MARKET_BRANDS;
  }
}

export async function dbUpsertMarketBrand(brand: MarketBrand): Promise<boolean> {
  try {
    const dbPayload = {
      id: brand.id,
      user_id: brand.userId || null,
      name: brand.name,
      slug: brand.slug,
      description: brand.description,
      location: brand.location,
      contact_email: brand.contactEmail,
      contact_phone: brand.contactPhone,
      is_verified: brand.isVerified ?? false,
      is_orbit_collection: brand.isOrbitCollection ?? false,
      created_at: brand.createdAt || new Date().toISOString()
    };

    const { error } = await supabase
      .from('market_brands')
      .upsert(dbPayload);

    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase upsert market brand failed:", err);
    try {
      const local = localStorage.getItem('orbit_market_brands');
      const list = local ? JSON.parse(local) : [...DEFAULT_MARKET_BRANDS];
      const idx = list.findIndex((b: any) => b.id === brand.id);
      if (idx >= 0) list[idx] = brand;
      else list.push(brand);
      localStorage.setItem('orbit_market_brands', JSON.stringify(list));
    } catch (e) {}
    return true;
  }
}

export async function dbFetchMarketProducts(): Promise<MarketProduct[]> {
  try {
    const { data: prods, error: pErr } = await supabase
      .from('market_products')
      .select('*')
      .order('created_at', { ascending: true });

    if (pErr || !prods || prods.length === 0) {
      const local = localStorage.getItem('orbit_market_products');
      if (local) {
        try {
          const parsed = JSON.parse(local);
          const demoIds = ['prod-orb-tshirt', 'prod-orb-premium-tee', 'prod-orb-hoodie', 'prod-orb-cap'];
          const cleaned = Array.isArray(parsed) ? parsed.filter((p: any) => p && !demoIds.includes(p.id)) : [];
          if (cleaned.length !== parsed.length) {
            localStorage.setItem('orbit_market_products', JSON.stringify(cleaned));
          }
          return cleaned;
        } catch (e) {}
      }
      return DEFAULT_MARKET_PRODUCTS;
    }

    const { data: variants } = await supabase
      .from('market_product_variants')
      .select('*');

    const demoIds = ['prod-orb-tshirt', 'prod-orb-premium-tee', 'prod-orb-hoodie', 'prod-orb-cap'];
    const activeProds = prods.filter((p: any) => !demoIds.includes(p.id));

    return activeProds.map((p: any) => {
      const pVariants = (variants || [])
        .filter((v: any) => v.product_id === p.id)
        .map((v: any) => ({
          id: v.id,
          productId: v.product_id,
          sizeName: v.size_name,
          stockQuantity: Number(v.stock_quantity || 0),
          priceOverride: v.price_override ? Number(v.price_override) : undefined
        }));

      let imgList: string[] = [];
      if (Array.isArray(p.images) && p.images.length > 0) {
        imgList = p.images;
      } else if (p.image_url) {
        imgList = [p.image_url];
      }

      return {
        id: p.id,
        brandId: p.brand_id,
        brandName: p.brand_name || '',
        name: p.name,
        description: p.description || '',
        price: Number(p.price || 0),
        category: p.category || (p.brand_name || 'Orbit Collection'),
        imageUrl: p.image_url || imgList[0] || '',
        images: imgList,
        isPublished: p.is_published ?? true,
        inStock: p.in_stock ?? true,
        stockQuantity: Number(p.stock_quantity || 0),
        variants: pVariants,
        createdAt: p.created_at
      };
    });
  } catch (err) {
    console.warn("Supabase fetch market products failed, using fallback:", err);
    try {
      const local = localStorage.getItem('orbit_market_products');
      if (local) {
        const parsed = JSON.parse(local);
        const demoIds = ['prod-orb-tshirt', 'prod-orb-premium-tee', 'prod-orb-hoodie', 'prod-orb-cap'];
        return Array.isArray(parsed) ? parsed.filter((p: any) => p && !demoIds.includes(p.id)) : [];
      }
    } catch (e) {}
    return DEFAULT_MARKET_PRODUCTS;
  }
}

export async function dbUpsertMarketProduct(product: MarketProduct): Promise<boolean> {
  try {
    const mainImg = product.imageUrl || (product.images && product.images.length > 0 ? product.images[0] : null);
    const { error: pErr } = await supabase
      .from('market_products')
      .upsert({
        id: product.id,
        brand_id: product.brandId,
        brand_name: product.brandName,
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        image_url: mainImg,
        images: product.images || (mainImg ? [mainImg] : []),
        is_published: product.isPublished ?? true,
        in_stock: product.inStock,
        stock_quantity: product.stockQuantity,
        created_at: product.createdAt || new Date().toISOString()
      });

    if (pErr) throw pErr;

    if (product.variants && product.variants.length > 0) {
      for (const v of product.variants) {
        await supabase
          .from('market_product_variants')
          .upsert({
            id: v.id,
            product_id: product.id,
            size_name: v.sizeName,
            stock_quantity: v.stockQuantity,
            price_override: v.priceOverride || null
          });
      }
    }
    return true;
  } catch (err) {
    console.warn("Supabase upsert product failed:", err);
    try {
      const local = localStorage.getItem('orbit_market_products');
      const list = local ? JSON.parse(local) : [...DEFAULT_MARKET_PRODUCTS];
      const idx = list.findIndex((p: any) => p.id === product.id);
      if (idx >= 0) list[idx] = product;
      else list.push(product);
      localStorage.setItem('orbit_market_products', JSON.stringify(list));
    } catch (e) {}
    return true;
  }
}

export async function dbFetchMarketOrders(userId?: string): Promise<MarketOrder[]> {
  try {
    let query = supabase
      .from('market_orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: orders, error: oErr } = await query;
    if (oErr || !orders) {
      const local = localStorage.getItem('orbit_market_orders');
      if (local) {
        try {
          const list: MarketOrder[] = JSON.parse(local);
          return userId ? list.filter(o => o.userId === userId) : list;
        } catch (e) {}
      }
      return [];
    }

    const orderIds = orders.map((o: any) => o.id);
    const { data: items } = await supabase
      .from('market_order_items')
      .select('*')
      .in('order_id', orderIds);

    return orders.map((o: any) => {
      const orderItems = (items || [])
        .filter((it: any) => it.order_id === o.id)
        .map((it: any) => ({
          id: it.id,
          orderId: it.order_id,
          productId: it.product_id,
          brandId: it.brand_id,
          sellerId: it.seller_id,
          productName: it.product_name,
          brandName: it.brand_name,
          variantName: it.variant_name,
          quantity: Number(it.quantity || 1),
          unitPrice: Number(it.unit_price || 0),
          totalPrice: Number(it.total_price || 0)
        }));

      return {
        id: o.id,
        orderNumber: o.order_number,
        userId: o.user_id,
        customerName: o.customer_name,
        customerEmail: o.customer_email,
        customerPhone: o.customer_phone,
        deliveryAddress: o.delivery_address,
        subtotal: Number(o.subtotal || 0),
        deliveryFee: Number(o.delivery_fee || 0),
        commissionRate: Number(o.commission_rate || 0.10),
        commissionAmount: Number(o.commission_amount || 0),
        sellerPayoutAmount: Number(o.seller_payout_amount || 0),
        total: Number(o.total || 0),
        paymentStatus: o.payment_status,
        orderStatus: o.order_status,
        paymentId: o.payment_id,
        trackingNumber: o.tracking_number,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
        items: orderItems
      };
    });
  } catch (err) {
    console.warn("Supabase fetch orders failed:", err);
    try {
      const local = localStorage.getItem('orbit_market_orders');
      if (local) {
        const list: MarketOrder[] = JSON.parse(local);
        return userId ? list.filter(o => o.userId === userId) : list;
      }
    } catch (e) {}
    return [];
  }
}

export async function dbCreateMarketOrder(order: MarketOrder): Promise<boolean> {
  try {
    const { error: oErr } = await supabase
      .from('market_orders')
      .upsert({
        id: order.id,
        order_number: order.orderNumber,
        user_id: order.userId || null,
        customer_name: order.customerName,
        customer_email: order.customerEmail,
        customer_phone: order.customerPhone,
        delivery_address: order.deliveryAddress,
        subtotal: order.subtotal,
        delivery_fee: order.deliveryFee,
        commission_rate: order.commissionRate,
        commission_amount: order.commissionAmount,
        seller_payout_amount: order.sellerPayoutAmount,
        total: order.total,
        payment_status: order.paymentStatus,
        order_status: order.orderStatus,
        payment_id: order.paymentId || null,
        tracking_number: order.trackingNumber || null,
        created_at: order.createdAt || new Date().toISOString(),
        updated_at: order.updatedAt || new Date().toISOString()
      });

    if (oErr) throw oErr;

    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        await supabase
          .from('market_order_items')
          .upsert({
            id: item.id,
            order_id: order.id,
            product_id: item.productId,
            brand_id: item.brandId,
            seller_id: item.sellerId || null,
            product_name: item.productName,
            brand_name: item.brandName,
            variant_name: item.variantName || null,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total_price: item.totalPrice
          });
      }
    }
    return true;
  } catch (err) {
    console.warn("Supabase create order failed, saving locally:", err);
    try {
      const local = localStorage.getItem('orbit_market_orders');
      const list = local ? JSON.parse(local) : [];
      const idx = list.findIndex((o: any) => o.id === order.id);
      if (idx >= 0) list[idx] = order;
      else list.unshift(order);
      localStorage.setItem('orbit_market_orders', JSON.stringify(list));
    } catch (e) {}
    return true;
  }
}

export async function dbUpdateMarketOrderStatus(orderId: string, status: MarketOrderStatus, trackingNumber?: string): Promise<boolean> {
  try {
    const updatePayload: any = {
      order_status: status,
      updated_at: new Date().toISOString()
    };
    if (trackingNumber) {
      updatePayload.tracking_number = trackingNumber;
    }

    const { error } = await supabase
      .from('market_orders')
      .update(updatePayload)
      .eq('id', orderId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase update order status failed, updating locally:", err);
    try {
      const local = localStorage.getItem('orbit_market_orders');
      if (local) {
        const list: MarketOrder[] = JSON.parse(local);
        const idx = list.findIndex(o => o.id === orderId);
        if (idx >= 0) {
          list[idx].orderStatus = status;
          if (trackingNumber) list[idx].trackingNumber = trackingNumber;
          list[idx].updatedAt = new Date().toISOString();
          localStorage.setItem('orbit_market_orders', JSON.stringify(list));
        }
      }
    } catch (e) {}
    return true;
  }
}

export async function dbFetchMarketSettings(): Promise<MarketSettings> {
  try {
    const { data, error } = await supabase
      .from('market_settings')
      .select('*')
      .eq('id', 'default')
      .single();

    if (error || !data) {
      return {
        id: 'default',
        commissionRate: 0.10,
        defaultDeliveryFee: 50.00,
        minOrderAmount: 0.00,
        isActive: true
      };
    }

    return {
      id: data.id,
      commissionRate: Number(data.commission_rate ?? 0.10),
      defaultDeliveryFee: Number(data.default_delivery_fee ?? 50.00),
      minOrderAmount: Number(data.min_order_amount ?? 0.00),
      isActive: data.is_active ?? true
    };
  } catch (err) {
    return {
      id: 'default',
      commissionRate: 0.10,
      defaultDeliveryFee: 50.00,
      minOrderAmount: 0.00,
      isActive: true
    };
  }
}


