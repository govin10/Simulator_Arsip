import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { apiUser, HttpError } from "@/lib/auth";
import { assertCanSubmit, checkFeature } from "@/lib/submissions";
import { blobPrefix, blobToken } from "@/lib/storage";
import { MAX_PDF_BYTES } from "@/lib/tugas";

// Memberi token unggah langsung ke Vercel Blob (file tidak melewati server, jadi PDF besar tetap bisa).
export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;
  try {
    const result = await handleUpload({
      body, request: req, token: blobToken(),
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const user = await apiUser(["STUDENT"]);
        let assignmentId = "", feature: unknown = null;
        try { ({ assignmentId, feature } = JSON.parse(String(clientPayload ?? "{}"))); } catch { assignmentId = String(clientPayload ?? ""); }
        const { a } = await assertCanSubmit(user, assignmentId);
        checkFeature(a, feature);
        if (!pathname.startsWith(blobPrefix(assignmentId, user.id))) throw new HttpError(400, "Lokasi file tidak valid.");
        return { allowedContentTypes: ["application/pdf"], maximumSizeInBytes: MAX_PDF_BYTES, addRandomSuffix: true };
      },
      onUploadCompleted: async () => {},
    });
    return Response.json(result);
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 400;
    return Response.json({ error: (e as Error).message }, { status });
  }
}
