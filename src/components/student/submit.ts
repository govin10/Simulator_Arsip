"use client";
export async function submitStage(attemptId: string, stage: string, data: unknown) {
  const r = await fetch(`/api/attempts/${attemptId}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ stage, data }) });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error ?? "Gagal mengirim.");
  return j as { next: string };
}
