import { createClient } from "./client";

export interface Draft {
  id: string;
  user_id: string;
  plan_id: string;
  post_index: number;
  content: string;
  created_at: string;
  updated_at: string;
}

export async function getDraft(planId: string, postIndex: number): Promise<Draft | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("drafts")
    .select("*")
    .eq("user_id", user.id)
    .eq("plan_id", planId)
    .eq("post_index", postIndex)
    .maybeSingle();

  if (error) { console.error("Failed to fetch draft:", error); return null; }
  return data as Draft | null;
}

export async function getAllDrafts(): Promise<Draft[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("drafts")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) { console.error("Failed to fetch drafts:", error); return []; }
  return data as Draft[];
}

export async function saveDraft(planId: string, postIndex: number, content: string): Promise<Draft | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const existing = await getDraft(planId, postIndex);
  if (existing) {
    const { data, error } = await supabase
      .from("drafts")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select()
      .single();
    if (error) { console.error("Failed to update draft:", error); return null; }
    return data as Draft;
  }

  const { data, error } = await supabase
    .from("drafts")
    .insert({ user_id: user.id, plan_id: planId, post_index: postIndex, content })
    .select()
    .single();

  if (error) { console.error("Failed to save draft:", error); return null; }
  return data as Draft;
}
