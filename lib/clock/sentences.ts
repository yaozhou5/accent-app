import type { TranscriptChunk } from "./types";

/**
 * Whisper's chunks are split by time (chunk_length_s), not by sentence — a
 * sentence can start in one chunk and finish in the next ("We are
 * receiving" / "7,500,000 to..."). This concatenates all chunk text back
 * into one string, re-splits it on sentence-ending punctuation, and maps
 * each resulting sentence back to the chunk its first word (for `start`)
 * and last word (for `end`) came from.
 */
export function chunksToSentences(chunks: TranscriptChunk[]): TranscriptChunk[] {
  if (chunks.length === 0) return [];

  let fullText = "";
  const boundaries = chunks.map((chunk) => {
    const offset = fullText.length;
    fullText += chunk.text;
    return { offset, chunk };
  });

  function chunkForOffset(offset: number): TranscriptChunk {
    let result = boundaries[0].chunk;
    for (const b of boundaries) {
      if (b.offset <= offset) result = b.chunk;
      else break;
    }
    return result;
  }

  const sentences: TranscriptChunk[] = [];

  function pushSentence(startIdx: number, endIdxInclusive: number) {
    const text = fullText.slice(startIdx, endIdxInclusive + 1).trim();
    if (!text) return;
    sentences.push({
      text,
      start: chunkForOffset(startIdx).start,
      end: chunkForOffset(endIdxInclusive).end,
    });
  }

  let sentenceStartIdx: number | null = null;
  for (let i = 0; i < fullText.length; i++) {
    const ch = fullText[i];
    if (sentenceStartIdx === null && /\S/.test(ch)) {
      sentenceStartIdx = i;
    }
    const atEnd = i === fullText.length - 1;
    const isTerminal = ch === "." || ch === "?" || ch === "!";
    const nextIsSpaceOrEnd = atEnd || /\s/.test(fullText[i + 1] ?? "");

    if (sentenceStartIdx !== null && isTerminal && nextIsSpaceOrEnd) {
      pushSentence(sentenceStartIdx, i);
      sentenceStartIdx = null;
    } else if (sentenceStartIdx !== null && atEnd) {
      // Trailing text with no terminal punctuation — keep it anyway.
      pushSentence(sentenceStartIdx, i);
      sentenceStartIdx = null;
    }
  }

  return sentences;
}
