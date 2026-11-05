-- =====================================================================
-- RAVANTRA — access control & Row Level Security
-- Permissions are enforced in the database. The Next.js server re-checks
-- them for UX, but RLS is the source of truth.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Permission helpers
-- ---------------------------------------------------------------------

-- True if the current user holds `_perm` through any role.
-- Division-scoped roles only grant the permission for their own division.
-- Passing _division = null asks "does the user hold this permission in ANY scope?"
create or replace function public.has_permission(_perm text, _division uuid default null)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = auth.uid()
      and p.key = _perm
      and (r.division_id is null or _division is null or r.division_id = _division)
  );
$$;

-- Like has_permission but requires a GLOBAL (unscoped) grant.
create or replace function public.has_global_permission(_perm text)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    join public.role_permissions rp on rp.role_id = r.id
    join public.permissions p on p.id = rp.permission_id
    where ur.user_id = auth.uid() and p.key = _perm and r.division_id is null
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.key <> 'customer'
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.user_id = auth.uid() and r.key = 'super_admin'
  );
$$;

-- Everything the signed-in staff member may do, for the admin UI.
create or replace function public.my_access()
returns jsonb
language sql stable security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'user_id', auth.uid(),
    'roles', coalesce((
      select jsonb_agg(jsonb_build_object('key', r.key, 'name', r.name, 'division_id', r.division_id))
      from public.user_roles ur join public.roles r on r.id = ur.role_id
      where ur.user_id = auth.uid()
    ), '[]'::jsonb),
    'permissions', coalesce((
      select jsonb_agg(distinct jsonb_build_object('key', p.key, 'division_id', r.division_id))
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      join public.role_permissions rp on rp.role_id = r.id
      join public.permissions p on p.id = rp.permission_id
      where ur.user_id = auth.uid()
    ), '[]'::jsonb)
  );
$$;

-- ---------------------------------------------------------------------
-- New auth user → profile + customer role
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email,''), '@', 1)),
    coalesce(new.email, ''),
    new.raw_user_meta_data->>'phone'
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role_id)
  select new.id, r.id from public.roles r where r.key = 'customer'
  on conflict do nothing;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profile email in sync when the auth email changes
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = coalesce(new.email, '') where id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- Profiles: users may edit their own name/phone/avatar but never is_demo/email
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is not null and not public.is_super_admin() then
    new.email := old.email;
    new.is_demo := old.is_demo;
  end if;
  return new;
end $$;
create trigger profiles_protect before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ---------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','business_divisions','roles','permissions','role_permissions','user_roles','division_managers',
    'categories','products','product_images','product_variants','inventory','inventory_movements',
    'addresses','carts','cart_items','wishlists','wishlist_items','coupons','promotions',
    'newsletter_subscribers','orders','order_items','order_status_history','payments','services',
    'stylists','stylist_services','working_hours','blocked_slots','appointments','reviews','activity_logs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Identity
-- ---------------------------------------------------------------------
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.has_permission('customers.view') or public.has_permission('orders.view') or public.has_permission('settings.manage'));
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_update_admin on public.profiles for update
  using (public.has_permission('settings.manage')) with check (public.has_permission('settings.manage'));

create policy roles_select on public.roles for select using (public.is_staff());
create policy roles_manage on public.roles for all
  using (public.has_global_permission('settings.manage')) with check (public.has_global_permission('settings.manage'));

create policy permissions_select on public.permissions for select using (public.is_staff());
create policy permissions_manage on public.permissions for all
  using (public.has_global_permission('settings.manage')) with check (public.has_global_permission('settings.manage'));

create policy role_permissions_select on public.role_permissions for select using (public.is_staff());
create policy role_permissions_manage on public.role_permissions for all
  using (public.has_global_permission('settings.manage')) with check (public.has_global_permission('settings.manage'));

create policy user_roles_select on public.user_roles for select
  using (user_id = auth.uid() or public.has_global_permission('settings.manage'));
create policy user_roles_manage on public.user_roles for all
  using (public.has_global_permission('settings.manage')) with check (public.has_global_permission('settings.manage'));

create policy division_managers_select on public.division_managers for select using (public.is_staff());
create policy division_managers_manage on public.division_managers for all
  using (public.has_global_permission('divisions.manage')) with check (public.has_global_permission('divisions.manage'));

-- ---------------------------------------------------------------------
-- Divisions & catalogue (public read of active rows)
-- ---------------------------------------------------------------------
create policy divisions_select on public.business_divisions for select
  using (is_active or public.is_staff());
create policy divisions_manage on public.business_divisions for all
  using (public.has_global_permission('divisions.manage')) with check (public.has_global_permission('divisions.manage'));

create policy categories_select on public.categories for select
  using (
    (is_active and exists (select 1 from public.business_divisions d where d.id = division_id and d.is_active))
    or public.is_staff()
  );
create policy categories_manage on public.categories for all
  using (public.has_permission('products.manage', division_id))
  with check (public.has_permission('products.manage', division_id));

create policy products_select on public.products for select
  using (
    (is_active and exists (select 1 from public.business_divisions d where d.id = division_id and d.is_active))
    or public.has_permission('products.manage', division_id)
    or public.has_permission('inventory.manage', division_id)
    or public.has_permission('orders.view', division_id)
  );
create policy products_insert on public.products for insert
  with check (public.has_permission('products.manage', division_id));
create policy products_update on public.products for update
  using (public.has_permission('products.manage', division_id))
  with check (public.has_permission('products.manage', division_id));
create policy products_delete on public.products for delete
  using (public.has_permission('products.manage', division_id));

create policy product_images_select on public.product_images for select
  using (exists (select 1 from public.products p where p.id = product_id));
create policy product_images_manage on public.product_images for all
  using (exists (select 1 from public.products p where p.id = product_id and public.has_permission('products.manage', p.division_id)))
  with check (exists (select 1 from public.products p where p.id = product_id and public.has_permission('products.manage', p.division_id)));

create policy product_variants_select on public.product_variants for select
  using (exists (select 1 from public.products p where p.id = product_id));
create policy product_variants_manage on public.product_variants for all
  using (exists (select 1 from public.products p where p.id = product_id and public.has_permission('products.manage', p.division_id)))
  with check (exists (select 1 from public.products p where p.id = product_id and public.has_permission('products.manage', p.division_id)));

-- Stock levels are public (availability); writes only through adjust_stock()/place_order()
create policy inventory_select on public.inventory for select using (true);
create policy inventory_threshold_update on public.inventory for update
  using (exists (
    select 1 from public.product_variants v join public.products p on p.id = v.product_id
    where v.id = variant_id and public.has_permission('inventory.manage', p.division_id)))
  with check (exists (
    select 1 from public.product_variants v join public.products p on p.id = v.product_id
    where v.id = variant_id and public.has_permission('inventory.manage', p.division_id)));

create policy inventory_movements_select on public.inventory_movements for select
  using (exists (
    select 1 from public.product_variants v join public.products p on p.id = v.product_id
    where v.id = variant_id and public.has_permission('inventory.manage', p.division_id)));

-- Prevent quantity edits through plain UPDATEs (only the security-definer functions may change it)
create or replace function public.guard_inventory_quantity()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.quantity is distinct from old.quantity
     and coalesce(current_setting('ravantra.inventory_write', true), '') <> 'on' then
    raise exception 'Inventory quantity can only be changed via adjust_stock()' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger inventory_quantity_guard before update on public.inventory
  for each row execute function public.guard_inventory_quantity();

-- ---------------------------------------------------------------------
-- Customer-owned data
-- ---------------------------------------------------------------------
create policy addresses_own on public.addresses for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy addresses_staff_select on public.addresses for select
  using (public.has_permission('customers.view'));

create policy carts_own on public.carts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy cart_items_own on public.cart_items for all
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

create policy wishlists_own on public.wishlists for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy wishlist_items_own on public.wishlist_items for all
  using (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = auth.uid()))
  with check (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = auth.uid()));

-- ---------------------------------------------------------------------
-- Marketing
-- ---------------------------------------------------------------------
-- Coupons are never listed publicly; validation happens in place_order()/preview_coupon()
create policy coupons_staff on public.coupons for select using (public.has_permission('marketing.manage'));
create policy coupons_manage on public.coupons for all
  using (public.has_global_permission('marketing.manage')) with check (public.has_global_permission('marketing.manage'));

create policy promotions_select on public.promotions for select
  using ((is_active and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now()))
         or public.has_permission('marketing.manage'));
create policy promotions_manage on public.promotions for all
  using (public.has_global_permission('marketing.manage')) with check (public.has_global_permission('marketing.manage'));

create policy newsletter_staff on public.newsletter_subscribers for select using (public.has_permission('marketing.manage'));
create policy newsletter_manage on public.newsletter_subscribers for update
  using (public.has_global_permission('marketing.manage')) with check (public.has_global_permission('marketing.manage'));
create policy newsletter_delete on public.newsletter_subscribers for delete
  using (public.has_global_permission('marketing.manage'));

-- ---------------------------------------------------------------------
-- Orders & payments — read-only via RLS, writes via functions/service role
-- ---------------------------------------------------------------------
-- Security-definer helper avoids orders <-> order_items policy recursion.
create or replace function public.can_view_order(_order uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.orders o
    where o.id = _order
      and (
        o.user_id = auth.uid()
        or public.has_global_permission('orders.view')
        or exists (
          select 1 from public.order_items oi
          where oi.order_id = o.id and public.has_permission('orders.view', oi.division_id)
        )
      )
  );
$$;

create policy orders_select on public.orders for select
  using (user_id = auth.uid() or public.can_view_order(id));

create policy order_items_select on public.order_items for select
  using (public.can_view_order(order_id));

create policy order_status_history_select on public.order_status_history for select
  using (public.can_view_order(order_id));

create policy payments_select on public.payments for select
  using (public.can_view_order(order_id));

-- ---------------------------------------------------------------------
-- Salon & Spa
-- ---------------------------------------------------------------------
create policy services_select on public.services for select
  using (is_active or public.has_permission('appointments.manage', division_id));
create policy services_manage on public.services for all
  using (public.has_permission('appointments.manage', division_id))
  with check (public.has_permission('appointments.manage', division_id));

create policy stylists_select on public.stylists for select
  using (is_active or public.has_permission('appointments.manage', division_id));
create policy stylists_manage on public.stylists for all
  using (public.has_permission('appointments.manage', division_id))
  with check (public.has_permission('appointments.manage', division_id));

create policy stylist_services_select on public.stylist_services for select using (true);
create policy stylist_services_manage on public.stylist_services for all
  using (exists (select 1 from public.stylists s where s.id = stylist_id and public.has_permission('appointments.manage', s.division_id)))
  with check (exists (select 1 from public.stylists s where s.id = stylist_id and public.has_permission('appointments.manage', s.division_id)));

create policy working_hours_select on public.working_hours for select using (true);
create policy working_hours_manage on public.working_hours for all
  using (exists (select 1 from public.stylists s where s.id = stylist_id and public.has_permission('appointments.manage', s.division_id)))
  with check (exists (select 1 from public.stylists s where s.id = stylist_id and public.has_permission('appointments.manage', s.division_id)));

create policy blocked_slots_staff on public.blocked_slots for select
  using (exists (select 1 from public.stylists s where s.id = stylist_id and public.has_permission('appointments.manage', s.division_id)));
create policy blocked_slots_manage on public.blocked_slots for all
  using (exists (select 1 from public.stylists s where s.id = stylist_id and public.has_permission('appointments.manage', s.division_id)))
  with check (exists (select 1 from public.stylists s where s.id = stylist_id and public.has_permission('appointments.manage', s.division_id)));

create policy appointments_select on public.appointments for select
  using (
    customer_id = auth.uid()
    or exists (select 1 from public.services s where s.id = service_id and public.has_permission('appointments.manage', s.division_id))
  );

-- ---------------------------------------------------------------------
-- Reviews & activity
-- ---------------------------------------------------------------------
create policy reviews_select on public.reviews for select
  using (is_published or user_id = auth.uid() or public.has_permission('products.manage'));
create policy reviews_insert on public.reviews for insert
  with check (auth.uid() is not null and user_id = auth.uid() and is_demo = false);
create policy reviews_moderate on public.reviews for update
  using (exists (select 1 from public.products p where p.id = product_id and public.has_permission('products.manage', p.division_id)))
  with check (exists (select 1 from public.products p where p.id = product_id and public.has_permission('products.manage', p.division_id)));
create policy reviews_delete on public.reviews for delete
  using (user_id = auth.uid() or exists (select 1 from public.products p where p.id = product_id and public.has_permission('products.manage', p.division_id)));

create policy activity_logs_select on public.activity_logs for select
  using (public.has_permission('dashboard.view') and (division_id is null or public.has_permission('dashboard.view', division_id)));
create policy activity_logs_insert on public.activity_logs for insert
  with check (public.is_staff() and actor_id = auth.uid());

-- ---------------------------------------------------------------------
-- Grants (Supabase roles). RLS still applies on top of these.
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
