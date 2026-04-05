"use client";

import { useState } from "react";
import { franc } from "franc";
import type { Locale } from "@/lib/i18n";
import type { WriteMode } from "@/lib/types";
import { getSessionCount, saveSession } from "@/lib/voice-profile";
import { useStreamingCheck } from "@/lib/use-streaming-check";
import { InputScreen } from "./InputScreen";
import { QuickResult } from "./QuickResult";
import { TeachResult } from "./TeachResult";

interface WriteTabProps {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
}

export function WriteTab({ locale, onLocaleChange }: WriteTabProps) {
  const [mode, setMode] = useState<WriteMode>("quick");
  const [text, setText] = useState("");
  const [langError, setLangError] = useState<string | null>(null);
  const { streamState, streamedText, result, error, submit, reset } =
    useStreamingCheck();

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLangError(null);

    // Language detection — skip for short texts or undetermined
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount >= 10) {
      const detected = franc(text, { minLength: 10 });
      if (detected !== "eng" && detected !== "und") {
        setLangError(
          "Accent currently supports English only. More languages coming soon."
        );
        return;
      }
    }

    await submit(text, locale, getSessionCount());

    saveSession({
      date: new Date().toISOString(),
      draftExcerpt: text.slice(0, 200),
      phrasesKept: [],
      phrasesReplaced: [],
      wordFrequency: {},
    });
  };

  const handleNew = () => {
    setText("");
    setLangError(null);
    reset();
  };

  const handleTextChange = (newText: string) => {
    setText(newText);
    if (langError) setLangError(null);
  };

  const showResult = streamState === "streaming" || streamState === "done";

  // Mode toggle
  const modeToggle = (
    <div className="flex rounded-[12px] border border-ink/10 overflow-hidden">
      {(["quick", "teach"] as const).map((m) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 min-h-[44px] text-sm font-sans font-medium transition-colors ${
            mode === m
              ? "bg-white text-ink"
              : "bg-ink/[0.03] text-ink/40 hover:text-ink/60"
          }`}
        >
          <span>{m === "quick" ? "\u26A1" : "\uD83D\uDCD6"}</span>
          {m === "quick" ? "Quick fix" : "Teach me"}
        </button>
      ))}
    </div>
  );

  if (!showResult) {
    return (
      <div className="space-y-5">
        {modeToggle}
        <InputScreen
          locale={locale}
          onLocaleChange={onLocaleChange}
          mode={mode}
          text={text}
          onTextChange={handleTextChange}
          onSubmit={handleSubmit}
          loading={false}
          error={error}
          langError={langError}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {modeToggle}
      {mode === "quick" && (
        <QuickResult
          original={text}
          streamedText={streamedText}
          result={result}
          isStreaming={streamState === "streaming"}
          onNew={handleNew}
        />
      )}
      {mode === "teach" && (
        <TeachResult
          original={text}
          result={result}
          isStreaming={streamState === "streaming"}
          onNew={handleNew}
        />
      )}
    </div>
  );
}
