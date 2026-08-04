import { createClient } from "./supabase/server";

const AGGREGATION_WINDOW = 20;
const PROMOTION_THRESHOLD = 3;

interface SubstitutionPair {
  ai_said: string;
  user_changed_to: string;
}

interface LearnedPair {
  from: string;
  to: string;
}

export interface LearnedVoiceProfile {
  preferred_words: string[];
  banned_words: string[];
  substitution_pairs: LearnedPair[];
  structural_habits: Record<string, string>;
  anti_patterns: string[];
  best_examples: string[];
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);
}

function wordSet(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

function sharedWordCount(a: Set<string>, b: Set<string>): number {
  let n = 0;
  for (const w of a) if (b.has(w)) n++;
  return n;
}

function normalizePhrase(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:]+$/, "");
}

function wordsOf(s: string): string[] {
  return s.toLowerCase().match(/[a-z']+/g) || [];
}

// Sentence-level diff between the AI draft and the user's edited version.
// Kept-verbatim sentences carry no signal. A near-match (3+ shared words)
// becomes a substitution pair; anything else from the original is a
// removal, and anything unmatched in the edit is an addition.
function diffDrafts(
  original: string,
  edited: string
): { substitutions: SubstitutionPair[]; removals: string[]; additions: string[] } {
  const originalSentences = splitSentences(original);
  const editedSentences = splitSentences(edited);
  const editedLower = new Set(editedSentences.map((s) => s.toLowerCase().trim()));
  const editedWordSets = editedSentences.map(wordSet);

  const substitutions: SubstitutionPair[] = [];
  const removals: string[] = [];
  const matchedEditedIndices = new Set<number>();

  for (const sentence of originalSentences) {
    const lower = sentence.toLowerCase().trim();
    if (editedLower.has(lower)) continue; // kept verbatim — not a signal

    const origWords = wordSet(sentence);
    let bestIdx = -1;
    let bestOverlap = 0;
    editedWordSets.forEach((ws, i) => {
      const overlap = sharedWordCount(origWords, ws);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestIdx = i;
      }
    });

    if (bestOverlap >= 3 && bestIdx >= 0) {
      substitutions.push({ ai_said: sentence, user_changed_to: editedSentences[bestIdx] });
      matchedEditedIndices.add(bestIdx);
    } else {
      removals.push(sentence);
    }
  }

  const originalLower = new Set(originalSentences.map((s) => s.toLowerCase().trim()));
  const additions = editedSentences.filter(
    (s, i) => !originalLower.has(s.toLowerCase().trim()) && !matchedEditedIndices.has(i)
  );

  return { substitutions, removals, additions };
}

function sentenceLengthStats(text: string): { avg: number; variance: number } {
  const lengths = splitSentences(text).map((s) => s.split(/\s+/).filter(Boolean).length);
  if (lengths.length === 0) return { avg: 0, variance: 0 };
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((a, b) => a + (b - avg) ** 2, 0) / lengths.length;
  return { avg, variance };
}

// Saves one Voice Coach session's diff as a voice_patterns row, then
// re-aggregates the user's learned profile. Never throws — callers should
// still wrap in try/catch since a DB outage shouldn't surface as an error
// in the editor.
export async function saveVoicePatterns(
  userId: string,
  draftId: string,
  originalDraft: string,
  currentDraft: string,
  coachResult: { edge: string; stretch: string }
): Promise<void> {
  const supabase = await createClient();
  const { substitutions, removals, additions } = diffDrafts(originalDraft, currentDraft);
  const { avg, variance } = sentenceLengthStats(currentDraft);

  const { error } = await supabase.from("voice_patterns").insert({
    user_id: userId,
    draft_id: draftId,
    edge_cards: coachResult.edge ? [coachResult.edge] : [],
    stretch_cards: coachResult.stretch ? [coachResult.stretch] : [],
    substitutions,
    removals,
    additions,
    sentence_length_avg: avg,
    sentence_length_variance: variance,
  });

  if (error) {
    console.error("Failed to save voice patterns:", JSON.stringify(error));
    return;
  }

  await aggregateVoiceProfile(userId);
}

interface StructuralSignal {
  opener: "question" | "short" | "long";
  closer: "question" | "short" | "long";
  paragraphLength: "short" | "medium" | "long";
  fragmentUsage: "frequent" | "occasional" | "rare";
}

function classifyStructure(text: string): StructuralSignal | null {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return null;

  const wc = (s: string) => s.split(/\s+/).filter(Boolean).length;
  const classifyEnd = (s: string): "question" | "short" | "long" =>
    s.trim().endsWith("?") ? "question" : wc(s) <= 6 ? "short" : "long";

  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const avgSentencesPerParagraph = paragraphs.length > 0 ? sentences.length / paragraphs.length : sentences.length;
  const paragraphLength: "short" | "medium" | "long" =
    avgSentencesPerParagraph <= 2 ? "short" : avgSentencesPerParagraph <= 4 ? "medium" : "long";

  const fragmentRatio = sentences.filter((s) => wc(s) <= 4).length / sentences.length;
  const fragmentUsage: "frequent" | "occasional" | "rare" =
    fragmentRatio >= 0.3 ? "frequent" : fragmentRatio >= 0.1 ? "occasional" : "rare";

  return {
    opener: classifyEnd(sentences[0]),
    closer: classifyEnd(sentences[sentences.length - 1]),
    paragraphLength,
    fragmentUsage,
  };
}

function mode<T extends string>(items: T[]): T | undefined {
  const tally = new Map<T, number>();
  for (const item of items) tally.set(item, (tally.get(item) || 0) + 1);
  let best: T | undefined;
  let bestCount = 0;
  for (const [k, v] of tally) {
    if (v > bestCount) {
      best = k;
      bestCount = v;
    }
  }
  return best;
}

function summarizeStructuralHabits(texts: string[]): Record<string, string> {
  const signals = texts.map(classifyStructure).filter((s): s is StructuralSignal => s !== null);
  if (signals.length === 0) return {};
  return {
    opener_style: mode(signals.map((s) => s.opener)) || "",
    closer_style: mode(signals.map((s) => s.closer)) || "",
    paragraph_length_tendency: mode(signals.map((s) => s.paragraphLength)) || "",
    fragment_usage: mode(signals.map((s) => s.fragmentUsage)) || "",
  };
}

function tallyBy<T>(items: T[], keyFn: (item: T) => string): Map<string, { count: number; sample: T }> {
  const map = new Map<string, { count: number; sample: T }>();
  for (const item of items) {
    const key = keyFn(item);
    if (!key) continue;
    const existing = map.get(key);
    if (existing) existing.count++;
    else map.set(key, { count: 1, sample: item });
  }
  return map;
}

function unionArrays(existing: string[] | null | undefined, incoming: string[]): string[] {
  return [...new Set([...(existing || []), ...incoming])];
}

function unionPairs(existing: LearnedPair[] | null | undefined, incoming: LearnedPair[]): LearnedPair[] {
  const map = new Map<string, LearnedPair>();
  for (const p of [...(existing || []), ...incoming]) {
    map.set(`${normalizePhrase(p.from)}→${normalizePhrase(p.to)}`, p);
  }
  return [...map.values()];
}

// Looks at the last N voice_patterns rows for this user, promotes anything
// recurring 3+ times into voice_profile_learned, and unions it with what's
// already there (learned signals accumulate — they don't get wiped each run).
export async function aggregateVoiceProfile(userId: string): Promise<void> {
  const supabase = await createClient();

  const { data: patterns, error } = await supabase
    .from("voice_patterns")
    .select("draft_id, substitutions, removals, additions")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(AGGREGATION_WINDOW);

  if (error || !patterns || patterns.length === 0) {
    if (error) console.error("Failed to load voice patterns for aggregation:", JSON.stringify(error));
    return;
  }

  const allSubs = patterns.flatMap((p) => (p.substitutions as SubstitutionPair[]) || []);
  const subKey = (s: SubstitutionPair) => `${normalizePhrase(s.ai_said)}→${normalizePhrase(s.user_changed_to)}`;
  const subTally = tallyBy(allSubs, subKey);
  const newSubPairs: LearnedPair[] = [...subTally.values()]
    .filter((v) => v.count >= PROMOTION_THRESHOLD)
    .map((v) => ({ from: v.sample.ai_said, to: v.sample.user_changed_to }));

  const allRemovals = patterns.flatMap((p) => (p.removals as string[]) || []);
  const removalTally = tallyBy(allRemovals, normalizePhrase);
  const newAntiPatterns = [...removalTally.values()].filter((v) => v.count >= PROMOTION_THRESHOLD).map((v) => v.sample);

  const removalWordTally = tallyBy(allRemovals.flatMap(wordsOf), (w) => w);
  const newBannedWords = [...removalWordTally.values()]
    .filter((v) => v.count >= PROMOTION_THRESHOLD)
    .map((v) => v.sample);

  const allAdditions = patterns.flatMap((p) => (p.additions as string[]) || []);
  const additionWordTally = tallyBy(allAdditions.flatMap(wordsOf), (w) => w);
  const newPreferredWords = [...additionWordTally.values()]
    .filter((v) => v.count >= PROMOTION_THRESHOLD)
    .map((v) => v.sample);

  const exampleCandidates = [...new Set([...allSubs.map((s) => s.user_changed_to), ...allAdditions])].filter(
    (s) => wordsOf(s).length >= 5
  );
  const newBestExamples = exampleCandidates.sort((a, b) => wordsOf(b).length - wordsOf(a).length).slice(0, 5);

  const draftIds = [...new Set(patterns.map((p) => p.draft_id as string))];
  const { data: drafts } = await supabase.from("drafts").select("content").eq("user_id", userId).in("id", draftIds);
  const structuralHabits = summarizeStructuralHabits((drafts || []).map((d) => d.content as string));

  const { data: existingRow } = await supabase
    .from("voice_profile_learned")
    .select("preferred_words, banned_words, substitution_pairs, anti_patterns, best_examples")
    .eq("user_id", userId)
    .maybeSingle();

  const { error: upsertError } = await supabase.from("voice_profile_learned").upsert({
    user_id: userId,
    updated_at: new Date().toISOString(),
    preferred_words: unionArrays(existingRow?.preferred_words, newPreferredWords),
    banned_words: unionArrays(existingRow?.banned_words, newBannedWords),
    substitution_pairs: unionPairs(existingRow?.substitution_pairs as LearnedPair[] | undefined, newSubPairs),
    structural_habits: structuralHabits,
    anti_patterns: unionArrays(existingRow?.anti_patterns, newAntiPatterns),
    best_examples: unionArrays(existingRow?.best_examples, newBestExamples).slice(0, 5),
  });

  if (upsertError) {
    console.error("Failed to upsert learned voice profile:", JSON.stringify(upsertError));
  }
}

// Turns an accumulated learned profile into prompt instructions for draft
// generation. Kept separate from buildVoiceInstructions() (static voice
// dimensions) since this is about specific, evidence-backed edit patterns.
export function buildLearnedInstructions(profile: LearnedVoiceProfile): string {
  const lines: string[] = [];

  if (profile.substitution_pairs?.length > 0) {
    lines.push("LEARNED WORD SUBSTITUTIONS (from past edits):");
    for (const { from, to } of profile.substitution_pairs.slice(0, 10)) {
      lines.push(`- Never say "${from}" — say "${to}" instead.`);
    }
  }

  if (profile.anti_patterns?.length > 0) {
    lines.push("\nLEARNED ANTI-PATTERNS (things you consistently remove):");
    for (const p of profile.anti_patterns.slice(0, 10)) {
      lines.push(`- Never write anything like: "${p}"`);
    }
  }

  if (profile.banned_words?.length > 0) {
    lines.push(`\nWords to avoid: ${profile.banned_words.slice(0, 15).join(", ")}.`);
  }
  if (profile.preferred_words?.length > 0) {
    lines.push(`Words you favor: ${profile.preferred_words.slice(0, 15).join(", ")}.`);
  }

  const habits = profile.structural_habits;
  if (habits && Object.keys(habits).length > 0) {
    const habitLines: string[] = [];
    if (habits.opener_style === "question") habitLines.push("- Consider opening with a question.");
    else if (habits.opener_style === "short") habitLines.push("- Open with a short, punchy sentence.");
    if (habits.closer_style === "question") habitLines.push("- Consider ending with a question.");
    else if (habits.closer_style === "short") habitLines.push("- End with a short, punchy sentence.");
    if (habits.fragment_usage === "frequent") habitLines.push("- Use sentence fragments freely — you lean staccato.");
    if (habits.paragraph_length_tendency === "short") habitLines.push("- Keep paragraphs short, 1-2 sentences.");
    if (habitLines.length > 0) lines.push("\nLEARNED STRUCTURAL HABITS:", ...habitLines);
  }

  return lines.length > 0 ? `\n${lines.join("\n")}\n` : "";
}
