# Voice Discovery + Simplified Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 3-step onboarding with interview + 60-second voice exercise, add one-tap draft generation from notes, remove the old game.

**Architecture:** New `/onboard/2` page with 12-pair voice exercise that saves a JSONB voice profile to the `profiles` table. New `/api/generate-draft` endpoint uses the voice profile + business context to generate a complete draft from a single note. The existing coaching flow is demoted to secondary. The `/play` game route is deleted with a 301 redirect.

**Tech Stack:** Next.js App Router, React, Supabase (Postgres), Anthropic Claude Sonnet, PostHog, TypeScript.

## Global Constraints

- Model: `claude-sonnet-4-6` for all AI calls
- Auth: every API route checks `supabase.auth.getUser()` before proceeding
- Profile updates use `upsertProfile()` from `@/lib/supabase/profiles`
- Draft creation uses `createStandaloneDraft()` from `@/lib/supabase/drafts`
- Styling: inline styles using existing design tokens (INK `#1A1A18`, BLUE `#4A6CF7`, CREAM `#F7F4EF`, DIM `#6B6860`, FAINT `#A8A49C`)
- No new dependencies

---

### Task 1: Voice Dimensions Shared Constants

**Files:**

- Create: `lib/voice-dimensions.ts`

**Interfaces:**

- Consumes: nothing
- Produces: `VOICE_PAIRS`, `DIMENSION_LABELS`, `VoiceProfile` type, `scorePairs()`, `getTopTraits()`, `normalizeScore()`

- [ ] **Step 1: Create `lib/voice-dimensions.ts` with all constants and scoring logic**

```typescript
// lib/voice-dimensions.ts

export type DimensionKey = "directness" | "precision" | "temperature" | "authority" | "rhythm" | "framing" | "energy";

export interface VoicePair {
  dimension: DimensionKey;
  optionA: string; // +1
  optionB: string; // -1
}

export interface VoiceDimensions {
  directness: number;
  precision: number;
  temperature: number;
  authority: number;
  rhythm: number;
  framing: number;
  energy: number;
}

export interface VoiceProfile {
  dimensions: VoiceDimensions;
  top_traits: string[];
  edge: string;
  gap: string;
  completed_at: string;
}

export const DIMENSION_LABELS: Record<DimensionKey, { low: string; high: string }> = {
  directness: { low: "Contextual", high: "Direct" },
  precision: { low: "Impressionistic", high: "Precise" },
  temperature: { low: "Cool", high: "Warm" },
  authority: { low: "Inviting", high: "Assertive" },
  rhythm: { low: "Flowing", high: "Staccato" },
  framing: { low: "Structurer", high: "Storyteller" },
  energy: { low: "Reflective", high: "Provocative" },
};

export const VOICE_PAIRS: VoicePair[] = [
  {
    dimension: "directness",
    optionA: "The project is behind schedule. Here\u2019s what we\u2019re changing.",
    optionB:
      "I wanted to share some thoughts on where the project stands and a few adjustments we\u2019re considering.",
  },
  {
    dimension: "directness",
    optionA: "Don\u2019t reply-all to this thread.",
    optionB: "It might be worth keeping this conversation to the people directly involved.",
  },
  {
    dimension: "precision",
    optionA: "We closed 12 deals last month, up from 7. Average contract value dropped from $34K to $28K.",
    optionB: "We closed more deals last month, but the average deal size was a bit smaller than before.",
  },
  {
    dimension: "precision",
    optionA: "The meeting ran 40 minutes over. We covered 3 of the 8 agenda items.",
    optionB: "The meeting went long and we didn\u2019t get through everything.",
  },
  {
    dimension: "temperature",
    optionA: "Honestly, I was embarrassed by how that presentation went.",
    optionB: "The presentation didn\u2019t go as planned, but there are clear takeaways.",
  },
  {
    dimension: "temperature",
    optionA: "This is the part of the job that keeps me up at night.",
    optionB: "This is one of the harder challenges we\u2019re working through right now.",
  },
  {
    dimension: "authority",
    optionA: "We need to cut this feature. It\u2019s not working.",
    optionB: "I wonder if this feature is pulling its weight. Worth discussing.",
  },
  {
    dimension: "authority",
    optionA: "The best teams I\u2019ve seen all do this differently.",
    optionB: "I\u2019ve noticed something interesting about how some teams handle this.",
  },
  {
    dimension: "rhythm",
    optionA: "Tried it. Didn\u2019t work. Moved on.",
    optionB: "We gave it a fair shot over a few weeks, but ultimately decided to take a different approach.",
  },
  {
    dimension: "framing",
    optionA: "Last Thursday a client called me at 9pm and said three words that changed how I think about our service.",
    optionB: "Three things I\u2019ve learned about what clients actually want from us.",
  },
  {
    dimension: "framing",
    optionA: "I was sitting in the parking lot after the meeting, replaying the conversation in my head.",
    optionB: "Here\u2019s a breakdown of what went well and what we should do differently next time.",
  },
  {
    dimension: "energy",
    optionA: "Nobody talks about this enough.",
    optionB: "Something I\u2019ve been reflecting on recently.",
  },
];

// Dimensions with 2 pairs get a raw range of -2..+2; with 1 pair, -1..+1
const TWO_PAIR_DIMS: DimensionKey[] = ["directness", "precision", "temperature", "authority", "framing"];

/** Turn an array of 12 choices ("a"|"b") into raw dimension scores */
export function scorePairs(choices: ("a" | "b")[]): VoiceDimensions {
  const scores: VoiceDimensions = {
    directness: 0,
    precision: 0,
    temperature: 0,
    authority: 0,
    rhythm: 0,
    framing: 0,
    energy: 0,
  };
  choices.forEach((choice, i) => {
    const pair = VOICE_PAIRS[i];
    scores[pair.dimension] += choice === "a" ? 1 : -1;
  });
  return scores;
}

/** Normalize a raw score to -1..+1 range for display */
export function normalizeScore(dimension: DimensionKey, raw: number): number {
  const max = TWO_PAIR_DIMS.includes(dimension) ? 2 : 1;
  return raw / max;
}

/** Get top 3 trait labels by absolute score, using the high/low label */
export function getTopTraits(dims: VoiceDimensions): string[] {
  const entries = (Object.entries(dims) as [DimensionKey, number][])
    .map(([key, val]) => ({
      key,
      abs: Math.abs(normalizeScore(key, val)),
      label: val >= 0 ? DIMENSION_LABELS[key].high : DIMENSION_LABELS[key].low,
    }))
    .sort((a, b) => b.abs - a.abs);
  return entries.slice(0, 3).map((e) => e.label);
}
```

- [ ] **Step 2: Verify the file compiles**

Run: `npx tsc --noEmit lib/voice-dimensions.ts 2>&1 | head -20`
Expected: no errors (or only unrelated existing errors)

- [ ] **Step 3: Commit**

```bash
git add lib/voice-dimensions.ts
git commit -m "feat: add voice dimension constants and scoring logic"
```

---

### Task 2: Add `voice_profile` to Profile Type + Database

**Files:**

- Modify: `lib/supabase/profiles.ts` (add `voice_profile` field to `UserProfile`)

**Interfaces:**

- Consumes: `VoiceProfile` type from `lib/voice-dimensions.ts`
- Produces: updated `UserProfile` type with `voice_profile: VoiceProfile | null`

- [ ] **Step 1: Add the `voice_profile` column in Supabase**

Run this SQL in the Supabase SQL editor (or via migration):

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS voice_profile JSONB DEFAULT NULL;
```

- [ ] **Step 2: Add `voice_profile` to the `UserProfile` interface in `lib/supabase/profiles.ts`**

Add this import at the top:

```typescript
import type { VoiceProfile } from "@/lib/voice-dimensions";
```

Add this field to the `UserProfile` interface after `account_type_confidence`:

```typescript
voice_profile: VoiceProfile | null;
```

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/profiles.ts
git commit -m "feat: add voice_profile JSONB field to UserProfile"
```

---

### Task 3: `/api/voice-result` Endpoint

**Files:**

- Create: `app/api/voice-result/route.ts`

**Interfaces:**

- Consumes: `VoiceDimensions` from `lib/voice-dimensions.ts`, `UserProfile` from `lib/supabase/profiles.ts`
- Produces: `{ edge: string, gap: string }`

- [ ] **Step 1: Create the API route**

```typescript
// app/api/voice-result/route.ts
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { type VoiceDimensions, DIMENSION_LABELS, normalizeScore, type DimensionKey } from "@/lib/voice-dimensions";

const anthropic = new Anthropic({ maxRetries: 2 });

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

    const text = message.content[0].type === "text" ? message.content[0].text : "";
    const parsed = JSON.parse(text);

    return NextResponse.json({
      edge: parsed.edge || "",
      gap: parsed.gap || "",
    });
  } catch (error) {
    console.error("voice-result error:", error);
    return NextResponse.json({ error: "Failed to generate voice result" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/voice-result/route.ts
git commit -m "feat: add /api/voice-result endpoint for edge/gap generation"
```

---

### Task 4: Voice Discovery Exercise Page (`/onboard/2`)

**Files:**

- Rewrite: `app/onboard/2/page.tsx`

**Interfaces:**

- Consumes: `VOICE_PAIRS`, `DIMENSION_LABELS`, `scorePairs()`, `getTopTraits()`, `normalizeScore()`, `VoiceProfile` from `lib/voice-dimensions.ts`; `upsertProfile()`, `getProfile()` from `lib/supabase/profiles.ts`; `/api/voice-result` endpoint
- Produces: saved `voice_profile` on the user's profile row, redirect to `/dashboard`

- [ ] **Step 1: Rewrite `/app/onboard/2/page.tsx`**

```typescript
"use client";
import { useState } from "react";
import { upsertProfile, getProfile } from "@/lib/supabase/profiles";
import {
  VOICE_PAIRS,
  DIMENSION_LABELS,
  scorePairs,
  getTopTraits,
  normalizeScore,
  type DimensionKey,
  type VoiceProfile,
  type VoiceDimensions,
} from "@/lib/voice-dimensions";
import posthog from "posthog-js";

const INK = "#1A1A18";
const BLUE = "#4A6CF7";
const DIM = "#6B6860";
const FAINT = "#A8A49C";
const CREAM = "#F7F4EF";

type Phase = "intro" | "pairs" | "loading" | "result";

export default function VoiceDiscoveryPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [currentPair, setCurrentPair] = useState(0);
  const [choices, setChoices] = useState<("a" | "b")[]>([]);
  const [result, setResult] = useState<{
    dimensions: VoiceDimensions;
    topTraits: string[];
    edge: string;
    gap: string;
  } | null>(null);

  async function handleChoice(choice: "a" | "b") {
    const newChoices = [...choices, choice];
    setChoices(newChoices);

    if (newChoices.length < VOICE_PAIRS.length) {
      setCurrentPair(currentPair + 1);
    } else {
      // All 12 pairs answered — score and generate result
      setPhase("loading");
      const dimensions = scorePairs(newChoices);
      const topTraits = getTopTraits(dimensions);

      // Get business context from profile
      const profile = await getProfile();
      const businessContext = [
        profile?.business_description,
        profile?.interview_q1,
        profile?.interview_q3,
      ]
        .filter(Boolean)
        .join(" ");

      // Generate edge/gap
      let edge = "";
      let gap = "";
      try {
        const res = await fetch("/api/voice-result", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dimensions, businessContext }),
        });
        const data = await res.json();
        edge = data.edge || "";
        gap = data.gap || "";
      } catch {
        edge = "Your voice has a distinctive combination of traits that sets you apart.";
        gap = "Keep experimenting with the edges of your style.";
      }

      const voiceProfile: VoiceProfile = {
        dimensions,
        top_traits: topTraits,
        edge,
        gap,
        completed_at: new Date().toISOString(),
      };

      // Save to profile
      await upsertProfile({
        voice_profile: voiceProfile as unknown as never,
        onboarding_completed: true,
      });

      posthog.capture("voice_discovery_completed", {
        top_traits: topTraits,
        dimensions,
      });

      setResult({ dimensions, topTraits, edge, gap });
      setPhase("result");
    }
  }

  function handleFinish() {
    window.location.href = "/dashboard";
  }

  // --- INTRO SCREEN ---
  if (phase === "intro") {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: CREAM,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 520, textAlign: "center" }}>
          <h1
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: INK,
              marginBottom: 16,
              lineHeight: 1.2,
            }}
          >
            Find your voice in 60 seconds
          </h1>
          <p
            style={{
              fontSize: 18,
              color: DIM,
              lineHeight: 1.6,
              marginBottom: 32,
            }}
          >
            You&apos;ll see 12 pairs of writing samples. Tap the one that sounds
            more like you. No right answers — just instinct.
          </p>
          <button
            onClick={() => setPhase("pairs")}
            style={{
              background: BLUE,
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "16px 48px",
              fontSize: 18,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Start
          </button>
        </div>
      </div>
    );
  }

  // --- PAIRS SCREEN ---
  if (phase === "pairs") {
    const pair = VOICE_PAIRS[currentPair];
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: CREAM,
          display: "flex",
          flexDirection: "column",
          padding: 24,
        }}
      >
        {/* Progress bar */}
        <div
          style={{
            maxWidth: 600,
            margin: "0 auto 32px",
            width: "100%",
          }}
        >
          <div
            style={{
              height: 4,
              background: "#e5e5e5",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${((currentPair + 1) / VOICE_PAIRS.length) * 100}%`,
                background: BLUE,
                borderRadius: 2,
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <p
            style={{
              textAlign: "center",
              fontSize: 13,
              color: FAINT,
              marginTop: 8,
            }}
          >
            {currentPair + 1} / {VOICE_PAIRS.length}
          </p>
        </div>

        {/* Pair question */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              maxWidth: 800,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <p
              style={{
                textAlign: "center",
                fontSize: 15,
                color: FAINT,
                marginBottom: 8,
              }}
            >
              Which sounds more like you?
            </p>
            {(["a", "b"] as const).map((choice) => (
              <button
                key={choice}
                onClick={() => handleChoice(choice)}
                style={{
                  background: "#fff",
                  border: "1.5px solid #e5e5e5",
                  borderRadius: 12,
                  padding: "24px 28px",
                  fontSize: 17,
                  lineHeight: 1.6,
                  color: INK,
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.borderColor = BLUE;
                  (e.target as HTMLElement).style.boxShadow = `0 0 0 1px ${BLUE}`;
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.borderColor = "#e5e5e5";
                  (e.target as HTMLElement).style.boxShadow = "none";
                }}
              >
                {choice === "a" ? pair.optionA : pair.optionB}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- LOADING SCREEN ---
  if (phase === "loading") {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: CREAM,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: `3px solid #e5e5e5`,
              borderTopColor: BLUE,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ fontSize: 18, color: DIM }}>
            Analyzing your voice...
          </p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // --- RESULT SCREEN ---
  if (phase === "result" && result) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: CREAM,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 600, width: "100%" }}>
          {/* Top traits headline */}
          <h1
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: INK,
              marginBottom: 32,
              lineHeight: 1.2,
            }}
          >
            {result.topTraits.join(". ")}.
          </h1>

          {/* Spectrum bars */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
              marginBottom: 36,
            }}
          >
            {(
              Object.entries(result.dimensions) as [DimensionKey, number][]
            ).map(([key, raw]) => {
              const norm = normalizeScore(key, raw);
              const labels = DIMENSION_LABELS[key];
              const pct = ((norm + 1) / 2) * 100; // -1..+1 → 0..100%
              return (
                <div key={key}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                      color: DIM,
                      marginBottom: 6,
                    }}
                  >
                    <span>{labels.low}</span>
                    <span>{labels.high}</span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      background: "#e5e5e5",
                      borderRadius: 4,
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: `${pct}%`,
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: BLUE,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Edge */}
          <div style={{ marginBottom: 24 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: FAINT,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 8,
              }}
            >
              Your edge
            </h3>
            <p style={{ fontSize: 17, color: INK, lineHeight: 1.6 }}>
              {result.edge}
            </p>
          </div>

          {/* Gap */}
          <div style={{ marginBottom: 36 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: FAINT,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 8,
              }}
            >
              Watch out for
            </h3>
            <p style={{ fontSize: 17, color: INK, lineHeight: 1.6 }}>
              {result.gap}
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={handleFinish}
            style={{
              width: "100%",
              background: BLUE,
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "16px 0",
              fontSize: 18,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Start logging
          </button>
        </div>
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx next build 2>&1 | tail -20`
Expected: builds without errors on the onboard/2 route

- [ ] **Step 3: Commit**

```bash
git add app/onboard/2/page.tsx
git commit -m "feat: voice discovery exercise replaces onboard step 2"
```

---

### Task 5: Update Onboard Step 1 Redirect + Delete Step 3

**Files:**

- Modify: `app/onboard/1/page.tsx` (change redirect, remove develop param)
- Delete: `app/onboard/3/page.tsx`

**Interfaces:**

- Consumes: nothing new
- Produces: updated flow: step 1 → step 2 (voice exercise) → dashboard

- [ ] **Step 1: In `app/onboard/1/page.tsx`, find the `handleStart` function and change the redirect**

Find the function that runs after the interview (around line 89-94). It currently does:

```typescript
window.location.href = seededEntryId ? `/dashboard?develop=${seededEntryId}` : "/dashboard";
```

Replace with:

```typescript
window.location.href = "/onboard/2";
```

Also remove `onboarding_completed: true` from the `upsertProfile` call in `handleStart` — onboarding is now completed at the end of step 2.

- [ ] **Step 2: Delete `app/onboard/3/page.tsx`**

```bash
rm app/onboard/3/page.tsx
```

If there's a `3/` directory, remove it:

```bash
rm -rf app/onboard/3
```

- [ ] **Step 3: Commit**

```bash
git add app/onboard/1/page.tsx
git add -u app/onboard/3
git commit -m "feat: onboard step 1 redirects to voice exercise, delete step 3"
```

---

### Task 6: `/api/generate-draft` Endpoint

**Files:**

- Create: `app/api/generate-draft/route.ts`

**Interfaces:**

- Consumes: `VoiceProfile`, `VoiceDimensions`, `DIMENSION_LABELS`, `normalizeScore`, `DimensionKey` from `lib/voice-dimensions.ts`
- Produces: streamed text response (complete draft)

- [ ] **Step 1: Create the API route**

```typescript
// app/api/generate-draft/route.ts
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { DIMENSION_LABELS, normalizeScore, type DimensionKey, type VoiceDimensions } from "@/lib/voice-dimensions";

const anthropic = new Anthropic({ maxRetries: 2 });

function buildVoiceInstructions(dims: VoiceDimensions): string {
  const lines: string[] = [];
  for (const [key, raw] of Object.entries(dims) as [DimensionKey, number][]) {
    const norm = normalizeScore(key, raw);
    const labels = DIMENSION_LABELS[key];
    const side = norm >= 0 ? labels.high : labels.low;
    const strength = Math.abs(norm);

    if (strength < 0.25) continue; // near-neutral, skip

    switch (key) {
      case "directness":
        lines.push(
          norm > 0
            ? "Write directly. State conclusions first. No hedging or softening."
            : "Ease the reader in. Provide context before conclusions."
        );
        break;
      case "precision":
        lines.push(
          norm > 0
            ? "Use specific numbers, names, and concrete details."
            : "Paint the picture without over-specifying. Use impressions over data."
        );
        break;
      case "temperature":
        lines.push(
          norm > 0
            ? "Show emotion. Be honest about how things felt. Let vulnerability in."
            : "Keep the tone professional and measured. Let the facts carry the weight."
        );
        break;
      case "authority":
        lines.push(
          norm > 0
            ? "Take a clear position. Use declarative statements."
            : "Invite the reader to think alongside you. Use questions and observations."
        );
        break;
      case "rhythm":
        lines.push(
          norm > 0
            ? "Use short sentences. Fragments are fine. Keep it punchy."
            : "Let sentences breathe. Use flowing, connected prose."
        );
        break;
      case "framing":
        lines.push(
          norm > 0
            ? "Open with a scene, moment, or story. Make it cinematic."
            : "Open with the takeaway or a clear structure. List and organize."
        );
        break;
      case "energy":
        lines.push(
          norm > 0
            ? "Be provocative. Challenge assumptions. Start with a bold claim."
            : "Be thoughtful. Start with a reflection or quiet observation."
        );
        break;
    }
  }
  return lines.join("\n");
}

const PLATFORM_GUIDES: Record<string, string> = {
  linkedin:
    "Format: LinkedIn post. 150-300 words. Hook in the first line. Use line breaks for readability. End with a question or call-to-reflection. No hashtags.",
  x: "Format: Single tweet or short thread (2-3 tweets). Punchy. Under 280 chars per tweet. No hashtags.",
  substack: "Format: Newsletter excerpt. 200-400 words. Conversational but substantial. Include a clear insight.",
  threads: "Format: Threads post. Conversational, 100-200 words. Casual but insightful.",
  小红书: "Format: 小红书 post. 100-200 words. Mix of personal story and practical insight. Warm tone.",
};

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

    const { entryContent, voiceProfile, businessContext, platform } = await request.json();

    if (!entryContent?.trim())
      return new Response(JSON.stringify({ error: "entry content required" }), { status: 400 });

    const voiceInstructions = voiceProfile?.dimensions
      ? buildVoiceInstructions(voiceProfile.dimensions)
      : "Write in a clear, professional tone.";

    const platformGuide = PLATFORM_GUIDES[(platform || "linkedin").toLowerCase()] || PLATFORM_GUIDES.linkedin;

    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const systemPrompt = `You are a ghostwriter. Your job is to turn a raw note into a complete, ready-to-publish post.

VOICE STYLE (follow these closely):
${voiceInstructions}

${platformGuide}

Today's date: ${today}

RULES:
- Write ONE complete post, ready to copy-paste and publish.
- Use the note as raw material — extract the story, insight, or point. Don't just polish the note.
- Sound like a real person, not a writing tool. No "Here's the thing...", "Let me be honest...", or other AI cliches.
- Do not add a title, subject line, or meta-commentary. Just the post.
- Do not explain what you did. Just write the post.`;

    const userPrompt = `Business context: ${businessContext || "Not provided"}

Raw note:
${entryContent}

Write the post.`;

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: userPrompt }],
      system: systemPrompt,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (error) {
    console.error("generate-draft error:", error);
    return new Response(JSON.stringify({ error: "Failed to generate draft" }), { status: 500 });
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/generate-draft/route.ts
git commit -m "feat: add /api/generate-draft endpoint for one-tap draft generation"
```

---

### Task 7: Add "Post" Button to Dashboard Log Entries

**Files:**

- Modify: `app/dashboard/page.tsx`

**Interfaces:**

- Consumes: `/api/generate-draft` endpoint, `createStandaloneDraft()` from `lib/supabase/drafts`, `UserProfile.voice_profile`
- Produces: "Post" button on log entry cards that generates a draft and switches to Drafts tab

- [ ] **Step 1: Find the log entry menu in `app/dashboard/page.tsx`**

Search for the "Develop" button (around line 893). The menu contains Edit, Select multiple, Develop, Start draft. We need to add a "Post" button BEFORE the Develop button, and make Develop secondary.

- [ ] **Step 2: Add a `handlePostNote` function near the other handlers**

Find where `onDevelopNote` is defined as a callback (around line 3876). Add this function nearby:

```typescript
async function handlePostNote(entry: LogEntry) {
  if (!profile?.voice_profile) {
    // No voice profile — prompt user to complete exercise
    if (confirm("Take 60 seconds to discover your voice first?")) {
      window.location.href = "/onboard/2";
    }
    return;
  }

  // Set loading state
  setPostingEntryId(entry.id);

  const businessContext = [profile.business_description, profile.interview_q1, profile.interview_q3]
    .filter(Boolean)
    .join(" ");

  try {
    const res = await fetch("/api/generate-draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entryContent: entry.content,
        voiceProfile: profile.voice_profile,
        businessContext,
        platform: profile.platforms?.[0] || "linkedin",
      }),
    });

    const text = await res.text();

    const draft = await createStandaloneDraft(text, entry.content || "", entry.id);

    if (draft) {
      posthog.capture("note_posted", {
        entry_id: entry.id,
        platform: profile.platforms?.[0] || "linkedin",
      });
      // Refresh drafts and switch to drafts tab
      const allDrafts = await getAllDrafts();
      setDrafts(allDrafts);
      setEditingDraft(draft);
      setTab("write");
    }
  } catch (err) {
    console.error("Post failed:", err);
  } finally {
    setPostingEntryId(null);
  }
}
```

- [ ] **Step 3: Add state for the posting loading indicator**

Near the other `useState` calls at the top of the component, add:

```typescript
const [postingEntryId, setPostingEntryId] = useState<string | null>(null);
```

- [ ] **Step 4: Add the "Post" button in the log entry menu, before "Develop"**

In the menu dropdown (around line 893), add this button BEFORE the Develop button:

```typescript
<button
  onClick={async (ev) => {
    ev.stopPropagation();
    setMenuOpen(null);
    handlePostNote(entry);
  }}
  disabled={postingEntryId === entry.id}
  className="w-full text-left px-4 py-2.5 font-sans text-[13px] hover:bg-gray-50"
  style={{
    color: "#fff",
    background: BLUE,
    border: "none",
    cursor: postingEntryId === entry.id ? "wait" : "pointer",
    borderRadius: 6,
    margin: "4px 8px",
    width: "calc(100% - 16px)",
    fontWeight: 600,
  }}
>
  {postingEntryId === entry.id ? "Generating..." : "Post"}
</button>
```

- [ ] **Step 5: Make the "Develop" button visually secondary**

Change the Develop button's style from `color: BLUE` to `color: DIM`:

```typescript
style={{ color: DIM, border: "none", background: "transparent", cursor: "pointer" }}
```

- [ ] **Step 6: Verify it compiles and test manually**

Run: `npm run dev`
Navigate to dashboard, log a note, click the menu, verify "Post" appears above "Develop".

- [ ] **Step 7: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: add Post button to log entries for one-tap draft generation"
```

---

### Task 8: Remove "Make It Hit" Game + Add Redirects

**Files:**

- Delete: `app/play/page.tsx` (and `app/play/` directory)
- Delete: `app/game/page.tsx` (and `app/game/` directory, if exists)
- Modify: `next.config.ts` (add redirects)
- Modify: `app/page.tsx` (remove game CTAs)

**Interfaces:**

- Consumes: nothing
- Produces: 301 redirects for `/play` and `/game`, cleaned landing page

- [ ] **Step 1: Delete the game files**

```bash
rm -rf app/play
rm -rf app/game
```

- [ ] **Step 2: Add redirects to `next.config.ts`**

In `next.config.ts`, add an `async redirects()` function inside the `nextConfig` object, after the `rewrites()` function:

```typescript
async redirects() {
  return [
    {
      source: "/play",
      destination: "/",
      permanent: true,
    },
    {
      source: "/game",
      destination: "/",
      permanent: true,
    },
  ];
},
```

- [ ] **Step 3: Remove game references from landing page `app/page.tsx`**

Search `app/page.tsx` for any links to `/play` or `/game` and remove those CTAs/sections. Also search for "Make It Hit" or "taste test" text and remove it.

Update any flow description from "Log → Develop → Write → Drafts" to the new flow.

- [ ] **Step 4: Verify redirects work**

Run: `npm run dev`
Navigate to `http://localhost:3000/play` — should redirect to `/`.
Navigate to `http://localhost:3000/game` — should redirect to `/`.

- [ ] **Step 5: Commit**

```bash
git add -u app/play app/game
git add next.config.ts app/page.tsx
git commit -m "feat: remove Make It Hit game, add 301 redirects"
```

---

### Task 9: Add "Regenerate" Button to Draft Editor

**Files:**

- Modify: `app/dashboard/page.tsx` (draft editing section)

**Interfaces:**

- Consumes: `/api/generate-draft` endpoint, `saveDraftById()` from `lib/supabase/drafts`
- Produces: "Regenerate" button in the draft editor that re-generates the draft content

- [ ] **Step 1: Find the draft editing UI in `app/dashboard/page.tsx`**

Search for where `editingDraft` is rendered (the Drafts/Write tab). Find the area where the draft content textarea is shown.

- [ ] **Step 2: Add a "Regenerate" button near the draft editor controls**

Add this button near the top of the draft editor, next to any existing controls:

```typescript
{editingDraft?.source_entry_id && profile?.voice_profile && (
  <button
    onClick={async () => {
      if (!editingDraft?.source_note) return;
      setRegenerating(true);
      const businessContext = [
        profile.business_description,
        profile.interview_q1,
        profile.interview_q3,
      ]
        .filter(Boolean)
        .join(" ");
      try {
        const res = await fetch("/api/generate-draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entryContent: editingDraft.source_note,
            voiceProfile: profile.voice_profile,
            businessContext,
            platform: profile.platforms?.[0] || "linkedin",
          }),
        });
        const text = await res.text();
        await saveDraftById(editingDraft.id, text);
        setEditingDraft({ ...editingDraft, content: text });
        posthog.capture("draft_regenerated", { draft_id: editingDraft.id });
      } catch (err) {
        console.error("Regenerate failed:", err);
      } finally {
        setRegenerating(false);
      }
    }}
    disabled={regenerating}
    style={{
      background: "transparent",
      border: `1.5px solid ${FAINT}`,
      borderRadius: 8,
      padding: "8px 16px",
      fontSize: 13,
      color: DIM,
      cursor: regenerating ? "wait" : "pointer",
      fontWeight: 600,
    }}
  >
    {regenerating ? "Regenerating..." : "Regenerate"}
  </button>
)}
```

- [ ] **Step 3: Add state for regenerating**

Near other `useState` calls:

```typescript
const [regenerating, setRegenerating] = useState(false);
```

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: add Regenerate button to draft editor"
```
