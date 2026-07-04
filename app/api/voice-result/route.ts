// app/api/voice-result/route.ts
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { type VoiceDimensions, DIMENSION_LABELS, normalizeScore, type DimensionKey } from "@/lib/voice-dimensions";

const anthropic = new Anthropic({ maxRetries: 2 });

// No auth required — this endpoint is used by the public /voice page
export async function POST(request: NextRequest) {
  try {
    const { dimensions, businessContext } = (await request.json()) as {
      dimensions: VoiceDimensions;
      businessContext: string;
    };

    if (!dimensions) return NextResponse.json({ error: "dimensions required" }, { status: 400 });

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

    return NextResponse.json({
      edge: parsed.edge || "",
      gap: parsed.gap || "",
    });
  } catch (error) {
    console.error("voice-result error:", error);
    return NextResponse.json({ error: "Failed to generate voice result" }, { status: 500 });
  }
}
