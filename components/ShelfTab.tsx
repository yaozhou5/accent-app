"use client";

import { useState } from "react";
import { shelfPassages, type ShelfCategory } from "@/lib/shelf-data";
import type { Locale } from "@/lib/i18n";
import { useTranslations } from "@/lib/i18n";
import { PassageCard } from "./PassageCard";

interface ShelfTabProps {
  locale: Locale;
}

const categories: ShelfCategory[] = [
  "precision",
  "rhythm",
  "voice",
  "structure",
];

export function ShelfTab({ locale }: ShelfTabProps) {
  const t = useTranslations(locale);
  const [activeCategory, setActiveCategory] =
    useState<ShelfCategory>("precision");

  const filtered = shelfPassages.filter(
    (p) => p.category === activeCategory
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-sans font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat
                ? "bg-ink text-paper"
                : "bg-warm text-ink/60 hover:text-ink"
            }`}
          >
            {t(cat)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((passage) => (
          <PassageCard key={passage.id} passage={passage} locale={locale} />
        ))}
      </div>
    </div>
  );
}
