"use client";

import { Locale, localeNames } from "@/lib/i18n";

interface HeaderProps {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
}

export function Header({ locale, onLocaleChange }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3">
      <h1 className="font-serif text-xl font-semibold tracking-tight">
        Accent
      </h1>
      <select
        value={locale}
        onChange={(e) => onLocaleChange(e.target.value as Locale)}
        className="bg-warm border border-sand rounded-md px-2 py-1 text-sm font-sans text-ink cursor-pointer focus:outline-none focus:ring-2 focus:ring-coral/30"
        aria-label="Language"
      >
        {(Object.entries(localeNames) as [Locale, string][]).map(
          ([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          )
        )}
      </select>
    </header>
  );
}
