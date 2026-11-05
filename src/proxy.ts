import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "@/lib/env";

/**
 * Refreshes the Supabase auth session cookie and performs a cheap
 * "signed in?" gate for private areas. Real authorization happens in
 * server components/actions and in Postgres RLS — never only here.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;
  const needsUser =
    pathname.startsWith("/account") || pathname.startsWith("/checkout") ||
    (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login"));

  if (needsUser && !user) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.startsWith("/admin") ? "/admin/login" : "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/account/:path*", "/checkout/:path*", "/admin/:path*", "/login", "/register", "/auth/:path*"],
};
