import { createClient } from "./client";

export interface UserProfile {
  id: string;
  display_name: string | null;
  audience_description: string | null;
  channels: string[];
  tone: string | null;
  onboarding_completed: boolean;
  business_description: string | null;
  party_pitch: string | null;
  goals: string[];
  platforms: string[];
  posting_frequency: string | null;
  posting_challenges: string | null;
  profile_url: string | null;
  past_posts: string | null;
  posting_experience: string | null;
  posts_that_work: string[];
  posts_that_flop: string[];
  voice_tone: string | null;
  what_you_do: string | null;
  what_you_build: string | null;
  why_you_post: string | null;
  tooltip_seen: boolean;
  created_at: string;
}

export async function getProfile(): Promise<UserProfile | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;
  return data as UserProfile;
}

export async function upsertProfile(fields: Partial<Omit<UserProfile, "id" | "created_at">>): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("profiles")
    .upsert({ id: user.id, ...fields, updated_at: new Date().toISOString() });

  if (error) {
    console.error("Profile upsert error:", error);
    return false;
  }
  return true;
}
