import { apiHandler, apiUser, HttpError } from "@/lib/auth";
import { assertCanSubmit, checkFeature, recordSubmission } from "@/lib/submissions";
import { saveLocal, storageMode } from "@/lib/storage";
import { MAX_PDF_BYTES } from "@/lib/tugas";

// Unggah ke folder lokal (hanya bila Vercel Blob belum diatur, mis. saat mencoba di komputer)
export const POST = apiHandler(async (req: Request) => {
  const user = await apiUser(["STUDENT"]);
  if (storageMode() !== "local") throw new HttpError(400, "Gunakan unggah Vercel Blob.");
  const form = await req.formData();
  const assignmentId = String(form.get("assignmentId") ?? "");
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "Pilih file PDF.");
  if (file.size > MAX_PDF_BYTES) throw new HttpError(400, "Ukuran file maksimal 20 MB.");
  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.subarray(0, 5).toString("latin1") !== "%PDF-") throw new HttpError(400, "File bukan PDF yang valid.");
  const { a } = await assertCanSubmit(user, assignmentId);
  checkFeature(a, form.get("feature"));
  let key: string;
  try { key = await saveLocal(assignmentId, user.id, buf); } catch (e) { throw new HttpError(500, (e as Error).message); }
  const s = await recordSubmission(user, assignmentId, { key, name: file.name, size: file.size }, form.get("feature"));
  return Response.json({ id: s.id });
});
