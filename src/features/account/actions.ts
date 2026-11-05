"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { addressSchema, fieldErrors, phoneSchema } from "@/lib/validations";
import { friendlyDbError } from "@/lib/utils";
import { getProductsByIds } from "@/features/catalog/queries";
import { toQuickAdd } from "@/components/products/product-card";
import type { ActionResult } from "@/types";

async function authed() {
  if (!isSupabaseConfigured) return null;
  const sb = await createServerSupabase();
  const { data } = await sb.auth.getUser();
  return data.user ? { sb, user: data.user } : null;
}

export async function updateProfile(_: unknown, fd: FormData): Promise<ActionResult> {
  const ctx = await authed();
  if (!ctx) return { ok: false, error: "Please sign in again." };
  const parsed = z
    .object({ fullName: z.string().trim().min(2, "Enter your name").max(120), phone: phoneSchema.optional().or(z.literal("")) })
    .safeParse({ fullName: fd.get("fullName"), phone: fd.get("phone") ?? "" });
  if (!parsed.success) return { ok: false, error: "Please check your details.", fieldErrors: fieldErrors(parsed.error) };
  const { error } = await ctx.sb.from("profiles").update({ full_name: parsed.data.fullName, phone: parsed.data.phone || null }).eq("id", ctx.user.id);
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  await ctx.sb.auth.updateUser({ data: { full_name: parsed.data.fullName, phone: parsed.data.phone || null } });
  revalidatePath("/account", "layout");
  return { ok: true };
}

export async function saveAddress(input: z.input<typeof addressSchema> & { id?: string }): Promise<ActionResult> {
  const ctx = await authed();
  if (!ctx) return { ok: false, error: "Please sign in again." };
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the address.", fieldErrors: fieldErrors(parsed.error) };
  const a = parsed.data;
  const row = {
    user_id: ctx.user.id,
    label: a.label || "Home",
    full_name: a.fullName,
    phone: a.phone,
    line1: a.line1,
    line2: a.line2 || null,
    city: a.city,
    state: a.state,
    postal_code: a.postalCode,
  };
  if (a.isDefault) await ctx.sb.from("addresses").update({ is_default: false }).eq("user_id", ctx.user.id);
  const { count } = await ctx.sb.from("addresses").select("id", { count: "exact", head: true }).eq("user_id", ctx.user.id);
  const isDefault = Boolean(a.isDefault) || !count;
  const res = input.id && z.uuid().safeParse(input.id).success
    ? await ctx.sb.from("addresses").update({ ...row, ...(a.isDefault ? { is_default: true } : {}) }).eq("id", input.id)
    : await ctx.sb.from("addresses").insert({ ...row, is_default: isDefault });
  if (res.error) return { ok: false, error: friendlyDbError(res.error.message) };
  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function deleteAddress(id: string): Promise<ActionResult> {
  const ctx = await authed();
  if (!ctx || !z.uuid().safeParse(id).success) return { ok: false, error: "Invalid address." };
  const { error } = await ctx.sb.from("addresses").delete().eq("id", id);
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function setDefaultAddress(id: string): Promise<ActionResult> {
  const ctx = await authed();
  if (!ctx || !z.uuid().safeParse(id).success) return { ok: false, error: "Invalid address." };
  await ctx.sb.from("addresses").update({ is_default: false }).eq("user_id", ctx.user.id);
  const { error } = await ctx.sb.from("addresses").update({ is_default: true }).eq("id", id);
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  revalidatePath("/account/addresses");
  return { ok: true };
}

/** Product cards for the wishlist page (ids come from the client store). */
export async function getWishlistProducts(ids: string[]) {
  const parsed = z.array(z.uuid()).max(200).safeParse(ids);
  if (!parsed.success) return [];
  const products = await getProductsByIds(parsed.data);
  return products.map((p) => ({ ...toQuickAdd(p), price: p.salePrice ?? p.price, compareAt: p.salePrice ? p.price : null, category: p.category.name }));
}
