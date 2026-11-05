import { z } from "zod";

/** Shared by the client form (React Hook Form) and the server action. Numbers are strings in the form. */
const money = z.string().trim().regex(/^\d+(\.\d{1,2})?$/, "Enter an amount");
const optMoney = z.string().trim().regex(/^(\d+(\.\d{1,2})?)?$/, "Enter an amount").optional().or(z.literal(""));
const slug = z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes");

export const productFormSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().trim().min(2, "Name is required").max(160),
    slug,
    divisionId: z.uuid("Choose a division"),
    categoryId: z.uuid("Choose a category"),
    sku: z.string().trim().min(3, "SKU is required").max(40).regex(/^[A-Za-z0-9-]+$/, "Letters, numbers and dashes"),
    price: money,
    salePrice: optMoney,
    shortDescription: z.string().trim().max(240),
    description: z.string().trim().max(5000),
    ingredients: z.string().trim().max(3000),
    highlights: z.string().max(2000),
    tags: z.string().max(500),
    isFeatured: z.boolean(),
    isNew: z.boolean(),
    isActive: z.boolean(),
    images: z
      .array(z.object({ id: z.string().optional(), url: z.url("Enter an image URL").max(1000), alt: z.string().max(160) }))
      .max(12),
    variants: z
      .array(
        z.object({
          id: z.string().optional(),
          sku: z.string().trim().min(3, "SKU required").max(48).regex(/^[A-Za-z0-9-]+$/, "Letters, numbers, dashes"),
          size: z.string().trim().max(40),
          color: z.string().trim().max(40),
          colorHex: z.string().trim().regex(/^(#[0-9A-Fa-f]{6})?$/, "Use #RRGGBB").optional().or(z.literal("")),
          volume: z.string().trim().max(40),
          price: optMoney,
          salePrice: optMoney,
          isActive: z.boolean(),
          openingStock: z.string().trim().regex(/^\d{0,5}$/, "Whole number").optional().or(z.literal("")),
        }),
      )
      .min(1, "Add at least one variant")
      .max(40),
  })
  .superRefine((v, ctx) => {
    if (v.salePrice && Number(v.salePrice) >= Number(v.price)) {
      ctx.addIssue({ code: "custom", path: ["salePrice"], message: "Sale price must be lower than the price" });
    }
    const skus = new Set<string>();
    v.variants.forEach((vr, i) => {
      if (skus.has(vr.sku.toUpperCase())) ctx.addIssue({ code: "custom", path: ["variants", i, "sku"], message: "Duplicate SKU" });
      skus.add(vr.sku.toUpperCase());
    });
  });

export type ProductFormValues = z.infer<typeof productFormSchema>;

export function variantDisplayName(v: { color?: string; size?: string; volume?: string }) {
  return [v.color, v.size, v.volume].filter((x) => x && x.trim()).join(" / ") || "Standard";
}
