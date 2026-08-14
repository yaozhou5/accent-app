// app/api/voice-result/route.ts
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { type VoiceDimensions, DIMENSION_LABELS, normalizeScore, type DimensionKey } from "@/lib/voice-dimensions";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { logAiUsage } from "@/lib/ai-usage-log";

const anthropic = new Anthropic({ maxRetries: 2 });

// No auth required — this endpoint is used by the public /voice page
export async function POST(request: NextRequest) {
  try {
    const { dimensions, businessContext } = (await request.json()) as {
      dimensions: VoiceDimensions;
      businessContext: string;
    };

    if (!dimensions) return NextResponse.json({ error: "dimensions required" }, { status: 400 });

    // No cross-request cache — edge/gap used to be cached keyed only on the
    // 7 dimension scores, which meant two people who landed on the same
    // combination got byte-identical "personal" analysis. Only 110 distinct
    // combinations exist across 135 completions, so collisions were common
    // and grew with volume. The cache saved ~8 Anthropic calls in its
    // entire lifetime — not worth re-keying, not worth keeping. Every
    // completion gets its own generation now, so rate limiting applies
    // unconditionally rather than only on a cache miss.
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many requests, please try again later." }, { status: 429 });
    }

    // Build a readable summary of dimensions
    const dimSummary = (Object.entries(dimensions) as [DimensionKey, number][])
      .map(([key, raw]) => {
        const norm = normalizeScore(key, raw);
        const labels = DIMENSION_LABELS[key];
        const side = norm >= 0 ? labels.high : labels.low;
        const strength = Math.abs(norm) > 0.5 ? "strongly" : "slightly";
        return `${key}: ${strength} ${side} (${norm.toFixed(1)})`;
      })
      .join("\n");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `You are a writing voice analyst. A user just completed a voice discovery exercise. Here are their dimension scores (each on a -1 to +1 spectrum):

${dimSummary}

Their business context: ${businessContext || "Not provided"}

Write two short paragraphs (2 sentences each), returned as JSON:
1. "edge": What makes this voice distinctive and effective. Be specific about the combination of traits, not generic.
2. "gap": What to watch out for — the blind spot of this voice profile. Frame it as a growth opportunity, not a flaw.

Return ONLY valid JSON: {"edge": "...", "gap": "..."}`,
        },
      ],
    });

    await logAiUsage({ feature: "voice_result", model: "claude-sonnet-4-6", usage: message.usage });

    let text = message.content[0].type === "text" ? message.content[0].text : "";
    // Strip markdown code fences if present
    text = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Try extracting JSON from the response
      const match = text.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { edge: "", gap: "" };
    }

    const edge = parsed.edge || "";
    const gap = parsed.gap || "";

    return NextResponse.json({ edge, gap });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("voice-result error:", msg);
    return NextResponse.json({ error: "Failed to generate voice result", detail: msg }, { status: 500 });
  }
}
