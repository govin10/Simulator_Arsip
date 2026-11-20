import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { COOKIE, signSession } from "@/lib/session-token";
import { normalizeClassName } from "@/lib/tugas";

// Pendaftaran akun siswa. Kelas dibuat otomatis bila belum ada.
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  const name = String(b.name ?? "").trim().replace(/\s+/g, " ");
  const username = String(b.username ?? "").trim().toLowerCase();
  const password = String(b.password ?? "");
  const className = normalizeClassName(String(b.className ?? ""));
  const err = (m: string) => Response.json({ error: m }, { status: 400 });
  if (name.length < 3) return err("Nama lengkap minimal 3 huruf.");
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) return err("Username 3–30 karakter: huruf kecil, angka, titik, garis bawah, atau tanda minus (tanpa spasi).");
  if (password.length < 6) return err("Kata sandi minimal 6 karakter.");
  if (className.length < 2 || className.length > 40) return err("Isi nama kelas, misalnya XI MP 1.");
  if (await db.user.findUnique({ where: { username } })) return err("Username sudah dipakai. Pilih username lain.");
  const classroom = await db.classroom.upsert({ where: { name: className }, update: {}, create: { name: className } });
  const u = await db.user.create({ data: { name, username, role: "STUDENT", classroomId: classroom.id, passwordHash: bcrypt.hashSync(password, 10) } });
  const token = await signSession({ id: u.id, name: u.name, role: u.role, classroomId: u.classroomId });
  (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 12 });
  return Response.json({ ok: true });
}
