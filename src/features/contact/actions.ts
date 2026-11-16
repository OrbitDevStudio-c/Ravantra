"use server";

import { z } from "zod";
import { sendEmail } from "@/lib/email";
import { BRAND } from "@/config/site";
import { fieldErrors } from "@/lib/validations";
import type { ActionResult } from "@/types";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(120),
  email: z.email("Enter a valid email"),
  topic: z.enum(["Order", "Salon & Spa", "Product question", "Partnerships", "Other"]),
  message: z.string().trim().min(10, "Tell us a little more").max(2000),
  website: z.string().max(0).optional(), // honeypot
});

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function sendContactMessage(_: unknown, fd: FormData): Promise<ActionResult> {
  const parsed = schema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { ok: false, error: "Please check the form.", fieldErrors: fieldErrors(parsed.error) };
  const m = parsed.data;
  await sendEmail({
    to: BRAND.contact.email,
    subject: `[Contact] ${m.topic} — ${m.name}`,
    html: `<p><strong>${esc(m.name)}</strong> (${esc(m.email)}) wrote about <em>${esc(m.topic)}</em>:</p><p>${esc(m.message).replace(/\n/g, "<br>")}</p>`,
  });
  return { ok: true };
}
