import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ maxRetries: 2 });

export async function POST(request: NextRequest) {
  try {
    const { entry, audienceProfile } = await request.json();
    if (!entry?.trim()) return NextResponse.json({ error: "Entry is required" }, { status: 400 });

    const audienceContext = audienceProfile
      ? `\n\nUser's audience: ${audienceProfile.audience_description || "Not specified"}. Tone: ${audienceProfile.tone || "Not specified"}. Channels: ${(audienceProfile.channels || []).join(", ") || "Not specified"}.`
      : "";

    const prompt = `You are a content coach for solo founders who build in public. The user will give you a raw diary entry — unfiltered notes about their day, their feelings, what happened in their business.

Your job is to find the STORIES hidden in their entry. Most founders don't realize their daily experiences are content. You do.

For each story you find (2-4 stories), provide:
- "angle": A short, specific title for the content angle (not generic like "a day in the life" but specific like "the contrast between rejection and surprise")
- "channel": Which platform this story fits best (LinkedIn, Tweet, Newsletter, Community Post, Cold DM) and why
- "insight": Why this particular angle matters. Be specific to their content. Reference their actual words. Explain what makes this interesting to their audience.
- "nudge": A specific writing suggestion. Not "write about this." More like "Start with the vendor ghosting. Let the reader assume the day was a loss. Then reveal the DM. The reversal is the hook."

Rules:
- Never suggest they write something generic. Every suggestion must be rooted in their specific experience.
- Don't sanitize their experience. If they're frustrated, the frustration might be the content.
- Look for contrasts, surprises, vulnerabilities, milestones (even small ones), and lessons they might not see themselves.
- If they mention something they almost didn't mention, that's often the best story.
- Consider their audience profile if provided.
${audienceContext}

Diary entry:
${entry}

Respond ONLY as JSON:
{
  "stories": [
    {
      "angle": "...",
      "channel": "...",
      "insight": "...",
      "nudge": "..."
    }
  ]
}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
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
    console.error("Stories API error:", error);
    return NextResponse.json({ error: "Failed to find stories" }, { status: 500 });
  }
}
