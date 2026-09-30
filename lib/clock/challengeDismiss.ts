// Same pattern as modelIntro.ts, keyed per challenge id so dismissing
// last week's challenge doesn't also hide this week's.
const PREFIX = "accent-clock-challenge-dismissed-";

export function isChallengeDismissed(challengeId: string): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(PREFIX + challengeId) === "1";
  } catch {
    return false;
  }
}

export function markChallengeDismissed(challengeId: string): void {
  try {
    localStorage.setItem(PREFIX + challengeId, "1");
  } catch {
    // Private browsing or storage disabled — we'll just ask again next time.
  }
}

/** Reopening un-dismisses — a later visit should show the card again, not the reopen link. */
export function clearChallengeDismissed(challengeId: string): void {
  try {
    localStorage.removeItem(PREFIX + challengeId);
  } catch {}
}
