import { describe, expect, test } from "vitest";
import type { Transcript } from "./types";
import {
  applyFixesToSentence,
  autoApplyPersonalCorrections,
  correctedTranscriptText,
  removeWordFixSpan,
  setWordFixSpan,
  splitWords,
  stripEdgePunctuation,
  wrapWithEdgePunctuation,
} from "./wordFixes";

function chunk(text: string, start = 0, end = 1) {
  return { text, start, end };
}

describe("splitWords / stripEdgePunctuation / wrapWithEdgePunctuation", () => {
  test("splits on whitespace, keeps attached punctuation", () => {
    expect(splitWords("Excellent, that's the whole idea.")).toEqual(["Excellent,", "that's", "the", "whole", "idea."]);
  });

  test("strips only the outer edges, not internal apostrophes or mid-phrase punctuation", () => {
    expect(stripEdgePunctuation("Excellent,")).toBe("Excellent");
    expect(stripEdgePunctuation("that's")).toBe("that's");
    expect(stripEdgePunctuation("wrong way")).toBe("wrong way");
  });

  test("reattaches the original span's edge punctuation to a replacement", () => {
    const words = splitWords("Excellent, that's the plan.");
    expect(wrapWithEdgePunctuation(words, 0, 0, "Accent")).toBe("Accent,");
    expect(wrapWithEdgePunctuation(words, 3, 3, "runway")).toBe("runway.");
  });
});

describe("setWordFixSpan / removeWordFixSpan", () => {
  test("a new span replaces any existing span(s) it overlaps", () => {
    const existing = [{ start: 2, end: 2, text: "foo", source: "manual" as const }];
    const next = setWordFixSpan(existing, { start: 1, end: 2, text: "bar baz", source: "manual" });
    expect(next).toEqual([{ start: 1, end: 2, text: "bar baz", source: "manual" }]);
  });

  test("non-overlapping spans both survive, kept sorted by start", () => {
    const existing = [{ start: 3, end: 3, text: "z", source: "manual" as const }];
    const next = setWordFixSpan(existing, { start: 0, end: 0, text: "a", source: "manual" });
    expect(next.map((f) => f.start)).toEqual([0, 3]);
  });

  test("removeWordFixSpan removes only the exact span", () => {
    const existing = [
      { start: 0, end: 0, text: "a", source: "auto" as const },
      { start: 2, end: 3, text: "b c", source: "manual" as const },
    ];
    expect(removeWordFixSpan(existing, 0, 0)).toEqual([existing[1]]);
  });
});

describe("applyFixesToSentence / correctedTranscriptText", () => {
  test("no fixes returns the original text unchanged", () => {
    expect(applyFixesToSentence("Accent helps you find the runway.", [])).toBe("Accent helps you find the runway.");
  });

  test("a single-word fix replaces just that word", () => {
    const fixed = applyFixesToSentence("Excellent helps you find the runway.", [
      { start: 0, end: 0, text: "Accent", source: "manual" },
    ]);
    expect(fixed).toBe("Accent helps you find the runway.");
  });

  test("a multi-word span collapses to one replacement (wrong way -> runway)", () => {
    const fixed = applyFixesToSentence("Accent helps you find the wrong way.", [
      { start: 5, end: 6, text: "runway.", source: "manual" },
    ]);
    expect(fixed).toBe("Accent helps you find the runway.");
  });

  test("a single original word can expand to a multi-word replacement", () => {
    const fixed = applyFixesToSentence("We do wayfinding for startups.", [
      { start: 2, end: 2, text: "way finding", source: "manual" },
    ]);
    expect(fixed).toBe("We do way finding for startups.");
  });

  test("correctedTranscriptText applies each sentence's own fixes independently", () => {
    const transcript: Transcript = {
      text: "",
      chunks: [],
      sentences: [chunk("Excellent is the idea."), chunk("We find the wrong way.")],
    };
    const text = correctedTranscriptText(transcript, {
      0: [{ start: 0, end: 0, text: "Accent", source: "manual" }],
      1: [{ start: 3, end: 4, text: "runway.", source: "manual" }],
    });
    expect(text).toBe("Accent is the idea. We find the runway.");
  });
});

describe("autoApplyPersonalCorrections", () => {
  test("applies a single-word rule, case-insensitive, whole-word only", () => {
    const transcript: Transcript = {
      text: "",
      chunks: [],
      sentences: [chunk("excellent is the whole idea, not excellently done.")],
    };
    const fixes = autoApplyPersonalCorrections(transcript, [{ from: "Excellent", to: "Accent" }]);
    expect(fixes[0]).toEqual([{ start: 0, end: 0, text: "Accent", source: "auto" }]);
  });

  test("applies a multi-word phrase rule as one span", () => {
    const transcript: Transcript = {
      text: "",
      chunks: [],
      sentences: [chunk("We find the wrong way to your pitch.")],
    };
    const fixes = autoApplyPersonalCorrections(transcript, [{ from: "wrong way", to: "runway" }]);
    expect(fixes[0]).toEqual([{ start: 3, end: 4, text: "runway", source: "auto" }]);
  });

  test("preserves the matched occurrence's own trailing punctuation", () => {
    const transcript: Transcript = {
      text: "",
      chunks: [],
      sentences: [chunk("That is the wrong way.")],
    };
    const fixes = autoApplyPersonalCorrections(transcript, [{ from: "wrong way", to: "runway" }]);
    expect(fixes[0][0].text).toBe("runway.");
  });

  test("prefers the longest matching rule at a given position", () => {
    const transcript: Transcript = {
      text: "",
      chunks: [],
      sentences: [chunk("We find the wrong way home.")],
    };
    const fixes = autoApplyPersonalCorrections(transcript, [
      { from: "wrong", to: "right" },
      { from: "wrong way", to: "runway" },
    ]);
    expect(fixes[0]).toEqual([{ start: 3, end: 4, text: "runway", source: "auto" }]);
  });

  test("no match produces no entry for that sentence", () => {
    const transcript: Transcript = {
      text: "",
      chunks: [],
      sentences: [chunk("Nothing to fix here.")],
    };
    expect(autoApplyPersonalCorrections(transcript, [{ from: "Excellent", to: "Accent" }])).toEqual({});
  });
});
