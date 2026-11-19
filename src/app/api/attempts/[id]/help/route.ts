import { apiHandler, apiUser } from "@/lib/auth";
import { loadOwnAttempt } from "@/lib/attempts";
import { db } from "@/lib/db";
import { STAGE_HINTS, SYSTEM_HINTS, type FilingSystem } from "@/lib/domain";

// Petunjuk singkat; setiap permintaan dihitung sebagai "bantuan"
export const POST = apiHandler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await apiUser(["STUDENT"]);
  const { id } = await ctx.params;
  const a = await loadOwnAttempt(id, u);
  await db.attempt.update({ where: { id }, data: { helpCount: { increment: 1 } } });
  await db.event.create({ data: { attemptId: id, type: "HELP", payload: { stage: a.stage } } });
  return Response.json({
    system: SYSTEM_HINTS[a.session.package.system as FilingSystem],
    stage: STAGE_HINTS[a.stage] ?? [],
    helpCount: a.helpCount + 1,
  });
});
