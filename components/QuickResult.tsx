"use client";

import { useMemo } from "react";
import type { CheckResponse } from "@/lib/types";
import { RotatingStatus } from "./RotatingStatus";
import { CopyButton } from "./CopyButton";
import { saveToShelf } from "@/lib/supabase/shelf";

interface QuickResultProps {
  original: string;
  streamedText: string;
  result: CheckResponse | null;
  isStreaming: boolean;
  onNew: () => void;
}

function HighlightedOriginal({
  text,
  phrases,
}: {
  text: string;
  phrases: string[];
}) {
  if (phrases.length === 0)
    return (
      <p className="font-sans text-sm leading-relaxed text-ink">{text}</p>
    );

  const matches: Array<{ start: number; end: number }> = [];
  for (const phrase of phrases) {
    const idx = text.indexOf(phrase);
    if (idx !== -1) matches.push({ start: idx, end: idx + phrase.length });
  }
  matches.sort((a, b) => a.start - b.start);

  const filtered: typeof matches = [];
  let lastEnd = 0;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      filtered.push(m);
      lastEnd = m.end;
    }
  }

  const segments: Array<{ text: string; highlight: boolean }> = [];
  let cursor = 0;
  for (const m of filtered) {
    if (m.start > cursor)
      segments.push({ text: text.slice(cursor, m.start), highlight: false });
    segments.push({ text: text.slice(m.start, m.end), highlight: true });
    cursor = m.end;
  }
  if (cursor < text.length)
    segments.push({ text: text.slice(cursor), highlight: false });

  return (
    <p className="font-sans text-sm leading-relaxed text-ink">
      {segments.map((seg, i) =>
        seg.highlight ? (
          <span key={i} className="bg-[#FDF3CC] text-[#7A6010] rounded-[3px] px-1 py-px">
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </p>
  );
}

function HighlightedImproved({
  text,
  phrases,
}: {
  text: string;
  phrases: string[];
}) {
  if (phrases.length === 0)
    return (
      <p className="font-sans text-sm leading-relaxed text-ink font-medium">{text}</p>
    );

  const matches: Array<{ start: number; end: number }> = [];
  for (const phrase of phrases) {
    const idx = text.indexOf(phrase);
    if (idx !== -1) matches.push({ start: idx, end: idx + phrase.length });
  }
  matches.sort((a, b) => a.start - b.start);

  const filtered: typeof matches = [];
  let lastEnd = 0;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      filtered.push(m);
      lastEnd = m.end;
    }
  }

  const segments: Array<{ text: string; highlight: boolean }> = [];
  let cursor = 0;
  for (const m of filtered) {
    if (m.start > cursor)
      segments.push({ text: text.slice(cursor, m.start), highlight: false });
    segments.push({ text: text.slice(m.start, m.end), highlight: true });
    cursor = m.end;
  }
  if (cursor < text.length)
    segments.push({ text: text.slice(cursor), highlight: false });

  return (
    <p className="font-sans text-sm leading-relaxed text-ink font-medium">
      {segments.map((seg, i) =>
        seg.highlight ? (
          <span key={i} className="bg-[#E8F0EB] text-[#1B3A2D] rounded-[3px] px-1 py-px">
            {seg.text}
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
  streamedText,
  result,
  isStreaming,
  onNew,
}: QuickResultProps) {
  const phrases = useMemo(
    () => result?.issues.map((i) => i.phrase) ?? [],
    [result]
  );
  const fixedPhrases = useMemo(
    () => result?.issues.map((i) => i.fixed_phrase).filter(Boolean) ?? [],
    [result]
  );
  const hasIssues = result ? result.issues.length > 0 : true;
  const isDone = !!result && !isStreaming;
  const displayText = result?.improved_full || "";

  return (
    <div className="space-y-4">
      {/* Original — always visible immediately */}
      <div className="border-l-[3px] border-coral pl-4">
        <span className="text-[11px] font-sans font-medium text-ink uppercase tracking-wider">
          Your original
        </span>
        <div className="mt-1.5">
          {result ? (
            <HighlightedOriginal text={original} phrases={phrases} />
          ) : (
            <p className="font-sans text-sm leading-relaxed text-ink">
              {original}
            </p>
          )}
        </div>
      </div>

      {isDone ? (
        <>
          {/* Arrow */}
          <div className="flex justify-center text-ink/20">
            <span className="text-lg">&darr;</span>
          </div>

          {/* Improved — shown only when stream is fully complete */}
          {hasIssues ? (
            <div className="border-l-[3px] border-teal pl-4">
              <span className="text-[11px] font-sans font-medium text-ink uppercase tracking-wider">
                Improved
              </span>
              <div className="mt-1.5">
                <HighlightedImproved text={displayText} phrases={fixedPhrases} />
              </div>
            </div>
          ) : (
            <div className="border-l-[3px] border-teal pl-4">
              <p className="font-sans text-sm text-ink font-medium">
                This is good writing! No changes needed.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <CopyButton
              text={displayText}
              onSave={() => {
                if (result) {
                  saveToShelf(
                    original,
                    result.improved_full,
                    result.issues,
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
        /* Status messages — occupy the space where Improved will appear */
        <RotatingStatus messages={QUICK_MESSAGES} />
      )}
    </div>
  );
}
