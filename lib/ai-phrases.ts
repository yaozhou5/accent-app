// AI Phrasebook — hand-curated list of phrases that signal AI-generated text.
// Expected to change frequently. Edit freely; the metrics strip in ReviewMode
// re-reads this on every render.
//
// Matching: case-insensitive, whole phrase, word boundaries at both ends.
// "leverage" and "foster" are legitimate words in normal use — they're included
// because they over-index in AI output, but may need removal if they trigger
// too often on real writing. Track per-phrase hit counts before cutting.

export interface PhraseCategory {
  id: string;
  label: string;
  phrases: string[];
}

export const AI_PHRASE_CATEGORIES: PhraseCategory[] = [
  {
    id: "openers",
    label: "Openers",
    phrases: [
      "in today's rapidly evolving",
      "in an era where",
      "in the ever-changing landscape of",
      "now more than ever",
    ],
  },
  {
    id: "verbs",
    label: "Verbs",
    phrases: ["delve into", "leverage", "harness", "unlock", "navigate the complexities of", "foster", "underscore"],
  },
  {
    id: "nouns",
    label: "Nouns",
    phrases: [
      "impactful solutions",
      "measurable results",
      "game changer",
      "key takeaways",
      "actionable insights",
      "the landscape",
      "a testament to",
      "treasure trove",
      // From lib/prompts.ts categories A–D:
      "cross-functionally",
      "leverage synergies",
      "strategic alignment",
      "value-add",
    ],
  },
  {
    id: "connectors",
    label: "Connectors",
    phrases: ["that said", "moreover", "furthermore", "it's worth noting", "at the end of the day", "when it comes to"],
  },
  {
    id: "closers",
    label: "Closers",
    phrases: ["the possibilities are endless", "only time will tell", "one thing is clear", "the future of"],
  },
];

/** Flat array of all phrases for matching. */
export const ALL_AI_PHRASES: string[] = AI_PHRASE_CATEGORIES.flatMap((c) => c.phrases);
