import { NextRequest } from "next/server";
import Anthropic, { APIConnectionTimeoutError, RateLimitError, APIError } from "@anthropic-ai/sdk";
import crypto from "crypto";
import { createClient } from "@/lib/supabase/server";
import { buildVoiceInstructions } from "@/lib/voice-instructions";
import { buildLearnedInstructions, type LearnedVoiceProfile } from "@/lib/voice-patterns";
import { logAiUsage, logAiGenerationFailure } from "@/lib/ai-usage-log";

const anthropic = new Anthropic({ maxRetries: 2, timeout: 30_000 });

const MAX_WORDS = 3200;
const VOICE_NOTE_CAP = 5;
const FEATURE = "review";
const MODEL = "claude-sonnet-4-6";

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

// Normalise typography so curly-vs-straight quotes, em-dash variants, and
// whitespace differences don't cause false drops in the verbatim guard.
function normalizeForComparison(s: string): string {
  return s
    .replace(/[\u2018\u2019\u201A\u2039\u203A]/g, "'") // smart single quotes → straight
    .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"') // smart double quotes → straight
    .replace(/[\u2012\u2013\u2014\u2015]/g, "-") // en/em dashes → hyphen
    .replace(/\u2026/g, "...") // ellipsis char → three dots
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();
}

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  let userId: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      await logAiGenerationFailure({
        feature: FEATURE,
        model: MODEL,
        reason: "auth_expired",
        durationMs: Date.now() - startedAt,
        detail: "No authenticated user — session likely expired",
        userId: null,
      });
      return json({ error: "Unauthorized", reason: "auth_expired" }, 401);
    }
    userId = user.id;

    const { text } = (await request.json()) as { text?: string };

    if (!text?.trim()) {
      await logAiGenerationFailure({
        feature: FEATURE,
        model: MODEL,
        reason: "bad_input",
        durationMs: Date.now() - startedAt,
        detail: "Missing or empty text",
        userId,
      });
      return json({ error: "Text is required", reason: "bad_input" }, 400);
    }

    const words = wordCount(text);
    if (words > MAX_WORDS) {
      await logAiGenerationFailure({
        feature: FEATURE,
        model: MODEL,
        reason: "too_long",
        durationMs: Date.now() - startedAt,
        detail: `${words} words (max ${MAX_WORDS})`,
        userId,
      });
      return json(
        {
          error: `Text is ${words.toLocaleString()} words — paste a section instead (max ~3,000 words).`,
          reason: "too_long",
        },
        400
      );
    }

    // --- Cache lookup ---
    const textKey = crypto.createHash("sha256").update(text).digest("hex");
    const { data: cached } = await supabase
      .from("review_cache")
      .select("result")
      .eq("user_id", userId)
      .eq("text_key", textKey)
      .maybeSingle();

    if (cached) {
      return json(cached.result as Record<string, unknown>, 200);
    }

    // --- Load voice profile ---
    const { data: profileRow } = await supabase.from("profiles").select("voice_profile").eq("id", userId).maybeSingle();

    const voiceProfile = profileRow?.voice_profile as {
      dimensions: import("@/lib/voice-dimensions").VoiceDimensions;
      top_traits?: string[];
      edge?: string;
      gap?: string;
    } | null;

    const voiceInstructions = voiceProfile?.dimensions
      ? buildVoiceInstructions(voiceProfile.dimensions, voiceProfile)
      : "No voice profile on file — infer their voice from the text itself, and judge consistency against what the text is trying to do rather than an external standard.";

    const { data: learnedProfileRow } = await supabase
      .from("voice_profile_learned")
      .select("preferred_words, banned_words, substitution_pairs, structural_habits, anti_patterns, best_examples")
      .eq("user_id", userId)
      .maybeSingle();
    const learnedProfile = learnedProfileRow as LearnedVoiceProfile | null;
    const learnedInstructions = learnedProfile ? buildLearnedInstructions(learnedProfile) : "";

    // --- Prompt ---
    const prompt = `You are reviewing a piece of writing someone already wrote. They did not write it here — they wrote it elsewhere and pasted it in to get your read. You are not coaching a draft toward publication. You are telling the writer how it reads.

REGISTER — read this before writing any note:
Before writing any note, identify what this text is for. Notes to yourself, bug reports, specs, messages, and drafts of published writing all have different targets. Terse, shorthand, or impersonal writing is correct for most of them.

Never write a note that amounts to "this should sound more considered, more personal, or more like an essay." That is not drift. Drift is when a piece leaves the register IT established — an essay that turns into marketing copy, a personal note that turns into a press release.

If the text is a fragment, a note, or working material rather than a finished piece, say so plainly in the overall read and give fewer notes rather than inventing them.

THE WRITER'S VOICE PROFILE:
${voiceInstructions}
${learnedInstructions}

THE TEXT TO REVIEW:
"""
${text}
"""

Return ONLY valid JSON with this exact structure:

{
  "overall_read": {
    "voice_holds": "One sentence: where the voice is strongest and most distinctive in this text. If a specific line stands out, name it here.",
    "voice_drifts": "One sentence: where the voice flattens, goes generic, or sounds like someone else."
  },
  "voice_notes": [
    {
      "passage": "One sentence or short clause, copied CHARACTER-FOR-CHARACTER from the text. Do not clean up typos, normalise quotes, or change punctuation.",
      "note": "What this passage is doing, what's working or not working about it, and why — written as a teacher talking to the writer. No rewrites, no alternatives. Just the observation.",
      "summary": "One clause, under 60 characters, saying what this note is about. Not a quote of the passage. Examples: 'The scare quotes undercut six years of work.' or 'Three benefits in one sentence, LinkedIn cadence.'",
      "dimension": "One of: Directness, Precision, Temperature, Authority, Rhythm, Framing, Energy — whichever best describes what this note is about. Omit if none fits."
    }
  ],
  "grammar": {
    "fixes": [
      {
        "original": "Exact text from the input containing the error.",
        "replacement": "Corrected version — same words, just the grammar/punctuation/usage fixed."
      }
    ]
  }
}

OVERALL READ RULES:
- Two fields, each one sentence. No more.
- voice_holds and voice_drifts are judgments about voice consistency, not quality assessments. "The opening paragraph sounds like you" vs "The middle section sounds like a press release."
- If a standout line deserves praise, put it in voice_holds. Do not waste a voice note on it.

VOICE NOTES RULES:
- Return AT MOST 5 notes. If you find more than 5, return the 5 that matter most. This is a hard limit.
- PASSAGE QUOTING IS CRITICAL. Each passage must be ONE sentence or a short clause — never multi-sentence. Copy it character-for-character from the input text, preserving the original's exact punctuation, em dashes, curly quotes, emoji, and any typos. Do NOT fix, rephrase, or normalise the passage in any way. If your passage string does not appear byte-for-byte in the input, it will be silently dropped.
- Notes are observations, not rewrites. "This sentence does X" or "This passage undermines the directness you established above." Never "Try changing this to..."
- Notes should be about VOICE — how the writing sounds, whether it's consistent with who the writer is. Not about whether the argument is good, the structure is logical, or the facts are correct.
- Voice notes are for things worth LOOKING AT: drift, borrowed phrasing, register shifts, tonal inconsistency, phrases that sound like someone else. They are NOT for praise or compliments — that's what voice_holds is for. Every note should give the writer something to consider, not something to feel good about.
- Voice notes must NEVER mention punctuation, missing commas, typos, or dropped words. Those are grammar issues and are handled separately. If a passage has both a mechanical problem and a voice observation, write only the voice observation.
- If the text is short and consistent, return fewer than 5. Don't manufacture notes.

GRAMMAR RULES:
- Grammar fixes are mechanical corrections only: spelling, punctuation, subject-verb agreement, tense consistency, missing words.
- Do NOT flag fragments, comma splices, or unconventional punctuation as grammar errors — these are often deliberate stylistic choices.
- Do NOT flag word choice, clarity, or style as grammar. Those belong in voice notes if they matter.
- If there are no grammar errors, return an empty fixes array.
- Each fix must quote the EXACT original text (findable in the input) and provide the corrected version.`;

    const message = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 3000,
      temperature: 0.2,
      messages: [{ role: "user", content: prompt }],
    });

    await logAiUsage({ feature: FEATURE, model: MODEL, usage: message.usage, userId });

    const raw = message.content[0]?.type === "text" ? message.content[0].text : "";
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // Model sometimes appends commentary after the JSON object.
      // Find the outermost balanced braces by tracking depth rather than
      // relying on a greedy regex that grabs trailing text.
      const start = cleaned.indexOf("{");
      if (start !== -1) {
        let depth = 0;
        let end = -1;
        for (let i = start; i < cleaned.length; i++) {
          if (cleaned[i] === "{") depth++;
          else if (cleaned[i] === "}") {
            depth--;
            if (depth === 0) {
              end = i;
              break;
            }
          }
        }
        if (end !== -1) {
          try {
            parsed = JSON.parse(cleaned.slice(start, end + 1));
          } catch {
            // still unparseable — fall through to error
          }
        }
      }
    }

    if (!parsed) {
      await logAiGenerationFailure({
        feature: FEATURE,
        model: MODEL,
        reason: "parse_error",
        durationMs: Date.now() - startedAt,
        detail: raw.slice(0, 500),
        userId,
      });
      return json({ error: "Failed to parse review", reason: "parse_error" }, 502);
    }

    // --- Normalize and enforce caps ---

    // Two-pass verbatim guard: first try exact match against the input, then
    // fall back to normalised comparison (smart quotes → straight, collapse
    // whitespace, etc.). If normalised matches, the passage is close enough
    // that the UI can find it with the same normalisation at highlight time.
    // Genuine paraphrases (multi-sentence rewrites, word changes) still drop.
    const rawNotes = (Array.isArray(parsed.voice_notes) ? parsed.voice_notes : []).slice(0, VOICE_NOTE_CAP);
    const normalizedInput = normalizeForComparison(text);

    const anchoredNotes: typeof rawNotes = [];
    const droppedPassages: string[] = [];

    for (const n of rawNotes) {
      if (!n.passage) {
        droppedPassages.push("(empty passage)");
        continue;
      }
      if (text.includes(n.passage)) {
        anchoredNotes.push(n);
      } else if (normalizedInput.includes(normalizeForComparison(n.passage))) {
        anchoredNotes.push(n);
      } else {
        droppedPassages.push(n.passage);
      }
    }

    if (droppedPassages.length > 0) {
      console.warn(
        `review: dropped ${droppedPassages.length}/${rawNotes.length} voice notes — passages not found in input:\n` +
          droppedPassages.map((p) => `  → "${p.slice(0, 120)}${p.length > 120 ? "…" : ""}"`).join("\n")
      );
    }

    const voiceNotes = anchoredNotes.map(
      (n: { passage?: string; note?: string; summary?: string; dimension?: string }, i: number) => ({
        index: i,
        passage: n.passage || "",
        note: n.note || "",
        summary: n.summary || "",
        ...(n.dimension ? { dimension: n.dimension } : {}),
      })
    );

    const fixes = Array.isArray(parsed.grammar?.fixes)
      ? parsed.grammar.fixes.filter(
          (f: { original?: string; replacement?: string }) =>
            f.original && f.replacement && f.original.trim() !== f.replacement.trim()
        )
      : [];

    const result = {
      overall_read: {
        voice_holds: parsed.overall_read?.voice_holds || "",
        voice_drifts: parsed.overall_read?.voice_drifts || "",
      },
      voice_notes: voiceNotes,
      grammar: {
        count: fixes.length,
        fixes,
      },
    };

    // --- Cache (never throw on failure) ---
    try {
      await supabase
        .from("review_cache")
        .upsert(
          { user_id: userId, text_key: textKey, result },
          { onConflict: "user_id,text_key", ignoreDuplicates: true }
        );
    } catch (e) {
      console.error("Failed to cache review result:", e);
    }

    return json(result, 200);
  } catch (error) {
    console.error("review error:", error);
    let reason = "error";
    if (error instanceof APIConnectionTimeoutError) reason = "timeout";
    else if (error instanceof RateLimitError) reason = "rate_limited";
    else if (error instanceof APIError && typeof error.status === "number" && error.status >= 500)
      reason = "upstream_error";

    await logAiGenerationFailure({
      feature: FEATURE,
      model: MODEL,
      reason,
      durationMs: Date.now() - startedAt,
      detail: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500),
      userId,
    });
    return json({ error: "Failed to generate review", reason }, 500);
  }
}
