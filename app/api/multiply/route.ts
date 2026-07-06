import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { buildVoiceInstructions } from "@/lib/voice-instructions";
import type { VoiceDimensions } from "@/lib/voice-dimensions";

const anthropic = new Anthropic({ maxRetries: 2 });

const PLATFORM_RULES: Record<string, string> = {
  linkedin:
    "Platform: LinkedIn. Professional but personal. Hook in the first line — make the reader stop scrolling. Use line breaks for readability (one idea per line). End with a question or sharp insight. 150-300 words. No hashtags. No emojis.",
  twitter:
    "Platform: X/Twitter. Punchy, compressed. Decide based on content: if the idea fits in one tweet, write one tweet (under 280 chars). If it needs more room, write a numbered thread (2-5 tweets, each under 280 chars). Start with the strongest claim.",
  newsletter:
    "Platform: Newsletter. Warmer, more expansive, conversational. The reader opted in — they care. You can take your time. Build the idea with texture. 200-400 words. Feel like a letter from a smart friend, not a blog post.",
  short:
    "Platform: Short post (Instagram caption / general short-form). One core idea. Concise. Casual but smart. 50-150 words. No structure — just the thought, cleanly expressed.",
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

    const { draftText, voiceProfile, platform } = await request.json();

    if (!draftText?.trim()) return new Response(JSON.stringify({ error: "draftText required" }), { status: 400 });

    const voiceInstructions = voiceProfile?.dimensions
      ? buildVoiceInstructions(voiceProfile.dimensions as VoiceDimensions)
      : "Write in a clear, professional tone.";

    const platformRule = PLATFORM_RULES[platform] || PLATFORM_RULES.linkedin;

    const systemPrompt = `You are adapting an existing draft for a different platform. Preserve the core insight and the author's voice. Don't just shorten or lengthen — rewrite for how people read on this platform.

VOICE STYLE (follow these closely):
${voiceInstructions}

${platformRule}

RULES:
- Write ONE complete post for this platform, ready to copy-paste and publish.
- Keep the same core idea and point of view as the original draft.
- Adapt structure, length, tone, and formatting for the platform's conventions.
- Sound like a real person, not a writing tool. No AI cliches.
- Do not add a title, subject line, or meta-commentary. Just the post.
- For Twitter threads, number each tweet (1/, 2/, etc.) and keep each under 280 characters.`;

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `Original draft:\n\n${draftText}\n\nAdapt this for the platform specified above.`,
        },
      ],
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
    console.error("multiply error:", error);
    return new Response(JSON.stringify({ error: "Failed to multiply" }), { status: 500 });
  }
}
