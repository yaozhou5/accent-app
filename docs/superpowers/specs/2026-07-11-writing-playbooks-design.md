# Writing Playbooks (Playbooks Tab — Priority 1)

**Date:** 2026-07-11
**Status:** Approved
**Problem:** Users open the dashboard and don't know how to structure a post. They have things to say but no scaffolding.
**Solution:** A Playbooks tab with 9 proven writing structures. User picks one, fills in their thinking section by section, and saves a draft. The playbook is scaffolding — it helps you build, but the final output is one smooth piece.

---

## Tab Bar

```
Log · Playbooks · History
```

Same styling as current tabs. Playbooks is the new middle tab.

---

## 1. Playbook Data Model

### Static definitions (`lib/playbooks.ts`)

```typescript
interface PlaybookSection {
  id: string; // "bold-claim"
  label: string; // "Bold claim"
  helper: string; // "What do most people get wrong? One sentence."
}

interface Playbook {
  id: string; // "contrarian-flip"
  name: string; // "The contrarian flip"
  tagline: string;
  category: "content" | "email";
  sections: PlaybookSection[];
  estimateWords: number;
  bestFor: string[];
}
```

All 9 playbooks hardcoded as a `PLAYBOOKS` array. Exported alongside `getPlaybook(id: string): Playbook | undefined`.

### The 9 Playbooks

**Content playbooks:**

1. **contrarian-flip** — "Challenge how most people think about something. You've seen the other side."
   - Sections: Bold claim → Why they think that → What you've seen instead → One-line takeaway
   - ~200 words. Best for: LinkedIn, Substack, X

2. **story-to-lesson** — "Something happened. You learned from it. Share both."
   - Sections: What happened → What you expected → What actually happened → What it taught you
   - ~250 words. Best for: LinkedIn, Substack, 小红书

3. **insider-truth** — "Your industry says one thing publicly. The reality is different."
   - Sections: What people hear → What actually happens → Why the gap exists → What to do about it
   - ~200 words. Best for: LinkedIn, X, Substack

4. **build-log** — "Show what you made this week. Process over polish."
   - Sections: What you worked on → One decision you made → Why → What's next
   - ~100 words. Best for: X, LinkedIn, 小红书

5. **list-takeaway** — "Distill what you know into a handful of sharp points."
   - Sections: Context (one sentence) → 3-5 points (each one a full thought) → Why this matters
   - ~200 words. Best for: LinkedIn, X, newsletter

6. **origin-story** — "Why you're building this. The real version."
   - Sections: What you were doing before → The moment something shifted → What you did about it → Where you are now → What you believe because of it
   - ~400 words. Best for: Substack, LinkedIn, About page

**Email playbooks:**

7. **cold-intro** — "Reach out to someone who doesn't know you yet."
   - Sections: Why you're writing (one sentence) → What you noticed about their work → What you're building → The ask (specific, small)
   - ~80 words

8. **follow-up** — "They haven't replied. Nudge without being annoying."
   - Sections: Reference the original message → Add one new thing → Restate the ask
   - ~50 words

9. **polite-push** — "You need something from someone. Be direct without being demanding."
   - Sections: Context (what was agreed) → Where things stand → What you need → By when
   - ~60 words

### Draft extensions

Two new columns on the `drafts` table:

- `playbook_id TEXT DEFAULT NULL` — which playbook was used
- `playbook_sections JSONB DEFAULT NULL` — `Record<string, string>` mapping section id → user text

**Flattening for output:** When voice check, copy, or publish is triggered, concatenate section values with `\n\n` between them, skip empties. The sections are scaffolding, not formatting — the final output reads as one continuous piece.

**Storage:** Sections are saved as structured JSONB so the editor can restore them. The flat `content` field is also updated on each save (concatenated) for backward compat with History rendering and search.

---

## 2. Playbooks Tab

The tab shows a vertical list of playbook cards grouped by category.

### Category headers

Small uppercase mono text (same style as section badges elsewhere):

- `CONTENT PLAYBOOKS`
- `EMAIL PLAYBOOKS`

### Playbook cards

Each card shows:

- **Name** — bold, primary text (e.g. "The contrarian flip")
- **Tagline** — grey, secondary text
- **Bottom line** — section count + word estimate (e.g. "4 sections · ~200 words")

Cards are tappable. Tapping opens the PlaybookEditor with a new draft.

No search, filtering, or favorites. 9 cards is small enough to scan.

---

## 3. PlaybookEditor Component

### File: `components/PlaybookEditor.tsx`

### Entry points

- Tapping a playbook card in the Playbooks tab (new draft)
- Tapping a playbook-tagged draft in History (reopens with sections restored)

### Props

```typescript
{
  playbook: Playbook;
  draft?: Draft;          // null for new, existing for reopened
  profile: UserProfile;
  onBack: () => void;
  onSaveDone: () => void;
}
```

### Layout

**Top bar:** `← Back` + playbook name

**Editor area:** One continuous writing space with soft section prompts. Each section:

- **Label:** small uppercase mono, muted color (e.g. `BOLD CLAIM`)
- **Helper text:** grey, below the label (e.g. "What do most people get wrong? One sentence.")
- **Textarea:** no border, clean, auto-expanding
- **Dashed divider** between sections (not hard borders)

**Fade behavior:** Once the user types in a section, the helper text fades out (CSS opacity transition). The label stays visible. If they clear the text, helper fades back in.

**Bottom actions:**

- "Voice check" — flattens sections into continuous text, runs the existing inline annotations flow (same "Show edits" pattern from StandaloneWriteMode — calls `/api/voice-notes`, highlights phrases, popovers with Apply/Dismiss)
- "Save draft" — saves to `drafts` table with `playbook_id`, `playbook_sections`, and flattened `content`. Navigates back via `onSaveDone()`.

**Auto-save:** Same pattern as StandaloneWriteMode — 30-second interval + 1-second debounce after typing.

### When reopened from History

Reads `playbook_sections` from the draft and populates each section's textarea. The user picks up where they left off with the full scaffolding intact.

---

## 4. History Tab Integration

### Playbook tag on draft cards

When a draft has a `playbook_id`, show the playbook name as a small blue tag on the draft card (left side, same row as the existing "Draft" badge). E.g. a subtle `contrarian flip` tag.

### Opening playbook drafts

Tapping a draft with `playbook_id` opens `PlaybookEditor` with sections restored — NOT `StandaloneWriteMode`. If `playbook_sections` is null (edge case), fall back to `StandaloneWriteMode` with flat `content`.

### No changes to non-playbook drafts

They continue opening in the existing `StandaloneWriteMode`.

---

## 5. Files Summary

### New files

| File                            | Purpose                                                    |
| ------------------------------- | ---------------------------------------------------------- |
| `lib/playbooks.ts`              | Playbook definitions (9 playbooks), types, `getPlaybook()` |
| `components/PlaybookEditor.tsx` | Sectioned writing editor                                   |

### Modified files

| File                     | Change                                                         |
| ------------------------ | -------------------------------------------------------------- |
| `app/dashboard/page.tsx` | Add Playbooks tab, mount PlaybookEditor, History playbook tags |
| `lib/supabase/drafts.ts` | Add `playbook_id` and `playbook_sections` to Draft type        |

### Database migration

```sql
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS playbook_id TEXT DEFAULT NULL;
ALTER TABLE drafts ADD COLUMN IF NOT EXISTS playbook_sections JSONB DEFAULT NULL;
```

---

## 6. Not Building (this cycle)

- My Roadmap (Priority 2 — separate spec)
- Roadmap ↔ playbook connections (Priority 3)
- Notes sidebar while writing
- Playbook creation/editing by user
- AI-generated playbook suggestions
