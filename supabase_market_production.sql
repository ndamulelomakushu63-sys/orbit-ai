-- ============================================================================
-- ORBIT MARKET (VISION 1) — COMPLETE SECURE PRODUCTION MIGRATION SCRIPT
-- ============================================================================

-- 1. BASE SCHEMA & EXTENSIONS
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- 2. SECURITY HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION public.is_admin_or_service()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'role') IN ('admin', 'service_role'),
    false
  );
$$;

-- 3. BRANDS TABLE (market_brands)
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

-- 4. PRODUCTS TABLE (market_products)
CREATE TABLE IF NOT EXISTS public.market_products (
    id TEXT PRIMARY KEY,
    brand_id TEXT REFERENCES public.market_brands(id) ON DELETE RESTRICT,
    brand_name TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (price >= 0),
    category TEXT NOT NULL DEFAULT 'Other Local Brands',
    image_url TEXT,
    images TEXT[],
    in_stock BOOLEAN DEFAULT TRUE,
    is_published BOOLEAN DEFAULT TRUE,
    stock_quantity INT NOT NULL DEFAULT 10 CHECK (stock_quantity >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. PRODUCT VARIANTS TABLE (market_product_variants)
CREATE TABLE IF NOT EXISTS public.market_product_variants (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES public.market_products(id) ON DELETE CASCADE,
    size_name TEXT NOT NULL,
    stock_quantity INT NOT NULL DEFAULT 5 CHECK (stock_quantity >= 0),
    price_override NUMERIC(10,2)
);

-- 6. ORDERS TABLE (market_orders)
CREATE TABLE IF NOT EXISTS public.market_orders (
    id TEXT PRIMARY KEY,
    order_number TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 50.00,
    commission_rate NUMERIC(4,2) NOT NULL DEFAULT 0.10,
    commission_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    seller_payout_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    payment_status TEXT NOT NULL DEFAULT 'Pending',
    order_status TEXT NOT NULL DEFAULT 'Pending Payment',
    payment_id TEXT,
    tracking_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. ORDER ITEMS TABLE (market_order_items)
CREATE TABLE IF NOT EXISTS public.market_order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT REFERENCES public.market_orders(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    brand_id TEXT NOT NULL,
    seller_id TEXT,
    product_name TEXT NOT NULL,
    brand_name TEXT NOT NULL,
    variant_name TEXT,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_price NUMERIC(10,2) NOT NULL DEFAULT 0.00
);

-- 8. PAYMENTS AUDIT TABLE (market_payments)
CREATE TABLE IF NOT EXISTS public.market_payments (
    id TEXT PRIMARY KEY,
    order_id TEXT REFERENCES public.market_orders(id) ON DELETE RESTRICT,
    payment_provider TEXT NOT NULL DEFAULT 'PayFast',
    pf_payment_id TEXT,
    amount_gross NUMERIC(10,2) NOT NULL,
    amount_fee NUMERIC(10,2) DEFAULT 0.00,
    amount_net NUMERIC(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending',
    signature_valid BOOLEAN DEFAULT FALSE,
    raw_response JSONB,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SETTINGS TABLE (market_settings)
CREATE TABLE IF NOT EXISTS public.market_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    commission_rate NUMERIC(4,2) NOT NULL DEFAULT 0.10,
    default_delivery_fee NUMERIC(10,2) NOT NULL DEFAULT 50.00,
    min_order_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. SINGLETON DEFAULTS & SEED DATA
INSERT INTO public.market_settings (id, commission_rate, default_delivery_fee, min_order_amount, is_active)
VALUES ('default', 0.10, 50.00, 0.00, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.market_brands (id, name, slug, description, location, is_verified, is_orbit_collection)
VALUES ('brand-orbit', 'Orbit Collection', 'orbit-collection', 'Official Orbit AI merchandise and apparel.', 'South Africa', TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- 11. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_market_brands_user_id ON public.market_brands(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_market_brands_normalized_name ON public.market_brands(LOWER(TRIM(name)));
CREATE UNIQUE INDEX IF NOT EXISTS idx_market_brands_slug ON public.market_brands(slug);
CREATE INDEX IF NOT EXISTS idx_market_products_brand_id ON public.market_products(brand_id);
CREATE INDEX IF NOT EXISTS idx_market_orders_user_id ON public.market_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_market_orders_order_number ON public.market_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_market_order_items_order_id ON public.market_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_market_payments_order_id ON public.market_payments(order_id);

-- 12. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.market_brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_settings ENABLE ROW LEVEL SECURITY;

-- 13. RLS POLICIES - BRANDS
DROP POLICY IF EXISTS "mb_read" ON public.market_brands;
CREATE POLICY "mb_read" ON public.market_brands 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "mb_insert" ON public.market_brands;
CREATE POLICY "mb_insert" ON public.market_brands 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "mb_update" ON public.market_brands;
CREATE POLICY "mb_update" ON public.market_brands 
FOR UPDATE USING (auth.uid() = user_id OR public.is_admin_or_service());

-- 14. RLS POLICIES - PRODUCTS
DROP POLICY IF EXISTS "mp_read" ON public.market_products;
CREATE POLICY "mp_read" ON public.market_products 
FOR SELECT USING (
    is_published = true 
    OR auth.uid() IN (SELECT user_id FROM public.market_brands WHERE id = market_products.brand_id) 
    OR public.is_admin_or_service()
);

DROP POLICY IF EXISTS "mp_write" ON public.market_products;
CREATE POLICY "mp_write" ON public.market_products 
FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.market_brands WHERE id = market_products.brand_id) 
    OR public.is_admin_or_service()
)
WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.market_brands WHERE id = market_products.brand_id) 
    OR public.is_admin_or_service()
);

-- 15. RLS POLICIES - PRODUCT VARIANTS
DROP POLICY IF EXISTS "mpv_read" ON public.market_product_variants;
CREATE POLICY "mpv_read" ON public.market_product_variants 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "mpv_write" ON public.market_product_variants;
CREATE POLICY "mpv_write" ON public.market_product_variants 
FOR ALL USING (
    product_id IN (
        SELECT p.id FROM public.market_products p 
        JOIN public.market_brands b ON p.brand_id = b.id 
        WHERE b.user_id = auth.uid()
    ) 
    OR public.is_admin_or_service()
);

-- 16. RLS POLICIES - ORDERS (CUSTOMER ISOLATION & ADMIN CONTROL)
DROP POLICY IF EXISTS "mo_read" ON public.market_orders;
CREATE POLICY "mo_read" ON public.market_orders 
FOR SELECT USING (auth.uid() = user_id OR public.is_admin_or_service());

DROP POLICY IF EXISTS "mo_create" ON public.market_orders;
CREATE POLICY "mo_create" ON public.market_orders 
FOR INSERT WITH CHECK (payment_status = 'Pending' AND order_status = 'Pending Payment');

DROP POLICY IF EXISTS "mo_service" ON public.market_orders;
CREATE POLICY "mo_service" ON public.market_orders 
FOR ALL USING (public.is_admin_or_service()) 
WITH CHECK (public.is_admin_or_service());

-- 17. RLS POLICIES - ORDER ITEMS (SELLER & CUSTOMER PER-ITEM ACCESS)
DROP POLICY IF EXISTS "moi_read" ON public.market_order_items;
CREATE POLICY "moi_read" ON public.market_order_items 
FOR SELECT USING (
    order_id IN (SELECT id FROM public.market_orders WHERE user_id = auth.uid()) 
    OR brand_id IN (SELECT id FROM public.market_brands WHERE user_id = auth.uid()) 
    OR public.is_admin_or_service()
);

DROP POLICY IF EXISTS "moi_create" ON public.market_order_items;
CREATE POLICY "moi_create" ON public.market_order_items 
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "moi_service" ON public.market_order_items;
CREATE POLICY "moi_service" ON public.market_order_items 
FOR ALL USING (public.is_admin_or_service()) 
WITH CHECK (public.is_admin_or_service());

-- 18. RLS POLICIES - PAYMENTS AUDIT
DROP POLICY IF EXISTS "mpay_read" ON public.market_payments;
CREATE POLICY "mpay_read" ON public.market_payments 
FOR SELECT USING (
    order_id IN (SELECT id FROM public.market_orders WHERE user_id = auth.uid()) 
    OR public.is_admin_or_service()
);

DROP POLICY IF EXISTS "mpay_service" ON public.market_payments;
CREATE POLICY "mpay_service" ON public.market_payments 
FOR ALL USING (public.is_admin_or_service()) 
WITH CHECK (public.is_admin_or_service());

-- 19. RLS POLICIES - MARKET SETTINGS
DROP POLICY IF EXISTS "mset_read" ON public.market_settings;
CREATE POLICY "mset_read" ON public.market_settings 
FOR SELECT USING (true);

DROP POLICY IF EXISTS "mset_service" ON public.market_settings;
CREATE POLICY "mset_service" ON public.market_settings 
FOR ALL USING (public.is_admin_or_service()) 
WITH CHECK (public.is_admin_or_service());

-- 20. STORAGE BUCKET CONFIGURATION (obdi-photos)
INSERT INTO storage.buckets (id, name, public)
VALUES ('obdi-photos', 'obdi-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Market Public Image Read" ON storage.objects;
CREATE POLICY "Market Public Image Read" ON storage.objects
FOR SELECT USING (bucket_id = 'obdi-photos');

DROP POLICY IF EXISTS "Market Seller Image Upload" ON storage.objects;
CREATE POLICY "Market Seller Image Upload" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'obdi-photos' 
    AND (storage.foldername(name))[1] = 'market'
    AND auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Market Seller Image Delete" ON storage.objects;
CREATE POLICY "Market Seller Image Delete" ON storage.objects
FOR DELETE USING (
    bucket_id = 'obdi-photos' 
    AND (storage.foldername(name))[1] = 'market'
    AND (auth.uid() = owner OR public.is_admin_or_service())
);
