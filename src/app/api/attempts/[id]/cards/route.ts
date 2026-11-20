import { apiHandler, apiUser, HttpError } from "@/lib/auth";
import { loadOwnAttempt } from "@/lib/attempts";
import { db } from "@/lib/db";
import { flattenCabinet, isoDate, normText, type Cabinet } from "@/lib/domain";

// Register kartu kendali kantor: pencarian lewat pengirim, perihal, kode, tanggal, lokasi
export const GET = apiHandler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await apiUser(["STUDENT"]);
  const { id } = await ctx.params;
  const a = await loadOwnAttempt(id, u);
  if (a.stage !== "RETRIEVE") throw new HttpError(409, "Bukan tahap temu kembali.");
  const q = normText(new URL(req.url).searchParams.get("q") ?? "");
  if (q.length < 2) return Response.json({ cards: [] });
  const locs = new Map(flattenCabinet(a.session.package.cabinet as unknown as Cabinet).map((l) => [l.id, l.path]));
  const docs = await db.document.findMany({ where: { packageId: a.session.packageId } });
  const cards = docs
    .map((d) => ({ number: d.number, date: isoDate(d.date), from: d.sender, to: d.recipient, subject: d.subject, code: d.keyCode, location: locs.get(d.keyFolderId) ?? "-" }))
    .filter((c) => q.split(" ").every((t) => normText(Object.values(c).join(" ")).includes(t)))
    .slice(0, 8);
  return Response.json({ cards });
});
