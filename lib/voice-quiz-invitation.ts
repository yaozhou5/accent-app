// Client-only localStorage helpers for the "sound more like you" banner
// shown on a draft generated without a voice profile. Separate from the
// dashboard's unrelated voice_quiz_prompt_* pair (different trigger,
// different copy).

const DISMISSED_KEY = "voice_quiz_invitation_dismissed";
const COUNT_KEY = "voice_quiz_invitation_draft_count";

// Re-show the banner after this many more profile-less drafts have been
// generated since the last dismissal.
const REPROMPT_AFTER_DRAFTS = 3;

export function bumpVoiceQuizInvitationDraftCount(): void {
  if (typeof window === "undefined") return;
  try {
    const current = Number(localStorage.getItem(COUNT_KEY)) || 0;
    localStorage.setItem(COUNT_KEY, String(current + 1));
  } catch {}
}

function getDraftCount(): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(localStorage.getItem(COUNT_KEY)) || 0;
  } catch {
    return 0;
  }
}

// The dismissed flag used to be the literal string "1" (a one-time
// boolean, not a count). Treat that legacy value as dismissed-at-count 0
// so old dismissals eventually re-arm instead of staying hidden forever.
function getDismissedAtCount(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    if (raw === null) return null;
    if (raw === "1") return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return null;
  }
}

export function shouldShowVoiceQuizInvitation(): boolean {
  const dismissedAt = getDismissedAtCount();
  if (dismissedAt === null) return true;
  return getDraftCount() - dismissedAt >= REPROMPT_AFTER_DRAFTS;
}

export function dismissVoiceQuizInvitation(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DISMISSED_KEY, String(getDraftCount()));
  } catch {}
}
