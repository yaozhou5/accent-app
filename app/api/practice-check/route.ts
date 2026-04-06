import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildPracticeCheckPrompt } from "@/lib/prompts";
import type { PracticeCheckRequest, PracticeCheckResponse } from "@/lib/types";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const anthropic = new Anthropic({ maxRetries: 3 });

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
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

    const body = (await request.json()) as PracticeCheckRequest;
    const { original, userAttempt, context, language } = body;

    if (!userAttempt || !userAttempt.trim()) {
      return NextResponse.json(
        { error: "User attempt is required" },
        { status: 400 }
      );
    }

    const prompt = buildPracticeCheckPrompt(
      original,
      userAttempt,
      context,
      language
    );

    const message = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return NextResponse.json(
        { error: "Unexpected response format" },
        { status: 500 }
      );
    }

    // Extract JSON from response — strip code fences and trailing text
    let jsonText = content.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Failed to parse response" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]) as PracticeCheckResponse;
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Practice check API error:", error);
    return NextResponse.json(
      { error: "Failed to check practice" },
      { status: 500 }
    );
  }
}
