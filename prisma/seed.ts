/* Data awal: akun admin & guru, dua kelas, satu tugas contoh, satu akun siswa contoh.
 * Dengan --if-empty (dipakai saat build Vercel) seed dilewati bila database sudah berisi akun. */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  if (process.argv.includes("--if-empty") && (await db.user.count()) > 0) {
    console.log("Database sudah berisi data; seed dilewati.");
    return;
  }
  await db.$transaction([db.submission.deleteMany(), db.assignment.deleteMany(), db.user.deleteMany(), db.classroom.deleteMany()]);
  const hash = (p: string) => bcrypt.hashSync(p, 10);
  await db.user.create({ data: { username: "admin", name: "Admin Sekolah", role: "ADMIN", passwordHash: hash("admin123") } });
  const guru = await db.user.create({ data: { username: "guru", name: "Guru Kearsipan", role: "TEACHER", passwordHash: hash("guru123") } });
  const k1 = await db.classroom.create({ data: { name: "XI MP 1", teacherId: guru.id } });
  await db.classroom.create({ data: { name: "XI MP 2", teacherId: guru.id } });
  await db.user.create({ data: { username: "siswa01", name: "Siswa Contoh", role: "STUDENT", classroomId: k1.id, passwordHash: hash("siswa123") } });
  await db.assignment.create({
    data: {
      title: "Tugas 1 – Sistem penyimpanan abjad", classroomId: k1.id, createdById: guru.id, maxScore: 100,
      description: "Kerjakan soal pada lembar yang dibagikan guru. Tulis nama dan kelas di setiap halaman, lalu pindai semua halaman menjadi satu file PDF.",
      dueAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
    },
  });
  console.log("Seed selesai.");
}
main().finally(() => db.$disconnect());
