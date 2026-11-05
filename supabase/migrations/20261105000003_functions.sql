-- =====================================================================
-- RAVANTRA — transactional business functions
-- All money and stock maths happens here, inside a single transaction.
-- The client never supplies prices.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------
create or replace function public.shipping_fee(_net numeric)
returns numeric language sql immutable as $$
  select case when _net >= 2999 then 0 else 149 end::numeric;
$$;

-- ---------------------------------------------------------------------
-- Inventory
-- ---------------------------------------------------------------------

-- Every new variant gets an inventory row.
create or replace function public.create_inventory_row()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.inventory (variant_id, quantity) values (new.id, 0)
  on conflict (variant_id) do nothing;
  return new;
end $$;
create trigger product_variants_inventory after insert on public.product_variants
  for each row execute function public.create_inventory_row();

-- Internal: apply a stock delta with row lock + movement log.
create or replace function public._apply_stock(
  _variant uuid, _change int, _reason public.inventory_reason, _note text, _order uuid, _actor uuid
) returns int
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare v_qty int;
begin
  perform set_config('ravantra.inventory_write', 'on', true);
  update public.inventory
     set quantity = quantity + _change
   where variant_id = _variant
  returning quantity into v_qty;
  if v_qty is null then
    raise exception 'INVENTORY_NOT_FOUND' using errcode = 'P0002';
  end if;
  if v_qty < 0 then
    raise exception 'INSUFFICIENT_STOCK' using errcode = 'P0001';
  end if;
  insert into public.inventory_movements (variant_id, change, quantity_after, reason, note, order_id, actor_id)
  values (_variant, _change, v_qty, _reason, _note, _order, _actor);
  perform set_config('ravantra.inventory_write', 'off', true);
  return v_qty;
end $$;
revoke execute on function public._apply_stock(uuid, int, public.inventory_reason, text, uuid, uuid) from public, anon, authenticated;

-- Staff stock adjustment (restock, correction, damage, return).
create or replace function public.adjust_stock(
  p_variant uuid, p_change int, p_reason public.inventory_reason default 'adjustment', p_note text default null
) returns int
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare v_division uuid; v_qty int;
begin
  select p.division_id into v_division
    from public.product_variants v join public.products p on p.id = v.product_id
   where v.id = p_variant;
  if v_division is null then raise exception 'VARIANT_NOT_FOUND' using errcode = 'P0002'; end if;
  if not public.has_permission('inventory.manage', v_division) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if p_change = 0 or abs(p_change) > 10000 then raise exception 'INVALID_QUANTITY' using errcode = '22023'; end if;
  if p_reason in ('sale', 'order_cancelled', 'initial') then raise exception 'INVALID_REASON' using errcode = '22023'; end if;

  v_qty := public._apply_stock(p_variant, p_change, p_reason, left(p_note, 280), null, auth.uid());

  insert into public.activity_logs (actor_id, action, entity_type, entity_id, division_id, summary, metadata)
  values (auth.uid(), 'inventory.adjusted', 'product_variant', p_variant, v_division,
          format('Stock %s by %s (%s)', case when p_change > 0 then 'increased' else 'decreased' end, abs(p_change), p_reason),
          jsonb_build_object('change', p_change, 'quantity_after', v_qty, 'reason', p_reason));
  return v_qty;
end $$;
grant execute on function public.adjust_stock(uuid, int, public.inventory_reason, text) to authenticated;

-- ---------------------------------------------------------------------
-- Coupons
-- ---------------------------------------------------------------------
create or replace function public._coupon_discount(_coupon public.coupons, _subtotal numeric, _eligible numeric)
returns numeric language plpgsql immutable as $$
declare d numeric;
begin
  if _eligible <= 0 or _subtotal < _coupon.min_subtotal then return 0; end if;
  if _coupon.discount_type = 'percent' then
    d := round(_eligible * _coupon.discount_value / 100, 0);
  else
    d := least(_coupon.discount_value, _eligible);
  end if;
  if _coupon.max_discount is not null then d := least(d, _coupon.max_discount); end if;
  return greatest(d, 0);
end $$;

-- Price + discount preview for the cart (no writes).
-- p_items: [{ "variant_id": uuid, "quantity": int }]
create or replace function public.quote_cart(p_items jsonb, p_coupon text default null)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_lines jsonb := '[]'::jsonb;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_coupon public.coupons;
  v_coupon_error text;
  v_eligible numeric := 0;
  r record;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 30 then
    raise exception 'INVALID_ITEMS' using errcode = '22023';
  end if;

  for r in
    select v.id as variant_id, p.id as product_id, p.division_id, p.name, v.name as variant_name,
           greatest(1, least(10, (i->>'quantity')::int)) as quantity,
           case when v.price is not null then coalesce(v.sale_price, v.price)
                else coalesce(v.sale_price, p.sale_price, p.price) end as unit_price,
           coalesce(inv.quantity, 0) as stock,
           (p.is_active and v.is_active and d.is_active) as available
      from jsonb_array_elements(p_items) i
      join public.product_variants v on v.id = (i->>'variant_id')::uuid
      join public.products p on p.id = v.product_id
      join public.business_divisions d on d.id = p.division_id
      left join public.inventory inv on inv.variant_id = v.id
  loop
    v_lines := v_lines || jsonb_build_object(
      'variant_id', r.variant_id, 'product_id', r.product_id, 'division_id', r.division_id,
      'quantity', r.quantity, 'unit_price', r.unit_price, 'line_total', r.unit_price * r.quantity,
      'stock', r.stock, 'available', r.available and r.stock >= r.quantity
    );
    if r.available then v_subtotal := v_subtotal + r.unit_price * r.quantity; end if;
  end loop;

  if p_coupon is not null and length(trim(p_coupon)) > 0 then
    select * into v_coupon from public.coupons
     where code = upper(trim(p_coupon)) and is_active
       and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())
       and (usage_limit is null or used_count < usage_limit);
    if v_coupon.id is null then
      v_coupon_error := 'This code is invalid or has expired.';
    else
      select coalesce(sum((l->>'line_total')::numeric), 0) into v_eligible
        from jsonb_array_elements(v_lines) l
       where (l->>'available')::boolean
         and (v_coupon.division_id is null or (l->>'division_id')::uuid = v_coupon.division_id);
      if v_subtotal < v_coupon.min_subtotal then
        v_coupon_error := format('Add ₹%s more to use this code.', to_char(v_coupon.min_subtotal - v_subtotal, 'FM999,99,990'));
      elsif v_eligible <= 0 then
        v_coupon_error := 'This code does not apply to the items in your bag.';
      else
        v_discount := public._coupon_discount(v_coupon, v_subtotal, v_eligible);
      end if;
    end if;
  end if;

  return jsonb_build_object(
    'lines', v_lines,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'shipping', case when v_subtotal = 0 then 0 else public.shipping_fee(v_subtotal - v_discount) end,
    'total', v_subtotal - v_discount + case when v_subtotal = 0 then 0 else public.shipping_fee(v_subtotal - v_discount) end,
    'coupon_code', case when v_discount > 0 then v_coupon.code else null end,
    'coupon_error', v_coupon_error
  );
end $$;
grant execute on function public.quote_cart(jsonb, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------

-- Place an order atomically: validates stock, prices from DB, applies coupon,
-- reserves inventory and creates a pending payment record.
create or replace function public.place_order(
  p_items jsonb, p_address jsonb, p_coupon text default null, p_notes text default null
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_profile public.profiles;
  v_order_id uuid;
  v_order_number text;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_eligible numeric := 0;
  v_shipping numeric;
  v_coupon public.coupons;
  r record;
  v_count int := 0;
begin
  if v_user is null then raise exception 'AUTH_REQUIRED' using errcode = '28000'; end if;
  select * into v_profile from public.profiles where id = v_user;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 30 then
    raise exception 'INVALID_ITEMS' using errcode = '22023';
  end if;

  -- address validation
  if coalesce(length(trim(p_address->>'full_name')),0) < 2
     or coalesce(p_address->>'phone','') !~ '^\+?[0-9 ]{10,15}$'
     or coalesce(length(trim(p_address->>'line1')),0) < 3
     or coalesce(length(trim(p_address->>'city')),0) < 2
     or coalesce(length(trim(p_address->>'state')),0) < 2
     or coalesce(p_address->>'postal_code','') !~ '^[1-9][0-9]{5}$' then
    raise exception 'INVALID_ADDRESS' using errcode = '22023';
  end if;

  create temporary table _lines on commit drop as
  select v.id as variant_id, p.id as product_id, p.division_id, p.name as product_name,
         v.name as variant_name, v.sku,
         (select pi.url from public.product_images pi where pi.product_id = p.id order by pi.sort_order limit 1) as image,
         sum(greatest(1, least(10, (i->>'quantity')::int)))::int as quantity,
         case when v.price is not null then coalesce(v.sale_price, v.price)
              else coalesce(v.sale_price, p.sale_price, p.price) end as unit_price,
         (p.is_active and v.is_active and d.is_active) as available
    from jsonb_array_elements(p_items) i
    join public.product_variants v on v.id = (i->>'variant_id')::uuid
    join public.products p on p.id = v.product_id
    join public.business_divisions d on d.id = p.division_id
   where d.kind = 'products'
   group by v.id, p.id, d.is_active;

  select count(*) into v_count from _lines;
  if v_count <> (select count(distinct (i->>'variant_id')) from jsonb_array_elements(p_items) i) then
    raise exception 'ITEM_NOT_FOUND' using errcode = 'P0002';
  end if;
  if exists (select 1 from _lines where not available) then
    raise exception 'ITEM_UNAVAILABLE' using errcode = 'P0001';
  end if;

  -- lock stock rows in a stable order to avoid deadlocks
  perform 1 from public.inventory inv join _lines l on l.variant_id = inv.variant_id
   order by inv.variant_id for update of inv;
  if exists (
    select 1 from _lines l join public.inventory inv on inv.variant_id = l.variant_id
     where inv.quantity < l.quantity
  ) then
    raise exception 'INSUFFICIENT_STOCK' using errcode = 'P0001';
  end if;

  select coalesce(sum(unit_price * quantity), 0) into v_subtotal from _lines;

  if p_coupon is not null and length(trim(p_coupon)) > 0 then
    select * into v_coupon from public.coupons
     where code = upper(trim(p_coupon)) and is_active
       and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at > now())
       and (usage_limit is null or used_count < usage_limit)
     for update;
    if v_coupon.id is null then raise exception 'INVALID_COUPON' using errcode = '22023'; end if;
    select coalesce(sum(unit_price * quantity), 0) into v_eligible from _lines
     where v_coupon.division_id is null or division_id = v_coupon.division_id;
    v_discount := public._coupon_discount(v_coupon, v_subtotal, v_eligible);
    if v_discount <= 0 then raise exception 'COUPON_NOT_APPLICABLE' using errcode = '22023'; end if;
    update public.coupons set used_count = used_count + 1 where id = v_coupon.id;
  end if;

  v_shipping := public.shipping_fee(v_subtotal - v_discount);

  insert into public.orders (
    user_id, customer_name, customer_email, customer_phone, subtotal, discount_total,
    shipping_total, total, coupon_id, coupon_code, shipping_address, notes
  ) values (
    v_user, trim(p_address->>'full_name'), coalesce(v_profile.email, ''), p_address->>'phone',
    v_subtotal, v_discount, v_shipping, v_subtotal - v_discount + v_shipping,
    v_coupon.id, v_coupon.code,
    jsonb_build_object(
      'full_name', trim(p_address->>'full_name'), 'phone', p_address->>'phone',
      'line1', trim(p_address->>'line1'), 'line2', nullif(trim(coalesce(p_address->>'line2','')), ''),
      'city', trim(p_address->>'city'), 'state', trim(p_address->>'state'),
      'postal_code', p_address->>'postal_code', 'country', 'India'),
    left(p_notes, 500)
  ) returning id, order_number into v_order_id, v_order_number;

  insert into public.order_items (order_id, product_id, variant_id, division_id, product_name, variant_name, sku, image, unit_price, quantity, line_total)
  select v_order_id, product_id, variant_id, division_id, product_name, variant_name, sku, image, unit_price, quantity, unit_price * quantity
    from _lines;

  for r in select variant_id, quantity from _lines order by variant_id loop
    perform public._apply_stock(r.variant_id, -r.quantity, 'sale', 'Reserved for order ' || v_order_number, v_order_id, v_user);
  end loop;

  insert into public.order_status_history (order_id, status, note, actor_id)
  values (v_order_id, 'pending', 'Order placed', v_user);

  insert into public.payments (order_id, provider, amount, status)
  values (v_order_id, 'razorpay', v_subtotal - v_discount + v_shipping, 'pending');

  return jsonb_build_object('order_id', v_order_id, 'order_number', v_order_number,
                            'total', v_subtotal - v_discount + v_shipping);
end $$;
grant execute on function public.place_order(jsonb, jsonb, text, text) to authenticated;

-- Return reserved stock + coupon usage for an order (idempotent).
create or replace function public._release_order(_order uuid, _actor uuid, _note text)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare o public.orders; r record;
begin
  select * into o from public.orders where id = _order for update;
  if o.id is null or o.stock_released then return; end if;
  for r in select variant_id, quantity from public.order_items where order_id = _order and variant_id is not null order by variant_id loop
    perform public._apply_stock(r.variant_id, r.quantity, 'order_cancelled', _note, _order, _actor);
  end loop;
  if o.coupon_id is not null then
    update public.coupons set used_count = greatest(used_count - 1, 0) where id = o.coupon_id;
  end if;
  update public.orders set stock_released = true where id = _order;
end $$;
revoke execute on function public._release_order(uuid, uuid, text) from public, anon, authenticated;

-- Can the current user manage (fulfil/cancel/refund) this order? Requires the
-- permission for EVERY division represented in the order.
create or replace function public.can_manage_order(p_order uuid)
returns boolean
language sql stable security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.order_items where order_id = p_order)
     and not exists (
       select 1 from public.order_items oi
        where oi.order_id = p_order and not public.has_permission('orders.manage', oi.division_id)
     );
$$;
grant execute on function public.can_manage_order(uuid) to authenticated;

-- Fulfilment workflow for staff.
create or replace function public.admin_update_order_status(p_order uuid, p_status public.order_status, p_note text default null)
returns public.order_status
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare o public.orders; v_allowed public.order_status[];
begin
  if not public.can_manage_order(p_order) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  select * into o from public.orders where id = p_order for update;

  v_allowed := case o.status
    when 'pending' then array['confirmed','cancelled']::public.order_status[]
    when 'confirmed' then array['processing','cancelled']::public.order_status[]
    when 'processing' then array['shipped','cancelled']::public.order_status[]
    when 'shipped' then array['delivered']::public.order_status[]
    else array[]::public.order_status[]
  end;
  if not (p_status = any(v_allowed)) then
    raise exception 'INVALID_TRANSITION: % -> %', o.status, p_status using errcode = '22023';
  end if;
  if p_status = 'confirmed' and o.payment_status <> 'successful' then
    raise exception 'PAYMENT_NOT_CAPTURED' using errcode = '22023';
  end if;
  if p_status = 'cancelled' and o.payment_status = 'successful' then
    raise exception 'REFUND_REQUIRED' using errcode = '22023';
  end if;

  update public.orders set status = p_status where id = p_order;
  insert into public.order_status_history (order_id, status, note, actor_id) values (p_order, p_status, left(p_note, 280), auth.uid());
  if p_status = 'cancelled' then
    perform public._release_order(p_order, auth.uid(), 'Order cancelled');
    update public.payments set status = 'failed', failure_reason = coalesce(failure_reason, 'Order cancelled') where order_id = p_order and status = 'pending';
    update public.orders set payment_status = 'failed' where id = p_order and payment_status = 'pending';
  end if;
  insert into public.activity_logs (actor_id, action, entity_type, entity_id, summary, metadata)
  values (auth.uid(), 'order.status_changed', 'order', p_order, format('Order %s → %s', o.order_number, p_status),
          jsonb_build_object('from', o.status, 'to', p_status));
  return p_status;
end $$;
grant execute on function public.admin_update_order_status(uuid, public.order_status, text) to authenticated;

-- Customers can cancel their own order while it is still pending/confirmed.
create or replace function public.cancel_my_order(p_order uuid)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_order and user_id = auth.uid() for update;
  if o.id is null then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if o.status <> 'pending' or o.payment_status = 'successful' then
    raise exception 'CANNOT_CANCEL' using errcode = '22023';
  end if;
  update public.orders set status = 'cancelled', payment_status = case when payment_status = 'pending' then 'failed' else payment_status end where id = p_order;
  update public.payments set status = 'failed', failure_reason = 'Cancelled by customer' where order_id = p_order and status = 'pending';
  insert into public.order_status_history (order_id, status, note, actor_id) values (p_order, 'cancelled', 'Cancelled by customer', auth.uid());
  perform public._release_order(p_order, auth.uid(), 'Cancelled by customer');
end $$;
grant execute on function public.cancel_my_order(uuid) to authenticated;

-- ---- Payment state transitions: SERVICE ROLE ONLY (called after signature verification)
create or replace function public.payment_attach_provider_order(p_order uuid, p_provider text, p_provider_order_id text)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  update public.payments
     set provider = p_provider, provider_order_id = p_provider_order_id
   where order_id = p_order and status in ('pending', 'failed');
  update public.payments set status = 'pending' where order_id = p_order and status = 'failed';
end $$;

create or replace function public.payment_mark_successful(
  p_order uuid, p_provider_payment_id text, p_method text default null, p_raw jsonb default null
) returns boolean
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_order for update;
  if o.id is null then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if o.payment_status = 'successful' then return false; end if; -- idempotent
  if o.status = 'cancelled' or o.stock_released then
    -- payment arrived after the order was released: flag for manual refund
    update public.payments set status = 'successful', provider_payment_id = p_provider_payment_id, method = p_method, raw = p_raw,
           failure_reason = 'Captured after cancellation — refund required'
     where order_id = p_order;
    update public.orders set payment_status = 'successful' where id = p_order;
    return true;
  end if;
  update public.payments
     set status = 'successful', provider_payment_id = p_provider_payment_id, method = p_method, raw = p_raw, failure_reason = null
   where order_id = p_order;
  update public.orders set payment_status = 'successful', status = case when status = 'pending' then 'confirmed' else status end
   where id = p_order;
  insert into public.order_status_history (order_id, status, note) values (p_order, 'confirmed', 'Payment received');
  return true;
end $$;

create or replace function public.payment_mark_failed(p_order uuid, p_reason text, p_raw jsonb default null)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  update public.payments set status = 'failed', failure_reason = left(p_reason, 280), raw = coalesce(p_raw, raw)
   where order_id = p_order and status = 'pending';
  update public.orders set payment_status = 'failed' where id = p_order and payment_status = 'pending';
end $$;

create or replace function public.payment_mark_refunded(p_order uuid, p_amount numeric, p_actor uuid, p_note text default null)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_order for update;
  if o.id is null then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if o.payment_status <> 'successful' then raise exception 'NOT_REFUNDABLE' using errcode = '22023'; end if;
  update public.payments set status = 'refunded', refunded_amount = p_amount where order_id = p_order and status = 'successful';
  update public.orders set payment_status = 'refunded', status = 'refunded' where id = p_order;
  insert into public.order_status_history (order_id, status, note, actor_id) values (p_order, 'refunded', coalesce(left(p_note, 280), 'Refund issued'), p_actor);
  if o.status not in ('shipped', 'delivered') then
    perform public._release_order(p_order, p_actor, 'Refunded before dispatch');
  end if;
  insert into public.activity_logs (actor_id, action, entity_type, entity_id, summary, metadata)
  values (p_actor, 'order.refunded', 'order', p_order, format('Refunded ₹%s on %s', p_amount, o.order_number), jsonb_build_object('amount', p_amount));
end $$;

-- Releases stock held by unpaid orders older than p_minutes.
create or replace function public.expire_stale_orders(p_minutes int default 60)
returns int
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare r record; n int := 0;
begin
  for r in select id from public.orders
            where status = 'pending' and payment_status in ('pending','failed') and not stock_released
              and created_at < now() - make_interval(mins => p_minutes)
            for update skip locked loop
    update public.orders set status = 'cancelled', payment_status = 'failed' where id = r.id;
    update public.payments set status = 'failed', failure_reason = coalesce(failure_reason, 'Payment window expired') where order_id = r.id and status = 'pending';
    insert into public.order_status_history (order_id, status, note) values (r.id, 'cancelled', 'Payment window expired');
    perform public._release_order(r.id, null, 'Payment window expired');
    n := n + 1;
  end loop;
  return n;
end $$;

revoke execute on function public.payment_attach_provider_order(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.payment_mark_successful(uuid, text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.payment_mark_failed(uuid, text, jsonb) from public, anon, authenticated;
revoke execute on function public.payment_mark_refunded(uuid, numeric, uuid, text) from public, anon, authenticated;
revoke execute on function public.expire_stale_orders(int) from public, anon, authenticated;
grant execute on function public.payment_attach_provider_order(uuid, text, text) to service_role;
grant execute on function public.payment_mark_successful(uuid, text, text, jsonb) to service_role;
grant execute on function public.payment_mark_failed(uuid, text, jsonb) to service_role;
grant execute on function public.payment_mark_refunded(uuid, numeric, uuid, text) to service_role;
grant execute on function public.expire_stale_orders(int) to service_role;

-- ---------------------------------------------------------------------
-- Salon & Spa booking (Asia/Kolkata)
-- ---------------------------------------------------------------------

-- Busy ranges for a stylist (appointments + blocks) without exposing who booked.
create or replace function public.stylist_busy_ranges(p_stylist uuid, p_from timestamptz, p_to timestamptz)
returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select a.starts_at, a.ends_at from public.appointments a
   where a.stylist_id = p_stylist and a.status in ('pending','confirmed')
     and a.starts_at < p_to and a.ends_at > p_from
  union all
  select b.starts_at, b.ends_at from public.blocked_slots b
   where b.stylist_id = p_stylist and b.starts_at < p_to and b.ends_at > p_from
  order by 1;
$$;
grant execute on function public.stylist_busy_ranges(uuid, timestamptz, timestamptz) to anon, authenticated;

-- Internal: validate a slot. Raises on any problem.
create or replace function public._validate_slot(
  _service uuid, _stylist uuid, _starts timestamptz, _exclude uuid, _enforce_lead boolean
) returns timestamptz
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  s public.services;
  v_ends timestamptz;
  v_local_start timestamp;
  v_local_end timestamp;
  wh public.working_hours;
begin
  select * into s from public.services where id = _service and is_active;
  if s.id is null then raise exception 'SERVICE_UNAVAILABLE' using errcode = 'P0002'; end if;
  if not exists (select 1 from public.stylists st where st.id = _stylist and st.is_active) then
    raise exception 'STYLIST_UNAVAILABLE' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.stylist_services ss where ss.stylist_id = _stylist and ss.service_id = _service) then
    raise exception 'STYLIST_DOES_NOT_OFFER_SERVICE' using errcode = '22023';
  end if;
  if extract(epoch from _starts)::bigint % 900 <> 0 then
    raise exception 'INVALID_START_TIME' using errcode = '22023';
  end if;
  if _enforce_lead and _starts < now() + interval '1 hour' then
    raise exception 'TOO_SOON' using errcode = '22023';
  end if;
  if _starts > now() + interval '90 days' then
    raise exception 'TOO_FAR_AHEAD' using errcode = '22023';
  end if;

  v_ends := _starts + make_interval(mins => s.duration_min);
  v_local_start := _starts at time zone 'Asia/Kolkata';
  v_local_end := v_ends at time zone 'Asia/Kolkata';

  select * into wh from public.working_hours
   where stylist_id = _stylist and weekday = extract(dow from v_local_start)::int;
  if wh.id is null
     or v_local_start::date <> v_local_end::date
     or v_local_start::time < wh.start_time
     or v_local_end::time > wh.end_time then
    raise exception 'OUTSIDE_WORKING_HOURS' using errcode = '22023';
  end if;

  if exists (select 1 from public.blocked_slots b
              where b.stylist_id = _stylist and b.starts_at < v_ends and b.ends_at > _starts) then
    raise exception 'SLOT_BLOCKED' using errcode = '22023';
  end if;
  if exists (select 1 from public.appointments a
              where a.stylist_id = _stylist and a.status in ('pending','confirmed')
                and (_exclude is null or a.id <> _exclude)
                and a.starts_at < v_ends and a.ends_at > _starts) then
    raise exception 'SLOT_TAKEN' using errcode = '23P01';
  end if;
  return v_ends;
end $$;
revoke execute on function public._validate_slot(uuid, uuid, timestamptz, uuid, boolean) from public, anon, authenticated;

create or replace function public.book_appointment(
  p_service uuid, p_stylist uuid, p_starts_at timestamptz,
  p_name text, p_email text, p_phone text, p_notes text default null
) returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare v_ends timestamptz; v_id uuid; v_ref text; v_price numeric;
begin
  if coalesce(length(trim(p_name)), 0) < 2 or length(p_name) > 120 then raise exception 'INVALID_NAME' using errcode = '22023'; end if;
  if coalesce(p_email, '') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'INVALID_EMAIL' using errcode = '22023'; end if;
  if coalesce(p_phone, '') !~ '^\+?[0-9 ]{10,15}$' then raise exception 'INVALID_PHONE' using errcode = '22023'; end if;

  v_ends := public._validate_slot(p_service, p_stylist, p_starts_at, null, true);
  select price into v_price from public.services where id = p_service;

  begin
    insert into public.appointments (customer_id, customer_name, customer_email, customer_phone, service_id, stylist_id,
                                     starts_at, ends_at, status, price, notes)
    values (auth.uid(), trim(p_name), lower(trim(p_email)), trim(p_phone), p_service, p_stylist,
            p_starts_at, v_ends, 'pending', v_price, left(p_notes, 500))
    returning id, reference into v_id, v_ref;
  exception when exclusion_violation then
    raise exception 'SLOT_TAKEN' using errcode = '23P01';
  end;

  return jsonb_build_object('appointment_id', v_id, 'reference', v_ref, 'starts_at', p_starts_at, 'ends_at', v_ends);
end $$;
grant execute on function public.book_appointment(uuid, uuid, timestamptz, text, text, text, text) to anon, authenticated;

create or replace function public.cancel_my_appointment(p_id uuid, p_reason text default null)
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare a public.appointments;
begin
  select * into a from public.appointments where id = p_id and customer_id = auth.uid() for update;
  if a.id is null then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if a.status not in ('pending','confirmed') then raise exception 'CANNOT_CANCEL' using errcode = '22023'; end if;
  if a.starts_at < now() + interval '4 hours' then raise exception 'TOO_LATE_TO_CANCEL' using errcode = '22023'; end if;
  update public.appointments set status = 'cancelled', cancel_reason = coalesce(left(p_reason, 280), 'Cancelled by customer') where id = p_id;
end $$;
grant execute on function public.cancel_my_appointment(uuid, text) to authenticated;

create or replace function public.reschedule_my_appointment(p_id uuid, p_starts_at timestamptz)
returns jsonb
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare a public.appointments; v_ends timestamptz;
begin
  select * into a from public.appointments where id = p_id and customer_id = auth.uid() for update;
  if a.id is null then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if a.status not in ('pending','confirmed') then raise exception 'CANNOT_RESCHEDULE' using errcode = '22023'; end if;
  if a.starts_at < now() + interval '4 hours' then raise exception 'TOO_LATE_TO_RESCHEDULE' using errcode = '22023'; end if;
  v_ends := public._validate_slot(a.service_id, a.stylist_id, p_starts_at, a.id, true);
  begin
    update public.appointments set starts_at = p_starts_at, ends_at = v_ends, status = 'pending' where id = p_id;
  exception when exclusion_violation then
    raise exception 'SLOT_TAKEN' using errcode = '23P01';
  end;
  return jsonb_build_object('appointment_id', p_id, 'starts_at', p_starts_at, 'ends_at', v_ends);
end $$;
grant execute on function public.reschedule_my_appointment(uuid, timestamptz) to authenticated;

create or replace function public.admin_update_appointment(
  p_id uuid, p_status public.appointment_status default null, p_starts_at timestamptz default null,
  p_stylist uuid default null, p_note text default null
) returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare a public.appointments; v_division uuid; v_ends timestamptz; v_stylist uuid;
begin
  select * into a from public.appointments where id = p_id for update;
  if a.id is null then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  select division_id into v_division from public.services where id = a.service_id;
  if not public.has_permission('appointments.manage', v_division) then raise exception 'FORBIDDEN' using errcode = '42501'; end if;

  if p_starts_at is not null or p_stylist is not null then
    v_stylist := coalesce(p_stylist, a.stylist_id);
    v_ends := public._validate_slot(a.service_id, v_stylist, coalesce(p_starts_at, a.starts_at), a.id, false);
    begin
      update public.appointments
         set starts_at = coalesce(p_starts_at, a.starts_at), ends_at = v_ends, stylist_id = v_stylist
       where id = p_id;
    exception when exclusion_violation then
      raise exception 'SLOT_TAKEN' using errcode = '23P01';
    end;
  end if;

  if p_status is not null and p_status <> a.status then
    if a.status in ('cancelled','completed','no_show') and p_status in ('pending','confirmed') then
      -- re-activating: make sure the slot is still free
      perform public._validate_slot(a.service_id, coalesce(v_stylist, a.stylist_id), coalesce(p_starts_at, a.starts_at), a.id, false);
    end if;
    update public.appointments set status = p_status,
           cancel_reason = case when p_status = 'cancelled' then coalesce(left(p_note, 280), 'Cancelled by salon') else cancel_reason end
     where id = p_id;
  end if;

  insert into public.activity_logs (actor_id, action, entity_type, entity_id, division_id, summary, metadata)
  values (auth.uid(), 'appointment.updated', 'appointment', p_id, v_division,
          format('Appointment %s updated', a.reference),
          jsonb_build_object('status', p_status, 'starts_at', p_starts_at, 'stylist', p_stylist));
end $$;
grant execute on function public.admin_update_appointment(uuid, public.appointment_status, timestamptz, uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- Reviews keep product rating aggregates in sync
-- ---------------------------------------------------------------------
create or replace function public.refresh_product_rating()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare pid uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products p set
    rating_avg = coalesce((select round(avg(rating)::numeric, 2) from public.reviews r where r.product_id = pid and r.is_published), 0),
    rating_count = (select count(*) from public.reviews r where r.product_id = pid and r.is_published)
  where p.id = pid;
  return null;
end $$;
create trigger reviews_rating_refresh after insert or update or delete on public.reviews
  for each row execute function public.refresh_product_rating();

-- ---------------------------------------------------------------------
-- Newsletter (public, idempotent)
-- ---------------------------------------------------------------------
create or replace function public.subscribe_newsletter(p_email text, p_source text default 'website')
returns void
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if coalesce(p_email, '') !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(p_email) > 254 then
    raise exception 'INVALID_EMAIL' using errcode = '22023';
  end if;
  insert into public.newsletter_subscribers (email, source)
  values (lower(trim(p_email)), left(coalesce(p_source, 'website'), 40))
  on conflict ((lower(email))) do update set is_active = true;
end $$;
grant execute on function public.subscribe_newsletter(text, text) to anon, authenticated;
