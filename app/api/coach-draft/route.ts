import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ maxRetries: 2 });

export async function POST(request: NextRequest) {
  try {
    const { draft, key_takeaway, structure, platform } = await request.json();
    if (!draft?.trim()) return NextResponse.json({ error: "Draft is required" }, { status: 400 });

    const prompt = `You are a writing coach for solo founders. A founder just wrote a draft for a ${platform || "social media"} post. Their intended key takeaway was: "${key_takeaway || "not specified"}"
${structure?.length ? `\nThe intended structure was:\n${structure.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}` : ""}

Their draft:
"""
${draft}
"""

Give concise, actionable feedback. Return ONLY valid JSON:
{
  "overall": "One sentence: does this draft deliver the key takeaway? Be direct.",
  "structure_feedback": "One sentence on how well the draft follows the intended arc. What's missing or out of order?",
  "phrases_to_improve": [
    {
      "original": "the exact phrase from their draft",
      "suggestion": "a better version",
      "reason": "why this is better (max 10 words)"
    }
  ],
  "micro_lesson": {
    "title": "One writing principle they should learn from this draft (e.g. 'Lead with tension, not context')",
    "explanation": "2-3 sentences explaining the principle with an example from their draft"
  }
}

Rules:
- Max 3 phrases to improve. Pick the highest-impact ones.
- Be specific. Reference their actual words.
- The micro_lesson should be something they can apply to every post, not just this one.
- If the draft is good, say so. Don't manufacture problems.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") return NextResponse.json({ error: "Unexpected response" }, { status: 500 });

    let text = content.text.trim();
    if (text.startsWith("```")) text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "Failed to parse" }, { status: 500 });

    return NextResponse.json(JSON.parse(match[0]));
  } catch (error) {
    console.error("Coach draft error:", error);
    return NextResponse.json({ error: "Failed to coach" }, { status: 500 });
  }
}
