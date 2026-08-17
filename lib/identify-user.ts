import posthog from "posthog-js";

// Links this browser's PostHog activity to the real account. Supabase user
// id is the distinct_id (not email) so it matches auth.users.id/profiles.id
// for direct cross-referencing. PostHog merges the browser's current
// (often anonymous) distinct_id's full event history into the identified
// person the first time this fires for a given browser/session — call
// on login, signup, and session restore so returning users get linked too.
export function identifyUser(user: { id: string; email?: string | null }): void {
  try {
    posthog.identify(user.id, user.email ? { email: user.email } : undefined);
  } catch {}
}
