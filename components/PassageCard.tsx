"use client";

import { useState } from "react";
import type { ShelfPassage } from "@/lib/shelf-data";
import type { Locale } from "@/lib/i18n";
import { useTranslations } from "@/lib/i18n";
import { PracticeBox } from "./PracticeBox";

interface PassageCardProps {
  passage: ShelfPassage;
  locale: Locale;
}

export function PassageCard({ passage, locale }: PassageCardProps) {
  const t = useTranslations(locale);
  const [showPrompt, setShowPrompt] = useState(false);

  return (
    <div className="bg-warm rounded-xl px-4 py-4 space-y-3">
      <blockquote className="font-serif font-bold text-sm leading-relaxed text-ink italic">
        &ldquo;{passage.excerpt}&rdquo;
      </blockquote>
      <p className="font-sans text-xs text-ink/50 font-medium">
        &mdash; {passage.author}
      </p>

      <div>
        <span className="text-xs font-sans font-medium text-ink/50 uppercase tracking-wide">
          {t("craftLesson")}
        </span>
        <p className="mt-1 font-sans text-xs leading-relaxed text-ink">
          {passage.craftLesson}
        </p>
      </div>

      <button
        onClick={() => setShowPrompt(!showPrompt)}
        className="text-sm font-sans font-medium text-coral hover:text-coral/80 transition-colors min-h-[44px] px-2"
      >
        {showPrompt ? t("close") : t("tryIt")}
      </button>

      {showPrompt && (
        <div className="space-y-2 pt-1">
          <p className="font-sans text-xs text-ink leading-relaxed">
            {passage.writingPrompt}
          </p>
          <PracticeBox
            originalPhrase={passage.excerpt}
            context={`Writing prompt: ${passage.writingPrompt}. Inspired by ${passage.author}'s style.`}
            locale={locale}
          />
        </div>
      )}
    </div>
  );
}
