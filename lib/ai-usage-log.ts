import { createServerClient } from "@supabase/ssr";

// Service-role client — every call site (authenticated or not, e.g. the
// public /voice quiz) needs this to work the same way, and this table has
// no client-facing use, so RLS is bypassed entirely rather than threaded
// through per-route auth state. Same pattern as voice-result's cacheClient().
function client() {
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

interface LogAiUsageParams {
  feature: string;
  model: string;
  usage: { input_tokens: number; output_tokens: number };
  userId?: string | null;
}

// Fire this after every Anthropic call. Never throws — a logging failure
// must never surface as a user-facing error on the actual feature.
export async function logAiUsage({ feature, model, usage, userId }: LogAiUsageParams): Promise<void> {
  try {
    const { error } = await client()
      .from("ai_usage_log")
      .insert({
        feature,
        model,
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        user_id: userId ?? null,
      });
    if (error) console.error(`Failed to log AI usage (${feature}):`, JSON.stringify(error));
  } catch (e) {
    console.error(`Failed to log AI usage (${feature}):`, e);
  }
}
