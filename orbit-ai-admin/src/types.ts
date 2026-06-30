export interface BusinessRegistration {
  id: string;
  business_name: string;
  owner_name: string;
  phone_number: string;
  whatsapp_number?: string;
  email?: string;
  category: string;
  town_city: string;
  physical_address: string;
  description: string;
  preferred_visit_date: string;
  additional_notes?: string;
  is_paid: boolean;
  status: 'pending_visit' | 'visited' | 'draft' | 'awaiting_review' | 'published' | 'rejected' | 'archived';
  created_at?: string;
  gps_coordinates?: string;
  
  // Custom edited / enrichment fields (as requested)
  business_story?: string;
  interview_notes?: string;
  services?: string;
  products?: string;
  business_hours?: string;
  pricing?: string;
  delivery?: string;
  parking?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  linkedin?: string;
  photos?: string[]; // Media urls
  
  // AI Generated fields
  ai_description?: string;
  ai_about_us?: string;
  ai_services?: string;
  ai_seo_summary?: string;
  ai_marketing_summary?: string;
  ai_keywords?: string;
  ai_tags?: string;
  
  // Status timestamps & history log (json)
  status_history?: { status: string; timestamp: string; note?: string }[];
}

export interface BusinessListing {
  id: string;
  name: string;
  owner_name: string;
  description: string;
  category: string;
  town_city: string;
  physical_address: string;
  phone_number: string;
  whatsapp_number?: string;
  email?: string;
  opening_hours?: string;
  social_media_links?: Record<string, string>;
  photos?: string[];
  specials?: string[];
  is_public: boolean;
  is_paid: boolean;
  created_at?: string;
}

export interface AdminNotification {
  id: string;
  business_name: string;
  owner_name: string;
  time_submitted: string;
  application_id: string;
  read: boolean;
}

export interface ActivityLog {
  id: string;
  action: 'Login' | 'Logout' | 'Edit' | 'AI Generate' | 'Upload Photos' | 'Publish' | 'Reject' | 'Archive' | 'Delete';
  details: string;
  timestamp: string;
  admin_user: string;
}

export interface StaffAccount {
  id: string;
  name: string;
  email: string;
  role: 'Super Admin' | 'Field Inspector' | 'Content Reviewer';
  permissions: string[];
}
