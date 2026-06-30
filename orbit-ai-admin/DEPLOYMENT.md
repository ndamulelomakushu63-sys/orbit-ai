# Orbit AI Admin - Standalone Deployment Guide

This documentation specifies the deployment steps, required environment variables, and Supabase SQL schema migrations needed to host the **Orbit AI Admin** portal as a completely separate Vercel application.

---

## 1. Supabase SQL Schema Migrations

To support any custom data structures, ensure you run the following queries inside your Supabase SQL Editor. 
The Admin Portal reads and writes to your **existing** `business_registrations` and `businesses` tables.

```sql
-- 1. Ensure columns for rich media, narratives and checklist state exist on business_registrations
ALTER TABLE public.business_registrations 
  ADD COLUMN IF NOT EXISTS gps_coordinates TEXT,
  ADD COLUMN IF NOT EXISTS business_story TEXT,
  ADD COLUMN IF NOT EXISTS interview_notes TEXT,
  ADD COLUMN IF NOT EXISTS services TEXT,
  ADD COLUMN IF NOT EXISTS products TEXT,
  ADD COLUMN IF NOT EXISTS business_hours TEXT,
  ADD COLUMN IF NOT EXISTS pricing TEXT,
  ADD COLUMN IF NOT EXISTS delivery TEXT,
  ADD COLUMN IF NOT EXISTS parking TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS facebook TEXT,
  ADD COLUMN IF NOT EXISTS instagram TEXT,
  ADD COLUMN IF NOT EXISTS tiktok TEXT,
  ADD COLUMN IF NOT EXISTS linkedin TEXT,
  ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS ai_description TEXT,
  ADD COLUMN IF NOT EXISTS ai_about_us TEXT,
  ADD COLUMN IF NOT EXISTS ai_services TEXT,
  ADD COLUMN IF NOT EXISTS ai_seo_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_marketing_summary TEXT,
  ADD COLUMN IF NOT EXISTS ai_keywords TEXT,
  ADD COLUMN IF NOT EXISTS ai_tags TEXT,
  ADD COLUMN IF NOT EXISTS status_history JSONB DEFAULT '[]'::jsonb;

-- 2. Ensure Storage buckets are created and policy rules set up
-- Make sure the bucket 'business-photos' is configured as PUBLIC
INSERT INTO storage.buckets (id, name, public) 
VALUES ('business-photos', 'business-photos', true) 
ON CONFLICT (id) DO NOTHING;

-- Grant public upload access for authorized inspection managers
CREATE POLICY "Enable uploads for authorized managers" 
ON storage.objects FOR INSERT 
TO public 
WITH CHECK (bucket_id = 'business-photos');
```

---

## 2. Environment Variables Configuration

When setting up your project on Vercel, inject the following environment variables. Ensure they point to the exact same Supabase project:

| Variable Name | Description | Example / Default Value |
| :--- | :--- | :--- |
| `VITE_SUPABASE_URL` | The REST Endpoint url of your existing Supabase project | `https://ptpnvrgzdnawvvxrkkid.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Public client Anon credential Key for database communication | `eyJhbGciOiJIUzI1...` |

---

## 3. Production Deployment Checklist

Follow these steps to deploy your standalone Admin Web App:

1. **Vercel Project Setup**:
   - Log in to your Vercel Dashboard.
   - Click **Add New** > **Project** and connect your git repository.
   - Choose the Root Directory as `orbit-ai-admin` (this isolates the build and ensures mobile React Native code is ignored completely).

2. **Configure Build Settings**:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build` (runs `vite build` to output compiled SPA assets in the `dist/` subfolder).
   - **Output Directory**: `dist`

3. **Inject Environment Variables**:
   - In Vercel's **Environment Variables** tab, define `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` using your credentials.

4. **Trigger Build & Validate**:
   - Click **Deploy** to compile the standalone static site.
   - Verify that your routing rules and public routes serve the application correctly under your custom corporate domain (e.g., `admin.orbitai.co.za`).
