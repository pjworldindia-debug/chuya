-- CHUYA E-Commerce Platform — Full Database Schema
-- Run this as a Supabase SQL migration

-- ═══════════════════════════════════════
-- TABLES
-- ═══════════════════════════════════════

-- Categories (must be created before products due to FK)
CREATE TABLE IF NOT EXISTS categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text UNIQUE NOT NULL,
  image_url     text,
  display_order integer DEFAULT 0,
  created_at    timestamptz DEFAULT now()
);

-- Products
CREATE TABLE IF NOT EXISTS products (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  slug              text UNIQUE NOT NULL,
  description       text,
  price             numeric(10,2) NOT NULL,
  compare_at_price  numeric(10,2),
  category_id       uuid REFERENCES categories(id),
  tags              text[],
  images            text[],
  stock             integer NOT NULL DEFAULT 0,
  sku               text UNIQUE,
  is_featured       boolean DEFAULT false,
  is_new_arrival    boolean DEFAULT false,
  status            text DEFAULT 'draft' CHECK (status IN ('active','draft','archived')),
  material          text,
  dimensions        text,
  care_instructions text,
  seo_title         text,
  seo_description   text,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

-- Banners
CREATE TABLE IF NOT EXISTS banners (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url       text NOT NULL,
  title           text,
  subtitle        text,
  cta_label       text,
  cta_url         text,
  text_color      text DEFAULT 'light' CHECK (text_color IN ('light','dark')),
  overlay_opacity integer DEFAULT 30 CHECK (overlay_opacity BETWEEN 0 AND 80),
  display_order   integer DEFAULT 0,
  is_active       boolean DEFAULT false,
  start_date      timestamptz,
  end_date        timestamptz,
  created_at      timestamptz DEFAULT now()
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid REFERENCES auth.users(id),
  guest_email             text,
  items                   jsonb NOT NULL,
  shipping_address        jsonb NOT NULL,
  subtotal                numeric(10,2) NOT NULL,
  gst                     numeric(10,2) NOT NULL,
  discount                numeric(10,2) DEFAULT 0,
  coupon_code             text,
  total                   numeric(10,2) NOT NULL,
  phonepe_transaction_id  text,
  payment_status          text DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','failed','refunded')),
  fulfilment_status       text DEFAULT 'placed' CHECK (fulfilment_status IN ('placed','confirmed','shipped','delivered','cancelled')),
  timeline                jsonb DEFAULT '[]',
  created_at              timestamptz DEFAULT now()
);

-- Coupons
CREATE TABLE IF NOT EXISTS coupons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text UNIQUE NOT NULL,
  discount_type   text CHECK (discount_type IN ('flat','percent')),
  discount_value  numeric(10,2) NOT NULL,
  min_order_value numeric(10,2) DEFAULT 0,
  max_uses        integer,
  used_count      integer DEFAULT 0,
  expires_at      timestamptz,
  is_active       boolean DEFAULT true
);

-- Cart Items (persisted for logged-in users)
CREATE TABLE IF NOT EXISTS cart_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id  uuid REFERENCES products(id) ON DELETE CASCADE,
  quantity    integer NOT NULL DEFAULT 1,
  added_at    timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Wishlist Items
CREATE TABLE IF NOT EXISTS wishlist_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id  uuid REFERENCES products(id) ON DELETE CASCADE,
  added_at    timestamptz DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Addresses
CREATE TABLE IF NOT EXISTS addresses (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  phone       text NOT NULL,
  line1       text NOT NULL,
  line2       text,
  city        text NOT NULL,
  state       text NOT NULL,
  pincode     text NOT NULL,
  is_default  boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- Newsletter Subscribers
CREATE TABLE IF NOT EXISTS subscribers (
  email         text PRIMARY KEY,
  subscribed_at timestamptz DEFAULT now()
);

-- User Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text,
  phone       text,
  role        text DEFAULT 'customer' CHECK (role IN ('customer','owner')),
  created_at  timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════
-- TRIGGERS & FUNCTIONS
-- ═══════════════════════════════════════

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at on products
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_updated_at ON products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Products: public read, owner write
CREATE POLICY "products_select_public" ON products FOR SELECT USING (true);
CREATE POLICY "products_insert_owner" ON products FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));
CREATE POLICY "products_update_owner" ON products FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));
CREATE POLICY "products_delete_owner" ON products FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));

-- Categories: public read, owner write
CREATE POLICY "categories_select_public" ON categories FOR SELECT USING (true);
CREATE POLICY "categories_insert_owner" ON categories FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));
CREATE POLICY "categories_update_owner" ON categories FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));
CREATE POLICY "categories_delete_owner" ON categories FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));

-- Banners: public read, owner write
CREATE POLICY "banners_select_public" ON banners FOR SELECT USING (true);
CREATE POLICY "banners_insert_owner" ON banners FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));
CREATE POLICY "banners_update_owner" ON banners FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));
CREATE POLICY "banners_delete_owner" ON banners FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));

-- Orders: user sees own, owner sees all
CREATE POLICY "orders_select_own_or_owner" ON orders FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));
CREATE POLICY "orders_insert_authenticated" ON orders FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "orders_update_own_or_owner" ON orders FOR UPDATE
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));

-- Coupons: no client access (use service role key only)
-- No policies = no client access with RLS enabled

-- Cart items: user's own only
CREATE POLICY "cart_items_all_own" ON cart_items FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Wishlist items: user's own only
CREATE POLICY "wishlist_items_all_own" ON wishlist_items FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Addresses: user's own only
CREATE POLICY "addresses_all_own" ON addresses FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Subscribers: anyone can insert, no read from client
CREATE POLICY "subscribers_insert_public" ON subscribers FOR INSERT
  WITH CHECK (true);

-- Profiles: own row, owner reads all
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  USING (id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  USING (id = auth.uid());

-- ═══════════════════════════════════════
-- STORAGE BUCKETS
-- ═══════════════════════════════════════
-- These should be created via Supabase Dashboard:
-- 1. "product-images" — Public bucket, max 5MB, image/* only
-- 2. "banner-images"  — Public bucket, max 10MB, image/* only
-- Storage policies: public read, owner upload/delete

-- ═══════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_products_new_arrival ON products(is_new_arrival) WHERE is_new_arrival = true;
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_items_user ON wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_categories_order ON categories(display_order);
