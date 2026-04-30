import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ maxRetries: 2 });

export async function POST(request: NextRequest) {
  try {
    const { draft, channel, originalEntry, angle, audienceProfile } = await request.json();
    if (!draft?.trim()) return NextResponse.json({ error: "Draft is required" }, { status: 400 });

    const prompt = `You are a writing coach for a solo founder. They wrote a diary entry, you identified a story angle, and now they're writing a post for ${channel || "LinkedIn"} based on that angle.

Your job is to coach their writing. Not rewrite it. You're the editor with the red pen, not the ghostwriter.

Provide:
- "structure": Structural feedback. Where are they burying the lead? Is the opening strong enough for ${channel}? Is it the right length? Be specific. Reference their actual sentences.
- "choices": 5-8 word-level alternatives. Words or short phrases where a different choice would strengthen the post. For each, provide 2-3 alternatives with brief explanations.
- "stand_out": {
    "common_take": What most people posting about this topic on ${channel} sound like. One sentence.
    "your_angle": What's different about their version. Two sentences max.
    "bold_move": One concrete suggestion. One sentence.
  }
- "channel_fit": Any adjustments needed for ${channel} specifically (length, tone, format). One sentence.

Rules:
- Never rewrite their sentences. Point at them and suggest changes.
- Be direct. "This opening is weak because..." not "You might consider..."
- Reference their original diary entry to remind them of details they might have left out.
- Praise what works. If a sentence is strong, say so and say why.
${audienceProfile ? `\nAudience: ${audienceProfile.audience_description || "Not specified"}` : ""}

Story angle: "${angle || "Not specified"}"

Original diary entry:
${originalEntry || "(not provided)"}

Their draft:
${draft}

Respond ONLY as JSON:
{
  "structure": "...",
  "choices": [
    {
      "original": "word or phrase",
      "alternatives": [
        { "word": "alternative", "reason": "why this works differently" }
      ]
    }
  ],
  "stand_out": {
    "common_take": "...",
    "your_angle": "...",
    "bold_move": "..."
  },
  "channel_fit": "..."
}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 3000,
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
    console.error("Coach API error:", error);
    return NextResponse.json({ error: "Failed to coach" }, { status: 500 });
  }
}
