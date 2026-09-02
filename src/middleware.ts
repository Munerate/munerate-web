import { NextResponse, type NextRequest } from "next/server";
import { PREFIXES } from "@/lib/prefixes";

/**
 * Host-based subdomain routing (docs/SUBDOMAINS.md, activated for tele):
 * tele.munerate.com/x → /tele/x. Locally, tele.localhost:3000 works in
 * Chrome with zero setup. Unknown prefixes and the bare domain fall
 * through to the root landing untouched.
 */
export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const label = host.split(".")[0]?.toLowerCase() ?? "";
  if ((PREFIXES as readonly string[]).includes(label)) {
    const url = req.nextUrl.clone();
    if (!url.pathname.startsWith(`/${label}`)) {
      url.pathname = `/${label}${url.pathname === "/" ? "" : url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  // Skip Next internals, API routes and files with extensions.
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
