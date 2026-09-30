// The weekly challenge config — hand-edited, no admin UI. Add a new entry
// each week; getCurrentChallenge() in challengeCheck.ts always picks the
// one with the latest weekStart that isn't in the future, so a missed
// week just means last week's challenge keeps showing.

export type Criterion =
  | { type: "max_duration"; id: string; label: string; tryNext: string; seconds: number }
  | { type: "point_before_half"; id: string; label: string; tryNext: string }
  | { type: "use_word"; id: string; label: string; tryNext: string; word: string }
  | { type: "avoid_words"; id: string; label: string; tryNext: string; words: string[] }
  | { type: "manual"; id: string; label: string; tryNext: string };

export type Challenge = {
  id: string;
  /** ISO date (YYYY-MM-DD), the Monday this challenge starts applying. */
  weekStart: string;
  title: string;
  criteria: Criterion[];
};

export const CHALLENGES: Challenge[] = [
  {
    id: "2026-09-29-upend",
    weekStart: "2026-09-29",
    title: 'Explain what you do in under 60 seconds. Make your point in the first half. Use the word "upend".',
    criteria: [
      {
        type: "max_duration",
        id: "under-60s",
        label: "Under 60 seconds",
        tryNext: "Cut the background. Start with what you do.",
        seconds: 60,
      },
      {
        type: "point_before_half",
        id: "point-first-half",
        label: "Made your point in the first half",
        tryNext: "Say the sentence you marked first, then explain.",
      },
      {
        type: "use_word",
        id: "use-upend",
        label: 'Used the word "upend"',
        tryNext: 'Work "upend" into the sentence about the problem you solve.',
        word: "upend",
      },
    ],
  },
];

export function getChallengeById(id: string): Challenge | undefined {
  return CHALLENGES.find((c) => c.id === id);
}
