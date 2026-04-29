"use client";

import { useState, useEffect } from "react";
import { WriteTab } from "./WriteTab";
import { CookieBanner } from "./CookieBanner";
import type { Locale } from "@/lib/i18n";

export function AppShell() {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem("accent-locale") as Locale | null;
    if (saved && ["en", "zh", "nl"].includes(saved)) {
      setLocale(saved);
    }
  }, []);

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem("accent-locale", newLocale);
  };

  return (
    <>
      <WriteTab locale={locale} onLocaleChange={handleLocaleChange} />
      <CookieBanner />
    </>
  );
}
