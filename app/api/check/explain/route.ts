import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildExplainPrompt } from "@/lib/prompts";
import type { Issue } from "@/lib/types";
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
    const original: string = body.original;
    const improved_full: string = body.improved_full;
    const phrases: Array<{ phrase: string; fixed_phrase: string }> =
      body.phrases ?? [];

    if (!original || !improved_full) {
      return NextResponse.json(
        { error: "Original and improved text are required" },
        { status: 400 }
      );
    }

    // No changes — no lessons to teach
    if (phrases.length === 0) {
      return NextResponse.json({ issues: [] });
    }

    const prompt = buildExplainPrompt(original, improved_full, phrases);

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
      return NextResponse.json(
        { error: "Failed to parse response" },
        { status: 500 }
      );
    }

    type Lesson = {
      title: string;
      revised_sentence: string;
      lesson_title: string;
      lesson_body: string;
      examples: Array<{ bad: string; good: string }>;
    };
    let parsed: { lessons: Lesson[] };
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      const fixed = jsonMatch[0].replace(
        /(?<=<mark>)(.*?)(?=<\/mark>)/g,
        (match) => match.replace(/"/g, '\\"')
      );
      try {
        parsed = JSON.parse(fixed);
      } catch {
        console.error("Explain JSON parse failed:", jsonMatch[0].slice(0, 300));
        return NextResponse.json(
          { error: "Failed to parse response. Please try again." },
          { status: 500 }
        );
      }
    }

    // Merge lessons with phrases — phrases drive the issues, lessons add explanation.
    // This guarantees Quick fix and Teach me show identical highlights.
    const lessons = parsed.lessons ?? [];
    const issues: Issue[] = phrases.map((p, i) => {
      const lesson = lessons[i];
      return {
        phrase: p.phrase,
        fixed_phrase: p.fixed_phrase,
        title: lesson?.title || "Improvement",
        revised_sentence: lesson?.revised_sentence || "",
        lesson_title: lesson?.lesson_title || "",
        lesson_body: lesson?.lesson_body || "",
        examples: lesson?.examples || [],
      };
    });

    const posthog = getPostHogClient();
    posthog.capture({
      distinctId,
      event: "api_explain_completed",
      properties: {
        issues_count: issues.length,
      },
    });
    await posthog.shutdown();

    return NextResponse.json({ issues });
  } catch (error: unknown) {
    console.error("Explain API error:", error);
    const isOverloaded =
      error instanceof Anthropic.APIError && error.status === 529;
    return NextResponse.json(
      {
        error: isOverloaded
          ? "The AI is busy right now. Please try again in a moment."
          : "Failed to generate lessons. Please try again.",
      },
      { status: isOverloaded ? 503 : 500 }
    );
  }
}
