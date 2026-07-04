// app/api/generate-draft/route.ts
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { DIMENSION_LABELS, normalizeScore, type DimensionKey, type VoiceDimensions } from "@/lib/voice-dimensions";

const anthropic = new Anthropic({ maxRetries: 2 });

function buildVoiceInstructions(dims: VoiceDimensions): string {
  const lines: string[] = [];
  for (const [key, raw] of Object.entries(dims) as [DimensionKey, number][]) {
    const norm = normalizeScore(key, raw);
    const labels = DIMENSION_LABELS[key];
    const side = norm >= 0 ? labels.high : labels.low;
    const strength = Math.abs(norm);

    if (strength < 0.25) continue; // near-neutral, skip

    switch (key) {
      case "directness":
        lines.push(
          norm > 0
            ? "Write directly. State conclusions first. No hedging or softening."
            : "Ease the reader in. Provide context before conclusions."
        );
        break;
      case "precision":
        lines.push(
          norm > 0
            ? "Use specific numbers, names, and concrete details."
            : "Paint the picture without over-specifying. Use impressions over data."
        );
        break;
      case "temperature":
        lines.push(
          norm > 0
            ? "Show emotion. Be honest about how things felt. Let vulnerability in."
            : "Keep the tone professional and measured. Let the facts carry the weight."
        );
        break;
      case "authority":
        lines.push(
          norm > 0
            ? "Take a clear position. Use declarative statements."
            : "Invite the reader to think alongside you. Use questions and observations."
        );
        break;
      case "rhythm":
        lines.push(
          norm > 0
            ? "Use short sentences. Fragments are fine. Keep it punchy."
            : "Let sentences breathe. Use flowing, connected prose."
        );
        break;
      case "framing":
        lines.push(
          norm > 0
            ? "Open with a scene, moment, or story. Make it cinematic."
            : "Open with the takeaway or a clear structure. List and organize."
        );
        break;
      case "energy":
        lines.push(
          norm > 0
            ? "Be provocative. Challenge assumptions. Start with a bold claim."
            : "Be thoughtful. Start with a reflection or quiet observation."
        );
        break;
    }
  }
  return lines.join("\n");
}

const PLATFORM_GUIDES: Record<string, string> = {
  linkedin:
    "Format: LinkedIn post. 150-300 words. Hook in the first line. Use line breaks for readability. End with a question or call-to-reflection. No hashtags.",
  x: "Format: Single tweet or short thread (2-3 tweets). Punchy. Under 280 chars per tweet. No hashtags.",
  substack: "Format: Newsletter excerpt. 200-400 words. Conversational but substantial. Include a clear insight.",
  threads: "Format: Threads post. Conversational, 100-200 words. Casual but insightful.",
  小红书: "Format: 小红书 post. 100-200 words. Mix of personal story and practical insight. Warm tone.",
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });

    const { entryContent, voiceProfile, businessContext, platform } = await request.json();

    if (!entryContent?.trim())
      return new Response(JSON.stringify({ error: "entry content required" }), { status: 400 });

    const voiceInstructions = voiceProfile?.dimensions
      ? buildVoiceInstructions(voiceProfile.dimensions)
      : "Write in a clear, professional tone.";

    const platformGuide = PLATFORM_GUIDES[(platform || "linkedin").toLowerCase()] || PLATFORM_GUIDES.linkedin;

    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const systemPrompt = `You are a ghostwriter. Your job is to turn a raw note into a complete, ready-to-publish post.

VOICE STYLE (follow these closely):
${voiceInstructions}

${platformGuide}

Today's date: ${today}

RULES:
- Write ONE complete post, ready to copy-paste and publish.
- Use the note as raw material — extract the story, insight, or point. Don't just polish the note.
- Sound like a real person, not a writing tool. No "Here's the thing...", "Let me be honest...", or other AI cliches.
- Do not add a title, subject line, or meta-commentary. Just the post.
- Do not explain what you did. Just write the post.`;

    const userPrompt = `Business context: ${businessContext || "Not provided"}

Raw note:
${entryContent}

Write the post.`;

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: userPrompt }],
      system: systemPrompt,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("generate-draft error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate draft" }), { status: 500 });
  }
}
