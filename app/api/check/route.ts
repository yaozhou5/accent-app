import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildCheckPrompt } from "@/lib/prompts";
import type { CheckRequest, CheckResponse } from "@/lib/types";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { getPostHogClient } from "@/lib/posthog-server";

const anthropic = new Anthropic({ maxRetries: 3 });

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 requests per IP per 60 minutes
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(ip);
    const distinctId = request.headers.get("X-POSTHOG-DISTINCT-ID") || ip;

    if (!rateLimit.allowed) {
      const posthog = getPostHogClient();
      posthog.capture({
        distinctId,
        event: "api_check_rate_limited",
        properties: { ip },
      });
      await posthog.shutdown();
      return NextResponse.json(
        { error: "Too many requests, please try again later." },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rateLimit.resetAt),
          },
        }
      );
    }

    const body = (await request.json()) as CheckRequest;
    const { text, language, sessionCount } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    const prompt = buildCheckPrompt(text, language, sessionCount);

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return NextResponse.json(
        { error: "Unexpected response format" },
        { status: 500 }
      );
    }

    // Extract JSON from response
    let jsonText = content.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText
        .replace(/^```(?:json)?\s*\n?/, "")
        .replace(/\n?```\s*$/, "");
    }
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse response" },
        { status: 500 }
      );
    }

    let parsed: CheckResponse;
    try {
      parsed = JSON.parse(jsonMatch[0]) as CheckResponse;
    } catch {
      // Try fixing common JSON issues: unescaped quotes in HTML tags
      const fixed = jsonMatch[0]
        .replace(/(?<=<mark>)(.*?)(?=<\/mark>)/g, (match) =>
          match.replace(/"/g, '\\"')
        );
      try {
        parsed = JSON.parse(fixed) as CheckResponse;
      } catch {
        console.error("JSON parse failed. Raw:", jsonMatch[0].slice(0, 300));
        return NextResponse.json(
          { error: "Failed to parse response. Please try again." },
          { status: 500 }
        );
      }
    }
    const posthog = getPostHogClient();
    posthog.capture({
      distinctId,
      event: "api_check_completed",
      properties: {
        issues_count: parsed.issues.length,
        had_changes: parsed.issues.length > 0,
        language,
        session_count: sessionCount,
      },
    });
    await posthog.shutdown();

    return NextResponse.json(parsed);
  } catch (error: unknown) {
    console.error("Check API error:", error);
    const isOverloaded =
      error instanceof Anthropic.APIError && error.status === 529;
    return NextResponse.json(
      {
        error: isOverloaded
          ? "The AI is busy right now. Please try again in a moment."
          : "Failed to analyze writing. Please try again.",
      },
      { status: isOverloaded ? 503 : 500 }
    );
  }
}
