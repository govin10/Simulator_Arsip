"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/** Log kejadian dikirim berkelompok setiap beberapa detik. */
export function useEventLog(attemptId: string) {
  const queue = useRef<{ type: string; payload?: object; t: string }[]>([]);
  const flush = useCallback(() => {
    if (!queue.current.length) return;
    const events = queue.current.splice(0);
    const body = JSON.stringify({ events });
    if (document.visibilityState === "hidden" && navigator.sendBeacon) {
      navigator.sendBeacon(`/api/attempts/${attemptId}/events`, new Blob([body], { type: "application/json" }));
    } else fetch(`/api/attempts/${attemptId}/events`, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => queue.current.unshift(...events));
  }, [attemptId]);
  useEffect(() => {
    const t = setInterval(flush, 8000);
    const vis = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", vis); flush(); };
  }, [flush]);
  return useCallback((type: string, payload?: object) => { queue.current.push({ type, payload, t: new Date().toISOString() }); }, []);
}

/** Autosimpan ke server (berkala) + cadangan di localStorage bila koneksi putus. */
export function useAutosave<T>(attemptId: string, stage: string, data: T) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "offline">("idle");
  const last = useRef<string>("");
  const key = `arsip:${attemptId}:${stage}`;
  useEffect(() => {
    const json = JSON.stringify(data);
    try { localStorage.setItem(key, json); } catch {}
    if (json === last.current) return;
    const t = setTimeout(async () => {
      setStatus("saving");
      try {
        const r = await fetch(`/api/attempts/${attemptId}/draft`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage, data }) });
        if (!r.ok) throw new Error();
        last.current = json;
        setStatus("saved");
      } catch { setStatus("offline"); }
    }, 1500);
    return () => clearTimeout(t);
  }, [attemptId, stage, data, key]);
  return status;
}
export function readLocalDraft<T>(attemptId: string, stage: string): T | null {
  try { const s = localStorage.getItem(`arsip:${attemptId}:${stage}`); return s ? (JSON.parse(s) as T) : null; } catch { return null; }
}
export function clearLocalDraft(attemptId: string, stage: string) {
  try { localStorage.removeItem(`arsip:${attemptId}:${stage}`); } catch {}
}

export function SaveIndicator({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    idle: ["", ""], saving: ["Menyimpan…", "text-stone-500"], saved: ["Tersimpan otomatis", "text-brand-700"], offline: ["Offline — disimpan di perangkat, akan dikirim ulang", "text-amber-700"],
  };
  const [t, c] = map[status] ?? map.idle;
  return <span className={`text-xs ${c}`} aria-live="polite">{t}</span>;
}
