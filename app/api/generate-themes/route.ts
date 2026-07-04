// app/api/generate-themes/route.ts
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { DIMENSION_LABELS, normalizeScore, type DimensionKey, type VoiceDimensions } from "@/lib/voice-dimensions";

const anthropic = new Anthropic({ maxRetries: 2 });

function describeVoice(dims: VoiceDimensions): string {
  const traits: string[] = [];
  for (const [key, raw] of Object.entries(dims) as [DimensionKey, number][]) {
    const norm = normalizeScore(key, raw);
    if (Math.abs(norm) < 0.25) continue;
    const labels = DIMENSION_LABELS[key];
    const side = norm >= 0 ? labels.high : labels.low;
    traits.push(`${side.toLowerCase()} (${key})`);
  }
  return traits.length > 0 ? `Their writing voice is: ${traits.join(", ")}.` : "No strong voice preferences detected.";
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { profile, entries, pastThemes } = await request.json();

    // Build context tiers
    const voiceDesc = profile?.voice_profile?.dimensions ? describeVoice(profile.voice_profile.dimensions) : "";

    const hasProfile = !!(profile?.business_description || profile?.what_you_do || profile?.what_you_build);

    const profileContext = hasProfile
      ? [
          profile.what_you_do && `They do: ${profile.what_you_do}`,
          profile.what_you_build && `They build: ${profile.what_you_build}`,
          profile.business_description && `Business: ${profile.business_description}`,
          profile.why_you_post && `They post to: ${profile.why_you_post}`,
          profile.platforms?.length && `Platforms: ${profile.platforms.join(", ")}`,
        ]
          .filter(Boolean)
          .join("\n")
      : "";

    const hasLogs = entries && entries.length > 0;
    const logContext = hasLogs
      ? entries
          .slice(0, 15)
          .map(
            (e: { content: string; tags?: string[]; created_at: string }) =>
              `- [${new Date(e.created_at).toLocaleDateString()}] ${e.content.slice(0, 200)}${e.tags?.length ? ` (tags: ${e.tags.join(", ")})` : ""}`
          )
          .join("\n")
      : "";

    const pastContext =
      pastThemes && pastThemes.length > 0
        ? `Previously picked themes (avoid repeating, build narrative continuity):\n${pastThemes.map((t: string) => `- ${t}`).join("\n")}`
        : "";

    // Determine tier for context line
    let tierHint = "";
    if (hasLogs && hasProfile) {
      tierHint =
        "Generate themes connected to their log entries. Each theme's why_now should reference a specific moment they logged.";
    } else if (hasProfile) {
      tierHint = "No log entries this week. Generate themes from their business context and voice.";
    } else {
      tierHint =
        "New user with only a voice profile. Generate broader themes shaped by their writing style. A provocative writer gets edgier themes. A reflective writer gets more contemplative ones.";
    }

    const prompt = `You generate weekly content themes for a founder or professional.

A theme is a specific tension or insight — not a category, not a finished headline. The person should read it and think "I have something to say about that."

Too vague: "Product updates"
Too specific: "Why your onboarding flow is your best sales tool: 3 lessons"
Right level: "The gap between what users expect from your onboarding and what they actually get"

${voiceDesc}

${profileContext ? `About this person:\n${profileContext}` : ""}

${logContext ? `Their log entries this week:\n${logContext}` : ""}

${pastContext}

${tierHint}

Generate exactly 3 themes. For each:
- "tension": the insight or tension in one sentence
- "why_now": why this theme fits this week (1 sentence, reference a log entry if available)
- "format": one of "story", "lesson", "framework", "contrarian-take"
- "source": "log" if tied to a log entry, "profile" if from business context, "voice" if from voice dimensions only
- "source_entry_id": the id of the log entry if source is "log", omit otherwise

Also return:
- "context": one sentence explaining why these 3 themes this week (for display above the cards)

Return ONLY valid JSON:
{"context": "...", "themes": [{"tension":"...","why_now":"...","format":"...","source":"..."},{"tension":"...","why_now":"...","format":"...","source":"..."},{"tension":"...","why_now":"...","format":"...","source":"..."}]}`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
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
      parsed = match ? JSON.parse(match[0]) : { context: "", themes: [] };
    }

    // Ensure exactly 3 themes with queued=false
    const themes = (parsed.themes || []).slice(0, 3).map((t: Record<string, unknown>) => ({
      tension: t.tension || "",
      why_now: t.why_now || "",
      format: t.format || "lesson",
      source: t.source || "voice",
      source_entry_id: t.source_entry_id || undefined,
      queued: false,
    }));

    return NextResponse.json({
      context: parsed.context || "",
      themes,
    });
  } catch (error) {
    console.error("generate-themes error:", error);
    return NextResponse.json({ error: "Failed to generate themes" }, { status: 500 });
  }
}
