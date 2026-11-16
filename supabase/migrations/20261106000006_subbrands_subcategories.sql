-- =====================================================================
-- RAVANTRA — sub-brands, sub-categories, division collections, best sellers
-- Additive only: existing divisions, categories and products keep working.
-- =====================================================================

-- Sub-brand shown on a division's storefront (e.g. "AUREYA" for Fashion)
alter table public.business_divisions
  add column if not exists sub_brand text check (sub_brand is null or char_length(sub_brand) between 2 and 40);

-- Two-level category tree (e.g. Ethnic Wear → Sarees)
alter table public.categories
  add column if not exists parent_id uuid references public.categories(id) on delete set null;
create index if not exists categories_parent_idx on public.categories (parent_id);

-- A category's parent must belong to the same division and be top-level
create or replace function public.validate_category_parent()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare p public.categories;
begin
  if new.parent_id is null then return new; end if;
  if new.parent_id = new.id then raise exception 'INVALID_PARENT' using errcode = '22023'; end if;
  select * into p from public.categories where id = new.parent_id;
  if p.id is null or p.division_id <> new.division_id or p.parent_id is not null then
    raise exception 'INVALID_PARENT' using errcode = '22023';
  end if;
  if exists (select 1 from public.categories c where c.parent_id = new.id) then
    raise exception 'INVALID_PARENT' using errcode = '22023';
  end if;
  return new;
end $$;
drop trigger if exists categories_parent_check on public.categories;
create trigger categories_parent_check before insert or update of parent_id, division_id on public.categories
  for each row execute function public.validate_category_parent();

-- New promotion placements for division landing pages
alter type public.promotion_placement add value if not exists 'division_collection';
alter type public.promotion_placement add value if not exists 'division_editorial';

-- Best sellers by units sold (aggregate only — no customer data exposed)
create or replace function public.best_selling_products(p_division uuid default null, p_days int default 120, p_limit int default 8)
returns table (product_id uuid, units bigint)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select oi.product_id, sum(oi.quantity)::bigint as units
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    join public.products p on p.id = oi.product_id and p.is_active
   where o.payment_status = 'successful'
     and o.status not in ('cancelled', 'refunded')
     and o.created_at >= now() - make_interval(days => greatest(p_days, 1))
     and (p_division is null or oi.division_id = p_division)
   group by oi.product_id
   order by units desc
   limit least(greatest(p_limit, 1), 24);
$$;
grant execute on function public.best_selling_products(uuid, int, int) to anon, authenticated;
