import { apiHandler, apiUser, HttpError } from "@/lib/auth";
import { db } from "@/lib/db";

export const POST = apiHandler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await apiUser(["TEACHER", "ADMIN"]);
  const { id } = await ctx.params;
  const p = await db.package.findUnique({ where: { id }, include: { documents: true, retrievalTasks: true } });
  if (!p) throw new HttpError(404, "Paket tidak ditemukan.");
  const { id: _i, createdAt: _c, updatedAt: _u, documents, retrievalTasks, createdById: _cb, ...rest } = p;
  const copy = await db.package.create({ data: { ...rest, title: `${p.title} (salinan)`, createdById: u.id, cabinet: p.cabinet ?? {}, metadataFields: p.metadataFields ?? [], weights: p.weights ?? {}, scenario: p.scenario ?? {} } });
  const map = new Map<string, string>();
  for (const d of documents) {
    const { id: did, packageId: _p, createdAt: _dc, ...dr } = d;
    const row = await db.document.create({ data: { ...dr, packageId: copy.id } });
    map.set(did, row.id);
  }
  for (const t of retrievalTasks)
    await db.retrievalTask.create({ data: { packageId: copy.id, position: t.position, prompt: t.prompt, answerDocumentId: t.answerDocumentId ? map.get(t.answerDocumentId) ?? null : null } });
  return Response.json({ id: copy.id });
});
