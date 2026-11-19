import { apiHandler, apiUser } from "@/lib/auth";
import { loadOwnAttempt } from "@/lib/attempts";
import { db } from "@/lib/db";

// Log kejadian (buka dokumen, ubah jawaban, seret dokumen, dst.)
export const POST = apiHandler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await apiUser(["STUDENT"]);
  const { id } = await ctx.params;
  await loadOwnAttempt(id, u);
  const { events } = (await req.json()) as { events: { type: string; payload?: object; t?: string }[] };
  const list = (events ?? []).slice(0, 200);
  if (list.length)
    await db.event.createMany({
      data: list.map((e) => ({ attemptId: id, type: String(e.type).slice(0, 40), payload: e.payload ?? {}, createdAt: e.t ? new Date(e.t) : new Date() })),
    });
  return Response.json({ ok: true });
});
