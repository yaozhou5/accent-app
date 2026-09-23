// Tracks which run (if any) is mid-transcription, so a crash during model
// loading can be told apart from a normal page load on the next mount — see
// takeStaleTranscriptionRunId. sessionStorage (not localStorage): it should
// only catch a reload of *this* tab, not linger into a future visit.
const KEY = "accent-clock-transcribing-run-id";

export function markTranscriptionStarted(runId: string): void {
  try {
    sessionStorage.setItem(KEY, runId);
  } catch {
    // Session storage unavailable — the crash guard just won't catch this one.
  }
}

export function markTranscriptionFinished(runId: string): void {
  try {
    if (sessionStorage.getItem(KEY) === runId) sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clean up if we can't read/write it anyway.
  }
}

/**
 * If a run was still marked in-flight when this loaded, the previous
 * attempt never reached its own success/error handling — i.e. the tab
 * crashed (iOS OOM) rather than the transcription failing normally.
 * Clears the marker either way, so it's a one-shot check per crash.
 */
export function takeStaleTranscriptionRunId(): string | null {
  try {
    const id = sessionStorage.getItem(KEY);
    if (id) sessionStorage.removeItem(KEY);
    return id;
  } catch {
    return null;
  }
}
