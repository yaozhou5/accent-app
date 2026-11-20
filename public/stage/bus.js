// The stage: a tiny live channel shared by the writer and the audience.
// Production transport: Supabase Realtime broadcast + presence (websockets).
// Nothing is stored anywhere: messages pass through and are gone.
// Test transport (?local=1): BroadcastChannel between tabs of one browser.

export async function roomFromSecret(secret) {
  const data = new TextEncoder().encode("accent-stage:" + secret);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 12; i++) out += alphabet[hash[i] % alphabet.length];
  return out;
}

export function randomSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function localBus(room, role) {
  const ch = new BroadcastChannel("accent-stage:" + room);
  const handlers = {};
  const me = Math.random().toString(36).slice(2);
  const peers = new Map();
  let onCount = () => {};
  const emitCount = () => {
    const now = Date.now();
    for (const [k, v] of peers) if (now - v.at > 6000) peers.delete(k);
    onCount([...peers.values()].filter((p) => p.role === "audience").length);
  };
  ch.onmessage = (e) => {
    const { event, payload, from, role: r } = e.data || {};
    if (event === "__ping") { peers.set(from, { role: r, at: Date.now() }); emitCount(); return; }
    if (event === "__bye") { peers.delete(from); emitCount(); return; }
    (handlers[event] || []).forEach((fn) => fn(payload));
  };
  const ping = () => ch.postMessage({ event: "__ping", from: me, role });
  ping();
  const t = setInterval(() => { ping(); emitCount(); }, 2000);
  addEventListener("pagehide", () => ch.postMessage({ event: "__bye", from: me }));
  return {
    ready: Promise.resolve(),
    on(event, fn) { (handlers[event] ||= []).push(fn); },
    send(event, payload) { ch.postMessage({ event, payload, from: me }); },
    onAudience(fn) { onCount = fn; },
    onStatus() {},
    close() { clearInterval(t); ch.close(); },
  };
}

async function supabaseBus(room, role) {
  const cfg = await fetch("/api/stage/config", { cache: "no-store" }).then((r) => r.json());
  const { createClient } = await import("./supabase.mjs");
  const client = createClient(cfg.url, cfg.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { params: { eventsPerSecond: 40 } },
  });
  const key = Math.random().toString(36).slice(2);
  const channel = client.channel("stage:" + room, {
    config: { broadcast: { self: false, ack: false }, presence: { key } },
  });
  const handlers = {};
  let onCount = () => {};
  let onStatus = () => {};
  const recount = () => {
    const state = channel.presenceState();
    let n = 0;
    for (const metas of Object.values(state)) if (metas.some((m) => m.role === "audience")) n++;
    onCount(n);
  };
  channel.on("presence", { event: "sync" }, recount);
  const bus = {
    on(event, fn) {
      if (!handlers[event]) {
        handlers[event] = [];
        channel.on("broadcast", { event }, (msg) => handlers[event].forEach((h) => h(msg.payload)));
      }
      handlers[event].push(fn);
    },
    send(event, payload) { channel.send({ type: "broadcast", event, payload }); },
    onAudience(fn) { onCount = fn; },
    onStatus(fn) { onStatus = fn; },
    close() { client.removeChannel(channel); },
  };
  bus.ready = new Promise((resolve) => {
    // Handlers must be registered before subscribe(); callers attach them synchronously
    // right after awaiting createBus, so subscribe on the next tick.
    setTimeout(() => {
      channel.subscribe(async (status) => {
        onStatus(status);
        if (status === "SUBSCRIBED") { await channel.track({ role }); resolve(); }
      });
    }, 0);
  });
  return bus;
}

export async function createBus(room, role) {
  const local = new URLSearchParams(location.search).has("local");
  return local ? localBus(room, role) : supabaseBus(room, role);
}

// Smallest single edit between two strings: { at, del, ins }.
export function diff(a, b) {
  let s = 0;
  const min = Math.min(a.length, b.length);
  while (s < min && a[s] === b[s]) s++;
  let e = 0;
  while (e < min - s && a[a.length - 1 - e] === b[b.length - 1 - e]) e++;
  return { at: s, del: a.length - s - e, ins: b.slice(s, b.length - e) };
}

export function apply(text, op) {
  return text.slice(0, op.at) + op.ins + text.slice(op.at + op.del);
}

// ---- Line identity -------------------------------------------------------
// A "line" is a paragraph (text between newlines). Each gets a short id that
// survives edits, so audience notes stay attached as the text shifts.

export function newLineId() {
  return Math.random().toString(36).slice(2, 8);
}

const count = (s, ch) => { let n = 0; for (const c of s) if (c === ch) n++; return n; };

// Given the line ids for `before`, return the ids after applying `op`.
export function shiftLineIds(ids, before, op) {
  const startLine = count(before.slice(0, op.at), "\n");
  const removedNL = count(before.slice(op.at, op.at + op.del), "\n");
  const insertedNL = count(op.ins, "\n");
  const head = ids.slice(0, startLine);
  // If the edit starts at the beginning of a line and swallows it whole (deleting a line,
  // or an empty line), the surviving content belongs to the last affected line: keep its id.
  const lineStartAt = before.lastIndexOf("\n", op.at - 1) + 1;
  const kept = (op.at === lineStartAt && removedNL > 0 ? ids[startLine + removedNL] : ids[startLine]) ?? newLineId();
  const tail = ids.slice(startLine + removedNL + 1);
  const fresh = Array.from({ length: insertedNL }, newLineId);
  // Pressing Enter at the very start of a line pushes that line down: it keeps its id
  // and the new (empty) line above it gets the fresh id.
  const pushDown = op.del === 0 && insertedNL > 0 && op.at === lineStartAt && op.ins.endsWith("\n");
  const mid = pushDown ? [...fresh, kept] : [kept, ...fresh];
  return [...head, ...mid, ...tail];
}

export function lineRanges(text) {
  const out = [];
  let start = 0;
  for (const line of text.split("\n")) { out.push({ start, end: start + line.length, text: line }); start += line.length + 1; }
  return out;
}
