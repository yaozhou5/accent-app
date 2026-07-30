"use client";

import { useEffect, useRef, useState } from "react";
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
function dropUnchangedAnnotations(result: CoachResult): CoachResult {
  return {
    ...result,
    annotations: result.annotations.filter(
      (a) => normalizeForCompare(a.original_text || "") !== normalizeForCompare(a.edited_text || "")
    ),
  };
}

interface VoiceCoachProps {
  draftId: string;
  originalDraft: string;
  currentDraft: string;
  voiceProfile: VoiceProfile | null | undefined;
  selectedIndex: number | null;
  onSelectIndex: (i: number | null) => void;
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
  selectedIndex,
  onSelectIndex,
  onResultChange,
  onApplySuggestion,
  onClose,
}: VoiceCoachProps) {
  const unchanged = originalDraft.trim() === currentDraft.trim();
  const [loading, setLoading] = useState(!unchanged);
  const [error, setError] = useState(false);
  const [result, setResult] = useState<CoachResult | null>(null);
  const [tab, setTab] = useState<"edits" | "suggestions">("edits");
  const [rhythmOpen, setRhythmOpen] = useState(false);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<number>>(new Set());
  const draftTextRef = useRef(currentDraft);

  // Keep the base text for Apply up to date if the user edits outside the panel.
  useEffect(() => {
    draftTextRef.current = currentDraft;
  }, [currentDraft]);

  const fetchCoaching = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/voice-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          original_draft: originalDraft,
          current_draft: currentDraft,
          voice_profile: voiceProfile,
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

  // Selecting a highlighted passage on the left should surface it here.
  useEffect(() => {
    if (selectedIndex !== null) setTab("edits");
  }, [selectedIndex]);

  const selectAnnotation = (i: number | null) => {
    onSelectIndex(i);
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

  const applySuggestion = (i: number, s: Suggestion) => {
    const updated = draftTextRef.current.replace(s.phrase, s.alternative);
    draftTextRef.current = updated;
    setAppliedSuggestions((prev) => new Set(prev).add(i));
    onApplySuggestion(updated);
    try {
      posthog.capture("voice_coach_suggestion_applied", { draft_id: draftId, index: i });
    } catch {}
  };

  const originalSentences = result ? splitIntoSentences(originalDraft) : [];
  const editedSentences = result ? splitIntoSentences(currentDraft) : [];
  const maxWords = Math.max(1, ...originalSentences.map((s) => s.words), ...editedSentences.map((s) => s.words));

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, fontWeight: 600, color: INK }}>
          Voice Coach
        </h2>
        <button
          onClick={onClose}
          className="font-mono text-[12px]"
          style={{ color: DIM, background: "none", border: "none", cursor: "pointer" }}
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
              onClick={() => setTab("edits")}
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
              onClick={() => setTab("suggestions")}
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
            <div className="space-y-2 mb-5">
              {result.annotations.length === 0 ? (
                <p className="font-sans text-[14px]" style={{ color: FAINT }}>
                  No standout edits found.
                </p>
              ) : (
                result.annotations.map((a, i) => {
                  const isSelected = selectedIndex === i;
                  return (
                    <div key={i} style={{ background: "#fff", border: `1px solid ${isSelected ? BLUE : BORDER}` }}>
                      <button
                        onClick={() => selectAnnotation(isSelected ? null : i)}
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
                        </span>
                        <p className="font-sans text-[14px] line-through" style={{ color: FAINT }}>
                          {a.original_text}
                        </p>
                        <p className="font-sans text-[14px] font-medium" style={{ color: INK }}>
                          {a.edited_text}
                        </p>
                      </button>
                      {isSelected && (
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
          ) : (
            <div className="space-y-2 mb-5">
              {result.suggestions.length === 0 ? (
                <p className="font-sans text-[14px]" style={{ color: FAINT }}>
                  Nothing stood out here — the rest of the draft already sounds like you.
                </p>
              ) : (
                result.suggestions.map((s, i) => {
                  const applied = appliedSuggestions.has(i);
                  return (
                    <div key={i} className="p-3" style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
                      <p className="font-sans text-[14px] mb-1" style={{ color: FAINT }}>
                        {s.phrase}
                      </p>
                      <p className="font-sans text-[14px] font-medium mb-1" style={{ color: INK }}>
                        {s.alternative}
                      </p>
                      <p className="font-sans text-[14px] mb-2" style={{ color: DIM, lineHeight: 1.5 }}>
                        {s.reason}
                      </p>
                      <button
                        onClick={() => applySuggestion(i, s)}
                        disabled={applied}
                        className="font-sans text-[12px] font-semibold"
                        style={{
                          background: applied ? "#fff" : BLUE,
                          color: applied ? FAINT : "#fff",
                          border: applied ? `1px solid ${BORDER}` : "none",
                          padding: "5px 14px",
                          cursor: applied ? "default" : "pointer",
                        }}
                      >
                        {applied ? "Applied" : "Apply"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Edge / Stretch */}
          <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
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
