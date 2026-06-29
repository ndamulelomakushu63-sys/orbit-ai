-- ORBIT AI - COMPLETE SUPABASE SCHEMA
-- Paste this script directly into your Supabase SQL Editor to create all required tables,
-- relationships, row-level security (RLS) policies, and storage configuration.

-- 1. PROFILES TABLE (linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    plan TEXT NOT NULL DEFAULT 'Free',
    subscription_status TEXT DEFAULT 'free',
    chat_count_today INT DEFAULT 0,
    image_count_today INT DEFAULT 0,
    file_upload_count_today INT DEFAULT 0,
    camera_upload_count_today INT DEFAULT 0,
    last_reset_time TIMESTAMPTZ DEFAULT NOW(),
    subscription_start_date TIMESTAMPTZ,
    subscription_end_date TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    refund_requested BOOLEAN DEFAULT FALSE,
    refund_request_date TIMESTAMPTZ,
    agent_status BOOLEAN DEFAULT FALSE,
    balance NUMERIC DEFAULT 0,
    referral_code TEXT UNIQUE,
    referred_by TEXT,
    active_agent_id TEXT DEFAULT 'assistant',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone." 
    ON public.profiles FOR SELECT 
    USING (true);

CREATE POLICY "Users can insert their own profile." 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile." 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Trigger to automatically create a profile for new auth users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, name, email, referral_code, plan, subscription_status)
    VALUES (
        new.id,
        COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        new.email,
        'ORBIT-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6)),
        'Free',
        'free'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. SUBSCRIPTIONS TABLE
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL,
    renewal_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions."
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service/Admin can insert/update subscriptions."
    ON public.subscriptions FOR ALL
    USING (true);


-- 3. CONVERSATIONS TABLE
CREATE TABLE IF NOT EXISTS public.conversations (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    last_message TEXT DEFAULT '',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations."
    ON public.conversations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own conversations."
    ON public.conversations FOR ALL
    USING (auth.uid() = user_id);


-- 4. CHAT_MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT REFERENCES public.conversations(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    role TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages of their conversations."
    ON public.chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations 
            WHERE public.conversations.id = public.chat_messages.conversation_id 
            AND public.conversations.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage messages in their own conversations."
    ON public.chat_messages FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations 
            WHERE public.conversations.id = public.chat_messages.conversation_id 
            AND public.conversations.user_id = auth.uid()
        )
    );


-- 5. REFERRALS TABLE
CREATE TABLE IF NOT EXISTS public.referrals (
    id TEXT PRIMARY KEY,
    referrer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    referred_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    referred_name TEXT NOT NULL,
    reward NUMERIC NOT NULL,
    status TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view referrals they generated."
    ON public.referrals FOR SELECT
    USING (auth.uid() = referrer_id);

CREATE POLICY "Users can create/update referrals."
    ON public.referrals FOR ALL
    USING (true);


-- 6. WITHDRAWALS TABLE
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    user_email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_holder TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own withdrawals."
    ON public.withdrawals FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can request withdrawals."
    ON public.withdrawals FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can update withdrawals."
    ON public.withdrawals FOR ALL
    USING (true);


-- 7. BUSINESSES TABLE (Directory Listings)
CREATE TABLE IF NOT EXISTS public.businesses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    town_city TEXT NOT NULL,
    physical_address TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    whatsapp_number TEXT,
    email TEXT,
    opening_hours TEXT DEFAULT 'Mon - Fri: 08:00 - 17:00',
    social_media_links JSONB DEFAULT '{}'::jsonb,
    photos TEXT[] DEFAULT '{}'::text[],
    specials TEXT[] DEFAULT '{}'::text[],
    is_public BOOLEAN DEFAULT FALSE,
    is_paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses are viewable by everyone."
    ON public.businesses FOR SELECT
    USING (true);

CREATE POLICY "Anyone can register, admin/owners manage listings."
    ON public.businesses FOR ALL
    USING (true);


-- 8. BUSINESS_REGISTRATIONS TABLE (Applications)
CREATE TABLE IF NOT EXISTS public.business_registrations (
    id TEXT PRIMARY KEY,
    business_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    whatsapp_number TEXT,
    email TEXT,
    category TEXT NOT NULL,
    town_city TEXT NOT NULL,
    physical_address TEXT NOT NULL,
    description TEXT NOT NULL,
    preferred_visit_date TEXT NOT NULL,
    additional_notes TEXT,
    is_paid BOOLEAN DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.business_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public and users can view registrations."
    ON public.business_registrations FOR SELECT
    USING (true);

CREATE POLICY "Users can submit registrations."
    ON public.business_registrations FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Admin/Owners can update registrations."
    ON public.business_registrations FOR ALL
    USING (true);


-- 9. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications."
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "System can manage notifications."
    ON public.notifications FOR ALL
    USING (true);


-- 10. SUPPORT_TICKETS TABLE
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Open',
    reply TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own support tickets."
    ON public.support_tickets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can submit support tickets."
    ON public.support_tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin/Support can update tickets."
    ON public.support_tickets FOR ALL
    USING (true);


-- 11. STORAGE BUCKETS FOR PHOTOS & ASSETS
-- Note: Create a public storage bucket named 'business-photos' in your Supabase Dashboard.
-- You can configure policy for public access using SQL or UI:
-- For example, to allow any user to upload files into the business-photos bucket:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('business-photos', 'business-photos', true) ON CONFLICT (id) DO NOTHING;
