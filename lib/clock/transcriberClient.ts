import type { Transcript } from "./types";

export type TranscribeProgress = {
  status: string;
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
};

type PendingEntry = {
  resolve: (t: Transcript) => void;
  reject: (e: Error) => void;
  onProgress?: (p: TranscribeProgress) => void;
  onTranscribing?: () => void;
};

let worker: Worker | null = null;
const pending = new Map<string, PendingEntry>();

function ensureWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./transcribe.worker.ts", import.meta.url), { type: "module" });
  worker.onmessage = (event: MessageEvent) => {
    const data = event.data as
      | { type: "progress"; id: string; progress: TranscribeProgress }
      | { type: "phase"; id: string; phase: "transcribing" }
      | { type: "result"; id: string; text: string; chunks: Transcript["chunks"]; sentences: Transcript["sentences"] }
      | { type: "error"; id: string; message: string };
    const entry = pending.get(data.id);
    if (!entry) return;
    if (data.type === "progress") {
      entry.onProgress?.(data.progress);
    } else if (data.type === "phase") {
      entry.onTranscribing?.();
    } else if (data.type === "result") {
      entry.resolve({ text: data.text, chunks: data.chunks, sentences: data.sentences });
      pending.delete(data.id);
    } else if (data.type === "error") {
      entry.reject(new Error(data.message));
      pending.delete(data.id);
    }
  };
  worker.onerror = (event) => {
    for (const [id, entry] of pending) {
      entry.reject(new Error(event.message || "Transcription worker crashed."));
      pending.delete(id);
    }
  };
  return worker;
}

export function transcribe(
  id: string,
  audio: Float32Array,
  onProgress?: (p: TranscribeProgress) => void,
  onTranscribing?: () => void,
  modelId?: string
): Promise<Transcript> {
  return new Promise((resolve, reject) => {
    const w = ensureWorker();
    pending.set(id, { resolve, reject, onProgress, onTranscribing });
    w.postMessage({ id, audio, modelId }, [audio.buffer]);
  });
}
