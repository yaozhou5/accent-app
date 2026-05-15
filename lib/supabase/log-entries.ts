import { createClient } from "./client";

export interface LogEntry {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  link_url: string | null;
  tags: string[];
  entry_type: "text" | "image" | "link";
  created_at: string;
}

export async function uploadLogImage(file: File): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${user.id}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from("log-images").upload(path, file);
  if (error) { console.error("Failed to upload image:", error); return null; }

  const { data: urlData } = supabase.storage.from("log-images").getPublicUrl(path);
  return urlData.publicUrl;
}

export function detectUrl(text: string): string | null {
  const match = text.match(/(https?:\/\/[^\s]+)/);
  return match ? match[1] : null;
}

export async function createLogEntry(
  content: string,
  opts: { tags?: string[]; image_url?: string | null; link_url?: string | null; entry_type?: string } = {}
): Promise<LogEntry | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const entry_type = opts.entry_type || (opts.image_url ? "image" : opts.link_url ? "link" : "text");

  const { data, error } = await supabase
    .from("log_entries")
    .insert({
      user_id: user.id,
      content: content || null,
      image_url: opts.image_url || null,
      link_url: opts.link_url || null,
      tags: opts.tags || [],
      entry_type,
    })
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
