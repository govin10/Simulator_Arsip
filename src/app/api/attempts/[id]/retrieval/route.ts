import { apiHandler, apiUser, HttpError } from "@/lib/auth";
import { loadOwnAttempt } from "@/lib/attempts";
import { db } from "@/lib/db";
import { judgeRetrieval } from "@/lib/grading";

type Body = { action: "start" | "step" | "answer"; taskId: string; step?: object; documentId?: string | null; notFound?: boolean };

export const POST = apiHandler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await apiUser(["STUDENT"]);
  const { id } = await ctx.params;
  const a = await loadOwnAttempt(id, u);
  if (a.stage !== "RETRIEVE" || a.status !== "IN_PROGRESS") throw new HttpError(409, "Bukan tahap temu kembali.");
  const b = (await req.json()) as Body;
  const task = await db.retrievalTask.findUnique({ where: { id: b.taskId } });
  if (!task || task.packageId !== a.session.packageId) throw new HttpError(404, "Permintaan tidak ditemukan.");
  const key = { attemptId_taskId: { attemptId: id, taskId: task.id } };
  let r = await db.retrievalResult.findUnique({ where: key });

  if (b.action === "start") {
    // Timer dimulai di server saat permintaan pertama kali tampil
    if (!r) r = await db.retrievalResult.create({ data: { attemptId: id, taskId: task.id, shownAt: new Date() } });
    return Response.json({ shownAt: r.shownAt, answered: !!r.answeredAt, serverNow: new Date() });
  }
  if (!r) throw new HttpError(400, "Permintaan belum dimulai.");
  if (r.answeredAt) throw new HttpError(409, "Permintaan ini sudah dijawab.");

  if (b.action === "step") {
    const steps = [...((r.steps as object[]) ?? []), { ...(b.step ?? {}), t: new Date().toISOString() }].slice(-300);
    await db.retrievalResult.update({ where: key, data: { steps } });
    return Response.json({ ok: true });
  }
  if (b.action === "answer") {
    const now = new Date();
    const notFound = !!b.notFound;
    const selected = notFound ? null : b.documentId ?? null;
    if (!notFound && !selected) throw new HttpError(400, "Pilih dokumen atau nyatakan arsip tidak ada.");
    const correct = judgeRetrieval(task.answerDocumentId, selected, notFound);
    const opened = ((r.steps as { kind?: string; docId?: string }[]) ?? []).filter((s) => s.kind === "OPEN_DOC" && s.docId !== task.answerDocumentId).length;
    await db.retrievalResult.update({
      where: key,
      data: { answeredAt: now, selectedDocumentId: selected, answeredNotFound: notFound, correct, wrongPicks: opened, durationMs: now.getTime() - r.shownAt.getTime() },
    });
    // Benar/salah TIDAK dikembalikan: umpan balik muncul setelah tahap selesai
    return Response.json({ ok: true, durationMs: now.getTime() - r.shownAt.getTime() });
  }
  throw new HttpError(400, "Aksi tidak dikenal.");
});
