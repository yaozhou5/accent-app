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
};

export type TranscribeState =
  | { phase: "idle" }
  | { phase: "downloading"; percent: number | null }
  | { phase: "transcribing" }
  | { phase: "error"; message: string };
