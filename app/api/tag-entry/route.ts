import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ maxRetries: 2 });

export async function POST(request: NextRequest) {
  try {
    const { content, entryType } = await request.json();
    if (!content?.trim()) return NextResponse.json({ tags: [] });

    // Auto-assign "inspiration" to link and quote entries
    if (entryType === "link" || entryType === "quote") {
      return NextResponse.json({ tags: ["inspiration"] });
    }

    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 50,
      messages: [{ role: "user", content: `Categorize this founder's note into exactly ONE category. Return only a JSON array with one string, nothing else.

Categories:
- "build log" — shipped something, fixed a bug, made a technical decision
- "founder diary" — personal reflection, doubt, energy, mindset
- "market signal" — user feedback, competitor move, trend spotted
- "milestone" — numbers, launches, signups, revenue, press

Note: "${content}"` }],
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
