# Writing Playbooks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Playbooks tab with 9 proven writing structures. User picks one, fills in sections, saves a draft with structure preserved.

**Architecture:** Playbook definitions are static constants in `lib/playbooks.ts`. `PlaybookEditor` is a new component with sectioned textareas. The dashboard adds a Playbooks tab between Log and History. Drafts extend with `playbook_id` and `playbook_sections` columns.

**Tech Stack:** Next.js App Router, React, Supabase, TypeScript.

## Global Constraints

- Styling: inline styles, design tokens INK `#1A1A18`, BLUE `#4A6CF7`, CREAM `#F7F4EF`, DIM `#6B6860`, FAINT `#A8A49C`, BORDER `#e5e7eb`
- No new dependencies
- Do NOT touch: Log tab, voice exercise, Settings, any API endpoints, Multiply, `/voice/try`
- Playbook definitions are hardcoded, not database-stored

---

### Task 1: Playbook Definitions + Draft Type Extension

**Files:**

- Create: `lib/playbooks.ts`
- Modify: `lib/supabase/drafts.ts`

**Interfaces:**

- Consumes: nothing
- Produces: `Playbook`, `PlaybookSection` types; `PLAYBOOKS` array; `getPlaybook(id): Playbook | undefined`; updated `Draft` type with `playbook_id` and `playbook_sections`; `createPlaybookDraft()` and `savePlaybookDraft()` functions

- [ ] **Step 1: Create `lib/playbooks.ts` with all 9 playbooks**

```typescript
// lib/playbooks.ts

export interface PlaybookSection {
  id: string;
  label: string;
  helper: string;
}

export interface Playbook {
  id: string;
  name: string;
  tagline: string;
  category: "content" | "email";
  sections: PlaybookSection[];
  estimateWords: number;
  bestFor: string[];
}

export const PLAYBOOKS: Playbook[] = [
  {
    id: "contrarian-flip",
    name: "The contrarian flip",
    tagline: "Challenge how most people think about something. You've seen the other side.",
    category: "content",
    sections: [
      { id: "bold-claim", label: "Bold claim", helper: "What do most people get wrong? One sentence." },
      {
        id: "why-they-think-that",
        label: "Why they think that",
        helper: "What's the common logic? Why does it seem right?",
      },
      {
        id: "what-youve-seen",
        label: "What you've seen instead",
        helper: "What does the reality look like from where you stand?",
      },
      { id: "takeaway", label: "One-line takeaway", helper: "Land it. One sentence." },
    ],
    estimateWords: 200,
    bestFor: ["LinkedIn", "Substack", "X"],
  },
  {
    id: "story-to-lesson",
    name: "The story-to-lesson",
    tagline: "Something happened. You learned from it. Share both.",
    category: "content",
    sections: [
      { id: "what-happened", label: "What happened", helper: "Set the scene. What were you doing?" },
      { id: "what-you-expected", label: "What you expected", helper: "What did you think would happen?" },
      { id: "what-actually-happened", label: "What actually happened", helper: "The twist. What surprised you?" },
      { id: "what-it-taught-you", label: "What it taught you", helper: "The lesson. One clear insight." },
    ],
    estimateWords: 250,
    bestFor: ["LinkedIn", "Substack", "小红书"],
  },
  {
    id: "insider-truth",
    name: "The insider truth",
    tagline: "Your industry says one thing publicly. The reality is different.",
    category: "content",
    sections: [
      { id: "what-people-hear", label: "What people hear", helper: "The public narrative. What's the common belief?" },
      { id: "what-actually-happens", label: "What actually happens", helper: "The reality from the inside." },
      { id: "why-the-gap", label: "Why the gap exists", helper: "Why does this disconnect persist?" },
      { id: "what-to-do", label: "What to do about it", helper: "Practical advice for the reader." },
    ],
    estimateWords: 200,
    bestFor: ["LinkedIn", "X", "Substack"],
  },
  {
    id: "build-log",
    name: "The build log",
    tagline: "Show what you made this week. Process over polish.",
    category: "content",
    sections: [
      { id: "what-you-worked-on", label: "What you worked on", helper: "What did you build, ship, or fix?" },
      { id: "one-decision", label: "One decision you made", helper: "A choice that shaped the work." },
      { id: "why", label: "Why", helper: "What drove that decision?" },
      { id: "whats-next", label: "What's next", helper: "What are you tackling next?" },
    ],
    estimateWords: 100,
    bestFor: ["X", "LinkedIn", "小红书"],
  },
  {
    id: "list-takeaway",
    name: "The list takeaway",
    tagline: "Distill what you know into a handful of sharp points.",
    category: "content",
    sections: [
      { id: "context", label: "Context", helper: "One sentence. What prompted this list?" },
      {
        id: "points",
        label: "3-5 points",
        helper: "Each one a full thought, not a bullet. Make each point standalone.",
      },
      { id: "why-it-matters", label: "Why this matters", helper: "Tie it together. What should the reader take away?" },
    ],
    estimateWords: 200,
    bestFor: ["LinkedIn", "X", "newsletter"],
  },
  {
    id: "origin-story",
    name: "The origin story",
    tagline: "Why you're building this. The real version.",
    category: "content",
    sections: [
      { id: "before", label: "What you were doing before", helper: "Set the stage. Where were you?" },
      { id: "shift", label: "The moment something shifted", helper: "What happened that changed things?" },
      { id: "what-you-did", label: "What you did about it", helper: "The action you took." },
      { id: "where-you-are", label: "Where you are now", helper: "The current state." },
      { id: "what-you-believe", label: "What you believe because of it", helper: "The conviction that drives you." },
    ],
    estimateWords: 400,
    bestFor: ["Substack", "LinkedIn", "About page"],
  },
  {
    id: "cold-intro",
    name: "The cold intro",
    tagline: "Reach out to someone who doesn't know you yet.",
    category: "email",
    sections: [
      { id: "why-writing", label: "Why you're writing", helper: "One sentence. Get to the point." },
      { id: "what-you-noticed", label: "What you noticed about their work", helper: "Show you've done your homework." },
      { id: "what-youre-building", label: "What you're building", helper: "One sentence. No pitch deck." },
      { id: "the-ask", label: "The ask", helper: "Specific and small. Easy to say yes to." },
    ],
    estimateWords: 80,
    bestFor: [],
  },
  {
    id: "follow-up",
    name: "The follow-up",
    tagline: "They haven't replied. Nudge without being annoying.",
    category: "email",
    sections: [
      { id: "reference", label: "Reference the original message", helper: "Remind them what you sent." },
      { id: "new-thing", label: "Add one new thing", helper: "Progress, insight, or reason to reply now." },
      { id: "restate-ask", label: "Restate the ask", helper: "Same ask, fresh framing." },
    ],
    estimateWords: 50,
    bestFor: [],
  },
  {
    id: "polite-push",
    name: "The polite push",
    tagline: "You need something from someone. Be direct without being demanding.",
    category: "email",
    sections: [
      { id: "context", label: "Context", helper: "What was agreed?" },
      { id: "where-things-stand", label: "Where things stand", helper: "Current status." },
      { id: "what-you-need", label: "What you need", helper: "Be specific." },
      { id: "by-when", label: "By when", helper: "Give a deadline." },
    ],
    estimateWords: 60,
    bestFor: [],
  },
];

export function getPlaybook(id: string): Playbook | undefined {
  return PLAYBOOKS.find((p) => p.id === id);
}
```

- [ ] **Step 2: Add `playbook_id` and `playbook_sections` to the `Draft` interface in `lib/supabase/drafts.ts`**

Add these two fields to the `Draft` interface after `source_entry_id`:

```typescript
playbook_id: string | null;
playbook_sections: Record<string, string> | null;
```

- [ ] **Step 3: Add `createPlaybookDraft` function in `lib/supabase/drafts.ts`**

Add after `createStandaloneDraft`:

```typescript
export async function createPlaybookDraft(
  playbookId: string,
  sections: Record<string, string>,
  content: string
): Promise<Draft | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("drafts")
    .insert({
      user_id: user.id,
      content,
      playbook_id: playbookId,
      playbook_sections: sections,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create playbook draft:", JSON.stringify(error));
    return null;
  }
  return data as Draft;
}

export async function savePlaybookDraft(
  draftId: string,
  sections: Record<string, string>,
  content: string
): Promise<Draft | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("drafts")
    .update({
      content,
      playbook_sections: sections,
      updated_at: new Date().toISOString(),
    })
    .eq("id", draftId)
    .select()
    .single();

  if (error) {
    console.error("Failed to save playbook draft:", JSON.stringify(error));
    return null;
  }
  return data as Draft;
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | head -5`

- [ ] **Step 5: Commit**

```bash
git add lib/playbooks.ts lib/supabase/drafts.ts
git commit -m "feat: add playbook definitions and draft type extensions"
```

---

### Task 2: PlaybookEditor Component

**Files:**

- Create: `components/PlaybookEditor.tsx`

**Interfaces:**

- Consumes: `Playbook`, `PlaybookSection` from `lib/playbooks.ts`; `Draft` from `lib/supabase/drafts.ts`; `createPlaybookDraft()`, `savePlaybookDraft()` from `lib/supabase/drafts.ts`; `UserProfile` from `lib/supabase/profiles.ts`; `VoiceProfile` from `lib/voice-dimensions.ts`
- Produces: `<PlaybookEditor />` component

- [ ] **Step 1: Create the component**

```typescript
"use client";
import { useState, useEffect, useRef } from "react";
import type { Playbook } from "@/lib/playbooks";
import { createPlaybookDraft, savePlaybookDraft, type Draft } from "@/lib/supabase/drafts";
import type { UserProfile } from "@/lib/supabase/profiles";
import type { VoiceProfile } from "@/lib/voice-dimensions";
import { ArrowLeft } from "@/components/ArrowIcon";
import posthog from "posthog-js";

const INK = "#1A1A18";
const BLUE = "#4A6CF7";
const DIM = "#6B6860";
const FAINT = "#A8A49C";
const BORDER = "#e5e7eb";

function flattenSections(
  sections: Record<string, string>,
  playbookSections: { id: string }[]
): string {
  return playbookSections
    .map((s) => sections[s.id] || "")
    .filter((t) => t.trim())
    .join("\n\n");
}

export default function PlaybookEditor({
  playbook,
  draft,
  profile,
  onBack,
  onSaveDone,
}: {
  playbook: Playbook;
  draft?: Draft;
  profile: UserProfile | null;
  onBack: () => void;
  onSaveDone: () => void;
}) {
  const [sections, setSections] = useState<Record<string, string>>(() => {
    if (draft?.playbook_sections) return draft.playbook_sections;
    const initial: Record<string, string> = {};
    playbook.sections.forEach((s) => {
      initial[s.id] = "";
    });
    return initial;
  });
  const [draftId, setDraftId] = useState<string | null>(draft?.id || null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef(JSON.stringify(sections));

  // Inline annotations state
  const [showEdits, setShowEdits] = useState(false);
  const [annotations, setAnnotations] = useState<
    { phrase: string; dimension: string; explanation: string; alternative: string }[]
  >([]);
  const [activeAnnotation, setActiveAnnotation] = useState<number | null>(null);
  const [loadingEdits, setLoadingEdits] = useState(false);

  const updateSection = (sectionId: string, value: string) => {
    setSections((prev) => {
      const updated = { ...prev, [sectionId]: value };

      // Debounced auto-save
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(async () => {
        const content = flattenSections(updated, playbook.sections);
        const serialized = JSON.stringify(updated);
        if (serialized === lastSavedRef.current) return;

        setSaving(true);
        if (draftId) {
          await savePlaybookDraft(draftId, updated, content);
        } else {
          const created = await createPlaybookDraft(playbook.id, updated, content);
          if (created) setDraftId(created.id);
        }
        lastSavedRef.current = serialized;
        setSaving(false);
      }, 1500);

      return updated;
    });
  };

  const handleExplicitSave = async () => {
    setSaving(true);
    setSaveError(null);
    const content = flattenSections(sections, playbook.sections);
    let result;
    if (draftId) {
      result = await savePlaybookDraft(draftId, sections, content);
    } else {
      result = await createPlaybookDraft(playbook.id, sections, content);
      if (result) setDraftId(result.id);
    }
    lastSavedRef.current = JSON.stringify(sections);
    setSaving(false);
    if (result) {
      posthog.capture("playbook_draft_saved", {
        playbook_id: playbook.id,
        word_count: content.trim().split(/\s+/).length,
      });
      onSaveDone();
    } else {
      setSaveError("Failed to save.");
    }
  };

  async function fetchAnnotations() {
    if (annotations.length > 0 || loadingEdits || !profile?.voice_profile) return;
    setLoadingEdits(true);
    const vp = profile.voice_profile as VoiceProfile;
    const content = flattenSections(sections, playbook.sections);
    try {
      const res = await fetch("/api/voice-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: content, dimensions: vp.dimensions }),
      });
      const data = await res.json();
      setAnnotations(data.notes || []);
    } catch {}
    setLoadingEdits(false);
  }

  const totalWords = flattenSections(sections, playbook.sections)
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <div className="min-h-screen" style={{ background: "#fff" }}>
      <div className="max-w-[640px] mx-auto px-5 py-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="font-mono text-[12px]"
            style={{ color: DIM, background: "none", border: "none", cursor: "pointer" }}
          >
            <ArrowLeft size={12} /> Back
          </button>
          <div className="flex items-center gap-3">
            {profile?.voice_profile && (
              <button
                onClick={() => {
                  const next = !showEdits;
                  setShowEdits(next);
                  if (next) fetchAnnotations();
                  if (!next) setActiveAnnotation(null);
                }}
                disabled={loadingEdits || totalWords < 20}
                style={{
                  background: showEdits ? `${BLUE}10` : "transparent",
                  border: `1.5px solid ${showEdits ? BLUE : FAINT}`,
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 13,
                  color: showEdits ? BLUE : DIM,
                  cursor: loadingEdits || totalWords < 20 ? "not-allowed" : "pointer",
                  fontWeight: 600,
                  opacity: totalWords < 20 ? 0.4 : 1,
                }}
              >
                {loadingEdits ? "Loading..." : showEdits ? "Hide edits" : "Voice check"}
              </button>
            )}
            <span
              className="font-mono text-[11px]"
              style={{ color: saving ? BLUE : saveError ? "#DC2626" : FAINT }}
            >
              {saving ? "Saving..." : saveError ? "Save failed" : draftId ? "Saved" : ""}
            </span>
          </div>
        </div>

        {/* Playbook name */}
        <h2
          className="font-serif mb-1"
          style={{ fontSize: 24, fontWeight: 600, color: INK }}
        >
          {playbook.name}
        </h2>
        <p className="font-sans mb-8" style={{ fontSize: 14, color: FAINT }}>
          {playbook.tagline}
        </p>

        {/* Sections */}
        {playbook.sections.map((section, i) => {
          const value = sections[section.id] || "";
          const hasContent = value.trim().length > 0;
          return (
            <div key={section.id} style={{ marginBottom: i < playbook.sections.length - 1 ? 0 : 0 }}>
              <p
                className="font-mono text-[11px] uppercase"
                style={{
                  color: FAINT,
                  letterSpacing: "0.06em",
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                {section.label}
              </p>
              <p
                className="font-sans text-[13px]"
                style={{
                  color: FAINT,
                  marginBottom: 8,
                  lineHeight: 1.4,
                  opacity: hasContent ? 0 : 1,
                  height: hasContent ? 0 : "auto",
                  overflow: "hidden",
                  transition: "opacity 0.2s ease",
                }}
              >
                {section.helper}
              </p>
              <textarea
                value={value}
                onChange={(e) => updateSection(section.id, e.target.value)}
                placeholder=""
                className="w-full outline-none resize-none font-sans"
                style={{
                  fontSize: 16,
                  color: INK,
                  lineHeight: 1.8,
                  padding: 0,
                  border: "none",
                  background: "transparent",
                  minHeight: 60,
                  overflow: "hidden",
                }}
                ref={(el) => {
                  if (el) {
                    el.style.height = "auto";
                    el.style.height = Math.max(60, el.scrollHeight) + "px";
                  }
                }}
                readOnly={showEdits}
              />
              {i < playbook.sections.length - 1 && (
                <div
                  style={{
                    borderBottom: `1px dashed ${BORDER}`,
                    margin: "16px 0 24px",
                  }}
                />
              )}
            </div>
          );
        })}

        {/* Word count */}
        {totalWords > 0 && (
          <p
            className="font-mono text-[11px] mt-4"
            style={{ color: FAINT }}
          >
            {totalWords} words
          </p>
        )}

        {/* Annotations (when Voice check is on) */}
        {showEdits && annotations.length > 0 && (
          <div className="mt-6 mb-4">
            <p
              className="font-mono text-[11px] uppercase mb-3"
              style={{ color: FAINT, letterSpacing: "0.05em", fontWeight: 500 }}
            >
              Voice notes
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {annotations.map((note, i) => (
                <button
                  key={i}
                  onClick={() =>
                    setActiveAnnotation(activeAnnotation === i ? null : i)
                  }
                  style={{
                    textAlign: "left",
                    background:
                      activeAnnotation === i ? "#f0f4ff" : "#f9fafb",
                    border: `1px solid ${activeAnnotation === i ? BLUE : BORDER}`,
                    borderRadius: 10,
                    padding: "12px 16px",
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  <p
                    className="font-mono text-[11px] uppercase"
                    style={{ color: BLUE, fontWeight: 600, marginBottom: 6 }}
                  >
                    {note.dimension}
                  </p>
                  <p
                    className="font-sans text-[14px]"
                    style={{
                      color: INK,
                      borderBottom: `2px dotted ${BLUE}40`,
                      display: "inline",
                      lineHeight: 1.6,
                    }}
                  >
                    &ldquo;{note.phrase}&rdquo;
                  </p>
                  {activeAnnotation === i && (
                    <div className="mt-3 space-y-2">
                      <p
                        className="font-sans text-[13px]"
                        style={{ color: INK, lineHeight: 1.5 }}
                      >
                        {note.explanation}
                      </p>
                      <p
                        className="font-sans text-[13px]"
                        style={{
                          color: DIM,
                          lineHeight: 1.5,
                          fontStyle: "italic",
                        }}
                      >
                        Alternative: {note.alternative}
                      </p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bottom actions */}
        <div className="mt-8 space-y-3 pb-12">
          <button
            onClick={handleExplicitSave}
            disabled={saving || totalWords === 0}
            className="w-full py-3 rounded-full font-sans font-semibold text-[14px]"
            style={{
              background: "transparent",
              color: totalWords === 0 ? FAINT : DIM,
              border: `1.5px solid ${BORDER}`,
              cursor: totalWords === 0 ? "not-allowed" : "pointer",
              opacity: totalWords === 0 ? 0.5 : 1,
            }}
          >
            Save draft
          </button>
          {saveError && (
            <p className="font-sans text-[13px]" style={{ color: "#DC2626" }}>
              {saveError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | head -5`

- [ ] **Step 3: Commit**

```bash
git add components/PlaybookEditor.tsx
git commit -m "feat: add PlaybookEditor component with sectioned writing"
```

---

### Task 3: Add Playbooks Tab + History Integration to Dashboard

**Files:**

- Modify: `app/dashboard/page.tsx`

**Interfaces:**

- Consumes: `PLAYBOOKS`, `getPlaybook`, `Playbook` from `lib/playbooks.ts`; `<PlaybookEditor />` from `components/PlaybookEditor.tsx`; `Draft` with `playbook_id` and `playbook_sections` from `lib/supabase/drafts.ts`
- Produces: Playbooks tab in dashboard, playbook tags in History, playbook drafts open in PlaybookEditor

- [ ] **Step 1: Add imports at the top of `app/dashboard/page.tsx`**

```typescript
import { PLAYBOOKS, getPlaybook, type Playbook } from "@/lib/playbooks";
import PlaybookEditor from "@/components/PlaybookEditor";
```

- [ ] **Step 2: Update Tab type and TABS array**

Change the Tab type:

```typescript
type Tab = "log" | "playbooks" | "history";
```

Update the TABS array:

```typescript
const TABS: { key: Tab; label: string }[] = [
  { key: "log", label: "Log" },
  { key: "playbooks", label: "Playbooks" },
  { key: "history", label: "History" },
];
```

Update the tab validation (two places that check valid tab values):

```typescript
["log", "playbooks", "history"].includes(hash);
```

- [ ] **Step 3: Add playbook editor state to the dashboard component**

Near other state declarations:

```typescript
const [activePlaybook, setActivePlaybook] = useState<{ playbook: Playbook; draft?: Draft } | null>(null);
```

- [ ] **Step 4: Add playbook editor early return**

Before the existing `standaloneDraft` early return, add:

```typescript
  // Playbook editor mode
  if (activePlaybook) {
    return (
      <PlaybookEditor
        playbook={activePlaybook.playbook}
        draft={activePlaybook.draft}
        profile={profile}
        onBack={() => setActivePlaybook(null)}
        onSaveDone={() => {
          setActivePlaybook(null);
          setTab("history");
          getAllDrafts().then(setDrafts);
        }}
      />
    );
  }
```

- [ ] **Step 5: Add the Playbooks tab rendering**

After the LogTab rendering block and before the History tab block:

```typescript
        {tab === "playbooks" && (
          <div>
            {/* Content playbooks */}
            <p
              className="font-mono text-[11px] uppercase mb-4"
              style={{ color: FAINT, letterSpacing: "0.06em", fontWeight: 600 }}
            >
              Content playbooks
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 }}>
              {PLAYBOOKS.filter((p) => p.category === "content").map((playbook) => (
                <button
                  key={playbook.id}
                  onClick={() => setActivePlaybook({ playbook })}
                  style={{
                    textAlign: "left",
                    background: "#fff",
                    border: `1px solid ${BORDER}`,
                    borderRadius: 12,
                    padding: "20px 24px",
                    cursor: "pointer",
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = BLUE;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = BORDER;
                  }}
                >
                  <p className="font-sans" style={{ fontSize: 17, fontWeight: 700, color: INK, marginBottom: 4 }}>
                    {playbook.name}
                  </p>
                  <p className="font-sans text-[14px]" style={{ color: DIM, lineHeight: 1.4, marginBottom: 10 }}>
                    {playbook.tagline}
                  </p>
                  <p className="font-mono text-[11px]" style={{ color: FAINT }}>
                    {playbook.sections.length} sections · ~{playbook.estimateWords} words
                  </p>
                </button>
              ))}
            </div>

            {/* Email playbooks */}
            <p
              className="font-mono text-[11px] uppercase mb-4"
              style={{ color: FAINT, letterSpacing: "0.06em", fontWeight: 600 }}
            >
              Email playbooks
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {PLAYBOOKS.filter((p) => p.category === "email").map((playbook) => (
                <button
                  key={playbook.id}
                  onClick={() => setActivePlaybook({ playbook })}
                  style={{
                    textAlign: "left",
                    background: "#fff",
                    border: `1px solid ${BORDER}`,
                    borderRadius: 12,
                    padding: "20px 24px",
                    cursor: "pointer",
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = BLUE;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = BORDER;
                  }}
                >
                  <p className="font-sans" style={{ fontSize: 17, fontWeight: 700, color: INK, marginBottom: 4 }}>
                    {playbook.name}
                  </p>
                  <p className="font-sans text-[14px]" style={{ color: DIM, lineHeight: 1.4, marginBottom: 10 }}>
                    {playbook.tagline}
                  </p>
                  <p className="font-mono text-[11px]" style={{ color: FAINT }}>
                    {playbook.sections.length} sections · ~{playbook.estimateWords} words
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
```

- [ ] **Step 6: Update DraftsTab (History) to show playbook tags and route to PlaybookEditor**

In the `DraftsTab` function, update the `onOpenStandaloneDraft` prop type and add an `onOpenPlaybookDraft` prop:

Find the DraftsTab function signature and add:

```typescript
  onOpenPlaybookDraft: (draft: Draft, playbook: Playbook) => void;
```

In the draft card rendering, add a playbook tag. Find where `prompt` is rendered for each draft and add above it:

```typescript
{d.playbook_id && (
  <span
    className="font-mono text-[10px] uppercase px-2 py-0.5 rounded"
    style={{ background: `${BLUE}10`, color: BLUE, fontWeight: 600 }}
  >
    {getPlaybook(d.playbook_id)?.name || d.playbook_id}
  </span>
)}
```

Update the click handler on draft cards: if the draft has `playbook_id` and the playbook exists, call `onOpenPlaybookDraft` instead of `onOpenStandaloneDraft`:

```typescript
onClick={() => {
  if (d.playbook_id) {
    const pb = getPlaybook(d.playbook_id);
    if (pb && d.playbook_sections) {
      onOpenPlaybookDraft(d, pb);
      return;
    }
  }
  if (d.plan_id) onOpenDraft(d.plan_id, d.post_index ?? 0);
  else onOpenStandaloneDraft(d);
}}
```

- [ ] **Step 7: Pass the new props to DraftsTab from the dashboard**

Update the DraftsTab mount to include `onOpenPlaybookDraft`:

```typescript
<DraftsTab
  drafts={draftsState}
  allPlans={allPlans}
  onOpenDraft={(pid, pi) => setWriteMode({ planId: pid, postIndex: pi })}
  onOpenStandaloneDraft={(d) => setStandaloneDraft({ draft: d })}
  onOpenPlaybookDraft={(d, pb) => setActivePlaybook({ playbook: pb, draft: d })}
  onDraftsUpdated={() => getAllDrafts().then(setDrafts)}
/>
```

- [ ] **Step 8: Verify it compiles and test manually**

Run: `npm run dev`

- Navigate to Playbooks tab — see 9 cards
- Tap a card — PlaybookEditor opens
- Type in sections, helper fades
- Save draft — appears in History with playbook tag
- Reopen from History — sections restored

- [ ] **Step 9: Commit**

```bash
git add app/dashboard/page.tsx
git commit -m "feat: add Playbooks tab with card list, History tags, and editor routing"
```
