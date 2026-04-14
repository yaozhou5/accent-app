"use client";

import { useMemo, useState } from "react";
import type { QuickCheckResponse, Issue } from "@/lib/types";
import { wordDiff } from "@/lib/word-diff";
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

function InlineDiff({
  original,
  numbered,
}: {
  original: string;
  numbered: NumberedPhrase[];
}) {
  // Find positions of each original phrase and replace inline.
  const matches: Array<{
    start: number;
    end: number;
    fixed: string;
  }> = [];
  for (const np of numbered) {
    if (!np.phrase) continue;
    const idx = original.indexOf(np.phrase);
    if (idx !== -1) {
      matches.push({
        start: idx,
        end: idx + np.phrase.length,
        fixed: np.fixed_phrase,
      });
    }
  }
  matches.sort((a, b) => a.start - b.start);
  // Remove overlaps
  const filtered: typeof matches = [];
  let lastEnd = 0;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      filtered.push(m);
      lastEnd = m.end;
    }
  }

  const segments: React.ReactNode[] = [];
  let cursor = 0;
  filtered.forEach((m, i) => {
    if (m.start > cursor) {
      segments.push(
        <span key={`t-${i}`}>{original.slice(cursor, m.start)}</span>
      );
    }
    const ops = wordDiff(original.slice(m.start, m.end), m.fixed || "");
    segments.push(
      <span key={`d-${i}`}>
        {ops.map((op, k) => {
          if (op.type === "equal") return <span key={k}>{op.text}</span>;
          if (op.type === "del")
            return (
              <span
                key={k}
                className="bg-[#FBE9E4] text-[#C4553A] line-through decoration-[#C4553A]/60 rounded-[3px] px-1 py-px"
              >
                {op.text}
              </span>
            );
          return (
            <span
              key={k}
              className="bg-[#F5F5F5] text-[#111] rounded-[3px] px-1 py-px font-medium"
            >
              {op.text}
            </span>
          );
        })}
      </span>
    );
    cursor = m.end;
  });
  if (cursor < original.length) {
    segments.push(<span key="t-end">{original.slice(cursor)}</span>);
  }

  return (
    <p className="font-sans text-sm leading-relaxed text-ink whitespace-pre-wrap">
      {segments}
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
  const [view, setView] = useState<"changes" | "clean">("changes");
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
      ? "No changes"
      : issueCount === 1
        ? "1 change"
        : `${issueCount} changes`;

  if (!isDone) {
    return (
      <div className="space-y-4">
        <div className="bg-white border border-ink/10 rounded-[12px] p-5">
          <p className="font-sans text-sm leading-relaxed text-ink/70 whitespace-pre-wrap">
            {original}
          </p>
        </div>
        <RotatingStatus messages={QUICK_MESSAGES} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-ink/10 rounded-[12px] overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-ink/10 bg-warm/40">
          <span className="text-[11px] font-sans font-medium text-ink/60 tracking-wide">
            {issueLabel}
          </span>
          {hasIssues && (
            <div
              role="tablist"
              aria-label="View mode"
              className="flex items-center gap-1 bg-white border border-ink/10 rounded-[8px] p-0.5"
            >
              {(["changes", "clean"] as const).map((v) => (
                <button
                  key={v}
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  className={`px-2.5 py-1 rounded-[6px] text-[11px] font-sans font-medium transition-colors ${
                    view === v
                      ? "bg-ink text-paper"
                      : "text-ink/50 hover:text-ink/70"
                  }`}
                >
                  {v === "changes" ? "Changes" : "Clean"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-4 py-4">
          {!hasIssues ? (
            <p className="font-sans text-sm text-ink font-medium">
              This is good writing! No changes needed.
            </p>
          ) : view === "changes" ? (
            <InlineDiff original={original} numbered={numbered} />
          ) : (
            <p className="font-sans text-sm leading-relaxed text-ink font-medium whitespace-pre-wrap">
              {displayText}
            </p>
          )}
        </div>
      </div>

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
    </div>
  );
}
