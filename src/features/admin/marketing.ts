import "server-only";
import * as demo from "@/config/demo-data";
import { isPreviewMode } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { mapPromotion } from "@/features/catalog/mappers";
import type { Coupon, Promotion } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function listPromotions(): Promise<Promotion[]> {
  if (isPreviewMode) return demo.promotions;
  const sb = await createServerSupabase();
  const { data, error } = await sb
    .from("promotions")
    .select("id, eyebrow, title, subtitle, cta_label, cta_href, image, placement, division_id, starts_at, ends_at, is_active, sort_order")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapPromotion);
}

export async function listCoupons(): Promise<Coupon[]> {
  if (isPreviewMode) return demo.coupons;
  const sb = await createServerSupabase();
  const { data, error } = await sb.from("coupons").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((c: any) => ({
    id: c.id,
    code: c.code,
    description: c.description,
    discountType: c.discount_type,
    discountValue: Number(c.discount_value),
    minSubtotal: Number(c.min_subtotal),
    maxDiscount: c.max_discount == null ? null : Number(c.max_discount),
    divisionId: c.division_id,
    startsAt: c.starts_at,
    endsAt: c.ends_at,
    usageLimit: c.usage_limit,
    usedCount: c.used_count,
    isActive: c.is_active,
  }));
}

export interface Subscriber {
  id: string;
  email: string;
  source: string;
  isActive: boolean;
  isDemo: boolean;
  createdAt: string;
}

export async function listSubscribers(): Promise<Subscriber[]> {
  if (isPreviewMode) {
    return demo.newsletterDemo.map((email, i) => ({ id: `n${i}`, email, source: "demo", isActive: true, isDemo: true, createdAt: new Date(Date.now() - (30 - i * 9) * 86400000).toISOString() }));
  }
  const sb = await createServerSupabase();
  const { data, error } = await sb.from("newsletter_subscribers").select("id, email, source, is_active, is_demo, created_at").order("created_at", { ascending: false }).limit(5000);
  if (error) throw new Error(error.message);
  return (data ?? []).map((s: any) => ({ id: s.id, email: s.email, source: s.source, isActive: s.is_active, isDemo: s.is_demo, createdAt: s.created_at }));
}
