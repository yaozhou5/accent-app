"use client";

import { useState, useEffect } from "react";
import { Header } from "./Header";
import { TabBar } from "./TabBar";
import { WriteTab } from "./WriteTab";
import { ShelfTab } from "./ShelfTab";
import type { Locale } from "@/lib/i18n";
import { useTranslations } from "@/lib/i18n";

export function AppShell() {
  const [locale, setLocale] = useState<Locale>("en");
  const [activeTab, setActiveTab] = useState<"write" | "shelf">("write");
  const t = useTranslations(locale);

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
    <div className="max-w-[480px] mx-auto min-h-screen flex flex-col">
      <Header locale={locale} onLocaleChange={handleLocaleChange} />
      <TabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        labels={{ write: t("write"), shelf: t("shelf") }}
      />
      <main className="flex-1 px-4 py-4">
        {activeTab === "write" ? (
          <WriteTab locale={locale} />
        ) : (
          <ShelfTab locale={locale} />
        )}
      </main>
    </div>
  );
}
