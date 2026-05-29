-- 1. Coupons RLS
CREATE POLICY "coupons_insert_owner" ON coupons FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));

CREATE POLICY "coupons_update_owner" ON coupons FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));

CREATE POLICY "coupons_delete_owner" ON coupons FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));

-- 2. Banners Schema
ALTER TABLE banners ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE banners ADD COLUMN IF NOT EXISTS position text DEFAULT 'hero';

-- 3. Orders Schema
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url text;

-- 4. Subscribers RLS (Allow anonymous inserts)
CREATE POLICY "subscribers_insert_public" ON subscribers FOR INSERT WITH CHECK (true);
CREATE POLICY "subscribers_select_owner" ON subscribers FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'owner'));
