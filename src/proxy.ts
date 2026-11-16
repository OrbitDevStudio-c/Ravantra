import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "rv_session";

/**
 * Cheap "signed in?" gate for private areas: redirects visitors without a
 * session cookie to the right login page. It never trusts the cookie —
 * real authentication happens server-side (session lookup) and in Postgres RLS.
 */
export function proxy(request: NextRequest) {
  const dbConfigured = process.env.NEXT_PUBLIC_DATABASE_CONFIGURED === "true";
  if (!dbConfigured) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const needsUser =
    pathname.startsWith("/account") || pathname.startsWith("/checkout") ||
    (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login"));

  if (needsUser && !request.cookies.get(SESSION_COOKIE)?.value) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.startsWith("/admin") ? "/admin/login" : "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/checkout/:path*", "/admin/:path*"],
};
