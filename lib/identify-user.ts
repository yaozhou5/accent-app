import posthog from "posthog-js";
import { getConsent } from "@/lib/analytics-consent";

// Links this browser's PostHog activity to the real account. Supabase user
// id is the distinct_id, and the only identifier sent to PostHog — no
// email, so PostHog never holds PII for this app. It still matches
// auth.users.id/profiles.id for direct cross-referencing. PostHog merges
// the browser's current (often anonymous) distinct_id's full event history
// into the identified person the first time this fires for a given
// browser/session — call on login, signup, and session restore so
// returning users get linked too.
//
// No-ops unless analytics consent is "accepted" — callers (signup, login)
// don't need to know about consent state themselves, they just call this
// unconditionally and it does nothing until the user has opted in.
export function identifyUser(user: { id: string }): void {
  if (getConsent() !== "accepted") return;
  try {
    posthog.identify(user.id);
  } catch {}
}
