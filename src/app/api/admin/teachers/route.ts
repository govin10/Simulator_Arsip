import bcrypt from "bcryptjs";
import { apiHandler, apiUser, HttpError } from "@/lib/auth";
import { db } from "@/lib/db";
import { genPassword } from "@/lib/passwords";

export const POST = apiHandler(async (req: Request) => {
  await apiUser(["ADMIN"]);
  const b = await req.json();
  const username = String(b.username ?? "").trim().toLowerCase();
  const name = String(b.name ?? "").trim();
  if (!username || !name) throw new HttpError(400, "Nama dan username wajib diisi.");
  if (await db.user.findUnique({ where: { username } })) throw new HttpError(400, "Username sudah dipakai.");
  const password = String(b.password ?? "").trim() || genPassword();
  await db.user.create({ data: { username, name, role: b.role === "ADMIN" ? "ADMIN" : "TEACHER", passwordHash: bcrypt.hashSync(password, 10) } });
  return Response.json({ username, password });
});
