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

    // Language detection — only block clearly non-English text
    // franc is unreliable for short English text (often returns Scots, etc.)
    // So we only check texts 30+ words AND only block non-Latin scripts
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount >= 30) {
      const detected = franc(text, { minLength: 20 });
      // Allow English and any closely related Latin-script languages
      // Only block clearly non-English: Chinese, Japanese, Korean, Arabic, etc.
      const latinLangs = [
        "eng", "und", "sco", "fra", "deu", "spa", "ita", "por",
        "nld", "dan", "nor", "swe", "cat", "ron", "pol", "ces",
        "slk", "hrv", "slv", "fin", "est", "hun", "tur", "ind",
        "msa", "tgl", "vie", "lat",
      ];
      if (!latinLangs.includes(detected)) {
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

  // Mode toggle — segmented control with sliding pill
  const modeToggle = (
    <div className="relative flex rounded-[12px] border border-ink/15 bg-ink/[0.03] p-1">
      {/* Sliding active pill */}
      <div
        className="absolute top-1 bottom-1 bg-white rounded-[8px] shadow-sm transition-all duration-200 ease-out"
        style={{
          left: mode === "quick" ? "4px" : "50%",
          right: mode === "quick" ? "50%" : "4px",
        }}
      />
      {(["quick", "teach"] as const).map((m) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          title={m === "quick" ? "Fix your writing instantly" : "Learn why each change was made"}
          className={`relative z-10 flex-1 flex items-center justify-center py-2.5 min-h-[44px] text-[15px] font-sans transition-colors duration-200 tracking-[-0.1px] ${
            mode === m
              ? "text-ink font-semibold"
              : "text-ink/50 font-normal hover:text-ink/70"
          }`}
        >
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
          sessionCount={getSessionCount()}
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
