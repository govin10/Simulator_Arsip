import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verifySession } from "./lib/session-token";

export async function middleware(req: NextRequest) {
  const user = await verifySession(req.cookies.get(COOKIE)?.value);
  const p = req.nextUrl.pathname;
  if (!user) return NextResponse.redirect(new URL("/login", req.url));
  if (p.startsWith("/guru") && user.role === "STUDENT") return NextResponse.redirect(new URL("/siswa", req.url));
  if (p.startsWith("/siswa") && user.role !== "STUDENT") return NextResponse.redirect(new URL("/guru", req.url));
  return NextResponse.next();
}
export const config = { matcher: ["/siswa/:path*", "/guru/:path*"] };
