// The single source of truth for whether PostHog is allowed to persist
// anything or record replays. Read at init (instrumentation-client.ts) and
// written by the consent banner (components/ConsentBanner.tsx) — nothing
// else should touch this key directly.

export type AnalyticsConsent = "accepted" | "rejected";

const KEY = "analytics-consent";

export function getConsent(): AnalyticsConsent | null {
  if (typeof localStorage === "undefined") return null;
  const value = localStorage.getItem(KEY);
  return value === "accepted" || value === "rejected" ? value : null;
}

export function setConsent(value: AnalyticsConsent): void {
  try {
    localStorage.setItem(KEY, value);
  } catch {}
}
