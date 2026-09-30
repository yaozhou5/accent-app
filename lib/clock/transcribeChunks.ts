import type { TranscriptChunk } from "./types";

/**
 * stride_length_s: 0 — no overlap between chunk windows. transformers.js
 * defaults stride to chunk_length_s / 6 (5s here) whenever it's omitted,
 * which creates a 5s overlap at every ~20s boundary; Whisper's own merge
 * step (findLongestCommonSequence) only trims that overlap when it finds
 * more than one matching token between the two windows' decodes of the
 * same audio, and silently concatenates both verbatim when it doesn't —
 * confirmed empirically to duplicate whole clauses at the boundary, and to
 * occasionally collapse a sentence's timestamp to zero duration. A hard
 * cut (stride 0) trades that for a narrower failure mode: a word landing
 * exactly on the cut can get split or misheard, and adjacent chunks can
 * echo one word at the seam — see dedupeChunkSeams below for the latter.
 * See transcribeChunks.test.ts for the empirical comparison across all
 * three candidates that led here.
 */
export const TRANSCRIBE_OPTIONS = {
  chunk_length_s: 30,
  stride_length_s: 0,
  return_timestamps: true,
} as const;

function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^\w']/g, "");
}

/**
 * At each chunk seam only — if one chunk's last word matches the next
 * chunk's first word (case-insensitive, punctuation stripped), drop the
 * duplicate from the start of the next chunk. This is the one artifact a
 * hard chunk cut (stride_length_s: 0) reliably produces: a word straddling
 * the exact cut can echo as its own tiny chunk right after. Not a general
 * dedup pass — it never looks past the immediate boundary between two
 * adjacent chunks.
 */
export function dedupeChunkSeams(chunks: TranscriptChunk[]): TranscriptChunk[] {
  const result: TranscriptChunk[] = [];
  for (const chunk of chunks) {
    let text = chunk.text;
    const prev = result[result.length - 1];
    if (prev) {
      const prevWords = prev.text.trim().split(/\s+/).filter(Boolean);
      const prevLastWord = prevWords[prevWords.length - 1];
      const match = text.match(/^(\s*)(\S+)/);
      if (prevLastWord && match) {
        const [, leadingSpace, firstWord] = match;
        const normalizedFirst = normalizeWord(firstWord);
        if (normalizedFirst.length > 0 && normalizeWord(prevLastWord) === normalizedFirst) {
          text = leadingSpace + text.slice(match[0].length);
        }
      }
    }
    // The whole chunk was nothing but the duplicated word — drop it
    // outright rather than leaving an empty chunk in the array.
    if (result.length > 0 && text.trim().length === 0) continue;
    result.push({ ...chunk, text });
  }
  return result;
}
