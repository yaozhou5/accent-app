// lib/voice-dimensions.ts

export type DimensionKey = "directness" | "precision" | "temperature" | "authority" | "rhythm" | "framing" | "energy";

export interface VoicePair {
  dimension: DimensionKey;
  optionA: string; // +1
  optionB: string; // -1
}

export interface VoiceDimensions {
  directness: number;
  precision: number;
  temperature: number;
  authority: number;
  rhythm: number;
  framing: number;
  energy: number;
}

export interface VoiceProfile {
  dimensions: VoiceDimensions;
  top_traits: string[];
  edge: string;
  gap: string;
  completed_at: string;
}

export const DIMENSION_LABELS: Record<DimensionKey, { low: string; high: string }> = {
  directness: { low: "Contextual", high: "Direct" },
  precision: { low: "Impressionistic", high: "Precise" },
  temperature: { low: "Cool", high: "Warm" },
  authority: { low: "Inviting", high: "Assertive" },
  rhythm: { low: "Flowing", high: "Staccato" },
  framing: { low: "Structurer", high: "Storyteller" },
  energy: { low: "Reflective", high: "Provocative" },
};

export const VOICE_PAIRS: VoicePair[] = [
  {
    dimension: "directness",
    optionA: "The project is behind schedule. Here's what we're changing.",
    optionB: "I wanted to share some thoughts on where the project stands and a few adjustments we're considering.",
  },
  {
    dimension: "directness",
    optionA: "Don't reply-all to this thread.",
    optionB: "It might be worth keeping this conversation to the people directly involved.",
  },
  {
    dimension: "precision",
    optionA: "We closed 12 deals last month, up from 7. Average contract value dropped from $34K to $28K.",
    optionB: "We closed more deals last month, but the average deal size was a bit smaller than before.",
  },
  {
    dimension: "precision",
    optionA: "The meeting ran 40 minutes over. We covered 3 of the 8 agenda items.",
    optionB: "The meeting went long and we didn't get through everything.",
  },
  {
    dimension: "temperature",
    optionA: "Honestly, I was embarrassed by how that presentation went.",
    optionB: "The presentation didn't go as planned, but there are clear takeaways.",
  },
  {
    dimension: "temperature",
    optionA: "This is the part of the job that keeps me up at night.",
    optionB: "This is one of the harder challenges we're working through right now.",
  },
  {
    dimension: "authority",
    optionA: "We need to cut this feature. It's not working.",
    optionB: "I wonder if this feature is pulling its weight. Worth discussing.",
  },
  {
    dimension: "authority",
    optionA: "The best teams I've seen all do this differently.",
    optionB: "I've noticed something interesting about how some teams handle this.",
  },
  {
    dimension: "rhythm",
    optionA: "Tried it. Didn't work. Moved on.",
    optionB: "We gave it a fair shot over a few weeks, but ultimately decided to take a different approach.",
  },
  {
    dimension: "framing",
    optionA: "Last Thursday a client called me at 9pm and said three words that changed how I think about our service.",
    optionB: "Three things I've learned about what clients actually want from us.",
  },
  {
    dimension: "framing",
    optionA: "I was sitting in the parking lot after the meeting, replaying the conversation in my head.",
    optionB: "Here's a breakdown of what went well and what we should do differently next time.",
  },
  {
    dimension: "energy",
    optionA: "Nobody talks about this enough.",
    optionB: "Something I've been reflecting on recently.",
  },
];

// Dimensions with 2 pairs get a raw range of -2..+2; with 1 pair, -1..+1
const TWO_PAIR_DIMS: DimensionKey[] = ["directness", "precision", "temperature", "authority", "framing"];

/** Turn an array of 12 choices ("a"|"b") into raw dimension scores */
export function scorePairs(choices: ("a" | "b")[]): VoiceDimensions {
  const scores: VoiceDimensions = {
    directness: 0,
    precision: 0,
    temperature: 0,
    authority: 0,
    rhythm: 0,
    framing: 0,
    energy: 0,
  };
  choices.forEach((choice, i) => {
    const pair = VOICE_PAIRS[i];
    scores[pair.dimension] += choice === "a" ? 1 : -1;
  });
  return scores;
}

/** Normalize a raw score to -1..+1 range for display */
export function normalizeScore(dimension: DimensionKey, raw: number): number {
  const max = TWO_PAIR_DIMS.includes(dimension) ? 2 : 1;
  return raw / max;
}

/** Get top 3 trait labels by absolute score, using the high/low label */
export function getTopTraits(dims: VoiceDimensions): string[] {
  const entries = (Object.entries(dims) as [DimensionKey, number][])
    .map(([key, val]) => ({
      key,
      abs: Math.abs(normalizeScore(key, val)),
      label: val >= 0 ? DIMENSION_LABELS[key].high : DIMENSION_LABELS[key].low,
    }))
    .sort((a, b) => b.abs - a.abs);
  return entries.slice(0, 3).map((e) => e.label);
}
