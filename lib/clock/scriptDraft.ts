import { createStore, get, set } from "idb-keyval";

// A separate database from the runs store (lib/clock/db.ts) — idb-keyval's
// createStore() opens its database without a version number, so calling it
// a second time with a new store name on the SAME database would silently
// never create that store (no upgrade gets triggered). A dedicated database
// sidesteps that entirely.
function getStore() {
  if (typeof indexedDB === "undefined") return null;
  try {
    return createStore("accent-clock-script", "draft");
  } catch {
    return null;
  }
}

let store: ReturnType<typeof createStore> | null | undefined;

function store_() {
  if (store === undefined) store = getStore();
  return store;
}

const KEY = "script";

export async function loadScriptDraft(): Promise<string> {
  const s = store_();
  if (!s) return "";
  try {
    const value = await get<string>(KEY, s);
    return typeof value === "string" ? value : "";
  } catch {
    return "";
  }
}

export async function saveScriptDraft(text: string): Promise<void> {
  const s = store_();
  if (!s) return;
  try {
    await set(KEY, text, s);
  } catch {
    // IndexedDB unavailable or blocked — the draft just won't persist.
  }
}
