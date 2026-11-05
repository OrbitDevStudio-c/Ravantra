import "server-only";
import { serverEnv, SITE_URL } from "@/lib/env";
import { formatDateTime, formatINR } from "@/lib/utils";

/**
 * Transactional email through Resend's REST API (no SDK).
 * Without RESEND_API_KEY, emails are skipped and logged — never fatal.
 */
export async function sendEmail(input: { to: string; subject: string; html: string }) {
  const { resendApiKey, emailFrom } = serverEnv();
  if (!resendApiKey) {
    console.info(`[email skipped — RESEND_API_KEY not set] ${input.subject} → ${input.to}`);
    return { skipped: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: emailFrom, to: [input.to], subject: input.subject, html: input.html }),
      cache: "no-store",
    });
    if (!res.ok) console.error("[email] Resend error", res.status, await res.text());
    return { skipped: false, ok: res.ok };
  } catch (e) {
    console.error("[email] failed", e);
    return { skipped: false, ok: false };
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#F8F5EF;font-family:Helvetica,Arial,sans-serif;color:#211B20">
  <table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:40px 16px">
  <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;max-width:560px">
  <tr><td style="padding:32px 40px;border-bottom:1px solid #E8DCCB;text-align:center;font-family:Georgia,serif;font-size:26px;letter-spacing:8px">RAVANTRA</td></tr>
  <tr><td style="padding:36px 40px"><h1 style="font-family:Georgia,serif;font-weight:400;font-size:28px;margin:0 0 16px">${esc(title)}</h1>${body}</td></tr>
  <tr><td style="padding:20px 40px;background:#211B20;color:#E8DCCB;font-size:11px;text-align:center">RAVANTRA demo platform · Designed &amp; developed by OrbitDevStudio</td></tr>
  </table></td></tr></table></body></html>`;
}

export function orderConfirmationEmail(o: { orderNumber: string; customerName: string; total: number; items: { name: string; qty: number; price: number }[] }) {
  const rows = o.items
    .map((i) => `<tr><td style="padding:8px 0;font-size:14px">${esc(i.name)} × ${i.qty}</td><td style="text-align:right;font-size:14px">${formatINR(i.price * i.qty)}</td></tr>`)
    .join("");
  return layout(
    `Thank you, ${o.customerName.split(" ")[0]}`,
    `<p style="font-size:14px;line-height:1.6">Your order <strong>${esc(o.orderNumber)}</strong> is confirmed. We'll let you know as soon as it ships.</p>
     <table width="100%" style="margin:24px 0;border-top:1px solid #E8DCCB;border-bottom:1px solid #E8DCCB">${rows}
     <tr><td style="padding:12px 0;font-weight:bold">Total</td><td style="text-align:right;font-weight:bold">${formatINR(o.total)}</td></tr></table>
     <a href="${SITE_URL}/account/orders" style="display:inline-block;background:#211B20;color:#F8F5EF;padding:14px 24px;text-decoration:none;font-size:12px;letter-spacing:2px">TRACK YOUR ORDER</a>`,
  );
}

export function appointmentEmail(a: { reference: string; customerName: string; service: string; stylist: string; startsAt: string; status: string }) {
  return layout(
    a.status === "cancelled" ? "Your appointment was cancelled" : "Your appointment request",
    `<p style="font-size:14px;line-height:1.6">Hi ${esc(a.customerName.split(" ")[0])}, here are your booking details.</p>
     <table style="margin:20px 0;font-size:14px;line-height:1.9">
       <tr><td style="color:#8A7462;padding-right:24px">Reference</td><td>${esc(a.reference)}</td></tr>
       <tr><td style="color:#8A7462">Service</td><td>${esc(a.service)}</td></tr>
       <tr><td style="color:#8A7462">Specialist</td><td>${esc(a.stylist)}</td></tr>
       <tr><td style="color:#8A7462">When</td><td>${esc(formatDateTime(a.startsAt))} IST</td></tr>
       <tr><td style="color:#8A7462">Status</td><td style="text-transform:capitalize">${esc(a.status)}</td></tr>
     </table>
     <a href="${SITE_URL}/account/appointments" style="display:inline-block;background:#211B20;color:#F8F5EF;padding:14px 24px;text-decoration:none;font-size:12px;letter-spacing:2px">MANAGE BOOKING</a>`,
  );
}
