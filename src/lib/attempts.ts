import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { HttpError } from "./auth";
import type { SessionUser } from "./session-token";
import {
  buildScenario, computeScores, gradeProcess, gradeScenario, gradeStore, retrievalFindings, shuffle,
  type Item, type ProcessAnswers, type ScenarioState, type ScnReport, type StageResult, type StoreAnswers,
} from "./grading";
import type { Stage } from "./domain";

/** Kolom dokumen yang aman dikirim ke browser siswa (tanpa kunci jawaban). */
export const PUBLIC_DOC = {
  id: true, number: true, date: true, sender: true, senderCity: true, recipient: true, recipientCity: true,
  subject: true, nature: true, summary: true, attachment: true,
} as const;
export type PublicDoc = Prisma.DocumentGetPayload<{ select: typeof PUBLIC_DOC }> & { layout: string };

/** Bentuk fisik dokumen (yang memang terlihat pada dokumen asli). Arah surat masuk/keluar tidak dibocorkan. */
export function toPublic(d: Prisma.DocumentGetPayload<object>): PublicDoc {
  const layout = ["KUITANSI", "MEMO", "LAPORAN"].includes(d.keyType) ? d.keyType : "SURAT";
  return {
    id: d.id, number: d.number, date: d.date, sender: d.sender, senderCity: d.senderCity, recipient: d.recipient, recipientCity: d.recipientCity,
    subject: d.subject, nature: d.nature, summary: d.summary, attachment: d.attachment, layout,
  };
}

export async function loadOwnAttempt(attemptId: string, user: SessionUser) {
  const a = await db.attempt.findUnique({ where: { id: attemptId }, include: { session: { include: { package: true } } } });
  if (!a || a.studentId !== user.id) throw new HttpError(404, "Percobaan tidak ditemukan.");
  return a;
}

export async function startAttempt(sessionId: string, user: SessionUser) {
  const s = await db.practiceSession.findUnique({ where: { id: sessionId }, include: { package: { include: { documents: { select: { id: true } } } } } });
  if (!s || s.classroomId !== user.classroomId) throw new HttpError(404, "Sesi tidak ditemukan.");
  if (!s.active) throw new HttpError(400, "Sesi belum diaktifkan guru.");
  const existing = await db.attempt.findFirst({ where: { sessionId, studentId: user.id, status: "IN_PROGRESS" } });
  if (existing) return existing;
  const count = await db.attempt.count({ where: { sessionId, studentId: user.id } });
  if (count >= s.package.maxAttempts) throw new HttpError(400, `Batas percobaan (${s.package.maxAttempts}) sudah tercapai.`);
  return db.attempt.create({
    data: { sessionId, studentId: user.id, attemptNo: count + 1, docOrder: shuffle(s.package.documents.map((d) => d.id)) },
  });
}

export function nextStage(stage: Stage, scenarioEnabled: boolean): Stage {
  if (stage === "PROCESS") return "STORE";
  if (stage === "STORE") return "RETRIEVE";
  if (stage === "RETRIEVE") return scenarioEnabled ? "SCENARIO" : "DONE";
  return "DONE";
}

async function logErrors(attemptId: string, r: StageResult) {
  if (!r.findings.length) return;
  await db.errorLog.createMany({
    data: r.findings.map((f) => ({ attemptId, stage: f.stage, code: f.code, documentId: f.documentId ?? null, field: f.field ?? null, message: f.message })),
  });
}

export async function submitStage(attemptId: string, user: SessionUser, stage: Stage, data: unknown) {
  const a = await loadOwnAttempt(attemptId, user);
  if (a.status !== "IN_PROGRESS") throw new HttpError(400, "Percobaan sudah selesai.");
  if (a.stage !== stage) throw new HttpError(409, "Tahap ini sudah dikirim atau belum dibuka.");
  const pkg = a.session.package;
  const docs = await db.document.findMany({ where: { packageId: pkg.id }, orderBy: { position: "asc" } });
  const answers = (a.answers ?? {}) as Record<string, unknown>;
  const results = (a.results ?? {}) as Record<string, StageResult>;
  const scenarioEnabled = !!(pkg.scenario as { enabled?: boolean })?.enabled;
  let result: StageResult;
  const extra: Prisma.AttemptUpdateInput = {};

  if (stage === "PROCESS") {
    result = gradeProcess(pkg, docs, (data ?? {}) as ProcessAnswers);
  } else if (stage === "STORE") {
    result = gradeStore(pkg, docs, (data ?? { placements: {} }) as StoreAnswers, (answers.PROCESS ?? {}) as ProcessAnswers);
  } else if (stage === "RETRIEVE") {
    const tasks = await db.retrievalTask.findMany({ where: { packageId: pkg.id }, orderBy: { position: "asc" } });
    const rs = await db.retrievalResult.findMany({ where: { attemptId } });
    const pending = tasks.filter((t) => !rs.find((r) => r.taskId === t.id && r.answeredAt));
    if (pending.length) throw new HttpError(400, `Masih ada ${pending.length} permintaan yang belum dijawab.`);
    const joined = tasks.map((t) => ({ ...rs.find((r) => r.taskId === t.id)!, task: t }));
    result = retrievalFindings(joined, pkg.targetSeconds);
    // skor utama dihitung setelah tahap temu kembali
    const items: Item[] = [...(results.PROCESS?.items ?? []), ...(results.STORE?.items ?? []), ...result.items];
    extra.scores = computeScores(pkg, items, rs, a.helpCount, a.attemptNo) as unknown as Prisma.InputJsonValue;
  } else if (stage === "SCENARIO") {
    const state = a.scenarioState as unknown as ScenarioState;
    const g = gradeScenario(state, ((data as { reports?: ScnReport[] })?.reports ?? []), docs);
    result = g.result;
    extra.scenarioScore = g.score;
    answers.SCENARIO_SUMMARY = g.summary;
  } else throw new HttpError(400, "Tahap tidak dikenal.");

  const next = nextStage(stage, scenarioEnabled);
  if (next === "SCENARIO") extra.scenarioState = buildScenario(pkg, docs) as unknown as Prisma.InputJsonValue;
  if (next === "DONE") { extra.status = "FINISHED"; extra.finishedAt = new Date(); }
  answers[stage] = data;
  results[stage] = result;
  await db.attempt.update({
    where: { id: attemptId },
    data: { ...extra, stage: next, answers: answers as Prisma.InputJsonValue, results: results as unknown as Prisma.InputJsonValue, draft: {} },
  });
  await logErrors(attemptId, result);
  await db.event.create({ data: { attemptId, type: "SUBMIT_STAGE", payload: { stage, findings: result.findings.length } } });
  return { next, findings: result.findings.length };
}

/** Versi hasil yang aman untuk siswa: tanpa kolom `expected`. */
export function studentSafe(r?: StageResult) {
  if (!r) return null;
  return { gradedAt: r.gradedAt, findings: r.findings, items: r.items.map(({ expected: _e, ...rest }) => rest) };
}
