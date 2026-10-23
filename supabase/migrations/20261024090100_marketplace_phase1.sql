-- Paperloom Marketplace Phase 1
-- Review-only migration: do not apply to production without an explicit database approval.

BEGIN;

CREATE TYPE public.seller_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');

CREATE TABLE public.seller_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  shop_name text NOT NULL CHECK (char_length(btrim(shop_name)) BETWEEN 2 AND 160),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 2000),
  contact_email text CHECK (contact_email IS NULL OR contact_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  status public.seller_status NOT NULL DEFAULT 'pending',
  rejection_reason text CHECK (rejection_reason IS NULL OR char_length(rejection_reason) <= 1000),
  reviewed_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.products
  ADD COLUMN seller_id uuid REFERENCES public.seller_profiles (id) ON DELETE SET NULL,
  ADD COLUMN moderation_status text NOT NULL DEFAULT 'approved' CHECK (moderation_status IN ('pending_review', 'approved', 'rejected', 'hidden', 'archived')),
  ADD COLUMN moderated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  ADD COLUMN moderated_at timestamptz,
  ADD COLUMN moderation_reason text CHECK (moderation_reason IS NULL OR char_length(moderation_reason) <= 1000),
  ADD COLUMN supplier_cost numeric(12, 2) CHECK (supplier_cost IS NULL OR supplier_cost >= 0),
  ADD COLUMN fulfillment_expense numeric(12, 2) NOT NULL DEFAULT 0 CHECK (fulfillment_expense >= 0),
  ADD COLUMN minimum_profit numeric(12, 2) NOT NULL DEFAULT 0 CHECK (minimum_profit >= 0),
  ADD COLUMN cost_updated_at timestamptz,
  ADD COLUMN stock_verification_status text NOT NULL DEFAULT 'unverified' CHECK (stock_verification_status IN ('unverified', 'verified', 'stale', 'paused'));

ALTER TABLE public.order_items
  ADD COLUMN seller_id uuid REFERENCES public.seller_profiles (id) ON DELETE SET NULL,
  ADD COLUMN seller_name_snapshot text,
  ADD COLUMN vendor_fulfillment_status text NOT NULL DEFAULT 'pending' CHECK (vendor_fulfillment_status IN ('pending', 'accepted', 'processing', 'shipped', 'delivered', 'cancelled')),
  ADD COLUMN tracking_number text,
  ADD COLUMN tracking_url text CHECK (tracking_url IS NULL OR tracking_url ~ '^https://'),
  ADD COLUMN vendor_note text CHECK (vendor_note IS NULL OR char_length(vendor_note) <= 1000),
  ADD COLUMN vendor_updated_at timestamptz;

DROP POLICY products_anon_read ON public.products;
DROP POLICY products_authenticated_read ON public.products;
CREATE POLICY products_anon_read
  ON public.products FOR SELECT TO anon
  USING (publication_status = 'published'::public.publication_status AND moderation_status = 'approved' AND stock_verification_status <> 'paused');
CREATE POLICY products_authenticated_read
  ON public.products FOR SELECT TO authenticated
  USING ((publication_status = 'published'::public.publication_status AND moderation_status = 'approved' AND stock_verification_status <> 'paused') OR (SELECT private.has_role('admin'::public.app_role)));

DROP POLICY product_images_anon_read ON public.product_images;
DROP POLICY product_images_authenticated_read ON public.product_images;
CREATE POLICY product_images_anon_read
  ON public.product_images FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_images.product_id AND p.publication_status = 'published'::public.publication_status AND p.moderation_status = 'approved' AND p.stock_verification_status <> 'paused'));
CREATE POLICY product_images_authenticated_read
  ON public.product_images FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_images.product_id AND p.publication_status = 'published'::public.publication_status AND p.moderation_status = 'approved' AND p.stock_verification_status <> 'paused') OR (SELECT private.has_role('admin'::public.app_role)));

DROP POLICY product_variants_anon_read ON public.product_variants;
DROP POLICY product_variants_authenticated_read ON public.product_variants;
CREATE POLICY product_variants_anon_read
  ON public.product_variants FOR SELECT TO anon
  USING (is_active AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_variants.product_id AND p.publication_status = 'published'::public.publication_status AND p.moderation_status = 'approved' AND p.stock_verification_status <> 'paused'));
CREATE POLICY product_variants_authenticated_read
  ON public.product_variants FOR SELECT TO authenticated
  USING ((is_active AND EXISTS (SELECT 1 FROM public.products p WHERE p.id = product_variants.product_id AND p.publication_status = 'published'::public.publication_status AND p.moderation_status = 'approved' AND p.stock_verification_status <> 'paused')) OR (SELECT private.has_role('admin'::public.app_role)));

CREATE TABLE public.marketplace_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders (id) ON DELETE RESTRICT,
  order_item_id uuid REFERENCES public.order_items (id) ON DELETE SET NULL,
  buyer_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE RESTRICT,
  seller_id uuid REFERENCES public.seller_profiles (id) ON DELETE SET NULL,
  case_type text NOT NULL CHECK (case_type IN ('return', 'refund', 'complaint')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'seller_responded', 'under_review', 'approved', 'rejected', 'resolved')),
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 3 AND 2000),
  evidence_path text CHECK (evidence_path IS NULL OR (evidence_path !~ '^/' AND evidence_path !~ '(^|/)\.\.?(/|$)')),
  seller_response text CHECK (seller_response IS NULL OR char_length(seller_response) <= 2000),
  admin_decision text CHECK (admin_decision IS NULL OR char_length(admin_decision) <= 2000),
  decided_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX seller_profiles_status_idx ON public.seller_profiles (status, created_at DESC);
CREATE INDEX products_seller_moderation_idx ON public.products (seller_id, moderation_status, created_at DESC);
CREATE INDEX order_items_seller_status_idx ON public.order_items (seller_id, vendor_fulfillment_status, created_at DESC);
CREATE INDEX marketplace_cases_buyer_idx ON public.marketplace_cases (buyer_id, created_at DESC);
CREATE INDEX marketplace_cases_seller_idx ON public.marketplace_cases (seller_id, status, created_at DESC);

ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_cases ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.seller_profiles, public.marketplace_cases FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.seller_profiles TO authenticated;
GRANT INSERT (user_id, shop_name, slug, description, contact_email) ON TABLE public.seller_profiles TO authenticated;
GRANT UPDATE (shop_name, slug, description, contact_email) ON TABLE public.seller_profiles TO authenticated;
GRANT SELECT, INSERT ON TABLE public.marketplace_cases TO authenticated;
GRANT UPDATE (status, seller_response) ON TABLE public.marketplace_cases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.seller_profiles, public.marketplace_cases TO service_role;

CREATE POLICY seller_profiles_own_read
  ON public.seller_profiles FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) OR (SELECT private.has_role('admin'::public.app_role)));
CREATE POLICY seller_profiles_own_apply
  ON public.seller_profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()) AND status = 'pending' AND reviewed_by IS NULL);
CREATE POLICY seller_profiles_own_profile_update
  ON public.seller_profiles FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND status = 'approved')
  WITH CHECK (user_id = (SELECT auth.uid()) AND status = 'approved');
CREATE POLICY seller_profiles_admin_manage
  ON public.seller_profiles FOR ALL TO authenticated
  USING ((SELECT private.has_role('admin'::public.app_role)))
  WITH CHECK ((SELECT private.has_role('admin'::public.app_role)));

CREATE POLICY products_vendor_read_own
  ON public.products FOR SELECT TO authenticated
  USING (seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = (SELECT auth.uid())));
CREATE POLICY product_images_vendor_read_own
  ON public.product_images FOR SELECT TO authenticated
  USING (product_id IN (SELECT id FROM public.products WHERE seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = (SELECT auth.uid()))));
CREATE POLICY product_variants_vendor_read_own
  ON public.product_variants FOR SELECT TO authenticated
  USING (product_id IN (SELECT id FROM public.products WHERE seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = (SELECT auth.uid()))));
CREATE POLICY product_inventory_vendor_read_own
  ON public.product_inventory FOR SELECT TO authenticated
  USING (product_id IN (SELECT id FROM public.products WHERE seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = (SELECT auth.uid()))));
CREATE POLICY inventory_movements_vendor_read_own
  ON public.inventory_movements FOR SELECT TO authenticated
  USING (product_id IN (SELECT id FROM public.products WHERE seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = (SELECT auth.uid()))));

CREATE POLICY marketplace_cases_buyer_read
  ON public.marketplace_cases FOR SELECT TO authenticated
  USING (buyer_id = (SELECT auth.uid()) OR (SELECT private.has_role('admin'::public.app_role)) OR seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = (SELECT auth.uid())));
CREATE POLICY marketplace_cases_buyer_insert
  ON public.marketplace_cases FOR INSERT TO authenticated
  WITH CHECK (buyer_id = (SELECT auth.uid()));
CREATE POLICY marketplace_cases_seller_update
  ON public.marketplace_cases FOR UPDATE TO authenticated
  USING (seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = (SELECT auth.uid())) AND status IN ('open', 'seller_responded'))
  WITH CHECK (seller_id IN (SELECT id FROM public.seller_profiles WHERE user_id = (SELECT auth.uid())) AND status IN ('seller_responded', 'under_review'));
CREATE POLICY marketplace_cases_admin_manage
  ON public.marketplace_cases FOR ALL TO authenticated
  USING ((SELECT private.has_role('admin'::public.app_role)))
  WITH CHECK ((SELECT private.has_role('admin'::public.app_role)));

CREATE FUNCTION public.vendor_create_product(
  p_category_id uuid,
  p_name text,
  p_slug text,
  p_sku text,
  p_short_description text,
  p_description text,
  p_price numeric,
  p_supplier_cost numeric,
  p_fulfillment_expense numeric,
  p_minimum_profit numeric,
  p_track_inventory boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE seller public.seller_profiles; product_id uuid;
BEGIN
  SELECT * INTO seller FROM public.seller_profiles WHERE user_id = (SELECT auth.uid()) AND status = 'approved' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'An approved seller account is required.'; END IF;
  IF p_price < COALESCE(p_supplier_cost, 0) + COALESCE(p_fulfillment_expense, 0) + COALESCE(p_minimum_profit, 0) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Selling price does not meet the minimum profit rule.';
  END IF;
  INSERT INTO public.products (seller_id, category_id, name, slug, sku, short_description, description, price, supplier_cost, fulfillment_expense, minimum_profit, cost_updated_at, track_inventory, publication_status, moderation_status)
  VALUES (seller.id, p_category_id, p_name, p_slug, NULLIF(p_sku, ''), COALESCE(p_short_description, ''), COALESCE(p_description, ''), p_price, p_supplier_cost, COALESCE(p_fulfillment_expense, 0), COALESCE(p_minimum_profit, 0), now(), COALESCE(p_track_inventory, true), 'draft', 'pending_review')
  RETURNING id INTO product_id;
  RETURN product_id;
END;
$$;
REVOKE ALL ON FUNCTION public.vendor_create_product(uuid, text, text, text, text, text, numeric, numeric, numeric, numeric, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vendor_create_product(uuid, text, text, text, text, text, numeric, numeric, numeric, numeric, boolean) TO authenticated;

CREATE FUNCTION public.vendor_adjust_inventory(p_inventory_id uuid, p_new_quantity integer, p_note text)
RETURNS public.product_inventory
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE result_row public.product_inventory;
BEGIN
  IF p_new_quantity < 0 THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Quantity cannot be negative.'; END IF;
  UPDATE public.product_inventory i
  SET quantity = p_new_quantity, updated_at = now()
  WHERE i.id = p_inventory_id
    AND EXISTS (SELECT 1 FROM public.products p JOIN public.seller_profiles s ON s.id = p.seller_id WHERE p.id = i.product_id AND s.user_id = (SELECT auth.uid()) AND s.status = 'approved')
  RETURNING i.* INTO result_row;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Inventory access was denied.'; END IF;
  RETURN result_row;
END;
$$;
REVOKE ALL ON FUNCTION public.vendor_adjust_inventory(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vendor_adjust_inventory(uuid, integer, text) TO authenticated;

CREATE FUNCTION public.vendor_update_product(
  p_product_id uuid,
  p_name text,
  p_slug text,
  p_sku text,
  p_short_description text,
  p_description text,
  p_price numeric,
  p_supplier_cost numeric,
  p_fulfillment_expense numeric,
  p_minimum_profit numeric
)
RETURNS public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE result_row public.products;
BEGIN
  IF p_price < COALESCE(p_supplier_cost, 0) + COALESCE(p_fulfillment_expense, 0) + COALESCE(p_minimum_profit, 0) THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Selling price does not meet the minimum profit rule.';
  END IF;
  UPDATE public.products p SET name = p_name, slug = p_slug, sku = NULLIF(p_sku, ''), short_description = COALESCE(p_short_description, ''), description = COALESCE(p_description, ''), price = p_price, supplier_cost = p_supplier_cost, fulfillment_expense = COALESCE(p_fulfillment_expense, 0), minimum_profit = COALESCE(p_minimum_profit, 0), cost_updated_at = now(), moderation_status = 'pending_review', publication_status = 'draft', updated_at = now()
  WHERE p.id = p_product_id AND p.seller_id IN (SELECT s.id FROM public.seller_profiles s WHERE s.user_id = (SELECT auth.uid()) AND s.status = 'approved')
  RETURNING p.* INTO result_row;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Product access was denied.'; END IF;
  RETURN result_row;
END;
$$;
REVOKE ALL ON FUNCTION public.vendor_update_product(uuid, text, text, text, text, text, numeric, numeric, numeric, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vendor_update_product(uuid, text, text, text, text, text, numeric, numeric, numeric, numeric) TO authenticated;

CREATE FUNCTION public.admin_moderate_product(p_product_id uuid, p_status text, p_reason text DEFAULT NULL)
RETURNS public.products
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE result_row public.products;
BEGIN
  IF NOT private.has_role('admin'::public.app_role) THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Administrator access is required.'; END IF;
  IF p_status NOT IN ('pending_review', 'approved', 'rejected', 'hidden', 'archived') THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid moderation status.'; END IF;
  UPDATE public.products SET moderation_status = p_status, moderation_reason = NULLIF(p_reason, ''), moderated_by = (SELECT auth.uid()), moderated_at = now(), publication_status = CASE WHEN p_status IN ('approved') THEN publication_status ELSE 'draft'::public.publication_status END, updated_at = now() WHERE id = p_product_id RETURNING * INTO result_row;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Product was not found.'; END IF;
  RETURN result_row;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_moderate_product(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_moderate_product(uuid, text, text) TO authenticated;

CREATE FUNCTION public.admin_review_seller(p_seller_id uuid, p_status public.seller_status, p_reason text DEFAULT NULL)
RETURNS public.seller_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE result_row public.seller_profiles;
BEGIN
  IF NOT private.has_role('admin'::public.app_role) THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Administrator access is required.'; END IF;
  IF p_status NOT IN ('approved', 'rejected', 'suspended') THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid seller review status.'; END IF;
  UPDATE public.seller_profiles SET status = p_status, rejection_reason = NULLIF(p_reason, ''), reviewed_by = (SELECT auth.uid()), reviewed_at = now(), updated_at = now() WHERE id = p_seller_id RETURNING * INTO result_row;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Seller application was not found.'; END IF;
  IF p_status = 'approved' THEN
    INSERT INTO public.user_roles (user_id, role, assigned_by) VALUES (result_row.user_id, 'vendor'::public.app_role, (SELECT auth.uid())) ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = result_row.user_id AND role = 'vendor'::public.app_role;
  END IF;
  RETURN result_row;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_review_seller(uuid, public.seller_status, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_review_seller(uuid, public.seller_status, text) TO authenticated;

CREATE FUNCTION public.admin_decide_marketplace_case(p_case_id uuid, p_status text, p_decision text)
RETURNS public.marketplace_cases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE result_row public.marketplace_cases;
BEGIN
  IF NOT private.has_role('admin'::public.app_role) THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Administrator access is required.'; END IF;
  IF p_status NOT IN ('approved', 'rejected', 'resolved') THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid marketplace case decision.'; END IF;
  UPDATE public.marketplace_cases SET status = p_status, admin_decision = NULLIF(p_decision, ''), decided_by = (SELECT auth.uid()), decided_at = now(), updated_at = now() WHERE id = p_case_id RETURNING * INTO result_row;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Marketplace case was not found.'; END IF;
  RETURN result_row;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_decide_marketplace_case(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_decide_marketplace_case(uuid, text, text) TO authenticated;

CREATE FUNCTION public.vendor_order_items()
RETURNS TABLE (id uuid, order_id uuid, order_number text, product_name_snapshot text, sku_snapshot text, variant_snapshot jsonb, quantity integer, unit_price numeric, line_total numeric, vendor_fulfillment_status text, tracking_number text, tracking_url text, vendor_note text, vendor_updated_at timestamptz, created_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT oi.id, oi.order_id, o.order_number, oi.product_name_snapshot, oi.sku_snapshot, oi.variant_snapshot, oi.quantity, oi.unit_price, oi.line_total, oi.vendor_fulfillment_status, oi.tracking_number, oi.tracking_url, oi.vendor_note, oi.vendor_updated_at, oi.created_at
  FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.seller_id IN (SELECT s.id FROM public.seller_profiles s WHERE s.user_id = (SELECT auth.uid()) AND s.status = 'approved');
$$;
REVOKE ALL ON FUNCTION public.vendor_order_items() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vendor_order_items() TO authenticated;

CREATE FUNCTION public.vendor_update_order_item(p_item_id uuid, p_status text, p_tracking_number text DEFAULT NULL, p_tracking_url text DEFAULT NULL, p_vendor_note text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE current_status text;
BEGIN
  SELECT vendor_fulfillment_status INTO current_status FROM public.order_items oi WHERE oi.id = p_item_id AND oi.seller_id IN (SELECT s.id FROM public.seller_profiles s WHERE s.user_id = (SELECT auth.uid()) AND s.status = 'approved') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE = '42501', MESSAGE = 'Order item access was denied.'; END IF;
  IF p_status NOT IN ('pending', 'accepted', 'processing', 'shipped', 'delivered', 'cancelled') OR (current_status = 'pending' AND p_status NOT IN ('accepted', 'cancelled')) OR (current_status = 'accepted' AND p_status NOT IN ('processing', 'cancelled')) OR (current_status = 'processing' AND p_status NOT IN ('shipped', 'cancelled')) OR (current_status = 'shipped' AND p_status <> 'delivered') OR current_status IN ('delivered', 'cancelled') THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'Invalid vendor fulfilment transition.';
  END IF;
  UPDATE public.order_items SET vendor_fulfillment_status = p_status, tracking_number = NULLIF(p_tracking_number, ''), tracking_url = NULLIF(p_tracking_url, ''), vendor_note = NULLIF(p_vendor_note, ''), vendor_updated_at = now() WHERE id = p_item_id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.vendor_update_order_item(uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vendor_update_order_item(uuid, text, text, text, text) TO authenticated;

CREATE FUNCTION private.touch_marketplace_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$ BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;
REVOKE ALL ON FUNCTION private.touch_marketplace_updated_at() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER seller_profiles_touch_updated_at BEFORE UPDATE ON public.seller_profiles FOR EACH ROW EXECUTE FUNCTION private.touch_marketplace_updated_at();
CREATE TRIGGER marketplace_cases_touch_updated_at BEFORE UPDATE ON public.marketplace_cases FOR EACH ROW EXECUTE FUNCTION private.touch_marketplace_updated_at();

CREATE POLICY product_drafts_storage_vendor_read
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'product-drafts' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY product_drafts_storage_vendor_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-drafts' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text AND (SELECT private.has_role('vendor'::public.app_role)));
CREATE POLICY product_drafts_storage_vendor_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-drafts' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text)
  WITH CHECK (bucket_id = 'product-drafts' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);
CREATE POLICY product_drafts_storage_vendor_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-drafts' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text);

CREATE FUNCTION private.enforce_marketplace_order_item()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE product_row public.products; seller_row public.seller_profiles;
BEGIN
  IF NEW.product_id IS NULL THEN RETURN NEW; END IF;
  SELECT * INTO product_row FROM public.products WHERE id = NEW.product_id;
  IF NOT FOUND OR product_row.publication_status <> 'published'::public.publication_status OR product_row.moderation_status <> 'approved' OR product_row.stock_verification_status = 'paused' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'This product is not currently available for ordering.';
  END IF;
  IF product_row.seller_id IS NOT NULL THEN
    SELECT * INTO seller_row FROM public.seller_profiles WHERE id = product_row.seller_id;
    NEW.seller_id := seller_row.id;
    NEW.seller_name_snapshot := seller_row.shop_name;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.enforce_marketplace_order_item() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER order_items_marketplace_visibility BEFORE INSERT ON public.order_items FOR EACH ROW EXECUTE FUNCTION private.enforce_marketplace_order_item();

COMMIT;
