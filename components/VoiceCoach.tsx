"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import posthog from "posthog-js";
import type { VoiceProfile } from "@/lib/voice-dimensions";

const INK = "#111827";
const BODY = "#4b5563";
const DIM = "#6b7280";
const FAINT = "#9ca3af";
const BLUE = "#1a1a1a";
const BORDER = "#e5e7eb";

export interface Annotation {
  original_text: string;
  edited_text: string;
  type: "insight" | "question";
  dimension: string;
  direction: "toward" | "away";
  text: string;
}

export interface Suggestion {
  phrase: string;
  alternative: string;
  reason: string;
}

export interface CoachResult {
  pattern_summary: string;
  annotations: Annotation[];
  suggestions: Suggestion[];
  edge: string;
  stretch: string;
  rhythm_insight: string;
}

// One shared focus/selection concept across both tabs — only one item is
// ever focused at a time, whichever tab it belongs to. See dashboard's
// StandaloneWriteMode, which owns this state and the document highlight
// layer that has to agree with it.
export interface FocusTarget {
  kind: "annotation" | "suggestion";
  index: number;
}

// Splits into alternating whitespace/non-whitespace runs, preserving exact
// original spacing (including paragraph breaks) so a matched region can be
// re-rendered verbatim and paragraph breaks can be detected within it.
export interface WordToken {
  text: string;
  isWord: boolean;
}
export function tokenizeWithWhitespace(text: string): WordToken[] {
  const toks: WordToken[] = [];
  const re = /(\s+|\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    toks.push({ text: m[0], isWord: !/^\s/.test(m[0]) });
  }
  return toks;
}

export interface DiffOp {
  type: "same" | "removed" | "added";
  word: string;
}

// Minimal LCS-based word diff. No external dependency — adequate for
// sentence-length inputs (a handful to a few dozen words).
export function wordDiff(oldWords: string[], newWords: string[]): DiffOp[] {
  const m = oldWords.length;
  const n = newWords.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      dp[i][j] = oldWords[i] === newWords[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (oldWords[i] === newWords[j]) {
      ops.push({ type: "same", word: newWords[j] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: "removed", word: oldWords[i] });
      i++;
    } else {
      ops.push({ type: "added", word: newWords[j] });
      j++;
    }
  }
  while (i < m) {
    ops.push({ type: "removed", word: oldWords[i] });
    i++;
  }
  while (j < n) {
    ops.push({ type: "added", word: newWords[j] });
    j++;
  }
  return ops;
}

// Word-index positions (into `side`'s own word-token sequence) that differ
// between oldText and newText. side "new" answers "which edited_text words
// are new" (annotations, document shows edited_text); side "old" answers
// "which phrase words are about to change" (suggestions, document shows
// the untouched phrase).
export function diffWordIndices(oldText: string, newText: string, side: "old" | "new"): Set<number> {
  const oldWords = tokenizeWithWhitespace(oldText)
    .filter((t) => t.isWord)
    .map((t) => t.text);
  const newWords = tokenizeWithWhitespace(newText)
    .filter((t) => t.isWord)
    .map((t) => t.text);
  const ops = wordDiff(oldWords, newWords);
  const indices = new Set<number>();
  let oldIdx = 0;
  let newIdx = 0;
  for (const op of ops) {
    if (op.type === "same") {
      oldIdx++;
      newIdx++;
    } else if (op.type === "removed") {
      if (side === "old") indices.add(oldIdx);
      oldIdx++;
    } else {
      if (side === "new") indices.add(newIdx);
      newIdx++;
    }
  }
  return indices;
}

// Above this fraction of changed words, an interleaved word-level diff
// stops being readable — both the old and new text collapse into a
// checkerboard instead of two sentences. Named so it's tunable in one
// place: falls back to two clean lines on cards, one flat tint in the
// document, above this ratio.
export const HEAVY_REWRITE_RATIO_THRESHOLD = 0.3;

// Fraction of oldText's own words that don't survive into newText —
// anchored to the ORIGINAL phrase's word count (not the replacement's),
// so a short original padded out by a long replacement still reads as a
// heavy rewrite rather than diluting the ratio.
export function changeRatio(oldText: string, newText: string): number {
  const oldWordCount = tokenizeWithWhitespace(oldText).filter((t) => t.isWord).length;
  if (oldWordCount === 0) return 0;
  return diffWordIndices(oldText, newText, "old").size / oldWordCount;
}

interface SentenceStat {
  text: string;
  words: number;
}

// Deterministic, client-side — no AI needed for sentence/word counts.
export function splitIntoSentences(text: string): SentenceStat[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  const raw = cleaned.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [cleaned];
  return raw
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => ({ text: s, words: s.split(/\s+/).filter(Boolean).length }));
}

function normalizeForCompare(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

// Safety net: the prompt already instructs the model to skip unchanged
// passages, but if it still includes one (original_text === edited_text),
// drop it here — unedited text is the AI's writing, not the user's.
// Defensive fallback for when the model still returns more than one
// annotation for the same span despite the prompt now asking for at most
// one per span — don't rely on the prompt alone. Groups by normalized
// edited_text, since that's the field that actually drives the document
// highlight: two annotations sharing it would highlight the exact same
// span, so cards must never outnumber marks. Keeps the first annotation's
// type/direction/text/original_text as primary; only the dimension label
// reflects the merge (e.g. "Compression, Structure").
function dedupeAnnotations(annotations: Annotation[]): Annotation[] {
  const merged = new Map<string, Annotation>();
  const order: string[] = [];
  for (const a of annotations) {
    const key = normalizeForCompare(a.edited_text || "");
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...a });
      order.push(key);
    } else {
      const dims = existing.dimension.split(", ").filter(Boolean);
      if (!dims.includes(a.dimension)) dims.push(a.dimension);
      existing.dimension = dims.join(", ");
    }
  }
  return order.map((key) => merged.get(key)!);
}

function dropUnchangedAnnotations(result: CoachResult): CoachResult {
  return {
    ...result,
    annotations: dedupeAnnotations(
      result.annotations.filter(
        (a) => normalizeForCompare(a.original_text || "") !== normalizeForCompare(a.edited_text || "")
      )
    ),
  };
}

interface VoiceCoachProps {
  draftId: string;
  originalDraft: string;
  currentDraft: string;
  voiceProfile: VoiceProfile | null | undefined;
  tab: "edits" | "suggestions";
  onTabChange: (tab: "edits" | "suggestions") => void;
  focused: FocusTarget | null;
  onFocusChange: (f: FocusTarget | null) => void;
  onResultChange: (result: CoachResult | null) => void;
  onApplySuggestion: (updatedDraft: string) => void;
  onClose: () => void;
}

// Panel-only: renders the right-hand analysis column of the inline split view.
// The caller (StandaloneWriteMode) owns the left-hand draft column and the
// split layout itself, and reads `onResultChange` to build highlights there.
export default function VoiceCoach({
  draftId,
  originalDraft,
  currentDraft,
  voiceProfile,
  tab,
  onTabChange,
  focused,
  onFocusChange,
  onResultChange,
  onApplySuggestion,
  onClose,
}: VoiceCoachProps) {
  const unchanged = originalDraft.trim() === currentDraft.trim();
  const [loading, setLoading] = useState(!unchanged);
  const [error, setError] = useState(false);
  const [result, setResult] = useState<CoachResult | null>(null);
  const [rhythmOpen, setRhythmOpen] = useState(false);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<number>>(new Set());
  // Unlike appliedSuggestions (per-result indices, reset on every fetch —
  // see below), this accumulates across the whole panel session and is
  // sent with every request, so a re-run doesn't re-propose something
  // already accepted. Session-only: doesn't survive a remount, so it
  // won't catch a suggestion accepted in an earlier visit to this draft.
  const [appliedHistory, setAppliedHistory] = useState<{ phrase: string; alternative: string }[]>([]);
  const draftTextRef = useRef(currentDraft);

  // Keep the base text for Apply up to date if the user edits outside the panel.
  useEffect(() => {
    draftTextRef.current = currentDraft;
  }, [currentDraft]);

  // Whether an annotation/suggestion's matched text can still be found
  // verbatim in the live draft. False once the user edits it away — the
  // card stays listed (dimmed, marked) rather than silently disappearing.
  const stillMatches = (matchText: string): boolean => !!matchText && currentDraft.includes(matchText);

  const fetchCoaching = async () => {
    setLoading(true);
    setError(false);
    // A re-run replaces the result entirely — old focus/applied state would
    // point at indices that may now mean something else.
    onFocusChange(null);
    setAppliedSuggestions(new Set());
    try {
      const res = await fetch("/api/voice-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          original_draft: originalDraft,
          current_draft: currentDraft,
          voice_profile: voiceProfile,
          draft_id: draftId,
          applied_suggestions: appliedHistory,
        }),
      });
      if (!res.ok) throw new Error("Request failed");
      const raw = (await res.json()) as CoachResult;
      const data = dropUnchangedAnnotations(raw);
      setResult(data);
      onResultChange(data);
    } catch {
      setError(true);
      onResultChange(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!unchanged) fetchCoaching();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectAnnotation = (i: number | null) => {
    onFocusChange(i === null ? null : { kind: "annotation", index: i });
    if (i !== null) {
      try {
        posthog.capture("voice_coach_annotation_clicked", {
          draft_id: draftId,
          index: i,
          type: result?.annotations[i]?.type,
        });
      } catch {}
    }
  };

  const selectSuggestion = (i: number | null) => {
    onFocusChange(i === null ? null : { kind: "suggestion", index: i });
  };

  const applySuggestion = (i: number, s: Suggestion) => {
    const updated = draftTextRef.current.replace(s.phrase, s.alternative);
    draftTextRef.current = updated;
    setAppliedSuggestions((prev) => new Set(prev).add(i));
    setAppliedHistory((prev) => [...prev, { phrase: s.phrase, alternative: s.alternative }]);
    onApplySuggestion(updated);
    try {
      posthog.capture("voice_coach_suggestion_applied", { draft_id: draftId, index: i });
    } catch {}
  };

  const originalSentences = result ? splitIntoSentences(originalDraft) : [];
  const editedSentences = result ? splitIntoSentences(currentDraft) : [];
  const maxWords = Math.max(1, ...originalSentences.map((s) => s.words), ...editedSentences.map((s) => s.words));

  // How many cards in each tab no longer have a matching span in the live
  // draft — drives the "draft has changed" notice for whichever tab is
  // active. Recomputed on every render since it depends on currentDraft.
  const unmatchedAnnotationCount = result ? result.annotations.filter((a) => !stillMatches(a.edited_text)).length : 0;
  const unmatchedSuggestionCount = result ? result.suggestions.filter((s) => !stillMatches(s.phrase)).length : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, fontWeight: 600, color: INK }}>
          Voice Coach
        </h2>
        <button
          onClick={onClose}
          className="font-mono text-[12px]"
          style={{
            color: DIM,
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "14px 10px",
            margin: "-14px -10px",
          }}
        >
          Close ✕
        </button>
      </div>

      {unchanged ? (
        <div className="p-5 text-center" style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
          <p className="font-sans text-[14px]" style={{ color: DIM, lineHeight: 1.6 }}>
            Nothing to coach yet — edit the draft first, then come back to see how your voice shaped it.
          </p>
        </div>
      ) : loading ? (
        <div className="py-12 text-center">
          <p className="font-mono text-[13px]" style={{ color: FAINT }}>
            Reading how you edited this...
          </p>
        </div>
      ) : error || !result ? (
        <div className="p-5 text-center" style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
          <p className="font-sans text-[14px] mb-4" style={{ color: DIM }}>
            Couldn&apos;t load voice coaching.
          </p>
          <button
            onClick={fetchCoaching}
            className="font-sans text-[13px] font-semibold"
            style={{ background: BLUE, color: "#fff", border: "none", padding: "8px 20px", cursor: "pointer" }}
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* Pattern summary — always visible */}
          <div className="p-4 mb-5" style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
            <span
              className="font-mono uppercase block mb-2"
              style={{ fontSize: 10, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}
            >
              What I notice
            </span>
            <p className="font-sans text-[15px]" style={{ color: INK, lineHeight: 1.65 }}>
              {result.pattern_summary}
            </p>
          </div>

          {/* Rhythm (collapsible, computed client-side) */}
          <div className="mb-5">
            <button
              onClick={() => setRhythmOpen(!rhythmOpen)}
              className="font-mono text-[10px] uppercase flex items-center gap-1 mb-2"
              style={{
                color: FAINT,
                background: "none",
                border: "none",
                cursor: "pointer",
                letterSpacing: "0.05em",
                fontWeight: 500,
              }}
            >
              Sentence rhythm{" "}
              <span
                style={{
                  fontSize: 9,
                  transition: "transform 0.2s",
                  transform: rhythmOpen ? "rotate(0)" : "rotate(-90deg)",
                }}
              >
                &#9660;
              </span>
            </button>
            {rhythmOpen && (
              <div className="p-3" style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
                <RhythmChart label="Original" sentences={originalSentences} maxWords={maxWords} />
                <div className="my-2" style={{ borderTop: `1px dashed ${BORDER}` }} />
                <RhythmChart label="Yours" sentences={editedSentences} maxWords={maxWords} />
                {result.rhythm_insight && (
                  <p className="font-sans text-[14px] mt-3" style={{ color: DIM, lineHeight: 1.5 }}>
                    {result.rhythm_insight}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-0 mb-3" style={{ borderBottom: `1px solid ${BORDER}` }}>
            <button
              onClick={() => onTabChange("edits")}
              className="font-sans text-[14px] font-medium"
              style={{
                padding: "8px 12px",
                background: "none",
                border: "none",
                borderBottom: `2px solid ${tab === "edits" ? BLUE : "transparent"}`,
                color: tab === "edits" ? INK : DIM,
                cursor: "pointer",
                marginBottom: -1,
              }}
            >
              Your edits
            </button>
            <button
              onClick={() => onTabChange("suggestions")}
              className="font-sans text-[14px] font-medium"
              style={{
                padding: "8px 12px",
                background: "none",
                border: "none",
                borderBottom: `2px solid ${tab === "suggestions" ? BLUE : "transparent"}`,
                color: tab === "suggestions" ? INK : DIM,
                cursor: "pointer",
                marginBottom: -1,
              }}
            >
              Say it out loud?
            </button>
          </div>

          {tab === "edits" ? (
            <div className="mb-5">
              {unmatchedAnnotationCount > 0 && (
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[11px]" style={{ color: FAINT }}>
                    Draft has changed since this check
                  </span>
                  <button
                    onClick={fetchCoaching}
                    className="font-mono text-[11px] underline"
                    style={{ color: DIM, background: "none", border: "none", cursor: "pointer" }}
                  >
                    Re-check
                  </button>
                </div>
              )}
              <div className="space-y-2">
                {result.annotations.length === 0 ? (
                  <p className="font-sans text-[14px]" style={{ color: FAINT }}>
                    No standout edits found.
                  </p>
                ) : (
                  result.annotations.map((a, i) => {
                    const isFocused = focused?.kind === "annotation" && focused.index === i;
                    const matched = stillMatches(a.edited_text);
                    return (
                      <div
                        key={i}
                        style={{
                          background: "#fff",
                          border: `1px solid ${isFocused ? BLUE : BORDER}`,
                          opacity: matched ? 1 : 0.55,
                        }}
                      >
                        <button
                          onClick={() => selectAnnotation(isFocused ? null : i)}
                          className="w-full text-left p-3"
                          style={{ background: "none", border: "none", cursor: "pointer" }}
                        >
                          <span
                            className="font-mono uppercase block mb-1"
                            style={{
                              fontSize: 9,
                              letterSpacing: "0.04em",
                              color: a.direction === "toward" ? BLUE : "#B45309",
                              fontWeight: 600,
                            }}
                          >
                            {a.dimension} · {a.type === "question" ? "Question" : "Insight"}
                            {!matched && " · No longer in the draft"}
                          </span>
                          {renderCardDiff(a.original_text, a.edited_text)}
                        </button>
                        {isFocused && (
                          <div className="px-3 pb-3">
                            <p className="font-sans text-[14px]" style={{ color: BODY, lineHeight: 1.6 }}>
                              {a.text}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="mb-5">
              {unmatchedSuggestionCount > 0 && (
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[11px]" style={{ color: FAINT }}>
                    Draft has changed since this check
                  </span>
                  <button
                    onClick={fetchCoaching}
                    className="font-mono text-[11px] underline"
                    style={{ color: DIM, background: "none", border: "none", cursor: "pointer" }}
                  >
                    Re-check
                  </button>
                </div>
              )}
              <div className="space-y-2">
                {result.suggestions.length === 0 ? (
                  <p className="font-sans text-[14px]" style={{ color: FAINT }}>
                    Nothing stood out here — the rest of the draft already sounds like you.
                  </p>
                ) : (
                  result.suggestions.map((s, i) => {
                    const applied = appliedSuggestions.has(i);
                    const isFocused = focused?.kind === "suggestion" && focused.index === i;
                    const matched = stillMatches(s.phrase);
                    return (
                      <div
                        key={i}
                        onClick={() => selectSuggestion(isFocused ? null : i)}
                        className="p-3"
                        style={{
                          background: "#fff",
                          border: `1px solid ${isFocused ? BLUE : BORDER}`,
                          opacity: matched ? 1 : 0.55,
                          cursor: "pointer",
                        }}
                      >
                        {!matched && (
                          <span
                            className="font-mono uppercase block mb-1"
                            style={{ fontSize: 9, letterSpacing: "0.04em", color: "#B45309", fontWeight: 600 }}
                          >
                            No longer in the draft
                          </span>
                        )}
                        <div className="mb-2">{renderCardDiff(s.phrase, s.alternative)}</div>
                        <p className="font-sans text-[14px] mb-2" style={{ color: DIM, lineHeight: 1.5 }}>
                          {s.reason}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            applySuggestion(i, s);
                          }}
                          disabled={applied || !matched}
                          className="font-sans text-[12px] font-semibold"
                          style={{
                            background: applied ? "#fff" : BLUE,
                            color: applied ? FAINT : "#fff",
                            border: applied ? `1px solid ${BORDER}` : "none",
                            padding: "5px 14px",
                            cursor: applied || !matched ? "default" : "pointer",
                            opacity: !matched && !applied ? 0.5 : 1,
                          }}
                        >
                          {applied ? "Applied" : "Apply"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Edge / Stretch */}
          <div className="grid gap-2 mb-4 coach-edge-stretch" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <div className="p-3" style={{ background: `${BLUE}06`, border: `1px solid ${BORDER}` }}>
              <span
                className="font-mono uppercase block mb-1"
                style={{ fontSize: 9, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}
              >
                Your edge
              </span>
              <p className="font-sans text-[14px]" style={{ color: INK, lineHeight: 1.6 }}>
                {result.edge}
              </p>
            </div>
            <div className="p-3" style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
              <span
                className="font-mono uppercase block mb-1"
                style={{ fontSize: 9, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}
              >
                One stretch
              </span>
              <p className="font-sans text-[14px]" style={{ color: INK, lineHeight: 1.6 }}>
                {result.stretch}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Card-side word diff: one flowing line instead of two near-identical
// sentences (struck-through original above, bold edited below). Unchanged
// words render once, plain; the words that actually moved get the
// grey-struck/bold-ink treatment inline, at the point where they differ.
function renderWordDiffLine(oldText: string, newText: string): ReactNode {
  const oldWords = tokenizeWithWhitespace(oldText)
    .filter((t) => t.isWord)
    .map((t) => t.text);
  const newWords = tokenizeWithWhitespace(newText)
    .filter((t) => t.isWord)
    .map((t) => t.text);
  const ops = wordDiff(oldWords, newWords);
  return ops.map((op, i) => {
    if (op.type === "same") {
      return (
        <span key={i} style={{ color: INK }}>
          {op.word}{" "}
        </span>
      );
    }
    if (op.type === "removed") {
      return (
        <span key={i} style={{ color: FAINT, textDecoration: "line-through" }}>
          {op.word}{" "}
        </span>
      );
    }
    return (
      <span key={i} style={{ color: INK, fontWeight: 700 }}>
        {op.word}{" "}
      </span>
    );
  });
}

// Gates renderWordDiffLine on how much actually changed. Interleaved
// word-level diff reads well for a small edit; on a near-total rewrite it
// makes both sentences unreadable, so above the threshold this falls back
// to the plain two-line struck-through/bold treatment instead.
function renderCardDiff(oldText: string, newText: string): ReactNode {
  if (changeRatio(oldText, newText) >= HEAVY_REWRITE_RATIO_THRESHOLD) {
    return (
      <>
        <p className="font-sans text-[14px] line-through" style={{ color: FAINT }}>
          {oldText}
        </p>
        <p className="font-sans text-[14px] font-medium" style={{ color: INK }}>
          {newText}
        </p>
      </>
    );
  }
  return (
    <p className="font-sans text-[14px]" style={{ lineHeight: 1.5 }}>
      {renderWordDiffLine(oldText, newText)}
    </p>
  );
}

function RhythmChart({ label, sentences, maxWords }: { label: string; sentences: SentenceStat[]; maxWords: number }) {
  return (
    <div>
      <span
        className="font-mono uppercase block mb-2"
        style={{ fontSize: 9, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}
      >
        {label} · {sentences.length} sentence{sentences.length === 1 ? "" : "s"}
      </span>
      <div className="flex items-end gap-[2px]" style={{ height: 36 }}>
        {sentences.map((s, i) => (
          <div
            key={i}
            title={`${s.words} words`}
            style={{
              flex: 1,
              minWidth: 3,
              height: `${Math.max(6, (s.words / maxWords) * 36)}px`,
              background: BLUE,
              opacity: 0.6,
            }}
          />
        ))}
      </div>
    </div>
  );
}
