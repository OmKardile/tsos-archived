-- 0006_rls.sql — Row Level Security for all 24 tables.

-- ── Enable RLS everywhere ──────────────────────────────────────────────────
ALTER TABLE public.businesses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_locations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_variants   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addons               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_addons     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dine_tables          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_item_addons    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_ledger       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_fee_config  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_tokens        ENABLE ROW LEVEL SECURITY;

-- ── profiles ───────────────────────────────────────────────────────────────
CREATE POLICY profiles_select ON public.profiles FOR SELECT
  USING (id = auth.uid()
     OR (business_id IS NOT NULL AND business_id = public.my_business(auth.uid())));
CREATE POLICY profiles_insert ON public.profiles FOR INSERT
  WITH CHECK (id = auth.uid());
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ── businesses ─────────────────────────────────────────────────────────────
CREATE POLICY businesses_select ON public.businesses FOR SELECT
  USING (id = public.my_business(auth.uid()));
CREATE POLICY businesses_update_owner ON public.businesses FOR UPDATE
  USING (id = public.my_business(auth.uid())
     AND public.has_role(auth.uid(), ARRAY['owner']))
  WITH CHECK (id = public.my_business(auth.uid())
     AND public.has_role(auth.uid(), ARRAY['owner']));

-- ── locations ──────────────────────────────────────────────────────────────
CREATE POLICY locations_select ON public.locations FOR SELECT
  USING (business_id = public.my_business(auth.uid()));
CREATE POLICY locations_insert ON public.locations FOR INSERT
  WITH CHECK (business_id = public.my_business(auth.uid())
     AND public.has_role(auth.uid(), ARRAY['owner', 'manager']));
CREATE POLICY locations_update ON public.locations FOR UPDATE
  USING (business_id = public.my_business(auth.uid())
     AND public.has_role(auth.uid(), ARRAY['owner', 'manager']))
  WITH CHECK (business_id = public.my_business(auth.uid())
     AND public.has_role(auth.uid(), ARRAY['owner', 'manager']));

-- ── user_locations ─────────────────────────────────────────────────────────
CREATE POLICY user_locations_select ON public.user_locations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.locations l
                 WHERE l.id = user_locations.location_id
                   AND l.business_id = public.my_business(auth.uid())));
CREATE POLICY user_locations_insert ON public.user_locations FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.locations l
                      WHERE l.id = user_locations.location_id
                        AND l.business_id = public.my_business(auth.uid()))
              AND public.has_role(auth.uid(), ARRAY['owner']));
CREATE POLICY user_locations_delete ON public.user_locations FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.locations l
                 WHERE l.id = user_locations.location_id
                   AND l.business_id = public.my_business(auth.uid()))
         AND public.has_role(auth.uid(), ARRAY['owner']));

-- ── Menu ───────────────────────────────────────────────────────────────────
CREATE POLICY menu_categories_select ON public.menu_categories FOR SELECT
  USING (public.is_member(auth.uid(), location_id));
CREATE POLICY menu_categories_write ON public.menu_categories FOR ALL
  USING (public.is_member(auth.uid(), location_id)
     AND public.has_role(auth.uid(), ARRAY['owner', 'manager']))
  WITH CHECK (public.is_member(auth.uid(), location_id)
     AND public.has_role(auth.uid(), ARRAY['owner', 'manager']));

CREATE POLICY menu_items_select ON public.menu_items FOR SELECT
  USING (public.is_member(auth.uid(), location_id));
CREATE POLICY menu_items_write ON public.menu_items FOR ALL
  USING (public.is_member(auth.uid(), location_id)
     AND public.has_role(auth.uid(), ARRAY['owner', 'manager']))
  WITH CHECK (public.is_member(auth.uid(), location_id)
     AND public.has_role(auth.uid(), ARRAY['owner', 'manager']));

CREATE POLICY variants_select ON public.menu_item_variants FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.menu_items mi
                 WHERE mi.id = menu_item_variants.menu_item_id
                   AND public.is_member(auth.uid(), mi.location_id)));
CREATE POLICY variants_write ON public.menu_item_variants FOR ALL
  USING (EXISTS (SELECT 1 FROM public.menu_items mi
                 WHERE mi.id = menu_item_variants.menu_item_id
                   AND public.is_member(auth.uid(), mi.location_id))
         AND public.has_role(auth.uid(), ARRAY['owner', 'manager']))
  WITH CHECK (EXISTS (SELECT 1 FROM public.menu_items mi
                      WHERE mi.id = menu_item_variants.menu_item_id
                        AND public.is_member(auth.uid(), mi.location_id))
              AND public.has_role(auth.uid(), ARRAY['owner', 'manager']));

CREATE POLICY addons_select ON public.addons FOR SELECT
  USING (public.is_member(auth.uid(), location_id));
CREATE POLICY addons_write ON public.addons FOR ALL
  USING (public.is_member(auth.uid(), location_id)
     AND public.has_role(auth.uid(), ARRAY['owner', 'manager']))
  WITH CHECK (public.is_member(auth.uid(), location_id)
     AND public.has_role(auth.uid(), ARRAY['owner', 'manager']));

CREATE POLICY item_addons_select ON public.menu_item_addons FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.menu_items mi
                 WHERE mi.id = menu_item_addons.menu_item_id
                   AND public.is_member(auth.uid(), mi.location_id)));
CREATE POLICY item_addons_write ON public.menu_item_addons FOR ALL
  USING (EXISTS (SELECT 1 FROM public.menu_items mi
                 WHERE mi.id = menu_item_addons.menu_item_id
                   AND public.is_member(auth.uid(), mi.location_id))
         AND public.has_role(auth.uid(), ARRAY['owner', 'manager']))
  WITH CHECK (EXISTS (SELECT 1 FROM public.menu_items mi
                      WHERE mi.id = menu_item_addons.menu_item_id
                        AND public.is_member(auth.uid(), mi.location_id))
              AND public.has_role(auth.uid(), ARRAY['owner', 'manager']));

-- ── Inventory ──────────────────────────────────────────────────────────────
CREATE POLICY ingredients_select ON public.ingredients FOR SELECT
  USING (public.is_member(auth.uid(), location_id));
CREATE POLICY ingredients_write ON public.ingredients FOR ALL
  USING (public.is_member(auth.uid(), location_id)
     AND public.has_role(auth.uid(), ARRAY['owner', 'manager']))
  WITH CHECK (public.is_member(auth.uid(), location_id)
     AND public.has_role(auth.uid(), ARRAY['owner', 'manager']));

CREATE POLICY recipes_select ON public.recipes FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.menu_items mi
                 WHERE mi.id = recipes.menu_item_id
                   AND public.is_member(auth.uid(), mi.location_id)));
CREATE POLICY recipes_write ON public.recipes FOR ALL
  USING (EXISTS (SELECT 1 FROM public.menu_items mi
                 WHERE mi.id = recipes.menu_item_id
                   AND public.is_member(auth.uid(), mi.location_id))
         AND public.has_role(auth.uid(), ARRAY['owner', 'manager']))
  WITH CHECK (EXISTS (SELECT 1 FROM public.menu_items mi
                      WHERE mi.id = recipes.menu_item_id
                        AND public.is_member(auth.uid(), mi.location_id))
              AND public.has_role(auth.uid(), ARRAY['owner', 'manager']));

CREATE POLICY inventory_logs_select ON public.inventory_logs FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.ingredients g
                 WHERE g.id = inventory_logs.ingredient_id
                   AND public.is_member(auth.uid(), g.location_id)));

-- ── dine_tables ────────────────────────────────────────────────────────────
CREATE POLICY dine_tables_select ON public.dine_tables FOR SELECT
  USING (public.is_member(auth.uid(), location_id));
CREATE POLICY dine_tables_insert ON public.dine_tables FOR INSERT
  WITH CHECK (public.is_member(auth.uid(), location_id)
     AND public.has_role(auth.uid(), ARRAY['owner', 'manager']));
CREATE POLICY dine_tables_update ON public.dine_tables FOR UPDATE
  USING (public.is_member(auth.uid(), location_id)
     AND public.has_role(auth.uid(), ARRAY['owner', 'manager', 'cashier']))
  WITH CHECK (public.is_member(auth.uid(), location_id)
     AND public.has_role(auth.uid(), ARRAY['owner', 'manager', 'cashier']));
CREATE POLICY dine_tables_delete ON public.dine_tables FOR DELETE
  USING (public.is_member(auth.uid(), location_id)
     AND public.has_role(auth.uid(), ARRAY['owner', 'manager']));

-- ── orders ─────────────────────────────────────────────────────────────────
CREATE POLICY orders_select ON public.orders FOR SELECT
  USING (public.is_member(auth.uid(), location_id));
CREATE POLICY orders_insert ON public.orders FOR INSERT
  WITH CHECK (public.is_member(auth.uid(), location_id)
     AND public.has_role(auth.uid(), ARRAY['owner', 'manager', 'cashier']));
CREATE POLICY orders_update ON public.orders FOR UPDATE
  USING (public.is_member(auth.uid(), location_id)
     AND public.has_role(auth.uid(), ARRAY['owner', 'manager', 'cashier']))
  WITH CHECK (public.is_member(auth.uid(), location_id)
     AND public.has_role(auth.uid(), ARRAY['owner', 'manager', 'cashier']));
CREATE POLICY orders_delete ON public.orders FOR DELETE
  USING (public.is_member(auth.uid(), location_id)
     AND public.has_role(auth.uid(), ARRAY['owner']));

CREATE POLICY order_items_select ON public.order_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.orders o
                 WHERE o.id = order_items.order_id
                   AND public.is_member(auth.uid(), o.location_id)));
CREATE POLICY order_items_write ON public.order_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.orders o
                 WHERE o.id = order_items.order_id
                   AND public.is_member(auth.uid(), o.location_id))
         AND public.has_role(auth.uid(), ARRAY['owner', 'manager', 'cashier']))
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o
                      WHERE o.id = order_items.order_id
                        AND public.is_member(auth.uid(), o.location_id))
              AND public.has_role(auth.uid(), ARRAY['owner', 'manager', 'cashier']));

CREATE POLICY oia_select ON public.order_item_addons FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.order_items oi
                 JOIN public.orders o ON o.id = oi.order_id
                 WHERE oi.id = order_item_addons.order_item_id
                   AND public.is_member(auth.uid(), o.location_id)));
CREATE POLICY oia_write ON public.order_item_addons FOR ALL
  USING (EXISTS (SELECT 1 FROM public.order_items oi
                 JOIN public.orders o ON o.id = oi.order_id
                 WHERE oi.id = order_item_addons.order_item_id
                   AND public.is_member(auth.uid(), o.location_id))
         AND public.has_role(auth.uid(), ARRAY['owner', 'manager', 'cashier']))
  WITH CHECK (EXISTS (SELECT 1 FROM public.order_items oi
                      JOIN public.orders o ON o.id = oi.order_id
                      WHERE oi.id = order_item_addons.order_item_id
                        AND public.is_member(auth.uid(), o.location_id))
              AND public.has_role(auth.uid(), ARRAY['owner', 'manager', 'cashier']));

CREATE POLICY payments_select ON public.payments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.orders o
                 WHERE o.id = payments.order_id
                   AND public.is_member(auth.uid(), o.location_id)));
CREATE POLICY payments_insert ON public.payments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o
                      WHERE o.id = payments.order_id
                        AND public.is_member(auth.uid(), o.location_id))
              AND public.has_role(auth.uid(), ARRAY['owner', 'manager', 'cashier']));

-- ── customers ──────────────────────────────────────────────────────────────
CREATE POLICY customers_select ON public.customers FOR SELECT
  USING (business_id = public.my_business(auth.uid()));
CREATE POLICY customers_write ON public.customers FOR ALL
  USING (business_id = public.my_business(auth.uid())
     AND public.has_role(auth.uid(), ARRAY['owner', 'manager', 'cashier']))
  WITH CHECK (business_id = public.my_business(auth.uid())
     AND public.has_role(auth.uid(), ARRAY['owner', 'manager', 'cashier']));

-- ── loyalty_ledger ─────────────────────────────────────────────────────────
CREATE POLICY loyalty_select ON public.loyalty_ledger FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.customers c
                 WHERE c.id = loyalty_ledger.customer_id
                   AND c.business_id = public.my_business(auth.uid())));

-- ── offers / fee config ────────────────────────────────────────────────────
CREATE POLICY offers_select ON public.offers FOR SELECT
  USING (public.is_member(auth.uid(), location_id));
CREATE POLICY offers_write ON public.offers FOR ALL
  USING (public.is_member(auth.uid(), location_id)
     AND public.has_role(auth.uid(), ARRAY['owner', 'manager']))
  WITH CHECK (public.is_member(auth.uid(), location_id)
     AND public.has_role(auth.uid(), ARRAY['owner', 'manager']));

CREATE POLICY fee_select ON public.location_fee_config FOR SELECT
  USING (public.is_member(auth.uid(), location_id));
CREATE POLICY fee_write ON public.location_fee_config FOR ALL
  USING (public.is_member(auth.uid(), location_id)
     AND public.has_role(auth.uid(), ARRAY['owner', 'manager']))
  WITH CHECK (public.is_member(auth.uid(), location_id)
     AND public.has_role(auth.uid(), ARRAY['owner', 'manager']));

-- ── shifts ─────────────────────────────────────────────────────────────────
CREATE POLICY shifts_select ON public.shifts FOR SELECT
  USING (public.is_member(auth.uid(), location_id));
CREATE POLICY shifts_insert ON public.shifts FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.is_member(auth.uid(), location_id));
CREATE POLICY shifts_update ON public.shifts FOR UPDATE
  USING (public.is_member(auth.uid(), location_id)
     AND (user_id = auth.uid() OR public.has_role(auth.uid(), ARRAY['owner', 'manager'])))
  WITH CHECK (public.is_member(auth.uid(), location_id)
     AND (user_id = auth.uid() OR public.has_role(auth.uid(), ARRAY['owner', 'manager'])));

-- ── audit_logs ─────────────────────────────────────────────────────────────
CREATE POLICY audit_select ON public.audit_logs FOR SELECT
  USING (location_id IS NULL
     OR public.is_member(auth.uid(), location_id));

-- ── device_tokens ──────────────────────────────────────────────────────────
CREATE POLICY device_tokens_select ON public.device_tokens FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY device_tokens_insert ON public.device_tokens FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY device_tokens_delete ON public.device_tokens FOR DELETE
  USING (user_id = auth.uid());
