import type { ChartRun } from "./types";

/**
 * Local IndexedDB runs merged with this account's synced runs (which may
 * include runs completed on other devices). Local wins on id collision —
 * same data either way, but local is never staler than a just-finished
 * sync. Unmarked runs are dropped: they were never synced and have no
 * point time to chart. Newest first, matching the existing local `runs`
 * state convention (TimeToPointChart re-sorts ascending internally
 * regardless; repDeltaText in ClockApp does not, and expects [0] = latest).
 */
export function mergeForChart(local: ChartRun[], synced: ChartRun[]): ChartRun[] {
  const byId = new Map<string, ChartRun>();
  for (const run of synced) byId.set(run.id, run);
  for (const run of local) {
    if (run.pointStatus === "unmarked") continue;
    byId.set(run.id, run);
  }
  return [...byId.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export type PracticeStats = {
  daysPracticed: number;
  bestTimeMs: number | null;
};

export function computeStats(runs: ChartRun[]): PracticeStats {
  const days = new Set(runs.map((r) => new Date(r.createdAt).toDateString()));
  const reached = runs.filter((r) => r.pointStatus === "marked" && r.pointMs !== null).map((r) => r.pointMs as number);
  return {
    daysPracticed: days.size,
    bestTimeMs: reached.length > 0 ? Math.min(...reached) : null,
  };
}
