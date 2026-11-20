import { head } from "@vercel/blob";
import { apiHandler, apiUser, HttpError } from "@/lib/auth";
import { recordSubmission } from "@/lib/submissions";
import { blobToken, isOurBlobUrl } from "@/lib/storage";
import { MAX_PDF_BYTES } from "@/lib/tugas";

// Mencatat file yang sudah diunggah ke Vercel Blob
export const POST = apiHandler(async (req: Request) => {
  const user = await apiUser(["STUDENT"]);
  const { assignmentId, url, fileName } = await req.json();
  if (!isOurBlobUrl(String(url), String(assignmentId), user.id)) throw new HttpError(400, "File tidak valid.");
  const meta = await head(url, { token: blobToken() }).catch(() => null);
  if (!meta) throw new HttpError(400, "File tidak ditemukan di penyimpanan.");
  if (meta.contentType !== "application/pdf" || meta.size > MAX_PDF_BYTES) throw new HttpError(400, "File harus PDF dan maksimal 20 MB.");
  const s = await recordSubmission(user, assignmentId, { key: url, name: String(fileName ?? "tugas.pdf"), size: meta.size });
  return Response.json({ id: s.id });
});
