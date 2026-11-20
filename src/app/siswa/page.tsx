import Link from "next/link";
import AppShell from "@/components/AppShell";
import Icon, { type IconName } from "@/components/Icon";
import StatCard from "@/components/StatCard";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtDuration, scoreLabel } from "@/lib/domain";
import type { Scores } from "@/lib/grading";
import { canSubmit } from "@/lib/tugas";

export const dynamic = "force-dynamic";

const MENU: { href: string; title: string; desc: string; icon: IconName }[] = [
  { href: "/siswa/praktik", title: "Paket Dokumen", desc: "Kerjakan paket dokumen praktik", icon: "doc" },
  { href: "/siswa/lanjut?tahap=PROCESS", title: "Klasifikasi & Indeks", desc: "Tentukan sistem, kata tangkap, indeks, dan kode", icon: "tag" },
  { href: "/siswa/lanjut?tahap=STORE", title: "Lemari Arsip Virtual", desc: "Simpan dokumen ke laci dan folder", icon: "cabinet" },
  { href: "/siswa/lanjut?tahap=PROCESS", title: "Metadata Arsip", desc: "Lengkapi kartu kendali dan metadata", icon: "card" },
  { href: "/siswa/lanjut?tahap=RETRIEVE", title: "Temu Kembali Arsip", desc: "Cari arsip dengan cepat dan tepat", icon: "search" },
  { href: "/siswa/lanjut?tahap=SCENARIO", title: "Skenario Kesalahan", desc: "Temukan dan perbaiki kesalahan arsip", icon: "alert" },
  { href: "/siswa/tugas", title: "Tugas PDF", desc: "Kumpulkan jawaban soal kertas per fitur", icon: "upload" },
];

export default async function StudentHome() {
  const user = await requireUser(["STUDENT"]);
  const [attempts, sessions, assignments] = await Promise.all([
    db.attempt.findMany({ where: { studentId: user.id }, include: { session: { select: { title: true } } }, orderBy: { startedAt: "desc" } }),
    user.classroomId ? db.practiceSession.findMany({ where: { classroomId: user.classroomId, active: true }, select: { id: true } }) : [],
    user.classroomId ? db.assignment.findMany({ where: { classroomId: user.classroomId }, include: { submissions: { where: { studentId: user.id } } } }) : [],
  ]);
  const finished = attempts.filter((a) => a.status === "FINISHED" && a.scores);
  const doneSessions = new Set(finished.map((a) => a.sessionId));
  const totalSessions = new Set([...sessions.map((s) => s.id), ...doneSessions]).size;
  const avg = finished.length ? Math.round((finished.reduce((s, a) => s + (a.scores as unknown as Scores).total, 0) / finished.length) * 10) / 10 : null;
  const studyMs = attempts.reduce((s, a) => s + (a.finishedAt ? a.finishedAt.getTime() - a.startedAt.getTime() : 0), 0);
  const running = attempts.find((a) => a.status === "IN_PROGRESS");
  const pendingPdf = assignments.filter((a) => !a.submissions[0] && canSubmit(a, null).ok).length;
  const revisi = assignments.filter((a) => a.submissions[0]?.status === "REVISION").length;
  const first = user.name.split(" ")[0];
  const lbl = scoreLabel(avg);

  return (
    <AppShell user={user}>
      <h1 className="text-2xl font-bold text-stone-900">Halo, {first} <span aria-hidden>👋</span></h1>
      <p className="muted">Selamat belajar dan praktik kearsipan!</p>

      {(running || pendingPdf > 0 || revisi > 0) && (
        <div className="mt-4 flex flex-wrap gap-3">
          {running && <Link href={`/siswa/percobaan/${running.id}`} className="btn btn-primary">▶ Lanjutkan praktik: {running.session.title}</Link>}
          {pendingPdf > 0 && <Link href="/siswa/tugas" className="btn">📄 {pendingPdf} tugas PDF belum dikumpulkan</Link>}
          {revisi > 0 && <Link href="/siswa/tugas" className="btn text-amber-800">↩ {revisi} tugas perlu revisi</Link>}
        </div>
      )}

      <h2 className="mt-6 text-sm font-semibold text-stone-700">Ringkasan Progres</h2>
      <div className="mt-2 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Paket Dikerjakan" value={<>{doneSessions.size} <span className="text-base font-medium text-stone-400">/ {totalSessions}</span></>} progress={totalSessions ? (doneSessions.size / totalSessions) * 100 : 0} sub={totalSessions ? `${Math.round((doneSessions.size / totalSessions) * 100)}% selesai` : "Belum ada sesi"} />
        <StatCard label="Skor Rata-rata" value={avg ?? "—"} sub={lbl.label} tone={lbl.tone} />
        <StatCard label="Waktu Belajar" value={<span className="text-xl">{fmtDuration(studyMs)}</span>} sub="total waktu praktik" />
        <StatCard label="Percobaan" value={<>{attempts.length} <span className="text-base font-medium text-stone-400">kali</span></>} sub={`${finished.length} selesai`} />
      </div>

      <h2 className="mt-6 text-sm font-semibold text-stone-700">Menu Praktik</h2>
      <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MENU.map((m) => (
          <Link key={m.title} href={m.href} className="card group flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:shadow-md">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100 text-brand-600 group-hover:from-brand-100 group-hover:to-brand-200"><Icon name={m.icon} className="h-6 w-6" /></span>
            <span><span className="block font-semibold text-stone-900">{m.title}</span><span className="block text-xs text-stone-500">{m.desc}</span></span>
          </Link>
        ))}
      </div>

      <div className="card mt-6 flex items-center gap-4 border-brand-200 bg-gradient-to-r from-brand-50 to-white p-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-brand-600 shadow-sm"><Icon name="help" /></span>
        <div><p className="font-semibold">Tips</p><p className="text-sm text-stone-600">Kerjakan setiap langkah dengan teliti. Perhatikan aturan klasifikasi dan penyimpanan arsip!</p></div>
      </div>
    </AppShell>
  );
}
