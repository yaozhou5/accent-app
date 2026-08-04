// app/api/voice-coach/route.ts
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { buildVoiceInstructions } from "@/lib/voice-instructions";
import type { VoiceDimensions } from "@/lib/voice-dimensions";
import { saveVoicePatterns } from "@/lib/voice-patterns";

const anthropic = new Anthropic({ maxRetries: 2 });

const ANNOTATION_DIMENSIONS = ["Compression", "Rhythm", "Perspective", "Directness", "Vocabulary", "Tone", "Structure"];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { original_draft, current_draft, voice_profile, draft_id } = (await request.json()) as {
      original_draft: string;
      current_draft: string;
      voice_profile?: { dimensions: VoiceDimensions; top_traits?: string[]; edge?: string; gap?: string };
      draft_id?: string;
    };

    if (!original_draft?.trim() || !current_draft?.trim()) {
      return NextResponse.json({ error: "original_draft and current_draft are required" }, { status: 400 });
    }

    const voiceInstructions = voice_profile?.dimensions
      ? buildVoiceInstructions(voice_profile.dimensions, voice_profile)
      : "No voice profile on file — infer their voice from how they edited, and favor their edited version's instincts over generic polish.";

    const prompt = `You are a writing teacher reviewing how someone edited an AI-generated draft into their own words. You're not a copy editor — you're looking for what their editing choices reveal about their voice, and helping them see it.

THE USER'S VOICE PROFILE:
${voiceInstructions}

CRITICAL: every alternative or suggestion you propose must move the writing TOWARD this voice profile — toward what makes it more distinctly theirs. Never suggest something "cooler," "more polished," "more professional," or "more detached" unless that is literally what their voice profile calls for. If their profile leans warm/direct/staccato, a generic-safe rewrite is a wrong answer even if it reads more smoothly.

ORIGINAL DRAFT (AI-generated, before edits):
"""
${original_draft}
"""

CURRENT DRAFT (after the user's edits):
"""
${current_draft}
"""

Do the following:

1. PATTERN SUMMARY: Read across all the differences between the two drafts and name 2-3 real patterns in how they edit — not a list of individual changes, but what a writing teacher would open with after reading the whole piece. E.g. "You consistently compress formal language into something plainer" or "You keep adding dashes where the original used full sentences." Write it as 2-3 flowing sentences, not bullets.

2. ANNOTATIONS: Pick the 4-8 MOST MEANINGFUL edits between the two drafts (not an exhaustive diff — the ones that actually reveal something about their voice). ONLY analyze passages where the text actually DIFFERS between the original draft and the edited version. If a passage is identical in both versions, skip it entirely — do NOT include it as an annotation. Unchanged text is the AI's writing, not the user's. Do not analyze it, praise it, or comment on it. For each:
   - original_text: the exact original passage (verbatim, must be findable in the original draft)
   - edited_text: their exact replacement (verbatim, must be findable in the current draft)
   - type: "insight" if it's a clear statement about what the edit does and why it matters, or "question" if there's a genuine tradeoff worth asking about
   - dimension: one of ${ANNOTATION_DIMENSIONS.join(", ")} — whichever best describes what kind of change this is (this is independent of the voice profile's own dimension names)
   - direction: "toward" if the edit moves the writing toward their voice profile, "away" if it moves away from it
   - text: the annotation itself, written in second person ("You changed X to Y because..."), like a teacher talking to the writer, never like a robot. If type is "question", present a genuine tradeoff — e.g. "You gained punch but lost the context a new reader needs — was that intentional?" — not a rhetorical or leading question.

3. SUGGESTIONS: Find 2-4 phrases in the CURRENT draft that the user did NOT touch but that read as generic or off their voice profile. For each:
   - phrase: the exact current text (verbatim, must be findable in the current draft)
   - alternative: what they'd probably actually say — this must sound MORE like their voice profile, not blander or more formal
   - reason: framed as a "say it out loud" test, e.g. "Would you say this to a founder over coffee? You'd probably say '[alternative]' instead."

4. EDGE: One sentence naming their strongest voice trait, based on their editing patterns specifically (not generic flattery). Just one thing.

5. STRETCH: One sentence naming one specific thing to work on, with a concrete suggestion for next time. Just one thing.

6. RHYTHM_INSIGHT: One sentence about how the sentence rhythm changed between the two drafts (e.g. shorter/choppier, longer/more flowing, more variation). Base this on your own read of the two texts — you do not need exact word counts.

Return ONLY valid JSON, no preamble:
{
  "pattern_summary": "...",
  "annotations": [
    { "original_text": "...", "edited_text": "...", "type": "insight", "dimension": "...", "direction": "toward", "text": "..." }
  ],
  "suggestions": [
    { "phrase": "...", "alternative": "...", "reason": "..." }
  ],
  "edge": "...",
  "stretch": "...",
  "rhythm_insight": "..."
}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    let text = message.content[0].type === "text" ? message.content[0].text : "";
    text = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : null;
    }

    if (!parsed) {
      return NextResponse.json({ error: "Failed to parse response" }, { status: 500 });
    }

    const result = {
      pattern_summary: parsed.pattern_summary || "",
      annotations: Array.isArray(parsed.annotations) ? parsed.annotations : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      edge: parsed.edge || "",
      stretch: parsed.stretch || "",
      rhythm_insight: parsed.rhythm_insight || "",
    };

    // Save + aggregate before responding (adds one insert/upsert on top of an
    // already multi-second LLM call — negligible, and safer than a detached
    // fire-and-forget promise that a serverless runtime could cut off).
    // Failure here must never surface as a Voice Coach error.
    if (draft_id) {
      try {
        await saveVoicePatterns(user.id, draft_id, original_draft, current_draft, {
          edge: result.edge,
          stretch: result.stretch,
        });
      } catch (e) {
        console.error("Failed to save voice patterns:", e);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("voice-coach error:", error);
    return NextResponse.json({ error: "Failed to generate voice coaching" }, { status: 500 });
  }
}
