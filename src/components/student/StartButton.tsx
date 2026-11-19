"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StartButton({ sessionId, label }: { sessionId: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  return (
    <>
      <button className="btn btn-primary w-full" disabled={busy} onClick={async () => {
        setBusy(true);
        const r = await fetch(`/api/sessions/${sessionId}/start`, { method: "POST" });
        const j = await r.json();
        if (!r.ok) { setErr(j.error); setBusy(false); return; }
        router.push(`/siswa/percobaan/${j.attemptId}`);
      }}>{busy ? "Menyiapkan…" : label}</button>
      {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
    </>
  );
}
