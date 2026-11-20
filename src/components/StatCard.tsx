import Icon, { type IconName } from "./Icon";

export default function StatCard({ label, value, sub, icon, progress, tone = "text-stone-500" }: { label: string; value: React.ReactNode; sub?: React.ReactNode; icon?: IconName; progress?: number; tone?: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-stone-500">{label}</p>
        {icon && <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600"><Icon name={icon} /></span>}
      </div>
      <p className="mt-1 text-2xl font-bold text-stone-900">{value}</p>
      {progress != null && <div className="mt-2 h-1.5 rounded-full bg-brand-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min(100, progress)}%` }} /></div>}
      {sub && <p className={`mt-1 text-xs ${tone}`}>{sub}</p>}
    </div>
  );
}
