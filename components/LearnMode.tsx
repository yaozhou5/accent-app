"use client";

import { useState } from "react";
import type { AnnotatedPhrase, LearnCheckResponse } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import { useTranslations } from "@/lib/i18n";
import {
  getSessionCount,
  getKeptPhrases,
  saveSession,
} from "@/lib/voice-profile";
import { VerdictBanner } from "./VerdictBanner";
import { AnnotatedText } from "./AnnotatedText";
import { PhraseCard } from "./PhraseCard";

interface LearnModeProps {
  locale: Locale;
}

export function LearnMode({ locale }: LearnModeProps) {
  const t = useTranslations(locale);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LearnCheckResponse | null>(null);
  const [selectedPhrase, setSelectedPhrase] =
    useState<AnnotatedPhrase | null>(null);

  const handleCheck = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setSelectedPhrase(null);

    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          mode: "learn",
          language: locale,
          sessionCount: getSessionCount(),
          keptPhrases: getKeptPhrases(),
        }),
      });
      const data = (await res.json()) as LearnCheckResponse;
      setResult(data);

      const voicePhrases = data.annotatedPhrases
        .filter((p) => p.type === "voice")
        .map((p) => p.text);
      const improvedPhrases = data.annotatedPhrases
        .filter((p) => p.type === "improve")
        .map((p) => p.text);

      saveSession({
        date: new Date().toISOString(),
        draftExcerpt: text.slice(0, 200),
        phrasesKept: voicePhrases,
        phrasesReplaced: improvedPhrases,
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
          <VerdictBanner
            verdict={result.verdict}
            greatLabel={t("greatWriting")}
          />

          <AnnotatedText
            text={result.original}
            phrases={result.annotatedPhrases}
            onPhraseClick={setSelectedPhrase}
          />

          {selectedPhrase && (
            <PhraseCard phrase={selectedPhrase} locale={locale} />
          )}

          {result.teachingNotes && (
            <div className="bg-warm rounded-lg px-3 py-2.5">
              <span className="text-xs font-sans font-medium text-sand uppercase tracking-wide">
                {t("teachingNotes")}
              </span>
              <p className="mt-1 font-serif text-sm leading-relaxed text-ink">
                {result.teachingNotes}
              </p>
            </div>
          )}

          {result.practicePrompts.length > 0 && (
            <div className="bg-warm rounded-lg px-3 py-2.5">
              <span className="text-xs font-sans font-medium text-sand uppercase tracking-wide">
                {t("practicePrompt")}
              </span>
              <ul className="mt-1.5 space-y-1">
                {result.practicePrompts.map((prompt, i) => (
                  <li
                    key={i}
                    className="font-serif text-sm leading-relaxed text-ink"
                  >
                    {prompt}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
