import { createClient } from "./client";

export interface LogEntry {
  id: string;
  user_id: string;
  created_at: string;
  content: string;
}

export async function createLog(content: string): Promise<LogEntry | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error("createLog: no authenticated user");
    return null;
  }

  const { data, error } = await supabase
    .from("logs")
    .insert({ user_id: user.id, content })
    .select()
    .single();

  if (error) {
    console.error("Failed to create log:", error);
    return null;
  }
  return data as LogEntry;
}

export async function getLogs(filter: "week" | "all" = "all"): Promise<LogEntry[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  let query = supabase
    .from("logs")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (filter === "week") {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1; // Monday = start of week
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    query = query.gte("created_at", monday.toISOString());
  }

  const { data, error } = await query;
  if (error) {
    console.error("Failed to fetch logs:", error);
    return [];
  }
  return data as LogEntry[];
}

export async function deleteLog(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("logs").delete().eq("id", id);
  if (error) {
    console.error("Failed to delete log:", error);
    return false;
  }
  return true;
}
