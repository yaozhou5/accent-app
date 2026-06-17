import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

const anthropic = new Anthropic({ maxRetries: 2 });

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { draft, key_takeaway, structure, platform } = await request.json();
    if (!draft?.trim()) return NextResponse.json({ error: "Draft is required" }, { status: 400 });
    if (draft.length > 50000) return NextResponse.json({ error: "Input too long" }, { status: 400 });

    const prompt = `You are a writing coach inside Accent. Your one job is to help the writer say THEIR OWN thing more clearly. You are NOT here to make writing more polished, confident, or punchy. The writer's voice — its hedges, plainness, and unfinished edges — is the asset. Protect it. Match their register exactly (no em dashes if they use none; plain if they're plain).

Platform: ${platform || "social media"}
${key_takeaway ? `Intended takeaway: "${key_takeaway}"` : ""}
${structure?.length ? `Intended structure:\n${structure.map((s: string, i: number) => `${i + 1}. ${s}`).join("\n")}` : ""}

Their draft:
"""
${draft}
"""

Return ONLY valid JSON:
{
  "overall": "2-3 honest sentences. No flattery. Say what the draft is doing and whether it's landing. If it's already good, say so.",
  "structure_feedback": "Comment on flow/arc only if there's a real problem. If the structure works, say it works. Do not invent issues.",
  "phrases_to_improve": [
    {
      "original": "exact phrase from their draft",
      "suggestion": "fixed version preserving their wording",
      "reason": "why (max 10 words)"
    }
  ],
  "micro_lesson": {
    "title": "One reusable writing principle, ideally about protecting their voice",
    "explanation": "2-3 sentences explaining the principle with an example from their draft"
  }
}

phrases_to_improve rules (0-4 items, fewer is better):
A phrase qualifies ONLY if it has a REAL problem:
- a grammar/usage error that obscures meaning
- a true ambiguity (a reader genuinely can't tell what's meant)
- a real redundancy (suggestion = the cut)
- a sentence doing two jobs (suggestion = split it, SAME words)
The "suggestion" must preserve the writer's wording and meaning. A cut or a split is better than a rewrite. If nothing qualifies, return an empty list.

NEVER generate a phrase suggestion that:
- removes or softens a hedge ("I'm not sure", "I think", "maybe")
- adds confidence the writer didn't have (doubt -> claim)
- turns a nuanced line into a punchy binary or hook ("X. Not Y.", "It's not A, it's B", "Here's why:")
- swaps the writer's specific words for snappier ones (e.g. "enthusiasm" -> "feelings")
- rewrites a whole sentence when a cut or split would do

CALIBRATION — these are FAILURES you must never produce:
original: "I'm not sure it's true anymore"
bad suggestion: "But I think that's wrong" — kills the hedge, fakes confidence
original: "One is about enthusiasm, the other is about whether the thing can survive its own success"
bad suggestion: "One is about feelings. The other is about survival" — flattens nuance into a punchy binary and strips specific words
For phrases like these: leave them alone. They are the voice working.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") return NextResponse.json({ error: "Unexpected response" }, { status: 500 });

    let text = content.text.trim();
    if (text.startsWith("```")) text = text.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return NextResponse.json({ error: "Failed to parse" }, { status: 500 });

    const parsed = JSON.parse(match[0]);
    // Filter out no-op suggestions where original === suggestion
    if (Array.isArray(parsed.phrases_to_improve)) {
      parsed.phrases_to_improve = parsed.phrases_to_improve.filter(
        (p: { original?: string; suggestion?: string }) =>
          p.original && p.suggestion && p.original.trim() !== p.suggestion.trim()
      );
    }
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Coach draft error:", error);
    return NextResponse.json({ error: "Failed to coach" }, { status: 500 });
  }
}
