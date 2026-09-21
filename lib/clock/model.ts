export const WHISPER_MODEL_ID = "onnx-community/whisper-base.en";

// Pinned to int8-quantized weights for both the encoder and the merged
// decoder. Left unpinned, transformers.js's "auto" device selection can
// pick a much larger fp32/fp16 build on WebGPU — pinning keeps the download
// small and its size predictable regardless of which backend runs it.
// Every model below uses the same encoder/decoder file layout, so the same
// dtype map applies to all of them.
export const WHISPER_DTYPE = {
  encoder_model: "q8",
  decoder_model_merged: "q8",
} as const;

// encoder_model_quantized.onnx (~22.1 MiB) + decoder_model_merged_quantized.onnx
// (~51.2 MiB) + tokenizer/config files (~2.4 MB), from
// onnx-community/whisper-base.en on Hugging Face.
export const MODEL_SIZE_MB = 79;

export type ModelOption = {
  id: string;
  label: string;
  sizeMB: number;
};

// Real sizes (encoder_model_quantized.onnx + decoder_model_merged_quantized.onnx
// + tokenizer/config files), read from each model's file listing on Hugging
// Face — not estimates. Used by the dev-only model comparison tool.
export const MODEL_OPTIONS: ModelOption[] = [
  { id: "onnx-community/whisper-base.en", label: "whisper-base.en (current default)", sizeMB: 79 },
  { id: "onnx-community/whisper-base", label: "whisper-base", sizeMB: 80 },
  { id: "onnx-community/whisper-small", label: "whisper-small", sizeMB: 252 },
];
