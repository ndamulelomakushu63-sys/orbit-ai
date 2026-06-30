import { createClient } from '@supabase/supabase-js';
import { BusinessRegistration, BusinessListing } from '../types';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || "https://ptpnvrgzdnawvvxrkkid.supabase.co";
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0cG52cmd6ZG5hd3Z2eHJra2lkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3Mzg3ODcsImV4cCI6MjA5ODMxNDc4N30.MUUTitnP27N5Alvyq3W_ntVc8P0NhjhaVWllfU9u_IM";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- 1. FETCH REGISTRATIONS ---
export async function dbFetchRegistrations(): Promise<BusinessRegistration[] | null> {
  try {
    const { data, error } = await supabase
      .from('business_registrations')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Map database snake_case back to camelCase
    return (data || []).map((row: any) => ({
      id: row.id,
      business_name: row.business_name || row.businessName,
      owner_name: row.owner_name || row.ownerName,
      phone_number: row.phone_number || row.phoneNumber,
      whatsapp_number: row.whatsapp_number || row.whatsappNumber,
      email: row.email,
      category: row.category,
      town_city: row.town_city || row.townCity,
      physical_address: row.physical_address || row.physicalAddress,
      description: row.description,
      preferred_visit_date: row.preferred_visit_date || row.preferredVisitDate || '',
      additional_notes: row.additional_notes || row.additionalNotes,
      is_paid: row.is_paid || row.isPaid || false,
      status: row.status as any,
      created_at: row.created_at,
      gps_coordinates: row.gps_coordinates,
      business_story: row.business_story,
      interview_notes: row.interview_notes,
      services: row.services,
      products: row.products,
      business_hours: row.business_hours,
      pricing: row.pricing,
      delivery: row.delivery,
      parking: row.parking,
      website: row.website,
      facebook: row.facebook,
      instagram: row.instagram,
      tiktok: row.tiktok,
      linkedin: row.linkedin,
      photos: row.photos,
      ai_description: row.ai_description,
      ai_about_us: row.ai_about_us,
      ai_services: row.ai_services,
      ai_seo_summary: row.ai_seo_summary,
      ai_marketing_summary: row.ai_marketing_summary,
      ai_keywords: row.ai_keywords,
      ai_tags: row.ai_tags,
      status_history: row.status_history
    }));
  } catch (err) {
    console.warn("Supabase fetch business_registrations failed, using local fallback.", err);
    return null;
  }
}

// --- 2. UPSERT REGISTRATION ---
export async function dbUpsertRegistration(reg: BusinessRegistration): Promise<boolean> {
  try {
    // Map to db column schema names
    const dbRow = {
      id: reg.id,
      business_name: reg.business_name,
      owner_name: reg.owner_name,
      phone_number: reg.phone_number,
      whatsapp_number: reg.whatsapp_number,
      email: reg.email,
      category: reg.category,
      town_city: reg.town_city,
      physical_address: reg.physical_address,
      description: reg.description,
      preferred_visit_date: reg.preferred_visit_date,
      additional_notes: reg.additional_notes,
      is_paid: reg.is_paid,
      status: reg.status,
      gps_coordinates: reg.gps_coordinates,
      business_story: reg.business_story,
      interview_notes: reg.interview_notes,
      services: reg.services,
      products: reg.products,
      business_hours: reg.business_hours,
      pricing: reg.pricing,
      delivery: reg.delivery,
      parking: reg.parking,
      website: reg.website,
      facebook: reg.facebook,
      instagram: reg.instagram,
      tiktok: reg.tiktok,
      linkedin: reg.linkedin,
      photos: reg.photos,
      ai_description: reg.ai_description,
      ai_about_us: reg.ai_about_us,
      ai_services: reg.ai_services,
      ai_seo_summary: reg.ai_seo_summary,
      ai_marketing_summary: reg.ai_marketing_summary,
      ai_keywords: reg.ai_keywords,
      ai_tags: reg.ai_tags,
      status_history: reg.status_history
    };

    const { error } = await supabase
      .from('business_registrations')
      .upsert(dbRow);
    
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase upsert business_registrations failed:", err);
    return false;
  }
}

// --- 3. PUBLISH TO BUSINESSES DIRECTORY ---
export async function dbPublishBusiness(biz: BusinessListing): Promise<boolean> {
  try {
    const dbRow = {
      id: biz.id,
      name: biz.name,
      owner_name: biz.owner_name,
      description: biz.description,
      category: biz.category,
      town_city: biz.town_city,
      physical_address: biz.physical_address,
      phone_number: biz.phone_number,
      whatsapp_number: biz.whatsapp_number,
      email: biz.email,
      opening_hours: biz.opening_hours || 'Mon - Fri: 08:00 - 17:00',
      social_media_links: biz.social_media_links || {},
      photos: biz.photos || [],
      specials: biz.specials || [],
      is_public: biz.is_public,
      is_paid: biz.is_paid
    };

    const { error } = await supabase
      .from('businesses')
      .upsert(dbRow);
    
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn("Supabase publish to businesses failed:", err);
    return false;
  }
}

// --- 4. UPLOAD PHOTO TO STORAGE ---
export async function dbUploadPhoto(file: File, filename: string): Promise<string | null> {
  try {
    // Attempt using 'business-photos' bucket as per existing setup
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
    console.warn("Supabase storage upload 'business-photos' failed, trying 'obdi-photos'", err);
    try {
      const bucket = supabase.storage.from('obdi-photos');
      const { data, error } = await bucket.upload(filename, file, {
        cacheControl: '3600',
        upsert: true
      });
      if (error) throw error;
      const { data: publicUrlData } = bucket.getPublicUrl(filename);
      return publicUrlData?.publicUrl || null;
    } catch (e2) {
      console.warn("Supabase storage upload 'obdi-photos' also failed", e2);
      return null;
    }
  }
}
