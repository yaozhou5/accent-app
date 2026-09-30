import { createClient } from "./client";
import { checkAllCriteria } from "@/lib/clock/challengeCheck";
import { getChallengeById } from "@/lib/clock/challenges";
import { listRuns } from "@/lib/clock/db";
import { TARGET_MS } from "@/lib/clock/recording";
import type { ChartRun, Run } from "@/lib/clock/types";

/** Criterion ids currently met — nothing else about the run's content leaves the device. */
function metCriteriaIds(run: Run): string[] {
  if (!run.challengeId) return [];
  const challenge = getChallengeById(run.challengeId);
  if (!challenge) return [];
  return checkAllCriteria(challenge, run, run.criteriaOverrides)
    .filter((r) => r.status === "met")
    .map((r) => r.criterion.id);
}

function toRow(run: Run, userId: string) {
  return {
    user_id: userId,
    local_run_id: run.id,
    created_at: new Date(run.createdAt).toISOString(),
    duration_ms: run.durationMs,
    point_ms: run.pointMs,
    point_status: run.pointStatus,
    target_ms: TARGET_MS,
    challenge_id: run.challengeId,
    criteria_met: metCriteriaIds(run),
  };
}

/**
 * Upserts stats for the given runs (update on conflict, keyed on
 * (user_id, local_run_id) — see the migration) — re-marking a run's point
 * updates the existing row rather than erroring or duplicating. Silently
 * does nothing if signed out or given no completed runs; sync is always
 * best-effort and never blocks the UI it's called from.
 */
export async function syncPracticeRuns(runs: Run[]): Promise<void> {
  const completed = runs.filter((r) => r.pointStatus !== "unmarked");
  if (completed.length === 0) return;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("practice_runs").upsert(
    completed.map((r) => toRow(r, user.id)),
    { onConflict: "user_id,local_run_id" }
  );
}

/** Reads every local run from IndexedDB and syncs it — the one-time upload on sign-in. */
export async function backfillPracticeRuns(): Promise<void> {
  const runs = await listRuns();
  await syncPracticeRuns(runs);
}

/** This account's synced runs — may include runs completed on other devices. */
export async function fetchPracticeRuns(): Promise<ChartRun[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("practice_runs")
    .select("local_run_id, created_at, point_ms, point_status")
    .eq("user_id", user.id);
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.local_run_id,
    createdAt: new Date(row.created_at).getTime(),
    pointMs: row.point_ms,
    pointStatus: row.point_status as ChartRun["pointStatus"],
  }));
}
