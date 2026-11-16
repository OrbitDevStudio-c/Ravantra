import { NextResponse, type NextRequest } from "next/server";
import { listProducts } from "@/features/catalog/queries";
import { productFromPrice } from "@/features/catalog/pricing";

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 60).trim();
  if (q.length < 2) return NextResponse.json({ hits: [] });
  const { products } = await listProducts({ q });
  const hits = products.slice(0, 6).map((p) => ({
    slug: p.slug,
    name: p.name,
    division: p.division.shortName,
    price: productFromPrice(p).price,
    image: p.images[0]?.url ?? "",
  }));
  return NextResponse.json({ hits }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
}
