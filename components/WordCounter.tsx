"use client";

const WORD_LIMIT = 500;

interface WordCounterProps {
  text: string;
}

export function WordCounter({ text }: WordCounterProps) {
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const isOver = wordCount > WORD_LIMIT;

  return (
    <p
      className={`mt-1.5 text-xs font-sans text-right ${
        isOver ? "text-ink font-medium" : "text-ink/30"
      }`}
    >
      {wordCount} / {WORD_LIMIT} words
    </p>
  );
}
