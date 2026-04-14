"use client";

import { useRef, useCallback } from "react";
import type { Locale } from "@/lib/i18n";
import type { WriteMode } from "@/lib/types";
import { localeNames, SHOW_LANGUAGE_SELECTOR } from "@/lib/i18n";
import { WordCounter } from "./WordCounter";
import { useKeyboardHeight } from "@/lib/use-keyboard-height";

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const keyboardHeight = useKeyboardHeight();

  const subtitle =
    mode === "quick"
      ? "Paste it. I\u2019ll fix it fast."
      : "Paste it. I\u2019ll explain every choice.";

  const handleFocus = useCallback(() => {
    setTimeout(() => {
      textareaRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 300);
  }, []);

  return (
    <div className="space-y-4 pb-20">
      <div>
        <h2 className="font-serif font-bold text-2xl text-ink">
          What are you writing?
        </h2>
        <p className="mt-1 font-sans text-sm text-ink/60">{subtitle}</p>
      </div>

      <div>
        <textarea
          ref={textareaRef}
          aria-label="Your writing draft"
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          onFocus={handleFocus}
          placeholder="Paste your draft..."
          className="w-full h-48 bg-warm border border-ink/10 rounded-[12px] px-4 py-3 font-mono text-sm leading-relaxed text-ink placeholder:text-ink/30 resize-y focus:outline-none focus:ring-2 focus:ring-ink/10 focus:border-ink/20"
        />
        <WordCounter text={text} />
      </div>

      {error && (
        <div className="bg-[#FBE9E4] border border-[#C4553A]/30 rounded-[8px] px-4 py-3 text-[#C4553A] font-sans text-sm">
          {error}
        </div>
      )}

      {langError && (
        <p className="text-[13px] font-sans text-ink/40 text-center">
          {langError}
        </p>
      )}

      {/* CTA — fixed on mobile (keyboard-aware), sticky within column on desktop */}
      <div
        className="fixed left-0 right-0 bg-paper px-4 pb-6 pt-3 md:sticky md:left-auto md:right-auto md:bottom-0 md:px-0 md:pb-6 md:pt-4"
        style={{ bottom: keyboardHeight }}
      >
        <div className="max-w-[480px] md:max-w-none mx-auto px-0 flex gap-2.5">
          {SHOW_LANGUAGE_SELECTOR && (
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
          )}
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className={`flex-1 font-sans font-medium text-sm py-3 rounded-[12px] transition-colors flex items-center justify-center gap-2 min-h-[44px] ${
              canSubmit
                ? "bg-ink text-white hover:bg-ink/90 cursor-pointer"
                : "bg-ink/10 text-ink/30 cursor-not-allowed"
            }`}
          >
            {loading ? "Analyzing..." : "Fix it"}
          </button>
        </div>
      </div>
    </div>
  );
}
