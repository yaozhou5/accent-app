import { createClient } from "./client";

export interface WeeklyDump {
  id: string;
  user_id: string;
  content: string;
  week_start: string;
  created_at: string;
}

export interface ContentPlanPost {
  day: string;
  date: string;
  platform: string;
  hook: string;
  reasoning: string;
  post_type: string;
  goal_alignment: string;
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

// If Thursday or later, target next week's Monday
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
  return monday.toISOString().split("T")[0];
}

export async function createWeeklyDump(content: string): Promise<WeeklyDump | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("weekly_dumps")
    .insert({ user_id: user.id, content, week_start: getWeekStart() })
    .select()
    .single();

  if (error) {
    console.error("Failed to create weekly dump:", error);
    return null;
  }
  return data as WeeklyDump;
}

export async function getCurrentWeekDump(): Promise<WeeklyDump | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("weekly_dumps")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_start", getWeekStart())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch weekly dump:", error);
    return null;
  }
  return data as WeeklyDump | null;
}

export async function savePlan(dumpId: string, plan: ContentPlanData): Promise<ContentPlan | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("content_plans")
    .insert({ user_id: user.id, dump_id: dumpId, week_start: getWeekStart(), plan })
    .select()
    .single();

  if (error) {
    console.error("Failed to save plan:", error);
    return null;
  }
  return data as ContentPlan;
}

export async function getCurrentPlan(): Promise<ContentPlan | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
