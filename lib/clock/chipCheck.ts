import { getChipById } from "./chips";
import type { Chip } from "./chips";
import type { Run } from "./types";

export type CriterionStatus = "met" | "not_met" | "needs_confirmation";

export type CriterionResult = {
  chip: Chip;
  status: CriterionStatus;
  /** Only set for ai_check chips once a result exists, independent of any override. */
  detail?: { reason: string; quote: string | null };
};

function normalizeTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s']/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Matches a word or multi-word phrase as a contiguous token sequence in
 * the transcript — not a substring check, which would false-positive on
 * partial words ("cat" inside "category") and can't express phrase
 * boundaries ("kind of" matching only when those two words are adjacent,
 * not whenever both appear anywhere in the transcript). Also used
 * server-side to verify an AI check's quoted phrase actually appears in
 * the transcript, tolerant of case/punctuation/whitespace differences.
 *
 * For a single-word phrase only, also tolerates Whisper splitting one
 * word into two tokens ("upend" -> "up end") — confirmed against the
 * app's actual whisper-base.en/whisper-tiny.en models before this was
 * written: clean speech transcribed all 6 test words correctly on both
 * models, but faster/rushed speech occasionally split "upend" into "up
 * end" (the sound heard correctly, just tokenized as two words) on
 * either model depending on pacing. A real miss (the sentence-initial
 * case, where both models misheard the word entirely) isn't fixable by
 * normalization — that's what needs_confirmation is for.
 */
export function transcriptContainsPhrase(text: string, phrase: string): boolean {
  const tokens = normalizeTokens(text);
  const phraseTokens = normalizeTokens(phrase);
  if (phraseTokens.length === 0) return false;

  for (let i = 0; i <= tokens.length - phraseTokens.length; i++) {
    if (phraseTokens.every((pt, j) => tokens[i + j] === pt)) return true;
  }

  if (phraseTokens.length === 1) {
    const target = phraseTokens[0];
    for (let i = 0; i < tokens.length - 1; i++) {
      if (tokens[i] + tokens[i + 1] === target) return true;
    }
  }

  return false;
}

/**
 * overrides holds the user's own answers — both for an ai_check the AI
 * call couldn't resolve, and for a use_word it couldn't confirm — keyed
 * by chip id. An override always wins over automatic detection.
 */
export function checkChip(chip: Chip, run: Run, overrides: Record<string, boolean>): CriterionStatus {
  if (chip.id in overrides) return overrides[chip.id] ? "met" : "not_met";

  switch (chip.type) {
    case "max_duration":
      return run.durationMs <= chip.seconds * 1000 ? "met" : "not_met";
    case "point_before_half":
      if (run.pointStatus !== "marked" || run.pointMs === null) return "not_met";
      return run.pointMs < run.durationMs / 2 ? "met" : "not_met";
    case "use_word":
      if (!run.transcript) return "needs_confirmation";
      return transcriptContainsPhrase(run.transcript.text, chip.word) ? "met" : "needs_confirmation";
    case "avoid_words":
      // No confirmation step here, unlike use_word: a missed detection
      // just means the safe default (not flagged) holds, not a false
      // failure the user has to correct.
      if (!run.transcript) return "needs_confirmation";
      return chip.words.some((w) => transcriptContainsPhrase(run.transcript!.text, w)) ? "not_met" : "met";
    case "ai_check": {
      const result = run.aiCheckResults[chip.id];
      if (!result) return "needs_confirmation";
      return result.met ? "met" : "not_met";
    }
  }
}

/** Only the chips this run actually selected — resolved from their ids, frozen at record time. */
export function checkSelectedChips(run: Run, overrides: Record<string, boolean>): CriterionResult[] {
  return run.selectedChipIds
    .map((id) => getChipById(id))
    .filter((c): c is Chip => Boolean(c))
    .map((chip) => ({
      chip,
      status: checkChip(chip, run, overrides),
      detail: run.aiCheckResults[chip.id],
    }));
}
