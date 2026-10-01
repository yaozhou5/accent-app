import { describe, expect, test } from "vitest";
import { normalizeRun, type AnyStoredRun } from "./db";
import type { Run } from "./types";

function baseRun(overrides: Partial<Run> = {}): Run {
  return {
    id: "run-1",
    createdAt: 0,
    durationMs: 1000,
    pointMs: null,
    pointStatus: "unmarked",
    mimeType: "audio/webm",
    blob: new Blob([], { type: "audio/webm" }),
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
    ...overrides,
  };
}

describe("normalizeRun — no-basically -> no-fillers migration", () => {
  test("remaps the id in selectedChipIds", () => {
    const run = baseRun({ selectedChipIds: ["under-60s", "no-basically"] });
    expect(normalizeRun(run as AnyStoredRun).selectedChipIds).toEqual(["under-60s", "no-fillers"]);
  });

  test("rekeys criteriaOverrides without changing the stored verdict", () => {
    const run = baseRun({ criteriaOverrides: { "no-basically": true } });
    expect(normalizeRun(run as AnyStoredRun).criteriaOverrides).toEqual({ "no-fillers": true });
  });

  test("a false override survives the rekey unchanged", () => {
    const run = baseRun({ criteriaOverrides: { "no-basically": false } });
    expect(normalizeRun(run as AnyStoredRun).criteriaOverrides).toEqual({ "no-fillers": false });
  });

  test("runs that never had the old id are left alone", () => {
    const run = baseRun({ selectedChipIds: ["under-60s"], criteriaOverrides: { "under-60s": true } });
    const normalized = normalizeRun(run as AnyStoredRun);
    expect(normalized.selectedChipIds).toEqual(["under-60s"]);
    expect(normalized.criteriaOverrides).toEqual({ "under-60s": true });
  });
});
