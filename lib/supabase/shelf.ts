import { createClient } from "./client";
import type { Issue } from "../types";

export interface ShelfEntry {
  id: string;
  user_id: string;
  created_at: string;
  original: string;
  improved: string;
  lessons: Issue[];
  mode: "quick" | "teach";
}

export async function saveToShelf(
  original: string,
  improved: string,
  lessons: Issue[],
  mode: "quick" | "teach"
): Promise<ShelfEntry | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("shelf_entries")
    .insert({
      user_id: user.id,
      original,
      improved,
      lessons,
      mode,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to save to shelf:", error);
    return null;
  }

  return data as ShelfEntry;
}

export async function getShelfEntries(): Promise<ShelfEntry[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("shelf_entries")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch shelf entries:", error);
    return [];
  }

  return data as ShelfEntry[];
}

export async function deleteShelfEntry(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("shelf_entries")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Failed to delete shelf entry:", error);
    return false;
  }

  return true;
}
