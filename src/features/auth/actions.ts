"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { z } from "zod";
import { isSupabaseConfigured, SITE_URL } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { fieldErrors, passwordSchema, signInSchema, signUpSchema } from "@/lib/validations";
import type { ActionResult } from "@/types";

const NOT_CONFIGURED: ActionResult = {
  ok: false,
  error: "Accounts are disabled in preview mode. Add your Supabase keys to .env.local to enable sign-in.",
};

/** Only allow same-site relative redirects. */
function safeNext(next: unknown, fallback: string) {
  const s = typeof next === "string" ? next : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : fallback;
}

async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : SITE_URL;
}

export async function signIn(_: unknown, formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const parsed = signInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { ok: false, error: "Please check your details.", fieldErrors: fieldErrors(parsed.error) };

  const sb = await createServerSupabase();
  const { error } = await sb.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: error.message === "Invalid login credentials" ? "That email and password don't match." : error.message };

  redirect(safeNext(formData.get("next"), formData.get("area") === "admin" ? "/admin" : "/account"));
}

export async function signUp(_: unknown, formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, error: "Please check your details.", fieldErrors: fieldErrors(parsed.error) };

  const sb = await createServerSupabase();
  const { data, error } = await sb.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName, phone: parsed.data.phone || null },
      emailRedirectTo: `${await origin()}/auth/callback?next=/account`,
    },
  });
  if (error) return { ok: false, error: error.message };
  if (!data.session) {
    return { ok: true }; // email confirmation required
  }
  redirect(safeNext(formData.get("next"), "/account"));
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const sb = await createServerSupabase();
    await sb.auth.signOut();
  }
  redirect("/");
}

export async function requestPasswordReset(_: unknown, formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const email = z.email().safeParse(formData.get("email"));
  if (!email.success) return { ok: false, error: "Enter a valid email address." };
  const sb = await createServerSupabase();
  await sb.auth.resetPasswordForEmail(email.data, { redirectTo: `${await origin()}/auth/callback?next=/account/profile?reset=1` });
  // Always succeed to avoid account enumeration
  return { ok: true };
}

export async function updatePassword(_: unknown, formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured) return NOT_CONFIGURED;
  const password = passwordSchema.safeParse(formData.get("password"));
  if (!password.success) return { ok: false, error: password.error.issues[0]?.message ?? "Invalid password" };
  if (formData.get("password") !== formData.get("confirm")) return { ok: false, error: "Passwords don't match." };
  const sb = await createServerSupabase();
  const { error } = await sb.auth.updateUser({ password: password.data });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
