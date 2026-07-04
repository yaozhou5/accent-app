import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { DIMENSION_LABELS, normalizeScore, type DimensionKey, type VoiceDimensions } from "@/lib/voice-dimensions";

const anthropic = new Anthropic({ maxRetries: 2 });

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { draft, dimensions } = (await request.json()) as {
      draft: string;
      dimensions: VoiceDimensions;
    };

    if (!draft?.trim() || !dimensions)
      return NextResponse.json({ error: "draft and dimensions required" }, { status: 400 });

    // Build dimension context for Claude
    const dimContext = (Object.entries(dimensions) as [DimensionKey, number][])
      .map(([key, raw]) => {
        const norm = normalizeScore(key, raw);
        if (Math.abs(norm) < 0.25) return null;
        const labels = DIMENSION_LABELS[key];
        const side = norm >= 0 ? labels.high : labels.low;
        return `${key.toUpperCase()}: ${side} (${norm.toFixed(1)})`;
      })
      .filter(Boolean)
      .join(", ");

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `You are a writing voice analyst. A draft was written using a specific voice profile. Identify 3-5 moments in the draft where the voice profile shaped the writing.

Voice profile: ${dimContext}

Draft:
"""
${draft}
"""

For each moment, return:
- "phrase": the exact phrase or sentence from the draft (verbatim, must be findable in the text)
- "dimension": which voice dimension drove this choice (use the dimension name in caps: DIRECTNESS, PRECISION, TEMPERATURE, AUTHORITY, RHYTHM, FRAMING, ENERGY)
- "explanation": one sentence explaining why this phrasing fits their voice (e.g. "Your contextual style builds trust before stating the point")
- "alternative": one sentence showing how a writer on the opposite end would write it (e.g. "A more direct writer would open with: 'We need to cut this feature.'")

Return ONLY valid JSON array: [{"phrase":"...","dimension":"...","explanation":"...","alternative":"..."},...]`,
        },
      ],
    });

    let text = message.content[0].type === "text" ? message.content[0].text : "[]";
    text = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let notes;
    try {
      notes = JSON.parse(text);
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      notes = match ? JSON.parse(match[0]) : [];
    }

    return NextResponse.json({ notes: Array.isArray(notes) ? notes : [] });
  } catch (error) {
    console.error("voice-notes error:", error);
    return NextResponse.json({ notes: [] });
  }
}
