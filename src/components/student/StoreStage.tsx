"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors,
  type DragEndEvent, type DragOverEvent, type DragStartEvent,
} from "@dnd-kit/core";
import DocumentPaper, { type PublicDocument } from "./DocumentPaper";
import { SaveIndicator, clearLocalDraft, useAutosave, useEventLog } from "./hooks";
import { submitStage } from "./submit";
import type { Cabinet, FilingSystem, Folder, Location } from "@/lib/domain";

type Placements = Record<string, string[]>;
type Mine = Record<string, { catchword: string; code: string; location: string }>;

export default function StoreStage(p: {
  attemptId: string; homeOrg: string; system: FilingSystem; docs: PublicDocument[]; cabinet: Cabinet; locations: Location[];
  mine: Mine; initial: { placements: Placements } | null;
}) {
  const router = useRouter();
  const [placements, setPlacements] = useState<Placements>(() => p.initial?.placements ?? {});
  const [drawer, setDrawer] = useState(p.cabinet.drawers[0]?.id);
  const [dragging, setDragging] = useState<string | null>(null);
  const [viewing, setViewing] = useState<PublicDocument | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const log = useEventLog(p.attemptId);
  const data = useMemo(() => ({ placements }), [placements]);
  const status = useAutosave(p.attemptId, "STORE", data);
  const byId = useMemo(() => new Map(p.docs.map((d) => [d.id, d])), [p.docs]);
  const locById = useMemo(() => new Map(p.locations.map((l) => [l.id, l])), [p.locations]);
  const placedSet = new Set(Object.values(placements).flat());
  const tray = p.docs.filter((d) => !placedSet.has(d.id));
  const countIn = (drawerId: string) => p.locations.filter((l) => l.drawerId === drawerId).reduce((s, l) => s + (placements[l.id]?.length ?? 0), 0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function move(docId: string, folderId: string | null, beforeDocId?: string) {
    setPlacements((prev) => {
      const next: Placements = {};
      for (const [f, ids] of Object.entries(prev)) next[f] = ids.filter((x) => x !== docId);
      if (folderId) {
        const list = [...(next[folderId] ?? [])];
        const i = beforeDocId ? list.indexOf(beforeDocId) : -1;
        if (i >= 0) list.splice(i, 0, docId); else list.push(docId);
        next[folderId] = list;
      }
      return next;
    });
    log("PLACE", { docId, folderId, beforeDocId });
  }
  function shift(folderId: string, docId: string, dir: -1 | 1) {
    setPlacements((prev) => {
      const list = [...(prev[folderId] ?? [])];
      const i = list.indexOf(docId), j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return prev;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...prev, [folderId]: list };
    });
    log("REORDER", { docId, folderId, dir });
  }
  const folderOf = (docId: string) => Object.entries(placements).find(([, ids]) => ids.includes(docId))?.[0];

  function onDragStart(e: DragStartEvent) { setDragging(String(e.active.id).replace("drag:", "")); }
  function onDragOver(e: DragOverEvent) {
    const over = e.over?.id ? String(e.over.id) : "";
    if (over.startsWith("drawer:")) setDrawer(over.slice(7));
  }
  function onDragEnd(e: DragEndEvent) {
    setDragging(null);
    const docId = String(e.active.id).replace("drag:", "");
    const over = e.over?.id ? String(e.over.id) : "";
    if (!over) return;
    if (over === "tray") return move(docId, null);
    if (over.startsWith("folder:")) return move(docId, over.slice(7));
    if (over.startsWith("before:")) {
      const target = over.slice(7);
      if (target === docId) return;
      const f = folderOf(target);
      if (f) move(docId, f, target);
    }
  }

  async function submit() {
    if (tray.length && !confirm(`${tray.length} dokumen belum disimpan dan akan dihitung salah. Tetap kirim?`)) return;
    setBusy(true); setErr("");
    try {
      await submitStage(p.attemptId, "STORE", { placements });
      clearLocalDraft(p.attemptId, "STORE");
      router.push(`/siswa/percobaan/${p.attemptId}/umpan-balik?tahap=STORE`);
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  }

  const activeDrawer = p.cabinet.drawers.find((d) => d.id === drawer) ?? p.cabinet.drawers[0];
  useEffect(() => { log("OPEN_DRAWER", { drawerId: activeDrawer?.id }); }, [activeDrawer?.id, log]);

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
      <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <Tray>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Meja kerja — belum disimpan ({tray.length})</h2>
            <SaveIndicator status={status} />
          </div>
          <p className="mt-1 text-xs text-stone-500">Seret kartu ke folder, atau gunakan menu &ldquo;Simpan ke&rdquo;. Seret ke label laci untuk berpindah laci.</p>
          <ul className="mt-3 space-y-2">
            {tray.map((d) => (
              <li key={d.id}>
                <DocCard doc={d} mine={p.mine[d.id]} locations={p.locations} onView={() => { setViewing(d); log("OPEN_DOC", { docId: d.id, stage: "STORE" }); }}
                  onPick={(f) => { move(d.id, f); const l = locById.get(f); if (l) setDrawer(l.drawerId); }} />
              </li>
            ))}
            {!tray.length && <li className="rounded-lg border border-dashed border-stone-300 p-4 text-center text-sm text-stone-500">Semua dokumen sudah disimpan. Periksa urutannya, lalu kirim.</li>}
          </ul>
          <button className="btn btn-primary mt-4 w-full" onClick={submit} disabled={busy}>{busy ? "Memeriksa…" : "Kirim tahap 2"}</button>
          {err && <p className="mt-2 text-xs text-red-700">{err}</p>}
        </Tray>

        <section aria-label="Lemari arsip" className="self-start rounded-2xl bg-kayu-700 p-3 shadow-inner sm:p-4">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Laci">
            {p.cabinet.drawers.map((d) => (
              <DrawerTab key={d.id} id={d.id} label={d.label} count={countIn(d.id)} active={d.id === activeDrawer?.id} onClick={() => setDrawer(d.id)} />
            ))}
          </div>
          {activeDrawer && (
            <div className="mt-3 grid gap-3 rounded-xl bg-kayu-100 p-3 sm:grid-cols-2 xl:grid-cols-3" role="tabpanel">
              {activeDrawer.guides.map((g) => (
                <div key={g.id} className="rounded-lg border border-kayu-300 bg-white/60">
                  <div className="rounded-t-lg bg-kayu-500 px-3 py-1.5 text-sm font-bold text-white">{g.label}</div>
                  <div className="space-y-2 p-2">
                    {g.folders.map((f) => (
                      <FolderBlock key={f.id} folder={f} placements={placements} byId={byId} onShift={shift} onRemove={(id) => move(id, null)}
                        onView={(d) => { setViewing(d); log("OPEN_DOC", { docId: d.id, stage: "STORE" }); }} dragging={dragging} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <DragOverlay>{dragging && byId.get(dragging) ? <MiniCard doc={byId.get(dragging)!} lifted /> : null}</DragOverlay>
      {viewing && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black/50 p-4" onClick={() => setViewing(null)} role="dialog" aria-modal>
          <div className="mx-auto max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <DocumentPaper doc={viewing} homeOrg={p.homeOrg} />
            <button className="btn mx-auto mt-3 flex" onClick={() => setViewing(null)}>Tutup</button>
          </div>
        </div>
      )}
    </DndContext>
  );
}

function Tray({ children }: { children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "tray" });
  return <aside ref={setNodeRef} className={`card h-fit p-3 lg:sticky lg:top-20 ${isOver ? "ring-2 ring-brand-500" : ""}`}>{children}</aside>;
}

function DrawerTab({ id, label, count, active, onClick }: { id: string; label: string; count: number; active: boolean; onClick: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `drawer:${id}` });
  return (
    <button ref={setNodeRef} role="tab" aria-selected={active} onClick={onClick}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold shadow ${active ? "bg-kayu-100 text-kayu-700" : "bg-kayu-500 text-white hover:bg-kayu-300 hover:text-kayu-700"} ${isOver ? "ring-2 ring-white" : ""}`}>
      <span className="h-1.5 w-5 rounded bg-current opacity-60" aria-hidden />{label}
      <span className="badge bg-white/70 text-kayu-700">{count}</span>
    </button>
  );
}

function FolderBlock({ folder, placements, byId, onShift, onRemove, onView, dragging }: {
  folder: Folder; placements: Placements; byId: Map<string, PublicDocument>; dragging: string | null;
  onShift: (f: string, d: string, dir: -1 | 1) => void; onRemove: (d: string) => void; onView: (d: PublicDocument) => void;
}) {
  if (folder.subfolders?.length)
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 p-1.5">
        <p className="px-1 text-xs font-semibold text-amber-900">{folder.label}</p>
        <div className="mt-1 space-y-1.5 pl-2">
          {folder.subfolders.map((s) => <FolderBlock key={s.id} folder={s} placements={placements} byId={byId} onShift={onShift} onRemove={onRemove} onView={onView} dragging={dragging} />)}
        </div>
      </div>
    );
  return <DropFolder folder={folder} ids={placements[folder.id] ?? []} byId={byId} onShift={onShift} onRemove={onRemove} onView={onView} dragging={dragging} />;
}

function DropFolder({ folder, ids, byId, onShift, onRemove, onView, dragging }: {
  folder: Folder; ids: string[]; byId: Map<string, PublicDocument>; dragging: string | null;
  onShift: (f: string, d: string, dir: -1 | 1) => void; onRemove: (d: string) => void; onView: (d: PublicDocument) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `folder:${folder.id}` });
  return (
    <div ref={setNodeRef} className={`rounded-md border-2 p-1.5 transition ${isOver ? "border-brand-500 bg-brand-50" : dragging ? "border-dashed border-amber-400 bg-amber-50" : "border-amber-200 bg-amber-50/70"}`}>
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-amber-900">📁 {folder.label}</span>
        <span className="text-[10px] text-amber-800">{ids.length} arsip</span>
      </div>
      {ids.length > 0 && (
        <ol className="mt-1 space-y-1">
          {ids.map((id, i) => {
            const d = byId.get(id);
            if (!d) return null;
            return (
              <li key={id} className="flex items-center gap-1">
                <span className="w-4 text-right text-[10px] text-stone-500">{i + 1}</span>
                <div className="min-w-0 flex-1"><InFolder doc={d} onView={() => onView(d)} /></div>
                <button className="btn btn-sm px-1.5" aria-label="Naikkan" disabled={i === 0} onClick={() => onShift(folder.id, id, -1)}>↑</button>
                <button className="btn btn-sm px-1.5" aria-label="Turunkan" disabled={i === ids.length - 1} onClick={() => onShift(folder.id, id, 1)}>↓</button>
                <button className="btn btn-sm px-1.5" aria-label="Keluarkan ke meja" onClick={() => onRemove(id)}>✕</button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function InFolder({ doc, onView }: { doc: PublicDocument; onView: () => void }) {
  const drag = useDraggable({ id: `drag:${doc.id}` });
  const drop = useDroppable({ id: `before:${doc.id}` });
  return (
    <div ref={(n) => { drag.setNodeRef(n); drop.setNodeRef(n); }} {...drag.attributes} {...drag.listeners}
      className={`cursor-grab touch-none rounded border bg-white px-2 py-1 text-xs shadow-sm ${drop.isOver ? "border-t-4 border-t-brand-500" : "border-stone-200"} ${drag.isDragging ? "opacity-40" : ""}`}>
      <button type="button" className="block w-full truncate text-left" onClick={onView} onPointerDown={(e) => e.stopPropagation()}>
        <strong>{doc.number}</strong> · {shortName(doc)}
      </button>
    </div>
  );
}

const shortName = (d: PublicDocument) => `${d.sender.replace(/\s*\(.*\)$/, "")} → ${d.recipient.replace(/\s*\(.*\)$/, "")}`;

function MiniCard({ doc, lifted }: { doc: PublicDocument; lifted?: boolean }) {
  return (
    <div className={`rounded-lg border border-stone-300 bg-white p-2 text-xs ${lifted ? "rotate-2 shadow-xl" : ""}`}>
      <strong>{doc.number}</strong> — {doc.subject}
    </div>
  );
}

function DocCard({ doc, mine, locations, onView, onPick }: { doc: PublicDocument; mine?: Mine[string]; locations: Location[]; onView: () => void; onPick: (f: string) => void }) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: `drag:${doc.id}` });
  return (
    <div ref={setNodeRef} className={`rounded-lg border border-stone-200 bg-stone-50 p-2.5 ${isDragging ? "opacity-40" : ""}`}>
      <div {...attributes} {...listeners} className="cursor-grab touch-none">
        <p className="text-sm font-semibold">{doc.number === "-" ? "(tanpa nomor)" : doc.number} <span className="font-normal text-stone-500">· ⠿ seret</span></p>
        <p className="text-sm">{doc.subject}</p>
        <p className="text-xs text-stone-600">{shortName(doc)}</p>
        {mine && (mine.catchword || mine.code) && <p className="mt-1 text-xs text-brand-800">Catatanmu: kata tangkap <strong>{mine.catchword || "-"}</strong>, kode <strong>{mine.code || "-"}</strong></p>}
      </div>
      <div className="mt-2 flex gap-2">
        <button className="btn btn-sm" onClick={onView}>Baca</button>
        <select className="input py-1 text-xs" aria-label={`Simpan dokumen ${doc.number} ke`} value="" onChange={(e) => e.target.value && onPick(e.target.value)}>
          <option value="">Simpan ke… (tanpa seret)</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.path}</option>)}
        </select>
      </div>
    </div>
  );
}
