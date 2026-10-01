import { describe, expect, test } from "vitest";
import { computeRetentionProps } from "./retention";
import type { Run } from "./types";

function stubRun(id: string, createdAt: number): Run {
  return {
    id,
    createdAt,
    durationMs: 1000,
    pointMs: null,
    pointStatus: "unmarked",
    mimeType: "audio/webm",
    blob: new Blob(),
    transcript: null,
    script: null,
    selectedChipIds: [],
    criteriaOverrides: {},
    aiCheckResults: {},
    marks: [],
    selfRating: null,
    listenedAt: null,
    wordFixes: {},
    wordFixesVersion: 0,
  };
}

const DAY = 86_400_000;
// A fixed local midnight so day-boundary math is deterministic regardless
// of the machine running the test.
const BASE = new Date(2026, 0, 1, 9, 0, 0).getTime();

describe("computeRetentionProps", () => {
  test("a single run: run_number 1, zero days since first, one active day, is a new day", () => {
    const runs = [stubRun("a", BASE)];
    expect(computeRetentionProps(runs, "a")).toEqual({
      run_number: 1,
      days_since_first_run: 0,
      active_days_count: 1,
      is_new_day: true,
    });
  });

  test("a second run the same calendar day: run_number 2, still one active day, not a new day", () => {
    const runs = [stubRun("a", BASE), stubRun("b", BASE + 3600_000)];
    expect(computeRetentionProps(runs, "b")).toEqual({
      run_number: 2,
      days_since_first_run: 0,
      active_days_count: 1,
      is_new_day: false,
    });
  });

  test("a run three days later: days_since_first_run 3, two active days, is a new day", () => {
    const runs = [stubRun("a", BASE), stubRun("b", BASE + 3 * DAY)];
    expect(computeRetentionProps(runs, "b")).toEqual({
      run_number: 2,
      days_since_first_run: 3,
      active_days_count: 2,
      is_new_day: true,
    });
  });

  test("unordered input is sorted by createdAt before computing position", () => {
    const runs = [stubRun("c", BASE + 2 * DAY), stubRun("a", BASE), stubRun("b", BASE + DAY)];
    expect(computeRetentionProps(runs, "a")?.run_number).toBe(1);
    expect(computeRetentionProps(runs, "b")?.run_number).toBe(2);
    expect(computeRetentionProps(runs, "c")?.run_number).toBe(3);
  });

  test("active_days_count only counts runs up to and including the current one, not later ones", () => {
    const runs = [stubRun("a", BASE), stubRun("b", BASE + DAY), stubRun("c", BASE + 2 * DAY)];
    expect(computeRetentionProps(runs, "b")?.active_days_count).toBe(2);
  });

  test("returns null when the run id isn't in the list", () => {
    const runs = [stubRun("a", BASE)];
    expect(computeRetentionProps(runs, "missing")).toBeNull();
  });
});
