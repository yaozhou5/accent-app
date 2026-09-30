// The chip config — hand-edited, no admin UI. Chips are entirely optional
// and independent of each other: a run can have any combination selected,
// or none (free practice). Add a new static chip to STATIC_CHIPS, or a new
// week's word to WORD_OF_WEEK.

export type Chip =
  | { type: "max_duration"; id: string; label: string; tryNext: string; seconds: number }
  | { type: "point_before_half"; id: string; label: string; tryNext: string }
  | { type: "use_word"; id: string; label: string; tryNext: string; word: string }
  | { type: "avoid_words"; id: string; label: string; tryNext: string; words: string[] }
  | { type: "ai_check"; id: string; label: string; tryNext: string; rubric: string };

const STATIC_CHIPS: Chip[] = [
  {
    type: "max_duration",
    id: "under-60s",
    label: "Under 60s",
    tryNext: "Cut the background. Start with what you do.",
    seconds: 60,
  },
  {
    type: "point_before_half",
    id: "point-first-half",
    label: "Point in first half",
    tryNext: "Say the sentence you marked first, then explain.",
  },
  {
    type: "avoid_words",
    id: "no-basically",
    label: 'No "basically"',
    tryNext: 'Say it again, and pause where you\'d say "basically".',
    words: ["basically"],
  },
  {
    type: "ai_check",
    id: "give-example",
    label: "Give one specific example",
    tryNext: "Swap the general claim for a number, a named customer, or a real situation.",
    rubric:
      'Met only if the speaker gives a concrete instance: a number, a named customer or place, or a real situation that happened. General claims like "we help lots of companies save time" do not count.',
  },
];

type WordOfWeekEntry = {
  /** ISO date (YYYY-MM-DD), the Monday this word starts applying. */
  weekStart: string;
  word: string;
  tryNext?: string;
};

// The only chip that rotates. Its id is week-specific (word-of-week-<date>)
// so a run recorded under an earlier week's word still checks against that
// word, not whatever's current — same "latest weekStart <= today" fallback
// getCurrentChips uses, so a missed week just keeps last week's word.
const WORD_OF_WEEK: WordOfWeekEntry[] = [{ weekStart: "2026-09-29", word: "upend" }];

function wordChipId(weekStart: string): string {
  return `word-of-week-${weekStart}`;
}

function toWordChip(entry: WordOfWeekEntry): Chip {
  return {
    type: "use_word",
    id: wordChipId(entry.weekStart),
    label: `Word of the week: "${entry.word}"`,
    tryNext: entry.tryNext ?? `Work "${entry.word}" into the sentence about the problem you solve.`,
    word: entry.word,
  };
}

function currentWordOfWeekEntry(now: Date): WordOfWeekEntry | null {
  const todayIso = now.toISOString().slice(0, 10);
  const eligible = WORD_OF_WEEK.filter((w) => w.weekStart <= todayIso).sort((a, b) =>
    a.weekStart < b.weekStart ? 1 : -1
  );
  return eligible[0] ?? null;
}

/** All chips currently selectable on the practice page. */
export function getCurrentChips(now: Date = new Date()): Chip[] {
  const current = currentWordOfWeekEntry(now);
  return current ? [...STATIC_CHIPS, toWordChip(current)] : STATIC_CHIPS;
}

/**
 * Looks up any chip by id, including a past week's word-of-week chip — a
 * run's selectedChipIds is frozen at record time, so checking it later
 * (e.g. from the server, or after the word has rotated) must still resolve
 * to the chip as it was that week, not today's.
 */
export function getChipById(id: string): Chip | undefined {
  const staticMatch = STATIC_CHIPS.find((c) => c.id === id);
  if (staticMatch) return staticMatch;
  const wordEntry = WORD_OF_WEEK.find((w) => wordChipId(w.weekStart) === id);
  return wordEntry ? toWordChip(wordEntry) : undefined;
}
