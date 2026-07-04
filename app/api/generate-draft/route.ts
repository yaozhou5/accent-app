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
    const abs = Math.abs(norm);

    if (abs < 0.25) continue; // near-neutral, skip

    const strong = abs >= 0.75;

    switch (key) {
      case "directness":
        if (norm > 0) {
          lines.push(
            "DIRECTNESS: State your point in the first sentence. No throat-clearing, no 'I wanted to share...' Lead with the conclusion, then support it."
          );
          if (strong)
            lines.push(
              "Be blunt. If something failed, say it failed. If you disagree, say so. The reader respects you more when you don't soften."
            );
        } else {
          lines.push(
            "DIRECTNESS: Build context before making your point. Don't lead with the conclusion — walk the reader through your thinking so they arrive at it with you."
          );
          if (strong)
            lines.push(
              "Never drop a take without setting the scene first. The reader needs to understand why before they hear what."
            );
        }
        break;

      case "precision":
        if (norm > 0) {
          lines.push(
            "PRECISION: Use specific numbers, names, dates, and concrete details. Say '12 deals, up from 7' not 'more deals.' Say '$34K average' not 'smaller deals.'"
          );
          if (strong)
            lines.push(
              "Every claim needs a number or a name attached to it. Vague language ('a lot,' 'some,' 'recently') is banned. If you don't have the number, use a concrete example instead."
            );
        } else {
          lines.push(
            "PRECISION: Paint impressions rather than citing data. Use feelings, metaphors, and sensory language. 'The room felt different after that meeting' over 'The meeting ran 40 minutes over.'"
          );
          if (strong)
            lines.push(
              "Avoid specific numbers unless they're the whole point. Let the reader feel the weight of something rather than count it."
            );
        }
        break;

      case "temperature":
        if (norm > 0) {
          lines.push(
            "TEMPERATURE: Show emotion. If something was embarrassing, say 'I was embarrassed.' If it scared you, say that. Vulnerability is your signal — it's what makes people trust you."
          );
          if (strong)
            lines.push(
              "Don't intellectualize feelings. 'This keeps me up at night' hits harder than 'This is challenging.' Let the reader feel what you felt, not just understand what happened."
            );
        } else {
          lines.push(
            "TEMPERATURE: Keep professional distance. Let the facts carry emotional weight on their own. Don't name your feelings — describe the situation and let the reader draw conclusions."
          );
          if (strong)
            lines.push(
              "Use understatement. 'The presentation didn't go as planned' is more powerful than 'I was mortified.' Restraint signals confidence. Never confess — observe."
            );
        }
        break;

      case "authority":
        if (norm > 0) {
          lines.push(
            "AUTHORITY: Take positions. Say 'We need to cut this' not 'I wonder if this is working.' Use declarative statements. You're not asking permission — you're sharing a conclusion you've earned."
          );
          if (strong)
            lines.push(
              "Don't hedge with 'I think' or 'In my opinion' or 'It might be worth...' Just say it. The confidence is the point."
            );
        } else {
          lines.push(
            "AUTHORITY: Invite the reader to think alongside you. Use questions and observations. 'I've noticed...' and 'I wonder if...' instead of declarations."
          );
          if (strong)
            lines.push(
              "Frame insights as discoveries, not verdicts. The reader should feel like they're exploring with you, not being lectured. End with questions more often than conclusions."
            );
        }
        break;

      case "rhythm":
        if (norm > 0) {
          lines.push(
            "RHYTHM: Short sentences. Fragments are fine. Punch. Then expand for one beat. Then punch again. Vary length but bias toward brevity."
          );
          if (strong)
            lines.push(
              "Three words can be a sentence. Use them. Break up any sentence longer than 15 words. White space is your friend. Let each line land before starting the next."
            );
        } else {
          lines.push(
            "RHYTHM: Write in longer, layered sentences that carry the reader through complex ideas. Let clauses build on each other. Avoid staccato fragments."
          );
          if (strong)
            lines.push(
              "Sentences should flow like speech — connected, unhurried, with natural pauses created by commas and dashes rather than periods. One idea should lead organically to the next."
            );
        }
        break;

      case "framing":
        if (norm > 0) {
          lines.push(
            "FRAMING: Open with a specific scene or moment. 'Last Thursday a client called at 9pm...' Place the reader in a time and place before delivering the insight."
          );
          if (strong)
            lines.push(
              "Every post should start with a story — a real moment with sensory detail. The takeaway comes AFTER the scene, never before it. Make the reader feel like they're watching a movie."
            );
        } else {
          lines.push(
            "FRAMING: Open with the takeaway, then structure the supporting evidence. Use frameworks, numbered lists, and clear sections. 'Three things I learned...' over 'I was sitting in the parking lot...'"
          );
          if (strong)
            lines.push(
              "Organize before you narrate. The reader should see the structure in the first two lines. Use headers, numbers, or parallel construction to make the architecture visible."
            );
        }
        break;

      case "energy":
        if (norm > 0) {
          lines.push(
            "ENERGY: Be provocative. Challenge conventional wisdom. Start with a bold, slightly uncomfortable claim that makes the reader think 'wait, really?'"
          );
          if (strong)
            lines.push(
              "'Nobody talks about this enough' energy. Pick a fight with the status quo. Your opening should make at least 20% of readers disagree — that's how you know it's sharp enough."
            );
        } else {
          lines.push(
            "ENERGY: Be reflective. Start with a quiet observation or a question you've been sitting with. Let the reader lean in rather than recoil."
          );
          if (strong)
            lines.push(
              "'Something I've been thinking about...' energy. Don't provoke — invite. The power is in the gentleness. A calm observation that slowly reveals depth hits harder than a hot take."
            );
        }
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
