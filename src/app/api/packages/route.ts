import { apiHandler, apiUser } from "@/lib/auth";
import { createBlankPackage } from "@/lib/packages";
import type { FilingSystem } from "@/lib/domain";

export const POST = apiHandler(async (req: Request) => {
  const u = await apiUser(["TEACHER", "ADMIN"]);
  const b = await req.json();
  const system = (["ABJAD", "NOMOR", "SUBJEK", "WILAYAH", "TANGGAL"].includes(b.system) ? b.system : "ABJAD") as FilingSystem;
  const p = await createBlankPackage(system, String(b.title ?? ""), u.id);
  return Response.json({ id: p.id });
});
