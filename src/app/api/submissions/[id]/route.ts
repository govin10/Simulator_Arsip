import { apiHandler, apiUser, HttpError } from "@/lib/auth";
import { db } from "@/lib/db";
import { loadVisibleSubmission } from "@/lib/submissions";

// Guru memberi nilai, atau mengembalikan untuk revisi
export const PATCH = apiHandler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await apiUser(["TEACHER", "ADMIN"]);
  const s = await loadVisibleSubmission(user, (await ctx.params).id);
  const b = await req.json();
  const feedback = String(b.feedback ?? "").slice(0, 2000) || null;
  if (b.action === "revision") {
    if (!feedback) throw new HttpError(400, "Tulis catatan apa yang perlu diperbaiki siswa.");
    await db.submission.update({ where: { id: s.id }, data: { status: "REVISION", feedback, score: null, gradedAt: new Date(), gradedById: user.id } });
  } else {
    const score = Number(String(b.score ?? "").replace(",", "."));
    if (b.score === "" || b.score == null || isNaN(score) || score < 0 || score > s.assignment.maxScore) throw new HttpError(400, `Nilai harus 0–${s.assignment.maxScore}.`);
    await db.submission.update({ where: { id: s.id }, data: { status: "GRADED", score: Math.round(score * 100) / 100, feedback, gradedAt: new Date(), gradedById: user.id } });
  }
  return Response.json({ ok: true });
});
