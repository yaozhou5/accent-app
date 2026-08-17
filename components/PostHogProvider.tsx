"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Actual init lives in instrumentation-client.ts, which runs before
    // hydration — this used to call posthog.init() again, but posthog-js
    // no-ops any re-init after the first, so it never took effect. Kept
    // only for the debug exposure below.
    (window as unknown as { posthog: typeof posthog }).posthog = posthog;
  }, []);

  return <>{children}</>;
}
