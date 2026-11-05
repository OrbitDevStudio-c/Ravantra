"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/utils";
import type { ActionResult } from "@/types";

const schema = z.object({
  productId: z.uuid(),
  slug: z.string().max(120),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().min(2, "Add a short title").max(120),
  body: z.string().trim().min(20, "Tell us a little more (20+ characters)").max(2000),
});

export async function submitReview(_: unknown, fd: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured) return { ok: false, error: "Reviews are disabled in preview mode." };
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check your review." };

  const sb = await createServerSupabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return { ok: false, error: "Please sign in to write a review." };
  const { data: profile } = await sb.from("profiles").select("full_name").eq("id", auth.user.id).single();
  const name = (profile?.full_name || "RAVANTRA client").trim();
  const author = name.split(" ").length > 1 ? `${name.split(" ")[0]} ${name.split(" ").at(-1)![0]}.` : name;

  const { error } = await sb.from("reviews").insert({
    product_id: parsed.data.productId,
    user_id: auth.user.id,
    author_name: author,
    rating: parsed.data.rating,
    title: parsed.data.title,
    body: parsed.data.body,
  });
  if (error) {
    if (error.message.includes("reviews_one_per_user")) return { ok: false, error: "You've already reviewed this product." };
    return { ok: false, error: friendlyDbError(error.message) };
  }
  revalidatePath(`/products/${parsed.data.slug}`);
  return { ok: true };
}
