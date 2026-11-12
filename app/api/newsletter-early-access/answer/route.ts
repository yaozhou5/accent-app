import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { MAX_ANSWER_LENGTH, earlyAccessClient, isUuid } from "@/lib/newsletter-early-access";

// Save the optional answer for a signup, using the one-time token returned when
// the person joined. The signup itself is already saved; this never touches it.
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  if (!checkRateLimit(`newsletter-ea-answer:${ip}`).allowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let body: { token?: unknown; answer?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const answer = typeof body.answer === "string" ? body.answer.trim() : "";
  if (!isUuid(body.token) || !answer) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  if (answer.length > MAX_ANSWER_LENGTH) {
    return NextResponse.json({ error: "too_long" }, { status: 400 });
  }

  try {
    // Each token can be used once: only fill a row whose answer is still empty.
    const { error } = await earlyAccessClient()
      .from("newsletter_early_access_answers")
      .update({ answer, answered_at: new Date().toISOString() })
      .eq("answer_token", body.token)
      .is("answer", null);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Newsletter early access: answer save error:", JSON.stringify(error));
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }
}
