"use client";

import type { Locale } from "@/lib/i18n";
import type { WriteMode } from "@/lib/types";
import { localeNames } from "@/lib/i18n";
import { WordCounter } from "./WordCounter";

interface InputScreenProps {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
  mode: WriteMode;
  text: string;
  onTextChange: (text: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
  langError?: string | null;
}

export function InputScreen({
  locale,
  onLocaleChange,
  mode,
  text,
  onTextChange,
  onSubmit,
  loading,
  error,
  langError,
}: InputScreenProps) {
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const canSubmit = !!text.trim() && wordCount <= 500 && !loading && !langError;

  const subtitle =
    mode === "quick"
      ? "Paste it. I\u2019ll fix it fast."
      : "Paste it. I\u2019ll explain every choice.";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif font-bold text-2xl text-ink">
          What are you writing?
        </h2>
        <p className="mt-1 font-sans text-sm text-ink/60">{subtitle}</p>
      </div>

      <div>
        <textarea
          aria-label="Your writing draft"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Paste your draft..."
          className="w-full h-48 bg-warm border border-ink/10 rounded-[12px] px-4 py-3 font-mono text-sm leading-relaxed text-ink placeholder:text-ink/30 resize-y focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink/20"
        />
        <WordCounter text={text} />
      </div>

      <div className="flex gap-2.5">
        <select
          value={locale}
          onChange={(e) => onLocaleChange(e.target.value as Locale)}
          className="bg-white border border-ink/10 rounded-[12px] px-3 py-3 text-sm font-sans text-ink cursor-pointer focus:outline-none focus:ring-2 focus:ring-coral/20"
          aria-label="Language"
        >
          {(Object.entries(localeNames) as [Locale, string][]).map(
            ([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            )
          )}
        </select>
        <button
          onClick={onSubmit}
          disabled={!canSubmit}
          className={`flex-1 font-sans font-medium text-sm py-3 rounded-[12px] transition-colors flex items-center justify-center gap-2 min-h-[44px] ${
            canSubmit
              ? "bg-coral text-white hover:bg-coral/90 cursor-pointer"
              : "bg-ink/10 text-ink/30 cursor-not-allowed"
          }`}
        >
          <span>&#9889;</span>
          {loading ? "Analyzing..." : "Fix it"}
        </button>
      </div>

      {error && (
        <div className="bg-coral-light border border-coral/20 rounded-[8px] px-4 py-3 text-coral font-sans text-sm">
          {error}
        </div>
      )}

      {langError && (
        <p className="text-[13px] font-sans text-ink/40 text-center">
          {langError}
        </p>
      )}
    </div>
  );
}
