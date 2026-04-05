import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildCheckPrompt } from "@/lib/prompts";
import type { CheckRequest, CheckResponse } from "@/lib/types";

const anthropic = new Anthropic({ maxRetries: 3 });

export async function POST(request: NextRequest) {
  try {
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
