-- ==============================================================================
-- Dough N Cheese — Initial Production Database Schema
-- Migration: 20260820_initial_schema.sql
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. HELPER FUNCTIONS & TRIGGERS (FOR TIMESTAMPS)
-- ==============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. ADMIN PROFILES & ROLE-BASED ACCESS CONTROL
-- ==============================================================================

CREATE TABLE IF NOT EXISTS admin_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'MANAGER', 'EDITOR')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_admin_profiles_updated_at
    BEFORE UPDATE ON admin_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Security definer functions for fast and secure RLS evaluation
CREATE OR REPLACE FUNCTION get_current_admin_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
    SELECT role 
    FROM public.admin_profiles 
    WHERE user_id = auth.uid() 
      AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION has_admin_role(allowed_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.admin_profiles 
        WHERE user_id = auth.uid() 
          AND is_active = true 
          AND role = ANY(allowed_roles)
    );
$$;

-- Secure bootstrap procedure for the initial OWNER
-- Once an OWNER exists, this function will permanently refuse execution
CREATE OR REPLACE FUNCTION bootstrap_first_owner(target_user_id UUID, admin_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.admin_profiles WHERE role = 'OWNER') THEN
        RAISE EXCEPTION 'An OWNER already exists. Additional administrators must be created by an active OWNER.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
        RAISE EXCEPTION 'Target user ID % does not exist in auth.users.', target_user_id;
    END IF;

    INSERT INTO public.admin_profiles (user_id, name, role, is_active)
    VALUES (target_user_id, admin_name, 'OWNER', true)
    ON CONFLICT (user_id) DO UPDATE
    SET role = 'OWNER', is_active = true, name = EXCLUDED.name, updated_at = NOW();
END;
$$;

-- Lock down bootstrap function: only database administrators (service_role/postgres) can run it
REVOKE EXECUTE ON FUNCTION bootstrap_first_owner(UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION bootstrap_first_owner(UUID, TEXT) TO service_role;

-- ==============================================================================
-- 4. CATEGORIES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_display_order ON categories(display_order);
CREATE INDEX idx_categories_is_active ON categories(is_active);

CREATE TRIGGER set_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 5. PRODUCTS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    is_popular BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_is_active ON products(is_active);
CREATE INDEX idx_products_is_popular ON products(is_popular);

CREATE TRIGGER set_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 6. PRODUCT PRICE OPTIONS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS product_price_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    label TEXT NOT NULL, -- e.g. 'Regular', 'Small', 'Medium', 'Large', 'XL'
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_price_options_product_id ON product_price_options(product_id);
CREATE INDEX idx_product_price_options_display_order ON product_price_options(display_order);
CREATE INDEX idx_product_price_options_is_active ON product_price_options(is_active);

CREATE TRIGGER set_product_price_options_updated_at
    BEFORE UPDATE ON product_price_options
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 7. PRODUCT VARIANTS & OPTIONS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g. 'Crust', 'Meal Type'
    display_order INTEGER NOT NULL DEFAULT 0,
    is_required BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
CREATE INDEX idx_product_variants_is_active ON product_variants(is_active);

CREATE TRIGGER set_product_variants_updated_at
    BEFORE UPDATE ON product_variants
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS product_variant_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g. 'Classic', 'Thin Crust', 'Stuffed Crust'
    price_modifier NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (price_modifier >= 0),
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_product_variant_options_variant_id ON product_variant_options(variant_id);
CREATE INDEX idx_product_variant_options_is_active ON product_variant_options(is_active);

CREATE TRIGGER set_product_variant_options_updated_at
    BEFORE UPDATE ON product_variant_options
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 8. BRANCHES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL, -- e.g. 'Kamoke'
    slug TEXT UNIQUE NOT NULL, -- e.g. 'kamoke'
    city TEXT NOT NULL,
    address TEXT NOT NULL,
    phone TEXT NOT NULL,
    whatsapp_number TEXT NOT NULL,
    google_maps_url TEXT,
    opening_time TIME NOT NULL,
    closing_time TIME NOT NULL,
    days_open TEXT NOT NULL DEFAULT 'Mon - Sun',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_branches_slug ON branches(slug);
CREATE INDEX idx_branches_is_active ON branches(is_active);

CREATE TRIGGER set_branches_updated_at
    BEFORE UPDATE ON branches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 9. DISCOUNTS & PROMOTIONS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    discount_type TEXT NOT NULL DEFAULT 'PERCENTAGE' CHECK (discount_type IN ('PERCENTAGE', 'FIXED_AMOUNT')),
    discount_value NUMERIC(10, 2) NOT NULL CHECK (discount_value > 0),
    scope TEXT NOT NULL DEFAULT 'ALL_PRODUCTS' CHECK (scope IN ('ALL_PRODUCTS', 'SELECTED_CATEGORIES', 'SELECTED_PRODUCTS')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_discount_dates CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE INDEX idx_discounts_is_active ON discounts(is_active);
CREATE INDEX idx_discounts_dates ON discounts(starts_at, ends_at);

CREATE TRIGGER set_discounts_updated_at
    BEFORE UPDATE ON discounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Link discounts to specific branches
CREATE TABLE IF NOT EXISTS discount_branches (
    discount_id UUID NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    PRIMARY KEY (discount_id, branch_id)
);

CREATE INDEX idx_discount_branches_branch ON discount_branches(branch_id);

-- Link discounts to specific categories (used when scope = 'SELECTED_CATEGORIES')
CREATE TABLE IF NOT EXISTS discount_categories (
    discount_id UUID NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (discount_id, category_id)
);

CREATE INDEX idx_discount_categories_cat ON discount_categories(category_id);

-- Link discounts to specific products (used when scope = 'SELECTED_PRODUCTS')
CREATE TABLE IF NOT EXISTS discount_products (
    discount_id UUID NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    PRIMARY KEY (discount_id, product_id)
);

CREATE INDEX idx_discount_products_prod ON discount_products(product_id);

-- ==============================================================================
-- 10. RESTAURANT SETTINGS (GLOBAL SINGLETON)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS restaurant_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_singleton BOOLEAN NOT NULL DEFAULT true UNIQUE CHECK (is_singleton = true),
    restaurant_name TEXT NOT NULL DEFAULT 'Dough N Cheese',
    tagline TEXT DEFAULT 'Meet. Eat. Repeat.',
    logo_url TEXT,
    hero_image_url TEXT,
    delivery_image_url TEXT,
    menu_pdf_url TEXT,
    instagram_url TEXT,
    tiktok_url TEXT,
    facebook_url TEXT,
    extra_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_restaurant_settings_updated_at
    BEFORE UPDATE ON restaurant_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 11. ORDERS & ORDER ITEMS (HISTORICALLY ACCURATE)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED')),
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_branch_id ON orders(branch_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

CREATE TRIGGER set_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    product_name_snapshot TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    line_total NUMERIC(10, 2) NOT NULL CHECK (line_total >= 0),
    selected_size TEXT,
    selected_variants JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- ==============================================================================
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_price_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variant_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- A. ADMIN PROFILES POLICIES
-- ------------------------------------------------------------------------------
-- Authenticated users can view their own profile
CREATE POLICY "Users can view their own admin profile"
    ON admin_profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Only OWNER can manage all admin profiles
CREATE POLICY "OWNER full management on admin profiles"
    ON admin_profiles FOR ALL
    TO authenticated
    USING (has_admin_role(ARRAY['OWNER']))
    WITH CHECK (has_admin_role(ARRAY['OWNER']));

-- ------------------------------------------------------------------------------
-- B. CATEGORIES POLICIES
-- ------------------------------------------------------------------------------
-- Public can read active categories
CREATE POLICY "Public can view active categories"
    ON categories FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

-- Admins (EDITOR, MANAGER, ADMIN, OWNER) can view all categories
CREATE POLICY "Admins can view all categories"
    ON categories FOR SELECT
    TO authenticated
    USING (has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EDITOR']));

-- Admins (EDITOR, MANAGER, ADMIN, OWNER) can insert/update/delete categories
CREATE POLICY "Admins can modify categories"
    ON categories FOR ALL
    TO authenticated
    USING (has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EDITOR']))
    WITH CHECK (has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EDITOR']));

-- ------------------------------------------------------------------------------
-- C. PRODUCTS POLICIES
-- ------------------------------------------------------------------------------
-- Public can read active products
CREATE POLICY "Public can view active products"
    ON products FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

-- Admins can view all products
CREATE POLICY "Admins can view all products"
    ON products FOR SELECT
    TO authenticated
    USING (has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EDITOR']));

-- Admins (EDITOR, MANAGER, ADMIN, OWNER) can modify products
CREATE POLICY "Admins can modify products"
    ON products FOR ALL
    TO authenticated
    USING (has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EDITOR']))
    WITH CHECK (has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EDITOR']));

-- ------------------------------------------------------------------------------
-- D. PRODUCT PRICE OPTIONS POLICIES (PARENT PRODUCT MUST BE ACTIVE)
-- ------------------------------------------------------------------------------
-- Public can read active price options only if parent product is also active
CREATE POLICY "Public can view active price options"
    ON product_price_options FOR SELECT
    TO anon, authenticated
    USING (
        is_active = true 
        AND EXISTS (
            SELECT 1 FROM public.products p 
            WHERE p.id = product_id AND p.is_active = true
        )
    );

-- Admins can view all price options
CREATE POLICY "Admins can view all price options"
    ON product_price_options FOR SELECT
    TO authenticated
    USING (has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EDITOR']));

-- Admins can modify price options
CREATE POLICY "Admins can modify price options"
    ON product_price_options FOR ALL
    TO authenticated
    USING (has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EDITOR']))
    WITH CHECK (has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EDITOR']));

-- ------------------------------------------------------------------------------
-- E. PRODUCT VARIANTS & VARIANT OPTIONS POLICIES (HIERARCHICAL ACTIVE CHECK)
-- ------------------------------------------------------------------------------
-- Public can read active variants only if parent product is active
CREATE POLICY "Public can view active variants"
    ON product_variants FOR SELECT
    TO anon, authenticated
    USING (
        is_active = true 
        AND EXISTS (
            SELECT 1 FROM public.products p 
            WHERE p.id = product_id AND p.is_active = true
        )
    );

CREATE POLICY "Admins can view all variants"
    ON product_variants FOR SELECT
    TO authenticated
    USING (has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EDITOR']));

CREATE POLICY "Admins can modify variants"
    ON product_variants FOR ALL
    TO authenticated
    USING (has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EDITOR']))
    WITH CHECK (has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EDITOR']));

-- Public can read active variant options only if parent variant AND parent product are active
CREATE POLICY "Public can view active variant options"
    ON product_variant_options FOR SELECT
    TO anon, authenticated
    USING (
        is_active = true 
        AND EXISTS (
            SELECT 1 FROM public.product_variants pv
            JOIN public.products p ON p.id = pv.product_id
            WHERE pv.id = variant_id 
              AND pv.is_active = true 
              AND p.is_active = true
        )
    );

CREATE POLICY "Admins can view all variant options"
    ON product_variant_options FOR SELECT
    TO authenticated
    USING (has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EDITOR']));

CREATE POLICY "Admins can modify variant options"
    ON product_variant_options FOR ALL
    TO authenticated
    USING (has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EDITOR']))
    WITH CHECK (has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EDITOR']));

-- ------------------------------------------------------------------------------
-- F. BRANCHES POLICIES
-- ------------------------------------------------------------------------------
-- Public can view active branches
CREATE POLICY "Public can view active branches"
    ON branches FOR SELECT
    TO anon, authenticated
    USING (is_active = true);

-- Admins can view all branches
CREATE POLICY "Admins can view all branches"
    ON branches FOR SELECT
    TO authenticated
    USING (has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER', 'EDITOR']));

-- Only OWNER and ADMIN can modify branches
CREATE POLICY "Owner and Admin can modify branches"
    ON branches FOR ALL
    TO authenticated
    USING (has_admin_role(ARRAY['OWNER', 'ADMIN']))
    WITH CHECK (has_admin_role(ARRAY['OWNER', 'ADMIN']));

-- ------------------------------------------------------------------------------
-- G. DISCOUNTS POLICIES (RESTRICTED ASSOCIATION ROWS)
-- ------------------------------------------------------------------------------
-- Public can view currently valid active discounts
CREATE POLICY "Public can view active valid discounts"
    ON discounts FOR SELECT
    TO anon, authenticated
    USING (
        is_active = true 
        AND (starts_at IS NULL OR starts_at <= NOW()) 
        AND (ends_at IS NULL OR ends_at >= NOW())
    );

-- Admins (MANAGER, ADMIN, OWNER) can view all discounts
CREATE POLICY "Admins can view all discounts"
    ON discounts FOR SELECT
    TO authenticated
    USING (has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER']));

-- Admins (MANAGER, ADMIN, OWNER) can modify discounts
CREATE POLICY "Admins can modify discounts"
    ON discounts FOR ALL
    TO authenticated
    USING (has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER']))
    WITH CHECK (has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER']));

-- Discount association tables: Public can only view associations for currently active & valid discounts
CREATE POLICY "Public can view active discount branches"
    ON discount_branches FOR SELECT
    TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.discounts d 
            WHERE d.id = discount_id 
              AND d.is_active = true 
              AND (d.starts_at IS NULL OR d.starts_at <= NOW()) 
              AND (d.ends_at IS NULL OR d.ends_at >= NOW())
        )
    );

CREATE POLICY "Admins can modify discount branches"
    ON discount_branches FOR ALL
    TO authenticated
    USING (has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER']))
    WITH CHECK (has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER']));

CREATE POLICY "Public can view active discount categories"
    ON discount_categories FOR SELECT
    TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.discounts d 
            WHERE d.id = discount_id 
              AND d.is_active = true 
              AND (d.starts_at IS NULL OR d.starts_at <= NOW()) 
              AND (d.ends_at IS NULL OR d.ends_at >= NOW())
        )
    );

CREATE POLICY "Admins can modify discount categories"
    ON discount_categories FOR ALL
    TO authenticated
    USING (has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER']))
    WITH CHECK (has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER']));

CREATE POLICY "Public can view active discount products"
    ON discount_products FOR SELECT
    TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.discounts d 
            WHERE d.id = discount_id 
              AND d.is_active = true 
              AND (d.starts_at IS NULL OR d.starts_at <= NOW()) 
              AND (d.ends_at IS NULL OR d.ends_at >= NOW())
        )
    );

CREATE POLICY "Admins can modify discount products"
    ON discount_products FOR ALL
    TO authenticated
    USING (has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER']))
    WITH CHECK (has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER']));

-- ------------------------------------------------------------------------------
-- H. RESTAURANT SETTINGS POLICIES
-- ------------------------------------------------------------------------------
-- Public can view restaurant settings
CREATE POLICY "Public can view restaurant settings"
    ON restaurant_settings FOR SELECT
    TO anon, authenticated
    USING (true);

-- Only OWNER and ADMIN can modify restaurant settings
CREATE POLICY "Owner and Admin can modify restaurant settings"
    ON restaurant_settings FOR ALL
    TO authenticated
    USING (has_admin_role(ARRAY['OWNER', 'ADMIN']))
    WITH CHECK (has_admin_role(ARRAY['OWNER', 'ADMIN']));

-- ------------------------------------------------------------------------------
-- I. ORDERS & ORDER ITEMS POLICIES (ADMIN-ONLY ACCESS FOR NOW)
-- ------------------------------------------------------------------------------
-- Direct public INSERT is disabled. Orders remain stored/managed by authorized staff.
-- Public customer checkout operates via WhatsApp until the database order engine is integrated.
CREATE POLICY "Admins can view and manage orders"
    ON orders FOR ALL
    TO authenticated
    USING (has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER']))
    WITH CHECK (has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER']));

CREATE POLICY "Admins can view and manage order items"
    ON order_items FOR ALL
    TO authenticated
    USING (has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER']))
    WITH CHECK (has_admin_role(ARRAY['OWNER', 'ADMIN', 'MANAGER']));
