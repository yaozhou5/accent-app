export type TranscriptChunk = {
  text: string;
  start: number;
  end: number;
};

export type WordFixSource = "manual" | "auto";

/**
 * A corrected span of words within one sentence, addressed by word index
 * (0-based, inclusive on both ends) into that sentence's whitespace-split
 * original words — stable for the run's lifetime since transcript.sentences
 * is never rewritten in place. `text` already has the original span's edge
 * punctuation reattached — it's the literal replacement string to render.
 * See lib/clock/wordFixes.ts for the logic that builds and applies these.
 */
export type WordFix = {
  start: number;
  end: number;
  text: string;
  source: WordFixSource;
};

/** Keyed by sentence index. Each array is kept sorted by start and non-overlapping — see wordFixes.ts's setWordFixSpan. */
export type WordFixMap = Record<number, WordFix[]>;

export type PersonalCorrection = { from: string; to: string };

export type Transcript = {
  text: string;
  chunks: TranscriptChunk[];
  /** Chunks merged and re-split on sentence-ending punctuation — the actual clickable units. */
  sentences: TranscriptChunk[];
};

/** "unmarked" = not picked yet, "marked" = pointMs is set, "none" = explicitly "I never said it". */
export type PointStatus = "unmarked" | "marked" | "none";

export type MarkLabel = "filler" | "lost_thread" | "too_much_background" | "rushed";

/** A timestamped flag placed during listen-back, with an optional self-applied label. */
export type Mark = { id: string; ms: number; label: MarkLabel | null };

export type SelfRating = "yes" | "sort_of" | "no";

export type Run = {
  id: string;
  createdAt: number;
  durationMs: number;
  pointMs: number | null;
  pointStatus: PointStatus;
  mimeType: string;
  blob: Blob;
  transcript: Transcript | null;
  /** A copy of the script draft as it stood when this run was recorded, or null if none was written. */
  script: string | null;
  /** Which chips (lib/clock/chips.ts) were selected when this run was recorded — frozen at record start, not retroactive. [] = free practice. */
  selectedChipIds: string[];
  /** The user's own yes/no answers for chips automatic checking couldn't resolve — an ai_check with no result yet, or a use_word that wasn't automatically detected. Keyed by chip id. */
  criteriaOverrides: Record<string, boolean>;
  /** Results from the ai_check server route, keyed by chip id. Never synced beyond the derived met/not-met status. `wordFixesVersionAtCheck` records wordFixesVersion as of this check, so a later word fix can be told apart from one already accounted for — see RunChecklist's "Re-check with your fixes" link. */
  aiCheckResults: Record<
    string,
    { met: boolean; reason: string; quote: string | null; wordFixesVersionAtCheck: number }
  >;
  /** Flags placed during the Listen step. Stays local — never sent anywhere. */
  marks: Mark[];
  /** Answer to "Did you say what you meant to say?" — independent of whether a point was ever confirmed. */
  selfRating: SelfRating | null;
  /** When the Listen step was completed (Done listening, or playback ran out) — null until then. Distinguishes a fresh unreviewed run from one recorded before this flow existed. */
  listenedAt: number | null;
  /** Display-only corrections to transcript.sentences text, by sentence index — see lib/clock/wordFixes.ts. Never touches pointMs/marks/sentence timings. */
  wordFixes: WordFixMap;
  /** Bumped on every wordFixes change made after creation (manual fix, undo). Never bumped by the initial auto-apply at transcript arrival — nothing has checked yet at that point. */
  wordFixesVersion: number;
};

/**
 * What TimeToPointChart and the progress stats actually need — nothing
 * audio/transcript-shaped. A local Run already satisfies this structurally.
 * Runs synced from another device (lib/supabase/practice-runs.ts) only
 * ever exist in this shape — they have no blob to play back.
 */
export type ChartRun = {
  id: string;
  createdAt: number;
  pointMs: number | null;
  pointStatus: PointStatus;
};

export type TranscribeState =
  | { phase: "idle" }
  | { phase: "downloading"; percent: number | null; modelLabel: string }
  | { phase: "transcribing"; modelLabel: string }
  | { phase: "error"; message: string };
