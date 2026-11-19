import bcrypt from "bcryptjs";
import { apiHandler, apiUser, HttpError } from "@/lib/auth";
import { db } from "@/lib/db";

// Pengguna mengganti kata sandinya sendiri
export const POST = apiHandler(async (req: Request) => {
  const u = await apiUser();
  const { oldPassword, newPassword } = await req.json();
  const me = await db.user.findUnique({ where: { id: u.id } });
  if (!me || !bcrypt.compareSync(String(oldPassword ?? ""), me.passwordHash)) throw new HttpError(400, "Kata sandi lama salah.");
  const pw = String(newPassword ?? "");
  if (pw.length < 6) throw new HttpError(400, "Kata sandi baru minimal 6 karakter.");
  if (pw === oldPassword) throw new HttpError(400, "Kata sandi baru harus berbeda dari yang lama.");
  await db.user.update({ where: { id: me.id }, data: { passwordHash: bcrypt.hashSync(pw, 10) } });
  return Response.json({ ok: true });
});
