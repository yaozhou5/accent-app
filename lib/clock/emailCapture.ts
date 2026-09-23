import { createStore, get, set } from "idb-keyval";

// A separate database from the runs store (lib/clock/db.ts) — see
// scriptDraft.ts for why: createStore() opens without a version number, so
// adding a new store to the SAME database on a later call never actually
// creates it. A dedicated database sidesteps that entirely.
function getStore() {
  if (typeof indexedDB === "undefined") return null;
  try {
    return createStore("accent-clock-email-capture", "state");
  } catch {
    return null;
  }
}

let store: ReturnType<typeof createStore> | null | undefined;

function store_() {
  if (store === undefined) store = getStore();
  return store;
}

const KEY = "actedOn";

/** True once the visitor has either submitted an email or dismissed the prompt — it should never show again. */
export async function hasActedOnEmailCapture(): Promise<boolean> {
  const s = store_();
  if (!s) return false;
  try {
    return (await get<boolean>(KEY, s)) === true;
  } catch {
    return false;
  }
}

export async function markEmailCaptureActedOn(): Promise<void> {
  const s = store_();
  if (!s) return;
  try {
    await set(KEY, true, s);
  } catch {
    // IndexedDB unavailable or blocked — we'll just ask again next time.
  }
}
