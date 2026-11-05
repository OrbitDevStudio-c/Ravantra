"use server";

import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";

const ids = z.array(z.uuid()).max(200);

async function ensureWishlist() {
  const sb = await createServerSupabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return null;
  await sb.from("wishlists").upsert({ user_id: auth.user.id }, { onConflict: "user_id", ignoreDuplicates: true });
  const { data } = await sb.from("wishlists").select("id").eq("user_id", auth.user.id).single();
  return data ? { sb, wishlistId: data.id as string } : null;
}

/** Merge locally-saved items into the account and return the full list. */
export async function syncWishlist(localIds: string[]): Promise<string[] | null> {
  if (!isSupabaseConfigured) return null;
  const parsed = ids.safeParse(localIds);
  if (!parsed.success) return null;
  const ctx = await ensureWishlist();
  if (!ctx) return null;
  if (parsed.data.length) {
    await ctx.sb
      .from("wishlist_items")
      .upsert(parsed.data.map((product_id) => ({ wishlist_id: ctx.wishlistId, product_id })), {
        onConflict: "wishlist_id,product_id",
        ignoreDuplicates: true,
      });
  }
  const { data } = await ctx.sb.from("wishlist_items").select("product_id").eq("wishlist_id", ctx.wishlistId);
  return (data ?? []).map((r) => r.product_id as string);
}

export async function setWishlistItem(productId: string, saved: boolean): Promise<{ ok: boolean }> {
  if (!isSupabaseConfigured) return { ok: false };
  if (!z.uuid().safeParse(productId).success) return { ok: false };
  const ctx = await ensureWishlist();
  if (!ctx) return { ok: false };
  if (saved) {
    const { error } = await ctx.sb
      .from("wishlist_items")
      .upsert({ wishlist_id: ctx.wishlistId, product_id: productId }, { onConflict: "wishlist_id,product_id", ignoreDuplicates: true });
    return { ok: !error };
  }
  const { error } = await ctx.sb.from("wishlist_items").delete().eq("wishlist_id", ctx.wishlistId).eq("product_id", productId);
  return { ok: !error };
}
