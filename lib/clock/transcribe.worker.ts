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
env.allowLocalModels = false;
env.useBrowserCache = true;

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
  | { type: "phase"; id: string; phase: "transcribing" }
  | { type: "result"; id: string; text: string; chunks: TranscriptChunk[]; sentences: TranscriptChunk[] }
  | { type: "error"; id: string; message: string };

// Keyed by model id so the dev comparison tool can hold more than one
// model's pipeline in memory at once, each loaded (and cached) only once.
const transcriberPromises = new Map<string, Promise<AutomaticSpeechRecognitionPipeline>>();

function getTranscriber(id: string, modelId: string): Promise<AutomaticSpeechRecognitionPipeline> {
  let promise = transcriberPromises.get(modelId);
  if (!promise) {
    promise = (
      pipeline("automatic-speech-recognition", modelId, {
        // "auto" prefers WebGPU when the browser supports it and falls back
        // to WASM otherwise. dtype is pinned (see ./model.ts) so the download
        // size stays the same either way.
        device: "auto",
        dtype: WHISPER_DTYPE,
        progress_callback: (progress: ProgressPayload) => {
          post({ type: "progress", id, progress });
        },
      }) as Promise<AutomaticSpeechRecognitionPipeline>
    ).catch((err) => {
      // Don't leave a rejected promise cached — otherwise every future
      // attempt (including the user's "Try again") replays this same
      // rejection forever instead of actually retrying the load.
      transcriberPromises.delete(modelId);
      throw err;
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
    const message = `Model loading failed — ${describe(err)}`;
    console.error("[transcribe worker]", message, err);
    post({ type: "error", id, message });
    return;
  }
  try {
    post({ type: "phase", id, phase: "transcribing" });
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
