import { CHALLENGES } from "./challenges";
import type { Challenge, Criterion } from "./challenges";
import type { Run } from "./types";

export type CriterionStatus = "met" | "not_met" | "needs_confirmation";

export type CriterionResult = {
  criterion: Criterion;
  status: CriterionStatus;
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
 * not whenever both appear anywhere in the transcript).
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
 * overrides holds the user's own answers — both for `manual` criteria and
 * for a `use_word` that automatic detection couldn't confirm — keyed by
 * criterion id. An override always wins over automatic detection.
 */
export function checkCriterion(criterion: Criterion, run: Run, overrides: Record<string, boolean>): CriterionStatus {
  if (criterion.id in overrides) return overrides[criterion.id] ? "met" : "not_met";

  switch (criterion.type) {
    case "max_duration":
      return run.durationMs <= criterion.seconds * 1000 ? "met" : "not_met";
    case "point_before_half":
      if (run.pointStatus !== "marked" || run.pointMs === null) return "not_met";
      return run.pointMs < run.durationMs / 2 ? "met" : "not_met";
    case "use_word":
      if (!run.transcript) return "needs_confirmation";
      return transcriptContainsPhrase(run.transcript.text, criterion.word) ? "met" : "needs_confirmation";
    case "avoid_words":
      // No confirmation step here, unlike use_word: a missed detection
      // just means the safe default (not flagged) holds, not a false
      // failure the user has to correct.
      if (!run.transcript) return "needs_confirmation";
      return criterion.words.some((w) => transcriptContainsPhrase(run.transcript!.text, w)) ? "not_met" : "met";
    case "manual":
      return "needs_confirmation";
  }
}

export function checkAllCriteria(
  challenge: Challenge,
  run: Run,
  overrides: Record<string, boolean>
): CriterionResult[] {
  return challenge.criteria.map((criterion) => ({ criterion, status: checkCriterion(criterion, run, overrides) }));
}

/**
 * The challenge whose weekStart is the most recent one on or before
 * today. Config is hand-edited with no admin UI — this means a week
 * nobody got around to adding a new entry for just keeps the previous
 * one showing, rather than the card disappearing.
 */
export function getCurrentChallenge(now: Date = new Date()): Challenge | null {
  const todayIso = now.toISOString().slice(0, 10);
  const eligible = CHALLENGES.filter((c) => c.weekStart <= todayIso).sort((a, b) =>
    a.weekStart < b.weekStart ? 1 : -1
  );
  return eligible[0] ?? null;
}
