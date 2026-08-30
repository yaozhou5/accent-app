// app/api/voice-coach/route.ts
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { buildVoiceInstructions } from "@/lib/voice-instructions";
import type { VoiceDimensions } from "@/lib/voice-dimensions";
import { saveVoicePatterns } from "@/lib/voice-patterns";
import { logAiUsage } from "@/lib/ai-usage-log";

const anthropic = new Anthropic({ maxRetries: 2 });

const ANNOTATION_DIMENSIONS = ["Compression", "Rhythm", "Perspective", "Directness", "Vocabulary", "Tone", "Structure"];

// Low but not zero — this is judgment (which edits matter, which direction
// they move), not generative writing, and 0.0 risks stilted, repetitive
// prose on the annotation/suggestion text. The SDK defaults to 1.0 if
// unset, which is the opposite end of the range from what this task needs.
const COACH_TEMPERATURE = 0.2;

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { original_draft, current_draft, voice_profile, draft_id, applied_suggestions } = (await request.json()) as {
      original_draft: string;
      current_draft: string;
      voice_profile?: { dimensions: VoiceDimensions; top_traits?: string[]; edge?: string; gap?: string };
      draft_id?: string;
      applied_suggestions?: { phrase: string; alternative: string }[];
    };

    if (!original_draft?.trim() || !current_draft?.trim()) {
      return NextResponse.json({ error: "original_draft and current_draft are required" }, { status: 400 });
    }

    // Cache lookup — same (draft_id, original_draft, current_draft) always
    // gets the same analysis instead of a fresh, temperature-driven sample.
    // Keyed on this draft's own text; see the migration for why this
    // doesn't repeat the deleted edge/gap cache's collision problem.
    const textKey = crypto
      .createHash("sha256")
      .update(original_draft + "\x00" + current_draft)
      .digest("hex");
    if (draft_id) {
      const { data: cached } = await supabase
        .from("voice_coach_cache")
        .select("result")
        .eq("draft_id", draft_id)
        .eq("text_key", textKey)
        .maybeSingle();
      if (cached) {
        return NextResponse.json(cached.result);
      }
    }

    const voiceInstructions = voice_profile?.dimensions
      ? buildVoiceInstructions(voice_profile.dimensions, voice_profile)
      : "No voice profile on file — infer their voice from how they edited, and favor their edited version's instincts over generic polish.";

    // Without this, a re-run has no way to know a suggestion was already
    // considered and accepted — it can re-propose the same swap, or worse,
    // propose reversing it. The client accumulates this across a session
    // (lib not persisted across page loads) and sends it on every request.
    const appliedSuggestionsBlock =
      applied_suggestions && applied_suggestions.length > 0
        ? `\nALREADY-APPLIED SUGGESTIONS (the user already accepted these earlier in this session — do not suggest any of these again, and do not propose reversing them):\n${applied_suggestions.map((a) => `- "${a.phrase}" → "${a.alternative}"`).join("\n")}\n`
        : "";

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
${appliedSuggestionsBlock}
Do the following:

1. PATTERN SUMMARY: Read across all the differences between the two drafts and name 2-3 real patterns in how they edit — not a list of individual changes, but what a writing teacher would open with after reading the whole piece. E.g. "You consistently compress formal language into something plainer" or "You keep adding dashes where the original used full sentences." Write it as 2-3 flowing sentences, not bullets.

2. ANNOTATIONS: Pick the 4-8 MOST MEANINGFUL edits between the two drafts (not an exhaustive diff — the ones that actually reveal something about their voice). ONLY analyze passages where the text actually DIFFERS between the original draft and the edited version. If a passage is identical in both versions, skip it entirely — do NOT include it as an annotation. Unchanged text is the AI's writing, not the user's. Do not analyze it, praise it, or comment on it. Return AT MOST ONE annotation per distinct span of edited_text — never describe the same change twice from two different angles (e.g. once as a compression question, once as a structure insight). If a single change is meaningful along more than one dimension, pick the strongest dimension and fold the rest into the annotation's own text rather than emitting a second annotation for the same span. For each:
   - original_text: the exact original passage (verbatim, must be findable in the original draft)
   - edited_text: their exact replacement (verbatim, must be findable in the current draft)
   - type: "insight" if it's a clear statement about what the edit does and why it matters, or "question" if there's a genuine tradeoff worth asking about
   - dimension: one of ${ANNOTATION_DIMENSIONS.join(", ")} — whichever best describes what kind of change this is (this is independent of the voice profile's own dimension names)
   - direction: "toward" if the edit moves the writing toward their voice profile, "away" if it moves away from it
   - text: the annotation itself, written in second person ("You changed X to Y because..."), like a teacher talking to the writer, never like a robot. If type is "question", present a genuine tradeoff — e.g. "You gained punch but lost the context a new reader needs — was that intentional?" — not a rhetorical or leading question.

3. SUGGESTIONS: Find 2-4 phrases in the CURRENT draft that the user did NOT touch but that read as generic or off their voice profile. This is about how a line SOUNDS, not about replacing it — favor small, surgical changes: a word, a short phrase, a punctuation mark. Do NOT propose rewriting a whole sentence or clause; if a passage needs more than that to fix, it's not a good candidate — pick a narrower phrase within it instead, or skip it. For each:
   - phrase: the exact current text (verbatim, must be findable in the current draft) — as short as it can be while still being the specific thing that reads wrong. It must fall entirely within a single paragraph — never let it span a paragraph break. If the generic-sounding text crosses paragraphs, pick the strongest single-paragraph excerpt from it instead of the whole span.
   - alternative: what they'd probably actually say instead of THIS PHRASE specifically — this must sound MORE like their voice profile, not blander or more formal, and should stay close in length to phrase rather than expanding it into a new sentence
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
      temperature: COACH_TEMPERATURE,
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

    await logAiUsage({ feature: "voice_coach", model: "claude-sonnet-4-6", usage: message.usage, userId: user.id });

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
    // Failure here must never surface as a Voice Coach error. Only runs on
    // a genuine cache miss (see the early-return above) — a cache hit means
    // this exact text pair already got a voice_patterns row the first time,
    // so a repeat "How did I do?" click on unchanged text can't inflate the
    // learned-profile counts a second time for the same diff.
    if (draft_id) {
      try {
        await saveVoicePatterns(user.id, draft_id, original_draft, current_draft, {
          edge: result.edge,
          stretch: result.stretch,
        });
      } catch (e) {
        console.error("Failed to save voice patterns:", e);
      }
      try {
        await supabase
          .from("voice_coach_cache")
          .upsert(
            { user_id: user.id, draft_id, text_key: textKey, result },
            { onConflict: "draft_id,text_key", ignoreDuplicates: true }
          );
      } catch (e) {
        console.error("Failed to cache voice coach result:", e);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("voice-coach error:", error);
    return NextResponse.json({ error: "Failed to generate voice coaching" }, { status: 500 });
  }
}
