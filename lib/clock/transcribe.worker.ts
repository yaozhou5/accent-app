import { pipeline, env } from "@huggingface/transformers";
import type { AutomaticSpeechRecognitionOutput, AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";
import { WHISPER_DTYPE, WHISPER_MODEL_ID } from "./model";
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
  /** Defaults to WHISPER_MODEL_ID — only the dev model-comparison tool overrides this. */
  modelId?: string;
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
    promise = pipeline("automatic-speech-recognition", modelId, {
      // "auto" prefers WebGPU when the browser supports it and falls back
      // to WASM otherwise. dtype is pinned (see ./model.ts) so the download
      // size stays the same either way.
      device: "auto",
      dtype: WHISPER_DTYPE,
      progress_callback: (progress: ProgressPayload) => {
        post({ type: "progress", id, progress });
      },
    }) as Promise<AutomaticSpeechRecognitionPipeline>;
    transcriberPromises.set(modelId, promise);
  }
  return promise;
}

function post(message: OutMessage) {
  (self as unknown as Worker).postMessage(message);
}

self.onmessage = async (event: MessageEvent<InMessage>) => {
  const { id, audio, modelId } = event.data;
  try {
    const transcriber = await getTranscriber(id, modelId ?? WHISPER_MODEL_ID);
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
    post({ type: "error", id, message: err instanceof Error ? err.message : String(err) });
  }
};
