import { SignJWT, jwtVerify } from "jose";

export type SessionUser = { id: string; name: string; role: "STUDENT" | "TEACHER" | "ADMIN"; classroomId: string | null };
export const COOKIE = "arsip_session";
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-ganti-di-produksi-minimal-32-karakter");

export async function signSession(u: SessionUser) {
  return new SignJWT(u as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
}
export async function verifySession(token?: string): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}
