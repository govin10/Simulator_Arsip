import { apiHandler, apiUser } from "@/lib/auth";
import { startAttempt } from "@/lib/attempts";

export const POST = apiHandler(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await apiUser(["STUDENT"]);
  const a = await startAttempt((await ctx.params).id, u);
  return Response.json({ attemptId: a.id });
});
