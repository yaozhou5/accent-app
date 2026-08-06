import { createClient } from "./client";
import type { LearnedVoiceProfile } from "@/lib/voice-patterns";

export interface VoiceLearningData {
  profile: LearnedVoiceProfile | null;
  sessionCount: number;
  updatedAt: string | null;
}

const EMPTY: VoiceLearningData = { profile: null, sessionCount: 0, updatedAt: null };

export async function getVoiceLearningData(): Promise<VoiceLearningData> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return EMPTY;

  const [{ data: learned }, { count }] = await Promise.all([
    supabase
      .from("voice_profile_learned")
      .select(
        "preferred_words, banned_words, substitution_pairs, structural_habits, anti_patterns, best_examples, updated_at"
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("voice_patterns").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  return {
    profile: learned
      ? {
          preferred_words: learned.preferred_words ?? [],
          banned_words: learned.banned_words ?? [],
          substitution_pairs: learned.substitution_pairs ?? [],
          structural_habits: learned.structural_habits ?? {},
          anti_patterns: learned.anti_patterns ?? [],
          best_examples: learned.best_examples ?? [],
        }
      : null,
    sessionCount: count ?? 0,
    updatedAt: learned?.updated_at ?? null,
  };
}
