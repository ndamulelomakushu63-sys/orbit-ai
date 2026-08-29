-- ORBIT AI - IDEMPOTENT SUPABASE SCHEMA MIGRATION
-- Paste this script directly into your Supabase SQL Editor, or run it via the Admin Dashboard.
-- It is designed to be 100% idempotent (safe to run multiple times), preserves all existing user data,
-- avoids duplicate policy errors, and establishes all tables, indexes, and triggers.

-- Ensure schema permissions are granted
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ==========================================
-- 1. PROFILES TABLE & AUTH TRIGGER
-- ==========================================

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

-- Safely ensure ALL columns exist on an existing profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'Free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS chat_count_today INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS image_count_today INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS file_upload_count_today INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS camera_upload_count_today INT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_reset_time TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_start_date TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS subscription_end_date TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS refund_requested BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS refund_request_date TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS agent_status BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS balance NUMERIC DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referred_by TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active_agent_id TEXT DEFAULT 'assistant';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Safely ensure unique constraints exist on existing profiles table if they don't already
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc 
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name 
        WHERE tc.table_schema = 'public' 
          AND tc.table_name = 'profiles' 
          AND ccu.column_name = 'referral_code' 
          AND tc.constraint_type = 'UNIQUE'
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_referral_code_key UNIQUE (referral_code);
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc 
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name 
        WHERE tc.table_schema = 'public' 
          AND tc.table_name = 'profiles' 
          AND ccu.column_name = 'email' 
          AND tc.constraint_type = 'UNIQUE'
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
    END IF;
END $$;

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies (Drop first to avoid duplicate policy errors)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile only" ON public.profiles;
CREATE POLICY "Users can view their own profile only" 
    ON public.profiles FOR SELECT 
    USING (auth.uid() = id OR (auth.jwt() ->> 'role') IN ('admin', 'service_role'));

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile." 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id OR (auth.jwt() ->> 'role') IN ('admin', 'service_role'));

DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile." 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id OR (auth.jwt() ->> 'role') IN ('admin', 'service_role'))
    WITH CHECK (auth.uid() = id OR (auth.jwt() ->> 'role') IN ('admin', 'service_role'));

ALTER POLICY "Users can view their own profile only" ON public.profiles 
    USING (auth.uid() = id OR (auth.jwt() ->> 'role') IN ('admin', 'service_role'));

ALTER POLICY "Users can update their own profile." ON public.profiles 
    USING (auth.uid() = id OR (auth.jwt() ->> 'role') IN ('admin', 'service_role'));

-- Trigger function to automatically create a profile for new auth users
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


-- ==========================================
-- 2. SUBSCRIPTIONS TABLE
-- ==========================================

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

DROP POLICY IF EXISTS "Users can view their own subscriptions." ON public.subscriptions;
DROP POLICY IF EXISTS "Service/Admin can insert/update subscriptions." ON public.subscriptions;
DROP POLICY IF EXISTS "Users manage own subscriptions, admins manage all" ON public.subscriptions;
CREATE POLICY "Users manage own subscriptions, admins manage all"
    ON public.subscriptions FOR ALL
    USING (auth.uid() = user_id OR (auth.jwt() ->> 'role') IN ('admin', 'service_role'))
    WITH CHECK (auth.uid() = user_id OR (auth.jwt() ->> 'role') IN ('admin', 'service_role'));

ALTER POLICY "Users manage own subscriptions, admins manage all" ON public.subscriptions
    USING (auth.uid() = user_id OR (auth.jwt() ->> 'role') IN ('admin', 'service_role'));


-- ==========================================
-- 3. CONVERSATIONS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.conversations (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    last_message TEXT DEFAULT '',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own conversations." ON public.conversations;
CREATE POLICY "Users can view their own conversations."
    ON public.conversations FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own conversations." ON public.conversations;
CREATE POLICY "Users can manage their own conversations."
    ON public.conversations FOR ALL
    USING (auth.uid() = user_id);


-- ==========================================
-- 4. CHAT_MESSAGES TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT REFERENCES public.conversations(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    role TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages of their conversations." ON public.chat_messages;
CREATE POLICY "Users can view messages of their conversations."
    ON public.chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations 
            WHERE public.conversations.id = public.chat_messages.conversation_id 
            AND public.conversations.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can manage messages in their own conversations." ON public.chat_messages;
CREATE POLICY "Users can manage messages in their own conversations."
    ON public.chat_messages FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations 
            WHERE public.conversations.id = public.chat_messages.conversation_id 
            AND public.conversations.user_id = auth.uid()
        )
    );


-- ==========================================
-- 5. REFERRALS TABLE
-- ==========================================

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

DROP POLICY IF EXISTS "Users can view referrals they generated." ON public.referrals;
DROP POLICY IF EXISTS "Users can create/update referrals." ON public.referrals;
DROP POLICY IF EXISTS "Users manage referrals they are part of" ON public.referrals;
CREATE POLICY "Users manage referrals they are part of"
    ON public.referrals FOR ALL
    USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id OR (auth.jwt() ->> 'role') IN ('admin', 'service_role'))
    WITH CHECK (auth.uid() = referrer_id OR auth.uid() = referred_user_id OR (auth.jwt() ->> 'role') IN ('admin', 'service_role'));

ALTER POLICY "Users manage referrals they are part of" ON public.referrals
    USING (auth.uid() = referrer_id OR auth.uid() = referred_user_id OR (auth.jwt() ->> 'role') IN ('admin', 'service_role'));


-- ==========================================
-- 6. WITHDRAWALS TABLE
-- ==========================================
-- 6. WITHDRAWALS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    account_holder TEXT NOT NULL,
    branch_code TEXT,
    account_type TEXT,
    processed_at TIMESTAMPTZ,
    admin_notes TEXT,
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- For backwards compatibility/graceful migrations, also ensure column adjustments
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS branch_code TEXT;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS account_type TEXT;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own withdrawals." ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can request withdrawals." ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admin can update withdrawals." ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users manage own withdrawals, admins manage all" ON public.withdrawal_requests;
CREATE POLICY "Users manage own withdrawals, admins manage all"
    ON public.withdrawal_requests FOR ALL
    USING (auth.uid() = user_id OR (auth.jwt() ->> 'role') IN ('admin', 'service_role'))
    WITH CHECK (auth.uid() = user_id OR (auth.jwt() ->> 'role') IN ('admin', 'service_role'));

ALTER POLICY "Users manage own withdrawals, admins manage all" ON public.withdrawal_requests
    USING (auth.uid() = user_id OR (auth.jwt() ->> 'role') IN ('admin', 'service_role'));


-- ==========================================
-- 7. BUSINESSES TABLE (Directory Listings)
-- ==========================================

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
    status TEXT DEFAULT 'Pending',
    payment_status TEXT DEFAULT 'Unpaid',
    province TEXT,
    village_suburb TEXT,
    preferred_contact_time TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent helper to add user_id relation column if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'businesses' 
          AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.businesses ADD COLUMN user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'businesses' 
          AND column_name = 'status'
    ) THEN
        ALTER TABLE public.businesses ADD COLUMN status TEXT DEFAULT 'Pending';
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'businesses' 
          AND column_name = 'payment_status'
    ) THEN
        ALTER TABLE public.businesses ADD COLUMN payment_status TEXT DEFAULT 'Unpaid';
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'businesses' 
          AND column_name = 'province'
    ) THEN
        ALTER TABLE public.businesses ADD COLUMN province TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'businesses' 
          AND column_name = 'village_suburb'
    ) THEN
        ALTER TABLE public.businesses ADD COLUMN village_suburb TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'businesses' 
          AND column_name = 'preferred_contact_time'
    ) THEN
        ALTER TABLE public.businesses ADD COLUMN preferred_contact_time TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'businesses' 
          AND column_name = 'starting_price'
    ) THEN
        ALTER TABLE public.businesses ADD COLUMN starting_price TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'businesses' 
          AND column_name = 'latitude'
    ) THEN
        ALTER TABLE public.businesses ADD COLUMN latitude NUMERIC;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'businesses' 
          AND column_name = 'longitude'
    ) THEN
        ALTER TABLE public.businesses ADD COLUMN longitude NUMERIC;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'businesses' 
          AND column_name = 'rating'
    ) THEN
        ALTER TABLE public.businesses ADD COLUMN rating NUMERIC DEFAULT 5.0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'businesses' 
          AND column_name = 'popularity'
    ) THEN
        ALTER TABLE public.businesses ADD COLUMN popularity INT DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'businesses' 
          AND column_name = 'payment_id'
    ) THEN
        ALTER TABLE public.businesses ADD COLUMN payment_id TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'businesses' 
          AND column_name = 'payment_reference'
    ) THEN
        ALTER TABLE public.businesses ADD COLUMN payment_reference TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'businesses' 
          AND column_name = 'amount_paid'
    ) THEN
        ALTER TABLE public.businesses ADD COLUMN amount_paid NUMERIC;
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'businesses' 
          AND column_name = 'payment_date'
    ) THEN
        ALTER TABLE public.businesses ADD COLUMN payment_date TIMESTAMPTZ;
    END IF;
END $$;

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Grant permissions to public, anon, and authenticated roles to ensure PostgreSQL doesn't deny access
GRANT SELECT, INSERT, UPDATE, DELETE ON public.businesses TO anon, authenticated, service_role;

-- Drop any conflicting policies
DROP POLICY IF EXISTS "Businesses are viewable by everyone." ON public.businesses;
DROP POLICY IF EXISTS "Anyone can register, admin/owners manage listings." ON public.businesses;
DROP POLICY IF EXISTS "Allow public select" ON public.businesses;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.businesses;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.businesses;

-- 1. SELECT policy: Allow everyone to read business listings
CREATE POLICY "Allow public select"
    ON public.businesses FOR SELECT
    USING (true);

-- 2. INSERT policy: Allow authenticated and anonymous users to submit new business registrations/listings
CREATE POLICY "Allow authenticated insert"
    ON public.businesses FOR INSERT
    WITH CHECK (true);

-- 3. UPDATE policy: Allow authenticated users to manage their own listings (by user_id)
CREATE POLICY "Allow authenticated update"
    ON public.businesses FOR UPDATE
    USING (auth.uid() = user_id OR user_id IS NULL)
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);


-- ==========================================
-- 8. BUSINESS_REGISTRATIONS TABLE (Applications)
-- ==========================================

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
    village_suburb TEXT,
    additional_notes TEXT,
    is_paid BOOLEAN DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotent helper to add columns to business_registrations if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'business_registrations' 
          AND column_name = 'village_suburb'
    ) THEN
        ALTER TABLE public.business_registrations ADD COLUMN village_suburb TEXT;
    END IF;
END $$;

ALTER TABLE public.business_registrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public and users can view registrations." ON public.business_registrations;
DROP POLICY IF EXISTS "Users can submit registrations." ON public.business_registrations;
DROP POLICY IF EXISTS "Admin/Owners can update registrations." ON public.business_registrations;
DROP POLICY IF EXISTS "Users view own registrations, admins view all" ON public.business_registrations;

CREATE POLICY "Users view own registrations, admins view all"
    ON public.business_registrations FOR ALL
    USING (email = auth.email() OR (auth.jwt() ->> 'role') IN ('admin', 'service_role'))
    WITH CHECK (true);

ALTER POLICY "Users view own registrations, admins view all" ON public.business_registrations
    USING (email = auth.email() OR (auth.jwt() ->> 'role') IN ('admin', 'service_role'));


-- ==========================================
-- 9. NOTIFICATIONS TABLE
-- ==========================================

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

DROP POLICY IF EXISTS "Users can view their own notifications." ON public.notifications;
DROP POLICY IF EXISTS "System can manage notifications." ON public.notifications;
DROP POLICY IF EXISTS "Users view own notifications, admins manage all" ON public.notifications;
CREATE POLICY "Users view own notifications, admins manage all"
    ON public.notifications FOR ALL
    USING (auth.uid() = user_id OR user_id IS NULL OR (auth.jwt() ->> 'role') IN ('admin', 'service_role'))
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL OR (auth.jwt() ->> 'role') IN ('admin', 'service_role'));

ALTER POLICY "Users view own notifications, admins manage all" ON public.notifications
    USING (auth.uid() = user_id OR user_id IS NULL OR (auth.jwt() ->> 'role') IN ('admin', 'service_role'));


-- ==========================================
-- 10. SUPPORT_TICKETS TABLE
-- ==========================================

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

DROP POLICY IF EXISTS "Users can view their own support tickets." ON public.support_tickets;
DROP POLICY IF EXISTS "Users can submit support tickets." ON public.support_tickets;
DROP POLICY IF EXISTS "Admin/Support can update tickets." ON public.support_tickets;
DROP POLICY IF EXISTS "Users view own tickets, admins manage all" ON public.support_tickets;

CREATE POLICY "Users view own tickets, admins manage all"
    ON public.support_tickets FOR ALL
    USING (auth.uid() = user_id OR (auth.jwt() ->> 'role') IN ('admin', 'service_role'))
    WITH CHECK (auth.uid() = user_id OR (auth.jwt() ->> 'role') IN ('admin', 'service_role'));

ALTER POLICY "Users view own tickets, admins manage all" ON public.support_tickets
    USING (auth.uid() = user_id OR (auth.jwt() ->> 'role') IN ('admin', 'service_role'));


-- ==========================================
-- 11. USER_LIMITS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS public.user_limits (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    messages_used INT NOT NULL DEFAULT 0,
    is_pro BOOLEAN NOT NULL DEFAULT FALSE,
    last_reset TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own limits." ON public.user_limits;
DROP POLICY IF EXISTS "Users can insert their own limits." ON public.user_limits;
DROP POLICY IF EXISTS "Users can update their own limits." ON public.user_limits;
DROP POLICY IF EXISTS "Users manage own limits" ON public.user_limits;

CREATE POLICY "Users manage own limits"
    ON public.user_limits FOR ALL
    USING (auth.uid() = user_id OR (auth.jwt() ->> 'role') IN ('admin', 'service_role'))
    WITH CHECK (auth.uid() = user_id OR (auth.jwt() ->> 'role') IN ('admin', 'service_role'));

ALTER POLICY "Users manage own limits" ON public.user_limits
    USING (auth.uid() = user_id OR (auth.jwt() ->> 'role') IN ('admin', 'service_role'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_limits TO anon, authenticated, service_role;


-- ==========================================
-- 12. OBDI LEADS TABLE (Real-time Lead Pipeline)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.obdi_leads (
    id TEXT PRIMARY KEY,
    business_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT NOT NULL,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    paid BOOLEAN NOT NULL DEFAULT FALSE,
    stripe_payment_id TEXT,
    public_slug TEXT,
    ai_description TEXT,
    contact_phone TEXT,
    specials TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on obdi_leads
ALTER TABLE public.obdi_leads ENABLE ROW LEVEL SECURITY;

-- Grant permissions to public, anon, and authenticated roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.obdi_leads TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Allow public select on obdi_leads" ON public.obdi_leads;
DROP POLICY IF EXISTS "Allow management of obdi_leads" ON public.obdi_leads;
DROP POLICY IF EXISTS "Admins manage obdi_leads" ON public.obdi_leads;

CREATE POLICY "Admins manage obdi_leads"
    ON public.obdi_leads FOR ALL
    USING ((auth.jwt() ->> 'role') IN ('admin', 'service_role'))
    WITH CHECK ((auth.jwt() ->> 'role') IN ('admin', 'service_role'));

ALTER POLICY "Admins manage obdi_leads" ON public.obdi_leads
    USING ((auth.jwt() ->> 'role') IN ('admin', 'service_role'));


-- ==========================================
-- 13. PERFORMANCE INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON public.profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON public.referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON public.withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON public.businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);

-- ==========================================
-- 14. ORBIT REWARDS TABLES, FUNCTIONS & TRIGGERS
-- ==========================================

-- 1. Orbit Rewards Unlock & Eligibility Status
CREATE TABLE IF NOT EXISTS public.orbit_rewards (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    unlocked BOOLEAN DEFAULT FALSE,
    verified_referrals_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.orbit_rewards ADD COLUMN IF NOT EXISTS unlocked BOOLEAN DEFAULT FALSE;
ALTER TABLE public.orbit_rewards ADD COLUMN IF NOT EXISTS verified_referrals_count INT DEFAULT 0;
ALTER TABLE public.orbit_rewards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Reward Balances & Daily Counters
CREATE TABLE IF NOT EXISTS public.reward_balances (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    total_earnings NUMERIC DEFAULT 0,
    monthly_earnings NUMERIC DEFAULT 0,
    pending_earnings NUMERIC DEFAULT 0,
    approved_earnings NUMERIC DEFAULT 0,
    today_ad_count INT DEFAULT 0,
    lifetime_ads_watched INT DEFAULT 0,
    last_ad_date DATE DEFAULT CURRENT_DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reward_balances ADD COLUMN IF NOT EXISTS total_earnings NUMERIC DEFAULT 0;
ALTER TABLE public.reward_balances ADD COLUMN IF NOT EXISTS monthly_earnings NUMERIC DEFAULT 0;
ALTER TABLE public.reward_balances ADD COLUMN IF NOT EXISTS pending_earnings NUMERIC DEFAULT 0;
ALTER TABLE public.reward_balances ADD COLUMN IF NOT EXISTS approved_earnings NUMERIC DEFAULT 0;
ALTER TABLE public.reward_balances ADD COLUMN IF NOT EXISTS today_ad_count INT DEFAULT 0;
ALTER TABLE public.reward_balances ADD COLUMN IF NOT EXISTS lifetime_ads_watched INT DEFAULT 0;
ALTER TABLE public.reward_balances ADD COLUMN IF NOT EXISTS last_ad_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.reward_balances ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Reward History & Verified Log Entries
CREATE TABLE IF NOT EXISTS public.reward_history (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    ad_id TEXT NOT NULL,
    ad_title TEXT NOT NULL,
    category TEXT,
    duration_seconds INT DEFAULT 0,
    reward_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'verified',
    ip_address TEXT,
    device_info TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reward_history ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.reward_history ADD COLUMN IF NOT EXISTS duration_seconds INT DEFAULT 0;
ALTER TABLE public.reward_history ADD COLUMN IF NOT EXISTS reward_amount NUMERIC NOT NULL DEFAULT 0;
ALTER TABLE public.reward_history ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'verified';
ALTER TABLE public.reward_history ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE public.reward_history ADD COLUMN IF NOT EXISTS device_info TEXT;

-- 4. Ad Watch Sessions (Fraud Prevention & Tracking)
CREATE TABLE IF NOT EXISTS public.ad_watch_sessions (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    ad_id TEXT NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'in_progress',
    verification_hash TEXT,
    reward_claimed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Reward Audit & Security Logs
CREATE TABLE IF NOT EXISTS public.reward_audit_logs (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. System Global Settings & Threshold Rules
CREATE TABLE IF NOT EXISTS public.reward_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    max_daily_ads INT DEFAULT 20,
    min_withdrawal NUMERIC DEFAULT 100,
    policy_notice TEXT DEFAULT 'Your monthly earnings are calculated according to Orbit Rewards policies and available advertising revenue.',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS across all Orbit Rewards tables
ALTER TABLE public.orbit_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_watch_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_settings ENABLE ROW LEVEL SECURITY;

-- Grant permissions to public roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orbit_rewards TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reward_balances TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reward_history TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_watch_sessions TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reward_audit_logs TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reward_settings TO anon, authenticated, service_role;

-- ==========================================
-- SECURE USER-LEVEL & ADMIN RLS POLICIES
-- ==========================================

-- 1) orbit_rewards
DROP POLICY IF EXISTS "Users can view their own orbit rewards status" ON public.orbit_rewards;
CREATE POLICY "Users can view their own orbit rewards status" ON public.orbit_rewards
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert/update their own orbit rewards status" ON public.orbit_rewards;
CREATE POLICY "Users can insert/update their own orbit rewards status" ON public.orbit_rewards
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage orbit_rewards" ON public.orbit_rewards;
CREATE POLICY "Admins can manage orbit_rewards" ON public.orbit_rewards
    FOR ALL USING ((auth.jwt() ->> 'role') IN ('admin', 'service_role'));

-- 2) reward_balances
DROP POLICY IF EXISTS "Users can view their own reward balance" ON public.reward_balances;
CREATE POLICY "Users can view their own reward balance" ON public.reward_balances
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reward balance" ON public.reward_balances;
CREATE POLICY "Users can update their own reward balance" ON public.reward_balances
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage reward_balances" ON public.reward_balances;
CREATE POLICY "Admins can manage reward_balances" ON public.reward_balances
    FOR ALL USING ((auth.jwt() ->> 'role') IN ('admin', 'service_role'));

-- 3) reward_history
DROP POLICY IF EXISTS "Users can view their own reward history" ON public.reward_history;
CREATE POLICY "Users can view their own reward history" ON public.reward_history
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own reward history" ON public.reward_history;
CREATE POLICY "Users can insert their own reward history" ON public.reward_history
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage reward_history" ON public.reward_history;
CREATE POLICY "Admins can manage reward_history" ON public.reward_history
    FOR ALL USING ((auth.jwt() ->> 'role') IN ('admin', 'service_role'));

-- 4) ad_watch_sessions
DROP POLICY IF EXISTS "Users can manage their own ad sessions" ON public.ad_watch_sessions;
CREATE POLICY "Users can manage their own ad sessions" ON public.ad_watch_sessions
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage ad_watch_sessions" ON public.ad_watch_sessions;
CREATE POLICY "Admins can manage ad_watch_sessions" ON public.ad_watch_sessions
    FOR ALL USING ((auth.jwt() ->> 'role') IN ('admin', 'service_role'));

-- 5) reward_audit_logs
DROP POLICY IF EXISTS "Users can manage their own audit logs" ON public.reward_audit_logs;
CREATE POLICY "Users can manage their own audit logs" ON public.reward_audit_logs
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can manage reward_audit_logs" ON public.reward_audit_logs;
CREATE POLICY "Admins can manage reward_audit_logs" ON public.reward_audit_logs
    FOR ALL USING ((auth.jwt() ->> 'role') IN ('admin', 'service_role'));

-- 6) reward_settings
DROP POLICY IF EXISTS "Anyone can view reward settings" ON public.reward_settings;
CREATE POLICY "Anyone can view reward settings" ON public.reward_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage reward settings" ON public.reward_settings;
CREATE POLICY "Admins can manage reward settings" ON public.reward_settings
    FOR ALL USING ((auth.jwt() ->> 'role') IN ('admin', 'service_role'));

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_orbit_rewards_user_id ON public.orbit_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_balances_user_id ON public.reward_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_history_user_id ON public.reward_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_history_timestamp ON public.reward_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_ad_watch_sessions_user_id ON public.ad_watch_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_watch_sessions_status ON public.ad_watch_sessions(status);
CREATE INDEX IF NOT EXISTS idx_reward_audit_logs_user_id ON public.reward_audit_logs(user_id);

-- ==========================================
-- AUTOMATIC FUNCTIONS & TRIGGERS
-- ==========================================

-- 1. Automatic Timestamp Setter
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_updated_at_orbit_rewards ON public.orbit_rewards;
CREATE TRIGGER trigger_set_updated_at_orbit_rewards
    BEFORE UPDATE ON public.orbit_rewards
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trigger_set_updated_at_reward_balances ON public.reward_balances;
CREATE TRIGGER trigger_set_updated_at_reward_balances
    BEFORE UPDATE ON public.reward_balances
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trigger_set_updated_at_reward_settings ON public.reward_settings;
CREATE TRIGGER trigger_set_updated_at_reward_settings
    BEFORE UPDATE ON public.reward_settings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 2. Daily Ad Limit Auto-Reset Function & Trigger
CREATE OR REPLACE FUNCTION public.reset_daily_ad_counter_func()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.last_ad_date IS NULL OR NEW.last_ad_date < CURRENT_DATE THEN
        NEW.today_ad_count := 0;
        NEW.last_ad_date := CURRENT_DATE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reset_daily_ad_counter ON public.reward_balances;
CREATE TRIGGER trigger_reset_daily_ad_counter
    BEFORE INSERT OR UPDATE ON public.reward_balances
    FOR EACH ROW EXECUTE FUNCTION public.reset_daily_ad_counter_func();

-- 3. Automatic Unlock Trigger for Agent Referrals (Unlocks at 4 Referrals)
CREATE OR REPLACE FUNCTION public.check_and_unlock_orbit_rewards_func()
RETURNS TRIGGER AS $$
DECLARE
    v_referrer_id UUID;
    v_count INT;
BEGIN
    v_referrer_id := NEW.referrer_id;
    IF v_referrer_id IS NOT NULL THEN
        -- Count all referrals for this referrer
        SELECT COUNT(*) INTO v_count
        FROM public.referrals
        WHERE referrer_id = v_referrer_id;

        -- Auto-upsert into orbit_rewards table
        INSERT INTO public.orbit_rewards (id, user_id, unlocked, verified_referrals_count, updated_at)
        VALUES (
            'orb-rew-' || v_referrer_id::text,
            v_referrer_id,
            (v_count >= 4),
            v_count,
            NOW()
        )
        ON CONFLICT (id) DO UPDATE
        SET 
            verified_referrals_count = v_count,
            unlocked = (v_count >= 4),
            updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_unlock_orbit_rewards ON public.referrals;
DROP TRIGGER IF EXISTS trigger_auto_unlock_orbit_rewards ON public.referrals;
CREATE TRIGGER trigger_auto_unlock_orbit_rewards
    AFTER INSERT OR UPDATE ON public.referrals
    FOR EACH ROW EXECUTE FUNCTION public.check_and_unlock_orbit_rewards_func();

-- Grants summary confirmation
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

-- SECURE REFERRAL LOOKUP RPC (Prevents exposing email/profiles on public lookup)
CREATE OR REPLACE FUNCTION public.get_referrer_by_code(p_code TEXT)
RETURNS TABLE (
    uid UUID,
    name TEXT,
    referral_code TEXT,
    agent_status BOOLEAN,
    balance NUMERIC,
    verified_referrals INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id AS uid,
        p.name,
        p.referral_code,
        p.agent_status,
        p.balance,
        p.verified_referrals
    FROM public.profiles p
    WHERE UPPER(TRIM(p.referral_code)) = UPPER(TRIM(p_code))
       OR UPPER(TRIM(p.agent_id)) = UPPER(TRIM(p_code))
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_referrer_by_code(TEXT) TO anon, authenticated, service_role;

-- ==========================================
-- 10. ORBIT MARKET (VISION 1) TABLES & RLS
-- ==========================================

-- Brands / Sellers Table
CREATE TABLE IF NOT EXISTS public.market_brands (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    location TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    is_orbit_collection BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products Table
CREATE TABLE IF NOT EXISTS public.market_products (
    id TEXT PRIMARY KEY,
    brand_id TEXT REFERENCES public.market_brands(id) ON DELETE CASCADE,
    brand_name TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL DEFAULT 0.00,
    category TEXT NOT NULL DEFAULT 'Other Local Brands',
    image_url TEXT,
    in_stock BOOLEAN DEFAULT TRUE,
    stock_quantity INT DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Variants (Sizes, etc.)
CREATE TABLE IF NOT EXISTS public.market_product_variants (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES public.market_products(id) ON DELETE CASCADE,
    size_name TEXT NOT NULL,
    stock_quantity INT DEFAULT 5,
    price_override NUMERIC
);

-- Orders Table
CREATE TABLE IF NOT EXISTS public.market_orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    subtotal NUMERIC NOT NULL DEFAULT 0.00,
    delivery_fee NUMERIC NOT NULL DEFAULT 50.00,
    commission_rate NUMERIC NOT NULL DEFAULT 0.10,
    commission_amount NUMERIC NOT NULL DEFAULT 0.00,
    seller_payout_amount NUMERIC NOT NULL DEFAULT 0.00,
    total NUMERIC NOT NULL DEFAULT 0.00,
    payment_status TEXT NOT NULL DEFAULT 'Pending',
    order_status TEXT NOT NULL DEFAULT 'PAID',
    payment_id TEXT,
    tracking_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS public.market_order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT REFERENCES public.market_orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    brand_id TEXT NOT NULL,
    seller_id TEXT,
    product_name TEXT NOT NULL,
    brand_name TEXT NOT NULL,
    variant_name TEXT,
    quantity INT NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL DEFAULT 0.00,
    total_price NUMERIC NOT NULL DEFAULT 0.00
);

-- Market Settings Table
CREATE TABLE IF NOT EXISTS public.market_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    commission_rate NUMERIC NOT NULL DEFAULT 0.10,
    default_delivery_fee NUMERIC NOT NULL DEFAULT 50.00,
    min_order_amount NUMERIC NOT NULL DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on Market Tables
ALTER TABLE public.market_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_settings ENABLE ROW LEVEL SECURITY;

-- Brands RLS (Public read, seller/admin manage)
DROP POLICY IF EXISTS "Public can view market brands" ON public.market_brands;
CREATE POLICY "Public can view market brands" ON public.market_brands FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create brand" ON public.market_brands;
CREATE POLICY "Authenticated users can create brand" ON public.market_brands FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Owners can update brand" ON public.market_brands;
CREATE POLICY "Owners can update brand" ON public.market_brands FOR UPDATE USING (auth.uid() = user_id OR (auth.jwt() ->> 'role') IN ('admin', 'service_role'));

-- Products RLS (Public read, seller manage)
DROP POLICY IF EXISTS "Public can view market products" ON public.market_products;
CREATE POLICY "Public can view market products" ON public.market_products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Brand owners can insert products" ON public.market_products;
CREATE POLICY "Brand owners can insert products" ON public.market_products FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Brand owners can update products" ON public.market_products;
CREATE POLICY "Brand owners can update products" ON public.market_products FOR UPDATE USING (true);

-- Product Variants RLS
DROP POLICY IF EXISTS "Public can view product variants" ON public.market_product_variants;
CREATE POLICY "Public can view product variants" ON public.market_product_variants FOR SELECT USING (true);

-- Orders RLS (Customer sees own, seller sees orders containing their items, admin sees all)
DROP POLICY IF EXISTS "Customers can view their own orders" ON public.market_orders;
CREATE POLICY "Customers can view their own orders" ON public.market_orders FOR SELECT USING (auth.uid() = user_id OR (auth.jwt() ->> 'role') IN ('admin', 'service_role') OR user_id IS NULL);

DROP POLICY IF EXISTS "Customers can insert orders" ON public.market_orders;
CREATE POLICY "Customers can insert orders" ON public.market_orders FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Order updates authorized" ON public.market_orders;
CREATE POLICY "Order updates authorized" ON public.market_orders FOR UPDATE USING (true);

-- Order Items RLS
DROP POLICY IF EXISTS "Public can view order items for their orders" ON public.market_order_items;
CREATE POLICY "Public can view order items for their orders" ON public.market_order_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insert order items" ON public.market_order_items;
CREATE POLICY "Insert order items" ON public.market_order_items FOR INSERT WITH CHECK (true);

-- Settings RLS
DROP POLICY IF EXISTS "Public can read market settings" ON public.market_settings;
CREATE POLICY "Public can read market settings" ON public.market_settings FOR SELECT USING (true);

-- Seed Initial Default Data
INSERT INTO public.market_brands (id, name, slug, description, location, is_verified, is_orbit_collection)
VALUES 
    ('brand-orbit', 'Orbit Collection', 'orbit-collection', 'Official Orbit AI merchandise and apparel.', 'South Africa', true, true),
    ('brand-authentic', 'Authentic', 'authentic', 'Premium local clothing crafted for effortless style.', 'Johannesburg, ZA', true, false),
    ('brand-kasi-crafted', 'Kasi Crafted', 'kasi-crafted', 'Handmade local lifestyle accessories & apparel.', 'Cape Town, ZA', true, false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.market_products (id, brand_id, brand_name, name, description, price, category, in_stock, stock_quantity)
VALUES 
    ('prod-orb-tshirt', 'brand-orbit', 'Orbit Collection', 'Orbit AI Classic T-Shirt', 'Premium heavyweight cotton tee with discreet Orbit AI chest insignia.', 199.00, 'Orbit Collection', true, 50),
    ('prod-orb-hoodie', 'brand-orbit', 'Orbit Collection', 'Orbit AI Pullover Hoodie', 'Ultra-soft fleece hoodie designed for maximum comfort and longevity.', 399.00, 'Orbit Collection', true, 30),
    ('prod-orb-cap', 'brand-orbit', 'Orbit Collection', 'Orbit Minimalist Cap', 'Structured cotton 6-panel cap with embroidered metallic emblem.', 149.00, 'Orbit Collection', true, 40),
    ('prod-auth-tshirt', 'brand-authentic', 'Authentic', 'Authentic Classic T-Shirt', 'Clean-cut modern fit t-shirt tailored with breathable South African cotton.', 159.00, 'Authentic', true, 45),
    ('prod-auth-sweat', 'brand-authentic', 'Authentic', 'Authentic Crewneck Sweatshirt', 'Relaxed fit pullover sweater with premium ribbed cuffs and neckline.', 299.00, 'Authentic', true, 25),
    ('prod-auth-jacket', 'brand-authentic', 'Authentic', 'Authentic Denim Overshirt', 'Durable premium raw denim overshirt for all-season layering.', 499.00, 'Authentic', true, 15),
    ('prod-kasi-wallet', 'brand-kasi-crafted', 'Kasi Crafted', 'Handmade Leather Cardholder', 'Genuine vegetable-tanned leather minimalist card wallet with 6 card slots.', 120.00, 'Other Local Brands', true, 30),
    ('prod-kasi-tote', 'brand-kasi-crafted', 'Kasi Crafted', 'Heavy Canvas Market Tote', 'Eco-friendly natural canvas tote bag reinforced for everyday carry.', 99.00, 'Other Local Brands', true, 50)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.market_product_variants (id, product_id, size_name, stock_quantity)
VALUES
    ('var-orb-ts-s', 'prod-orb-tshirt', 'S', 15),
    ('var-orb-ts-m', 'prod-orb-tshirt', 'M', 20),
    ('var-orb-ts-l', 'prod-orb-tshirt', 'L', 10),
    ('var-orb-ts-xl', 'prod-orb-tshirt', 'XL', 5),
    ('var-orb-hd-s', 'prod-orb-hoodie', 'S', 8),
    ('var-orb-hd-m', 'prod-orb-hoodie', 'M', 12),
    ('var-orb-hd-l', 'prod-orb-hoodie', 'L', 7),
    ('var-orb-hd-xl', 'prod-orb-hoodie', 'XL', 3),
    ('var-auth-ts-s', 'prod-auth-tshirt', 'S', 10),
    ('var-auth-ts-m', 'prod-auth-tshirt', 'M', 20),
    ('var-auth-ts-l', 'prod-auth-tshirt', 'L', 10),
    ('var-auth-ts-xl', 'prod-auth-tshirt', 'XL', 5),
    ('var-auth-sw-s', 'prod-auth-sweat', 'S', 5),
    ('var-auth-sw-m', 'prod-auth-sweat', 'M', 10),
    ('var-auth-sw-l', 'prod-auth-sweat', 'L', 7),
    ('var-auth-sw-xl', 'prod-auth-sweat', 'XL', 3),
    ('var-auth-jk-s', 'prod-auth-jacket', 'S', 3),
    ('var-auth-jk-m', 'prod-auth-jacket', 'M', 6),
    ('var-auth-jk-l', 'prod-auth-jacket', 'L', 4),
    ('var-auth-jk-xl', 'prod-auth-jacket', 'XL', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.market_settings (id, commission_rate, default_delivery_fee, min_order_amount, is_active)
VALUES ('default', 0.10, 50.00, 0.00, true)
ON CONFLICT (id) DO NOTHING;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;

