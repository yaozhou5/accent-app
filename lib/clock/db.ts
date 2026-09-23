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
 * Runs saved before ArrayBuffer storage still hold `blob` directly — either
 * way this returns a run with a real Blob.
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

export async function updateRun(id: string, patch: Partial<Run>): Promise<Run | undefined> {
  const s = store_();
  if (!s) throw new ClockDbUnavailableError();
  const existingRaw = await get<AnyStoredRun>(id, s);
  if (!existingRaw) return undefined;
  const existing = normalizeRun(existingRaw);
  const updated: Run = { ...existing, ...patch };
  await set(id, await toStoredRun(updated), s);
  return updated;
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
