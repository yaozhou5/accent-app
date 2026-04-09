"use client";

import { useState } from "react";
import type { PracticeCheckResponse } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import { useTranslations } from "@/lib/i18n";

interface PracticeBoxProps {
  originalPhrase: string;
  context: string;
  locale: Locale;
}

export function PracticeBox({
  originalPhrase,
  context,
  locale,
}: PracticeBoxProps) {
  const t = useTranslations(locale);
  const [attempt, setAttempt] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<PracticeCheckResponse | null>(null);

  const handleCheck = async () => {
    if (!attempt.trim() || loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/practice-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          original: originalPhrase,
          userAttempt: attempt,
          context,
          language: locale,
        }),
      });
      const data = (await res.json()) as PracticeCheckResponse;
      setFeedback(data);
    } catch (error) {
      console.error("Practice check failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-sans font-medium text-ink/60">
        {t("tryWritingIt")}
      </p>
      <textarea
        aria-label="Your rewrite attempt"
        value={attempt}
        onChange={(e) => setAttempt(e.target.value)}
        placeholder={t("feedbackPlaceholder")}
        className="w-full h-20 bg-paper border border-sand rounded-md px-2.5 py-2 font-mono text-sm leading-relaxed text-ink placeholder:text-ink/30 resize-none focus:outline-none focus:ring-2 focus:ring-coral/30"
      />
      <button
        onClick={handleCheck}
        disabled={!attempt.trim() || loading}
        className="text-sm font-sans font-medium text-ink hover:text-ink/70 transition-colors disabled:text-ink/40 min-h-[44px] px-2"
      >
        {loading ? "..." : feedback ? t("checkAgain") : t("submit")}
      </button>

      {feedback && (
        <div
          className={`rounded-md px-3 py-2 text-sm font-sans ${
            feedback.isImproved
              ? "bg-sage-light text-sage"
              : "bg-[#FBE9E4] text-[#C4553A]"
          }`}
        >
          <p>{feedback.feedback}</p>
          {feedback.suggestions.length > 0 && (
            <ul className="mt-1.5 list-disc list-inside text-xs">
              {feedback.suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
