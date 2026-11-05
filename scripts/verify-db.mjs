/**
 * Offline database verification using PGlite (real PostgreSQL in WASM).
 * Applies every migration + seed.sql against a stubbed Supabase auth/storage
 * schema, then exercises RLS, ordering, inventory, booking and reports.
 *
 * Run: npm run db:verify
 */
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const db = new PGlite({ extensions: { pgcrypto, btree_gist } });

let passed = 0;
let failed = 0;
const ok = (name) => { passed++; console.log(`  ✓ ${name}`); };
const bad = (name, err) => { failed++; console.log(`  ✗ ${name}\n      ${err}`); };

async function check(name, fn) {
  try { await fn(); ok(name); } catch (e) { bad(name, e?.message ?? e); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
async function expectError(fn, pattern) {
  try { await fn(); } catch (e) {
    if (pattern && !String(e.message).includes(pattern)) throw new Error(`expected "${pattern}", got "${e.message}"`);
    return;
  }
  throw new Error(`expected error ${pattern ?? ""}`);
}

async function as(uid, fn, role = "authenticated") {
  await db.exec(`set role ${role}; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false);`);
  try { return await fn(); } finally {
    await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`);
  }
}
const q = (sql, params) => db.query(sql, params);

console.log("\n▸ Bootstrapping Supabase stubs");
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create schema extensions;
  create extension pgcrypto schema extensions;
  create table auth.users (
    instance_id uuid, id uuid primary key, aud text, role text, email text, encrypted_password text,
    email_confirmed_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb,
    created_at timestamptz, updated_at timestamptz, confirmation_token text, email_change text,
    email_change_token_new text, recovery_token text
  );
  create table auth.identities (
    id uuid, user_id uuid references auth.users on delete cascade, provider_id text, identity_data jsonb,
    provider text, last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz,
    primary key (provider_id, provider)
  );
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant usage on schema extensions to anon, authenticated, service_role;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text);
  alter table storage.objects enable row level security;
`);

console.log("▸ Applying migrations");
const migDir = join(root, "supabase", "migrations");
for (const f of readdirSync(migDir).filter((x) => x.endsWith(".sql")).sort()) {
  try {
    await db.exec(readFileSync(join(migDir, f), "utf8"));
    ok(f);
  } catch (e) {
    bad(f, e.message);
    process.exit(1);
  }
}

console.log("▸ Loading seed.sql");
try {
  await db.exec(readFileSync(join(root, "supabase", "seed.sql"), "utf8"));
  ok("seed.sql");
} catch (e) {
  bad("seed.sql", e.message);
  process.exit(1);
}

const ID = {
  super: "00000011-0000-4000-8000-000000000001",
  fashionMgr: "00000011-0000-4000-8000-000000000002",
  beautyMgr: "00000011-0000-4000-8000-000000000003",
  salonMgr: "00000011-0000-4000-8000-000000000004",
  inventoryMgr: "00000011-0000-4000-8000-000000000006",
  orderMgr: "00000011-0000-4000-8000-000000000007",
  custA: "0000000b-0000-4000-8000-000000000001",
  custB: "0000000b-0000-4000-8000-000000000002",
};
const FASHION = "00000001-0000-4000-8000-000000000001";
const BEAUTY = "00000001-0000-4000-8000-000000000002";

console.log("\n▸ Seed integrity");
await check("row counts", async () => {
  const r = await q(`select
    (select count(*) from business_divisions)::int d, (select count(*) from products)::int p,
    (select count(*) from product_variants)::int v, (select count(*) from inventory)::int i,
    (select count(*) from services)::int s, (select count(*) from stylists)::int st,
    (select count(*) from orders)::int o, (select count(*) from appointments)::int a,
    (select count(*) from profiles)::int pr, (select count(*) from reviews)::int rv`);
  const c = r.rows[0];
  console.log("      ", JSON.stringify(c));
  assert(c.d === 4 && c.p >= 20 && c.s >= 6 && c.st >= 3 && c.o > 0 && c.a > 0, "unexpected counts");
  assert(c.v === c.i, "every variant must have an inventory row");
});
await check("ratings aggregated by trigger", async () => {
  const r = await q(`select rating_count, rating_avg from products where slug = 'aurelia-silk-wrap-midi-dress'`);
  assert(r.rows[0].rating_count === 2, "expected 2 reviews");
});

console.log("\n▸ Row Level Security");
await check("anon sees active catalogue", async () => {
  const r = await as(null, () => q(`select count(*)::int n from products`), "anon");
  assert(r.rows[0].n >= 20, "anon cannot read products");
});
await check("anon cannot read orders, coupons, profiles, appointments", async () => {
  const r = await as(null, () => q(`select (select count(*) from orders)::int o, (select count(*) from coupons)::int c, (select count(*) from profiles)::int p, (select count(*) from appointments)::int a`), "anon");
  const c = r.rows[0];
  assert(c.o === 0 && c.c === 0 && c.p === 0 && c.a === 0, JSON.stringify(c));
});
await check("customer sees only own orders", async () => {
  const own = await q(`select count(*)::int n from orders where user_id = $1`, [ID.custA]);
  const r = await as(ID.custA, () => q(`select count(*)::int n, count(*) filter (where user_id <> $1)::int other from orders`, [ID.custA]));
  assert(r.rows[0].n === own.rows[0].n && r.rows[0].other === 0, JSON.stringify(r.rows[0]));
});
await check("customer cannot insert orders directly", async () => {
  await expectError(() => as(ID.custA, () => q(`insert into orders (user_id, customer_name, customer_email, subtotal, total, shipping_address) values ($1,'x','x',0,0,'{}')`, [ID.custA])), "row-level security");
});
await check("customer cannot escalate own role", async () => {
  const superRole = (await q(`select id from roles where key='super_admin'`)).rows[0].id;
  await expectError(() => as(ID.custA, () => q(`insert into user_roles (user_id, role_id) values ($1, $2)`, [ID.custA, superRole])), "row-level security");
  const r = await as(ID.custA, () => q(`select count(*)::int n from roles`));
  assert(r.rows[0].n === 0, "customer can list roles");
});
await check("fashion manager sees only orders containing fashion items", async () => {
  const r = await as(ID.fashionMgr, () => q(`select count(*)::int n from orders o where not exists (select 1 from order_items oi where oi.order_id = o.id and oi.division_id = $1)`, [FASHION]));
  assert(r.rows[0].n === 0, `saw ${r.rows[0].n} non-fashion orders`);
});
await check("fashion manager cannot edit beauty products", async () => {
  const r = await as(ID.fashionMgr, () => q(`update products set name = name || ' x' where division_id = $1 returning id`, [BEAUTY]));
  assert(r.rows.length === 0, "updated beauty product!");
  const r2 = await as(ID.fashionMgr, () => q(`update products set is_featured = is_featured where division_id = $1 returning id`, [FASHION]));
  assert(r2.rows.length > 0, "could not edit own division");
});
await check("salon manager cannot see product orders", async () => {
  const r = await as(ID.salonMgr, () => q(`select count(*)::int n from orders`));
  assert(r.rows[0].n === 0, `saw ${r.rows[0].n}`);
});
await check("direct inventory quantity update is blocked", async () => {
  await expectError(() => as(ID.super, () => q(`update inventory set quantity = 999 where true`)), "adjust_stock");
});

console.log("\n▸ Inventory");
const fashionVariant = (await q(`select v.id from product_variants v join products p on p.id=v.product_id join inventory i on i.variant_id=v.id where p.division_id=$1 and i.quantity > 5 order by v.sku limit 1`, [FASHION])).rows[0].id;
const beautyVariant = (await q(`select v.id from product_variants v join products p on p.id=v.product_id join inventory i on i.variant_id=v.id where p.division_id=$1 and i.quantity > 5 order by v.sku limit 1`, [BEAUTY])).rows[0].id;
await check("fashion manager can restock fashion", async () => {
  const before = (await q(`select quantity from inventory where variant_id=$1`, [fashionVariant])).rows[0].quantity;
  const r = await as(ID.fashionMgr, () => q(`select adjust_stock($1, 5, 'restock', 'test') as q`, [fashionVariant]));
  assert(r.rows[0].q === before + 5, "quantity mismatch");
  const m = await q(`select count(*)::int n from inventory_movements where variant_id=$1 and reason='restock'`, [fashionVariant]);
  assert(m.rows[0].n === 1, "movement not logged");
});
await check("fashion manager cannot adjust beauty stock", async () => {
  await expectError(() => as(ID.fashionMgr, () => q(`select adjust_stock($1, 5, 'restock')`, [beautyVariant])), "FORBIDDEN");
});
await check("inventory manager can adjust any division", async () => {
  await as(ID.inventoryMgr, () => q(`select adjust_stock($1, -1, 'damage', 'test')`, [beautyVariant]));
});
await check("stock can't go negative", async () => {
  await expectError(() => as(ID.super, () => q(`select adjust_stock($1, -100000, 'adjustment')`, [beautyVariant])));
});

console.log("\n▸ Cart & orders");
await check("quote_cart prices from DB + coupon", async () => {
  const items = JSON.stringify([{ variant_id: fashionVariant, quantity: 2 }]);
  const r = await as(null, () => q(`select quote_cart($1::jsonb, 'welcome10') as q`, [items]), "anon");
  const qd = r.rows[0].q;
  assert(Number(qd.subtotal) > 0 && Number(qd.discount) > 0 && qd.coupon_code === "WELCOME10", JSON.stringify(qd));
  assert(Number(qd.total) === Number(qd.subtotal) - Number(qd.discount) + Number(qd.shipping), "total mismatch");
});
const address = JSON.stringify({ full_name: "Ananya Sharma", phone: "+91 98200 11001", line1: "12 Carter Road", city: "Mumbai", state: "Maharashtra", postal_code: "400050" });
let placedOrder;
await check("place_order reserves stock atomically", async () => {
  const before = (await q(`select quantity from inventory where variant_id=$1`, [fashionVariant])).rows[0].quantity;
  const items = JSON.stringify([{ variant_id: fashionVariant, quantity: 2 }]);
  const r = await as(ID.custA, () => q(`select place_order($1::jsonb, $2::jsonb, 'WELCOME10') as o`, [items, address]));
  placedOrder = r.rows[0].o;
  const after = (await q(`select quantity from inventory where variant_id=$1`, [fashionVariant])).rows[0].quantity;
  assert(after === before - 2, `stock ${before} -> ${after}`);
  const o = (await q(`select status, payment_status, total, discount_total from orders where id=$1`, [placedOrder.order_id])).rows[0];
  assert(o.status === "pending" && o.payment_status === "pending" && Number(o.discount_total) > 0, JSON.stringify(o));
});
await check("place_order rejects overselling", async () => {
  const items = JSON.stringify([{ variant_id: fashionVariant, quantity: 10 }, { variant_id: beautyVariant, quantity: 10 }]);
  // quantities are capped at 10/line; force oversell via low-stock variant
  const low = (await q(`select variant_id from inventory where quantity between 1 and 3 order by variant_id limit 1`)).rows[0].variant_id;
  await expectError(() => as(ID.custA, () => q(`select place_order($1::jsonb, $2::jsonb)`, [JSON.stringify([{ variant_id: low, quantity: 9 }]), address])), "INSUFFICIENT_STOCK");
  void items;
});
await check("place_order requires auth", async () => {
  await expectError(() => as(null, () => q(`select place_order('[]'::jsonb, '{}'::jsonb)`), "anon"));
});
await check("customer cannot mark own payment successful", async () => {
  await expectError(() => as(ID.custA, () => q(`select payment_mark_successful($1, 'pay_x')`, [placedOrder.order_id])), "permission denied");
});
await check("service role verifies payment → confirmed", async () => {
  await as(null, () => q(`select payment_mark_successful($1, 'pay_test_1', 'card', '{}'::jsonb)`, [placedOrder.order_id]), "service_role");
  const o = (await q(`select status, payment_status from orders where id=$1`, [placedOrder.order_id])).rows[0];
  assert(o.status === "confirmed" && o.payment_status === "successful", JSON.stringify(o));
});
await check("payment confirmation is idempotent", async () => {
  const r = await as(null, () => q(`select payment_mark_successful($1, 'pay_test_1') as changed`, [placedOrder.order_id]), "service_role");
  assert(r.rows[0].changed === false, "should be no-op");
});
await check("order manager advances fulfilment; invalid jump rejected", async () => {
  await as(ID.orderMgr, () => q(`select admin_update_order_status($1, 'processing')`, [placedOrder.order_id]));
  await expectError(() => as(ID.orderMgr, () => q(`select admin_update_order_status($1, 'delivered')`, [placedOrder.order_id])), "INVALID_TRANSITION");
  await expectError(() => as(ID.orderMgr, () => q(`select admin_update_order_status($1, 'cancelled')`, [placedOrder.order_id])), "REFUND_REQUIRED");
});
await check("beauty manager cannot manage a fashion order", async () => {
  await expectError(() => as(ID.beautyMgr, () => q(`select admin_update_order_status($1, 'shipped')`, [placedOrder.order_id])), "FORBIDDEN");
});
await check("refund releases stock before dispatch", async () => {
  const before = (await q(`select quantity from inventory where variant_id=$1`, [fashionVariant])).rows[0].quantity;
  await as(null, () => q(`select payment_mark_refunded($1, 100, $2, 'test')`, [placedOrder.order_id, ID.super]), "service_role");
  const after = (await q(`select quantity from inventory where variant_id=$1`, [fashionVariant])).rows[0].quantity;
  const o = (await q(`select status, payment_status from orders where id=$1`, [placedOrder.order_id])).rows[0];
  assert(o.status === "refunded" && after === before + 2, `${JSON.stringify(o)} ${before}->${after}`);
});
await check("customer cancels unpaid order → stock returned", async () => {
  const items = JSON.stringify([{ variant_id: beautyVariant, quantity: 1 }]);
  const before = (await q(`select quantity from inventory where variant_id=$1`, [beautyVariant])).rows[0].quantity;
  const r = await as(ID.custB, () => q(`select place_order($1::jsonb, $2::jsonb) as o`, [items, address]));
  await as(ID.custB, () => q(`select cancel_my_order($1)`, [r.rows[0].o.order_id]));
  const after = (await q(`select quantity from inventory where variant_id=$1`, [beautyVariant])).rows[0].quantity;
  assert(after === before, `${before}->${after}`);
});

console.log("\n▸ Salon booking");
const meera = "00000007-0000-4000-8000-000000000001";
const cut = "00000006-0000-4000-8000-000000000001";
const ananyaFacialStylist = "00000007-0000-4000-8000-000000000002";
// next Tuesday 12:00 IST, at least 3 days out — Meera works Tue
const slot = (await q(`select ((((now() at time zone 'Asia/Kolkata')::date + ((9 - extract(dow from (now() at time zone 'Asia/Kolkata'))::int) % 7 + 1) - 1 + 7) + time '12:00') at time zone 'Asia/Kolkata') as t`)).rows[0].t;
await check("guest books a valid slot", async () => {
  const r = await as(null, () => q(`select book_appointment($1, $2, $3, 'Guest Tester', 'guest@example.com', '+91 9000000000') as b`, [cut, meera, slot]), "anon");
  assert(r.rows[0].b.reference.startsWith("APT-"), "no reference");
});
await check("overlapping booking rejected", async () => {
  const later = new Date(new Date(slot).getTime() + 30 * 60000).toISOString();
  await expectError(() => as(ID.custA, () => q(`select book_appointment($1, $2, $3, 'Asha Test', 'a@example.com', '+91 9000000001')`, [cut, meera, later])), "SLOT_TAKEN");
});
await check("outside working hours rejected", async () => {
  const late = new Date(new Date(slot).getTime() + 8 * 3600000).toISOString(); // 20:00 IST
  await expectError(() => as(ID.custA, () => q(`select book_appointment($1, $2, $3, 'Asha Test', 'a@example.com', '+91 9000000001')`, [cut, meera, late])), "OUTSIDE_WORKING_HOURS");
});
await check("stylist must offer the service", async () => {
  await expectError(() => as(ID.custA, () => q(`select book_appointment($1, $2, $3, 'Asha Test', 'a@example.com', '+91 9000000001')`, [cut, ananyaFacialStylist, slot])), "STYLIST_DOES_NOT_OFFER_SERVICE");
});
await check("busy ranges hide customer identity", async () => {
  const r = await as(null, () => q(`select * from stylist_busy_ranges($1, now(), now() + interval '30 days')`, [meera]), "anon");
  assert(r.rows.length >= 1 && Object.keys(r.rows[0]).length === 2, "unexpected shape");
});
await check("customer reschedules & cancels own appointment", async () => {
  const s2 = new Date(new Date(slot).getTime() + 3 * 3600000).toISOString(); // 15:00
  const r = await as(ID.custA, () => q(`select book_appointment($1, $2, $3, 'Ananya', 'ananya@ravantra.test', '+91 98200 11001') as b`, [cut, meera, s2]));
  const id = r.rows[0].b.appointment_id;
  const s3 = new Date(new Date(slot).getTime() + 5 * 3600000).toISOString(); // 17:00
  await as(ID.custA, () => q(`select reschedule_my_appointment($1, $2)`, [id, s3]));
  await as(ID.custA, () => q(`select cancel_my_appointment($1, 'test')`, [id]));
  await expectError(() => as(ID.custB, () => q(`select cancel_my_appointment($1)`, [id])), "NOT_FOUND");
});
await check("salon manager confirms; fashion manager cannot", async () => {
  const id = (await q(`select id from appointments where status='pending' and starts_at > now() order by starts_at limit 1`)).rows[0].id;
  await as(ID.salonMgr, () => q(`select admin_update_appointment($1, 'confirmed')`, [id]));
  await expectError(() => as(ID.fashionMgr, () => q(`select admin_update_appointment($1, 'cancelled')`, [id])), "FORBIDDEN");
});

console.log("\n▸ Reports");
await check("super admin overview", async () => {
  const r = await as(ID.super, () => q(`select report_overview(30) as o`));
  const o = r.rows[0].o;
  console.log("      ", JSON.stringify({ revenue: o.revenue, orders: o.orders, customers: o.customers, low: o.low_stock, appts: o.appointments_upcoming }));
  assert(o.can_see_sales && o.can_see_salon && Number(o.revenue_all_time) > 0, "no data");
});
await check("division sales scoped for fashion manager", async () => {
  const r = await as(ID.fashionMgr, () => q(`select * from report_division_sales(365)`));
  assert(r.rows.length === 1 && r.rows[0].name === "Fashion", JSON.stringify(r.rows));
});
await check("series functions return full ranges", async () => {
  const r = await as(ID.super, () => q(`select (select count(*) from report_revenue_series(6))::int a, (select count(*) from report_daily_sales(30))::int b, (select count(*) from report_appointment_series(6))::int c, (select count(*) from report_customer_growth(6))::int d, (select count(*) from report_top_products(90, 5))::int e, (select count(*) from report_inventory_by_division())::int f`));
  const c = r.rows[0];
  assert(c.a === 6 && c.b === 30 && c.c === 6 && c.d === 6 && c.e > 0 && c.f === 3, JSON.stringify(c));
});
await check("customers cannot run reports", async () => {
  await expectError(() => as(ID.custA, () => q(`select report_overview(30)`)), "FORBIDDEN");
});
await check("newsletter subscribe is idempotent", async () => {
  await as(null, () => q(`select subscribe_newsletter('Test@Example.com')`), "anon");
  await as(null, () => q(`select subscribe_newsletter('test@example.com')`), "anon");
  const r = await q(`select count(*)::int n from newsletter_subscribers where lower(email)='test@example.com'`);
  assert(r.rows[0].n === 1, "duplicate");
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
