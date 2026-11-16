-- =====================================================================
-- RAVANTRA — reporting & analytics (all computed from live records)
-- Each function scopes data to the divisions the caller may see.
-- Revenue = merchandise value of paid, non-cancelled/refunded orders.
-- =====================================================================

create or replace function public._visible_sales_divisions()
returns setof uuid
language sql stable security definer
set search_path = public, pg_temp
as $$
  select d.id from public.business_divisions d
   where d.kind = 'products'
     and (public.has_permission('reports.view', d.id) or public.has_permission('orders.view', d.id));
$$;

create or replace function public._visible_salon_divisions()
returns setof uuid
language sql stable security definer
set search_path = public, pg_temp
as $$
  select d.id from public.business_divisions d
   where d.kind = 'services'
     and (public.has_permission('appointments.manage', d.id) or public.has_permission('reports.view', d.id));
$$;

create or replace function public._visible_stock_divisions()
returns setof uuid
language sql stable security definer
set search_path = public, pg_temp
as $$
  select d.id from public.business_divisions d
   where d.kind = 'products'
     and (public.has_permission('inventory.manage', d.id) or public.has_permission('products.manage', d.id)
          or public.has_permission('reports.view', d.id));
$$;

create or replace function public._require_reports()
returns void
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  if not (public.has_permission('dashboard.view') or public.has_permission('reports.view')) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
end $$;

-- Headline KPIs for the dashboard
create or replace function public.report_overview(p_days int default 30)
returns jsonb
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
declare
  v_from timestamptz := now() - make_interval(days => p_days);
  v_prev timestamptz := now() - make_interval(days => p_days * 2);
  res jsonb;
begin
  perform public._require_reports();
  with sales as (
    select o.id as order_id, o.created_at, oi.line_total, oi.quantity
      from public.order_items oi
      join public.orders o on o.id = oi.order_id
     where oi.division_id in (select public._visible_sales_divisions())
       and o.payment_status = 'successful' and o.status not in ('cancelled','refunded')
  )
  select jsonb_build_object(
    'revenue', coalesce((select sum(line_total) from sales where created_at >= v_from), 0),
    'revenue_prev', coalesce((select sum(line_total) from sales where created_at >= v_prev and created_at < v_from), 0),
    'revenue_all_time', coalesce((select sum(line_total) from sales), 0),
    'orders', (select count(distinct order_id) from sales where created_at >= v_from),
    'orders_prev', (select count(distinct order_id) from sales where created_at >= v_prev and created_at < v_from),
    'orders_all_time', (select count(distinct o.id) from public.orders o
                         where exists (select 1 from public.order_items oi where oi.order_id = o.id
                                        and oi.division_id in (select public._visible_sales_divisions()))),
    'units', coalesce((select sum(quantity) from sales where created_at >= v_from), 0),
    'pending_orders', (select count(distinct o.id) from public.orders o
                        join public.order_items oi on oi.order_id = o.id
                       where oi.division_id in (select public._visible_sales_divisions())
                         and o.status in ('pending','confirmed','processing')),
    'customers', (select count(*) from public.user_roles ur join public.roles r on r.id = ur.role_id where r.key = 'customer'),
    'new_customers', (select count(*) from public.profiles p
                        join public.user_roles ur on ur.user_id = p.id
                        join public.roles r on r.id = ur.role_id
                       where r.key = 'customer' and p.created_at >= v_from),
    'appointments', (select count(*) from public.appointments a join public.services s on s.id = a.service_id
                      where s.division_id in (select public._visible_salon_divisions()) and a.starts_at >= v_from and a.starts_at <= now()),
    'appointments_upcoming', (select count(*) from public.appointments a join public.services s on s.id = a.service_id
                      where s.division_id in (select public._visible_salon_divisions())
                        and a.starts_at > now() and a.status in ('pending','confirmed')),
    'appointment_revenue', coalesce((select sum(a.price) from public.appointments a join public.services s on s.id = a.service_id
                      where s.division_id in (select public._visible_salon_divisions())
                        and a.status = 'completed' and a.starts_at >= v_from), 0),
    'active_products', (select count(*) from public.products p
                         where p.is_active and p.division_id in (select public._visible_stock_divisions())),
    'low_stock', (select count(*) from public.inventory inv
                   join public.product_variants v on v.id = inv.variant_id
                   join public.products p on p.id = v.product_id
                  where p.division_id in (select public._visible_stock_divisions())
                    and v.is_active and inv.quantity <= inv.low_stock_threshold),
    'can_see_sales', exists (select 1 from public._visible_sales_divisions()),
    'can_see_salon', exists (select 1 from public._visible_salon_divisions()),
    'can_see_stock', exists (select 1 from public._visible_stock_divisions())
  ) into res;
  return res;
end $$;

create or replace function public.report_revenue_series(p_months int default 6)
returns table (month date, revenue numeric, orders bigint)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  perform public._require_reports();
  return query
  with months as (
    select generate_series(
      date_trunc('month', (now() at time zone 'Asia/Kolkata')) - make_interval(months => p_months - 1),
      date_trunc('month', (now() at time zone 'Asia/Kolkata')),
      interval '1 month')::date as m
  ),
  sales as (
    select date_trunc('month', o.created_at at time zone 'Asia/Kolkata')::date as m, o.id, oi.line_total
      from public.order_items oi join public.orders o on o.id = oi.order_id
     where oi.division_id in (select public._visible_sales_divisions())
       and o.payment_status = 'successful' and o.status not in ('cancelled','refunded')
  )
  select months.m, coalesce(sum(s.line_total), 0)::numeric, count(distinct s.id)
    from months left join sales s on s.m = months.m
   group by months.m order by months.m;
end $$;

create or replace function public.report_daily_sales(p_days int default 30)
returns table (day date, revenue numeric, orders bigint)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  perform public._require_reports();
  return query
  with days as (
    select generate_series((now() at time zone 'Asia/Kolkata')::date - (p_days - 1), (now() at time zone 'Asia/Kolkata')::date, interval '1 day')::date as d
  ),
  sales as (
    select (o.created_at at time zone 'Asia/Kolkata')::date as d, o.id, oi.line_total
      from public.order_items oi join public.orders o on o.id = oi.order_id
     where oi.division_id in (select public._visible_sales_divisions())
       and o.payment_status = 'successful' and o.status not in ('cancelled','refunded')
  )
  select days.d, coalesce(sum(s.line_total), 0)::numeric, count(distinct s.id)
    from days left join sales s on s.d = days.d
   group by days.d order by days.d;
end $$;

create or replace function public.report_division_sales(p_days int default 180)
returns table (division_id uuid, name text, accent_color text, revenue numeric, units bigint, orders bigint)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  perform public._require_reports();
  return query
  select d.id, d.short_name, d.accent_color,
         coalesce(sum(oi.line_total) filter (where o.id is not null), 0)::numeric,
         coalesce(sum(oi.quantity) filter (where o.id is not null), 0)::bigint,
         count(distinct o.id)
    from public.business_divisions d
    left join public.order_items oi on oi.division_id = d.id
    left join public.orders o on o.id = oi.order_id
         and o.payment_status = 'successful' and o.status not in ('cancelled','refunded')
         and o.created_at >= now() - make_interval(days => p_days)
   where d.id in (select public._visible_sales_divisions())
   group by d.id, d.short_name, d.accent_color, d.sort_order
   order by d.sort_order;
end $$;

create or replace function public.report_top_products(p_days int default 90, p_limit int default 8)
returns table (product_id uuid, name text, division text, units bigint, revenue numeric)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  perform public._require_reports();
  return query
  select oi.product_id, max(oi.product_name), max(d.short_name), sum(oi.quantity)::bigint, sum(oi.line_total)::numeric
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    join public.business_divisions d on d.id = oi.division_id
   where oi.division_id in (select public._visible_sales_divisions())
     and o.payment_status = 'successful' and o.status not in ('cancelled','refunded')
     and o.created_at >= now() - make_interval(days => p_days)
   group by oi.product_id
   order by 5 desc
   limit least(p_limit, 50);
end $$;

create or replace function public.report_order_status()
returns table (status public.order_status, count bigint)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  perform public._require_reports();
  return query
  select o.status, count(*)
    from public.orders o
   where exists (select 1 from public.order_items oi where oi.order_id = o.id
                  and oi.division_id in (select public._visible_sales_divisions()))
   group by o.status order by o.status;
end $$;

create or replace function public.report_appointment_series(p_months int default 6)
returns table (month date, total bigint, completed bigint, cancelled bigint, revenue numeric)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  perform public._require_reports();
  return query
  with months as (
    select generate_series(
      date_trunc('month', (now() at time zone 'Asia/Kolkata')) - make_interval(months => p_months - 1),
      date_trunc('month', (now() at time zone 'Asia/Kolkata')),
      interval '1 month')::date as m
  ),
  appts as (
    select date_trunc('month', a.starts_at at time zone 'Asia/Kolkata')::date as m, a.status, a.price
      from public.appointments a join public.services s on s.id = a.service_id
     where s.division_id in (select public._visible_salon_divisions())
  )
  select months.m,
         count(a.m),
         count(a.m) filter (where a.status = 'completed'),
         count(a.m) filter (where a.status in ('cancelled','no_show')),
         coalesce(sum(a.price) filter (where a.status = 'completed'), 0)::numeric
    from months left join appts a on a.m = months.m
   group by months.m order by months.m;
end $$;

create or replace function public.report_service_popularity(p_days int default 180)
returns table (service_id uuid, name text, bookings bigint, revenue numeric)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  perform public._require_reports();
  return query
  select s.id, s.name, count(a.id), coalesce(sum(a.price) filter (where a.status = 'completed'), 0)::numeric
    from public.services s
    left join public.appointments a on a.service_id = s.id and a.starts_at >= now() - make_interval(days => p_days)
   where s.division_id in (select public._visible_salon_divisions())
   group by s.id, s.name
   order by 3 desc;
end $$;

create or replace function public.report_customer_growth(p_months int default 6)
returns table (month date, new_customers bigint, total bigint)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  perform public._require_reports();
  return query
  with months as (
    select generate_series(
      date_trunc('month', (now() at time zone 'Asia/Kolkata')) - make_interval(months => p_months - 1),
      date_trunc('month', (now() at time zone 'Asia/Kolkata')),
      interval '1 month')::date as m
  ),
  custs as (
    select date_trunc('month', p.created_at at time zone 'Asia/Kolkata')::date as m
      from public.profiles p join public.user_roles ur on ur.user_id = p.id join public.roles r on r.id = ur.role_id
     where r.key = 'customer'
  )
  select months.m,
         (select count(*) from custs c where c.m = months.m),
         (select count(*) from custs c where c.m <= months.m)
    from months order by months.m;
end $$;

create or replace function public.report_inventory_by_division()
returns table (division_id uuid, name text, variants bigint, units bigint, stock_value numeric, low_stock bigint, out_of_stock bigint)
language plpgsql stable security definer
set search_path = public, pg_temp
as $$
begin
  perform public._require_reports();
  return query
  select d.id, d.short_name, count(v.id), coalesce(sum(inv.quantity), 0)::bigint,
         coalesce(sum(inv.quantity * coalesce(v.price, p.price)), 0)::numeric,
         count(*) filter (where inv.quantity > 0 and inv.quantity <= inv.low_stock_threshold),
         count(*) filter (where inv.quantity = 0)
    from public.business_divisions d
    join public.products p on p.division_id = d.id
    join public.product_variants v on v.product_id = p.id and v.is_active
    join public.inventory inv on inv.variant_id = v.id
   where d.id in (select public._visible_stock_divisions())
   group by d.id, d.short_name, d.sort_order
   order by d.sort_order;
end $$;

do $$
declare f text;
begin
  foreach f in array array[
    'report_overview(int)','report_revenue_series(int)','report_daily_sales(int)','report_division_sales(int)',
    'report_top_products(int,int)','report_order_status()','report_appointment_series(int)',
    'report_service_popularity(int)','report_customer_growth(int)','report_inventory_by_division()'
  ] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;
