# RAVANTRA — Multi-Business E-Commerce & Lifestyle Platform

> *Everything that makes you, you.*
> A premium women's lifestyle platform — **Fashion · Beauty & Care · Salon & Spa · Lifestyle** — with one customer account, one cart and one central admin.
> Designed & developed by **OrbitDevStudio**.

RAVANTRA is a fictional brand. All products, people, reviews, orders and appointments in the demo data are illustrative and flagged `is_demo`.

---

## Highlights

| Area | What's included |
| --- | --- |
| **Storefront** | Editorial homepage, per-division pages (any new division added in the admin gets a page automatically), filters (category, size, colour, price, availability), sorting, instant search (`/` or `Ctrl+K`), product pages with a variant matrix, galleries, reviews, JSON-LD, wishlist, quick add |
| **Cart & checkout** | localStorage bag for guests, server-side re-pricing (`quote_cart`), coupons, free-shipping threshold, saved addresses, **Razorpay** with HMAC signature verification + server fetch of the payment + webhook backup. Prices are never trusted from the client |
| **Salon & Spa** | Service menu, expert profiles, 6-step booking wizard, live availability (IST), blocked slots, working hours, **database-level double-booking protection** (`EXCLUDE USING gist`), cancel/reschedule, `.ics` export, WhatsApp share |
| **Customer account** | Profile, password, addresses, order history and tracking timeline, retry payment, cancel unpaid orders, appointments, wishlist synced across devices |
| **Central admin `/admin`** | KPI dashboard and charts from live data, divisions (create, manage, assign managers), products and variants and images (Supabase Storage), categories, inventory with movement ledger, orders (fulfilment workflow, cancel and refund), appointments, services, stylists and hours, customers, marketing (campaigns, coupons, featured items, newsletter CSV), reports, staff and roles |
| **Security** | Supabase Auth, **role-based access enforced in Postgres RLS** and re-checked in server actions, security-definer functions for every money/stock change, service-role key used only after verification, Zod validation everywhere, secure headers |
| **Performance** | Server Components by default, ISR on catalogue pages, demo images resized by Unsplash's CDN (AVIF/WebP), `next/image` optimiser for uploads, self-hosted fonts, Recharts loaded only in the admin, CSS-only animations except the booking wizard (Motion `LazyMotion`) |

## Tech stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 · shadcn-style primitives on Radix · Motion · React Hook Form · Zod · date-fns · Recharts · Supabase (Postgres, Auth, Storage) · Razorpay · Resend · Vercel.

---

## 1. Run it locally (zero setup)

```bash
npm install
npm run dev          # http://localhost:3000
```

With no environment variables set, the app starts in **preview mode**: the storefront and the admin (`/admin`) render the bundled demo dataset in read-only mode. Accounts, checkout and bookings switch on once Supabase is connected.

Requires Node.js ≥ 20.9.

## 2. Connect Supabase (about 5 minutes)

1. Create a project at [supabase.com](https://supabase.com). The free tier is fine; choose the **Mumbai (ap-south-1)** region for the lowest latency.
2. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Settings → API)
   - `SUPABASE_SERVICE_ROLE_KEY` (Settings → API, **server only**)
3. Create the database. Pick one option:
   - **SQL Editor:** run each file in `supabase/migrations/` **in filename order**, then run `supabase/seed.sql`.
   - **Supabase CLI:**
     ```bash
     npx supabase login
     npx supabase init          # creates supabase/config.toml (keeps existing migrations)
     npx supabase link --project-ref <your-ref>
     npx supabase db push --include-seed
     ```
4. Authentication → URL Configuration:
   - **Site URL:** `http://localhost:3000` (your production URL later)
   - **Redirect URLs:** `http://localhost:3000/auth/callback` and `https://<your-domain>/auth/callback`
5. *(Optional, for demos)* Authentication → Providers → Email → turn off **Confirm email**, so new sign-ups can log in immediately.
6. Restart `npm run dev`.

### Demo accounts (created by `seed.sql`)

Password for every account: **`Ravantra@123`**

| Role | Email | Can access |
| --- | --- | --- |
| Super Admin | `superadmin@ravantra.test` | Everything |
| Fashion Manager | `fashion@ravantra.test` | Fashion products, inventory, orders, reports |
| Beauty Manager | `beauty@ravantra.test` | Beauty products, inventory, orders, reports |
| Salon Manager | `salon@ravantra.test` | Services, stylists, appointments, salon reports |
| Lifestyle Manager | `lifestyle@ravantra.test` | Lifestyle products, inventory, orders |
| Inventory Manager | `inventory@ravantra.test` | Inventory across all divisions |
| Order Manager | `orders@ravantra.test` | Order processing and fulfilment, customers |
| Customer | `ananya@ravantra.test` (+ 9 more) | Storefront account with order and booking history |

Staff sign in at **`/admin/login`**; customers sign in at `/login`.

## 3. Payments — Razorpay

1. In the Razorpay Dashboard (Test Mode), go to Account & Settings → API Keys → generate keys.
2. Set `NEXT_PUBLIC_RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
3. Webhooks → add `https://<your-domain>/api/payments/razorpay/webhook` with the events `payment.captured` and `payment.failed`, then set `RAZORPAY_WEBHOOK_SECRET`.
4. Set `DEMO_PAYMENTS=false` once real keys are configured.

**Payment flow:**
1. `place_order()` locks stock rows, prices every line from the database, applies the coupon, reserves inventory and creates a `pending` payment, all in one transaction.
2. The server creates the Razorpay order and the browser opens Razorpay Checkout.
3. `verifyRazorpayPayment` checks the HMAC signature, confirms the Razorpay order belongs to our order, then **fetches the payment from Razorpay** to confirm the status and the exact amount.
4. Only then does the service role call `payment_mark_successful()` (idempotent).
5. The webhook does the same if the browser closes before verification.

Unpaid orders release their stock after 60 minutes (`expire_stale_orders`, run daily by Vercel Cron and on demand).

Without Razorpay keys and with `DEMO_PAYMENTS=true`, checkout completes with a **clearly-labelled simulated payment** (`provider = demo`).

Refunds: Admin → Orders → *Cancel & refund*. This checks permissions, calls the Razorpay refund API, then marks the order refunded and returns stock if it hadn't shipped.

## 4. Email & WhatsApp (optional)

- **Resend:** set `RESEND_API_KEY` and `EMAIL_FROM` (a verified domain sender). Order confirmations, appointment requests and status changes are sent. Without a key, emails are skipped and logged, never fatal.
- **WhatsApp:** `NEXT_PUBLIC_WHATSAPP_NUMBER` powers the click-to-chat links on the contact page and the booking confirmation.

## 5. Deploy to Vercel (single project)

This repository is **one Next.js app at the repo root**. Import it as-is.

1. Push to GitHub → [vercel.com/new](https://vercel.com/new) → import the repo. Framework preset: **Next.js**. Root directory: `/`.
2. Add every variable from `.env.example` under **Settings → Environment Variables**, and set `NEXT_PUBLIC_SITE_URL=https://<your-domain>`.
3. Deploy. `vercel.json` sets the Mumbai region (`bom1`) and the daily cron (`/api/cron/expire-orders`, authorised by `CRON_SECRET`).
4. Add the production URL to Supabase **Site URL** and **Redirect URLs** (step 2.4 above) and to the Razorpay webhook.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm run lint` | ESLint |
| `npm run db:seed:generate` | Regenerate `supabase/seed.sql` from `src/config/demo-data.ts` |
| `npm run db:verify` | Apply all migrations and the seed to an in-memory Postgres (PGlite), then run 44 checks: RLS isolation, division-scoped managers, atomic ordering, overselling protection, payment idempotency, refunds, booking conflicts, working hours, reports |
| `npm run check` | typecheck + lint + db:verify |

## Project structure

```
src/
  app/
    (store)/              customer site — home, [division], products, salon-spa,
                          services, cart, checkout, account, about, contact, auth pages
    admin/                login + (panel)/ dashboard, divisions, products, inventory,
                          orders, appointments, services, stylists, customers,
                          marketing, reports, staff
    api/                  search, Razorpay webhook, cron
    auth/callback/        Supabase email-link handler
    sitemap.ts · robots.ts · opengraph-image.tsx
  components/             ui · layout · home · products · cart · booking · account · admin · dashboard
  features/               business logic per module (catalog, orders, appointments, salon,
                          account, wishlist, cart, admin, analytics, …) — queries + server actions
  lib/                    supabase clients, auth/permissions, payments (Razorpay), email,
                          validations, utils, env
  config/                 brand + demo dataset (single source of truth for the seed)
  types/                  domain types
  proxy.ts                session refresh + private-area gate (Next 16 “proxy”)
supabase/
  migrations/             schema · security (RLS) · functions · reports · storage
  seed.sql                generated demo data
scripts/                  seed generator + PGlite verification suite
```

### Adding a new business division
Admin → Divisions → **New division**. The division gets its own page at `/<slug>`, appears in navigation, mega-menu, sitemap, filters and reports, and a scoped `<slug>_manager` role is created automatically. No code changes or rebuild needed.

## Security model

- Every table has **Row Level Security**. Permissions come from `roles → role_permissions → permissions`; a role can be scoped to a division (`roles.division_id`), and `has_permission(perm, division)` mirrors this in SQL.
- Money and stock change only inside `SECURITY DEFINER` functions (`place_order`, `adjust_stock`, `payment_*`, `book_appointment`, …). A trigger blocks direct `UPDATE`s to stock quantities.
- Payment state transitions are executable **only by the service role**, and only after server-side verification.
- `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_KEY_SECRET` and other secrets are never sent to the browser.
- Uploads: Storage bucket `media` (public read, staff write) with MIME and 5 MB limits enforced by the bucket and the server.

## Known limitations

- Product edits in the admin are several RLS-checked writes rather than a single transaction (orders, stock and bookings *are* transactional).
- Supabase's free-tier email sender is rate-limited. Use custom SMTP or Resend for real volumes.
- Demo imagery is served from Unsplash. Replace it with your own photography via the admin uploads.

---

© RAVANTRA (fictional demo brand). Designed & developed by **OrbitDevStudio**.
