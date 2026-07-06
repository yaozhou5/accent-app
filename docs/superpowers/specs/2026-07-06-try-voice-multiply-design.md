# Try Your Voice + Multiply

**Date:** 2026-07-06
**Status:** Approved
**Problem:** After the voice test, new users land on an empty dashboard with nothing to do. There's no moment where they see their voice profile in action.
**Solution:** A "Try Your Voice" onboarding step that turns one rough thought into a polished draft, plus a "Multiply" flow that adapts that draft for multiple platforms — all in the user's voice.

---

## New User Flow

```
/voice → result → email → magic link → /voice/try → write + multiply → /dashboard
```

---

## 1. Try Your Voice Page

### Route

`app/voice/try/page.tsx` — appears after voice report, before dashboard.

### Middleware Gate

After magic link auth:

- User has `voice_profile` but zero log entries → redirect to `/voice/try`
- User has 1+ log entries → straight to `/dashboard`
- User has no profile row → redirect to `/voice`

### Phase 1: Input

- Background: `#F7F4EF` (cream)
- Headline (serif): "See what your voice can do"
- Subtext (sans): "Drop a rough thought. A rant, a note, something you explained to someone today."
- Large textarea, no character limit
- Placeholder: "e.g. I think most people approach hiring wrong because they look for skills instead of taste..."
- Button: "Write it in my voice"
- Calls `/api/generate-draft` with the user's voice profile (already saved from voice test)
- Auto-saves: raw input saved as a log entry, generated draft saved to `drafts` table

### Phase 2: Result

- Voice profile header: "Written in your voice · [top 3 traits]."
- Read-only draft display (styled as a card, not editable)
- `<MultiplyPanel />` component below (collapsed by default)
- Two CTAs:
  - Primary: "Multiply this" → expands the MultiplyPanel
  - Secondary: "Go to dashboard" → redirects to `/dashboard`

### Auto-save

Both the raw input (as a log entry) and the draft are saved automatically when the draft is generated — not deferred to "Go to dashboard." The user's first log entry and first draft exist regardless of which CTA they tap.

---

## 2. Multiply API

### Endpoint: `/api/multiply`

**Input:**

```typescript
{
  draftText: string;
  voiceProfile: VoiceProfile;
  platform: "linkedin" | "twitter" | "newsletter" | "short";
}
```

**Output:** Streamed text (same streaming pattern as `/api/generate-draft`).

**Auth:** Required (must be logged in).

**Model:** claude-sonnet-4-6. Streaming. Max tokens: 1000.

### Prompt Construction

Uses the same `buildVoiceInstructions()` function from `/api/generate-draft` (the score-proportional voice instructions). Plus platform-specific rules:

- **LinkedIn:** Professional but personal. Hook in the first line. Line breaks for readability. End with a question or insight. 150-300 words. No hashtags.
- **X/Twitter:** Punchy, compressed. AI decides single tweet vs thread based on content length. If thread, number the tweets. Under 280 chars per tweet.
- **Newsletter:** Warmer, more expansive, conversational. Assumes the reader opted in and cares. 200-400 words.
- **Short post:** Instagram/general short-form. One core idea. Concise. Casual. 50-150 words.

System prompt emphasizes: "You are adapting an existing draft for a different platform. Preserve the core insight and the author's voice. Don't just shorten — rewrite for how people read on this platform."

---

## 3. MultiplyPanel Component

### File: `components/MultiplyPanel.tsx`

### Props

```typescript
{
  draftText: string;
  voiceProfile: VoiceProfile;
}
```

### UI

- Horizontal tab bar with 4 platforms: LinkedIn, X/Twitter, Newsletter, Short post
- Each tab has a subtle left border or background tint:
  - LinkedIn: `#0A66C2` (blue)
  - X/Twitter: `#1A1A18` (black)
  - Newsletter: `#D97706` (amber)
  - Short post: `#E85D3A` (coral)
- Active tab gets its color as a light background wash
- Content area shows generated text for the active tab
- "Copy" button per tab (copies text, shows "Copied!" for 2 seconds)
- Below tabs: "Written in your voice · [top 3 traits]." label
- Mobile: tabs are horizontally scrollable

### On-Demand Generation

- Tapping a tab fires `/api/multiply` for that platform only if not already generated
- Results cached in component state (`Record<string, string>`)
- Switching back to a previously generated tab shows cached result instantly
- Streaming display while generating

### State

```typescript
{
  activeTab: "linkedin" | "twitter" | "newsletter" | "short";
  generated: Record<string, string>;
  loading: string | null;
}
```

### Mount Points

1. **`/voice/try`** — shown after draft generation. "Multiply this" CTA expands it.
2. **`StandaloneWriteMode`** in dashboard — "Multiply" button in the draft editor toolbar (alongside Regenerate). Toggles the panel below the textarea. Only shows when `draft.source_entry_id` and `profile.voice_profile` exist.

---

## 4. Design System

- Background: `#F7F4EF` (cream)
- Primary text: `#1A1A18` (INK)
- Secondary text: `#6B6860` (DIM)
- Labels: `#A8A49C` (FAINT)
- Primary action: `#4A6CF7` (BLUE)
- Borders: `#e5e7eb` (BORDER)
- Headings: serif (Fraunces if loaded, Georgia fallback)
- Body: sans-serif (DM Sans if loaded, system sans fallback)

---

## 5. Files Summary

### New Files

| File                           | Purpose                        |
| ------------------------------ | ------------------------------ |
| `app/voice/try/page.tsx`       | Try Your Voice onboarding page |
| `app/api/multiply/route.ts`    | Platform adaptation endpoint   |
| `components/MultiplyPanel.tsx` | Shared multiply UI component   |

### Modified Files

| File                     | Change                                                                    |
| ------------------------ | ------------------------------------------------------------------------- |
| `middleware.ts`          | Add voice_profile + zero-logs gate for `/voice/try`                       |
| `app/dashboard/page.tsx` | Add "Multiply" button to StandaloneWriteMode toolbar, mount MultiplyPanel |

### Not Touched

- Voice exercise, result screen, report email
- Log tab
- Ideas tab (weekly themes)
- Settings
- `/api/generate-draft` (reused as-is)
- `/api/voice-notes` (stays in draft editor)

---

## 6. Not Building

- Saving multiplied versions as separate drafts (just copy for now)
- Platform-specific analytics
- Cultural annotations, audience inference
- Scheduling / auto-posting
