import { createClient } from "./client";

export interface ContentPlanPost {
  day: string;
  date: string;
  platform: string;
  type: string;
  prompt: string;
  source_snippet: string;
  // Legacy fields for backward compat
  key_takeaway?: string;
  structure?: string[];
  hook?: string;
  reasoning?: string;
  post_type?: string;
  goal_alignment?: string;
}

export interface ContentPlanData {
  strategy_note: string;
  posts: ContentPlanPost[];
}

export interface ContentPlan {
  id: string;
  user_id: string;
  dump_id: string;
  week_start: string;
  plan: ContentPlanData;
  created_at: string;
}

function toLocalDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// If Thursday or later, target next week's Monday (for plan generation)
function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  // Thu=4, Fri=5, Sat=6, Sun=0 → shift to next Monday
  if (day >= 4 || day === 0) {
    monday.setDate(monday.getDate() + 7);
  }
  return toLocalDateStr(monday);
}

export async function getCurrentPlan(): Promise<ContentPlan | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("content_plans")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_start", getWeekStart())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch plan:", error);
    return null;
  }
  return data as ContentPlan | null;
}

export async function getAllPlans(): Promise<ContentPlan[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("content_plans")
    .select("*")
    .eq("user_id", user.id)
    .order("week_start", { ascending: false });

  if (error) {
    console.error("Failed to fetch plans:", error);
    return [];
  }
  return data as ContentPlan[];
}
