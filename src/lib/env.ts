/**
 * Centralised environment access.
 * Public values are inlined at build time; secrets are only read on the server.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

/** True when the app is connected to a Supabase project. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Preview mode: no Supabase configured → storefront renders the bundled demo
 * catalogue read-only, and the admin can be previewed with demo data.
 * Disabled automatically once Supabase env vars are present.
 */
export const isPreviewMode = !isSupabaseConfigured;

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";

/** Server-only helpers (never import from client components) */
export function serverEnv() {
  if (typeof window !== "undefined") throw new Error("serverEnv() called in the browser");
  return {
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? "",
    razorpayKeyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
    razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
    razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
    resendApiKey: process.env.RESEND_API_KEY ?? "",
    emailFrom: process.env.EMAIL_FROM ?? "RAVANTRA <onboarding@resend.dev>",
    /** Allows a clearly-labelled simulated payment when Razorpay keys are absent. */
    demoPayments: (process.env.DEMO_PAYMENTS ?? "true") === "true",
    cronSecret: process.env.CRON_SECRET ?? "",
  };
}

export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "919000000000";
