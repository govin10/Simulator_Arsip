import Link from "next/link";
import HelpButton from "./HelpButton";
import { STAGES, systemLabel } from "@/lib/domain";

const SHORT: Record<string, string> = { PROCESS: "Identifikasi, Klasifikasi & Metadata", STORE: "Lemari Arsip", RETRIEVE: "Temu Kembali", SCENARIO: "Skenario Kesalahan" };

export default function StageHeader(p: { title: string; pkgTitle: string; system: string; stage: string; attemptNo: number; attemptId: string; scenarioEnabled: boolean }) {
  const stages = STAGES.filter((s) => p.scenarioEnabled || s.value !== "SCENARIO");
  const cur = stages.findIndex((s) => s.value === p.stage);
  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link href="/siswa/praktik" className="mt-1 grid h-8 w-8 place-items-center rounded-lg text-brand-700 hover:bg-brand-100" aria-label="Kembali ke daftar paket">←</Link>
          <div>
            <h1 className="text-xl font-bold">Paket Dokumen – {p.title}</h1>
            <p className="muted">{p.pkgTitle} · Sistem {systemLabel(p.system)} · Percobaan ke-{p.attemptNo}</p>
          </div>
        </div>
        <HelpButton attemptId={p.attemptId} />
      </div>
      <ol className="card mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 p-3" aria-label="Tahapan">
        {stages.map((s, i) => (
          <li key={s.value} aria-current={i === cur ? "step" : undefined} className="flex items-center gap-2">
            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${i < cur ? "bg-emerald-500 text-white" : i === cur ? "bg-brand-600 text-white ring-4 ring-brand-100" : "bg-stone-200 text-stone-600"}`}>{i < cur ? "✓" : i + 1}</span>
            <span className={`text-sm ${i === cur ? "font-semibold text-brand-800" : i < cur ? "text-stone-700" : "text-stone-500"}`}>{SHORT[s.value]}</span>
            {i < stages.length - 1 && <span className={`mx-1 hidden h-0.5 w-8 rounded sm:block ${i < cur ? "bg-emerald-400" : "bg-stone-200"}`} aria-hidden />}
          </li>
        ))}
      </ol>
    </div>
  );
}
