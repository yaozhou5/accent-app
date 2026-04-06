"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;

    posthog.init(key, {
      api_host: "/ingest",
      ui_host: "https://eu.posthog.com",
      defaults: "2026-01-30",
      capture_exceptions: true,
      debug: process.env.NODE_ENV === "development",
    });
    // Expose globally for debugging
    (window as unknown as { posthog: typeof posthog }).posthog = posthog;
  }, []);

  return <>{children}</>;
}
