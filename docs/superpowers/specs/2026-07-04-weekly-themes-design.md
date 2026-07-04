# Weekly Content Themes (Layer 1: Plan)

**Date:** 2026-07-04
**Status:** Approved
**Problem:** Users don't know what to write about each week. Without direction, they don't come back.
**Solution:** Every week, Accent suggests 3 content themes. User picks one as their pillar. The other two queue for later. Themes get sharper as the user logs more.

---

## What a Theme Is

A theme is a specific tension or insight — not a category, not a finished headline. The user reads it and thinks "I have something to say about that."

- Too vague: "Product updates"
- Too specific: "Why your onboarding flow is your best sales tool: 3 lessons from our last 50 signups"
- Right level: "The gap between what users expect from your onboarding and what they actually get"

Each theme includes:

1. **Tension** — the insight in one sentence
2. **Why now** — why it resonates this week (tied to a log entry, trend, or pattern)
3. **Format** — suggested approach: story, lesson, framework, or contrarian take

---

## Data Model

Reuse the existing `content_plans` table. The `plan` JSONB column stores a new shape:

```typescript
interface WeeklyThemes {
  themes: Theme[];
  picked_theme_index: number | null;
  context: string; // why these themes this week (1 sentence)
}

interface Theme {
  tension: string;
  why_now: string;
  format: "story" | "lesson" | "framework" | "contrarian-take";
  source: "log" | "profile" | "voice";
  source_entry_id?: string;
  queued: boolean;
}
```

- `picked_theme_index`: null until user picks one, then 0/1/2
- `queued`: false for the picked theme, true for the other two
- `source`: "log" if tied to an entry, "profile" if from business context, "voice" if generated from voice dimensions alone

The `weekly_dumps` table stays. Stores raw log entries used as input. If zero logs, dump content is empty string.

The `drafts` table is unchanged. When the user picks a theme and writes, the draft links back via `plan_id`.

---

## Theme Generation

### New endpoint: `/api/generate-themes`

**Input:**

```typescript
{
  profile: UserProfile;
  entries: LogEntry[];         // current week's entries (can be empty)
  pastThemes: string[];        // tensions from previous picked themes (for continuity)
}
```

**Output:**

```typescript
{
  context: string;
  themes: Theme[];  // exactly 3
}
```

**Model:** claude-sonnet-4-6. Non-streaming. Max tokens: 1000.

### Three generation tiers

**Tier 1: Voice only (no logs, no profile fields)**
New users who just completed the voice exercise. No business_description, no what_you_do, no logs. Generate themes from voice dimensions alone.

A provocative, staccato writer gets different themes than a reflective, flowing one. Example: a Direct + Provocative voice might get "The thing everyone in your industry knows but nobody says out loud" while a Contextual + Reflective voice gets "What you learned this week that changed how you think about your work."

These are broader but still useful. They get the user writing.

**Tier 2: Profile context (no logs)**
User has business_description, what_you_do, platforms, goals. Themes are sharper — tied to their business and audience. Still no specific moments.

**Tier 3: Profile + logs**
User has logged moments this week. Themes connect to real entries. Each theme's `why_now` references a specific log entry. Source is "log" with `source_entry_id`. This is the best case.

**Continuity:** If `pastThemes` is provided, the prompt instructs Claude to build narrative continuity — "Last week you explored X. This week, the natural next beat is Y." — and to avoid repeating angles.

### Prompt construction

The prompt includes:

- Voice profile dimensions (translated to writing style descriptors)
- Business context (if available): what_you_do, what_you_build, why_you_post, platforms
- This week's log entries (if any): content, tags, dates
- Past picked themes (if any): for continuity and deduplication
- Format: return exactly 3 themes as JSON

---

## Ideas Tab UX

The Ideas tab replaces the current plan generation flow. Three states:

### State 1: No plan for this week

- Headline: "What's your story this week?"
- If logs exist: "You logged {count} moments this week"
- If no logs: "No logs yet — that's fine. We'll work with what we know about your voice."
- CTA: "Show me 3 themes" button
- Tapping calls `/api/generate-themes`, transitions to State 2

### State 2: Themes generated, none picked

- Context line at top (e.g. "Based on your notes about onboarding friction and your reflective, structured voice")
- 3 theme cards, each showing:
  - Tension (bold, primary text)
  - Why now (secondary text)
  - Format badge (story / lesson / framework / contrarian take)
  - "Write about this" button
- "Regenerate" link at bottom
- Tapping "Write about this" sets `picked_theme_index`, marks the other two as `queued: true`, transitions to State 3

### State 3: Theme picked

- Chosen theme displayed at top, highlighted
- Below: the existing Develop coaching flow kicks in — the theme's tension becomes the starting point for the coaching conversation
- "Change theme" link to go back to State 2
- Collapsed "Saved for later" section at bottom showing the 2 queued themes

### Week navigation

Stays as-is. User can browse past weeks and see which theme they picked, what they wrote.

---

## What Changes

### Files modified

| File                               | Change                                                     |
| ---------------------------------- | ---------------------------------------------------------- |
| `app/api/generate-themes/route.ts` | New endpoint (replaces generate-plan for theme generation) |
| `app/dashboard/page.tsx`           | Ideas tab rewritten to show themes instead of post ideas   |
| `lib/supabase/planner.ts`          | Add WeeklyThemes/Theme types, update plan save/fetch       |

### Files NOT touched

- Voice exercise, result screen, report
- Sign up / auth flow
- Log tab
- Draft editor (Develop, voice check, voice notes)
- Settings
- `/api/generate-plan` (kept for backward compat, not called by new UI)

### Database

No schema changes. The `content_plans.plan` column is JSONB — it accepts the new shape without migration.

---

## Not Building

- Layer 2 (Repurpose) — paid, post-MVP
- Layer 3 (Analyze) — post-MVP
- Cultural annotations, audience inference, first language field
- Automatic scheduling / posting
- Theme editing (user picks or regenerates, doesn't edit themes inline)
