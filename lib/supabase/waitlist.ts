import { createClient } from "./client";

export async function joinVoiceWaitlist(
  email: string,
  sessionCount: number
): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("voice_waitlist")
    .insert({ email, session_count: sessionCount });

  if (error) {
    // Treat duplicate email as success
    if (error.code === "23505") return true;
    console.error("Waitlist error:", error);
    return false;
  }
  return true;
}
