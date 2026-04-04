"use client";

import { useState } from "react";
import type { QuickCheckResponse } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import { useTranslations } from "@/lib/i18n";
import { getSessionCount, saveSession } from "@/lib/voice-profile";
import { VerdictBanner } from "./VerdictBanner";
import { BeforeAfter } from "./BeforeAfter";

interface QuickModeProps {
  locale: Locale;
}

export function QuickMode({ locale }: QuickModeProps) {
  const t = useTranslations(locale);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuickCheckResponse | null>(null);

  const handleCheck = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          mode: "quick",
          language: locale,
          sessionCount: getSessionCount(),
        }),
      });
      const data = (await res.json()) as QuickCheckResponse;
      setResult(data);

      saveSession({
        date: new Date().toISOString(),
        draftExcerpt: text.slice(0, 200),
        phrasesKept: [],
        phrasesReplaced: [],
        wordFrequency: {},
      });
    } catch (error) {
      console.error("Check failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("placeholder")}
        className="w-full h-40 bg-warm border border-sand rounded-lg px-3 py-2.5 font-mono text-sm leading-relaxed text-ink placeholder:text-sand resize-none focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral/50"
      />
      <button
        onClick={handleCheck}
        disabled={!text.trim() || loading}
        className="w-full bg-coral text-white font-sans font-medium text-sm py-2.5 rounded-lg hover:bg-coral/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "..." : t("checkButton")}
      </button>

      {result && (
        <div className="space-y-4 pt-2">
          <VerdictBanner verdict={result.verdict} greatLabel={t("greatWriting")} />

          {result.rewrite && (
            <BeforeAfter
              before={result.original}
              after={result.rewrite}
              beforeLabel={t("before")}
              afterLabel={t("after")}
            />
          )}

          {result.microLesson && (
            <div className="bg-warm rounded-lg px-3 py-2.5">
              <span className="text-xs font-sans font-medium text-sand uppercase tracking-wide">
                {t("microLesson")}
              </span>
              <p className="mt-1 font-serif text-sm leading-relaxed text-ink">
                {result.microLesson}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
