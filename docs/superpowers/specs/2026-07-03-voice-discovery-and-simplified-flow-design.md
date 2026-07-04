# Voice Discovery Exercise + Simplified App Flow

**Date:** 2026-07-03
**Status:** Approved
**Problem:** 89% of activated users never return — time-to-value is too long (requires a week of logging + coaching to get a draft).
**Solution:** 60-second voice discovery exercise as onboarding → one-tap draft generation from any note.

---

## New User Flow

```
Sign up → Interview (step 1, keep) → Voice exercise (step 2, new) → Dashboard → Log a note → Tap Post → Draft in your voice → Edit and ship
```

---

## 1. Voice Discovery Exercise

### Route

`/onboard/2/page.tsx` — replaces current goals step. Current steps 2 (`/onboard/2`) and 3 (`/onboard/3`) are deleted.

### UX Flow

1. **Intro screen** — "Find your voice in 60 seconds." Brief explanation. CTA: "Start."
2. **12 pairs, one at a time.** Two text samples shown side by side (stacked on mobile). User taps the one that sounds more like them. No dimension labels visible — just raw text.
3. **Progress bar** at top (1/12 → 12/12).
4. **Result screen** after pair 12 (auto-transition).

### The 12 Pairs

| #   | Dimension   | Option A (+1)                                                                                              | Option B (−1)                                                                                          |
| --- | ----------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1   | directness  | "The project is behind schedule. Here's what we're changing."                                              | "I wanted to share some thoughts on where the project stands and a few adjustments we're considering." |
| 2   | directness  | "Don't reply-all to this thread."                                                                          | "It might be worth keeping this conversation to the people directly involved."                         |
| 3   | precision   | "We closed 12 deals last month, up from 7. Average contract value dropped from $34K to $28K."              | "We closed more deals last month, but the average deal size was a bit smaller than before."            |
| 4   | precision   | "The meeting ran 40 minutes over. We covered 3 of the 8 agenda items."                                     | "The meeting went long and we didn't get through everything."                                          |
| 5   | temperature | "Honestly, I was embarrassed by how that presentation went."                                               | "The presentation didn't go as planned, but there are clear takeaways."                                |
| 6   | temperature | "This is the part of the job that keeps me up at night."                                                   | "This is one of the harder challenges we're working through right now."                                |
| 7   | authority   | "We need to cut this feature. It's not working."                                                           | "I wonder if this feature is pulling its weight. Worth discussing."                                    |
| 8   | authority   | "The best teams I've seen all do this differently."                                                        | "I've noticed something interesting about how some teams handle this."                                 |
| 9   | rhythm      | "Tried it. Didn't work. Moved on."                                                                         | "We gave it a fair shot over a few weeks, but ultimately decided to take a different approach."        |
| 10  | framing     | "Last Thursday a client called me at 9pm and said three words that changed how I think about our service." | "Three things I've learned about what clients actually want from us."                                  |
| 11  | framing     | "I was sitting in the parking lot after the meeting, replaying the conversation in my head."               | "Here's a breakdown of what went well and what we should do differently next time."                    |
| 12  | energy      | "Nobody talks about this enough."                                                                          | "Something I've been reflecting on recently."                                                          |

### Scoring

- Option A = +1, Option B = −1 on that dimension.
- Dimensions with 2 pairs: directness, precision, temperature, authority, framing (score range: −2 to +2).
- Dimensions with 1 pair: rhythm, energy (score range: −1 to +1).
- Normalize all to −1 to +1 for display (divide 2-pair dimensions by 2).

### Spectrum Labels

| Dimension   | Low (−)         | High (+)    |
| ----------- | --------------- | ----------- |
| directness  | Contextual      | Direct      |
| precision   | Impressionistic | Precise     |
| temperature | Cool            | Warm        |
| authority   | Inviting        | Assertive   |
| rhythm      | Flowing         | Staccato    |
| framing     | Structurer      | Storyteller |
| energy      | Reflective      | Provocative |

### Result Screen

1. **Headline:** Top 3 strongest traits by absolute score (e.g. "Direct. Precise. Provocative.")
2. **7 spectrum bars:** Horizontal bars showing position on each dimension (left label ←●———→ right label).
3. **"Your edge" paragraph:** AI-generated via `/api/voice-result`. Explains what makes their voice strong based on the profile.
4. **"Watch out for" paragraph:** AI-generated. The gap/blind spot.
5. **CTA:** "Start logging" → `/dashboard`

### Data Persistence

New `voice_profile` JSONB column on `profiles` table:

```typescript
interface VoiceProfile {
  dimensions: {
    directness: number; // -2 to +2 (raw), normalized to -1..+1 for display
    precision: number; // -2 to +2
    temperature: number; // -2 to +2
    authority: number; // -2 to +2
    rhythm: number; // -1 to +1
    framing: number; // -2 to +2
    energy: number; // -1 to +1
  };
  top_traits: string[]; // top 3 trait labels
  edge: string; // AI-generated paragraph
  gap: string; // AI-generated paragraph
  completed_at: string; // ISO timestamp
}
```

Saved to Supabase after result screen renders.

### New API Endpoint: `/api/voice-result`

**Input:** dimension scores + business context (from step 1).
**Output:** `{ edge: string, gap: string }` — two short paragraphs.
**Model:** Claude Sonnet. Short system prompt: given these voice dimensions and this person's business context, write a 2-sentence "edge" (what makes their voice distinctive and effective) and a 2-sentence "gap" (what to watch out for — the blind spot of this voice profile).

---

## 2. Auto-Generate Draft from Note

### UI Change: "Post" Button on Log Entries

Every log entry card in the Log tab gets a **"Post" button** — visually primary (filled blue). The existing "Develop" action becomes secondary (text link or icon).

Tapping "Post":

1. Shows loading state on the card.
2. Calls `/api/generate-draft`.
3. Creates draft in `drafts` table.
4. Marks log entry as used.
5. Switches to Drafts tab with the new draft open in edit mode.

**No platform picker.** The API reads the user's primary platform from `profiles.platforms[0]`. Platform switching happens in the draft editor after the draft exists.

### New API Endpoint: `/api/generate-draft`

**Input:**

```typescript
{
  entry_id: string;
  entry_content: string;
  voice_profile: VoiceProfile;
  business_context: string; // business_description + interview answers from step 1
  platform: string; // auto-filled from profiles.platforms[0]
}
```

**Output:** Streamed string — one complete, ready-to-edit draft.

**Prompt construction:**

- Voice profile dimensions → writing style instructions (e.g. directness: +2 → "Write directly. State conclusions first. No hedging.")
- Business context → who they are, what they build, who it's for.
- Note content → the raw material / story seed.
- Platform → length and format constraints (LinkedIn = narrative post, X = punchy thread).

**Model:** Claude Sonnet. Streaming response.

### Regenerate

Draft editor gets a "Regenerate" button. Calls the same `/api/generate-draft` endpoint. Overwrites current draft content. No version history.

### Develop Flow (Coaching) — Demoted, Not Removed

- "Develop" action still available on log entries as a secondary link.
- The coaching conversation flow (`/api/coach-note`) is unchanged.
- Users who want more control can still use it.
- The Ideas tab continues to work as-is.

---

## 3. Remove "Make It Hit" Game

### Files to Delete

- `/app/play/page.tsx` and `/app/play/` directory
- `/app/game/page.tsx` and `/app/game/` directory (if exists)

### Redirects

- `/play` → 301 redirect to `/`
- `/game` → 301 redirect to `/`

Implement via Next.js `redirects` in `next.config.js`.

### Landing Page Cleanup (`/app/page.tsx`)

- Remove any "Play the game" or "Make It Hit" CTAs/links.
- Update the flow description to reflect: "Sign up → Discover your voice → Log a moment → Get a draft in 60 seconds."
- The voice exercise is NOT exposed on the landing page — onboarding-only, behind signup.

### What Stays

- `/check` writing tool — separate, still valuable.
- `agent_waitlist` table — other flows use it.
- `VoiceWaitlistCard` component — used elsewhere.
- PostHog event names (`game_completed`, `game_email_signup`) — just dead code, harmless.

---

## 4. Onboarding Redirect Logic

### Current Flow

```
signup → /onboard/1 → /onboard/2 (goals) → /onboard/3 (platforms) → /dashboard
```

### New Flow

```
signup → /onboard/1 (interview, keep as-is) → /onboard/2 (voice exercise) → /dashboard
```

### Changes

- `/onboard/1/page.tsx`: Change redirect from `/onboard/2` to `/onboard/2` (same route, new content). Remove the `?develop=<entryId>` redirect — user goes to voice exercise next, not dashboard.
- `/onboard/2/page.tsx`: Complete rewrite (voice exercise). On completion → `/dashboard`.
- `/onboard/3/page.tsx`: Delete.
- Dashboard gate: Check `profile.voice_profile?.completed_at` instead of (or in addition to) `profile.onboarding_completed`. If voice profile is missing, redirect to `/onboard/2`.

### Existing Users

Users who already completed the old onboarding won't have a `voice_profile`. They should NOT be forced through the exercise. The "Post" button gracefully handles missing voice profiles:

- If `voice_profile` exists → generate draft using it.
- If `voice_profile` is null → show a prompt: "Take 60 seconds to discover your voice" linking to `/onboard/2`. Or fall back to generating without voice instructions (generic but functional).

---

## 5. Database Changes

### Migration: Add `voice_profile` column

```sql
ALTER TABLE profiles
ADD COLUMN voice_profile JSONB DEFAULT NULL;
```

No other schema changes. The existing `voice_tone`, `posts_that_work`, `posts_that_flop` columns from the old onboard step 3 become unused but are left in place (no destructive migration).

---

## 6. New Files Summary

| File                           | Purpose                                                       |
| ------------------------------ | ------------------------------------------------------------- |
| `/onboard/2/page.tsx`          | Voice discovery exercise (complete rewrite)                   |
| `/api/voice-result/route.ts`   | Generate edge/gap paragraphs from voice dimensions            |
| `/api/generate-draft/route.ts` | Note → complete draft using voice profile                     |
| `/lib/voice-dimensions.ts`     | Pair data, scoring logic, dimension labels (shared constants) |

### Files Modified

| File                        | Change                                             |
| --------------------------- | -------------------------------------------------- |
| `/onboard/1/page.tsx`       | Change redirect target (remove develop param)      |
| `/app/dashboard/page.tsx`   | Add "Post" button to log entries, demote "Develop" |
| `/lib/supabase/profiles.ts` | Add `voice_profile` type to UserProfile            |
| `/app/page.tsx`             | Remove game CTAs, update flow description          |
| `next.config.js`            | Add /play and /game redirects                      |

### Files Deleted

| File                  | Reason                     |
| --------------------- | -------------------------- |
| `/onboard/3/page.tsx` | Replaced by voice exercise |
| `/app/play/page.tsx`  | Game removed               |
| `/app/game/page.tsx`  | Game removed (if exists)   |

---

## 7. Not Touched

- Log functionality (capture, tags, images, search)
- Existing user data in database
- Authentication (signup, login, magic links)
- Drafts tab (editing, publishing workflow)
- `/check` writing tool
- Coaching conversation flow (demoted but not removed)
- `ShelfTab` / craft library
- Settings page
