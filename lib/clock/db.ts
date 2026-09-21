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

/**
 * Runs saved before `pointStatus` existed only have the old `pointMs`
 * field — treat them as unmarked. Runs saved before sentence-splitting
 * existed have `chunks` but no `sentences` — derive them here so old
 * transcripts get clickable whole sentences too, without a migration.
 */
function normalizeRun(run: Run): Run {
  let next = run;
  if (!next.pointStatus) next = { ...next, pointStatus: "unmarked" };
  if (next.transcript && !next.transcript.sentences) {
    next = { ...next, transcript: { ...next.transcript, sentences: chunksToSentences(next.transcript.chunks) } };
  }
  return next;
}

export async function listRuns(): Promise<Run[]> {
  const s = store_();
  if (!s) return [];
  const allKeys = await keys(s);
  const runs = await Promise.all(allKeys.map((k) => get<Run>(k, s)));
  return runs
    .filter((r): r is Run => Boolean(r))
    .map(normalizeRun)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function saveRun(run: Run): Promise<void> {
  const s = store_();
  if (!s) throw new ClockDbUnavailableError();
  await set(run.id, run, s);
}

export async function updateRun(id: string, patch: Partial<Run>): Promise<Run | undefined> {
  const s = store_();
  if (!s) throw new ClockDbUnavailableError();
  const existing = await get<Run>(id, s);
  if (!existing) return undefined;
  const updated: Run = { ...existing, ...patch };
  await set(id, updated, s);
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
