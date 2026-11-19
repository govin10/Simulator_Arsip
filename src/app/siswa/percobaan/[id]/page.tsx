import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import ProcessStage from "@/components/student/ProcessStage";
import StoreStage from "@/components/student/StoreStage";
import RetrieveStage from "@/components/student/RetrieveStage";
import ScenarioStage from "@/components/student/ScenarioStage";
import StageHeader from "@/components/student/StageHeader";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { toPublic } from "@/lib/attempts";
import { flattenCabinet, type Cabinet, type FilingSystem } from "@/lib/domain";
import type { ProcessAnswers, ScenarioState } from "@/lib/grading";

export default async function AttemptPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["STUDENT"]);
  const { id } = await params;
  const a = await db.attempt.findUnique({ where: { id }, include: { session: { include: { package: true } } } });
  if (!a || a.studentId !== user.id) redirect("/siswa");
  if (a.status === "FINISHED") redirect(`/siswa/percobaan/${id}/hasil`);
  const pkg = a.session.package;
  const cabinet = pkg.cabinet as unknown as Cabinet;
  const locations = flattenCabinet(cabinet);
  const draft = (a.draft as { stage?: string; data?: unknown }) ?? {};
  const initial = draft.stage === a.stage ? draft.data : null;
  const rawDocs = await db.document.findMany({ where: { packageId: pkg.id } });
  const order = new Map(a.docOrder.map((d, i) => [d, i]));
  const docs = rawDocs.sort((x, y) => (order.get(x.id) ?? 0) - (order.get(y.id) ?? 0)).map(toPublic);
  const common = { attemptId: a.id, homeOrg: pkg.homeOrg, system: pkg.system as FilingSystem };
  const scenarioEnabled = !!(pkg.scenario as { enabled?: boolean })?.enabled;

  let body: React.ReactNode = null;
  if (a.stage === "PROCESS") {
    body = <ProcessStage {...common} docs={docs} locations={locations} lockSystem={pkg.lockSystem} metadataFields={pkg.metadataFields as string[]} initial={initial as ProcessAnswers | null} />;
  } else if (a.stage === "STORE") {
    const proc = ((a.answers as Record<string, unknown>).PROCESS ?? {}) as ProcessAnswers;
    const mine = Object.fromEntries(Object.entries(proc).map(([k, v]) => [k, { catchword: v.catchword ?? "", code: v.code ?? "", location: v.meta?.location ?? "" }]));
    body = <StoreStage {...common} docs={docs} cabinet={cabinet} locations={locations} mine={mine} initial={initial as { placements: Record<string, string[]> } | null} />;
  } else if (a.stage === "RETRIEVE") {
    const tasks = await db.retrievalTask.findMany({ where: { packageId: pkg.id }, orderBy: { position: "asc" }, select: { id: true, prompt: true } });
    const rs = await db.retrievalResult.findMany({ where: { attemptId: a.id } });
    body = <RetrieveStage {...common} cabinet={cabinet} targetSeconds={pkg.targetSeconds}
      tasks={tasks.map((t) => { const r = rs.find((x) => x.taskId === t.id); return { ...t, answered: !!r?.answeredAt, durationMs: r?.durationMs ?? null }; })} />;
  } else if (a.stage === "SCENARIO") {
    const st = a.scenarioState as unknown as ScenarioState;
    const byId = new Map(rawDocs.map((d) => [d.id, d]));
    const folders = Object.fromEntries(Object.entries(st.folders).map(([f, tabs]) => [f, tabs.map((t) => ({ tabId: t.tabId, docId: t.docId, code: t.code, number: byId.get(t.docId)?.number ?? "", label: byId.get(t.docId)?.keyIndex ?? "" }))]));
    body = <ScenarioStage {...common} cabinet={cabinet} locations={locations} folders={folders} cards={st.cards} docs={docs} initial={initial as never} />;
  }

  return (
    <AppShell user={user} wide>
      <StageHeader title={a.session.title} pkgTitle={pkg.title} system={pkg.system} stage={a.stage} attemptNo={a.attemptNo} attemptId={a.id} scenarioEnabled={scenarioEnabled} />
      {body}
    </AppShell>
  );
}
