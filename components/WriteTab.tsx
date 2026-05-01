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

    // For Latin-script texts, use franc at 25+ words
    // franc is unreliable on short texts — common false positives for English
    // include Scots, Latin, Norwegian, Danish, Dutch, Afrikaans, etc.
    if (wordCount >= 25) {
      const detected = franc(text, { minLength: 10 });
      const englishLike = ["eng", "und", "sco", "lat", "nno", "nob", "dan", "nld", "afr", "fry"];
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

  // Mode toggle — pill tabs matching Spread style
  const modeToggle = (
    <div className="flex gap-1 p-0.5 rounded-full" style={{ background: "#F5F5F5" }}>
      {(["quick", "teach"] as const).map((m) => (
        <button
          key={m}
          onClick={() => handleModeSwitch(m)}
          className="flex-1 py-2 rounded-full text-[13px] font-mono transition-all min-h-[40px]"
          style={{
            background: mode === m ? "#fff" : "transparent",
            color: mode === m ? "#1A1A18" : "#6B6B6B",
            border: "none",
            cursor: "pointer",
            boxShadow: mode === m ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
          }}
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
