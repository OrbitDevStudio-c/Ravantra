/**
 * Centralised environment access.
 * Public values are inlined at build time; secrets are only read on the server.
 */

/**
 * Neon / Postgres connection string (server only — never NEXT_PUBLIC_).
 * `Database_Storage` is accepted as an alias for existing .env files.
 */
export const DATABASE_URL = (typeof window === "undefined" && (process.env.DATABASE_URL ?? process.env.Database_Storage)) || "";

/** True when the app is connected to its Postgres database. Inlined for the client via NEXT_PUBLIC_DATABASE_CONFIGURED. */
export const isDatabaseConfigured =
  typeof window === "undefined" ? Boolean(DATABASE_URL) : process.env.NEXT_PUBLIC_DATABASE_CONFIGURED === "true";

/**
 * Preview mode: no database configured → storefront renders the bundled demo
 * catalogue read-only, and the admin can be previewed with demo data.
 * Disabled automatically once DATABASE_URL is present.
 */
export const isPreviewMode = !isDatabaseConfigured;

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";

/** Server-only helpers (never import from client components) */
export function serverEnv() {
  if (typeof window !== "undefined") throw new Error("serverEnv() called in the browser");
  return {
    razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    emailFrom: process.env.EMAIL_FROM ?? "RAVANTRA <onboarding@resend.dev>",
    /** Allows a clearly-labelled simulated payment when Razorpay keys are absent. */
    demoPayments: (process.env.DEMO_PAYMENTS ?? "true") === "true",
    cronSecret: process.env.CRON_SECRET ?? "",
    /** OpenRouter — powers the admin-only AI assistant */
    openRouterKey: process.env.OPENROUTER_API_KEY ?? "",
    openRouterModel: process.env.OPENROUTER_CHAT_MODEL || "openai/gpt-4o-mini",
    /** First super-admin account, created/updated by `npm run db:setup` */
    adminEmail: process.env.ADMIN_EMAIL ?? "",
    adminPassword: process.env.ADMIN_PASSWORD ?? "",
  };
}

export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "919000000000";
