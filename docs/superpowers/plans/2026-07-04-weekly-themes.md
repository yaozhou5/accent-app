# Weekly Content Themes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the post-idea planning system with 3 weekly content themes. User picks one as their pillar, the other two queue for later.

**Architecture:** New `/api/generate-themes` endpoint generates 3 themes using voice profile + profile context + log entries. The `content_plans.plan` JSONB column stores the new `WeeklyThemes` shape. The Ideas tab in the dashboard is rewritten to show theme cards instead of post ideas.

**Tech Stack:** Next.js App Router, React, Supabase (Postgres JSONB), Anthropic Claude Sonnet, TypeScript.

## Global Constraints

- Model: `claude-sonnet-4-6` for all AI calls
- Auth: every API route checks `supabase.auth.getUser()` before proceeding
- Styling: inline styles using existing design tokens (INK `#1A1A18`, BLUE `#4A6CF7`, CREAM `#F7F4EF`, DIM `#6B6860`, FAINT `#A8A49C`, BORDER `#e5e7eb`)
- No new dependencies
- Do NOT touch: voice exercise, sign up flow, Log tab, draft editor, Settings, `/api/generate-plan`

---

### Task 1: Add Theme Types to Planner

**Files:**

- Modify: `lib/supabase/planner.ts`

**Interfaces:**

- Consumes: existing `ContentPlan`, `getWeekStart()`, `createWeeklyDump()`, `savePlan()`
- Produces: `Theme`, `WeeklyThemes` types; `saveThemePlan()`, `updateThemePick()` functions

- [ ] **Step 1: Add the new types after the existing `ContentPlanData` interface in `lib/supabase/planner.ts`**

```typescript
export interface Theme {
  tension: string;
  why_now: string;
  format: "story" | "lesson" | "framework" | "contrarian-take";
  source: "log" | "profile" | "voice";
  source_entry_id?: string;
  queued: boolean;
}

export interface WeeklyThemes {
  themes: Theme[];
  picked_theme_index: number | null;
  context: string;
}
```

- [ ] **Step 2: Add `saveThemePlan` function after the existing `savePlan` function**

```typescript
export async function saveThemePlan(dumpId: string, themes: WeeklyThemes): Promise<ContentPlan | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("content_plans")
    .insert({
      user_id: user.id,
      dump_id: dumpId,
      week_start: getWeekStart(),
      plan: themes,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to save theme plan:", error);
    return null;
  }
  return data as ContentPlan;
}
```

- [ ] **Step 3: Add `updateThemePick` function**

```typescript
export async function updateThemePick(planId: string, pickedIndex: number): Promise<ContentPlan | null> {
  const supabase = createClient();

  // First fetch the current plan
  const { data: current, error: fetchError } = await supabase
    .from("content_plans")
    .select("plan")
    .eq("id", planId)
    .single();

  if (fetchError || !current) return null;

  const themes = current.plan as WeeklyThemes;
  themes.picked_theme_index = pickedIndex;
  themes.themes.forEach((t, i) => {
    t.queued = i !== pickedIndex;
  });

  const { data, error } = await supabase
    .from("content_plans")
    .update({ plan: themes })
    .eq("id", planId)
    .select()
    .single();

  if (error) {
    console.error("Failed to update theme pick:", error);
    return null;
  }
  return data as ContentPlan;
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | head -5`
Expected: no new errors

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/planner.ts
git commit -m "feat: add Theme/WeeklyThemes types and save/pick functions"
```

---

### Task 2: `/api/generate-themes` Endpoint

**Files:**

- Create: `app/api/generate-themes/route.ts`

**Interfaces:**

- Consumes: `VoiceProfile`, `VoiceDimensions`, `DIMENSION_LABELS`, `normalizeScore`, `DimensionKey` from `lib/voice-dimensions.ts`; `UserProfile` from `lib/supabase/profiles.ts`; `LogEntry` from `lib/supabase/log-entries.ts`
- Produces: `{ context: string, themes: Theme[] }` (exactly 3 themes)

- [ ] **Step 1: Create the API route**

````typescript
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
````

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | head -5`

- [ ] **Step 3: Commit**

```bash
git add app/api/generate-themes/route.ts
git commit -m "feat: add /api/generate-themes endpoint with 3-tier generation"
```

---

### Task 3: Rewrite Ideas Tab to Show Themes

**Files:**

- Modify: `app/dashboard/page.tsx`

**Interfaces:**

- Consumes: `Theme`, `WeeklyThemes`, `saveThemePlan()`, `updateThemePick()` from `lib/supabase/planner.ts`; `/api/generate-themes` endpoint; existing `createWeeklyDump()`, `getCurrentWeekMonday()`, `getWeekStart()`
- Produces: rewritten Ideas tab with 3 states (no plan / themes shown / theme picked)

This is the largest task. The IdeasTab function in `app/dashboard/page.tsx` needs to be rewritten. The existing IdeasTab is roughly lines 1242-2562. The new version is simpler — 3 states instead of the current complex coaching/generate/display views.

**Important context for the implementer:**

- The IdeasTab function receives these props: `profile`, `allPlans`, `weekEntries`, `allEntries`, `initialDevelopEntries`, `initialWeek`, `onPlanGenerated`, `onPlanUpdated`, `onSwitchToLog`, `onWritePost`, `onStartDraft`, `onProfileUpdated`, `onQuickLog`
- `allPlans` is an array of `ContentPlan` objects — the `plan` field is JSONB that can be either the old `ContentPlanData` shape or the new `WeeklyThemes` shape
- The coaching mode (`initialDevelopEntries`) must stay — it's triggered from the draft editor's "Explore other angles" link
- Week navigation must stay
- The `onStartDraft` callback opens the StandaloneWriteMode draft editor

- [ ] **Step 1: Add imports for the new types at the top of `app/dashboard/page.tsx`**

Add to the existing planner import:

```typescript
import {
  savePlan,
  updatePlanPosts,
  getCurrentPlan,
  getAllPlans,
  getWeekStart,
  getCurrentWeekMonday,
  type ContentPlan,
  type ContentPlanData,
  type ContentPlanPost,
  createWeeklyDump,
  type WeeklyThemes,
  type Theme,
  saveThemePlan,
  updateThemePick,
} from "@/lib/supabase/planner";
```

- [ ] **Step 2: Find the IdeasTab function and rewrite its non-coaching content**

The IdeasTab currently has 3 views: coaching, generate, display. Keep coaching mode intact. Replace generate + display with the new theme states.

Find where `showGenerate` and the generate/display views are rendered. Replace them with:

**State 1 (no plan for this week):** Show "What's your story this week?" headline, log count, "Show me 3 themes" button.

**State 2 (themes generated, none picked):** Show context line, 3 theme cards with tension/why_now/format badge/"Write about this" button, "Regenerate" link.

**State 3 (theme picked):** Show picked theme highlighted, coaching flow for that theme, "Change theme" link, "Saved for later" collapsed section.

The implementation should:

- Check if the current plan's `plan` field has a `themes` array (new shape) vs `posts` array (old shape)
- For new plans, use `WeeklyThemes`
- For old plans, show them read-only (backward compat)
- When "Show me 3 themes" is clicked: call `/api/generate-themes`, create a dump via `createWeeklyDump("")`, save via `saveThemePlan(dumpId, themesData)`, call `onPlanGenerated(plan)`
- When "Write about this" is clicked: call `updateThemePick(planId, index)`, trigger coaching with the theme's tension as the starting prompt
- Fetch `pastThemes` from `allPlans` — filter for plans with `picked_theme_index !== null`, extract the picked theme's tension

- [ ] **Step 3: Implement State 1 (no plan)**

Inside the IdeasTab, after the coaching mode check, add:

```typescript
// Determine if current plan uses new theme format
const currentPlan = allPlans.find((p) => p.week_start === targetWeek || p.week_start === planTargetWeek);
const isThemePlan = currentPlan?.plan && "themes" in currentPlan.plan;
const themePlan = isThemePlan ? (currentPlan!.plan as unknown as WeeklyThemes) : null;
const hasCurrentPlan = !!currentPlan;

// State tracking
const [generating, setGenerating] = useState(false);

// Past picked themes for continuity
const pastPickedThemes = allPlans
  .filter((p) => "themes" in p.plan && (p.plan as unknown as WeeklyThemes).picked_theme_index !== null)
  .map((p) => {
    const wt = p.plan as unknown as WeeklyThemes;
    return wt.themes[wt.picked_theme_index!]?.tension;
  })
  .filter(Boolean);
```

State 1 JSX (when `!hasCurrentPlan`):

```typescript
if (!hasCurrentPlan) {
  const weekLogCount = weekEntries.length;
  return (
    <div style={{ padding: "60px 24px", textAlign: "center", maxWidth: 520, margin: "0 auto" }}>
      <h2 className="font-serif" style={{ fontSize: 28, fontWeight: 600, color: INK, marginBottom: 12 }}>
        What&apos;s your story this week?
      </h2>
      <p className="font-sans" style={{ fontSize: 16, color: DIM, marginBottom: 32, lineHeight: 1.6 }}>
        {weekLogCount > 0
          ? `You logged ${weekLogCount} moment${weekLogCount === 1 ? "" : "s"} this week.`
          : "No logs yet — that's fine. We'll work with what we know about your voice."}
      </p>
      <button
        onClick={async () => {
          setGenerating(true);
          try {
            const res = await fetch("/api/generate-themes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                profile,
                entries: weekEntries,
                pastThemes: pastPickedThemes,
              }),
            });
            const data = await res.json();
            if (data.themes?.length) {
              const dump = await createWeeklyDump("");
              if (dump) {
                const themesData: WeeklyThemes = {
                  themes: data.themes,
                  picked_theme_index: null,
                  context: data.context || "",
                };
                const plan = await saveThemePlan(dump.id, themesData);
                if (plan) onPlanGenerated(plan);
              }
            }
          } catch (err) {
            console.error("Theme generation failed:", err);
          } finally {
            setGenerating(false);
          }
        }}
        disabled={generating}
        className="px-8 py-4 rounded-full font-sans font-semibold text-[16px]"
        style={{
          background: BLUE,
          color: "#fff",
          border: "none",
          cursor: generating ? "wait" : "pointer",
          opacity: generating ? 0.6 : 1,
        }}
      >
        {generating ? "Thinking..." : "Show me 3 themes"}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Implement State 2 (themes shown, none picked)**

When `isThemePlan && themePlan && themePlan.picked_theme_index === null`:

```typescript
const FORMAT_LABELS: Record<string, string> = {
  story: "Story",
  lesson: "Lesson",
  framework: "Framework",
  "contrarian-take": "Contrarian take",
};

return (
  <div style={{ padding: "32px 24px", maxWidth: 640, margin: "0 auto" }}>
    {/* Context line */}
    {themePlan.context && (
      <p className="font-sans text-[14px] mb-6" style={{ color: DIM, lineHeight: 1.5 }}>
        {themePlan.context}
      </p>
    )}

    {/* Theme cards */}
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {themePlan.themes.map((theme, i) => (
        <div
          key={i}
          style={{
            background: "#fff",
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            padding: "24px 28px",
          }}
        >
          <p className="font-sans" style={{ fontSize: 18, fontWeight: 700, color: INK, lineHeight: 1.4, marginBottom: 8 }}>
            {theme.tension}
          </p>
          <p className="font-sans text-[14px]" style={{ color: DIM, lineHeight: 1.5, marginBottom: 16 }}>
            {theme.why_now}
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span
              className="font-mono text-[11px] uppercase"
              style={{
                color: BLUE,
                fontWeight: 600,
                letterSpacing: "0.04em",
                background: `${BLUE}10`,
                padding: "4px 10px",
                borderRadius: 6,
              }}
            >
              {FORMAT_LABELS[theme.format] || theme.format}
            </span>
            <button
              onClick={async () => {
                const updated = await updateThemePick(currentPlan!.id, i);
                if (updated) onPlanUpdated(updated);
              }}
              className="font-sans text-[14px] font-semibold"
              style={{
                background: BLUE,
                color: "#fff",
                border: "none",
                borderRadius: 20,
                padding: "8px 20px",
                cursor: "pointer",
              }}
            >
              Write about this
            </button>
          </div>
        </div>
      ))}
    </div>

    {/* Regenerate */}
    <div style={{ textAlign: "center", marginTop: 24 }}>
      <button
        onClick={async () => {
          setGenerating(true);
          try {
            const res = await fetch("/api/generate-themes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                profile,
                entries: weekEntries,
                pastThemes: pastPickedThemes,
              }),
            });
            const data = await res.json();
            if (data.themes?.length) {
              const themesData: WeeklyThemes = {
                themes: data.themes,
                picked_theme_index: null,
                context: data.context || "",
              };
              const updated = await updatePlanPosts(currentPlan!.id, themesData as unknown as ContentPlanData);
              if (updated) onPlanUpdated(updated);
            }
          } catch {}
          setGenerating(false);
        }}
        disabled={generating}
        className="font-sans text-[13px]"
        style={{ background: "none", border: "none", color: DIM, cursor: "pointer" }}
      >
        {generating ? "Regenerating..." : "Regenerate themes"}
      </button>
    </div>
  </div>
);
```

- [ ] **Step 5: Implement State 3 (theme picked)**

When `isThemePlan && themePlan && themePlan.picked_theme_index !== null`:

```typescript
const picked = themePlan.themes[themePlan.picked_theme_index];
const queuedThemes = themePlan.themes.filter((_, i) => i !== themePlan.picked_theme_index);
const [showQueued, setShowQueued] = useState(false);

return (
  <div style={{ padding: "32px 24px", maxWidth: 640, margin: "0 auto" }}>
    {/* Picked theme */}
    <div
      style={{
        background: `${BLUE}08`,
        border: `2px solid ${BLUE}30`,
        borderRadius: 14,
        padding: "24px 28px",
        marginBottom: 24,
      }}
    >
      <p className="font-mono text-[11px] uppercase mb-2" style={{ color: BLUE, fontWeight: 600, letterSpacing: "0.04em" }}>
        This week&apos;s theme
      </p>
      <p className="font-sans" style={{ fontSize: 20, fontWeight: 700, color: INK, lineHeight: 1.4, marginBottom: 8 }}>
        {picked.tension}
      </p>
      <p className="font-sans text-[14px]" style={{ color: DIM, lineHeight: 1.5 }}>
        {picked.why_now}
      </p>
    </div>

    {/* Change theme link */}
    <button
      onClick={async () => {
        // Reset pick — set picked_theme_index back to null
        const themesData: WeeklyThemes = {
          ...themePlan,
          picked_theme_index: null,
          themes: themePlan.themes.map((t) => ({ ...t, queued: false })),
        };
        const updated = await updatePlanPosts(currentPlan!.id, themesData as unknown as ContentPlanData);
        if (updated) onPlanUpdated(updated);
      }}
      className="font-sans text-[13px] mb-8 block"
      style={{ background: "none", border: "none", color: DIM, cursor: "pointer" }}
    >
      &larr; Change theme
    </button>

    {/* Write CTA — opens draft editor with theme as starting point */}
    <button
      onClick={async () => {
        const d = await createStandaloneDraft("", picked.tension, picked.source_entry_id || "");
        if (d) onStartDraft({ draft: d });
      }}
      className="w-full py-3.5 rounded-full font-sans font-semibold text-[15px] mb-6"
      style={{ background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}
    >
      Start writing
    </button>

    {/* Saved for later */}
    {queuedThemes.length > 0 && (
      <div>
        <button
          onClick={() => setShowQueued(!showQueued)}
          className="font-mono text-[11px] uppercase flex items-center gap-1"
          style={{ color: FAINT, background: "none", border: "none", cursor: "pointer", letterSpacing: "0.05em", fontWeight: 500 }}
        >
          Saved for later ({queuedThemes.length}){" "}
          <span style={{ fontSize: 10, transition: "transform 0.2s", transform: showQueued ? "rotate(0)" : "rotate(-90deg)" }}>▼</span>
        </button>
        {showQueued && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {queuedThemes.map((theme, i) => (
              <div
                key={i}
                style={{
                  background: "#f9fafb",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 10,
                  padding: "16px 20px",
                }}
              >
                <p className="font-sans text-[15px]" style={{ color: INK, fontWeight: 600, lineHeight: 1.4 }}>
                  {theme.tension}
                </p>
                <p className="font-sans text-[13px] mt-1" style={{ color: FAINT }}>
                  {FORMAT_LABELS[theme.format] || theme.format}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    )}
  </div>
);
```

- [ ] **Step 6: Handle old plan format (backward compat)**

For plans that have `posts` array (old format), show them read-only. Add a check before the new theme states:

```typescript
// Old plan format — show read-only
if (hasCurrentPlan && !isThemePlan) {
  // Keep existing display logic for old plans, or show a simple message
  return (
    <div style={{ padding: "32px 24px", maxWidth: 640, margin: "0 auto" }}>
      <p className="font-sans text-[15px]" style={{ color: DIM }}>
        This week has a plan from an earlier version. Switch to the new format?
      </p>
      <button
        onClick={async () => {
          // Generate new themes to replace old plan
          setGenerating(true);
          try {
            const res = await fetch("/api/generate-themes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ profile, entries: weekEntries, pastThemes: pastPickedThemes }),
            });
            const data = await res.json();
            if (data.themes?.length) {
              const themesData: WeeklyThemes = { themes: data.themes, picked_theme_index: null, context: data.context || "" };
              const updated = await updatePlanPosts(currentPlan!.id, themesData as unknown as ContentPlanData);
              if (updated) onPlanUpdated(updated);
            }
          } catch {}
          setGenerating(false);
        }}
        disabled={generating}
        className="mt-4 px-6 py-3 rounded-full font-sans font-semibold text-[14px]"
        style={{ background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}
      >
        {generating ? "Generating..." : "Generate themes instead"}
      </button>
    </div>
  );
}
```

- [ ] **Step 7: Wire up the `createStandaloneDraft` import if not already imported**

Check that `createStandaloneDraft` is imported from `@/lib/supabase/drafts`. It should already be imported — verify.

- [ ] **Step 8: Verify it compiles and test manually**

Run: `npm run dev`
Navigate to dashboard Ideas tab. Verify:

- State 1 shows when no plan exists
- Clicking "Show me 3 themes" generates themes
- State 2 shows 3 theme cards
- Clicking "Write about this" picks a theme
- State 3 shows the picked theme with "Start writing" button

- [ ] **Step 9: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: rewrite Ideas tab to show weekly content themes"
```
