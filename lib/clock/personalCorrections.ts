import { createStore, get, set } from "idb-keyval";
import type { PersonalCorrection } from "./wordFixes";

// A separate database from the runs store (lib/clock/db.ts) and the script
// draft store (lib/clock/scriptDraft.ts) — same reasoning as scriptDraft.ts:
// idb-keyval's createStore() opens its database without a version number,
// so reusing an existing database name for a new store never triggers the
// upgrade that would actually create it. Never synced — this stays local,
// same guarantee as marks and selfRating.
function getStore() {
  if (typeof indexedDB === "undefined") return null;
  try {
    return createStore("accent-clock-corrections", "corrections");
  } catch {
    return null;
  }
}

let store: ReturnType<typeof createStore> | null | undefined;

function store_() {
  if (store === undefined) store = getStore();
  return store;
}

const KEY = "corrections";

export async function loadPersonalCorrections(): Promise<PersonalCorrection[]> {
  const s = store_();
  if (!s) return [];
  try {
    const value = await get<PersonalCorrection[]>(KEY, s);
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

async function savePersonalCorrections(corrections: PersonalCorrection[]): Promise<void> {
  const s = store_();
  if (!s) return;
  try {
    await set(KEY, corrections, s);
  } catch {
    // IndexedDB unavailable or blocked — the rule just won't persist.
  }
}

/** Replaces any existing rule with the same `from` (case-insensitive) rather than accumulating duplicates. */
export async function addPersonalCorrection(correction: PersonalCorrection): Promise<PersonalCorrection[]> {
  const current = await loadPersonalCorrections();
  const next = [...current.filter((c) => c.from.toLowerCase() !== correction.from.toLowerCase()), correction];
  await savePersonalCorrections(next);
  return next;
}

export async function removePersonalCorrection(from: string): Promise<PersonalCorrection[]> {
  const current = await loadPersonalCorrections();
  const next = current.filter((c) => c.from.toLowerCase() !== from.toLowerCase());
  await savePersonalCorrections(next);
  return next;
}
