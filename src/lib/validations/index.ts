import { z } from "zod";

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9 ]{10,15}$/, "Enter a valid phone number");

export const addressSchema = z.object({
  fullName: z.string().trim().min(2, "Enter the recipient's name").max(120),
  phone: phoneSchema,
  line1: z.string().trim().min(3, "Enter the street address").max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(2, "Enter the city").max(80),
  state: z.string().trim().min(2, "Select a state").max(80),
  postalCode: z.string().trim().regex(/^[1-9][0-9]{5}$/, "Enter a 6-digit PIN code"),
  label: z.string().trim().max(30).optional(),
  isDefault: z.boolean().optional(),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const cartLinesSchema = z
  .array(z.object({ variantId: z.uuid(), quantity: z.number().int().min(1).max(10) }))
  .min(1, "Your bag is empty")
  .max(30);

export const checkoutSchema = z.object({
  lines: cartLinesSchema,
  address: addressSchema,
  coupon: z.string().trim().max(24).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  saveAddress: z.boolean().optional(),
});

export const signInSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .regex(/[A-Za-z]/, "Include a letter")
  .regex(/[0-9]/, "Include a number");

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name").max(120),
  email: z.email("Enter a valid email"),
  phone: phoneSchema.optional().or(z.literal("")),
  password: passwordSchema,
});

export const bookingSchema = z.object({
  serviceId: z.uuid(),
  stylistId: z.uuid(),
  startsAt: z.iso.datetime(),
  name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.email("Enter a valid email"),
  phone: phoneSchema,
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

export function fieldErrors(error: z.ZodError) {
  return z.flattenError(error).fieldErrors as Record<string, string[] | undefined>;
}
