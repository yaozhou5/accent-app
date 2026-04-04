"use client";

import type { Verdict } from "@/lib/types";

interface VerdictBannerProps {
  verdict: Verdict;
  greatLabel: string;
}

export function VerdictBanner({ verdict, greatLabel }: VerdictBannerProps) {
  if (verdict === "great") {
    return (
      <div className="bg-sage-light border border-sage/30 rounded-lg px-4 py-3 text-sage font-sans text-sm font-medium">
        {greatLabel}
      </div>
    );
  }
  return null;
}
