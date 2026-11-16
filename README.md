# RAVANTRA — Multi-Business E-Commerce & Lifestyle Platform

> *Everything that makes you, you.*
> A premium women's lifestyle platform — **Fashion · Beauty & Care · Salon & Spa · Lifestyle** — with one customer account, one cart and one central admin.
> Designed & developed by **OrbitDevStudio**.

<p align="center"><img src="public/brand/logo-full.png" alt="RAVANTRA logo" width="320"></p>

RAVANTRA is a fictional brand. All products, people, reviews, orders and appointments in the demo data are illustrative and flagged `is_demo`.

---

## Highlights

| Area | What's included |
| --- | --- |
| **Storefront** | Editorial homepage, per-division pages (any new division added in the admin gets a page automatically), filters (category, size, colour, price, availability), sorting, instant search (`/` or `Ctrl+K`), product pages with a variant matrix, galleries, reviews, JSON-LD, wishlist, quick add |
| **Cart & checkout** | localStorage bag for guests, server-side re-pricing (`quote_cart`), coupons, free-shipping threshold, saved addresses, **Razorpay** with HMAC signature verification + server fetch of the payment + webhook backup. Prices are never trusted from the client |
| **Salon & Spa** | Service menu, expert profiles, 6-step booking wizard, live availability (IST), blocked slots, working hours, **database-level double-booking protection** (`EXCLUDE USING gist`), cancel/reschedule, `.ics` export, WhatsApp share |
| **Customer account** | Profile, password, addresses, order history and tracking timeline, retry payment, cancel unpaid orders, appointments, wishlist synced across devices |
| **Central admin `/admin`** | KPI dashboard and charts from live data, divisions (create, manage, assign managers), products and variants and images (uploads stored in Postgres), **AI assistant** (OpenRouter) that summarises and answers questions about live, role-scoped data, categories, inventory with movement ledger, orders (fulfilment workflow, cancel and refund), appointments, services, stylists and hours, customers, marketing (campaigns, coupons, featured items, newsletter CSV), reports, staff and roles |
| **Security** | First-party auth (bcrypt passwords, hashed httpOnly sessions), **role-based access enforced in Postgres RLS** and re-checked in server actions, security-definer functions for every money/stock change, privileged service context used only after verification, Zod validation everywhere, secure headers |
| **Performance** | Server Components by default, ISR on catalogue pages, demo images resized by Unsplash's CDN (AVIF/WebP), `next/image` optimiser for uploads, self-hosted fonts, Recharts loaded only in the admin, CSS-only animations except the booking wizard (Motion `LazyMotion`) |

## Tech stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 · shadcn-style primitives on Radix · Motion · React Hook Form · Zod · date-fns · Recharts · Neon Postgres · OpenRouter (admin AI) · Razorpay · Resend · Vercel.

---

## 1. Run it locally (zero setup)

```bash
npm install
npm run dev          # http://localhost:3000
```

With no environment variables set, the app starts in **preview mode**: the storefront and the admin (`/admin`) render the bundled demo dataset in read-only mode. Accounts, checkout, bookings, the live admin and the AI assistant switch on once the database is connected.

Requires Node.js ≥ 20.9.

## 2. Connect the database — Neon (about 5 minutes)

1. Create a project at [neon.tech](https://neon.tech) (the free tier is fine; pick a region close to your users, e.g. Singapore / Mumbai) and copy the **pooled** connection string.
2. Copy `.env.example` to `.env` (or `.env.local`) and set:
   - `DATABASE_URL` — the Neon connection string (**server only**)
   - `ADMIN_EMAIL` and `ADMIN_PASSWORD` — your first super admin
   - `OPENROUTER_API_KEY` (and optionally `OPENROUTER_CHAT_MODEL`) — enables the admin AI assistant
3. Create the database:
   ```bash
   npm run db:setup
   ```
   This applies `supabase/migrations/` in order (tracked, so re-running only applies new ones), seeds the demo catalogue once, and creates/updates the super admin with a **bcrypt-hashed** password. Run `npm run db:setup -- --admin-only` to just reset the admin password from `.env`.
4. Restart `npm run dev`, then sign in at `/admin/login` (or `/login` — staff accounts are taken straight to the admin).

How it works: the app talks to Neon server-side only. A small PostgREST-compatible layer (`src/lib/db`) runs each request in a transaction as `anon` or `authenticated` with `auth.uid()` set, so every Row Level Security policy in `supabase/migrations` is enforced by Postgres exactly as written.

### Demo content

`seed.sql` adds a demo catalogue, customers, orders, reviews and appointments (all flagged `is_demo`). The seeded demo staff and customer accounts (`*@ravantra.test`) exist only to own that history — **their logins are disabled** on setup. Create real staff from Admin → Staff & roles after signing in as the super admin.

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
4. Run `npm run db:setup` once against the production database (with `ADMIN_EMAIL` / `ADMIN_PASSWORD` set), and add the production URL to the Razorpay webhook.

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
    api/                  search, Razorpay webhook, cron, auth/me, admin/assistant (AI)
    auth/callback/        password-reset link handler
    media/                serves admin-uploaded images from Postgres
    sitemap.ts · robots.ts · opengraph-image.tsx
  components/             ui · layout · home · products · cart · booking · account · admin · dashboard
  features/               business logic per module (catalog, orders, appointments, salon,
                          account, wishlist, cart, admin, analytics, …) — queries + server actions
  lib/                    db (Neon pool + PostgREST-compatible client), auth (sessions, permissions), payments (Razorpay), email,
                          validations, utils, env
  config/                 brand + demo dataset (single source of truth for the seed)
  types/                  domain types
  proxy.ts                private-area gate (Next 16 “proxy”)
supabase/
  migrations/             schema · security (RLS) · functions · reports · (storage → Postgres media table)
  seed.sql                generated demo data
scripts/                  db-setup (Neon), seed generator, PGlite verification suite
```

### Adding a new business division
Admin → Divisions → **New division**. The division gets its own page at `/<slug>`, appears in navigation, mega-menu, sitemap, filters and reports, and a scoped `<slug>_manager` role is created automatically. No code changes or rebuild needed.

## Security model

- Every table has **Row Level Security**. Permissions come from `roles → role_permissions → permissions`; a role can be scoped to a division (`roles.division_id`), and `has_permission(perm, division)` mirrors this in SQL.
- Money and stock change only inside `SECURITY DEFINER` functions (`place_order`, `adjust_stock`, `payment_*`, `book_appointment`, …). A trigger blocks direct `UPDATE`s to stock quantities.
- Payment state transitions run **only in the privileged server context**, and only after server-side verification.
- Passwords are bcrypt-hashed (pgcrypto); sessions are random 256-bit tokens in httpOnly cookies, stored only as SHA-256 hashes. Password-reset links are single-use and expire after one hour.
- `DATABASE_URL`, `OPENROUTER_API_KEY`, `RAZORPAY_KEY_SECRET` and other secrets are never sent to the browser. The AI assistant only receives data the signed-in staff member's role can see, and never customer emails or phone numbers.
- Uploads: stored in `public.media` (no client access; written via a server-only function after a permission check), served from `/media/…`, with MIME, magic-byte and 5 MB checks.

## Known limitations

- Product edits in the admin are several RLS-checked writes rather than a single transaction (orders, stock and bookings *are* transactional).
- Password-reset emails need `RESEND_API_KEY`; without it they are logged and skipped.
- The AI assistant's rate limit is per server instance (in memory).
- Demo imagery is served from Unsplash. Replace it with your own photography via the admin uploads.

---

© RAVANTRA (fictional demo brand). Designed & developed by **OrbitDevStudio**.
