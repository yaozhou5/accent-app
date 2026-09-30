export type TranscriptChunk = {
  text: string;
  start: number;
  end: number;
};

export type Transcript = {
  text: string;
  chunks: TranscriptChunk[];
  /** Chunks merged and re-split on sentence-ending punctuation — the actual clickable units. */
  sentences: TranscriptChunk[];
};

/** "unmarked" = not picked yet, "marked" = pointMs is set, "none" = explicitly "I never said it". */
export type PointStatus = "unmarked" | "marked" | "none";

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
  /** Which weekly challenge (lib/clock/challenges.ts) this run was attempted under — set at recording start based on whether the challenge card was dismissed, not retroactively. null = free practice. */
  challengeId: string | null;
  /** The user's own yes/no answers for criteria automatic checking couldn't resolve — manual-type criteria, and a use_word that wasn't automatically detected. Keyed by criterion id. */
  criteriaOverrides: Record<string, boolean>;
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
