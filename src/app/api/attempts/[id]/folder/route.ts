import { apiHandler, apiUser, HttpError } from "@/lib/auth";
import { loadOwnAttempt } from "@/lib/attempts";
import { db } from "@/lib/db";
import { expectedOrder } from "@/lib/grading";
import type { FilingSystem } from "@/lib/domain";

// Isi satu folder pada lemari "kantor" (susunan benar) untuk tahap temu kembali
export const GET = apiHandler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await apiUser(["STUDENT"]);
  const { id } = await ctx.params;
  const a = await loadOwnAttempt(id, u);
  if (a.stage !== "RETRIEVE") throw new HttpError(409, "Bukan tahap temu kembali.");
  const folderId = new URL(req.url).searchParams.get("folderId") ?? "";
  const docs = await db.document.findMany({ where: { packageId: a.session.packageId, keyFolderId: folderId } });
  const tabs = expectedOrder(a.session.package.system as FilingSystem, docs).map((d) => ({ id: d.id, number: d.number, label: d.keyIndex, code: d.keyCode }));
  return Response.json({ tabs });
});
