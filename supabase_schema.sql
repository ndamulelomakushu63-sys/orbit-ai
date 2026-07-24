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
CREATE POLICY "Public profiles are viewable by everyone." 
    ON public.profiles FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile." ON public.profiles;
CREATE POLICY "Users can insert their own profile." 
    ON public.profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile." ON public.profiles;
CREATE POLICY "Users can update their own profile." 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

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
CREATE POLICY "Users can view their own subscriptions."
    ON public.subscriptions FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service/Admin can insert/update subscriptions." ON public.subscriptions;
CREATE POLICY "Service/Admin can insert/update subscriptions."
    ON public.subscriptions FOR ALL
    USING (true);


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
CREATE POLICY "Users can view referrals they generated."
    ON public.referrals FOR SELECT
    USING (auth.uid() = referrer_id);

DROP POLICY IF EXISTS "Users can create/update referrals." ON public.referrals;
CREATE POLICY "Users can create/update referrals."
    ON public.referrals FOR ALL
    USING (true);


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
CREATE POLICY "Users can view their own withdrawals."
    ON public.withdrawal_requests FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can request withdrawals." ON public.withdrawal_requests;
CREATE POLICY "Users can request withdrawals."
    ON public.withdrawal_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin can update withdrawals." ON public.withdrawal_requests;
CREATE POLICY "Admin can update withdrawals."
    ON public.withdrawal_requests FOR ALL
    USING (true);


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
CREATE POLICY "Public and users can view registrations."
    ON public.business_registrations FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can submit registrations." ON public.business_registrations;
CREATE POLICY "Users can submit registrations."
    ON public.business_registrations FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Admin/Owners can update registrations." ON public.business_registrations;
CREATE POLICY "Admin/Owners can update registrations."
    ON public.business_registrations FOR ALL
    USING (true);


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
CREATE POLICY "Users can view their own notifications."
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "System can manage notifications." ON public.notifications;
CREATE POLICY "System can manage notifications."
    ON public.notifications FOR ALL
    USING (true);


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
CREATE POLICY "Users can view their own support tickets."
    ON public.support_tickets FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can submit support tickets." ON public.support_tickets;
CREATE POLICY "Users can submit support tickets."
    ON public.support_tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin/Support can update tickets." ON public.support_tickets;
CREATE POLICY "Admin/Support can update tickets."
    ON public.support_tickets FOR ALL
    USING (true);


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
CREATE POLICY "Users can view their own limits."
    ON public.user_limits FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own limits." ON public.user_limits;
CREATE POLICY "Users can insert their own limits."
    ON public.user_limits FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own limits." ON public.user_limits;
CREATE POLICY "Users can update their own limits."
    ON public.user_limits FOR UPDATE
    USING (auth.uid() = user_id);

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

-- 1. SELECT policy: Allow public select on obdi_leads
DROP POLICY IF EXISTS "Allow public select on obdi_leads" ON public.obdi_leads;
CREATE POLICY "Allow public select on obdi_leads"
    ON public.obdi_leads FOR SELECT
    USING (true);

-- 2. INSERT/UPDATE/DELETE policy: Allow authenticated and anonymous users to manage obdi_leads
DROP POLICY IF EXISTS "Allow management of obdi_leads" ON public.obdi_leads;
CREATE POLICY "Allow management of obdi_leads"
    ON public.obdi_leads FOR ALL
    USING (true)
    WITH CHECK (true);


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
-- 14. ORBIT REWARDS TABLES
-- ==========================================

CREATE TABLE IF NOT EXISTS public.orbit_rewards (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    unlocked BOOLEAN DEFAULT FALSE,
    verified_referrals_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reward_history (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    ad_id TEXT NOT NULL,
    ad_title TEXT NOT NULL,
    reward_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'verified',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reward_balances (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    total_earnings NUMERIC DEFAULT 0,
    monthly_earnings NUMERIC DEFAULT 0,
    today_ad_count INT DEFAULT 0,
    last_ad_date DATE DEFAULT CURRENT_DATE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reward_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    max_daily_ads INT DEFAULT 20,
    min_withdrawal NUMERIC DEFAULT 100,
    policy_notice TEXT DEFAULT 'Your monthly earnings are calculated according to Orbit Rewards policies and available advertising revenue.',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.orbit_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orbit_rewards TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reward_history TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reward_balances TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reward_settings TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Allow select orbit_rewards" ON public.orbit_rewards;
CREATE POLICY "Allow select orbit_rewards" ON public.orbit_rewards FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow write orbit_rewards" ON public.orbit_rewards;
CREATE POLICY "Allow write orbit_rewards" ON public.orbit_rewards FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow select reward_history" ON public.reward_history;
CREATE POLICY "Allow select reward_history" ON public.reward_history FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow write reward_history" ON public.reward_history;
CREATE POLICY "Allow write reward_history" ON public.reward_history FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow select reward_balances" ON public.reward_balances;
CREATE POLICY "Allow select reward_balances" ON public.reward_balances FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow write reward_balances" ON public.reward_balances;
CREATE POLICY "Allow write reward_balances" ON public.reward_balances FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow select reward_settings" ON public.reward_settings;
CREATE POLICY "Allow select reward_settings" ON public.reward_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow write reward_settings" ON public.reward_settings;
CREATE POLICY "Allow write reward_settings" ON public.reward_settings FOR ALL USING (true);

CREATE INDEX IF NOT EXISTS idx_orbit_rewards_user_id ON public.orbit_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_history_user_id ON public.reward_history(user_id);

-- Grants summary confirmation
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
