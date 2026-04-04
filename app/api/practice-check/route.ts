import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildPracticeCheckPrompt } from "@/lib/prompts";
import type { PracticeCheckRequest, PracticeCheckResponse } from "@/lib/types";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
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
      model: "claude-sonnet-4-6",
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

    const parsed = JSON.parse(content.text) as PracticeCheckResponse;
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Practice check API error:", error);
    return NextResponse.json(
      { error: "Failed to check practice" },
      { status: 500 }
    );
  }
}
