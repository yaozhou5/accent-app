import { createClient } from "./client";

export interface UserProfile {
  id: string;
  display_name: string | null;
  audience_description: string | null;
  channels: string[];
  tone: string | null;
  onboarding_completed: boolean;
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
