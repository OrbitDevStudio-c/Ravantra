"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { guarded, must, revalidateCatalog } from "./shared";

const adjustSchema = z.object({
  variantId: z.uuid(),
  change: z.number().int().min(-10000).max(10000).refine((n) => n !== 0, "Enter a non-zero quantity"),
  reason: z.enum(["restock", "adjustment", "damage", "return"]),
  note: z.string().trim().max(280).optional(),
});

/** Stock changes go through the adjust_stock() RPC: locks the row, prevents negatives, logs a movement. */
export async function adjustStock(input: z.input<typeof adjustSchema>) {
  return guarded("inventory.manage", async ({ sb }) => {
    const v = adjustSchema.parse(input);
    const qty = must(await sb.rpc("adjust_stock", { p_variant: v.variantId, p_change: v.change, p_reason: v.reason, p_note: v.note || null }));
    revalidatePath("/admin/inventory");
    revalidateCatalog();
    return qty as number;
  });
}

export async function setThreshold(variantId: string, threshold: number) {
  return guarded("inventory.manage", async ({ sb }) => {
    const id = z.uuid().parse(variantId);
    const t = z.number().int().min(0).max(1000).parse(threshold);
    const rows = must(await sb.from("inventory").update({ low_stock_threshold: t }).eq("variant_id", id).select("id"));
    if (!rows.length) throw new Error("FORBIDDEN");
    revalidatePath("/admin/inventory");
  });
}
