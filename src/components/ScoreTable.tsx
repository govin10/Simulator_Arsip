import { COMPONENTS, componentLabel } from "@/lib/domain";
import type { Scores } from "@/lib/grading";

export function Bar({ value, kkm }: { value: number; kkm?: number }) {
  const ok = kkm == null || value >= kkm;
  return (
    <div className="relative h-2.5 w-full min-w-[80px] rounded-full bg-stone-200" role="img" aria-label={`${value} dari 100`}>
      <div className={`h-full rounded-full ${ok ? "bg-brand-500" : "bg-amber-500"}`} style={{ width: `${Math.min(100, value)}%` }} />
      {kkm != null && <div className="absolute -top-1 h-4.5 w-0.5 bg-stone-700" style={{ left: `${kkm}%`, height: 18 }} title={`KKM ${kkm}`} />}
    </div>
  );
}

export default function ScoreTable({ scores }: { scores: Scores }) {
  return (
    <table className="table">
      <thead><tr><th>Komponen</th><th className="w-20 text-right">Bobot</th><th className="w-24 text-right">Skor</th><th className="w-1/3">Capaian</th><th>Keterangan</th></tr></thead>
      <tbody>
        {COMPONENTS.filter((x) => scores.components[x.key]).map((x) => [x.key, scores.components[x.key]] as const).map(([k, c]) => (
          <tr key={k}>
            <td className="font-medium">{componentLabel(k)}</td>
            <td className="text-right">{c.weight}</td>
            <td className="text-right font-semibold tabular-nums">{c.score}</td>
            <td><Bar value={c.score} kkm={scores.kkm} /></td>
            <td className="text-xs text-stone-600">{c.note ?? (c.total ? `${c.correct} dari ${c.total} butir benar` : "")}</td>
          </tr>
        ))}
      </tbody>
      <tfoot><tr><td className="px-3 py-2 font-bold">Skor otomatis</td><td /><td className="px-3 py-2 text-right text-lg font-bold">{scores.total}</td><td colSpan={2} className="px-3 py-2 text-sm">{scores.passed ? "≥ KKM" : "< KKM"} ({scores.kkm})</td></tr></tfoot>
    </table>
  );
}
