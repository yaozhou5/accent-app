const KEY = "accent-clock-model-intro-seen";

export function hasSeenModelIntro(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markModelIntroSeen(): void {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // Private browsing or storage disabled — we'll just ask again next time.
  }
}
