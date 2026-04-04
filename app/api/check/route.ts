import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildQuickPrompt, buildLearnPrompt } from "@/lib/prompts";
import type {
  CheckRequest,
  QuickCheckResponse,
  LearnCheckResponse,
} from "@/lib/types";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CheckRequest;
    const { text, mode, language, sessionCount } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    const prompt =
      mode === "quick"
        ? buildQuickPrompt(text, language, sessionCount)
        : buildLearnPrompt(
            text,
            language,
            sessionCount,
            "keptPhrases" in body ? body.keptPhrases || [] : []
          );

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return NextResponse.json(
        { error: "Unexpected response format" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(content.text) as
      | QuickCheckResponse
      | LearnCheckResponse;
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Check API error:", error);
    return NextResponse.json(
      { error: "Failed to analyze writing" },
      { status: 500 }
    );
  }
}
