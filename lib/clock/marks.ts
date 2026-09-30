import type { Mark, TranscriptChunk } from "./types";

// People tap Mark a beat after they actually hear the moment they're
// flagging — anchoring to the sentence playing this many ms *before* the
// tap lands on the sentence that triggered the tap, not the one after it.
const ANCHOR_OFFSET_MS = 700;

/**
 * Which sentence a mark belongs to, for display. Anchors to
 * `mark.ms - ANCHOR_OFFSET_MS`, not the raw tap time (see above), and
 * falls back to the nearest sentence by distance if that anchor point
 * doesn't fall inside any sentence's [start, end] range (a gap, or before
 * the first / after the last sentence). Returns -1 if there are no
 * sentences at all.
 */
export function nearestSentenceIndexForMark(sentences: TranscriptChunk[], markMs: number): number {
  if (sentences.length === 0) return -1;
  const anchorMs = Math.max(0, markMs - ANCHOR_OFFSET_MS);

  for (let i = 0; i < sentences.length; i++) {
    const startMs = sentences[i].start * 1000;
    const endMs = sentences[i].end * 1000;
    if (anchorMs >= startMs && anchorMs <= endMs) return i;
  }

  let closest = 0;
  let closestDistance = Infinity;
  for (let i = 0; i < sentences.length; i++) {
    const startMs = sentences[i].start * 1000;
    const endMs = sentences[i].end * 1000;
    const distance = anchorMs < startMs ? startMs - anchorMs : anchorMs - endMs;
    if (distance < closestDistance) {
      closest = i;
      closestDistance = distance;
    }
  }
  return closest;
}

/** Marks grouped by which sentence they anchor to (see above), for rendering flags inline. */
export function groupMarksBySentence(sentences: TranscriptChunk[], marks: Mark[]): Map<number, Mark[]> {
  const groups = new Map<number, Mark[]>();
  for (const mark of marks) {
    const index = nearestSentenceIndexForMark(sentences, mark.ms);
    if (index === -1) continue;
    const existing = groups.get(index);
    if (existing) existing.push(mark);
    else groups.set(index, [mark]);
  }
  return groups;
}

/** Where the point would land if this one runway sentence were cut, in ms. */
export function runwayLandingMs(pointMs: number, sentence: TranscriptChunk): number {
  const sentenceDurationMs = (sentence.end - sentence.start) * 1000;
  return Math.max(0, pointMs - sentenceDurationMs);
}
