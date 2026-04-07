"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { Header } from "./Header";
import { WriteTab } from "./WriteTab";
import { ShelfTab } from "./ShelfTab";
import { CookieBanner } from "./CookieBanner";
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
    <>
      <div className="max-w-[480px] md:max-w-[600px] mx-auto min-h-screen flex flex-col bg-paper md:shadow-[0_0_40px_rgba(0,0,0,0.06)]">
        <Header
          activeTab={activeTab}
          onTabChange={(tab) => {
            posthog.capture("tab_switched", { tab });
            setActiveTab(tab);
          }}
          tabLabels={{ write: t("write"), shelf: t("shelf") }}
        />
        <main className="flex-1 px-4 md:px-6 py-5">
          {activeTab === "write" ? (
            <WriteTab locale={locale} onLocaleChange={handleLocaleChange} />
          ) : (
            <ShelfTab locale={locale} />
          )}
        </main>
        <footer className="px-4 md:px-6 py-4 border-t border-ink/10 flex items-center justify-center gap-4">
          <Link
            href="/privacy-contact"
            className="text-[11px] font-sans text-ink/40 hover:text-ink/60 transition-colors"
          >
            Privacy &amp; contact
          </Link>
          <span className="text-[11px] font-sans text-ink/30">·</span>
          <span className="text-[11px] font-sans text-ink/40">
            © 2026 Shay Works
          </span>
        </footer>
      </div>
      <CookieBanner />
    </>
  );
}
