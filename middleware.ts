import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  getSitePassword,
  isValidSiteAuthToken,
  SITE_AUTH_COOKIE,
} from "@/lib/site-auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public: login UI + auth action route + static assets
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/icon.svg" ||
    pathname === "/logo.svg"
  ) {
    return NextResponse.next();
  }

  const password = getSitePassword();
  // No password configured → leave site open (misconfig), but log once via header for debug
  if (!password) {
    if (process.env.NODE_ENV === "production") {
      // Fail closed in production if env missing
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "config");
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(SITE_AUTH_COOKIE)?.value;
  const ok = await isValidSiteAuthToken(token);
  if (ok) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  const nextPath = `${pathname}${request.nextUrl.search}`;
  if (nextPath && nextPath !== "/") {
    url.searchParams.set("next", nextPath);
  }
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Match all paths except Next internals already handled above;
     * keep matcher broad so API/RSC are also gated.
     */
    "/((?!_next/static|_next/image).*)",
  ],
};
