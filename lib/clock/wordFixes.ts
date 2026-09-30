import type { PersonalCorrection, Transcript, WordFix, WordFixMap } from "./types";

export type { PersonalCorrection, WordFix, WordFixMap, WordFixSource } from "./types";

export function splitWords(sentenceText: string): string[] {
  return sentenceText.trim().split(/\s+/).filter(Boolean);
}

/** Case/punctuation-insensitive form used for matching — same normalization dedupeChunkSeams uses for seam words. */
export function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^\w']/g, "");
}

export function leadingPunct(word: string): string {
  return word.match(/^[^\w']+/)?.[0] ?? "";
}

export function trailingPunct(word: string): string {
  return word.match(/[^\w']+$/)?.[0] ?? "";
}

/** Strips only the outer edges — internal punctuation (hyphens, apostrophes, inter-word spaces in a phrase) is left alone. */
export function stripEdgePunctuation(text: string): string {
  return text.replace(/^[^\w']+/, "").replace(/[^\w']+$/, "");
}

/** "Accent" replacing words[start..end] of ["Excellent,"] becomes "Accent," — the original span's edge punctuation, not the replacement's own. */
export function wrapWithEdgePunctuation(words: string[], start: number, end: number, coreText: string): string {
  return leadingPunct(words[start] ?? "") + coreText + trailingPunct(words[end] ?? "");
}

/**
 * Replaces any existing span(s) overlapping the new one — the write-time
 * invariant that keeps a sentence's fixes non-overlapping, so rendering
 * never has to reconcile conflicting spans. Extending a selection over an
 * already-fixed word (manual or auto) simply subsumes it.
 */
export function setWordFixSpan(existing: WordFix[], span: WordFix): WordFix[] {
  const filtered = existing.filter((f) => f.end < span.start || f.start > span.end);
  return [...filtered, span].sort((a, b) => a.start - b.start);
}

export function removeWordFixSpan(existing: WordFix[], start: number, end: number): WordFix[] {
  return existing.filter((f) => !(f.start === start && f.end === end));
}

/** The sentence's words with every fix's span replaced by its text — what's actually rendered, and what corrected-text chip checks read. */
export function applyFixesToSentence(sentenceText: string, fixes: WordFix[]): string {
  const words = splitWords(sentenceText);
  const sorted = [...fixes].sort((a, b) => a.start - b.start);
  const out: string[] = [];
  let i = 0;
  for (const fix of sorted) {
    while (i < fix.start && i < words.length) {
      out.push(words[i]);
      i++;
    }
    out.push(fix.text);
    i = fix.end + 1;
  }
  while (i < words.length) {
    out.push(words[i]);
    i++;
  }
  return out.join(" ");
}

/** Full-transcript corrected text — what chip checks (use_word/avoid_words/ai_check) read once any word fixes exist. */
export function correctedTranscriptText(transcript: Transcript, wordFixes: WordFixMap): string {
  return transcript.sentences.map((sentence, i) => applyFixesToSentence(sentence.text, wordFixes[i] ?? [])).join(" ");
}

/**
 * Greedy, longest-phrase-first, left to right within each sentence: at each
 * word position, the longest matching correction's `from` phrase wins and
 * its words are consumed (not re-scanned), so a rule can't match partway
 * inside an already-applied one. Matching ignores edge punctuation and
 * case; `to` is stored punctuation-bare and gets the matched span's edge
 * punctuation reattached per occurrence (wrapWithEdgePunctuation), not
 * whatever punctuation happened to be on the instance that created the rule.
 */
export function autoApplyPersonalCorrections(transcript: Transcript, corrections: PersonalCorrection[]): WordFixMap {
  if (corrections.length === 0) return {};
  const byLengthDesc = [...corrections]
    .map((c) => ({ ...c, fromWords: c.from.trim().split(/\s+/).filter(Boolean).map(normalizeWord) }))
    .filter((c) => c.fromWords.length > 0)
    .sort((a, b) => b.fromWords.length - a.fromWords.length);

  const result: WordFixMap = {};
  transcript.sentences.forEach((sentence, sentenceIndex) => {
    const words = splitWords(sentence.text);
    const normalized = words.map(normalizeWord);
    const spans: WordFix[] = [];
    let i = 0;
    while (i < words.length) {
      const match = byLengthDesc.find((c) => {
        const end = i + c.fromWords.length;
        if (end > words.length) return false;
        for (let j = 0; j < c.fromWords.length; j++) {
          if (normalized[i + j] !== c.fromWords[j]) return false;
        }
        return true;
      });
      if (match) {
        const end = i + match.fromWords.length - 1;
        spans.push({
          start: i,
          end,
          text: wrapWithEdgePunctuation(words, i, end, match.to),
          source: "auto",
        });
        i = end + 1;
      } else {
        i++;
      }
    }
    if (spans.length > 0) result[sentenceIndex] = spans;
  });
  return result;
}
