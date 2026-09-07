export enum UserPlan {
  FREE = "Free",
  PRO = "Pro"
}

export enum WithdrawalStatus {
  PENDING = "Pending",
  APPROVED = "Approved",
  PAID = "Paid",
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
  referralCode: string; // Generated on Agent Activation / Permanent Agent ID
  referredBy?: string | null; // Referral code / Agent ID of person who invited them
  agent_id?: string; // Permanent Agent ID e.g. AGT-8F2K91
  agentId?: string; // CamelCase alias
  referral_link?: string; // Permanent Referral Link e.g. https://orbitai.co.za/register?ref=AGT-8F2K91
  referralLink?: string; // CamelCase alias
  referred_by?: string | null; // Snake case alias
  verified_referrals?: number; // Count of verified referrals
  verifiedReferrals?: number; // CamelCase alias
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
  branchCode?: string;
  accountType?: string;
  processedAt?: string;
  adminNotes?: string;
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

export interface ObdiLead {
  id: string;
  created_at?: string; // mapping DB column
  business_name: string;
  owner_name: string;
  phone: string;
  email?: string;
  address: string;
  notes?: string;
  status: 'new' | 'paid_new' | 'visit_needed' | 'photos_uploaded' | 'ready_to_publish' | 'live' | 'rejected';
  paid: boolean;
  stripe_payment_id?: string;
  public_slug?: string;
  ai_description?: string;
  contact_phone?: string;
  specials?: string;
}

export interface Business {
  id: string;
  name: string;
  ownerName: string;
  description: string;
  category: string;
  townCity: string;
  physicalAddress: string;
  phoneNumber: string;
  whatsappNumber?: string;
  email?: string;
  openingHours?: string;
  startingPrice?: string;
  socialMediaLinks?: {
    website?: string;
    facebook?: string;
    instagram?: string;
  };
  photos?: string[];
  specials?: string[];
  isPublic?: boolean;
  isPaid?: boolean;
  paymentStatus?: string;
  status?: string; // 'Pending' | 'Approved' | 'Rejected'
  createdAt?: string;
  userId?: string;
  province?: string;
  villageSuburb?: string;
  preferredContactTime?: string;
  paymentId?: string;
  paymentReference?: string;
  amountPaid?: number;
  paymentDate?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  popularity?: number;
}

export interface OrbitRewardRecord {
  id: string;
  userId: string;
  unlocked: boolean;
  verifiedReferralsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrbitRewardHistoryItem {
  id: string;
  userId: string;
  adId: string;
  adTitle: string;
  rewardAmount: number;
  status: 'verified' | 'pending';
  timestamp: string;
}

export interface OrbitRewardBalance {
  userId: string;
  totalEarnings: number;
  monthlyEarnings: number;
  todayAdCount: number;
  lastAdDate: string;
  updatedAt: string;
}

export interface OrbitRewardSettings {
  id: string;
  maxDailyAds: number;
  minWithdrawal: number;
  policyNotice: string;
  updatedAt: string;
}

// ==========================================
// ORBIT MARKET (VISION 1) TYPES
// ==========================================

export type MarketOrderStatus = 
  | 'PAID'
  | 'PREPARING'
  | 'READY FOR COLLECTION'
  | 'RECEIVED BY ORBIT'
  | 'OUT FOR DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export type MarketPaymentStatus = 'Pending' | 'Paid' | 'Failed';

export interface MarketBrand {
  id: string;
  userId?: string;
  name: string;
  slug: string;
  description: string;
  location?: string;
  logoUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  isVerified?: boolean;
  isOrbitCollection?: boolean;
  status?: 'Active' | 'Pending' | 'Suspended';
  createdAt?: string;
}

export interface MarketProductVariant {
  id: string;
  productId: string;
  sizeName: string; // e.g. "S", "M", "L", "XL"
  stockQuantity: number;
  priceOverride?: number;
}

export interface MarketProduct {
  id: string;
  brandId: string;
  brandName: string;
  name: string;
  description: string;
  price: number;
  category?: string;
  imageUrl?: string;
  images?: string[];
  isPublished?: boolean;
  inStock: boolean;
  stockQuantity: number;
  variants: MarketProductVariant[];
  createdAt?: string;
}

export interface CartItem {
  id: string;
  productId: string;
  productName: string;
  brandId: string;
  brandName: string;
  variantId?: string;
  variantName?: string;
  price: number;
  quantity: number;
  maxStock: number;
  imageUrl?: string;
}

export interface MarketOrderItem {
  id: string;
  orderId: string;
  productId: string;
  brandId: string;
  sellerId?: string;
  productName: string;
  brandName: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface MarketOrder {
  id: string;
  orderNumber: string; // e.g. "ORB-10482"
  userId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: string;
  subtotal: number;
  deliveryFee: number;
  commissionRate: number; // e.g. 0.10 for 10%
  commissionAmount: number;
  sellerPayoutAmount: number;
  total: number;
  paymentStatus: MarketPaymentStatus;
  orderStatus: MarketOrderStatus;
  paymentId?: string;
  trackingNumber?: string;
  createdAt: string;
  updatedAt: string;
  items: MarketOrderItem[];
}

export interface MarketSettings {
  id: string;
  commissionRate: number;
  defaultDeliveryFee: number;
  minOrderAmount: number;
  isActive: boolean;
}

// ==========================================
// ORBIT OPPORTUNITIES HUB TYPES
// ==========================================

export type OpportunityCategory = 'job' | 'internship' | 'learnership' | 'scholarship' | 'university';
export type OpportunityType = 'Full-time' | 'Part-time' | 'Contract' | 'Internship' | 'Learnership' | 'Bursary' | 'Undergraduate' | 'Postgraduate' | 'TVET';
export type OpportunityWorkplace = 'On-site' | 'Remote' | 'Hybrid';

export interface Opportunity {
  id: string;
  creatorId?: string;
  creatorName?: string;
  creatorEmail?: string;
  creatorPhone?: string;
  title: string;
  companyOrInstitution: string;
  category: OpportunityCategory;
  opportunityType: OpportunityType;
  workplaceType?: OpportunityWorkplace;
  location: string;
  // Precise location details
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  locationPrecision?: 'exact' | 'approximate' | 'remote';
  coordinates?: { lat: number; lng: number };
  // Media / Branding
  posterImage?: string;
  logoUrl?: string;
  // Details & requirements
  description: string;
  requirements: string[];
  compensationOrGrant?: string;
  deadline?: string;
  // Custom document requirements & screening
  proofOfResidenceRequired?: boolean;
  qualificationRequired?: 'matric' | 'grade9' | 'diploma_degree' | 'other' | 'none';
  customRequiredDocuments?: string[];
  screeningQuestions?: Array<{ id: string; question: string; type?: 'text' | 'yes_no' | 'choice'; options?: string[]; required?: boolean }>;
  // Public University / TVET & Admissions specific
  isPublicDirectory?: boolean;
  sourceDisclaimer?: string;
  openingDate?: string;
  institutionFaculty?: string;
  institutionCourse?: string;
  minApsScore?: number;
  applicationInstructions?: string;
  officialApplicationUrl?: string;
  requiredDocuments?: string[];
  createdAt: string;
  status: 'Open' | 'Closed';
  applicantCount?: number;
}

export type ApplicationStatus = 'Submitted' | 'Under Review' | 'Shortlisted' | 'Interview' | 'Accepted' | 'Not Selected';

export interface ApplicationDocument {
  id: string;
  name: string;
  type: 'id' | 'residence' | 'matric' | 'qualification' | 'transcript' | 'cv' | 'other';
  url?: string;
  dataUrl?: string;
  sizeStr?: string;
  uploadedAt: string;
}

export interface OpportunityApplication {
  id: string;
  opportunityId: string;
  opportunityTitle: string;
  opportunityCompany: string;
  opportunityCategory: OpportunityCategory;
  applicantId: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  residentialAddress?: string;
  applicantCoordinates?: { lat: number; lng: number };
  applicantLocationName?: string;
  qualificationType?: string;
  screeningAnswers?: Record<string, string>;
  cvText?: string;
  cvFileName?: string;
  coverNote?: string;
  documents: ApplicationDocument[];
  selectedInstitution?: string;
  selectedCourse?: string;
  matricScoresSummary?: string;
  apsCalculated?: number;
  status: ApplicationStatus;
  statusNotes?: string;
  employerNotes?: string;
  aiMatchEvaluation?: {
    matchRating: 'Strong Match' | 'Moderate Match' | 'Potential Match';
    matchedRequirements: string[];
    gapHighlights: string[];
    summary: string;
  };
  submittedAt: string;
  updatedAt: string;
}



