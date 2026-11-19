import AppShell from "@/components/AppShell";
import ClassManager from "@/components/teacher/ClassManager";
import { requireUser, visibleClassIds } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function ClassesPage() {
  const user = await requireUser(["TEACHER", "ADMIN"]);
  const ids = await visibleClassIds(user);
  const classes = await db.classroom.findMany({ where: { id: { in: ids } }, include: { teacher: { select: { name: true } }, students: { orderBy: { name: "asc" }, select: { id: true, name: true, username: true } } }, orderBy: { name: "asc" } });
  const teachers = user.role === "ADMIN" ? await db.user.findMany({ where: { role: { in: ["TEACHER", "ADMIN"] } }, select: { id: true, name: true, username: true, role: true }, orderBy: { name: "asc" } }) : [];
  return (
    <AppShell user={user}>
      <h1 className="h1">Kelas & akun</h1>
      <p className="muted">Akun siswa dibuat guru (impor CSV atau satu per satu). Guru hanya melihat kelasnya sendiri.</p>
      <ClassManager isAdmin={user.role === "ADMIN"} teachers={teachers}
        classes={classes.map((c) => ({ id: c.id, name: c.name, teacherId: c.teacherId, teacher: c.teacher?.name ?? "-", students: c.students }))} />
    </AppShell>
  );
}
