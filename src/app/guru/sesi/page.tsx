import AppShell from "@/components/AppShell";
import SessionManager from "@/components/teacher/SessionManager";
import { requireUser, visibleClassIds } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function SessionsPage() {
  const user = await requireUser(["TEACHER", "ADMIN"]);
  const classIds = await visibleClassIds(user);
  const [classes, packages, sessions] = await Promise.all([
    db.classroom.findMany({ where: { id: { in: classIds } }, orderBy: { name: "asc" } }),
    db.package.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, title: true, kind: true, system: true } }),
    db.practiceSession.findMany({ where: { classroomId: { in: classIds } }, include: { package: { select: { title: true, kind: true, system: true } }, classroom: { select: { name: true } }, _count: { select: { attempts: true } } }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <AppShell user={user}>
      <h1 className="h1">Sesi praktik</h1>
      <p className="muted">Aktifkan paket untuk kelas. Siswa hanya melihat sesi yang aktif. Gunakan paket berbeda yang setara untuk tes awal dan tes akhir.</p>
      <SessionManager classes={classes.map((c) => ({ id: c.id, name: c.name }))} packages={packages}
        sessions={sessions.map((s) => ({ id: s.id, title: s.title, active: s.active, className: s.classroom.name, classroomId: s.classroomId, pkg: s.package, attempts: s._count.attempts, createdAt: s.createdAt.toISOString() }))} />
    </AppShell>
  );
}
