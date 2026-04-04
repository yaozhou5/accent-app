"use client";

import type { AnnotatedPhrase } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import { PracticeBox } from "./PracticeBox";

interface PhraseCardProps {
  phrase: AnnotatedPhrase;
  locale: Locale;
}

export function PhraseCard({ phrase, locale }: PhraseCardProps) {
  if (phrase.type === "voice") {
    return (
      <div className="bg-sage-light rounded-lg px-3 py-2.5">
        <p className="font-mono text-sm text-sage font-medium">
          &ldquo;{phrase.text}&rdquo;
        </p>
        {phrase.explanation && (
          <p className="mt-1 font-sans text-xs text-sage/80">
            {phrase.explanation}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-coral-light rounded-lg px-3 py-2.5">
      <p className="font-mono text-sm text-coral font-medium">
        &ldquo;{phrase.text}&rdquo;
      </p>
      {phrase.explanation && (
        <p className="mt-1.5 font-sans text-xs text-ink/70">
          {phrase.explanation}
        </p>
      )}
      {phrase.rewrites && phrase.rewrites.length > 0 && (
        <div className="mt-2 space-y-1">
          {phrase.rewrites.map((rw, i) => (
            <p
              key={i}
              className="font-mono text-xs text-ink/60 pl-2 border-l-2 border-coral/30"
            >
              {rw}
            </p>
          ))}
        </div>
      )}
      <PracticeBox
        originalPhrase={phrase.text}
        context={phrase.explanation || ""}
        locale={locale}
      />
    </div>
  );
}
