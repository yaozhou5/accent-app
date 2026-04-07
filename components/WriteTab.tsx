"use client";

import { useState, useEffect } from "react";
import { franc } from "franc";
import posthog from "posthog-js";
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
  const {
    fixState,
    explainState,
    fixResult,
    issues,
    error,
    submitFix,
    requestExplain,
    reset,
  } = useStreamingCheck();

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLangError(null);

    const wordCount = text.trim().split(/\s+/).length;

    // Detect non-Latin scripts directly (works for languages without spaces)
    // CJK, Arabic, Hebrew, Cyrillic, Thai, Devanagari, etc.
    const nonLatinPattern =
      /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f\uac00-\ud7af\u0600-\u06ff\u0590-\u05ff\u0400-\u04ff\u0e00-\u0e7f\u0900-\u097f]/;
    if (nonLatinPattern.test(text)) {
      setLangError(
        "Accent currently supports English only. More languages coming soon."
      );
      return;
    }

    // For Latin-script texts, use franc at 10+ words
    // Only allow English and common false-positives for English (Scots, Latin)
    if (wordCount >= 10) {
      const detected = franc(text, { minLength: 10 });
      const englishLike = ["eng", "und", "sco", "lat"];
      if (!englishLike.includes(detected)) {
        setLangError(
          "Accent currently supports English only. More languages coming soon."
        );
        return;
      }
    }

    posthog.capture("writing_submitted", {
      mode,
      word_count: wordCount,
      session_count: getSessionCount(),
    });

    const fix = await submitFix(text);

    if (fix) {
      posthog.capture("writing_result_completed", {
        mode,
        phrases_count: fix.phrases.length,
        had_changes: fix.phrases.length > 0,
        word_count: wordCount,
      });

      // If user is in Teach mode, kick off Step 2 immediately
      if (mode === "teach") {
        requestExplain(text, fix);
      }
    }

    saveSession({
      date: new Date().toISOString(),
      draftExcerpt: text.slice(0, 200),
      phrasesKept: [],
      phrasesReplaced: [],
      wordFrequency: {},
    });
  };

  // If user switches to Teach mode after fix is done, lazily request explain
  useEffect(() => {
    if (
      mode === "teach" &&
      fixResult &&
      explainState === "idle" &&
      issues === null
    ) {
      requestExplain(text, fixResult);
    }
  }, [mode, fixResult, explainState, issues, text, requestExplain]);

  const handleModeSwitch = (m: WriteMode) => {
    if (m !== mode) {
      posthog.capture("mode_switched", { mode: m });
    }
    setMode(m);
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

  const showResult = fixState === "fixing" || fixState === "done";

  // Mode toggle — segmented control with sliding pill
  const modeToggle = (
    <div className="relative flex rounded-[12px] border border-ink/15 bg-ink/[0.03] p-1">
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
          onClick={() => handleModeSwitch(m)}
          title={
            m === "quick"
              ? "Fix your writing instantly"
              : "Learn why each change was made"
          }
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
          fixResult={fixResult}
          isFixing={fixState === "fixing"}
          onNew={handleNew}
          sessionCount={getSessionCount()}
        />
      )}
      {mode === "teach" && (
        <TeachResult
          original={text}
          fixResult={fixResult}
          issues={issues}
          isFixing={fixState === "fixing"}
          isExplaining={explainState === "explaining"}
          onNew={handleNew}
        />
      )}
    </div>
  );
}
