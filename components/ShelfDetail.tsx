"use client";

import { useState, useCallback } from "react";
import type { Locale } from "@/lib/i18n";
import type { Issue } from "@/lib/types";
import type { ShelfEntry } from "@/lib/supabase/shelf";

interface ShelfDetailProps {
  entry: ShelfEntry;
  locale: Locale;
  onBack: () => void;
  onDelete: (id: string) => void;
}

function HighlightedText({
  text,
  phrases,
  color,
}: {
  text: string;
  phrases: string[];
  color: "coral" | "teal";
}) {
  if (phrases.length === 0) {
    const cls =
      color === "coral"
        ? "font-sans text-sm leading-relaxed text-ink/60"
        : "font-sans text-sm leading-relaxed text-ink font-medium";
    return <p className={cls}>{text}</p>;
  }

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

  const baseCls =
    color === "coral"
      ? "font-sans text-sm leading-relaxed text-ink/60"
      : "font-sans text-sm leading-relaxed text-ink font-medium";
  const hlCls =
    color === "coral"
      ? "bg-[#FDF3CC] text-[#7A6010] rounded-[3px] px-1 py-px"
      : "bg-[#C8DDD5] text-[#1B3A2D] rounded-[3px] px-1 py-px";

  return (
    <p className={baseCls}>
      {segments.map((seg, i) =>
        seg.highlight ? (
          <span key={i} className={hlCls}>
            {seg.text}
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </p>
  );
}

function LessonPill({ lesson }: { lesson: Issue }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={`text-[12px] font-sans rounded-full px-3 py-1 transition-colors ${
          expanded
            ? "bg-[#FDF3CC] text-[#7A6010]"
            : "bg-warm text-ink/50 hover:bg-[#FDF3CC] hover:text-[#7A6010]"
        }`}
      >
        {lesson.title}
      </button>
      {expanded && (
        <div className="mt-2 bg-[#FDF3CC]/50 rounded-[8px] px-3.5 py-3 space-y-1.5">
          <p className="font-sans text-sm font-medium text-[#7A6010]">
            {lesson.lesson_title || lesson.title}
          </p>
          <p
            className="font-sans text-xs leading-relaxed text-ink/60 lesson-body"
            dangerouslySetInnerHTML={{ __html: lesson.lesson_body }}
          />
        </div>
      )}
    </div>
  );
}

type CopyState = "default" | "copying" | "copied";

export function ShelfDetail({
  entry,
  locale,
  onBack,
  onDelete,
}: ShelfDetailProps) {
  const [copyState, setCopyState] = useState<CopyState>("default");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const coralPhrases = entry.lessons.map((l) => l.phrase).filter(Boolean);
  const tealPhrases = entry.lessons
    .map((l) => l.fixed_phrase)
    .filter(Boolean);

  const handleCopy = useCallback(async () => {
    if (copyState !== "default") return;
    setCopyState("copying");
    await navigator.clipboard.writeText(entry.improved);
    setTimeout(() => {
      setCopyState("copied");
      setTimeout(() => setCopyState("default"), 2000);
    }, 500);
  }, [entry.improved, copyState]);

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(entry.id);
  };

  const dateStr = new Date(entry.created_at).toLocaleDateString(
    locale === "zh" ? "zh-CN" : locale === "nl" ? "nl-NL" : "en-US",
    { month: "long", day: "numeric", year: "numeric" }
  );

  return (
    <div className="space-y-4">
      {/* Date + mode */}
      <div className="text-xs font-sans text-ink/40">
        {dateStr}
        {" \u00B7 "}
        {entry.mode === "quick"
          ? "\u26A1 Quick fix"
          : "\uD83D\uDCD6 Teach me"}
      </div>

      {/* Original */}
      <div className="border-l-[3px] border-coral/40 rounded-[8px] bg-coral-light/50 px-4 py-3">
        <span className="text-xs font-sans font-semibold text-ink tracking-wide">
          Your original
        </span>
        <div className="mt-1.5">
          <HighlightedText
            text={entry.original}
            phrases={coralPhrases}
            color="coral"
          />
        </div>
      </div>

      {/* Arrow */}
      <div className="flex justify-center text-ink/20">
        <span className="text-lg">&darr;</span>
      </div>

      {/* Improved */}
      <div className="border-l-[3px] border-teal/40 rounded-[8px] bg-teal-light/50 px-4 py-3">
        <span className="text-xs font-sans font-semibold text-teal tracking-wide">
          Improved
        </span>
        <div className="mt-1.5">
          <HighlightedText
            text={entry.improved}
            phrases={tealPhrases}
            color="teal"
          />
        </div>
      </div>

      {/* Lesson pills */}
      {entry.lessons.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs font-sans font-semibold text-ink/40 tracking-wide">
            Lessons
          </span>
          <div className="flex flex-wrap gap-2">
            {entry.lessons.map((lesson, i) => (
              <LessonPill key={i} lesson={lesson} />
            ))}
          </div>
        </div>
      )}

      {/* Copy button */}
      <button
        onClick={handleCopy}
        disabled={copyState !== "default"}
        className={`w-full py-2.5 min-h-[44px] rounded-[8px] text-sm font-sans font-medium transition-colors ${
          copyState === "copied"
            ? "bg-teal text-white"
            : copyState === "copying"
              ? "bg-coral/70 text-[#1B3A2D]"
              : "bg-coral text-[#1B3A2D] hover:bg-coral/90"
        }`}
      >
        {copyState === "copied"
          ? "Copied \u2713"
          : copyState === "copying"
            ? "Copying\u2026"
            : "Copy improved"}
      </button>

      {/* Back to shelf */}
      <button
        onClick={onBack}
        className="w-full text-[13px] font-sans text-ink/40 hover:text-ink transition-colors py-1 text-center"
      >
        &larr; Back to shelf
      </button>

      {/* Delete */}
      <button
        onClick={handleDelete}
        className="w-full text-[13px] font-sans text-ink/30 hover:text-ink/60 transition-colors py-1 text-center"
      >
        {confirmDelete ? "Tap again to confirm delete" : "Delete this entry"}
      </button>
    </div>
  );
}
