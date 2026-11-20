import AppShell from "@/components/AppShell";
import ClassManager from "@/components/teacher/ClassManager";
import { requireUser, visibleClassIds } from "@/lib/auth";
import { db } from "@/lib/db";
import { storageDiagnostics } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function ClassesPage() {
  const user = await requireUser(["TEACHER", "ADMIN"]);
  const ids = await visibleClassIds(user);
  const classes = await db.classroom.findMany({ where: { id: { in: ids } }, include: { teacher: { select: { name: true } }, students: { orderBy: { name: "asc" }, select: { id: true, name: true, username: true } } }, orderBy: { name: "asc" } });
  const teachers = user.role === "ADMIN" ? await db.user.findMany({ where: { role: { in: ["TEACHER", "ADMIN"] } }, select: { id: true, name: true, username: true, role: true }, orderBy: { name: "asc" } }) : [];
  return (
    <AppShell user={user}>
      <h1 className="h1">Kelas & akun</h1>
      <p className="muted">Siswa mendaftar sendiri di halaman Daftar dan mengisi kelasnya. Di sini Anda bisa merapikan kelas, memindahkan siswa yang salah kelas, dan mereset kata sandi.</p>
      <StorageStatus />
      <ClassManager isAdmin={user.role === "ADMIN"} teachers={teachers} myId={user.id}
        classes={classes.map((c) => ({ id: c.id, name: c.name, teacherId: c.teacherId, teacher: c.teacher?.name ?? "-", students: c.students }))} />
    </AppShell>
  );
}

function StorageStatus() {
  const d = storageDiagnostics();
  const ok = d.mode === "blob";
  return (
    <div className={`card mt-5 p-4 text-sm ${ok ? "" : "border-amber-400 bg-amber-50"}`}>
      <p className="font-semibold">{ok ? "✓ Penyimpanan PDF siap (Vercel Blob terhubung)" : "⚠ Penyimpanan PDF belum siap: token Vercel Blob tidak terbaca"}</p>
      <p className="mt-1 text-stone-600">Lingkungan: <strong>{d.vercelEnv}</strong> · commit <code>{d.commit}</code></p>
      <p className="mt-1 text-stone-600">Variabel terkait yang terbaca: {d.names.length ? d.names.map((n) => <code key={n} className="mr-1 rounded bg-white px-1">{n}</code>) : <em>tidak ada</em>}</p>
      {!ok && d.names.includes("BLOB_STORE_ID") && (
        <p className="mt-2">Blob <strong>sudah terhubung tanpa token read-write</strong>. Di Vercel: Storage → store Blob → <em>Projects</em> → Simulator_Arsip → <em>Disconnect</em>, lalu <em>Connect Project</em> lagi dengan opsi <strong>&ldquo;Add a read-write token env var&rdquo;</strong> dicentang (Production, Preview, Development). Atau salin <code>BLOB_READ_WRITE_TOKEN</code> dari halaman store ke Settings → Environment Variables. Lalu <strong>Redeploy</strong>.</p>
      )}
      {!ok && !d.names.includes("BLOB_STORE_ID") && <p className="mt-2">Hubungkan Blob ke project ini di Vercel (tab Storage → pilih store Blob → Connect Project, centang <strong>Production</strong> dan opsi read-write token), lalu <strong>Redeploy</strong>.</p>}
    </div>
  );
}
