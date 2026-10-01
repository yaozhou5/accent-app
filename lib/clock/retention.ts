import type { Run } from "./types";

export type RetentionProps = {
  run_number: number;
  days_since_first_run: number;
  active_days_count: number;
  is_new_day: boolean;
};

function startOfDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Pure — given every local run (any order) and which one just happened,
 * returns the counts PostHog gets attached to that run's event. Day key is
 * toDateString(), the same convention lib/clock/progress.ts's computeStats
 * already uses for daysPracticed. Counts only: no run content, no ids
 * beyond matching currentRunId against the list to find its position.
 *
 * run_number is 1-indexed, oldest = 1 — the same number already shown as
 * "Rep N" in the UI (ClockApp's runs.length - i, since runs there sorts
 * newest-first). active_days_count and is_new_day only look at runs up to
 * and including currentRunId — a run can't be affected by one that hasn't
 * happened yet relative to it.
 */
export function computeRetentionProps(allRuns: Run[], currentRunId: string): RetentionProps | null {
  const sorted = [...allRuns].sort((a, b) => a.createdAt - b.createdAt);
  const index = sorted.findIndex((r) => r.id === currentRunId);
  if (index === -1) return null;

  const current = sorted[index];
  const dayKey = (ms: number) => new Date(ms).toDateString();
  const upToNow = sorted.slice(0, index + 1);
  const activeDays = new Set(upToNow.map((r) => dayKey(r.createdAt)));
  const firstRun = sorted[0];
  const daysSinceFirstRun = Math.round((startOfDay(current.createdAt) - startOfDay(firstRun.createdAt)) / 86_400_000);
  const isNewDay = !sorted.slice(0, index).some((r) => dayKey(r.createdAt) === dayKey(current.createdAt));

  return {
    run_number: index + 1,
    days_since_first_run: daysSinceFirstRun,
    active_days_count: activeDays.size,
    is_new_day: isNewDay,
  };
}
