import { createClient } from "./client";

export interface CoachingMessage {
  role: "ai" | "user";
  text: string;
}

export interface CoachingSuggestion {
  hook: string;
  platform: string;
  type: string;
  why: string;
}

export interface CoachingSession {
  id: string;
  user_id: string;
  entry_ids: string[];
  messages: CoachingMessage[];
  suggestions: CoachingSuggestion[];
  created_at: string;
  updated_at: string;
}

export async function getCoachingSession(entryIds: string[]): Promise<CoachingSession | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Find a session matching these exact entry IDs
  const sorted = [...entryIds].sort();
  const { data, error } = await supabase
    .from("coaching_sessions")
    .select("*")
    .eq("user_id", user.id)
    .contains("entry_ids", sorted)
    .order("updated_at", { ascending: false })
    .limit(10);

  if (error || !data) return null;

  // Find exact match (same IDs, same count)
  const match = data.find((s) => {
    const sSorted = [...s.entry_ids].sort();
    return sSorted.length === sorted.length && sSorted.every((id: string, i: number) => id === sorted[i]);
  });

  return (match as CoachingSession) || null;
}

export async function saveCoachingSession(
  entryIds: string[],
  messages: CoachingMessage[],
  suggestions: CoachingSuggestion[]
): Promise<CoachingSession | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const sorted = [...entryIds].sort();

  // Check if session already exists
  const existing = await getCoachingSession(entryIds);

  if (existing) {
    const { data, error } = await supabase
      .from("coaching_sessions")
      .update({ messages, suggestions, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) {
      console.error("Failed to update coaching session:", error);
      return null;
    }
    return data as CoachingSession;
  }

  const { data, error } = await supabase
    .from("coaching_sessions")
    .insert({ user_id: user.id, entry_ids: sorted, messages, suggestions })
    .select()
    .single();
  if (error) {
    console.error("Failed to create coaching session:", error);
    return null;
  }
  return data as CoachingSession;
}
