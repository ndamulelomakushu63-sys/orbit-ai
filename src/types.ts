export enum UserPlan {
  FREE = "Free",
  PRO = "Pro"
}

export enum WithdrawalStatus {
  PENDING = "Pending",
  APPROVED = "Approved",
  REJECTED = "Rejected"
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  plan: UserPlan;
  subscription_status?: 'free' | 'pro_monthly' | 'pro_yearly';
  chat_count_today?: number;
  image_count_today?: number;
  file_upload_count_today?: number;
  camera_upload_count_today?: number;
  last_reset_time?: string;
  subscription_start_date?: string;
  subscription_end_date?: string;
  cancelled_at?: string;
  refund_requested?: boolean;
  refund_request_date?: string;
  agentStatus: boolean; // Activated referral agent
  balance: number; // Reward dashboard earnings
  referralCode: string; // Generated on Agent Activation
  referredBy?: string; // Referral code of person who invited them
  createdAt: string;
  activeAgentId?: string; // Selected AI agent
}

export interface SubscriptionRecord {
  id: string;
  userId: string;
  plan: "Monthly" | "Yearly";
  amount: number;
  status: "Active" | "Expired" | "Cancelled";
  renewalDate: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  messageId?: string;
  conversationId: string;
  message: string;
  role: "user" | "model";
  timestamp: string;
  createdAt?: string;
  replyToMessageId?: string;
  deletedAt?: string;
}

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
}

export interface ReferralRecord {
  id: string;
  referrerId: string; // user balance-holder UID
  referredUserId: string; // signee UID
  reward: number; // R10
  status: "Pending" | "Paid" | "Failed";
  timestamp: string;
  referredName: string;
}

export interface WithdrawalRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  fullName: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  amount: number;
  status: WithdrawalStatus;
  timestamp: string;
}

export interface AIAgent {
  id: string;
  name: string;
  category: string;
  description: string;
  systemPrompt: string;
  isCustom?: boolean;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: "system" | "billing" | "upgrade" | "agent";
}

export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status: "Open" | "Resolved";
  timestamp: string;
  reply?: string;
}

export interface CardDetails {
  cardNumber: string;
  expiry: string;
  cvv: string;
  cardholderName: string;
}

