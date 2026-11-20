import { apiHandler, apiUser, HttpError } from "@/lib/auth";
import { db } from "@/lib/db";
import { packageSchema, savePackage } from "@/lib/packages";

export const PUT = apiHandler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await apiUser(["TEACHER", "ADMIN"]);
  const { id } = await ctx.params;
  if (!(await db.package.findUnique({ where: { id } }))) throw new HttpError(404, "Paket tidak ditemukan.");
  const parsed = packageSchema.safeParse(await req.json());
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    throw new HttpError(400, `Data belum lengkap: ${i.path.join(" › ")} (${i.message})`);
  }
  await savePackage(id, parsed.data);
  return Response.json({ ok: true });
});
export const DELETE = apiHandler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await apiUser(["TEACHER", "ADMIN"]);
  const { id } = await ctx.params;
  const p = await db.package.findUnique({ where: { id }, include: { _count: { select: { sessions: true } } } });
  if (!p) throw new HttpError(404, "Paket tidak ditemukan.");
  if (u.role !== "ADMIN" && p.createdById && p.createdById !== u.id) throw new HttpError(403, "Hanya pembuat paket atau admin yang dapat menghapus.");
  if (p._count.sessions) throw new HttpError(400, "Paket masih dipakai sesi praktik. Hapus sesinya terlebih dahulu.");
  await db.package.delete({ where: { id } });
  return Response.json({ ok: true });
});
