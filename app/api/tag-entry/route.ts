import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ maxRetries: 2 });

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json();
    if (!content?.trim()) return NextResponse.json({ tags: [] });

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      messages: [{ role: "user", content: `Given this note from a founder, return 1-3 keyword tags. Only return tags as a JSON array of strings, nothing else. Choose from: launch, frustration, meeting, idea, milestone, rejection, partnership, decision, win, customer feedback, hiring, product, marketing, fundraising, personal.\n\nNote: "${content}"` }],
    });

    const text = message.content[0];
    if (text.type !== "text") return NextResponse.json({ tags: [] });

    const match = text.text.match(/\[[\s\S]*?\]/);
    if (!match) return NextResponse.json({ tags: [] });

    return NextResponse.json({ tags: JSON.parse(match[0]) });
  } catch (error) {
    console.error("Tag entry error:", error);
    return NextResponse.json({ tags: [] });
  }
}
