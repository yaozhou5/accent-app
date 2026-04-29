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

    const prompt = `You are a writing coach for solo founders. The user will give you a draft they wrote. It could be a community update, a rough idea, an email, anything.

Rewrite this draft for EACH of the following channels. Each version should feel native to that platform.

Rules:
- Preserve the author's voice and personality. Don't make it sound corporate or generic.
- Adapt the tone, length, structure, and format for each channel.
- Make it feel native to the platform. Someone scrolling should stop on this.
- Don't add hashtags unless the user's draft already uses them.
- Don't add emojis unless the user's draft already uses them.

Channel guidance:
${channelInstructions}

After writing each channel version, identify 5-8 "choice points" in that version. These are words or short phrases where the user has a meaningful alternative. For each choice point, provide 2-3 alternatives with a brief explanation of how each option changes the tone, directness, or impact.

Focus on:
- Words that AI tends to overuse (incredible, leverage, utilize, excited, passionate, journey)
- Tone-setting words where the choice matters for the channel
- Words a non-native English speaker might not fully grasp the nuance of
- Phrases where being more direct or more casual would change the impact

Keep explanations under 15 words. Be specific about WHY, not just WHAT.

User's draft:
${draft}

Return ONLY valid JSON. Each channel key maps to an object with "text" and "choices":
{
  ${selectedChannels.map((c: string) => `"${c}": {
    "text": "the full rewritten text for ${c}",
    "choices": [
      {
        "original": "word or short phrase from the text",
        "alternatives": [
          { "word": "alternative", "reason": "under 15 words explaining why" }
        ]
      }
    ]
  }`).join(",\n  ")}
}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
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

    const parsed = JSON.parse(jsonMatch[0]);

    // Normalize: handle both old format (string) and new format (object with text+choices)
    const results: Record<string, { text: string; choices: Array<{ original: string; alternatives: Array<{ word: string; reason: string }> }> }> = {};
    for (const key of selectedChannels) {
      const val = parsed[key];
      if (typeof val === "string") {
        results[key] = { text: val, choices: [] };
      } else if (val?.text) {
        results[key] = { text: val.text, choices: val.choices || [] };
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Spread API error:", error);
    return NextResponse.json({ error: "Failed to generate channel versions" }, { status: 500 });
  }
}
