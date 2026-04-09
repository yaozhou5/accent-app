"use client";

import { useMemo } from "react";
import type { QuickCheckResponse, Issue } from "@/lib/types";
import { RotatingStatus } from "./RotatingStatus";
import { CopyButton } from "./CopyButton";
import { VoiceWaitlistCard } from "./VoiceWaitlistCard";
import { saveToShelf } from "@/lib/supabase/shelf";

interface QuickResultProps {
  original: string;
  fixResult: QuickCheckResponse | null;
  isFixing: boolean;
  onNew: () => void;
  sessionCount: number;
}

interface NumberedPhrase {
  phrase: string;
  fixed_phrase: string;
  number: number;
}

function getIssuesForShelf(result: QuickCheckResponse | null): Issue[] {
  if (!result) return [];
  return result.phrases.map((p) => ({
    phrase: p.phrase,
    fixed_phrase: p.fixed_phrase,
    title: "",
    revised_sentence: "",
    lesson_title: "",
    lesson_body: "",
    examples: [],
  }));
}

function buildNumberedPhrases(
  phrases: Array<{ phrase: string; fixed_phrase: string }>,
  originalText: string
): NumberedPhrase[] {
  // Sort by position in original text so numbering follows reading order
  const withPositions = phrases.map((p) => ({
    ...p,
    pos: originalText.indexOf(p.phrase),
  }));
  withPositions.sort((a, b) => {
    if (a.pos === -1) return 1;
    if (b.pos === -1) return -1;
    return a.pos - b.pos;
  });
  return withPositions.map((p, i) => ({
    phrase: p.phrase,
    fixed_phrase: p.fixed_phrase,
    number: i + 1,
  }));
}

function NumberedHighlights({
  text,
  numbered,
  field,
  variant,
}: {
  text: string;
  numbered: NumberedPhrase[];
  field: "phrase" | "fixed_phrase";
  variant: "coral" | "teal";
}) {
  const baseClass =
    variant === "coral"
      ? "font-sans text-sm leading-relaxed text-ink whitespace-pre-wrap"
      : "font-sans text-sm leading-relaxed text-ink font-medium whitespace-pre-wrap";
  const highlightClass =
    variant === "coral"
      ? "bg-[#FDF3CC] text-[#7A6010] rounded-[3px] px-1 py-px"
      : "bg-[#C8DDD5] text-[#1B3A2D] rounded-[3px] px-1 py-px";

  // Find positions of each phrase
  const matches: Array<{
    start: number;
    end: number;
    number: number;
  }> = [];
  for (const np of numbered) {
    const target = np[field];
    if (!target) continue;
    const idx = text.indexOf(target);
    if (idx !== -1) {
      matches.push({ start: idx, end: idx + target.length, number: np.number });
    }
  }
  // Sort by position and remove overlaps
  matches.sort((a, b) => a.start - b.start);
  const filtered: typeof matches = [];
  let lastEnd = 0;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      filtered.push(m);
      lastEnd = m.end;
    }
  }

  if (filtered.length === 0) return <p className={baseClass}>{text}</p>;

  const segments: Array<{
    text: string;
    highlight: boolean;
    number?: number;
  }> = [];
  let cursor = 0;
  for (const m of filtered) {
    if (m.start > cursor)
      segments.push({ text: text.slice(cursor, m.start), highlight: false });
    segments.push({
      text: text.slice(m.start, m.end),
      highlight: true,
      number: m.number,
    });
    cursor = m.end;
  }
  if (cursor < text.length)
    segments.push({ text: text.slice(cursor), highlight: false });

  return (
    <p className={baseClass}>
      {segments.map((seg, i) =>
        seg.highlight ? (
          <span key={i}>
            <span className={highlightClass}>{seg.text}</span>
            <span
              className="inline-flex items-center justify-center align-middle shrink-0"
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "#1B3A2D",
                color: "white",
                fontSize: 9,
                fontWeight: 700,
                marginLeft: 3,
                fontFamily: "var(--font-sans)",
              }}
            >
              {seg.number}
            </span>
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </p>
  );
}

const QUICK_MESSAGES = [
  "Putting on my reading glasses\u2026",
  "Marking up your draft\u2026",
  "Almost done\u2026",
];

export function QuickResult({
  original,
  fixResult,
  isFixing,
  onNew,
  sessionCount,
}: QuickResultProps) {
  const numbered = useMemo(
    () => buildNumberedPhrases(fixResult?.phrases ?? [], original),
    [fixResult, original]
  );
  const issueCount = numbered.length;
  const hasIssues = fixResult ? issueCount > 0 : true;
  const isDone = !!fixResult && !isFixing;
  const displayText = fixResult?.improved_full || "";

  const issueLabel =
    issueCount === 0
      ? null
      : issueCount === 1
        ? "1 thing to improve"
        : `${issueCount} things to improve`;

  return (
    <div className="space-y-4">
      {/* Original */}
      <div>
        {issueLabel && (
          <p className="text-[11px] font-sans text-ink/50 mb-1.5">
            {issueLabel}
          </p>
        )}
        <div className="border-l-[3px] border-coral pl-4">
          <span className="text-[11px] font-sans font-medium text-ink/60 tracking-wide">
            Your original
          </span>
          <div className="mt-1.5">
            {fixResult ? (
              <NumberedHighlights
                text={original}
                numbered={numbered}
                field="phrase"
                variant="coral"
              />
            ) : (
              <p className="font-sans text-sm leading-relaxed text-ink whitespace-pre-wrap">
                {original}
              </p>
            )}
          </div>
        </div>
      </div>

      {isDone ? (
        <>
          <div className="flex justify-center text-ink/20">
            <span className="text-lg">&darr;</span>
          </div>

          {hasIssues ? (
            <div className="border-l-[3px] border-teal pl-4">
              <span className="text-[11px] font-sans font-medium text-ink/60 tracking-wide">
                Improved
              </span>
              <div className="mt-1.5">
                <NumberedHighlights
                  text={displayText}
                  numbered={numbered}
                  field="fixed_phrase"
                  variant="teal"
                />
              </div>
            </div>
          ) : (
            <div className="border-l-[3px] border-teal pl-4">
              <p className="font-sans text-sm text-ink font-medium">
                This is good writing! No changes needed.
              </p>
            </div>
          )}

          <VoiceWaitlistCard sessionCount={sessionCount} />

          <div className="flex gap-2">
            <CopyButton
              text={displayText}
              onSave={() => {
                if (fixResult) {
                  saveToShelf(
                    original,
                    fixResult.improved_full,
                    getIssuesForShelf(fixResult),
                    "quick"
                  );
                }
              }}
            />
            <button
              onClick={onNew}
              className="flex-1 py-2.5 min-h-[44px] rounded-[8px] text-sm font-sans font-medium border border-ink/10 text-ink hover:bg-warm transition-colors"
            >
              New
            </button>
          </div>
        </>
      ) : (
        <RotatingStatus messages={QUICK_MESSAGES} />
      )}
    </div>
  );
}
