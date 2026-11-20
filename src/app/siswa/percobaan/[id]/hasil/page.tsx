import Link from "next/link";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { COMPONENTS, DEFAULT_RUBRIC, RUBRIC_LEVELS, STAGES, fmtDuration, scoreLabel, stageLabel } from "@/lib/domain";
import type { Scores, StageResult } from "@/lib/grading";

export const dynamic = "force-dynamic";

const ADVICE: Record<string, string> = {
  identifikasi: "Baca kop dan bagian pengirim/tujuan untuk membedakan surat masuk dan keluar, lalu tentukan nilai guna arsip.",
  klasifikasi: "Ambil kata tangkap dari pihak yang benar: pengirim untuk surat masuk, tujuan untuk surat keluar.",
  indeks: "Perhatikan urutan unit indeks: nama akhir orang ditulis dulu, dan bentuk badan usaha ditulis di akhir.",
  kode: "Pastikan kode arsip sesuai dengan daftar klasifikasi dan sama di semua tempat.",
  lokasi: "Perhatikan urutan abjad/tanggal di dalam folder dan pastikan laci serta guide sesuai kode.",
  metadata: "Lengkapi semua kolom kartu kendali dan salin data persis dari dokumen.",
  temuKembali: "Cocokkan semua ciri permintaan (pengirim, perihal, bulan) sebelum memilih arsip.",
  waktu: "Latih temu kembali lewat kata tangkap dan kode agar lebih cepat.",
  kemandirian: "Coba kerjakan tanpa petunjuk terlebih dahulu, lalu periksa umpan balik.",
};

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["STUDENT"]);
  const { id } = await params;
  const a = await db.attempt.findUnique({ where: { id }, include: { session: { include: { package: true } } } });
  if (!a || a.studentId !== user.id) redirect("/siswa/praktik");
  if (a.status !== "FINISHED") redirect(`/siswa/percobaan/${id}`);
  const scores = a.scores as unknown as Scores | null;
  const results = (a.results ?? {}) as Record<string, StageResult>;
  const rubric = (a.rubric ?? {}) as Record<string, number>;
  const history = await db.attempt.findMany({ where: { sessionId: a.sessionId, studentId: user.id }, orderBy: { attemptNo: "asc" } });
  const total = scores?.total ?? null;
  const lbl = scoreLabel(total);
  const stars = total == null ? 0 : Math.round(total / 20);
  const findings = STAGES.flatMap((s) => results[s.value]?.findings ?? []);
  const weak = COMPONENTS.filter((c) => scores?.components[c.key] && scores.components[c.key].score < 75).sort((x, y) => scores!.components[x.key].score - scores!.components[y.key].score).slice(0, 3);

  return (
    <AppShell user={user}>
      <h1 className="h1">Hasil Praktik – {a.session.title}</h1>
      <p className="muted">Berikut hasil pekerjaan kamu · percobaan ke-{a.attemptNo} · {a.finishedAt ? fmtDuration(a.finishedAt.getTime() - a.startedAt.getTime()) : "-"} · {a.helpCount} bantuan</p>

      <div className="mt-5 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)_minmax(0,320px)]">
        <div className="card flex flex-col items-center justify-center p-6 text-center">
          <p className="text-sm font-semibold text-stone-600">Skor Akhir</p>
          <p className="mt-1 text-6xl font-extrabold text-brand-700">{total ?? "—"}</p>
          <p className={`mt-1 text-lg font-semibold ${lbl.tone}`}>{lbl.label}</p>
          <p className="mt-1 text-2xl tracking-wider text-amber-400" aria-label={`${stars} dari 5 bintang`}>{"★".repeat(stars)}<span className="text-stone-300">{"★".repeat(5 - stars)}</span></p>
          <p className="mt-2 text-xs text-stone-500">KKM {a.session.package.kkm} · skor otomatis (data pendukung)</p>
          {a.teacherScore != null && <p className="mt-3 rounded-lg bg-brand-50 px-3 py-1.5 text-sm">Nilai guru: <strong>{a.teacherScore}</strong></p>}
        </div>

        <div className="card overflow-x-auto p-4">
          <h2 className="text-sm font-semibold">Rincian Penilaian</h2>
          <table className="table mt-2">
            <thead><tr><th>Komponen</th><th className="text-right">Skor</th><th>Keterangan</th></tr></thead>
            <tbody>
              {COMPONENTS.filter((c) => scores?.components[c.key]).map((c) => {
                const cs = scores!.components[c.key];
                const l = scoreLabel(cs.score);
                return (
                  <tr key={c.key}>
                    <td>{c.label}</td>
                    <td className="text-right tabular-nums">{Math.round((cs.score / 100) * cs.weight * 10) / 10} / {cs.weight}</td>
                    <td className={`text-sm font-medium ${l.tone}`}>{l.label}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <h2 className="text-sm font-semibold text-red-800">Kesalahan yang Terjadi</h2>
            {findings.length ? (
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-red-900">{findings.slice(0, 4).map((f, i) => <li key={i}>{f.message}</li>)}</ol>
            ) : <p className="mt-2 text-sm text-red-900">Tidak ada kesalahan. Hebat!</p>}
            {findings.length > 4 && <a href="#rincian" className="mt-2 inline-block text-xs text-red-800 underline">+{findings.length - 4} lainnya</a>}
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <h2 className="text-sm font-semibold text-emerald-800">Saran</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-emerald-900">
              {weak.length ? weak.map((c) => <li key={c.key}>{ADVICE[c.key]}</li>) : <li>Pertahankan! Coba paket dengan sistem penyimpanan lain.</li>}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <a href="#rincian" className="btn">Lihat Detail</a>
        <Link href="/siswa/praktik" className="btn btn-primary">Kerjakan Paket Lain</Link>
      </div>

      <div id="rincian" className="card mt-6 scroll-mt-4 p-5">
        <h2 className="h2">Rincian per tahap</h2>
        {STAGES.filter((st) => results[st.value]).map((st) => [st.value, results[st.value]] as const).map(([stage, r]) => (
          <details key={stage} className="mt-3 rounded-lg border border-brand-100 p-3">
            <summary className="cursor-pointer text-sm font-semibold">{stageLabel(stage)} — {r.items.filter((i) => i.score === 1).length}/{r.items.length} butir benar · {r.findings.length} catatan</summary>
            <ul className="mt-2 space-y-1 text-sm">{r.findings.map((f, i) => <li key={i} className="rounded bg-amber-50 px-2 py-1">{f.message}</li>)}</ul>
          </details>
        ))}
      </div>

      <div className="card mt-4 overflow-x-auto p-5">
        <h2 className="h2">Rubrik praktik guru</h2>
        <table className="table mt-2">
          <thead><tr><th>Indikator</th>{RUBRIC_LEVELS.map((l) => <th key={l.level} className="text-center">{l.level}. {l.label}</th>)}</tr></thead>
          <tbody>
            {DEFAULT_RUBRIC.map((r) => (
              <tr key={r.key}><td>{r.label}</td>{RUBRIC_LEVELS.map((l) => <td key={l.level} className="text-center">{rubric[r.key] === l.level ? <span className="text-brand-600">●</span> : <span className="text-stone-300">○</span>}</td>)}</tr>
            ))}
          </tbody>
        </table>
        {a.teacherNote && <p className="mt-2 text-sm"><strong>Catatan guru:</strong> {a.teacherNote}</p>}
      </div>

      <div className="card mt-4 p-5">
        <h2 className="h2">Riwayat percobaan</h2>
        <ul className="mt-2 text-sm">{history.map((h) => <li key={h.id}>Percobaan {h.attemptNo}: {h.status === "FINISHED" ? `skor ${(h.scores as unknown as Scores | null)?.total ?? "-"}, ${h.helpCount} bantuan` : "belum selesai"}</li>)}</ul>
      </div>
    </AppShell>
  );
}
