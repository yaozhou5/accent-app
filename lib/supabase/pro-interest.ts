import { createClient } from "./client";

interface SubmitProInterestParams {
  email: string;
  wantsCall: boolean;
  hadVoiceProfile: boolean;
  draftCount: number;
}

export async function submitProInterest({
  email,
  wantsCall,
  hadVoiceProfile,
  draftCount,
}: SubmitProInterestParams): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase.from("pro_interest").insert({
    user_id: user.id,
    email,
    wants_call: wantsCall,
    had_voice_profile: hadVoiceProfile,
    draft_count: draftCount,
  });

  if (error) {
    console.error("Failed to submit pro interest:", error);
    return false;
  }
  return true;
}
