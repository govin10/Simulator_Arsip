import "server-only";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "./db";
import { HttpError } from "./auth";
import { DEFAULT_WEIGHTS, META_FIELDS, flattenCabinet, type Cabinet, type FilingSystem } from "./domain";
import { defaultCabinet } from "./templates";

const folderSchema: z.ZodType<{ id: string; label: string; code?: string; subfolders?: unknown[] }> = z.lazy(() =>
  z.object({ id: z.string().min(1), label: z.string().min(1), code: z.string().optional(), subfolders: z.array(folderSchema).optional() }),
);
export const cabinetSchema = z.object({
  drawers: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), guides: z.array(z.object({ id: z.string().min(1), label: z.string().min(1), folders: z.array(folderSchema) })) })).min(1),
});
const docSchema = z.object({
  id: z.string().optional(),
  number: z.string().min(1), date: z.string().min(8), sender: z.string().min(1), senderCity: z.string().default(""),
  recipient: z.string().min(1), recipientCity: z.string().default(""), subject: z.string().min(1), nature: z.string().default(""),
  summary: z.string().default(""), attachment: z.string().default(""), tricky: z.boolean().default(false),
  keyType: z.string().min(1), keyValue: z.string().min(1), keyCatchword: z.string().min(1), keyCatchAlt: z.array(z.string()).default([]),
  keyIndex: z.string().min(1), keyIndexAlt: z.array(z.string()).default([]), keyCode: z.string().min(1), keyCodeAlt: z.array(z.string()).default([]),
  keyFolderId: z.string().min(1), keySortKey: z.string().default(""), keyAccess: z.string().default("BIASA"), keyRetention: z.string().default("2 tahun"),
});
export const packageSchema = z.object({
  title: z.string().min(1), description: z.string().default(""),
  system: z.enum(["ABJAD", "NOMOR", "SUBJEK", "WILAYAH", "TANGGAL"]), lockSystem: z.boolean(),
  difficulty: z.coerce.number().int().min(1).max(3), kind: z.enum(["PRETEST", "LATIHAN", "POSTTEST"]),
  homeOrg: z.string().min(1), homeCity: z.string().default("Pasuruan"),
  kkm: z.coerce.number().int().min(0).max(100), maxAttempts: z.coerce.number().int().min(1).max(20),
  targetSeconds: z.coerce.number().int().min(10).max(3600), minAccuracyForTime: z.coerce.number().int().min(0).max(100),
  weights: z.record(z.coerce.number().min(0).max(100)),
  metadataFields: z.array(z.string()),
  scenario: z.object({ enabled: z.boolean(), errors: z.record(z.coerce.number().int().min(0).max(10)) }),
  cabinet: cabinetSchema,
  documents: z.array(docSchema),
  tasks: z.array(z.object({ id: z.string().optional(), prompt: z.string().min(1), answerRef: z.string().nullable() })),
});
export type PackageInput = z.infer<typeof packageSchema>;

export async function createBlankPackage(system: FilingSystem, title: string, userId: string) {
  return db.package.create({
    data: {
      title: title || "Paket baru", system, kind: "LATIHAN", homeOrg: "PT Karya Mandiri Pasuruan", cabinet: defaultCabinet(system),
      metadataFields: META_FIELDS.map((f) => f.key), weights: DEFAULT_WEIGHTS,
      scenario: { enabled: true, errors: { WRONG_FOLDER: 1, WRONG_CODE: 1, DUPLICATE: 1, MISSING_METADATA: 1, WRONG_ORDER: 1 } },
      createdById: userId,
    },
  });
}

/** Simpan paket lengkap. Dokumen & permintaan di-upsert berdasarkan id agar hasil lama tetap tertaut. */
export async function savePackage(id: string, input: PackageInput) {
  const locIds = new Set(flattenCabinet(input.cabinet as Cabinet).map((l) => l.id));
  const bad = input.documents.filter((d) => !locIds.has(d.keyFolderId));
  if (bad.length) throw new HttpError(400, `Lokasi kunci tidak ada di lemari untuk dokumen: ${bad.map((d) => d.number).join(", ")}`);
  const { documents, tasks, ...settings } = input;
  return db.$transaction(async (tx) => {
    await tx.package.update({ where: { id }, data: { ...settings, cabinet: input.cabinet as unknown as Prisma.InputJsonValue, weights: input.weights, scenario: input.scenario } });
    const existing = await tx.document.findMany({ where: { packageId: id }, select: { id: true } });
    const keep = new Set(documents.map((d) => d.id).filter(Boolean));
    await tx.document.deleteMany({ where: { packageId: id, id: { in: existing.map((e) => e.id).filter((x) => !keep.has(x)) } } });
    const refMap = new Map<string, string>(); // ref (id lama atau "new-i") -> id
    for (const [i, d] of documents.entries()) {
      const { id: did, date, ...rest } = d;
      const data = { ...rest, date: new Date(date.slice(0, 10) + "T00:00:00Z"), position: i };
      if (did && existing.some((e) => e.id === did)) { await tx.document.update({ where: { id: did }, data }); refMap.set(did, did); }
      else { const row = await tx.document.create({ data: { ...data, packageId: id } }); refMap.set(did ?? `new-${i}`, row.id); }
    }
    const oldTasks = await tx.retrievalTask.findMany({ where: { packageId: id }, select: { id: true } });
    const keepT = new Set(tasks.map((t) => t.id).filter(Boolean));
    await tx.retrievalTask.deleteMany({ where: { packageId: id, id: { in: oldTasks.map((t) => t.id).filter((x) => !keepT.has(x)) } } });
    for (const [i, t] of tasks.entries()) {
      const answerDocumentId = t.answerRef ? refMap.get(t.answerRef) ?? null : null;
      if (t.answerRef && !answerDocumentId) throw new HttpError(400, `Permintaan ${i + 1} menunjuk dokumen yang tidak ada.`);
      const data = { prompt: t.prompt, answerDocumentId, position: i };
      if (t.id && oldTasks.some((o) => o.id === t.id)) await tx.retrievalTask.update({ where: { id: t.id }, data });
      else await tx.retrievalTask.create({ data: { ...data, packageId: id } });
    }
  }, { timeout: 20000 });
}
