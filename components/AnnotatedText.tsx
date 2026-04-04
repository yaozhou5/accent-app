"use client";

import type { AnnotatedPhrase } from "@/lib/types";

interface AnnotatedTextProps {
  text: string;
  phrases: AnnotatedPhrase[];
  onPhraseClick: (phrase: AnnotatedPhrase) => void;
}

export function AnnotatedText({
  text,
  phrases,
  onPhraseClick,
}: AnnotatedTextProps) {
  const sorted = [...phrases].sort((a, b) => a.startIndex - b.startIndex);

  const segments: Array<{
    text: string;
    phrase?: AnnotatedPhrase;
  }> = [];

  let cursor = 0;
  for (const phrase of sorted) {
    if (phrase.startIndex > cursor) {
      segments.push({ text: text.slice(cursor, phrase.startIndex) });
    }
    segments.push({
      text: text.slice(phrase.startIndex, phrase.endIndex),
      phrase,
    });
    cursor = phrase.endIndex;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return (
    <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
      {segments.map((seg, i) =>
        seg.phrase ? (
          <button
            key={i}
            onClick={() => onPhraseClick(seg.phrase!)}
            className={`rounded px-0.5 -mx-0.5 cursor-pointer transition-colors ${
              seg.phrase.type === "improve"
                ? "bg-coral/20 hover:bg-coral/30 text-coral"
                : "bg-sage/20 hover:bg-sage/30 text-sage"
            }`}
          >
            {seg.text}
          </button>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </div>
  );
}
