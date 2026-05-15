import { createClient } from "./client";

export interface LogEntry {
  id: string;
  user_id: string;
  content: string;
  tags: string[];
  created_at: string;
}

export async function createLogEntry(content: string, tags: string[] = []): Promise<LogEntry | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("log_entries")
    .insert({ user_id: user.id, content, tags })
    .select()
    .single();

  if (error) { console.error("Failed to create log entry:", error); return null; }
  return data as LogEntry;
}

export async function updateLogEntryTags(id: string, tags: string[]): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("log_entries").update({ tags }).eq("id", id);
  if (error) { console.error("Failed to update tags:", error); return false; }
  return true;
}

export async function getLogEntries(): Promise<LogEntry[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("log_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) { console.error("Failed to fetch log entries:", error); return []; }
  return data as LogEntry[];
}

export async function getThisWeekEntries(): Promise<LogEntry[]> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("log_entries")
    .select("*")
    .eq("user_id", user.id)
    .gte("created_at", monday.toISOString())
    .order("created_at", { ascending: false });

  if (error) { console.error("Failed to fetch week entries:", error); return []; }
  return data as LogEntry[];
}

export async function deleteLogEntry(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from("log_entries").delete().eq("id", id);
  if (error) { console.error("Failed to delete log entry:", error); return false; }
  return true;
}
