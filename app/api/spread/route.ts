import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ maxRetries: 2 });

const CHANNEL_GUIDANCE: Record<string, string> = {
  linkedin: "LinkedIn: professional but human, story-driven, line breaks for readability, hook in first line, 150-300 words",
  cold_dm: "Cold DM: short, personal, specific value prop, conversational, under 100 words, feels like a real message not a template",
  tweet: "Tweet: punchy, fragmented lines, reads like a thread if longer, under 280 chars per tweet or break into thread format",
  newsletter: "Newsletter: longer form, personal voice, storytelling arc, 200-400 words, feels like a letter to a friend",
  community_post: "Community Post: casual, authentic, asking for engagement, feels like talking to peers",
};

export async function POST(request: NextRequest) {
  try {
    const { draft, channels } = await request.json();

    if (!draft?.trim()) {
      return NextResponse.json({ error: "Draft is required" }, { status: 400 });
    }

    const selectedChannels = (channels || ["linkedin", "cold_dm", "tweet", "newsletter", "community_post"])
      .filter((c: string) => CHANNEL_GUIDANCE[c]);

    const channelInstructions = selectedChannels
      .map((c: string) => `- ${CHANNEL_GUIDANCE[c]}`)
      .join("\n");

    const channelKeys = selectedChannels.join('", "');

    const prompt = `You are a writing coach for solo founders. The user will give you a draft they wrote. It could be a community update, a rough idea, an email, anything.

Rewrite this draft for EACH of the following channels. Each version should feel native to that platform.

Rules:
- Preserve the author's voice and personality. Don't make it sound corporate or generic.
- Adapt the tone, length, structure, and format for each channel.
- Make it feel native to the platform. Someone scrolling should stop on this.
- Don't add hashtags unless the user's draft already uses them.
- Don't add emojis unless the user's draft already uses them.
- Return ONLY the rewritten text per channel. No explanations or meta-commentary.

Channel guidance:
${channelInstructions}

User's draft:
${draft}

Return ONLY valid JSON with these keys: "${channelKeys}"
Each value is the rewritten text as a string. No markdown, no code fences.
{
  ${selectedChannels.map((c: string) => `"${c}": "rewritten text for ${c}"`).join(",\n  ")}
}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "Unexpected response format" }, { status: 500 });
    }

    let jsonText = content.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    }
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Failed to parse response" }, { status: 500 });
    }

    const results = JSON.parse(jsonMatch[0]);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Spread API error:", error);
    return NextResponse.json({ error: "Failed to generate channel versions" }, { status: 500 });
  }
}
