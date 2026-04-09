"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { AppNav } from "@/components/AppNav";
import type { Locale } from "@/lib/i18n";

const ShelfTab = dynamic(
  () => import("@/components/ShelfTab").then((m) => m.ShelfTab),
  { ssr: false }
);

export default function ShelfPage() {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem("accent-locale") as Locale | null;
    if (saved && ["en", "zh", "nl"].includes(saved)) {
      setLocale(saved);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#FDFAF3]">
      <AppNav />
      <div className="max-w-[480px] md:max-w-[600px] mx-auto min-h-screen flex flex-col bg-paper md:shadow-[0_0_40px_rgba(0,0,0,0.06)]">
        <main className="flex-1 px-4 md:px-6 py-5">
          <ShelfTab locale={locale} />
        </main>
      </div>
    </div>
  );
}
