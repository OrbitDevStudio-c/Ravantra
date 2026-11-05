"use server";

import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/utils";
import type { ActionResult } from "@/types";

const schema = z.object({ email: z.email().max(254), source: z.string().max(40).default("website") });

export async function subscribeNewsletter(input: { email: string; source?: string }): Promise<ActionResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please enter a valid email address." };
  if (!isSupabaseConfigured) return { ok: true }; // preview mode: accept without storing
  const sb = await createServerSupabase();
  const { error } = await sb.rpc("subscribe_newsletter", { p_email: parsed.data.email, p_source: parsed.data.source });
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  return { ok: true };
}
