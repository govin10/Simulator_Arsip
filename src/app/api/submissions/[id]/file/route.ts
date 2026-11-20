import { apiHandler, apiUser } from "@/lib/auth";
import { loadVisibleSubmission } from "@/lib/submissions";
import { blobFileResponse, readLocal } from "@/lib/storage";

// Membuka PDF (hanya pemilik atau guru kelasnya). Alamat asli file tidak ditampilkan di halaman.
export const GET = apiHandler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const user = await apiUser();
  const s = await loadVisibleSubmission(user, (await ctx.params).id);
  if (s.fileKey.startsWith("local:")) {
    const data = await readLocal(s.fileKey);
    return new Response(new Uint8Array(data), {
      headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${encodeURIComponent(s.fileName)}"`, "Cache-Control": "private, no-store" },
    });
  }
  return blobFileResponse(s.fileKey, s.fileName);
});
