export type ModelInfo = { id: string; label: string; sizeMB: number };

// Pinned to int8-quantized weights for both the encoder and the merged
// decoder — applies to every model below. Left unpinned, transformers.js's
// "auto" device selection can pick a much larger fp32/fp16 build on WebGPU —
// pinning keeps the download small and its size predictable regardless of
// which backend ends up running it.
export const WHISPER_DTYPE = {
  encoder_model: "q8",
  decoder_model_merged: "q8",
} as const;

// encoder_model_quantized.onnx (~22.1 MiB) + decoder_model_merged_quantized.onnx
// (~51.2 MiB) + tokenizer/config files (~2.4 MB), from
// onnx-community/whisper-base.en on Hugging Face.
export const DESKTOP_MODEL: ModelInfo = { id: "onnx-community/whisper-base.en", label: "whisper-base.en", sizeMB: 79 };

// encoder_model_quantized.onnx (~10.1 MiB) + decoder_model_merged_quantized.onnx
// (~30.7 MiB) + tokenizer/config files (~2.4 MB), from
// onnx-community/whisper-tiny.en on Hugging Face.
//
// iOS Safari kills the tab outright (a silent OOM — no catchable error, no
// console output, just a reload) when the base model's WASM module is
// loaded. tiny is small enough to stay under that per-tab budget.
export const MOBILE_MODEL: ModelInfo = { id: "onnx-community/whisper-tiny.en", label: "whisper-tiny.en", sizeMB: 43 };

/**
 * Chosen by user agent, not feature detection or screen size — the
 * limiting factor is WebKit's per-tab memory budget specifically (see
 * MOBILE_MODEL above), not "small screen" as a general proxy for
 * "constrained device". Android Chrome on a small phone handles the base
 * model fine, so it isn't included here; iPad is, regardless of its
 * (larger) screen, since it's still WebKit.
 */
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/i.test(navigator.userAgent);
}

export function getModelForDevice(): ModelInfo {
  return isIOS() ? MOBILE_MODEL : DESKTOP_MODEL;
}

// Real sizes (encoder_model_quantized.onnx + decoder_model_merged_quantized.onnx
// + tokenizer/config files), read from each model's file listing on Hugging
// Face — not estimates. Used by the dev-only model comparison tool.
export const MODEL_OPTIONS: ModelInfo[] = [
  DESKTOP_MODEL,
  MOBILE_MODEL,
  { id: "onnx-community/whisper-base", label: "whisper-base", sizeMB: 80 },
  { id: "onnx-community/whisper-small", label: "whisper-small", sizeMB: 252 },
];
