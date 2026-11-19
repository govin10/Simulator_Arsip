import HelpButton from "./HelpButton";
import { STAGES, systemLabel } from "@/lib/domain";

export default function StageHeader(p: { title: string; pkgTitle: string; system: string; stage: string; attemptNo: number; attemptId: string; scenarioEnabled: boolean }) {
  const stages = STAGES.filter((s) => p.scenarioEnabled || s.value !== "SCENARIO");
  const cur = stages.findIndex((s) => s.value === p.stage);
  return (
    <div className="mb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="h1">{p.title}</h1>
          <p className="muted">{p.pkgTitle} · Sistem {systemLabel(p.system)} · Percobaan ke-{p.attemptNo}</p>
        </div>
        <HelpButton attemptId={p.attemptId} />
      </div>
      <ol className="mt-3 flex flex-wrap gap-2" aria-label="Tahapan">
        {stages.map((s, i) => (
          <li key={s.value} aria-current={i === cur ? "step" : undefined}
            className={`rounded-full px-3 py-1 text-xs font-medium ${i < cur ? "bg-brand-100 text-brand-800" : i === cur ? "bg-brand-600 text-white" : "bg-stone-200 text-stone-600"}`}>
            {i < cur ? "✓ " : ""}{s.label}
          </li>
        ))}
      </ol>
    </div>
  );
}
