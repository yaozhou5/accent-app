// app/api/voice-result/route.ts
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@supabase/ssr";
import { type VoiceDimensions, DIMENSION_LABELS, normalizeScore, type DimensionKey } from "@/lib/voice-dimensions";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

const anthropic = new Anthropic({ maxRetries: 2 });

// Service-role client for the shared cache table (no user session on this
// public route). Service role bypasses RLS; the table has no public policies.
function cacheClient() {
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: { getAll: () => [], setAll: () => {} },
  });
}

// Canonical key from the 7 dimension scores, sorted by dimension name so the
// key is stable regardless of object key order. The report is a pure function
// of these scores, so the same key always maps to the same edge/gap.
function dimsKey(dimensions: VoiceDimensions): string {
  return (Object.keys(dimensions) as DimensionKey[])
    .sort()
    .map((k) => `${k}:${dimensions[k]}`)
    .join("|");
}

// No auth required — this endpoint is used by the public /voice page
export async function POST(request: NextRequest) {
  try {
    const { dimensions, businessContext } = (await request.json()) as {
      dimensions: VoiceDimensions;
      businessContext: string;
    };

    if (!dimensions) return NextResponse.json({ error: "dimensions required" }, { status: 400 });

    // 1. Compute the canonical cache key from the sorted dimension scores.
    const key = dimsKey(dimensions);

    // 2. Cache lookup. On HIT: return the cached report immediately — no
    //    Anthropic call and no rate-limit check (hits are never throttled).
    const supabase = cacheClient();
    try {
      const { data: cached } = await supabase
        .from("voice_report_cache")
        .select("edge, gap")
        .eq("dims_key", key)
        .maybeSingle();
      if (cached) {
        return NextResponse.json({ edge: cached.edge || "", gap: cached.gap || "" });
      }
    } catch (e) {
      // Cache read failed (e.g. table missing / transient) — treat as a MISS
      // and fall through to the throttled generation path.
      console.error("voice_report_cache read error:", e instanceof Error ? e.message : e);
    }

    // 3. MISS only: apply per-IP rate limiting before spending on Anthropic.
    const ip = getClientIp(request);
    const rateLimit = checkRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many requests, please try again later." }, { status: 429 });
    }

    // 4. Generate via Anthropic, then cache the result keyed on dims_key.

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

    const edge = parsed.edge || "";
    const gap = parsed.gap || "";

    // Best-effort cache write. on-conflict-do-nothing (ignoreDuplicates) handles
    // two concurrent misses racing on the same key. Skip writing an empty result
    // so a transient parse failure never poisons the cache permanently.
    if (edge || gap) {
      try {
        await supabase
          .from("voice_report_cache")
          .upsert({ dims_key: key, edge, gap }, { onConflict: "dims_key", ignoreDuplicates: true });
      } catch (e) {
        console.error("voice_report_cache write error:", e instanceof Error ? e.message : e);
      }
    }

    return NextResponse.json({ edge, gap });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("voice-result error:", msg);
    return NextResponse.json({ error: "Failed to generate voice result", detail: msg }, { status: 500 });
  }
}
