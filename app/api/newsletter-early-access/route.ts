import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import {
  earlyAccessClient,
  earlyAccessEnvironment,
  isTestEmail,
  normaliseEmail,
  describeError,
} from "@/lib/newsletter-early-access";

// Join the newsletter early-access list.
// The response is the same whether the email is new or already on the list, so it
// never reveals who else has signed up. No email is sent and nothing is tracked.
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`newsletter-ea-join:${ip}`).allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const email = normaliseEmail((body as { email?: unknown })?.email);
  if (!email) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  try {
    const supabase = earlyAccessClient();
    const environment = earlyAccessEnvironment();
    const now = new Date().toISOString();

    // Find or create the signup. A repeat signup just updates its timestamps.
    let signupId: string | null = null;
    const existing = await supabase
      .from("newsletter_early_access")
      .select("id, submit_count")
      .eq("email", email)
      .eq("environment", environment)
      .maybeSingle();
    if (existing.error) throw existing.error;

    if (existing.data) {
      signupId = existing.data.id;
      const upd = await supabase
        .from("newsletter_early_access")
        .update({ last_submitted_at: now, submit_count: (existing.data.submit_count ?? 1) + 1 })
        .eq("id", signupId);
      if (upd.error) throw upd.error;
    } else {
      const ins = await supabase
        .from("newsletter_early_access")
        .insert({ email, environment, is_test: isTestEmail(email) })
        .select("id")
        .single();
      if (ins.error) {
        // Unique violation: a parallel request created it first. Use that row.
        if (ins.error.code !== "23505") throw ins.error;
        const again = await supabase
          .from("newsletter_early_access")
          .select("id")
          .eq("email", email)
          .eq("environment", environment)
          .single();
        if (again.error) throw again.error;
        signupId = again.data.id;
      } else {
        signupId = ins.data.id;
      }
    }

    // A fresh one-time token for the optional question, tied to this signup.
    const tok = await supabase
      .from("newsletter_early_access_answers")
      .insert({ signup_id: signupId })
      .select("answer_token")
      .single();
    if (tok.error) {
      // The email is saved; only the optional question is unavailable.
      console.error("Newsletter early access: answer token error:", JSON.stringify(tok.error));
      return NextResponse.json({ ok: true, answerToken: null });
    }

    return NextResponse.json({ ok: true, answerToken: tok.data.answer_token });
  } catch (error) {
    console.error("Newsletter early access: save error:", describeError(error));
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}
