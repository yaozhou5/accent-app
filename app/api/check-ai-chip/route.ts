import { NextRequest, NextResponse } from "next/server";
import Anthropic, { APIConnectionTimeoutError, APIError, RateLimitError } from "@anthropic-ai/sdk";
import { getChipById } from "@/lib/clock/chips";
import { transcriptContainsPhrase } from "@/lib/clock/chipCheck";
import { logAiGenerationFailure, logAiUsage } from "@/lib/ai-usage-log";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({ maxRetries: 2 });
const MODEL = "claude-haiku-4-5-20251001";
const FEATURE = "check-ai-chip";
const MAX_TRANSCRIPT_CHARS = 3000;

const SYSTEM_PROMPT = `You are checking a short practice-speech transcript against one specific criterion for a speaking-practice app. The transcript comes from automatic speech-to-text, so expect minor transcription errors, filler words, and false starts — be lenient about exact phrasing but strict about whether the substance of the criterion is actually met.

Respond with ONLY a single JSON object and nothing else — no markdown, no code fences, no explanation outside the JSON. It must match exactly this shape:
{"met": boolean, "reason": string, "quote": string or null}

- "reason": one short sentence (under 20 words), plain and encouraging, explaining your decision.
- "quote": when met is true, the exact substring of the transcript (copied verbatim, not paraphrased) that satisfies the criterion. When met is false, this must be null.`;

type AiCheckResponse = { met: boolean; reason: string; quote: string | null };

function isValidShape(value: unknown): value is AiCheckResponse {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.met === "boolean" &&
    typeof v.reason === "string" &&
    v.reason.trim().length > 0 &&
    v.reason.length < 300 &&
    (v.quote === null || typeof v.quote === "string")
  );
}

// Never put the transcript, the model's raw text, or any part of either
// into a failure log — `detail` is only ever a fixed bucket name or an
// error's constructor name, nothing derived from request/response content.
async function logFailure(reason: string, durationMs: number, userId: string | null, detail: string | null = null) {
  await logAiGenerationFailure({ feature: FEATURE, model: MODEL, reason, durationMs, detail, userId });
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;

    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(`ai-check:${ip}`);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { transcript, criterionId } = await request.json();

    if (typeof criterionId !== "string" || !criterionId.trim()) {
      return NextResponse.json({ error: "criterionId is required" }, { status: 400 });
    }
    // The client never supplies label/rubric text — always looked up
    // server-side from the config, so a caller can't inject its own prompt.
    const chip = getChipById(criterionId);
    if (!chip || chip.type !== "ai_check") {
      return NextResponse.json({ error: "Unknown criterionId" }, { status: 400 });
    }
    if (typeof transcript !== "string" || !transcript.trim()) {
      return NextResponse.json({ error: "transcript is required" }, { status: 400 });
    }
    if (transcript.length > MAX_TRANSCRIPT_CHARS) {
      return NextResponse.json({ error: "transcript is too long" }, { status: 400 });
    }

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 200,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Criterion: ${chip.label}\nRubric: ${chip.rubric}\n\nTranscript:\n"""\n${transcript}\n"""`,
        },
      ],
    });

    await logAiUsage({ feature: FEATURE, model: MODEL, usage: message.usage, userId });

    const content = message.content[0];
    if (content.type !== "text") {
      await logFailure("empty_response", Date.now() - startedAt, userId);
      return NextResponse.json({ error: "Unexpected response format" }, { status: 502 });
    }

    let jsonText = content.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);

    let parsed: unknown;
    try {
      if (!jsonMatch) throw new Error("no_json_found");
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      await logFailure("parse_error", Date.now() - startedAt, userId);
      return NextResponse.json({ error: "Failed to parse response" }, { status: 502 });
    }

    if (!isValidShape(parsed)) {
      await logFailure("invalid_shape", Date.now() - startedAt, userId);
      return NextResponse.json({ error: "Invalid response shape" }, { status: 502 });
    }

    // Don't trust a "met" verdict whose quote isn't actually in the
    // transcript — a hallucinated quote means the determination itself
    // isn't trustworthy either, so this falls back the same as any other
    // invalid response (client turns it into needs_confirmation).
    if (parsed.met && (parsed.quote === null || !transcriptContainsPhrase(transcript, parsed.quote))) {
      await logFailure("quote_mismatch", Date.now() - startedAt, userId);
      return NextResponse.json({ error: "Could not verify quote" }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("check-ai-chip API error:", error);
    let reason = "error";
    if (error instanceof APIConnectionTimeoutError) reason = "timeout";
    else if (error instanceof RateLimitError) reason = "rate_limited";
    else if (error instanceof APIError && typeof error.status === "number" && error.status >= 500)
      reason = "upstream_error";

    await logFailure(reason, Date.now() - startedAt, userId, error instanceof Error ? error.constructor.name : null);
    return NextResponse.json({ error: "Failed to check criterion" }, { status: 502 });
  }
}
