import { describe, expect, test } from "vitest";
import { checkSelectedChips, countPhraseOccurrences } from "./chipCheck";
import { getChipById } from "./chips";
import type { Run } from "./types";
import type { TranscriptChunk } from "./types";

describe("countPhraseOccurrences", () => {
  test("counts a repeated single word, case-insensitive", () => {
    expect(countPhraseOccurrences("Basically it works, but basically it's slow.", "basically")).toBe(2);
  });

  test("counts a multi-word phrase, ignoring punctuation", () => {
    expect(countPhraseOccurrences("You know, it's true. you know?", "you know")).toBe(2);
  });

  test("doesn't false-positive on a substring", () => {
    expect(countPhraseOccurrences("this is a category", "cat")).toBe(0);
  });

  test("zero when the phrase never occurs", () => {
    expect(countPhraseOccurrences("a plain sentence", "basically")).toBe(0);
  });
});

function sentence(text: string): TranscriptChunk {
  return { text, start: 0, end: 1 };
}

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

describe("no-fillers chip via checkSelectedChips", () => {
  test("not_met with a count per phrase actually found, zero-count phrases omitted", () => {
    const run = baseRun({
      selectedChipIds: ["no-fillers"],
      transcript: {
        text: "",
        chunks: [],
        sentences: [sentence("So basically, you know, it's basically done.")],
      },
    });
    const [result] = checkSelectedChips(run, {});
    expect(result.status).toBe("not_met");
    expect(result.counts).toEqual([
      { phrase: "basically", count: 2 },
      { phrase: "you know", count: 1 },
    ]);
  });

  test("met with no counts when no filler words are present", () => {
    const run = baseRun({
      selectedChipIds: ["no-fillers"],
      transcript: { text: "", chunks: [], sentences: [sentence("Here is the plan for next week.")] },
    });
    const [result] = checkSelectedChips(run, {});
    expect(result.status).toBe("met");
    expect(result.counts).toEqual([]);
  });

  test("reads the corrected transcript, not the raw one, when a word fix exists", () => {
    const run = baseRun({
      selectedChipIds: ["no-fillers"],
      transcript: { text: "", chunks: [], sentences: [sentence("That's um the plan")] },
      wordFixes: { 0: [{ start: 1, end: 1, text: "basically", source: "manual" }] },
    });
    const [result] = checkSelectedChips(run, {});
    expect(result.status).toBe("not_met");
    expect(result.counts).toEqual([{ phrase: "basically", count: 1 }]);
  });

  test("chip config: renamed id, label, tryNext, and the full filler word list", () => {
    const chip = getChipById("no-fillers");
    expect(chip?.label).toBe("No filler words");
    expect(chip?.type).toBe("avoid_words");
    if (chip?.type !== "avoid_words") throw new Error("expected avoid_words chip");
    expect(chip.words).toEqual([
      "basically",
      "actually",
      "literally",
      "you know",
      "I mean",
      "sort of",
      "kind of",
      "so yeah",
    ]);
    expect(getChipById("no-basically")).toBeUndefined();
  });
});
