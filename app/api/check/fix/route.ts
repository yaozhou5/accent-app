import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildFixPrompt } from "@/lib/prompts";
import type { QuickCheckResponse } from "@/lib/types";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getPostHogClient } from "@/lib/posthog-server";

const anthropic = new Anthropic({ maxRetries: 3 });

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(ip);
    const distinctId = request.headers.get("X-POSTHOG-DISTINCT-ID") || ip;

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests, please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const text: string = body.text;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    const prompt = buildFixPrompt(text);

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return NextResponse.json(
        { error: "Unexpected response format" },
        { status: 500 }
      );
    }

    let jsonText = content.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText
        .replace(/^```(?:json)?\s*\n?/, "")
        .replace(/\n?```\s*$/, "");
    }
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Fix API: no JSON found in model output:", jsonText.slice(0, 400));
      return NextResponse.json(
        { error: "Failed to parse response" },
        { status: 500 }
      );
    }

    let parsed: QuickCheckResponse;
    try {
      parsed = JSON.parse(jsonMatch[0]) as QuickCheckResponse;
    } catch (parseErr) {
      console.error(
        "Fix API: JSON.parse failed:",
        parseErr,
        "stop_reason:",
        message.stop_reason,
        "first 400 chars:",
        jsonMatch[0].slice(0, 400)
      );
      return NextResponse.json(
        { error: "Failed to parse response. Please try again." },
        { status: 500 }
      );
    }

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId,
      event: "api_fix_completed",
      properties: {
        phrases_count: parsed.phrases?.length ?? 0,
      },
    });
    await posthog.shutdown();

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    console.error("Fix API error:", error);
    const isOverloaded =
      error instanceof Anthropic.APIError && error.status === 529;
    return NextResponse.json(
      {
        error: isOverloaded
          ? "The AI is busy right now. Please try again in a moment."
          : "Failed to fix writing. Please try again.",
      },
      { status: isOverloaded ? 503 : 500 }
    );
  }
}
