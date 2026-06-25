"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { franc } from "franc";
import posthog from "posthog-js";
import { useStreamingCheck } from "@/lib/use-streaming-check";
import { InputScreen } from "@/components/InputScreen";
import { QuickResult } from "@/components/QuickResult";
import { TeachResult } from "@/components/TeachResult";
import { getSessionCount, saveSession } from "@/lib/voice-profile";
import type { WriteMode } from "@/lib/types";

const INK = "#1A1A18";
const DIM = "#6B6860";
const FAINT = "#A8A49C";
const ACCENT = "#4A6CF7";
const CREAM = "#F7F4EF";

export default function CheckPage() {
  const [mode, setMode] = useState<WriteMode>("quick");
  const [text, setText] = useState("");
  const [langError, setLangError] = useState<string | null>(null);
  const { fixState, explainState, fixResult, issues, error, submitFix, requestExplain, reset } = useStreamingCheck();

  const handleSubmit = async () => {
    if (!text.trim()) return;
    setLangError(null);
    const wordCount = text.trim().split(/\s+/).length;
    const nonLatinPattern =
      /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f\uac00-\ud7af\u0600-\u06ff\u0590-\u05ff\u0400-\u04ff\u0e00-\u0e7f\u0900-\u097f]/;
    if (nonLatinPattern.test(text)) {
      setLangError("Accent currently supports English only. More languages coming soon.");
      return;
    }
    if (wordCount >= 10) {
      const detected = franc(text, { minLength: 10 });
      if (!["eng", "und", "sco", "lat"].includes(detected)) {
        setLangError("Accent currently supports English only. More languages coming soon.");
        return;
      }
    }
    posthog.capture("check_submitted", { mode, word_count: wordCount });
    const fix = await submitFix(text);
    if (fix) {
      posthog.capture("check_result_completed", {
        mode,
        phrases_count: fix.phrases.length,
        had_changes: fix.phrases.length > 0,
      });
      if (mode === "teach") requestExplain(text, fix);
    }
    saveSession({
      date: new Date().toISOString(),
      draftExcerpt: text.slice(0, 200),
      phrasesKept: [],
      phrasesReplaced: [],
      wordFrequency: {},
    });
  };

  useEffect(() => {
    if (mode === "teach" && fixResult && explainState === "idle" && issues === null) requestExplain(text, fixResult);
  }, [mode, fixResult, explainState, issues, text, requestExplain]);

  const handleNew = () => {
    setText("");
    setLangError(null);
    reset();
  };
  const showResult = fixState === "fixing" || fixState === "done";

  const modeToggle = (
    <div className="relative flex rounded-[12px] border border-ink/15 bg-ink/[0.03] p-1">
      <div
        className="absolute top-1 bottom-1 bg-white rounded-[8px] shadow-sm transition-all duration-200 ease-out"
        style={{ left: mode === "quick" ? "4px" : "50%", right: mode === "quick" ? "50%" : "4px" }}
      />
      {(["quick", "teach"] as const).map((m) => (
        <button
          key={m}
          onClick={() => {
            if (m !== mode) posthog.capture("check_mode_switched", { mode: m });
            setMode(m);
          }}
          className={`relative z-10 flex-1 flex items-center justify-center py-2.5 min-h-[44px] text-[15px] font-sans transition-colors duration-200 tracking-[-0.1px] ${mode === m ? "text-ink font-semibold" : "text-ink/50 font-normal hover:text-ink/70"}`}
        >
          {m === "quick" ? "Quick fix" : "Teach me"}
        </button>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col" style={{ background: CREAM, color: INK }}>
      {/* Nav */}
      <nav
        className="px-6 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid rgba(26,26,24,0.1)" }}
      >
        <Link href="/" className="font-serif text-[20px] no-underline" style={{ color: INK, fontWeight: 400 }}>
          accent<span style={{ color: ACCENT }}>.</span>
        </Link>
        <Link
          href="/signup"
          className="no-underline px-5 py-2 rounded-full text-[13px] font-sans font-semibold"
          style={{ background: INK, color: CREAM }}
        >
          Start your workspace
        </Link>
      </nav>

      <div className="flex-1 flex flex-col max-w-[480px] md:max-w-[600px] mx-auto w-full px-4 md:px-6 py-8">
        <div className="space-y-5 flex-1">
          {modeToggle}
          {!showResult ? (
            <InputScreen
              locale="en"
              onLocaleChange={() => {}}
              mode={mode}
              text={text}
              onTextChange={(t) => {
                setText(t);
                if (langError) setLangError(null);
              }}
              onSubmit={handleSubmit}
              loading={false}
              error={error}
              langError={langError}
            />
          ) : (
            <>
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
              {fixState === "done" && (
                <div className="text-center pt-6 pb-4" style={{ borderTop: "1px solid rgba(26,26,24,0.1)" }}>
                  <Link
                    href="/"
                    className="no-underline inline-block px-7 py-3 rounded-full font-sans font-semibold text-[14px] transition-opacity hover:opacity-90"
                    style={{ background: INK, color: CREAM }}
                  >
                    Want AI that coaches your voice instead of replacing it? &rarr;
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer
        className="px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4"
        style={{ borderTop: "1px solid rgba(26,26,24,0.1)" }}
      >
        <span className="font-serif text-[16px]" style={{ color: INK }}>
          accent<span style={{ color: ACCENT }}>.</span>
        </span>
        <div className="flex gap-6 text-[12px] font-sans" style={{ color: FAINT }}>
          <Link href="/privacy-contact" className="no-underline hover:underline" style={{ color: FAINT }}>
            Privacy
          </Link>
          <a href="mailto:hello@myaccent.io" className="no-underline hover:underline" style={{ color: FAINT }}>
            Contact
          </a>
        </div>
      </footer>
    </div>
  );
}
