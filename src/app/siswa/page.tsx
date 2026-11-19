import Link from "next/link";
import AppShell from "@/components/AppShell";
import StartButton from "@/components/student/StartButton";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { kindLabel, stageLabel, systemLabel } from "@/lib/domain";

export default async function StudentHome() {
  const user = await requireUser(["STUDENT"]);
  const sessions = user.classroomId
    ? await db.practiceSession.findMany({
        where: { classroomId: user.classroomId, active: true },
        include: { package: { include: { _count: { select: { documents: true, retrievalTasks: true } } } }, attempts: { where: { studentId: user.id }, orderBy: { attemptNo: "asc" } } },
        orderBy: { createdAt: "desc" },
      })
    : [];
  return (
    <AppShell user={user}>
      <h1 className="h1">Sesi praktik</h1>
      <p className="muted mt-1">Pilih sesi yang diaktifkan guru. Jawabanmu tersimpan otomatis; kamu bisa melanjutkan bila koneksi terputus.</p>
      {!sessions.length && <div className="card mt-6 p-6 text-stone-600">Belum ada sesi aktif untuk kelasmu. Tunggu guru mengaktifkan sesi.</div>}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {sessions.map((s) => {
          const running = s.attempts.find((a) => a.status === "IN_PROGRESS");
          const left = s.package.maxAttempts - s.attempts.length;
          return (
            <div key={s.id} className="card flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="h2">{s.title}</h2>
                  <p className="muted">{s.package.title}</p>
                </div>
                <span className={`badge ${s.package.kind === "LATIHAN" ? "bg-sky-100 text-sky-800" : "bg-amber-100 text-amber-800"}`}>{kindLabel(s.package.kind)}</span>
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
                <div><dt className="text-xs text-stone-500">Sistem</dt><dd className="font-medium">{systemLabel(s.package.system)}</dd></div>
                <div><dt className="text-xs text-stone-500">Dokumen</dt><dd className="font-medium">{s.package._count.documents}</dd></div>
                <div><dt className="text-xs text-stone-500">Sisa percobaan</dt><dd className="font-medium">{running ? "—" : Math.max(0, left)}</dd></div>
              </dl>
              {s.attempts.length > 0 && (
                <ul className="mt-3 space-y-1 border-t border-stone-100 pt-3 text-sm">
                  {s.attempts.map((a) => (
                    <li key={a.id} className="flex items-center justify-between">
                      <span>Percobaan {a.attemptNo}: {a.status === "FINISHED" ? "selesai" : stageLabel(a.stage)}</span>
                      {a.status === "FINISHED" && <Link className="text-brand-700 underline" href={`/siswa/percobaan/${a.id}/hasil`}>Lihat hasil {a.scores ? `(${(a.scores as { total: number }).total})` : ""}</Link>}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-auto pt-4">
                {running ? (
                  <Link href={`/siswa/percobaan/${running.id}`} className="btn btn-primary w-full">Lanjutkan percobaan {running.attemptNo}</Link>
                ) : left > 0 ? (
                  <StartButton sessionId={s.id} label={s.attempts.length ? "Ulangi dengan urutan baru" : "Mulai"} />
                ) : (
                  <p className="text-sm text-stone-500">Batas percobaan tercapai.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
