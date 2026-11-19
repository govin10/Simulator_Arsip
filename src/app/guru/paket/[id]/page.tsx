import { notFound } from "next/navigation";
import AppShell from "@/components/AppShell";
import PackageEditor from "@/components/teacher/PackageEditor";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEFAULT_WEIGHTS, isoDate, type Cabinet } from "@/lib/domain";

export default async function EditPackagePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["TEACHER", "ADMIN"]);
  const { id } = await params;
  const p = await db.package.findUnique({ where: { id }, include: { documents: { orderBy: { position: "asc" } }, retrievalTasks: { orderBy: { position: "asc" } }, _count: { select: { sessions: true } } } });
  if (!p) notFound();
  const attempts = await db.attempt.count({ where: { session: { packageId: id } } });
  const initial = {
    title: p.title, description: p.description, system: p.system, lockSystem: p.lockSystem, difficulty: p.difficulty, kind: p.kind,
    homeOrg: p.homeOrg, homeCity: p.homeCity, kkm: p.kkm, maxAttempts: p.maxAttempts, targetSeconds: p.targetSeconds, minAccuracyForTime: p.minAccuracyForTime,
    weights: { ...DEFAULT_WEIGHTS, ...(p.weights as Record<string, number>) }, metadataFields: p.metadataFields as string[],
    scenario: p.scenario as { enabled: boolean; errors: Record<string, number> }, cabinet: p.cabinet as unknown as Cabinet,
    documents: p.documents.map(({ packageId: _p, createdAt: _c, position: _pos, date, ...d }) => ({ ...d, date: isoDate(date) })),
    tasks: p.retrievalTasks.map((t) => ({ id: t.id, prompt: t.prompt, answerRef: t.answerDocumentId })),
  };
  return (
    <AppShell user={user} wide>
      <PackageEditor id={p.id} initial={initial} usage={{ sessions: p._count.sessions, attempts }} />
    </AppShell>
  );
}
