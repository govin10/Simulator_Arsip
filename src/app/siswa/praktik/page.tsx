import Link from "next/link";
import AppShell from "@/components/AppShell";
import Icon from "@/components/Icon";
import StartButton from "@/components/student/StartButton";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { kindLabel, stageLabel, systemLabel } from "@/lib/domain";

export const dynamic = "force-dynamic";

export default async function PracticeList({ searchParams }: { searchParams: Promise<{ mulai?: string }> }) {
  const user = await requireUser(["STUDENT"]);
  const { mulai } = await searchParams;
  const sessions = user.classroomId
    ? await db.practiceSession.findMany({
        where: { classroomId: user.classroomId, active: true },
        include: { package: { include: { _count: { select: { documents: true, retrievalTasks: true } } } }, attempts: { where: { studentId: user.id }, orderBy: { attemptNo: "asc" } } },
        orderBy: { createdAt: "desc" },
      })
    : [];
  return (
    <AppShell user={user}>
      <h1 className="h1">Paket Dokumen</h1>
      <p className="muted mt-1">Pilih paket praktik yang diaktifkan guru. Di dalamnya kamu mengerjakan identifikasi, klasifikasi & indeks, metadata, lemari arsip, temu kembali, dan skenario kesalahan secara berurutan. Jawaban tersimpan otomatis.</p>
      {mulai !== undefined && <p className="mt-4 rounded-lg bg-brand-50 p-3 text-sm text-brand-800 ring-1 ring-brand-200">Belum ada praktik yang sedang berjalan. Mulai salah satu paket di bawah; tahap itu ada di dalam paket.</p>}
      {!sessions.length && <div className="card mt-6 p-6 text-stone-600">Belum ada paket aktif untuk kelasmu. Tunggu guru mengaktifkan sesi praktik.</div>}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {sessions.map((s) => {
          const running = s.attempts.find((a) => a.status === "IN_PROGRESS");
          const left = s.package.maxAttempts - s.attempts.length;
          const best = Math.max(...s.attempts.map((a) => (a.scores as { total?: number } | null)?.total ?? -1));
          return (
            <div key={s.id} className="card flex flex-col p-5">
              <div className="flex items-start gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Icon name="doc" className="h-6 w-6" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="h2">{s.title}</h2>
                    <span className={`badge ${s.package.kind === "LATIHAN" ? "bg-sky-100 text-sky-800" : "bg-amber-100 text-amber-800"}`}>{kindLabel(s.package.kind)}</span>
                  </div>
                  <p className="muted">{s.package.title}</p>
                </div>
              </div>
              <dl className="mt-4 grid grid-cols-4 gap-2 rounded-xl bg-brand-50/60 p-3 text-sm">
                <div><dt className="text-xs text-stone-500">Sistem</dt><dd className="font-semibold">{systemLabel(s.package.system).split(" ")[0]}</dd></div>
                <div><dt className="text-xs text-stone-500">Dokumen</dt><dd className="font-semibold">{s.package._count.documents}</dd></div>
                <div><dt className="text-xs text-stone-500">Skor terbaik</dt><dd className="font-semibold">{best >= 0 ? best : "—"}</dd></div>
                <div><dt className="text-xs text-stone-500">Sisa coba</dt><dd className="font-semibold">{running ? "—" : Math.max(0, left)}</dd></div>
              </dl>
              {s.attempts.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm">
                  {s.attempts.map((a) => (
                    <li key={a.id} className="flex items-center justify-between">
                      <span>Percobaan {a.attemptNo}: {a.status === "FINISHED" ? "selesai" : stageLabel(a.stage)}</span>
                      {a.status === "FINISHED" && <Link className="text-brand-700 underline" href={`/siswa/percobaan/${a.id}/hasil`}>Lihat hasil</Link>}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-auto pt-4">
                {running ? <Link href={`/siswa/percobaan/${running.id}`} className="btn btn-primary w-full">Lanjutkan percobaan {running.attemptNo} →</Link>
                  : left > 0 ? <StartButton sessionId={s.id} label={s.attempts.length ? "Ulangi dengan urutan baru" : "Mulai kerjakan →"} />
                  : <p className="text-sm text-stone-500">Batas percobaan tercapai.</p>}
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
