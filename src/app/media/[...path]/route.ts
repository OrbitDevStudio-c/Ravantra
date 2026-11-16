import { isDatabaseConfigured } from "@/lib/env";
import { withContext } from "@/lib/db/pool";

const SAFE = /^[a-z0-9_-]+\/\d{4}-\d{2}\/[0-9a-f-]{36}\.(jpg|png|webp|avif)$/;

/** Serves admin-uploaded images stored in Postgres. Paths are content-addressed by UUID, so they cache forever. */
export async function GET(_req: Request, { params }: RouteContext<"/media/[...path]">) {
  const path = (await params).path.join("/");
  if (!isDatabaseConfigured || !SAFE.test(path)) return new Response("Not found", { status: 404 });
  const row = await withContext({ role: "service" }, async (c) =>
    (await c.query<{ content_type: string; bytes: Buffer }>("select content_type, bytes from public.media where path = $1", [path])).rows[0],
  );
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(row.bytes), {
    headers: {
      "Content-Type": row.content_type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
