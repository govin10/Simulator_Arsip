"use client";
import { useState } from "react";

export default function HelpButton({ attemptId }: { attemptId: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ system: string[]; stage: string[]; helpCount: number } | null>(null);
  async function show() {
    if (!data) {
      if (!confirm("Membuka petunjuk dihitung sebagai bantuan dan sedikit mengurangi skor kemandirian. Lanjutkan?")) return;
      const r = await fetch(`/api/attempts/${attemptId}/help`, { method: "POST" });
      setData(await r.json());
    }
    setOpen(true);
  }
  return (
    <>
      <button className="btn btn-sm" onClick={show}>💡 Petunjuk</button>
      {open && data && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal onClick={() => setOpen(false)}>
          <div className="card max-h-[85vh] w-full max-w-lg overflow-auto p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="h2">Petunjuk singkat</h2>
            <h3 className="mt-3 text-sm font-semibold">Tahap ini</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{data.stage.map((s) => <li key={s}>{s}</li>)}</ul>
            <h3 className="mt-3 text-sm font-semibold">Aturan sistem penyimpanan</h3>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">{data.system.map((s) => <li key={s}>{s}</li>)}</ul>
            <p className="mt-3 text-xs text-stone-500">Bantuan yang sudah dipakai pada percobaan ini: {data.helpCount}</p>
            <button className="btn mt-4 w-full" onClick={() => setOpen(false)}>Tutup</button>
          </div>
        </div>
      )}
    </>
  );
}
