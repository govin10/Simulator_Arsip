import bcrypt from "bcryptjs";
import Papa from "papaparse";
import { apiHandler, apiUser, HttpError, visibleClassIds } from "@/lib/auth";
import { db } from "@/lib/db";
import { genPassword } from "@/lib/passwords";

/** Impor daftar siswa dari CSV: kolom nama, username, (password), (kelas). */
export const POST = apiHandler(async (req: Request) => {
  const u = await apiUser(["TEACHER", "ADMIN"]);
  const b = await req.json();
  const allowed = await visibleClassIds(u);
  const classes = await db.classroom.findMany({ where: { id: { in: allowed } } });
  const parsed = Papa.parse<Record<string, string>>(String(b.csv ?? "").trim(), { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim().toLowerCase() });
  if (!parsed.data.length) throw new HttpError(400, "CSV kosong. Baris pertama harus berisi judul kolom: nama,username,password,kelas");
  const out: { nama: string; username: string; password: string; kelas: string; status: string }[] = [];
  for (const row of parsed.data) {
    const nama = (row.nama ?? row.name ?? "").trim();
    const username = (row.username ?? row.nis ?? "").trim().toLowerCase();
    const kelasName = (row.kelas ?? "").trim();
    const cls = kelasName ? classes.find((c) => c.name.toLowerCase() === kelasName.toLowerCase()) : classes.find((c) => c.id === b.classroomId);
    if (!nama || !username) { out.push({ nama, username, password: "", kelas: kelasName, status: "dilewati: nama/username kosong" }); continue; }
    if (!cls) { out.push({ nama, username, password: "", kelas: kelasName, status: "dilewati: kelas tidak ditemukan" }); continue; }
    const existing = await db.user.findUnique({ where: { username } });
    if (existing && existing.role !== "STUDENT") { out.push({ nama, username, password: "", kelas: cls.name, status: "dilewati: username dipakai akun guru" }); continue; }
    const password = (row.password ?? "").trim() || (existing ? "" : genPassword());
    if (existing) {
      await db.user.update({ where: { id: existing.id }, data: { name: nama, classroomId: cls.id, ...(password ? { passwordHash: bcrypt.hashSync(password, 10) } : {}) } });
      out.push({ nama, username, password, kelas: cls.name, status: "diperbarui" });
    } else {
      await db.user.create({ data: { name: nama, username, role: "STUDENT", classroomId: cls.id, passwordHash: bcrypt.hashSync(password, 10) } });
      out.push({ nama, username, password, kelas: cls.name, status: "dibuat" });
    }
  }
  return Response.json({ results: out });
});
