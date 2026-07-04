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

export interface Theme {
  tension: string;
  why_now: string;
  format: "story" | "lesson" | "framework" | "contrarian-take";
  source: "log" | "profile" | "voice";
  source_entry_id?: string;
  queued: boolean;
}

export interface WeeklyThemes {
  themes: Theme[];
  picked_theme_index: number | null;
  context: string;
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

// Current week's Monday (always includes today)
export function getCurrentWeekMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  return toLocalDateStr(monday);
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

export async function createWeeklyDump(content: string): Promise<WeeklyDump | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
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

export async function saveThemePlan(dumpId: string, themes: WeeklyThemes): Promise<ContentPlan | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("content_plans")
    .insert({
      user_id: user.id,
      dump_id: dumpId,
      week_start: getWeekStart(),
      plan: themes,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to save theme plan:", error);
    return null;
  }
  return data as ContentPlan;
}

export async function updateThemePick(planId: string, pickedIndex: number): Promise<ContentPlan | null> {
  const supabase = createClient();

  // First fetch the current plan
  const { data: current, error: fetchError } = await supabase
    .from("content_plans")
    .select("plan")
    .eq("id", planId)
    .single();

  if (fetchError || !current) return null;

  const themes = current.plan as WeeklyThemes;
  themes.picked_theme_index = pickedIndex;
  themes.themes.forEach((t, i) => {
    t.queued = i !== pickedIndex;
  });

  const { data, error } = await supabase
    .from("content_plans")
    .update({ plan: themes })
    .eq("id", planId)
    .select()
    .single();

  if (error) {
    console.error("Failed to update theme pick:", error);
    return null;
  }
  return data as ContentPlan;
}

export async function updatePlanPosts(planId: string, plan: ContentPlanData): Promise<ContentPlan | null> {
  const supabase = createClient();
  const { data, error } = await supabase.from("content_plans").update({ plan }).eq("id", planId).select().single();

  if (error) {
    console.error("Failed to update plan:", error);
    return null;
  }
  return data as ContentPlan;
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

export async function getAllDumps(): Promise<WeeklyDump[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("weekly_dumps")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch dumps:", error);
    return [];
  }
  return data as WeeklyDump[];
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

export async function getPlanByWeek(weekStart: string): Promise<ContentPlan | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("content_plans")
    .select("*")
    .eq("user_id", user.id)
    .eq("week_start", weekStart)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch plan by week:", error);
    return null;
  }
  return data as ContentPlan | null;
}

export { getWeekStart };
