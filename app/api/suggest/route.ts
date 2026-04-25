import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ maxRetries: 2 });

export async function POST(request: NextRequest) {
  try {
    const { fullText, selectedWord, sentence } = await request.json();

    if (!selectedWord?.trim() || !sentence?.trim()) {
      return NextResponse.json(
        { error: "selectedWord and sentence are required" },
        { status: 400 }
      );
    }

    const prompt = `You are a writing coach helping a writer find the perfect word.

The writer selected the word "${selectedWord}" in this sentence:
"${sentence}"

Full text for context:
${fullText?.slice(0, 2000) || sentence}

Give exactly 4 alternative words or short phrases that could replace "${selectedWord}" in this specific context. Each alternative should shift the tone or meaning in a distinct direction.

For each suggestion, provide:
- "word": the replacement word or short phrase (1-3 words max)
- "tone": a one-word tone label (e.g. "sharper", "softer", "formal", "casual", "poetic", "direct", "warm", "clinical", "urgent", "playful")
- "reason": one sentence explaining why this word works HERE, in this specific sentence and context. Be specific, not generic.

Return ONLY valid JSON, no preamble:
{
  "suggestions": [
    { "word": "...", "tone": "...", "reason": "..." },
    { "word": "...", "tone": "...", "reason": "..." },
    { "word": "...", "tone": "...", "reason": "..." },
    { "word": "...", "tone": "...", "reason": "..." }
  ]
}`;

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
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

    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Suggest API error:", error);
    return NextResponse.json(
      { error: "Failed to get suggestions" },
      { status: 500 }
    );
  }
}
