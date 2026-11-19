import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { COOKIE, signSession } from "@/lib/session-token";

export async function POST(req: Request) {
  const { username, password } = await req.json().catch(() => ({}));
  const u = username ? await db.user.findUnique({ where: { username: String(username).trim().toLowerCase() } }) : null;
  if (!u || !bcrypt.compareSync(String(password ?? ""), u.passwordHash))
    return Response.json({ error: "Nama pengguna atau kata sandi salah." }, { status: 401 });
  const token = await signSession({ id: u.id, name: u.name, role: u.role, classroomId: u.classroomId });
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 });
  return Response.json({ role: u.role });
}
