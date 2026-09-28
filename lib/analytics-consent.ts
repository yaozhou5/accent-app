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

// Sweeps every ph_* cookie and localStorage key — PostHog's own naming
// convention (posthog-js: 'ph_' + token + '_posthog'). Leaves the
// analytics-consent key itself alone, so the reject choice is remembered.
// Cookies are cleared for both the bare host and .hostname, since
// cross_subdomain_cookie may have set the domain-qualified form.
export function clearPostHogStorage(): void {
  try {
    document.cookie.split(";").forEach((entry) => {
      const name = entry.split("=")[0]?.trim();
      if (!name?.startsWith("ph_")) return;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${location.hostname};`;
    });
  } catch {}
  try {
    Object.keys(localStorage)
      .filter((key) => key.startsWith("ph_"))
      .forEach((key) => localStorage.removeItem(key));
  } catch {}
}
