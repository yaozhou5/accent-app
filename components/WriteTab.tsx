"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import { useTranslations } from "@/lib/i18n";
import { QuickMode } from "./QuickMode";
import { LearnMode } from "./LearnMode";

interface WriteTabProps {
  locale: Locale;
}

export function WriteTab({ locale }: WriteTabProps) {
  const t = useTranslations(locale);
  const [mode, setMode] = useState<"quick" | "learn">("quick");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["quick", "learn"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-sans font-medium transition-colors ${
              mode === m
                ? "bg-ink text-paper"
                : "bg-warm text-ink/60 hover:text-ink"
            }`}
          >
            <span>{m === "quick" ? "\u26A1" : "\uD83D\uDCD6"}</span>
            {t(m)}
          </button>
        ))}
      </div>

      {mode === "quick" ? (
        <QuickMode locale={locale} />
      ) : (
        <LearnMode locale={locale} />
      )}
    </div>
  );
}
