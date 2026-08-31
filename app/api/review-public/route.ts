import { NextRequest } from "next/server";
import Anthropic, { APIConnectionTimeoutError, RateLimitError, APIError } from "@anthropic-ai/sdk";
import { logAiUsage, logAiGenerationFailure } from "@/lib/ai-usage-log";

const anthropic = new Anthropic({ maxRetries: 2, timeout: 30_000 });

// --- Limits ---
// All three are in-memory and per-instance. On serverless (Vercel, Lambda)
// each cold start resets the counters and each concurrent instance tracks
// its own, so the effective limit is looser than the number suggests.
// Acceptable for now — revisit with Upstash Redis if abuse appears.

/** Max words for anonymous reviews. */
const MAX_WORDS = 300;

/** Max anonymous reviews per IP per 60-minute window. */
const MAX_PER_IP = 3;

/** Max total anonymous reviews across all IPs per UTC day. */
const MAX_PER_DAY = 200;

const FEATURE = "review_public";
const MODEL = "claude-sonnet-4-6";
const VOICE_NOTE_CAP = 5;

// --- Rate limiting (separate from lib/rate-limit.ts pool) ---

type IpEntry = { count: number; resetAt: number };
const ipStore = new Map<string, IpEntry>();

let dailyCount = 0;
let dailyResetDate = utcDateString();

function utcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

function checkIpLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipStore.get(ip);
  if (!entry || entry.resetAt < now) {
    ipStore.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true;
  }
  if (entry.count >= MAX_PER_IP) return false;
  entry.count++;
  return true;
}

function checkDailyLimit(): boolean {
  const today = utcDateString();
  if (today !== dailyResetDate) {
    dailyCount = 0;
    dailyResetDate = today;
  }
  if (dailyCount >= MAX_PER_DAY) return false;
  dailyCount++;
  return true;
}

// Periodic cleanup of expired IP entries
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, entry] of ipStore.entries()) {
        if (entry.resetAt < now) ipStore.delete(key);
      }
    },
    5 * 60 * 1000
  );
}

// --- Helpers ---

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function normalizeForComparison(s: string): string {
  return s
    .replace(/[\u2018\u2019\u201A\u2039\u203A]/g, "'")
    .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"')
    .replace(/[\u2012\u2013\u2014\u2015]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\s+/g, " ")
    .trim();
}

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// --- Route ---

export async function POST(request: NextRequest) {
  const startedAt = Date.now();

  try {
    // --- Rate limiting ---
    const ip = getClientIp(request);

    if (!checkDailyLimit()) {
      return json(
        { error: "We've hit the daily limit for free reviews. Sign in to review anytime.", reason: "daily_limit" },
        429
      );
    }

    if (!checkIpLimit(ip)) {
      return json(
        { error: "You've used your 3 free reviews this hour. Sign in for unlimited reviews.", reason: "rate_limited" },
        429
      );
    }

    // --- Input validation ---
    const { text } = (await request.json()) as { text?: string };

    if (!text?.trim()) {
      await logAiGenerationFailure({
        feature: FEATURE,
        model: MODEL,
        reason: "bad_input",
        durationMs: Date.now() - startedAt,
        detail: "Missing or empty text",
        userId: null,
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
        userId: null,
      });
      return json(
        {
          error: `That's ${words.toLocaleString()} words — the limit without an account is ${MAX_WORDS}. Sign in to review up to 3,000 words.`,
          reason: "too_long",
        },
        400
      );
    }

    // --- Prompt (no voice profile, no learned profile) ---
    const prompt = `You are reviewing a piece of writing someone already wrote. They did not write it here — they wrote it elsewhere and pasted it in to get your read. You are not coaching a draft toward publication. You are telling the writer how it reads.

REGISTER — read this before writing any note:
Before writing any note, identify what this text is for. Notes to yourself, bug reports, specs, messages, and drafts of published writing all have different targets. Terse, shorthand, or impersonal writing is correct for most of them.

Never write a note that amounts to "this should sound more considered, more personal, or more like an essay." That is not drift. Drift is when a piece leaves the register IT established — an essay that turns into marketing copy, a personal note that turns into a press release.

If the text is a fragment, a note, or working material rather than a finished piece, say so plainly in the overall read and give fewer notes rather than inventing them.

No voice profile is on file for this writer. Infer their voice from the text itself, and judge consistency against what the text is trying to do rather than an external standard.

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

    await logAiUsage({ feature: FEATURE, model: MODEL, usage: message.usage, userId: null });

    const raw = message.content[0]?.type === "text" ? message.content[0].text : "";
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
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
            // still unparseable
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
        userId: null,
      });
      return json({ error: "Failed to parse review", reason: "parse_error" }, 502);
    }

    // --- Normalize and enforce caps ---
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
        `review-public: dropped ${droppedPassages.length}/${rawNotes.length} voice notes — passages not found in input:\n` +
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

    // No cache write — review_cache requires user_id NOT NULL.
    // Anonymous results are ephemeral.

    return json(result, 200);
  } catch (error) {
    console.error("review-public error:", error);
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
      userId: null,
    });
    return json({ error: "Failed to generate review", reason }, 500);
  }
}
