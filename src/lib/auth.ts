import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, verifySession, type SessionUser } from "./session-token";
import { db } from "./db";

export async function getUser(): Promise<SessionUser | null> {
  const c = await cookies();
  return verifySession(c.get(COOKIE)?.value);
}
export async function requireUser(roles?: SessionUser["role"][]) {
  const u = await getUser();
  if (!u) redirect("/login");
  if (roles && !roles.includes(u.role)) redirect("/");
  return u;
}
export const isStaff = (u: SessionUser) => u.role === "TEACHER" || u.role === "ADMIN";

/** Kelas yang boleh dilihat: guru hanya kelasnya, admin semua. */
export async function visibleClassIds(u: SessionUser) {
  const rows = await db.classroom.findMany({ where: u.role === "ADMIN" ? {} : { teacherId: u.id }, select: { id: true } });
  return rows.map((r) => r.id);
}

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function apiUser(roles?: SessionUser["role"][]) {
  const u = await getUser();
  if (!u) throw new HttpError(401, "Silakan masuk terlebih dahulu.");
  if (roles && !roles.includes(u.role)) throw new HttpError(403, "Akses ditolak.");
  return u;
}
export function apiHandler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
      console.error(e);
      return Response.json({ error: "Terjadi kesalahan di server." }, { status: 500 });
    }
  };
}
