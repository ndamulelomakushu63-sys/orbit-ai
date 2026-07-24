-- ============================================================================
-- ORBIT REWARDS PRODUCTION SQL MIGRATION
-- Project: Orbit AI
-- Description: Dynamic, Idempotent Supabase Migration for Orbit Rewards
-- ============================================================================

-- 1. SCHEMAS & TABLES CREATION
CREATE TABLE IF NOT EXISTS public.orbit_rewards (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    unlocked BOOLEAN DEFAULT FALSE,
    verified_referrals_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS public.reward_audit_logs (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reward_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    max_daily_ads INT DEFAULT 20,
    min_withdrawal NUMERIC DEFAULT 100,
    policy_notice TEXT DEFAULT 'Your monthly earnings are calculated according to Orbit Rewards policies.',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.reward_settings (id, max_daily_ads, min_withdrawal)
VALUES ('default', 20, 100)
ON CONFLICT (id) DO NOTHING;

-- 2. SCHEMA COMPATIBILITY UPGRADES
ALTER TABLE public.orbit_rewards 
    ADD COLUMN IF NOT EXISTS unlocked BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS verified_referrals_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.reward_balances 
    ADD COLUMN IF NOT EXISTS total_earnings NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS monthly_earnings NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS pending_earnings NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS approved_earnings NUMERIC DEFAULT 0,
    ADD COLUMN IF NOT EXISTS today_ad_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS lifetime_ads_watched INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_ad_date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.reward_history 
    ADD COLUMN IF NOT EXISTS category TEXT,
    ADD COLUMN IF NOT EXISTS duration_seconds INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reward_amount NUMERIC NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'verified',
    ADD COLUMN IF NOT EXISTS ip_address TEXT,
    ADD COLUMN IF NOT EXISTS device_info TEXT;

ALTER TABLE public.ad_watch_sessions 
    ADD COLUMN IF NOT EXISTS verification_hash TEXT,
    ADD COLUMN IF NOT EXISTS reward_claimed BOOLEAN DEFAULT FALSE;

-- 3. DYNAMIC RLS POLICIES & GRANTS
DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY['orbit_rewards', 'reward_balances', 'reward_history', 'ad_watch_sessions', 'reward_audit_logs'];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO anon, authenticated, service_role;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I_owner_access ON public.%I;', tbl, tbl);
        EXECUTE format('CREATE POLICY %I_owner_access ON public.%I FOR ALL USING (auth.uid() = user_id);', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I_admin_access ON public.%I;', tbl, tbl);
        EXECUTE format('CREATE POLICY %I_admin_access ON public.%I FOR ALL USING ((auth.jwt() ->> ''role'') IN (''admin'', ''service_role''));', tbl, tbl);
    END LOOP;
END $$;

ALTER TABLE public.reward_settings ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reward_settings TO anon, authenticated, service_role;
DROP POLICY IF EXISTS settings_public_read ON public.reward_settings;
CREATE POLICY settings_public_read ON public.reward_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS settings_admin_access ON public.reward_settings;
CREATE POLICY settings_admin_access ON public.reward_settings FOR ALL USING ((auth.jwt() ->> 'role') IN ('admin', 'service_role'));

-- 4. INDEXES
CREATE INDEX IF NOT EXISTS idx_orbit_rewards_user ON public.orbit_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_balances_user ON public.reward_balances(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_history_user ON public.reward_history(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_history_time ON public.reward_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_ad_sessions_user ON public.ad_watch_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_sessions_status ON public.ad_watch_sessions(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.reward_audit_logs(user_id);

-- 5. FUNCTIONS & TRIGGERS
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY ARRAY['orbit_rewards', 'reward_balances', 'reward_settings'] LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated ON public.%I;', tbl, tbl);
        EXECUTE format('CREATE TRIGGER trg_%I_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();', tbl, tbl);
    END LOOP;
END $$;

-- Daily Reset Logic
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

DROP TRIGGER IF EXISTS trg_reset_daily_ad_counter ON public.reward_balances;
CREATE TRIGGER trg_reset_daily_ad_counter BEFORE INSERT OR UPDATE ON public.reward_balances FOR EACH ROW EXECUTE FUNCTION public.reset_daily_ad_counter_func();

-- Unlock Trigger on 4 Referrals
CREATE OR REPLACE FUNCTION public.check_and_unlock_orbit_rewards_func()
RETURNS TRIGGER AS $$
DECLARE
    v_referrer UUID;
    v_count INT;
BEGIN
    v_referrer := NEW.referrer_id;
    IF v_referrer IS NOT NULL THEN
        SELECT COUNT(*) INTO v_count
        FROM public.referrals
        WHERE referrer_id = v_referrer;

        INSERT INTO public.orbit_rewards (id, user_id, unlocked, verified_referrals_count, updated_at)
        VALUES ('orb-rew-' || v_referrer::text, v_referrer, (v_count >= 4), v_count, NOW())
        ON CONFLICT (id) DO UPDATE
        SET verified_referrals_count = v_count, unlocked = (v_count >= 4), updated_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_unlock_orbit_rewards ON public.referrals;
DROP TRIGGER IF EXISTS trigger_auto_unlock_orbit_rewards ON public.referrals;
CREATE TRIGGER trigger_auto_unlock_orbit_rewards AFTER INSERT OR UPDATE ON public.referrals FOR EACH ROW EXECUTE FUNCTION public.check_and_unlock_orbit_rewards_func();
