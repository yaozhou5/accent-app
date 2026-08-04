// app/api/generate-draft/route.ts
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { type VoiceDimensions } from "@/lib/voice-dimensions";
import { buildVoiceInstructions } from "@/lib/voice-instructions";
import { buildLearnedInstructions, type LearnedVoiceProfile } from "@/lib/voice-patterns";

const anthropic = new Anthropic({ maxRetries: 2 });

const PLATFORM_GUIDES: Record<string, string> = {
  linkedin:
    "Format: LinkedIn post. 150-300 words. Hook in the first line. Use line breaks for readability. No hashtags.",
  x: "Format: Single tweet or short thread (2-3 tweets). Punchy. Under 280 chars per tweet. No hashtags.",
  substack: "Format: Newsletter excerpt. 200-400 words. Conversational but substantial. Include a clear insight.",
  threads: "Format: Threads post. Conversational, 100-200 words. Casual but insightful.",
  小红书: "Format: 小红书 post. 100-200 words. Mix of personal story and practical insight. Warm tone.",
};

// quick_take has real headroom above the instructed length (not just enough
// for a compliant 2-4 sentence response) — when a rich source note tempts
// the model into writing longer anyway, we'd rather it finish the thought
// than get hard-cut mid-sentence by the token ceiling.
const FORMAT_MAX_TOKENS: Record<string, number> = {
  quick_take: 400,
  full_post: 600,
};
const DEFAULT_MAX_TOKENS = 1000;

const FORMAT_INSTRUCTIONS: Record<string, string> = {
  quick_take:
    "This is a quick take — 2-4 sentences maximum, one sharp point, no preamble. This is a hard limit: even if the note covers a lot of ground, pick the single sharpest point and cut everything else. Do not attempt to cover the whole note.",
  full_post: "This is a full post — 150-250 words, one developed idea with room to explain the reasoning.",
};

// First `count` sentences of a text, for short verbatim excerpts from past
// drafts. Capped at 400 chars as a safety net against unpunctuated runs.
function firstSentences(text: string, count: number): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const matches = cleaned.match(/[^.!?]+[.!?]+(?:\s+|$)|[^.!?]+$/g) || [cleaned];
  return matches.slice(0, count).join(" ").trim().slice(0, 400);
}

// Cuts a max_tokens-truncated draft back to its last complete sentence so a
// mid-word cutoff never reaches the editor. Falls back to the untrimmed text
// if no sentence boundary exists at all (better than returning nothing).
function trimToLastCompleteSentence(text: string): string {
  const trimmed = text.trim();
  const lastPunct = Math.max(trimmed.lastIndexOf("."), trimmed.lastIndexOf("!"), trimmed.lastIndexOf("?"));
  return lastPunct === -1 ? trimmed : trimmed.slice(0, lastPunct + 1);
}

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

    const { entryContent, voiceProfile, businessContext, platform, estimateWords, format, focus } =
      await request.json();

    if (!entryContent?.trim())
      return new Response(JSON.stringify({ error: "entry content required" }), { status: 400 });

    const voiceInstructions = voiceProfile?.dimensions
      ? buildVoiceInstructions(voiceProfile.dimensions, voiceProfile)
      : "Write in a clear, professional tone.";

    // Few-shot: ground the model in the user's own finished writing, not
    // just abstract voice-dimension rules.
    const { data: recentDrafts } = await supabase
      .from("drafts")
      .select("final_draft")
      .eq("user_id", user.id)
      .not("final_draft", "is", null)
      .order("updated_at", { ascending: false })
      .limit(3);

    const excerpts = (recentDrafts || [])
      .map((d) => firstSentences(d.final_draft || "", 3))
      .filter((s) => s.length > 0);

    // Learned profile: accumulated from Voice Coach sessions (see
    // lib/voice-patterns.ts). best_examples are hand-picked for
    // voice-distinctiveness, so they supplement rather than replace the
    // recent-drafts few-shot above.
    const { data: learnedProfileRow } = await supabase
      .from("voice_profile_learned")
      .select("preferred_words, banned_words, substitution_pairs, structural_habits, anti_patterns, best_examples")
      .eq("user_id", user.id)
      .maybeSingle();
    const learnedProfile = learnedProfileRow as LearnedVoiceProfile | null;
    const learnedInstructions = learnedProfile ? buildLearnedInstructions(learnedProfile) : "";

    const allExcerpts = [...excerpts, ...(learnedProfile?.best_examples || []).filter((e) => !excerpts.includes(e))];
    const examplesBlock =
      allExcerpts.length > 0
        ? `\nEXAMPLES OF HOW THIS PERSON ACTUALLY WRITES:\n${allExcerpts.join("\n")}\nMatch the rhythm, word choice, and energy of these examples.\n`
        : "";

    const lengthGuide = estimateWords
      ? `Target length: ~${estimateWords} words.`
      : PLATFORM_GUIDES[(platform || "linkedin").toLowerCase()] || PLATFORM_GUIDES.linkedin;

    const formatInstruction = format && FORMAT_INSTRUCTIONS[format] ? `\n${FORMAT_INSTRUCTIONS[format]}` : "";
    const maxTokens = format && FORMAT_MAX_TOKENS[format] ? FORMAT_MAX_TOKENS[format] : DEFAULT_MAX_TOKENS;

    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const systemPrompt = `You are expanding the user's raw thinking into a continuous draft. Keep their words and phrasing — add transitions and flow, don't rewrite their ideas. The sections below are their thinking in their own words. Connect them into one smooth piece.

VOICE STYLE (follow these closely):
${voiceInstructions}
${learnedInstructions}
${examplesBlock}
${lengthGuide}${formatInstruction}

Today's date: ${today}

RULES:
- Write ONE complete draft, ready to copy-paste and publish.
- Preserve the user's exact phrasing where possible. If they wrote a memorable line, keep it word for word. Your job is to connect their thinking, not improve their vocabulary.
- Use the sections as raw material — extract the story, insight, or point. Don't just polish the notes.
- Sound like a real person, not a writing tool. No "Here's the thing...", "Let me be honest...", or other AI cliches.
- Do not add a title, subject line, or meta-commentary. Just the draft.
- Do not explain what you did. Just write the draft.
- Write as if the user is talking to one person over coffee, then clean up only the grammar. Keep rough edges. The draft should read like a smart person talking, not a writer writing.
- NEVER break character. Never say "I can't access" or "I'm not able to" or explain your limitations. If the note content is insufficient to write a draft, write a short draft from whatever IS there — even if it's just one sentence. Never produce meta-commentary about the input.

STRUCTURAL RULES:
- Paragraphs must NOT all be the same length.
- Do NOT resolve every idea neatly — leave one thread open.
- Do NOT end with a rhetorical question.
- Do NOT use more than one metaphor in the entire draft.
- Maximum one "profound" line per draft — the rest should be plain.
- If it sounds like a therapy insight or graduation speech, rewrite it as what a tired founder would actually say.`;

    const contextLine = businessContext?.trim() ? `\nContext about the author: ${businessContext}\n` : "";
    const focusLine = focus?.trim() ? `Main point to emphasize: ${focus.trim()}\n\n` : "";

    const userPrompt = `${focusLine}${contextLine}Raw note:
${entryContent}

Write the post.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: userPrompt }],
      system: systemPrompt,
    });

    let draftText = message.content[0]?.type === "text" ? message.content[0].text : "";

    // Safety net: both callers already buffer the whole response via
    // res.text() before using it, so there's no streaming UX to preserve —
    // buffering here lets us catch a max_tokens cutoff and trim back to the
    // last complete sentence instead of shipping a broken mid-word draft.
    if (message.stop_reason === "max_tokens") {
      console.warn(`generate-draft hit max_tokens (format=${format || "default"}), trimming to last complete sentence`);
      draftText = trimToLastCompleteSentence(draftText);
    }

    return new Response(draftText, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("generate-draft error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate draft" }), { status: 500 });
  }
}
