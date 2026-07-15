// app/api/generate-draft/route.ts
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { type VoiceDimensions } from "@/lib/voice-dimensions";
import { buildVoiceInstructions } from "@/lib/voice-instructions";

const anthropic = new Anthropic({ maxRetries: 2 });

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

    const { entryContent, voiceProfile, businessContext, platform, estimateWords } = await request.json();

    if (!entryContent?.trim())
      return new Response(JSON.stringify({ error: "entry content required" }), { status: 400 });

    const voiceInstructions = voiceProfile?.dimensions
      ? buildVoiceInstructions(voiceProfile.dimensions, voiceProfile)
      : "Write in a clear, professional tone.";

    const lengthGuide = estimateWords
      ? `Target length: ~${estimateWords} words.`
      : PLATFORM_GUIDES[(platform || "linkedin").toLowerCase()] || PLATFORM_GUIDES.linkedin;

    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const systemPrompt = `You are expanding the user's raw thinking into a continuous draft. Keep their words and phrasing — add transitions and flow, don't rewrite their ideas. The sections below are their thinking in their own words. Connect them into one smooth piece.

VOICE STYLE (follow these closely):
${voiceInstructions}

${lengthGuide}

Today's date: ${today}

RULES:
- Write ONE complete draft, ready to copy-paste and publish.
- Preserve the user's exact phrasing where possible. If they wrote a memorable line, keep it word for word. Your job is to connect their thinking, not improve their vocabulary.
- Use the sections as raw material — extract the story, insight, or point. Don't just polish the notes.
- Sound like a real person, not a writing tool. No "Here's the thing...", "Let me be honest...", or other AI cliches.
- Do not add a title, subject line, or meta-commentary. Just the draft.
- Do not explain what you did. Just write the draft.`;

    const contextLine = businessContext?.trim() ? `\nContext about the author: ${businessContext}\n` : "";

    const userPrompt = `${contextLine}Raw note:
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
