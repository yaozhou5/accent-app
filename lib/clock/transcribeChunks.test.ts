// Regression test for the chunk-boundary duplication bug (transcribe.worker.ts
// used to default to a 5s inter-chunk overlap that Whisper's own merge step
// didn't always dedupe, producing duplicated clauses and, worse, zero-duration
// sentence timestamps — see the two fixtures below, captured from that bug).
//
// Downloads/loads the real whisper-base.en model on first run (~79MB, cached
// afterward) and runs real inference — this is slow (several seconds to
// minutes depending on cache/network) by design: it exercises the actual
// production pipeline call, not a mock. Run explicitly after any change to
// transcribe.worker.ts or transcribeChunks.ts:
//   npx vitest run lib/clock/transcribeChunks.test.ts

import { readFileSync } from "node:fs";
import path from "node:path";
import { pipeline } from "@huggingface/transformers";
import type { AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";
import { beforeAll, describe, expect, test } from "vitest";
import { chunksToSentences } from "./sentences";
import { TRANSCRIBE_OPTIONS, dedupeChunkSeams } from "./transcribeChunks";
import { WHISPER_DTYPE, DESKTOP_MODEL } from "./model";
import type { TranscriptChunk } from "./types";

const FIXTURES_DIR = path.join(__dirname, "__fixtures__");

function loadFixturePcm(filename: string): Float32Array {
  const buf = readFileSync(path.join(FIXTURES_DIR, filename));
  return new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
}

/** Any run of 5+ words appearing twice in the full text — the clause-duplication shape this bug produces. */
function findRepeatedPhrase(text: string): string | null {
  const words = text.trim().toLowerCase().replace(/[.,]/g, "").split(/\s+/).filter(Boolean);
  for (let n = 8; n >= 5; n--) {
    const seen = new Set<string>();
    for (let i = 0; i <= words.length - n; i++) {
      const phrase = words.slice(i, i + n).join(" ");
      if (seen.has(phrase)) return phrase;
      seen.add(phrase);
    }
  }
  return null;
}

let transcriber: AutomaticSpeechRecognitionPipeline;

beforeAll(async () => {
  transcriber = (await pipeline("automatic-speech-recognition", DESKTOP_MODEL.id, {
    device: "cpu",
    dtype: WHISPER_DTYPE,
  })) as AutomaticSpeechRecognitionPipeline;
}, 300_000);

async function transcribeFixture(filename: string) {
  const audio = loadFixturePcm(filename);
  const output = await transcriber(audio, TRANSCRIBE_OPTIONS);
  const result = Array.isArray(output) ? output[0] : output;
  const rawChunks: TranscriptChunk[] = (result.chunks ?? []).map(
    (chunk: { text: string; timestamp: [number, number] }) => ({
      text: chunk.text,
      start: chunk.timestamp?.[0] ?? 0,
      end: chunk.timestamp?.[1] ?? chunk.timestamp?.[0] ?? 0,
    })
  );
  const chunks = dedupeChunkSeams(rawChunks);
  const text = chunks.map((c) => c.text).join("");
  const sentences = chunksToSentences(chunks);
  return { text, chunks, sentences };
}

describe.each([
  ["chunk-boundary-clause.f32le", "33s clip, clause straddling the ~20-30s overlap window"],
  ["chunk-boundary-word.f32le", "36s clip, a multi-syllable word straddling exactly t=30.0s"],
])("%s (%s)", (filename) => {
  test("no clause-level duplication, sentences have non-zero duration and ordered starts", async () => {
    const { text, sentences } = await transcribeFixture(filename);

    const repeated = findRepeatedPhrase(text);
    expect(repeated, `found a repeated phrase: "${repeated}"`).toBeNull();

    expect(sentences.length).toBeGreaterThan(0);
    for (const sentence of sentences) {
      expect(sentence.end, `sentence "${sentence.text}" has zero/negative duration`).toBeGreaterThan(sentence.start);
    }
    for (let i = 1; i < sentences.length; i++) {
      expect(sentences[i].start, `sentence ${i} starts before sentence ${i - 1}`).toBeGreaterThanOrEqual(
        sentences[i - 1].start
      );
    }
  }, 120_000);
});
