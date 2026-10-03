import './env-sanitizer.js';
import { createClient } from '@supabase/supabase-js';
import { 
  UserProfile, SubscriptionRecord, ReferralRecord, 
  WithdrawalRecord, Conversation, ChatMessage, UserPlan, 
  AppNotification, SupportTicket,
  ObdiLead, Business,
  MarketBrand, MarketProduct, MarketProductVariant, MarketOrder, MarketOrderItem, MarketSettings, MarketOrderStatus,
  Opportunity, OpportunityApplication, OpportunityCategory, ApplicationStatus, ApplicationDocument, OpportunityMessage
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
  return `https://orbitai.co.za/?ref=${code}`;
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
    username: item.username || (item.email ? item.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() : (item.name ? item.name.replace(/\s+/g, '_').toLowerCase() : 'user')),
    phone: item.phone || '',
    avatarUrl: item.avatar_url || item.avatarUrl || '',
    avatar_url: item.avatar_url || item.avatarUrl || '',
    bio: item.bio || '',
    allow_contact_discovery: item.allow_contact_discovery !== false,
    is_discoverable: item.is_discoverable !== false,
    who_can_message: item.who_can_message || 'everyone',
    who_can_view_posts: item.who_can_view_posts || 'everyone',
    contact_syncing_enabled: item.contact_syncing_enabled === true,
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
        username: p.username || (p.email ? p.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase() : 'user'),
        phone: p.phone || null,
        avatar_url: p.avatar_url || p.avatarUrl || null,
        bio: p.bio || null,
        allow_contact_discovery: p.allow_contact_discovery !== false,
        is_discoverable: p.is_discoverable !== false,
        who_can_message: p.who_can_message || 'everyone',
        who_can_view_posts: p.who_can_view_posts || 'everyone',
        contact_syncing_enabled: p.contact_syncing_enabled === true,
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

export function normalizeBrandName(name: string): string {
  return (name || '').trim().toLowerCase();
}

export function generateBrandSlug(name: string): string {
  const norm = normalizeBrandName(name);
  const slug = norm.replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return slug || norm;
}

export async function dbCheckBrandNameExists(
  rawName: string,
  excludeBrandId?: string
): Promise<{ exists: boolean; message?: string; existingBrand?: MarketBrand }> {
  const cleanName = (rawName || '').trim();
  if (!cleanName) return { exists: false };

  const normalized = normalizeBrandName(cleanName);
  const slug = generateBrandSlug(cleanName);

  // 1. Reserved official storefront check: Orbit Collection
  if (normalized === 'orbit collection' || slug === 'orbit-collection') {
    if (excludeBrandId !== 'brand-orbit') {
      return {
        exists: true,
        message: "Sorry, that brand/storefront name already exists. Please choose another name."
      };
    }
  }

  // 2. Query Supabase database for duplicates
  try {
    const { data: dbBrands, error } = await supabase
      .from('market_brands')
      .select('*');

    if (!error && dbBrands && dbBrands.length > 0) {
      const match = dbBrands.find((b: any) => {
        if (excludeBrandId && b.id === excludeBrandId) return false;
        const bNorm = normalizeBrandName(b.name || '');
        const bSlug = (b.slug || generateBrandSlug(b.name || '')).trim().toLowerCase();
        return bNorm === normalized || bSlug === slug;
      });

      if (match) {
        return {
          exists: true,
          message: "Sorry, that brand/storefront name already exists. Please choose another name.",
          existingBrand: {
            id: match.id,
            userId: match.user_id,
            name: match.name,
            slug: match.slug,
            description: match.description || '',
            location: match.location || '',
            contactEmail: match.contact_email || '',
            contactPhone: match.contact_phone || '',
            isVerified: match.is_verified ?? false,
            isOrbitCollection: match.is_orbit_collection ?? false,
            createdAt: match.created_at
          }
        };
      }
    }
  } catch (err) {
    console.warn("Supabase check brand query notice:", err);
  }

  // 3. Fallback / supplementary check against local cache and defaults
  try {
    const local = localStorage.getItem('orbit_market_brands');
    const list: MarketBrand[] = local ? JSON.parse(local) : [...DEFAULT_MARKET_BRANDS];
    const match = list.find(b => {
      if (excludeBrandId && b.id === excludeBrandId) return false;
      const bNorm = normalizeBrandName(b.name || '');
      const bSlug = (b.slug || generateBrandSlug(b.name || '')).trim().toLowerCase();
      return bNorm === normalized || bSlug === slug;
    });

    if (match) {
      return {
        exists: true,
        message: "Sorry, that brand/storefront name already exists. Please choose another name.",
        existingBrand: match
      };
    }
  } catch (e) {}

  return { exists: false };
}

export async function dbUpsertMarketBrand(brand: MarketBrand): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanName = (brand.name || '').trim();
    if (!cleanName) {
      return { success: false, error: "Brand name cannot be empty." };
    }

    // Pre-flight uniqueness verification against existing Supabase data
    const check = await dbCheckBrandNameExists(cleanName, brand.id);
    if (check.exists) {
      return { 
        success: false, 
        error: "Sorry, that brand/storefront name already exists. Please choose another name." 
      };
    }

    const cleanSlug = brand.slug ? generateBrandSlug(brand.slug) : generateBrandSlug(cleanName);

    const dbPayload = {
      id: brand.id,
      user_id: brand.userId || null,
      name: cleanName,
      slug: cleanSlug,
      description: brand.description || '',
      location: brand.location || '',
      contact_email: brand.contactEmail || '',
      contact_phone: brand.contactPhone || '',
      is_verified: brand.isVerified ?? false,
      is_orbit_collection: brand.isOrbitCollection ?? false,
      created_at: brand.createdAt || new Date().toISOString()
    };

    const { error } = await supabase
      .from('market_brands')
      .upsert(dbPayload);

    if (error) {
      // Catch database-level unique constraint violations (code 23505)
      if (error.code === '23505' || /duplicate key|unique constraint/i.test(error.message || '')) {
        return { 
          success: false, 
          error: "Sorry, that brand/storefront name already exists. Please choose another name." 
        };
      }
      throw error;
    }

    // Sync to local cache
    try {
      const local = localStorage.getItem('orbit_market_brands');
      const list = local ? JSON.parse(local) : [...DEFAULT_MARKET_BRANDS];
      const idx = list.findIndex((b: any) => b.id === brand.id);
      const savedBrand = { ...brand, name: cleanName, slug: cleanSlug };
      if (idx >= 0) list[idx] = savedBrand;
      else list.push(savedBrand);
      localStorage.setItem('orbit_market_brands', JSON.stringify(list));
    } catch (e) {}

    return { success: true };
  } catch (err: any) {
    if (err?.code === '23505' || /duplicate key|unique constraint/i.test(err?.message || '')) {
      return { 
        success: false, 
        error: "Sorry, that brand/storefront name already exists. Please choose another name." 
      };
    }

    console.warn("Supabase upsert market brand fallback:", err);
    try {
      const cleanName = (brand.name || '').trim();
      const cleanSlug = brand.slug ? generateBrandSlug(brand.slug) : generateBrandSlug(cleanName);
      const local = localStorage.getItem('orbit_market_brands');
      const list = local ? JSON.parse(local) : [...DEFAULT_MARKET_BRANDS];
      const idx = list.findIndex((b: any) => b.id === brand.id);
      const savedBrand = { ...brand, name: cleanName, slug: cleanSlug };
      if (idx >= 0) list[idx] = savedBrand;
      else list.push(savedBrand);
      localStorage.setItem('orbit_market_brands', JSON.stringify(list));
    } catch (e) {}
    return { success: true };
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

// ==========================================
// 14. ORBIT OPPORTUNITIES HUB DB OPERATIONS
// ==========================================

export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function isDirectOrbitOpportunity(opp: Opportunity): boolean {
  if (opp.isDirectOrbitApply !== undefined) return opp.isDirectOrbitApply;
  if (opp.isPublicDirectory) return false;
  if (opp.officialApplicationUrl) return false;
  if (opp.id.startsWith('opp-custom-') || opp.creatorId?.startsWith('emp-') || opp.creatorId === 'recruiter') {
    return true;
  }
  return false;
}

export const DEFAULT_OPPORTUNITIES: Opportunity[] = [
  // --- ORBIT EMPLOYER-POSTED JOBS (DIRECT APPLICATION THROUGH ORBIT) ---
  {
    id: 'opp-job-1',
    creatorId: 'emp-nexora',
    creatorName: 'Nexora Tech Solutions',
    creatorEmail: 'careers@nexoratech.co.za',
    creatorPhone: '+27 11 450 8200',
    title: 'Junior Full Stack Developer',
    companyOrInstitution: 'Nexora Tech Solutions',
    category: 'job',
    opportunityType: 'Full-time',
    workplaceType: 'Hybrid',
    isDirectOrbitApply: true,
    verified: true,
    location: 'Sandton, Johannesburg',
    address: '140 West Street, Sandown, Sandton',
    city: 'Johannesburg',
    province: 'Gauteng',
    country: 'South Africa',
    locationPrecision: 'exact',
    coordinates: { lat: -26.1054, lng: 28.0538 },
    posterImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80',
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80',
    description: 'We are seeking an ambitious Junior Full Stack Developer to build and maintain modern web and mobile applications using React, TypeScript, and Node.js. You will collaborate directly with our engineering team on fintech and consumer products.',
    requirements: [
      'Grade 12 / Matric Certificate',
      'Diploma or Degree in Computer Science, IT, or proven software portfolio',
      'Proficiency in React / TypeScript and modern JavaScript',
      'Familiarity with REST APIs, Git, and relational or document databases',
      'Strong problem-solving and proactive communication skills'
    ],
    compensationOrGrant: 'R28,000 - R36,000 / month',
    deadline: '2026-10-30',
    requiredDocuments: ['CV / Resume', 'ID Copy', 'Academic Transcript or Portfolio'],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Open',
    applicantCount: 14
  },
  {
    id: 'opp-job-2',
    creatorId: 'emp-bluestone',
    creatorName: 'BlueStone Financial Group',
    creatorEmail: 'recruitment@bluestone.co.za',
    creatorPhone: '+27 12 344 1900',
    title: 'Financial Assistant & Accounts Clerk',
    companyOrInstitution: 'BlueStone Financial Group',
    category: 'job',
    opportunityType: 'Full-time',
    workplaceType: 'On-site',
    isDirectOrbitApply: true,
    verified: true,
    location: 'Hatfield, Pretoria',
    address: '254 Park Street, Hatfield',
    city: 'Pretoria',
    province: 'Gauteng',
    country: 'South Africa',
    locationPrecision: 'exact',
    coordinates: { lat: -25.7505, lng: 28.2380 },
    description: 'Manage accounts payable/receivable, reconciliations, invoice verification, and monthly VAT reporting. Excellent career path towards chartered accounting and financial management.',
    requirements: [
      'BCom Accounting, Financial Management, or Diploma in Accounting',
      'Proficiency in MS Excel (Formulas, Pivot Tables, VLOOKUP)',
      'Experience with Pastel or Sage Accounting is advantageous',
      'South African ID & Valid Work Authorization',
      'High attention to detail and numeric accuracy'
    ],
    compensationOrGrant: 'R18,000 - R24,000 / month',
    deadline: '2026-10-15',
    requiredDocuments: ['CV / Resume', 'ID Copy', 'Matric Results'],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Open',
    applicantCount: 9
  },
  {
    id: 'opp-job-3',
    creatorId: 'emp-orbit-logistics',
    creatorName: 'Orbit Logistics Africa',
    creatorEmail: 'jobs@orbitlogistics.co.za',
    creatorPhone: '+27 21 880 4320',
    title: 'Client Support & Operations Coordinator',
    companyOrInstitution: 'Orbit Logistics Africa',
    category: 'job',
    opportunityType: 'Full-time',
    workplaceType: 'Remote',
    isDirectOrbitApply: true,
    verified: true,
    location: 'Foreshore, Cape Town',
    address: '4 Loop Street, Foreshore',
    city: 'Cape Town',
    province: 'Western Cape',
    country: 'South Africa',
    locationPrecision: 'exact',
    coordinates: { lat: -33.9212, lng: 18.4230 },
    posterImage: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80',
    description: 'Coordinate customer shipments, handle client queries via chat and phone, tracking delivery schedules and resolving customs inquiries across Southern Africa.',
    requirements: [
      'Grade 12 / Matric with Diploma endorsement',
      'Fluency in English (spoken & written); bilingualism is an asset',
      'Computer literate (Email, CRM, Google Workspace)',
      'Customer-centric demeanor and calm problem-solving ability'
    ],
    compensationOrGrant: 'R15,000 - R19,500 / month',
    deadline: '2026-11-10',
    requiredDocuments: ['CV / Resume', 'Proof of Residence'],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Open',
    applicantCount: 22
  },

  // --- EXTERNALLY SOURCED JOBS (OFFICIAL GOVERNMENT & CORPORATE PORTALS) ---
  {
    id: 'opp-gov-1',
    creatorId: 'gov-dpsa',
    creatorName: 'Department of Public Service and Administration (DPSA)',
    creatorEmail: 'vacancies@dpsa.gov.za',
    creatorPhone: '+27 12 336 1000',
    title: 'Administrative Officer: HR & Records Management',
    companyOrInstitution: 'Department of Public Service and Administration (DPSA)',
    category: 'job',
    opportunityType: 'Government',
    workplaceType: 'On-site',
    isDirectOrbitApply: false,
    isPublicDirectory: true,
    verified: true,
    officialApplicationUrl: 'https://www.dpsa.gov.za/vacancies/',
    sourceDisclaimer: 'Public vacancy record sourced from DPSA Public Service Vacancy Circular. Applications must be submitted via the official department channel using the new Z83 form. Orbit AI provides preparation, qualification verification, and CV analysis.',
    location: 'Pretoria Central, Gauteng',
    address: 'Batho Pele House, 546 Edmond Street, Arcadia, Pretoria',
    city: 'Pretoria',
    province: 'Gauteng',
    country: 'South Africa',
    locationPrecision: 'exact',
    coordinates: { lat: -25.7461, lng: 28.1881 },
    posterImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80',
    description: 'Responsible for general administrative oversight, maintenance of public service personnel records, processing leave registries, coordinating interview schedules, and ensuring compliance with the Public Service Act.',
    requirements: [
      'National Senior Certificate (Grade 12 / Matric)',
      'National Diploma (NQF 6) in Public Administration, Human Resource Management, or Office Management',
      '1 to 2 years relevant administrative or human resources experience in a public or corporate environment',
      'Working knowledge of the Public Service Act, Public Service Regulations, and PFMA',
      'Completed and signed New Z83 application form accompanied by comprehensive CV'
    ],
    compensationOrGrant: 'R294,321 - R346,692 per annum (Level 7)',
    deadline: '2026-10-30',
    requiredDocuments: ['New Z83 Form (Fully Completed & Signed)', 'Comprehensive CV / Resume', 'Certified Copy of ID', 'Certified Copy of Matric & Qualifications'],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Open',
    applicantCount: 48
  },
  {
    id: 'opp-gov-2',
    creatorId: 'gov-dbe',
    creatorName: 'Department of Basic Education (DBE)',
    creatorEmail: 'pyei@dbe.gov.za',
    creatorPhone: '+27 12 357 3000',
    title: 'School Digital & Educator Assistant (PYEI Phase V)',
    companyOrInstitution: 'Department of Basic Education (DBE)',
    category: 'job',
    opportunityType: 'Government',
    workplaceType: 'On-site',
    isDirectOrbitApply: false,
    isPublicDirectory: true,
    verified: true,
    officialApplicationUrl: 'https://sayouth.datafree.co',
    sourceDisclaimer: 'Presidential Youth Employment Initiative (PYEI) vacancy collected from the official SAYouth datafree employment portal. Applications must be completed on SAYouth. Orbit AI provides free CV tailoring and eligibility readiness.',
    location: 'Soweto, Johannesburg',
    address: 'Selected Public Primary & Secondary Schools, Soweto',
    city: 'Johannesburg',
    province: 'Gauteng',
    country: 'South Africa',
    locationPrecision: 'approximate',
    coordinates: { lat: -26.2485, lng: 27.8540 },
    posterImage: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?w=800&auto=format&fit=crop&q=80',
    description: 'Provide classroom and ICT assistance to teachers in public schools. Responsibilities include recording school attendance on SASAMS, supporting reading clubs, maintaining school digital equipment, and supervising learners in computer labs.',
    requirements: [
      'South African Citizen aged between 18 and 35 years old',
      'Grade 12 / Matric Certificate with diploma or degree endorsement',
      'Must reside within a 5 km radius of the school location (Proof of Residence required)',
      'Basic computer literacy (typing, web browsing, word processing)',
      'Currently unemployed and not studying full-time'
    ],
    compensationOrGrant: 'R4,450 monthly national stipend',
    deadline: '2026-11-15',
    requiredDocuments: ['Certified ID Copy', 'Matric Certificate', 'Proof of Residential Address (Ward Councillor / Utility bill)'],
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Open',
    applicantCount: 165
  },
  {
    id: 'opp-ext-transnet',
    creatorId: 'corp-transnet',
    creatorName: 'Transnet Freight Rail & Port Terminals',
    creatorEmail: 'recruitment@transnet.net',
    creatorPhone: '+27 11 308 3000',
    title: 'Operations & Rail Yard Assistant Trainee',
    companyOrInstitution: 'Transnet SOC Ltd',
    category: 'job',
    opportunityType: 'Full-time',
    workplaceType: 'On-site',
    isDirectOrbitApply: false,
    isPublicDirectory: true,
    verified: true,
    officialApplicationUrl: 'https://transnet.erecruit.co',
    sourceDisclaimer: 'Official vacancy collected from Transnet e-Recruit careers portal. Applications are submitted directly on the Transnet e-Recruit platform. Orbit AI helps you check requirements and evaluate your CV.',
    location: 'City Deep, Johannesburg',
    address: 'City Deep Container Terminal, Heidelberg Road',
    city: 'Johannesburg',
    province: 'Gauteng',
    country: 'South Africa',
    locationPrecision: 'exact',
    coordinates: { lat: -26.2255, lng: 28.0833 },
    posterImage: 'https://images.unsplash.com/photo-1519003722824-194d4455a60c?w=800&auto=format&fit=crop&q=80',
    description: 'Join Transnet Freight Rail as an operations trainee. Receive practical on-site training in shunting operations, rail safety compliance, container tracking, train dispatch protocols, and freight terminal logistics.',
    requirements: [
      'National Senior Certificate / Grade 12 with Pure Mathematics or Maths Literacy (50%+)',
      'Physical stamina and medical fitness for yard operations',
      'Clear criminal record',
      'Willingness to work rotating shift schedules including nights and weekends',
      'South African citizenship'
    ],
    compensationOrGrant: 'R14,500 - R18,000 / month + Medical Aid & Pension',
    deadline: '2026-11-05',
    requiredDocuments: ['Comprehensive CV', 'Certified Copy of ID', 'Certified Matric Statement of Results'],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Open',
    applicantCount: 57
  },
  {
    id: 'opp-ext-eskom',
    creatorId: 'corp-eskom',
    creatorName: 'Eskom Holdings SOC Ltd',
    creatorEmail: 'careers@eskom.co.za',
    creatorPhone: '+27 11 800 8111',
    title: 'Assistant Field Technician: Distribution Operations',
    companyOrInstitution: 'Eskom Holdings SOC Ltd',
    category: 'job',
    opportunityType: 'Full-time',
    workplaceType: 'On-site',
    isDirectOrbitApply: false,
    isPublicDirectory: true,
    verified: true,
    officialApplicationUrl: 'https://secapps.eskom.co.za/sites/Recruitment',
    sourceDisclaimer: 'Official vacancy record from Eskom e-Recruitment portal. Applications are processed through Eskom’s SAP recruitment system. Orbit AI provides resume analysis and requirements matching.',
    location: 'Brackenfell, Cape Town',
    address: 'Eskom Brackenfell Complex, Eskom Road',
    city: 'Cape Town',
    province: 'Western Cape',
    country: 'South Africa',
    locationPrecision: 'exact',
    coordinates: { lat: -33.8821, lng: 18.6830 },
    posterImage: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&auto=format&fit=crop&q=80',
    description: 'Assist Senior Field Technicians in maintenance of high-voltage and medium-voltage substation equipment, fault finding on distribution cables, electrical meter audits, and emergency power restoration.',
    requirements: [
      'National Senior Certificate with Mathematics and Physical Science (50%+), OR N3 Engineering Studies Certificate',
      'Valid Code B or Code EB South African Driver’s License',
      'Safety-first mindset and compliance with Eskom High Voltage Operating Regulations',
      'Strong mechanical and electrical aptitude'
    ],
    compensationOrGrant: 'R19,500 - R25,000 / month',
    deadline: '2026-10-28',
    requiredDocuments: ['Detailed CV', 'Certified ID Copy', 'Certified Matric / N3 Certificate', 'Driver’s License Copy'],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Open',
    applicantCount: 63
  },

  // --- INTERNSHIPS ---
  {
    id: 'opp-int-1',
    creatorId: 'emp-innovatex',
    creatorName: 'InnovateX Digital Labs',
    creatorEmail: 'graduates@innovatex.co.za',
    creatorPhone: '+27 11 902 1100',
    title: 'Graduate AI & Software Engineering Internship',
    companyOrInstitution: 'InnovateX Digital Labs',
    category: 'internship',
    opportunityType: 'Internship',
    workplaceType: 'Hybrid',
    location: 'Richards Drive, Midrand',
    address: 'Gallagher Convention Centre Precinct, 19 Richards Drive',
    city: 'Midrand',
    province: 'Gauteng',
    country: 'South Africa',
    locationPrecision: 'exact',
    coordinates: { lat: -26.0028, lng: 28.1293 },
    posterImage: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&auto=format&fit=crop&q=80',
    description: '12-month structured graduate internship program for aspiring developers. Work on real client AI pipelines, mobile products, and cloud services with dedicated senior engineer mentorship and permanent placement potential.',
    requirements: [
      'Recent graduate (2024-2026) with Degree or National Diploma in Computer Science / Software Development / Electrical Engineering',
      'Foundational understanding of Python, JavaScript or Java',
      'South African Citizen aged 18 to 34',
      'Eager to learn modern AI frameworks and cloud architectures'
    ],
    compensationOrGrant: 'R12,500 monthly stipend',
    deadline: '2026-11-30',
    requiredDocuments: ['CV / Resume', 'Academic Transcript', 'ID Copy', 'Matric Results'],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Open',
    applicantCount: 31
  },
  {
    id: 'opp-int-2',
    creatorId: 'emp-apexmedia',
    creatorName: 'Apex Media & Communications',
    creatorEmail: 'talent@apexmedia.co.za',
    creatorPhone: '+27 31 560 3000',
    title: 'Digital Marketing & Content Creation Intern',
    companyOrInstitution: 'Apex Media & Communications',
    category: 'internship',
    opportunityType: 'Internship',
    workplaceType: 'Hybrid',
    location: 'La Lucia Ridge, Durban',
    address: '22 Armstrong Avenue, La Lucia Ridge',
    city: 'Durban',
    province: 'KwaZulu-Natal',
    country: 'South Africa',
    locationPrecision: 'exact',
    coordinates: { lat: -29.7344, lng: 31.0628 },
    description: 'Assist in content strategy, copywriting, social media campaign scheduling, graphic asset creation using Canva/Photoshop, and digital analytics reporting.',
    requirements: [
      'Diploma or Degree in Marketing, Media Studies, Graphic Design or Communications',
      'Hands-on familiarity with TikTok, Instagram Reels, and LinkedIn management',
      'Creative copywriting skills in English',
      'Matric Certificate'
    ],
    compensationOrGrant: 'R8,500 monthly stipend',
    deadline: '2026-10-25',
    requiredDocuments: ['CV / Resume', 'Portfolio or writing samples', 'ID Copy'],
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Open',
    applicantCount: 18
  },

  // --- LEARNERSHIPS ---
  {
    id: 'opp-lrn-1',
    creatorId: 'emp-mict-learn',
    creatorName: 'MICT SETA Tech Academy',
    creatorEmail: 'learnerships@mict-skills.org.za',
    creatorPhone: '+27 11 207 2600',
    title: 'Systems Development NQF 5 Learnership 2026',
    companyOrInstitution: 'MICT SETA Accredited Academy',
    category: 'learnership',
    opportunityType: 'Learnership',
    workplaceType: 'Hybrid',
    location: 'Vodavalley, Midrand',
    address: '082 Vodacom Boulevard, Vodavalley, Midrand',
    city: 'Midrand',
    province: 'Gauteng',
    country: 'South Africa',
    locationPrecision: 'exact',
    coordinates: { lat: -25.9922, lng: 28.1325 },
    posterImage: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&auto=format&fit=crop&q=80',
    description: '12-month fully funded MICT SETA National Certificate in Systems Development (NQF Level 5). Includes 6 months theoretical coursework in software logic, SQL databases and web development, followed by 6 months workplace experiential placement.',
    requirements: [
      'South African Citizen aged 18-35',
      'Grade 12 / Matric with Pure Mathematics (40%+) or Maths Literacy (50%+)',
      'Unemployed at time of application',
      'Not currently enrolled in any other SETA learnership'
    ],
    compensationOrGrant: 'R6,500 monthly SETA stipend + Full NQF 5 Qualification',
    deadline: '2026-11-20',
    requiredDocuments: ['CV / Resume', 'Certified ID Copy', 'Matric Certificate', 'Proof of Residence'],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Open',
    applicantCount: 47
  },
  {
    id: 'opp-lrn-2',
    creatorId: 'emp-bankseta-learn',
    creatorName: 'National Financial Learnership Council',
    creatorEmail: 'banking@bankseta-intake.co.za',
    creatorPhone: '+27 11 805 9661',
    title: 'Financial Markets & Wealth Operations Learnership',
    companyOrInstitution: 'BANKSETA / Top Tier Financial Services',
    category: 'learnership',
    opportunityType: 'Learnership',
    workplaceType: 'On-site',
    location: 'Johannesburg CBD',
    address: '15 Troye Street, Johannesburg Central',
    city: 'Johannesburg',
    province: 'Gauteng',
    country: 'South Africa',
    locationPrecision: 'exact',
    coordinates: { lat: -26.2041, lng: 28.0473 },
    description: 'Intensive 12-month learnership designed to prepare young talent for high-volume banking operations, compliance checking, investment settlement, and client portfolio administration.',
    requirements: [
      'Grade 12 / Matric with Accounting or Business Studies',
      'Mathematics Level 4 or Mathematical Literacy Level 5',
      'Clear credit and criminal record',
      'SA Citizenship with green barcode ID or smart ID card'
    ],
    compensationOrGrant: 'R7,200 monthly stipend + NQF Level 6 Certificate',
    deadline: '2026-10-31',
    requiredDocuments: ['CV / Resume', 'Certified ID Copy', 'Matric Results'],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Open',
    applicantCount: 39
  },

  // --- SCHOLARSHIPS & BURSARIES ---
  {
    id: 'opp-sch-1',
    creatorId: 'org-sasol-foundation',
    creatorName: 'Sasol Foundation',
    creatorEmail: 'bursaries@sasol.com',
    creatorPhone: '+27 86 010 6226',
    title: 'Sasol STEM Excellence Bursary Scheme 2026/2027',
    companyOrInstitution: 'Sasol Foundation',
    category: 'scholarship',
    opportunityType: 'Bursary',
    location: 'Wierda Valley, Sandton (National Coverage)',
    address: '1 Katherine Street, Wierda Valley, Sandton',
    city: 'Johannesburg',
    province: 'Gauteng',
    country: 'South Africa',
    locationPrecision: 'exact',
    coordinates: { lat: -26.1042, lng: 28.0588 },
    posterImage: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=800&auto=format&fit=crop&q=80',
    description: 'Comprehensive undergraduate bursary scheme supporting gifted South African students pursuing Bachelor of Science and Engineering qualifications. Covers 100% of university tuition, on-campus accommodation, meal allowance, book allowance, and a monthly personal allowance.',
    requirements: [
      'South African Citizen with valid SA ID',
      'Current Grade 12 learner or 1st year university student',
      'Minimum Level 6 (70%+) in Mathematics (Pure Maths)',
      'Minimum Level 6 (70%+) in Physical Sciences',
      'Combined APS Score of 33 or higher',
      'Enrolled or applying for BSc Engineering, Computer Science, Data Science, or Chemistry'
    ],
    compensationOrGrant: 'Full Tuition + Accommodation + R5,000 monthly allowance + Laptop',
    deadline: '2026-11-15',
    requiredDocuments: ['ID Copy', 'Matric Results / Grade 11 Final Report', 'Proof of Household Income', 'Proof of Residence'],
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Open',
    applicantCount: 84
  },
  {
    id: 'opp-sch-2',
    creatorId: 'org-firstrand',
    creatorName: 'FirstRand Foundation',
    creatorEmail: 'scholarships@firstrand.co.za',
    creatorPhone: '+27 11 282 1808',
    title: 'FirstRand Future Commerce & Tech Scholarship',
    companyOrInstitution: 'FirstRand Foundation',
    category: 'scholarship',
    opportunityType: 'Bursary',
    location: 'Fredman Drive, Sandton (National Coverage)',
    address: '4 Merchant Place, Fredman Drive, Sandton',
    city: 'Johannesburg',
    province: 'Gauteng',
    country: 'South Africa',
    locationPrecision: 'exact',
    coordinates: { lat: -26.1028, lng: 28.0551 },
    description: 'Designed to unlock potential in ambitious young leaders from under-resourced backgrounds studying Actuarial Science, Accounting (CA stream), Information Technology, or Quantitative Economics.',
    requirements: [
      'South African citizen from designated demographic groups',
      'Minimum Level 5 (60%+) in Mathematics',
      'Combined household income under R350,000 per annum',
      'Demonstrated academic merit and community leadership'
    ],
    compensationOrGrant: 'Full Tuition + Accommodation + Books + Mentorship',
    deadline: '2026-10-31',
    requiredDocuments: ['ID Copy', 'Matric Results', 'Proof of Household Income', 'Motivational Essay'],
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Open',
    applicantCount: 52
  },

  // --- UNIVERSITY & TVET ADMISSIONS (PUBLICLY SOURCED DIRECTORY) ---
  {
    id: 'opp-uni-1',
    creatorId: 'inst-uct',
    creatorName: 'University of Cape Town (UCT)',
    creatorEmail: 'admissions@uct.ac.za',
    creatorPhone: '+27 21 650 2128',
    title: 'BSc Computer Science & Information Technology',
    companyOrInstitution: 'University of Cape Town (UCT)',
    category: 'university',
    opportunityType: 'Undergraduate',
    workplaceType: 'On-site',
    location: 'Rondebosch, Cape Town',
    address: 'Upper Campus, Lovers Walk, Rondebosch',
    city: 'Cape Town',
    province: 'Western Cape',
    country: 'South Africa',
    locationPrecision: 'exact',
    coordinates: { lat: -33.9575, lng: 18.4612 },
    institutionFaculty: 'Faculty of Science',
    institutionCourse: 'Bachelor of Science (Computer Science & Business Computing)',
    minApsScore: 38,
    isPublicDirectory: true,
    openingDate: '2 April 2026',
    deadline: '31 October 2026',
    officialApplicationUrl: 'https://applyonline.uct.ac.za',
    applicationInstructions: 'Submit your formal application through the official UCT Online Applications portal. Upload certified copies of your SA ID/Passport and latest Grade 11 final or Grade 12 trial results. Application fee is R100 for South African applicants (automatic fee waiver available for low-income households).',
    sourceDisclaimer: 'Public admissions directory record compiled from the official University of Cape Town prospectus and Department of Higher Education & Training (DHET). Orbit AI is an independent admissions assistance tool and is not partnered with, affiliated with, or endorsed by University of Cape Town.',
    posterImage: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&auto=format&fit=crop&q=80',
    description: 'Ranked #1 in Africa. Comprehensive curriculum in algorithms, artificial intelligence, software engineering, systems architecture, and discrete mathematics. Orbit AI can assist you in preparing your personal statement, calculating your exact APS score, and compiling all required application documents.',
    requirements: [
      'National Senior Certificate (NSC) with Bachelor Degree endorsement',
      'Mathematics Level 6 (70%+) minimum',
      'English Home Language or First Additional Language Level 5 (60%+)',
      'Minimum Faculty Points Score (FPS) of 38+',
      'National Benchmark Tests (NBT) Mathematics & AL'
    ],
    compensationOrGrant: 'NSFAS & Merit Financial Aid eligible',
    requiredDocuments: ['Certified ID Copy', 'Matric Results / Grade 11 Report', 'Proof of Residence', 'Personal Motivation Letter'],
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Open',
    applicantCount: 110
  },
  {
    id: 'opp-uni-2',
    creatorId: 'inst-wits',
    creatorName: 'University of the Witwatersrand (Wits)',
    creatorEmail: 'student.admissions@wits.ac.za',
    creatorPhone: '+27 11 717 1888',
    title: 'BSc Electrical & Information Engineering',
    companyOrInstitution: 'University of the Witwatersrand (Wits)',
    category: 'university',
    opportunityType: 'Undergraduate',
    workplaceType: 'On-site',
    location: 'Braamfontein, Johannesburg',
    address: '1 Jan Smuts Avenue, Braamfontein',
    city: 'Johannesburg',
    province: 'Gauteng',
    country: 'South Africa',
    locationPrecision: 'exact',
    coordinates: { lat: -26.1929, lng: 28.0305 },
    institutionFaculty: 'Faculty of Engineering and the Built Environment',
    institutionCourse: 'Bachelor of Science in Engineering (Electrical)',
    minApsScore: 36,
    isPublicDirectory: true,
    openingDate: '1 March 2026',
    deadline: '30 September 2026',
    officialApplicationUrl: 'https://www.wits.ac.za/applications/',
    applicationInstructions: 'Apply via the Wits Student Admissions Portal. Enter biographical details and upload clear PDF copies of your identity document and Grade 11/12 report. Non-refundable R100 application fee applies.',
    sourceDisclaimer: 'Public admissions directory record compiled from the official University of the Witwatersrand prospectus. Orbit AI is an independent platform and is not partnered with, affiliated with, or endorsed by University of the Witwatersrand.',
    posterImage: 'https://images.unsplash.com/photo-1562774053-701939374585?w=800&auto=format&fit=crop&q=80',
    description: 'Internationally recognized engineering qualification accredited by ECSA. Specializations in telecommunications, embedded computing, smart grids, and robotics. Orbit AI can help you draft your letter of intent and verify your entry criteria.',
    requirements: [
      'NSC Bachelor Pass with Pure Mathematics Level 6 (70%+)',
      'Physical Science Level 6 (70%+)',
      'English Level 5 (60%+)',
      'Minimum APS Score: 36 points excluding Life Orientation'
    ],
    compensationOrGrant: 'NSFAS and Engineering Corporate Bursaries available',
    requiredDocuments: ['ID Copy', 'Matric Statement of Results', 'Proof of Residence'],
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Open',
    applicantCount: 76
  },
  {
    id: 'opp-uni-3',
    creatorId: 'inst-up',
    creatorName: 'University of Pretoria (UP)',
    creatorEmail: 'ssc@up.ac.za',
    creatorPhone: '+27 12 420 3111',
    title: 'BCom Accounting Sciences (Chartered Accountant CA stream)',
    companyOrInstitution: 'University of Pretoria (UP)',
    category: 'university',
    opportunityType: 'Undergraduate',
    workplaceType: 'On-site',
    location: 'Hatfield, Pretoria',
    address: 'Lynnwood Road, Hatfield',
    city: 'Pretoria',
    province: 'Gauteng',
    country: 'South Africa',
    locationPrecision: 'exact',
    coordinates: { lat: -25.7545, lng: 28.2314 },
    institutionFaculty: 'Faculty of Economic and Management Sciences',
    institutionCourse: 'BCom Accounting Sciences',
    minApsScore: 34,
    isPublicDirectory: true,
    openingDate: '1 April 2026',
    deadline: '30 September 2026',
    officialApplicationUrl: 'https://www.up.ac.za/online-application',
    applicationInstructions: 'Apply through the UP Student Service Portal. Upload certified copy of ID and official Grade 11/12 results. Initial application processing fee is R300.',
    sourceDisclaimer: 'Public admissions directory record compiled from the official University of Pretoria curriculum guide. Orbit AI is not partnered with, affiliated with, or endorsed by University of Pretoria.',
    description: 'Premier SAICA-accredited program with high pass rates in the Initial Test of Competence (ITC). Prepares graduates for careers as Chartered Accountants [CA(SA)]. Orbit AI provides application motivation guidance and subject score evaluation.',
    requirements: [
      'NSC with Bachelor pass',
      'Mathematics Level 5 (60%+)',
      'English Level 5 (60%+)',
      'Minimum APS of 34 points'
    ],
    compensationOrGrant: 'SAICA Thuthuka and NSFAS funding eligible',
    requiredDocuments: ['ID Copy', 'Matric Results', 'Proof of Residence'],
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Open',
    applicantCount: 65
  },
  {
    id: 'opp-uni-4',
    creatorId: 'inst-uj',
    creatorName: 'University of Johannesburg (UJ)',
    creatorEmail: 'mylife@uj.ac.za',
    creatorPhone: '+27 11 559 4555',
    title: 'BSc Information Technology & Computer Science',
    companyOrInstitution: 'University of Johannesburg (UJ)',
    category: 'university',
    opportunityType: 'Undergraduate',
    workplaceType: 'On-site',
    location: 'Auckland Park, Johannesburg',
    address: 'Kingsway Campus, Corner Kingsway & University Road, Auckland Park',
    city: 'Johannesburg',
    province: 'Gauteng',
    country: 'South Africa',
    locationPrecision: 'exact',
    coordinates: { lat: -26.1834, lng: 28.0003 },
    institutionFaculty: 'Faculty of Science',
    institutionCourse: 'Bachelor of Science in Information Technology (3 Years)',
    minApsScore: 30,
    isPublicDirectory: true,
    openingDate: '1 April 2026',
    deadline: '31 October 2026',
    officialApplicationUrl: 'https://www.uj.ac.za/admission-aid/undergraduate/',
    applicationInstructions: 'UJ online application is completely FREE for all South African citizens via the official UJ online application portal. No paper applications are accepted. Submit certified ID copy and matric results.',
    sourceDisclaimer: 'Public admissions directory record from official DHET and UJ admissions guidelines. Orbit AI is an independent assistant and is not partnered with or endorsed by University of Johannesburg.',
    posterImage: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop&q=80',
    description: 'Dynamic science degree covering cloud architecture, software engineering, systems administration, and data structures. UJ offers modern computing laboratories and strong ties with Silicon Valley and local industry leaders.',
    requirements: [
      'National Senior Certificate with Bachelor Degree endorsement',
      'Mathematics Level 5 (60%+) minimum',
      'English Level 4 (50%+)',
      'Minimum APS Score of 30'
    ],
    compensationOrGrant: 'Full NSFAS eligibility & Merit Bursaries',
    requiredDocuments: ['Certified ID Copy', 'Matric Results', 'Proof of Residence'],
    createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Open',
    applicantCount: 88
  },
  {
    id: 'opp-uni-5',
    creatorId: 'inst-stellenbosch',
    creatorName: 'Stellenbosch University (SU)',
    creatorEmail: 'info@sun.ac.za',
    creatorPhone: '+27 21 808 9111',
    title: 'BDatSci - Bachelor of Data Science',
    companyOrInstitution: 'Stellenbosch University (SU)',
    category: 'university',
    opportunityType: 'Undergraduate',
    workplaceType: 'On-site',
    location: 'Stellenbosch Central, Western Cape',
    address: 'Victoria Street, Stellenbosch Central',
    city: 'Stellenbosch',
    province: 'Western Cape',
    country: 'South Africa',
    locationPrecision: 'exact',
    coordinates: { lat: -33.9321, lng: 18.8602 },
    institutionFaculty: 'Faculty of Science & Economic and Management Sciences',
    institutionCourse: 'Bachelor of Data Science (Multi-disciplinary 4-Year Degree)',
    minApsScore: 36,
    isPublicDirectory: true,
    openingDate: '1 April 2026',
    deadline: '31 July 2026',
    officialApplicationUrl: 'https://www.maties.com',
    applicationInstructions: 'Apply online via the Maties Applicant Portal. Early closing date applies for selection courses. Application fee: R100.',
    sourceDisclaimer: 'Public admissions directory record from official Stellenbosch University prospectus. Orbit AI is not partnered with or endorsed by Stellenbosch University.',
    description: 'Cutting-edge multi-faculty program combining machine learning, computational statistics, high-performance computing, and business intelligence.',
    requirements: [
      'National Senior Certificate with Bachelor endorsement',
      'Mathematics Level 7 (80%+) minimum',
      'English Home Language (60%+) or First Additional Language (70%+)',
      'Minimum APS Score of 36 points'
    ],
    compensationOrGrant: 'NSFAS and Innovation Fund eligible',
    requiredDocuments: ['ID Copy', 'Matric Results', 'Proof of Residence'],
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Open',
    applicantCount: 54
  },
  {
    id: 'opp-uni-6',
    creatorId: 'inst-tshwane-south',
    creatorName: 'Tshwane South TVET College',
    creatorEmail: 'info@tsc.edu.za',
    creatorPhone: '+27 12 401 5000',
    title: 'NC(V) Information Technology & Computer Science',
    companyOrInstitution: 'Tshwane South TVET College',
    category: 'university',
    opportunityType: 'TVET',
    workplaceType: 'On-site',
    location: 'Pretoria Central, Gauteng',
    address: '85 Francis Baard Street, Pretoria Central',
    city: 'Pretoria',
    province: 'Gauteng',
    country: 'South Africa',
    locationPrecision: 'exact',
    coordinates: { lat: -25.7479, lng: 28.1871 },
    institutionFaculty: 'Information & Communication Technology',
    institutionCourse: 'NC(V) Level 2 to Level 4 (3 Years) - Fully NSFAS Accredited',
    minApsScore: 20,
    isPublicDirectory: true,
    openingDate: '1 September 2026',
    deadline: '30 November 2026',
    officialApplicationUrl: 'https://www.tsc.edu.za',
    applicationInstructions: 'Apply online via the TSC Coltech portal or visit any campus registration hub. Required documents: Certified ID copy, latest school report (Grade 9 or Matric), and proof of residence. Free application.',
    sourceDisclaimer: 'Public TVET college directory record compiled from Department of Higher Education & Training (DHET). Orbit AI is an independent portal and is not partnered with or endorsed by Tshwane South TVET College.',
    posterImage: 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&auto=format&fit=crop&q=80',
    description: 'Vocational national curriculum focused on practical networking, software installation, hardware repair, and workplace readiness. Direct pathway into IT technician and systems support roles.',
    requirements: [
      'Grade 9 Pass with Mathematics or Grade 12 / Matric Certificate',
      'South African Citizenship',
      'Minimum APS of 20 points',
      'Pass in pre-entry placement assessment'
    ],
    compensationOrGrant: '100% NSFAS TVET bursary covers tuition, textbooks & travel stipend',
    requiredDocuments: ['Certified ID Copy', 'Matric or Grade 9 School Report', 'Proof of Residence'],
    createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Open',
    applicantCount: 95
  },
  {
    id: 'opp-uni-7',
    creatorId: 'inst-cjc',
    creatorName: 'Central Johannesburg TVET College (CJC)',
    creatorEmail: 'admissions@cjc.edu.za',
    creatorPhone: '+27 11 351 6000',
    title: 'National Diploma (N4-N6) Electrical Engineering & Electronics',
    companyOrInstitution: 'Central Johannesburg TVET College (CJC)',
    category: 'university',
    opportunityType: 'TVET',
    workplaceType: 'On-site',
    location: 'Parktown, Johannesburg',
    address: '5 Ubla Avenue, Parktown, Johannesburg',
    city: 'Johannesburg',
    province: 'Gauteng',
    country: 'South Africa',
    locationPrecision: 'exact',
    coordinates: { lat: -26.1776, lng: 28.0435 },
    institutionFaculty: 'Engineering Studies',
    institutionCourse: 'NATED Report 191 N4 to N6 + 18 Months Practical Internship',
    minApsScore: 22,
    isPublicDirectory: true,
    openingDate: '1 October 2026',
    deadline: '15 December 2026',
    officialApplicationUrl: 'https://cjc.edu.za',
    applicationInstructions: 'Apply online via CJC student portal or on-campus walk-in registration. Submit certified Grade 12 certificate, ID copy, and proof of residence. Eligible for full NSFAS tuition and living allowance bursary.',
    sourceDisclaimer: 'Public TVET college directory record from Department of Higher Education & Training (DHET). Orbit AI is not partnered with or endorsed by Central Johannesburg TVET College.',
    description: 'Technical vocational program leading to the National N Diploma in Electrical Engineering. Covers power systems, electronics, industrial instruments, and electrotechnics.',
    requirements: [
      'National Senior Certificate / Matric with Mathematics and Physical Science (40%+)',
      'SA Citizenship',
      'APS Score of 22+'
    ],
    compensationOrGrant: 'Full NSFAS TVET grant + Travel allowance',
    requiredDocuments: ['Certified ID Copy', 'Matric Results', 'Proof of Residence'],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Open',
    applicantCount: 71
  },
  {
    id: 'opp-uni-8',
    creatorId: 'inst-falsebay',
    creatorName: 'False Bay TVET College',
    creatorEmail: 'info@falsebay.org.za',
    creatorPhone: '+27 21 787 0800',
    title: 'NC(V) Renewable Energy & Electrical Infrastructure',
    companyOrInstitution: 'False Bay TVET College',
    category: 'university',
    opportunityType: 'TVET',
    workplaceType: 'On-site',
    location: 'Westlake, Cape Town',
    address: 'Corner of Westlake Drive & Main Road, Westlake',
    city: 'Cape Town',
    province: 'Western Cape',
    country: 'South Africa',
    locationPrecision: 'exact',
    coordinates: { lat: -34.0792, lng: 18.4418 },
    institutionFaculty: 'Engineering & Green Economy Studies',
    institutionCourse: 'NC(V) Electrical Infrastructure Construction (Solar & Grid)',
    minApsScore: 21,
    isPublicDirectory: true,
    openingDate: '1 August 2026',
    deadline: '31 October 2026',
    officialApplicationUrl: 'https://www.falsebaycollege.co.za',
    applicationInstructions: 'Complete the online career placement evaluation on the False Bay College portal, then choose your program campus. Full bursary support through NSFAS.',
    sourceDisclaimer: 'Public TVET college directory record from DHET. Orbit AI is not partnered with or endorsed by False Bay TVET College.',
    posterImage: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800&auto=format&fit=crop&q=80',
    description: 'Award-winning TVET college program equipping students with solar PV installation, electrical compliance, safety protocols, and commercial wiring certification.',
    requirements: [
      'Grade 9 or Grade 12 Certificate with Mathematics/Maths Lit',
      'Pass in foundational numeracy and technical screening',
      'South African ID'
    ],
    compensationOrGrant: 'Full NSFAS Tuition & Equipment Coverage',
    requiredDocuments: ['ID Copy', 'Latest School Report / Matric', 'Proof of Residence'],
    createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Open',
    applicantCount: 62
  },

  // --- APPRENTICESHIPS ---
  {
    id: 'opp-appr-1',
    creatorId: 'emp-sasol-appr',
    creatorName: 'Sasol Mining & Energy Operations',
    creatorEmail: 'artisans@sasol.com',
    creatorPhone: '+27 17 610 1111',
    title: 'Mechanical Fitter & Turner Artisan Apprenticeship (MerSETA)',
    companyOrInstitution: 'Sasol Mining & Energy Operations',
    category: 'apprenticeship',
    opportunityType: 'Apprenticeship',
    workplaceType: 'On-site',
    location: 'Secunda Operations, Mpumalanga',
    address: 'Sasol Synfuels Complex, PDP Kruger Street, Secunda',
    city: 'Secunda',
    province: 'Mpumalanga',
    country: 'South Africa',
    locationPrecision: 'exact',
    coordinates: { lat: -26.5503, lng: 29.1764 },
    posterImage: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
    description: '4-year structured trade apprenticeship leading to a Red Seal Artisan qualification accredited by MerSETA and NAMB. Full practical workshop training, high-voltage equipment safety, lathe operations, and rotational plant mechanical maintenance.',
    requirements: [
      'N2 Certificate or Technical Matric (Grade 12) with Pure Mathematics (50%+) and Engineering Science (50%+)',
      'Passed relevant trade theory subjects (Fitting & Machining, Engineering Drawing)',
      'South African Citizen aged 18 to 35',
      'Medically fit for plant and heavy industrial operational environments'
    ],
    compensationOrGrant: 'R9,200 monthly apprentice stipend + Full Trade Test & Tool Allowance',
    deadline: '2026-11-28',
    requiredDocuments: ['Certified ID Copy', 'Matric / N2 Certificate', 'Proof of Residence'],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Open',
    applicantCount: 41,
    industry: 'Engineering & Manufacturing',
    educationLevel: 'N2 / Technical Matric',
    nqfLevel: 4,
    verified: true
  },

  // --- GOVERNMENT OPPORTUNITIES ---
  {
    id: 'opp-gov-1',
    creatorId: 'gov-dpsa',
    creatorName: 'Department of Public Service & Administration (DPSA)',
    creatorEmail: 'vacancies@dpsa.gov.za',
    creatorPhone: '+27 12 336 1000',
    title: 'Public Administration & Registry Officer (Public Service Circular 14)',
    companyOrInstitution: 'Department of Public Service & Administration (DPSA)',
    category: 'government',
    opportunityType: 'Government',
    workplaceType: 'On-site',
    location: 'Pretoria Central, Tshwane',
    address: 'Batho Pele House, 546 Edmond Street, Arcadia, Pretoria',
    city: 'Pretoria',
    province: 'Gauteng',
    country: 'South Africa',
    locationPrecision: 'exact',
    coordinates: { lat: -25.7461, lng: 28.1881 },
    posterImage: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800&auto=format&fit=crop&q=80',
    description: 'Permanent public service entry appointment under the Public Service Act. Manage departmental records classification, electronic correspondence archiving, citizen query resolution, and parliamentary committee documentation.',
    requirements: [
      'Grade 12 / Senior Certificate with recognized post-matric administrative qualification or 3-year National Diploma',
      'Knowledge of the National Archives and Records Service Act & PAIA guidelines',
      'Computer literacy in MS Office and electronic records databases',
      'Completed New Z83 application form and valid SA Citizenship'
    ],
    compensationOrGrant: 'R216,840 - R255,450 per annum (Salary Level 5) + 13th Cheque & GEMS Medical Aid',
    deadline: '2026-11-14',
    requiredDocuments: ['Z83 Form', 'Comprehensive CV', 'Certified ID Copy', 'Matric & Qualification Certificates', 'Proof of Residence'],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Open',
    applicantCount: 88,
    industry: 'Public Service & Governance',
    educationLevel: 'Matric / Diploma',
    nqfLevel: 5,
    verified: true
  },
  {
    id: 'opp-gov-2',
    creatorId: 'gov-dbe-pyei',
    creatorName: 'Department of Basic Education (DBE)',
    creatorEmail: 'pyei-support@dbe.gov.za',
    creatorPhone: '+27 80 020 2933',
    title: 'Presidential Youth Employment Initiative (PYEI) - Digital & Reading Assistant',
    companyOrInstitution: 'Department of Basic Education (DBE)',
    category: 'government',
    opportunityType: 'Government',
    workplaceType: 'On-site',
    location: 'Soweto / Johannesburg South Districts',
    address: 'Orlando East & Diepkloof Circuit Educational Hubs',
    city: 'Johannesburg',
    province: 'Gauteng',
    country: 'South Africa',
    locationPrecision: 'exact',
    coordinates: { lat: -26.2678, lng: 27.8585 },
    posterImage: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&auto=format&fit=crop&q=80',
    description: 'National youth employment stimulus initiative providing structured workplace experience in local public schools. Support classroom educators with foundational literacy, digital library administration, and learner numeracy exercises.',
    requirements: [
      'Unemployed South African youth aged 18 to 35',
      'Matric (Grade 12) Certificate passed with standard endorsements',
      'Must reside within 5 km of the beneficiary community school (Proof of residence mandatory)',
      'Clean criminal background check and child protection clearance'
    ],
    compensationOrGrant: 'R4,450 monthly national stimulus stipend',
    deadline: '2026-10-31',
    requiredDocuments: ['Certified ID Copy', 'Matric Certificate', 'Proof of Address / Ward Councillor Letter'],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Open',
    applicantCount: 142,
    industry: 'Education & Community Development',
    educationLevel: 'Matric',
    nqfLevel: 4,
    verified: true
  },

  // --- TRAINING & BOOTCAMPS ---
  {
    id: 'opp-train-1',
    creatorId: 'org-harambee-aws',
    creatorName: 'Harambee Youth Employment Accelerator & AWS',
    creatorEmail: 'cloudskills@harambee.co.za',
    creatorPhone: '+27 11 593 0500',
    title: 'AWS re/Start Cloud Practitioner Fast-Track Bootcamp',
    companyOrInstitution: 'Harambee Youth Employment Accelerator & AWS',
    category: 'training',
    opportunityType: 'Contract',
    workplaceType: 'Hybrid',
    location: 'Braamfontein Tech Hub, Johannesburg',
    address: '19 Ameshoff Street, Braamfontein',
    city: 'Johannesburg',
    province: 'Gauteng',
    country: 'South Africa',
    locationPrecision: 'exact',
    coordinates: { lat: -26.1919, lng: 28.0336 },
    posterImage: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80',
    description: '12-week full-time intensive bootcamp covering cloud computing foundations, Linux terminal commands, Python scripting, networking fundamentals, and AWS Core Services. Fully sponsored program including official AWS Certified Cloud Practitioner examination voucher and direct employer recruitment days.',
    requirements: [
      'Unemployed South African citizen aged 18 to 29',
      'Grade 12 / Matric with foundational numeracy and logical problem-solving aptitude',
      'Pass Harambee online analytical assessment',
      'Full-time availability (Monday to Friday, 08:30 - 16:30)'
    ],
    compensationOrGrant: '100% Funded Scholarship + Transport Allowance + AWS Exam Voucher',
    deadline: '2026-11-25',
    requiredDocuments: ['ID Copy', 'Matric Statement of Results', 'Proof of Residence'],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Open',
    applicantCount: 79,
    industry: 'Information Technology & Cloud',
    educationLevel: 'Matric',
    nqfLevel: 5,
    verified: true
  },

  // --- GRADUATE PROGRAMMES ---
  {
    id: 'opp-grad-1',
    creatorId: 'emp-standardbank-grad',
    creatorName: 'Standard Bank South Africa',
    creatorEmail: 'graduates@standardbank.co.za',
    creatorPhone: '+27 11 636 9111',
    title: 'Standard Bank Group Tech & Cloud Architecture Graduate Programme 2027',
    companyOrInstitution: 'Standard Bank South Africa',
    category: 'internship',
    opportunityType: 'Internship',
    workplaceType: 'Hybrid',
    location: 'Rosebank / Simmonds Street, Johannesburg',
    address: '30 Baker Street, Rosebank, Johannesburg',
    city: 'Johannesburg',
    province: 'Gauteng',
    country: 'South Africa',
    locationPrecision: 'exact',
    coordinates: { lat: -26.1472, lng: 28.0416 },
    posterImage: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80',
    description: '18-month rotational graduate leadership journey within Africa\'s largest financial institution. Accelerate in DevOps, distributed microservices, fintech API integration, and enterprise banking security alongside chief enterprise architects.',
    requirements: [
      'Final-year student or recent graduate (BSc, BEng, BCom) in Computer Science, Information Systems, Software Engineering, or Applied Maths',
      'Minimum 65% cumulative academic average',
      'Passion for scalable cloud banking and financial inclusion',
      'South African citizenship or permanent residency'
    ],
    compensationOrGrant: 'R380,000 - R430,000 annual graduate package + Corporate Benefits',
    deadline: '2026-10-31',
    requiredDocuments: ['CV / Resume', 'Full Academic Transcript', 'Certified ID Copy'],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Open',
    applicantCount: 114,
    industry: 'Banking & Financial Services',
    educationLevel: 'Bachelor Degree',
    nqfLevel: 7,
    verified: true
  }
];

export async function dbFetchOpportunities(): Promise<Opportunity[]> {
  try {
    const { data, error } = await supabase
      .from('opportunities')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      const local = localStorage.getItem('orbit_opportunities');
      if (local) {
        try {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {}
      }
      try {
        localStorage.setItem('orbit_opportunities', JSON.stringify(DEFAULT_OPPORTUNITIES));
      } catch (e) {}
      return DEFAULT_OPPORTUNITIES;
    }

    return data.map((d: any) => ({
      id: d.id,
      creatorId: d.creator_id,
      creatorName: d.creator_name,
      creatorEmail: d.creator_email,
      creatorPhone: d.creator_phone,
      title: d.title,
      companyOrInstitution: d.company_or_institution || d.company,
      category: d.category as OpportunityCategory,
      opportunityType: d.opportunity_type as any,
      workplaceType: d.workplace_type as any,
      location: d.location,
      address: d.address,
      city: d.city,
      province: d.province,
      country: d.country || 'South Africa',
      locationPrecision: d.location_precision as any,
      coordinates: d.coordinates ? (typeof d.coordinates === 'string' ? JSON.parse(d.coordinates) : d.coordinates) : undefined,
      posterImage: d.poster_image || d.posterImage,
      logoUrl: d.logo_url || d.logoUrl,
      description: d.description,
      requirements: Array.isArray(d.requirements) ? d.requirements : (d.requirements ? JSON.parse(d.requirements) : []),
      compensationOrGrant: d.compensation_or_grant,
      deadline: d.deadline,
      isPublicDirectory: d.is_public_directory ?? d.isPublicDirectory,
      sourceDisclaimer: d.source_disclaimer || d.sourceDisclaimer,
      openingDate: d.opening_date || d.openingDate,
      institutionFaculty: d.institution_faculty,
      institutionCourse: d.institution_course,
      minApsScore: d.min_aps_score ? Number(d.min_aps_score) : undefined,
      applicationInstructions: d.application_instructions || d.applicationInstructions,
      officialApplicationUrl: d.official_application_url || d.officialApplicationUrl,
      proofOfResidenceRequired: d.proof_of_residence_required ?? d.proofOfResidenceRequired,
      qualificationRequired: d.qualification_required || d.qualificationRequired,
      screeningQuestions: d.screening_questions ? (typeof d.screening_questions === 'string' ? JSON.parse(d.screening_questions) : d.screening_questions) : d.screeningQuestions,
      requiredDocuments: Array.isArray(d.required_documents) ? d.required_documents : (d.required_documents ? JSON.parse(d.required_documents) : []),
      createdAt: d.created_at || new Date().toISOString(),
      status: d.status || 'Open',
      applicantCount: Number(d.applicant_count || 0)
    }));
  } catch (err) {
    console.warn("Supabase fetch opportunities failed, using fallback:", err);
    try {
      const local = localStorage.getItem('orbit_opportunities');
      if (local) return JSON.parse(local);
    } catch (e) {}
    return DEFAULT_OPPORTUNITIES;
  }
}

export async function dbUpsertOpportunity(opp: Opportunity): Promise<boolean> {
  try {
    try {
      const local = localStorage.getItem('orbit_opportunities');
      const list: Opportunity[] = local ? JSON.parse(local) : [...DEFAULT_OPPORTUNITIES];
      const idx = list.findIndex(o => o.id === opp.id);
      if (idx >= 0) list[idx] = opp;
      else list.unshift(opp);
      localStorage.setItem('orbit_opportunities', JSON.stringify(list));
    } catch (e) {}

    const { error } = await supabase
      .from('opportunities')
      .upsert({
        id: opp.id,
        creator_id: opp.creatorId,
        creator_name: opp.creatorName,
        creator_email: opp.creatorEmail,
        creator_phone: opp.creatorPhone,
        title: opp.title,
        company_or_institution: opp.companyOrInstitution,
        category: opp.category,
        opportunity_type: opp.opportunityType,
        workplace_type: opp.workplaceType,
        location: opp.location,
        address: opp.address,
        city: opp.city,
        province: opp.province,
        country: opp.country || 'South Africa',
        location_precision: opp.locationPrecision,
        coordinates: opp.coordinates,
        poster_image: opp.posterImage,
        logo_url: opp.logoUrl,
        proof_of_residence_required: opp.proofOfResidenceRequired,
        qualification_required: opp.qualificationRequired,
        screening_questions: opp.screeningQuestions,
        description: opp.description,
        requirements: opp.requirements,
        compensation_or_grant: opp.compensationOrGrant,
        deadline: opp.deadline,
        institution_faculty: opp.institutionFaculty,
        institution_course: opp.institutionCourse,
        min_aps_score: opp.minApsScore,
        required_documents: opp.requiredDocuments,
        created_at: opp.createdAt,
        status: opp.status,
        applicant_count: opp.applicantCount || 0
      });

    if (error && error.code !== '42P01') {
      console.warn("Supabase upsert opportunity notice:", error.message);
    }
    return true;
  } catch (err) {
    console.warn("dbUpsertOpportunity exception handled:", err);
    return true;
  }
}

export async function dbDeleteOpportunity(id: string): Promise<boolean> {
  try {
    try {
      const local = localStorage.getItem('orbit_opportunities');
      if (local) {
        const list: Opportunity[] = JSON.parse(local);
        const filtered = list.filter(o => o.id !== id);
        localStorage.setItem('orbit_opportunities', JSON.stringify(filtered));
      }
    } catch (e) {}

    await supabase.from('opportunities').delete().eq('id', id);
    return true;
  } catch (err) {
    return true;
  }
}

export async function dbFetchOpportunityApplications(userId?: string, opportunityId?: string): Promise<OpportunityApplication[]> {
  try {
    let query = supabase.from('opportunity_applications').select('*');
    if (userId) query = query.eq('applicant_id', userId);
    if (opportunityId) query = query.eq('opportunity_id', opportunityId);
    query = query.order('submitted_at', { ascending: false });

    const { data, error } = await query;
    if (error || !data || data.length === 0) {
      const local = localStorage.getItem('orbit_opportunity_applications');
      if (local) {
        try {
          const list: OpportunityApplication[] = JSON.parse(local);
          let filtered = list;
          if (userId) filtered = filtered.filter(a => a.applicantId === userId);
          if (opportunityId) filtered = filtered.filter(a => a.opportunityId === opportunityId);
          return filtered;
        } catch (e) {}
      }
      return [];
    }

    return data.map((d: any) => ({
      id: d.id,
      opportunityId: d.opportunity_id,
      opportunityTitle: d.opportunity_title,
      opportunityCompany: d.opportunity_company,
      opportunityCategory: d.opportunity_category as OpportunityCategory,
      applicantId: d.applicant_id,
      applicantName: d.applicant_name,
      applicantEmail: d.applicant_email,
      applicantPhone: d.applicant_phone,
      residentialAddress: d.residential_address,
      applicantLocationName: d.applicant_location_name,
      applicantCoordinates: d.applicant_coordinates,
      qualificationType: d.qualification_type,
      screeningAnswers: d.screening_answers ? (typeof d.screening_answers === 'string' ? JSON.parse(d.screening_answers) : d.screening_answers) : undefined,
      cvText: d.cv_text,
      cvFileName: d.cv_file_name,
      coverNote: d.cover_note,
      documents: Array.isArray(d.documents) ? d.documents : (d.documents ? JSON.parse(d.documents) : []),
      selectedInstitution: d.selected_institution,
      selectedCourse: d.selected_course,
      matricScoresSummary: d.matric_scores_summary,
      apsCalculated: d.aps_calculated ? Number(d.aps_calculated) : undefined,
      status: d.status as ApplicationStatus,
      statusNotes: d.status_notes,
      employerNotes: d.employer_notes,
      aiMatchEvaluation: d.ai_match_evaluation ? (typeof d.ai_match_evaluation === 'string' ? JSON.parse(d.ai_match_evaluation) : d.ai_match_evaluation) : undefined,
      submittedAt: d.submitted_at || new Date().toISOString(),
      updatedAt: d.updated_at || new Date().toISOString()
    }));
  } catch (err) {
    console.warn("Supabase fetch opportunity applications fallback:", err);
    try {
      const local = localStorage.getItem('orbit_opportunity_applications');
      if (local) {
        const list: OpportunityApplication[] = JSON.parse(local);
        let filtered = list;
        if (userId) filtered = filtered.filter(a => a.applicantId === userId);
        if (opportunityId) filtered = filtered.filter(a => a.opportunityId === opportunityId);
        return filtered;
      }
    } catch (e) {}
    return [];
  }
}

export async function dbUpsertOpportunityApplication(app: OpportunityApplication): Promise<boolean> {
  try {
    try {
      const local = localStorage.getItem('orbit_opportunity_applications');
      const list: OpportunityApplication[] = local ? JSON.parse(local) : [];
      const idx = list.findIndex(a => a.id === app.id);
      if (idx >= 0) list[idx] = app;
      else list.unshift(app);
      localStorage.setItem('orbit_opportunity_applications', JSON.stringify(list));

      const oppsLocal = localStorage.getItem('orbit_opportunities');
      if (oppsLocal) {
        const opps: Opportunity[] = JSON.parse(oppsLocal);
        const oIdx = opps.findIndex(o => o.id === app.opportunityId);
        if (oIdx >= 0) {
          opps[oIdx].applicantCount = (opps[oIdx].applicantCount || 0) + 1;
          localStorage.setItem('orbit_opportunities', JSON.stringify(opps));
        }
      }
    } catch (e) {}

    const { error } = await supabase
      .from('opportunity_applications')
      .upsert({
        id: app.id,
        opportunity_id: app.opportunityId,
        opportunity_title: app.opportunityTitle,
        opportunity_company: app.opportunityCompany,
        opportunity_category: app.opportunityCategory,
        applicant_id: app.applicantId,
        applicant_name: app.applicantName,
        applicant_email: app.applicantEmail,
        applicant_phone: app.applicantPhone,
        residential_address: app.residentialAddress,
        applicant_location_name: app.applicantLocationName,
        applicant_coordinates: app.applicantCoordinates,
        qualification_type: app.qualificationType,
        screening_answers: app.screeningAnswers,
        cv_text: app.cvText,
        cv_file_name: app.cvFileName,
        cover_note: app.coverNote,
        documents: app.documents,
        selected_institution: app.selectedInstitution,
        selected_course: app.selectedCourse,
        matric_scores_summary: app.matricScoresSummary,
        aps_calculated: app.apsCalculated,
        status: app.status,
        status_notes: app.statusNotes,
        employer_notes: app.employerNotes,
        ai_match_evaluation: app.aiMatchEvaluation,
        submitted_at: app.submittedAt,
        updated_at: app.updatedAt
      });

    if (error && error.code !== '42P01') {
      console.warn("Supabase upsert opportunity application notice:", error.message);
    }
    return true;
  } catch (err) {
    console.warn("dbUpsertOpportunityApplication exception handled:", err);
    return true;
  }
}

export async function dbUpdateApplicationStatus(
  appId: string, 
  status: ApplicationStatus, 
  notes?: string,
  employerNotes?: string
): Promise<boolean> {
  try {
    try {
      const local = localStorage.getItem('orbit_opportunity_applications');
      if (local) {
        const list: OpportunityApplication[] = JSON.parse(local);
        const idx = list.findIndex(a => a.id === appId);
        if (idx >= 0) {
          list[idx].status = status;
          if (notes !== undefined) list[idx].statusNotes = notes;
          if (employerNotes !== undefined) list[idx].employerNotes = employerNotes;
          list[idx].updatedAt = new Date().toISOString();
          localStorage.setItem('orbit_opportunity_applications', JSON.stringify(list));
        }
      }
    } catch (e) {}

    const payload: any = {
      status,
      updated_at: new Date().toISOString()
    };
    if (notes !== undefined) payload.status_notes = notes;
    if (employerNotes !== undefined) payload.employer_notes = employerNotes;

    await supabase
      .from('opportunity_applications')
      .update(payload)
      .eq('id', appId);

    return true;
  } catch (err) {
    return true;
  }
}

export async function dbUploadOpportunityDocument(file: File, filename?: string): Promise<string | null> {
  try {
    const cleanName = filename || `doc_${Date.now()}_${Math.random().toString(36).substring(7)}_${file.name.replace(/\s+/g, '_')}`;
    const bucket = supabase.storage.from('obdi-photos');
    const { data, error } = await bucket.upload(`opportunities/${cleanName}`, file, {
      cacheControl: '3600',
      upsert: true
    });
    if (!error && data) {
      const { data: pub } = bucket.getPublicUrl(`opportunities/${cleanName}`);
      if (pub?.publicUrl) return pub.publicUrl;
    }
  } catch (err) {
    console.warn("Storage upload fallback to base64 reader:", err);
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

export function dbFetchUserStoredDocuments(userId: string): ApplicationDocument[] {
  try {
    const key = `orbit_docs_${userId || 'guest'}`;
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

export function dbSaveUserStoredDocument(userId: string, doc: ApplicationDocument): void {
  try {
    const key = `orbit_docs_${userId || 'guest'}`;
    const existing = dbFetchUserStoredDocuments(userId);
    const idx = existing.findIndex(d => d.name === doc.name && d.type === doc.type);
    if (idx >= 0) existing[idx] = doc;
    else existing.push(doc);
    localStorage.setItem(key, JSON.stringify(existing));
  } catch (e) {}
}

export function dbDeleteUserStoredDocument(userId: string, docId: string): void {
  try {
    const key = `orbit_docs_${userId || 'guest'}`;
    const existing = dbFetchUserStoredDocuments(userId);
    const filtered = existing.filter(d => d.id !== docId);
    localStorage.setItem(key, JSON.stringify(filtered));
  } catch (e) {}
}

export async function dbFetchOpportunityMessages(
  opportunityId?: string, 
  applicantIdentifier?: string, 
  applicationId?: string
): Promise<OpportunityMessage[]> {
  try {
    const local = localStorage.getItem('orbit_opportunity_messages');
    let messages: OpportunityMessage[] = local ? JSON.parse(local) : [];

    // Filter by opportunity, applicant, or application
    if (applicationId) {
      messages = messages.filter(m => 
        m.applicationId === applicationId || 
        (opportunityId && m.opportunityId === opportunityId && (!applicantIdentifier || m.applicantId === applicantIdentifier || m.applicantEmail === applicantIdentifier || m.senderId === applicantIdentifier || m.recipientId === applicantIdentifier))
      );
    } else if (opportunityId && applicantIdentifier) {
      messages = messages.filter(m => 
        m.opportunityId === opportunityId && 
        (m.applicantId === applicantIdentifier || m.applicantEmail === applicantIdentifier || m.senderId === applicantIdentifier || m.recipientId === applicantIdentifier)
      );
    } else if (opportunityId) {
      messages = messages.filter(m => m.opportunityId === opportunityId);
    } else if (applicantIdentifier) {
      messages = messages.filter(m => 
        m.applicantId === applicantIdentifier || m.applicantEmail === applicantIdentifier || m.senderId === applicantIdentifier || m.recipientId === applicantIdentifier
      );
    }

    // Attempt Supabase fetch
    try {
      let query = supabase.from('opportunity_messages').select('*');
      if (applicationId) {
        query = query.eq('application_id', applicationId);
      } else if (opportunityId) {
        query = query.eq('opportunity_id', opportunityId);
      }
      query = query.order('created_at', { ascending: true });

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        let remoteMessages: OpportunityMessage[] = data.map((d: any) => ({
          id: d.id,
          conversationId: d.conversation_id,
          opportunityId: d.opportunity_id,
          opportunityTitle: d.opportunity_title,
          companyName: d.company_name,
          applicationId: d.application_id,
          applicantId: d.applicant_id,
          applicantName: d.applicant_name,
          applicantEmail: d.applicant_email,
          senderId: d.sender_id,
          senderName: d.sender_name,
          senderRole: d.sender_role,
          recipientId: d.recipient_id,
          recipientName: d.recipient_name,
          text: d.text,
          timestamp: d.timestamp || d.created_at,
          createdAt: d.created_at || d.timestamp,
          read: d.read,
          status: d.read ? 'read' : 'delivered'
        }));

        if (applicantIdentifier) {
          remoteMessages = remoteMessages.filter(m => 
            m.applicantId === applicantIdentifier || 
            m.applicantEmail === applicantIdentifier || 
            m.senderId === applicantIdentifier || 
            m.recipientId === applicantIdentifier
          );
        }

        // Merge without duplicates
        const map = new Map<string, OpportunityMessage>();
        messages.forEach(m => map.set(m.id, m));
        remoteMessages.forEach(m => map.set(m.id, m));
        return Array.from(map.values()).sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeA - timeB;
        });
      }
    } catch (err) {}

    return messages.sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return timeA - timeB;
    });
  } catch (e) {
    return [];
  }
}

export async function dbSendOpportunityMessage(msg: OpportunityMessage): Promise<boolean> {
  try {
    const enrichedMsg: OpportunityMessage = {
      ...msg,
      createdAt: msg.createdAt || new Date().toISOString(),
      status: msg.status || 'sent',
      read: msg.read ?? false
    };

    // 1. Store in local storage immediately for 100% reliable offline/reload persistence
    try {
      const local = localStorage.getItem('orbit_opportunity_messages');
      const list: OpportunityMessage[] = local ? JSON.parse(local) : [];
      const existingIdx = list.findIndex(m => m.id === enrichedMsg.id);
      if (existingIdx >= 0) {
        list[existingIdx] = enrichedMsg;
      } else {
        list.push(enrichedMsg);
      }
      localStorage.setItem('orbit_opportunity_messages', JSON.stringify(list));
    } catch (e) {}

    // 2. Sync to Supabase table
    try {
      await supabase.from('opportunity_messages').upsert({
        id: enrichedMsg.id,
        conversation_id: enrichedMsg.conversationId || `${enrichedMsg.opportunityId}_${enrichedMsg.applicantId || enrichedMsg.senderId}`,
        opportunity_id: enrichedMsg.opportunityId,
        opportunity_title: enrichedMsg.opportunityTitle,
        company_name: enrichedMsg.companyName,
        application_id: enrichedMsg.applicationId || null,
        applicant_id: enrichedMsg.applicantId || null,
        applicant_name: enrichedMsg.applicantName || null,
        applicant_email: enrichedMsg.applicantEmail || null,
        sender_id: enrichedMsg.senderId,
        sender_name: enrichedMsg.senderName,
        sender_role: enrichedMsg.senderRole,
        recipient_id: enrichedMsg.recipientId,
        recipient_name: enrichedMsg.recipientName,
        text: enrichedMsg.text,
        timestamp: enrichedMsg.timestamp,
        created_at: enrichedMsg.createdAt,
        read: enrichedMsg.read ?? false
      });
    } catch (err) {}

    return true;
  } catch (e) {
    return true;
  }
}

export async function dbMarkOpportunityMessagesAsRead(
  opportunityId: string, 
  applicantIdentifier: string, 
  readerRole: 'applicant' | 'employer'
): Promise<void> {
  try {
    // 1. Update localStorage
    const local = localStorage.getItem('orbit_opportunity_messages');
    if (local) {
      const list: OpportunityMessage[] = JSON.parse(local);
      let updated = false;
      list.forEach(m => {
        const matchesOpp = m.opportunityId === opportunityId;
        const matchesApplicant = !applicantIdentifier || 
          m.applicantId === applicantIdentifier || 
          m.applicantEmail === applicantIdentifier || 
          m.senderId === applicantIdentifier || 
          m.recipientId === applicantIdentifier;

        if (matchesOpp && matchesApplicant && m.senderRole !== readerRole && !m.read) {
          m.read = true;
          m.status = 'read';
          updated = true;
        }
      });
      if (updated) {
        localStorage.setItem('orbit_opportunity_messages', JSON.stringify(list));
      }
    }

    // 2. Update Supabase
    try {
      await supabase
        .from('opportunity_messages')
        .update({ read: true })
        .eq('opportunity_id', opportunityId)
        .neq('sender_role', readerRole);
    } catch (e) {}
  } catch (e) {}
}

export interface EmployerConversationSummary {
  conversationId: string;
  opportunityId: string;
  opportunityTitle: string;
  applicantId: string;
  applicantName: string;
  applicantEmail?: string;
  applicationId?: string;
  lastMessageText: string;
  lastMessageTime: string;
  lastMessageSenderRole?: 'employer' | 'applicant';
  unreadCount: number;
}

export async function dbFetchEmployerConversations(employerOppIds: string[]): Promise<EmployerConversationSummary[]> {
  try {
    const oppIdSet = new Set(employerOppIds);
    let allMessages: OpportunityMessage[] = [];

    // Local
    const local = localStorage.getItem('orbit_opportunity_messages');
    if (local) {
      allMessages = JSON.parse(local);
    }

    // Supabase
    try {
      const { data } = await supabase
        .from('opportunity_messages')
        .select('*')
        .in('opportunity_id', employerOppIds)
        .order('created_at', { ascending: true });

      if (data && data.length > 0) {
        const map = new Map<string, OpportunityMessage>();
        allMessages.forEach(m => map.set(m.id, m));
        data.forEach((d: any) => {
          map.set(d.id, {
            id: d.id,
            conversationId: d.conversation_id,
            opportunityId: d.opportunity_id,
            opportunityTitle: d.opportunity_title,
            companyName: d.company_name,
            applicationId: d.application_id,
            applicantId: d.applicant_id,
            applicantName: d.applicant_name,
            applicantEmail: d.applicant_email,
            senderId: d.sender_id,
            senderName: d.sender_name,
            senderRole: d.sender_role,
            recipientId: d.recipient_id,
            recipientName: d.recipient_name,
            text: d.text,
            timestamp: d.timestamp || d.created_at,
            createdAt: d.created_at || d.timestamp,
            read: d.read,
            status: d.read ? 'read' : 'delivered'
          });
        });
        allMessages = Array.from(map.values());
      }
    } catch (e) {}

    // Group by conversation
    const convMap = new Map<string, {
      conversationId: string;
      opportunityId: string;
      opportunityTitle: string;
      applicantId: string;
      applicantName: string;
      applicantEmail?: string;
      applicationId?: string;
      lastMessageText: string;
      lastMessageTime: string;
      lastMessageTimestampNumber: number;
      lastMessageSenderRole?: 'employer' | 'applicant';
      unreadCount: number;
    }>();

    for (const msg of allMessages) {
      if (!oppIdSet.has(msg.opportunityId)) continue;

      const applicantId = msg.applicantId || (msg.senderRole === 'applicant' ? msg.senderId : msg.recipientId);
      const applicantName = msg.applicantName || (msg.senderRole === 'applicant' ? msg.senderName : msg.recipientName);
      const key = `${msg.opportunityId}__${applicantId}`;

      const existing = convMap.get(key);
      const msgTime = msg.createdAt ? new Date(msg.createdAt).getTime() : 0;
      const isUnreadForEmployer = msg.senderRole === 'applicant' && !msg.read;

      if (!existing) {
        convMap.set(key, {
          conversationId: key,
          opportunityId: msg.opportunityId,
          opportunityTitle: msg.opportunityTitle,
          applicantId: applicantId,
          applicantName: applicantName || 'Candidate',
          applicantEmail: msg.applicantEmail,
          applicationId: msg.applicationId,
          lastMessageText: msg.text,
          lastMessageTime: msg.timestamp,
          lastMessageTimestampNumber: msgTime,
          lastMessageSenderRole: msg.senderRole,
          unreadCount: isUnreadForEmployer ? 1 : 0
        });
      } else {
        if (msgTime >= existing.lastMessageTimestampNumber) {
          existing.lastMessageText = msg.text;
          existing.lastMessageTime = msg.timestamp;
          existing.lastMessageTimestampNumber = msgTime;
          existing.lastMessageSenderRole = msg.senderRole;
        }
        if (isUnreadForEmployer) {
          existing.unreadCount += 1;
        }
        if (!existing.applicationId && msg.applicationId) {
          existing.applicationId = msg.applicationId;
        }
      }
    }

    return Array.from(convMap.values())
      .sort((a, b) => b.lastMessageTimestampNumber - a.lastMessageTimestampNumber)
      .map(({ lastMessageTimestampNumber, ...rest }) => rest);
  } catch (e) {
    return [];
  }
}

export async function dbFetchApplicantUnreadCount(applicantIdentifier: string): Promise<number> {
  try {
    const local = localStorage.getItem('orbit_opportunity_messages');
    const messages: OpportunityMessage[] = local ? JSON.parse(local) : [];
    return messages.filter(m => 
      (m.applicantId === applicantIdentifier || m.applicantEmail === applicantIdentifier || m.recipientId === applicantIdentifier) &&
      m.senderRole === 'employer' &&
      !m.read
    ).length;
  } catch (e) {
    return 0;
  }
}

export async function dbFetchEmployerUnreadCount(employerOppIds: string[]): Promise<number> {
  try {
    const local = localStorage.getItem('orbit_opportunity_messages');
    const messages: OpportunityMessage[] = local ? JSON.parse(local) : [];
    const oppSet = new Set(employerOppIds);
    return messages.filter(m => 
      oppSet.has(m.opportunityId) &&
      m.senderRole === 'applicant' &&
      !m.read
    ).length;
  } catch (e) {
    return 0;
  }
}


