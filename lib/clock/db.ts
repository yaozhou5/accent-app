import { clear, createStore, del, get, keys, set } from "idb-keyval";
import { chunksToSentences } from "./sentences";
import type { Run } from "./types";

function getStore() {
  if (typeof indexedDB === "undefined") return null;
  try {
    return createStore("accent-clock", "runs");
  } catch {
    return null;
  }
}

let store: ReturnType<typeof createStore> | null | undefined;

function store_() {
  if (store === undefined) store = getStore();
  return store;
}

export class ClockDbUnavailableError extends Error {
  constructor() {
    super("IndexedDB is unavailable in this browser.");
    this.name = "ClockDbUnavailableError";
  }
}

export function isDbAvailable(): boolean {
  return store_() !== null;
}

// What's actually written to IndexedDB — audio as an ArrayBuffer rather than
// a Blob. Safari has a documented history of unreliable Blob storage in
// IndexedDB (intermittent DataCloneError, or writes that "succeed" but read
// back corrupted); ArrayBuffer is the safer, more portable representation.
// mimeType (already a field on Run) is enough to reconstruct the Blob.
type StoredRun = Omit<Run, "blob"> & { audioBuffer: ArrayBuffer };

// Runs saved before this change still have `blob` as a real Blob — read-time
// normalization (below) upgrades them to the same in-memory shape either way.
type AnyStoredRun = StoredRun | Run;

function hasAudioBuffer(run: AnyStoredRun): run is StoredRun {
  return "audioBuffer" in run;
}

async function toStoredRun(run: Run): Promise<StoredRun> {
  const { blob, ...rest } = run;
  return { ...rest, audioBuffer: await blob.arrayBuffer() };
}

/**
 * Runs saved before `pointStatus` existed only have the old `pointMs`
 * field — treat them as unmarked. Runs saved before sentence-splitting
 * existed have `chunks` but no `sentences` — derive them here so old
 * transcripts get clickable whole sentences too, without a migration.
 * Runs saved before the script step existed have no `script` field at all.
 * Runs saved before chips existed have no `selectedChipIds`/`criteriaOverrides`/
 * `aiCheckResults`. Runs saved under the old weekly-challenge system may
 * still carry a `challengeId` field — it's simply ignored now. Runs saved
 * before the two-step review flow existed have no `marks`/`selfRating`/
 * `listenedAt` — a null `listenedAt` is also how a genuinely-new unreviewed
 * run is told apart from one of these older, already-decided runs.
 * Runs saved before ArrayBuffer storage still hold `blob` directly — either
 * way this returns a run with a real Blob. Runs saved before word fixes
 * existed have no `wordFixes`/`wordFixesVersion`, and any existing
 * aiCheckResults entries predate `wordFixesVersionAtCheck`.
 */
function normalizeRun(run: AnyStoredRun): Run {
  let next: Run;
  if (hasAudioBuffer(run)) {
    const { audioBuffer, ...rest } = run;
    next = { ...rest, blob: new Blob([audioBuffer], { type: run.mimeType }) };
  } else {
    next = run;
  }
  if (!next.pointStatus) next = { ...next, pointStatus: "unmarked" };
  if (next.transcript && !next.transcript.sentences) {
    next = { ...next, transcript: { ...next.transcript, sentences: chunksToSentences(next.transcript.chunks) } };
  }
  if (next.script === undefined) next = { ...next, script: null };
  if (next.selectedChipIds === undefined) next = { ...next, selectedChipIds: [] };
  if (next.criteriaOverrides === undefined) next = { ...next, criteriaOverrides: {} };
  if (next.aiCheckResults === undefined) next = { ...next, aiCheckResults: {} };
  if (next.marks === undefined) next = { ...next, marks: [] };
  if (next.selfRating === undefined) next = { ...next, selfRating: null };
  if (next.listenedAt === undefined) next = { ...next, listenedAt: null };
  if (next.wordFixes === undefined) next = { ...next, wordFixes: {} };
  if (next.wordFixesVersion === undefined) next = { ...next, wordFixesVersion: 0 };
  if (Object.values(next.aiCheckResults).some((r) => r.wordFixesVersionAtCheck === undefined)) {
    next = {
      ...next,
      aiCheckResults: Object.fromEntries(
        Object.entries(next.aiCheckResults).map(([id, r]) => [
          id,
          { ...r, wordFixesVersionAtCheck: r.wordFixesVersionAtCheck ?? 0 },
        ])
      ),
    };
  }
  return next;
}

export async function listRuns(): Promise<Run[]> {
  const s = store_();
  if (!s) return [];
  const allKeys = await keys(s);
  const runs = await Promise.all(allKeys.map((k) => get<AnyStoredRun>(k, s)));
  return runs
    .filter((r): r is AnyStoredRun => Boolean(r))
    .map(normalizeRun)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveRun(run: Run): Promise<void> {
  const s = store_();
  if (!s) throw new ClockDbUnavailableError();
  await set(run.id, await toStoredRun(run), s);
}

// get() and set() are each their own IndexedDB transaction, not one atomic
// read-modify-write — two concurrent updateRun calls for the same id can
// both get() before either set() lands, so the second call's patch is
// computed from a base that doesn't yet include the first call's change,
// and whichever set() commits last silently wins. Queued per id below so
// concurrent calls run strictly one at a time: each one's get() is
// guaranteed to see the previous one's set() already committed. A handful
// of run ids exist per session at most, so this map is never meaningfully
// large; a failed update still lets the next queued one proceed.
const pendingUpdates = new Map<string, Promise<unknown>>();

async function doUpdateRun(
  id: string,
  patch: Partial<Run> | ((existing: Run) => Partial<Run>)
): Promise<Run | undefined> {
  const s = store_();
  if (!s) throw new ClockDbUnavailableError();
  const existingRaw = await get<AnyStoredRun>(id, s);
  if (!existingRaw) return undefined;
  const existing = normalizeRun(existingRaw);
  const resolvedPatch = typeof patch === "function" ? patch(existing) : patch;
  const updated: Run = { ...existing, ...resolvedPatch };
  await set(id, await toStoredRun(updated), s);
  return updated;
}

/**
 * `patch` may be a function of the current record instead of a static
 * object — needed by any caller deriving the new value from a field that
 * already holds a collection (marks, criteriaOverrides, aiCheckResults):
 * reading that field from React state risks a stale snapshot (see
 * ClockApp.tsx), but `existing` here is always the record actually on
 * disk, read fresh at the moment this call's turn in the queue arrives.
 */
export function updateRun(
  id: string,
  patch: Partial<Run> | ((existing: Run) => Partial<Run>)
): Promise<Run | undefined> {
  const previous = pendingUpdates.get(id) ?? Promise.resolve();
  const next = previous.then(() => doUpdateRun(id, patch));
  pendingUpdates.set(
    id,
    next.catch(() => {})
  );
  return next;
}

export async function deleteRun(id: string): Promise<void> {
  const s = store_();
  if (!s) return;
  await del(id, s);
}

export async function deleteAllRuns(): Promise<void> {
  const s = store_();
  if (!s) return;
  await clear(s);
}
