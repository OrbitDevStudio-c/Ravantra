import { z } from "zod";
import { getAccess } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { serverEnv, SITE_URL } from "@/lib/env";
import { buildBusinessContext } from "@/features/assistant/context";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(20),
});

/** Simple per-user limiter (per server instance): 20 questions / 10 minutes. */
const hits = new Map<string, number[]>();
function rateLimited(userId: string) {
  const now = Date.now();
  const recent = (hits.get(userId) ?? []).filter((t) => now - t < 10 * 60_000);
  if (recent.length >= 20) return true;
  recent.push(now);
  hits.set(userId, recent);
  return false;
}

const SYSTEM = `You are the RAVANTRA business assistant, used by staff in the central admin of a multi-division Indian lifestyle brand (Fashion "AUREYA", Beauty & Care, Salon & Spa, Lifestyle).

Rules:
- Answer ONLY from the JSON business snapshot provided. If the data doesn't contain the answer, say so plainly and suggest which admin page to check.
- Never invent figures. Currency is INR — format like ₹1,24,500 (Indian grouping). Round sensibly.
- Be concise and executive: lead with the answer, then 2–5 short bullets. Use **bold** for key numbers. No tables unless asked.
- When comparing periods, give the change in absolute and % terms.
- Flag anything needing action (pending orders, low stock, cancellations) with a clear recommendation.
- Orders marked "demo": true are seeded demo data — mention this if the user asks about real performance.
- You cannot change data. For actions, point to the relevant admin page (Orders, Inventory, Appointments, Products, Marketing, Reports).`;

export async function POST(req: Request) {
  const access = await getAccess();
  if (!access?.isStaff) return Response.json({ error: "Please sign in with a staff account." }, { status: 401 });
  if (access.preview) return Response.json({ error: "The assistant needs the live database." }, { status: 403 });
  if (!can(access, "dashboard.view")) return Response.json({ error: "Your role can't use the assistant." }, { status: 403 });

  const { openRouterKey, openRouterModel } = serverEnv();
  if (!openRouterKey) return Response.json({ error: "AI is not configured. Add OPENROUTER_API_KEY to the environment." }, { status: 503 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  if (rateLimited(access.userId)) return Response.json({ error: "You're asking quickly — please wait a few minutes." }, { status: 429 });

  const snapshot = await buildBusinessContext(access);

  const upstream = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openRouterKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": SITE_URL,
      "X-Title": "RAVANTRA Admin",
    },
    body: JSON.stringify({
      model: openRouterModel,
      stream: true,
      temperature: 0.2,
      max_tokens: 900,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "system", content: `Business snapshot (JSON):\n${JSON.stringify(snapshot)}` },
        ...parsed.data.messages.slice(-10),
      ],
    }),
    signal: req.signal,
  }).catch((e: Error) => e);

  if (upstream instanceof Error || !upstream.ok || !upstream.body) {
    const detail = upstream instanceof Error ? upstream.message : `${upstream.status} ${await upstream.text().catch(() => "")}`;
    console.error("[assistant] OpenRouter error", detail.slice(0, 500));
    return Response.json({ error: "The AI service didn't respond. Please try again." }, { status: 502 });
  }

  // Convert OpenRouter's SSE stream into a plain text stream of content deltas.
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  const stream = upstream.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (!t.startsWith("data:")) continue;
          const data = t.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const delta = JSON.parse(data)?.choices?.[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          } catch {
            // ignore keep-alive comments / partial frames
          }
        }
      },
    }),
  );

  return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
