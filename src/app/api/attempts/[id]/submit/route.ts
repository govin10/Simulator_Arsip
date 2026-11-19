import { apiHandler, apiUser } from "@/lib/auth";
import { submitStage } from "@/lib/attempts";

export const POST = apiHandler(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const u = await apiUser(["STUDENT"]);
  const { stage, data } = await req.json();
  return Response.json(await submitStage((await ctx.params).id, u, stage, data));
});
