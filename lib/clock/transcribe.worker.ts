import { pipeline, env } from "@huggingface/transformers";
import type { AutomaticSpeechRecognitionOutput, AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";
import { WHISPER_DTYPE } from "./model";
import { chunksToSentences } from "./sentences";
import type { TranscriptChunk } from "./types";

type Chunk = { text: string; timestamp: [number, number] };

// Models are fetched from the HF hub and cached by transformers.js in the
// browser's Cache Storage, keyed by URL — so this only downloads once per
// browser, same as any other cached static asset. Never point at local
// model files; nothing here is bundled with the app.
// useBrowserCache itself is set per-attempt in loadPipeline() below, not
// here — it needs to be disabled for the no-cache fallback retry.
env.allowLocalModels = false;

type ProgressPayload = {
  status: string;
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
};

type InMessage = {
  id: string;
  audio: Float32Array;
  /** Always resolved by the caller — this worker has no window/screen access to pick a device-appropriate default itself. */
  modelId: string;
};

type OutMessage =
  | { type: "progress"; id: string; progress: ProgressPayload }
  | { type: "phase"; id: string; phase: "transcribing"; usedNoCacheFallback: boolean }
  | { type: "result"; id: string; text: string; chunks: TranscriptChunk[]; sentences: TranscriptChunk[] }
  | { type: "error"; id: string; message: string };

const STALL_TIMEOUT_MS = 20_000;

/**
 * Thrown when a model load goes STALL_TIMEOUT_MS with no progress event at
 * all — as opposed to a normal rejection (404, network error, etc). Safari
 * in Private Browsing has a long-documented bug where `caches.open()` (what
 * env.useBrowserCache routes through) just hangs forever instead of
 * throwing, so a plain timeout is the only way to notice.
 */
class StallError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StallError";
  }
}

/**
 * Resets a `STALL_TIMEOUT_MS` timer on every progress event — a genuinely
 * slow download keeps resetting it and is never interrupted; only a total
 * absence of progress trips it. Late settlement after the timer already
 * fired is ignored either way.
 */
function loadPipeline(
  id: string,
  modelId: string,
  useBrowserCache: boolean
): Promise<AutomaticSpeechRecognitionPipeline> {
  return new Promise((resolve, reject) => {
    let settled = false;
    let stallTimer: ReturnType<typeof setTimeout>;
    const armStallTimer = () => {
      clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        if (settled) return;
        settled = true;
        reject(new StallError(`No download progress for ${STALL_TIMEOUT_MS / 1000} seconds.`));
      }, STALL_TIMEOUT_MS);
    };
    armStallTimer();

    env.useBrowserCache = useBrowserCache;
    (
      pipeline("automatic-speech-recognition", modelId, {
        // "auto" prefers WebGPU when the browser supports it and falls back
        // to WASM otherwise. dtype is pinned (see ./model.ts) so the download
        // size stays the same either way.
        device: "auto",
        dtype: WHISPER_DTYPE,
        progress_callback: (progress: ProgressPayload) => {
          armStallTimer();
          post({ type: "progress", id, progress });
        },
      }) as Promise<AutomaticSpeechRecognitionPipeline>
    ).then(
      (p) => {
        if (settled) return;
        settled = true;
        clearTimeout(stallTimer);
        resolve(p);
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(stallTimer);
        reject(err);
      }
    );
  });
}

// Keyed by model id so the dev comparison tool can hold more than one
// model's pipeline in memory at once, each loaded (and cached) only once.
const transcriberPromises = new Map<string, Promise<AutomaticSpeechRecognitionPipeline>>();
// Model ids that had to fall back to no-cache loading — the caller checks
// this to tell the user the model won't persist to their next session.
const noCacheFallbackModels = new Set<string>();

function getTranscriber(id: string, modelId: string): Promise<AutomaticSpeechRecognitionPipeline> {
  let promise = transcriberPromises.get(modelId);
  if (!promise) {
    promise = loadPipeline(id, modelId, true).catch(async (err) => {
      if (!(err instanceof StallError)) {
        // Don't leave a rejected promise cached — otherwise every future
        // attempt (including the user's "Try again") replays this same
        // rejection forever instead of actually retrying the load.
        transcriberPromises.delete(modelId);
        throw err;
      }
      // Likely Private Browsing: retry once with the cache disabled so the
      // model can still load this session, just without persisting.
      console.error("[transcribe worker] Model load stalled — retrying without the browser cache.", err);
      try {
        const p = await loadPipeline(id, modelId, false);
        noCacheFallbackModels.add(modelId);
        return p;
      } catch (retryErr) {
        transcriberPromises.delete(modelId);
        throw retryErr;
      }
    });
    transcriberPromises.set(modelId, promise);
  }
  return promise;
}

function post(message: OutMessage) {
  (self as unknown as Worker).postMessage(message);
}

function describe(err: unknown): string {
  if (err instanceof Error) return `${err.name}: ${err.message}`;
  return String(err);
}

self.onmessage = async (event: MessageEvent<InMessage>) => {
  const { id, audio, modelId } = event.data;
  let transcriber: AutomaticSpeechRecognitionPipeline;
  try {
    transcriber = await getTranscriber(id, modelId);
  } catch (err) {
    const message =
      err instanceof StallError
        ? "Downloading the speech model stalled with no progress — this can happen in Private Browsing or on a very slow connection. Tap Try again."
        : `Model loading failed — ${describe(err)}`;
    console.error("[transcribe worker]", message, err);
    post({ type: "error", id, message });
    return;
  }
  try {
    post({ type: "phase", id, phase: "transcribing", usedNoCacheFallback: noCacheFallbackModels.has(modelId) });
    const output = (await transcriber(audio, {
      chunk_length_s: 30,
      return_timestamps: true,
    })) as AutomaticSpeechRecognitionOutput | AutomaticSpeechRecognitionOutput[];
    const result = Array.isArray(output) ? output[0] : output;
    const chunks: TranscriptChunk[] = (result.chunks ?? []).map((chunk: Chunk) => ({
      text: chunk.text,
      start: chunk.timestamp?.[0] ?? 0,
      end: chunk.timestamp?.[1] ?? chunk.timestamp?.[0] ?? 0,
    }));
    const sentences = chunksToSentences(chunks);
    post({ type: "result", id, text: result.text ?? "", chunks, sentences });
  } catch (err) {
    const message = `Transcription failed — ${describe(err)}`;
    console.error("[transcribe worker]", message, err);
    post({ type: "error", id, message });
  }
};

// Safety nets for failures that don't go through the try/catch above at
// all — e.g. a synchronous throw somewhere inside transformers.js/onnxruntime
// during module init, or a rejected promise nobody awaited. These can't be
// tied back to a specific pending request, so they're console-only: on iOS
// this worker has been observed to fail with the UI silently reverting and
// nothing in the console, so ruling out "it's failing here and staying
// silent" is itself useful signal.
self.addEventListener("error", (event) => {
  console.error("[transcribe worker] uncaught error:", event.message, event.error);
});
self.addEventListener("unhandledrejection", (event) => {
  console.error("[transcribe worker] unhandled rejection:", event.reason);
});
