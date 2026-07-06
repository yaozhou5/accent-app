# Try Your Voice + Multiply Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Try Your Voice" onboarding step that turns one rough thought into a draft, plus a "Multiply" flow that adapts any draft for multiple platforms — all in the user's voice.

**Architecture:** Extract `buildVoiceInstructions()` to a shared module. New `/api/multiply` endpoint streams platform-adapted content. `<MultiplyPanel />` shared component mounts in both `/voice/try` and the dashboard draft editor. Middleware gates new users to `/voice/try` after voice profile creation.

**Tech Stack:** Next.js App Router, React, Supabase, Anthropic Claude Sonnet (streaming), TypeScript.

## Global Constraints

- Model: `claude-sonnet-4-6` for all AI calls
- Auth: every API route checks `supabase.auth.getUser()` before proceeding
- Styling: inline styles, design tokens INK `#1A1A18`, BLUE `#4A6CF7`, CREAM `#F7F4EF`, DIM `#6B6860`, FAINT `#A8A49C`, BORDER `#e5e7eb`
- No new dependencies
- Do NOT touch: voice exercise, Log tab, Ideas tab, Settings, `/api/generate-draft` logic (only extract shared function)

---

### Task 1: Extract `buildVoiceInstructions` to Shared Module

**Files:**

- Create: `lib/voice-instructions.ts`
- Modify: `app/api/generate-draft/route.ts`

**Interfaces:**

- Consumes: `VoiceDimensions`, `DIMENSION_LABELS`, `normalizeScore`, `DimensionKey` from `lib/voice-dimensions.ts`
- Produces: `buildVoiceInstructions(dims: VoiceDimensions): string` — exported function used by `/api/generate-draft` and `/api/multiply`

- [ ] **Step 1: Create `lib/voice-instructions.ts`**

Copy the `buildVoiceInstructions` function from `app/api/generate-draft/route.ts` into a new file. Read the function from the file first (it's ~150 lines, starts at line 9), then create the new module with it exported:

```typescript
// lib/voice-instructions.ts
import { DIMENSION_LABELS, normalizeScore, type DimensionKey, type VoiceDimensions } from "@/lib/voice-dimensions";

export function buildVoiceInstructions(dims: VoiceDimensions): string {
  // ... paste the full function body from generate-draft/route.ts
}
```

- [ ] **Step 2: Update `app/api/generate-draft/route.ts` to import from the shared module**

Remove the local `buildVoiceInstructions` function definition. Add this import:

```typescript
import { buildVoiceInstructions } from "@/lib/voice-instructions";
```

Remove the now-unused direct imports of `DIMENSION_LABELS`, `normalizeScore`, `DimensionKey` from `voice-dimensions` (they're used by voice-instructions internally). Keep the `VoiceDimensions` import if it's still used in the route.

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | head -5`

- [ ] **Step 4: Commit**

```bash
git add lib/voice-instructions.ts app/api/generate-draft/route.ts
git commit -m "refactor: extract buildVoiceInstructions to shared module"
```

---

### Task 2: `/api/multiply` Endpoint

**Files:**

- Create: `app/api/multiply/route.ts`

**Interfaces:**

- Consumes: `buildVoiceInstructions` from `lib/voice-instructions.ts`; `VoiceDimensions` from `lib/voice-dimensions.ts`
- Produces: streamed text response (platform-adapted draft)

- [ ] **Step 1: Create the API route**

```typescript
// app/api/multiply/route.ts
import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { buildVoiceInstructions } from "@/lib/voice-instructions";
import type { VoiceDimensions } from "@/lib/voice-dimensions";

const anthropic = new Anthropic({ maxRetries: 2 });

const PLATFORM_RULES: Record<string, string> = {
  linkedin:
    "Platform: LinkedIn. Professional but personal. Hook in the first line — make the reader stop scrolling. Use line breaks for readability (one idea per line). End with a question or sharp insight. 150-300 words. No hashtags. No emojis.",
  twitter:
    "Platform: X/Twitter. Punchy, compressed. Decide based on content: if the idea fits in one tweet, write one tweet (under 280 chars). If it needs more room, write a numbered thread (2-5 tweets, each under 280 chars). Start with the strongest claim.",
  newsletter:
    "Platform: Newsletter. Warmer, more expansive, conversational. The reader opted in — they care. You can take your time. Build the idea with texture. 200-400 words. Feel like a letter from a smart friend, not a blog post.",
  short:
    "Platform: Short post (Instagram caption / general short-form). One core idea. Concise. Casual but smart. 50-150 words. No structure — just the thought, cleanly expressed.",
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

    const { draftText, voiceProfile, platform } = await request.json();

    if (!draftText?.trim()) return new Response(JSON.stringify({ error: "draftText required" }), { status: 400 });

    const voiceInstructions = voiceProfile?.dimensions
      ? buildVoiceInstructions(voiceProfile.dimensions as VoiceDimensions)
      : "Write in a clear, professional tone.";

    const platformRule = PLATFORM_RULES[platform] || PLATFORM_RULES.linkedin;

    const systemPrompt = `You are adapting an existing draft for a different platform. Preserve the core insight and the author's voice. Don't just shorten or lengthen — rewrite for how people read on this platform.

VOICE STYLE (follow these closely):
${voiceInstructions}

${platformRule}

RULES:
- Write ONE complete post for this platform, ready to copy-paste and publish.
- Keep the same core idea and point of view as the original draft.
- Adapt structure, length, tone, and formatting for the platform's conventions.
- Sound like a real person, not a writing tool. No AI cliches.
- Do not add a title, subject line, or meta-commentary. Just the post.
- For Twitter threads, number each tweet (1/, 2/, etc.) and keep each under 280 characters.`;

    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: `Original draft:\n\n${draftText}\n\nAdapt this for the platform specified above.`,
        },
      ],
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
    console.error("multiply error:", error);
    return new Response(JSON.stringify({ error: "Failed to multiply" }), { status: 500 });
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | head -5`

- [ ] **Step 3: Commit**

```bash
git add app/api/multiply/route.ts
git commit -m "feat: add /api/multiply endpoint for platform-adapted drafts"
```

---

### Task 3: `<MultiplyPanel />` Component

**Files:**

- Create: `components/MultiplyPanel.tsx`

**Interfaces:**

- Consumes: `/api/multiply` endpoint; `VoiceProfile` type from `lib/voice-dimensions.ts`
- Produces: `<MultiplyPanel draftText={string} voiceProfile={VoiceProfile} />` — shared component

- [ ] **Step 1: Create the component**

```typescript
"use client";
import { useState, useRef } from "react";
import type { VoiceProfile } from "@/lib/voice-dimensions";

const INK = "#1A1A18";
const BLUE = "#4A6CF7";
const DIM = "#6B6860";
const FAINT = "#A8A49C";
const BORDER = "#e5e7eb";

type Platform = "linkedin" | "twitter" | "newsletter" | "short";

const PLATFORMS: { key: Platform; label: string; color: string }[] = [
  { key: "linkedin", label: "LinkedIn", color: "#0A66C2" },
  { key: "twitter", label: "X / Twitter", color: "#1A1A18" },
  { key: "newsletter", label: "Newsletter", color: "#D97706" },
  { key: "short", label: "Short post", color: "#E85D3A" },
];

export default function MultiplyPanel({
  draftText,
  voiceProfile,
}: {
  draftText: string;
  voiceProfile: VoiceProfile;
}) {
  const [activeTab, setActiveTab] = useState<Platform>("linkedin");
  const [generated, setGenerated] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const streamRef = useRef("");

  async function generateForPlatform(platform: Platform) {
    if (generated[platform] || loading) return;
    setLoading(platform);
    streamRef.current = "";

    try {
      const res = await fetch("/api/multiply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftText, voiceProfile, platform }),
      });

      if (!res.ok) throw new Error("Failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          streamRef.current += decoder.decode(value, { stream: true });
          setGenerated((prev) => ({
            ...prev,
            [platform]: streamRef.current,
          }));
        }
      }
    } catch (err) {
      console.error("Multiply failed:", err);
    } finally {
      setLoading(null);
    }
  }

  function handleTabClick(platform: Platform) {
    setActiveTab(platform);
    if (!generated[platform] && !loading) {
      generateForPlatform(platform);
    }
  }

  function handleCopy(text: string, platform: string) {
    navigator.clipboard.writeText(text);
    setCopied(platform);
    setTimeout(() => setCopied(null), 2000);
  }

  const activePlatform = PLATFORMS.find((p) => p.key === activeTab)!;
  const content = generated[activeTab] || "";

  return (
    <div style={{ borderRadius: 14, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          overflowX: "auto",
          borderBottom: `1px solid ${BORDER}`,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {PLATFORMS.map((p) => (
          <button
            key={p.key}
            onClick={() => handleTabClick(p.key)}
            style={{
              flex: "0 0 auto",
              padding: "12px 20px",
              fontSize: 14,
              fontWeight: activeTab === p.key ? 700 : 500,
              color: activeTab === p.key ? p.color : DIM,
              background: activeTab === p.key ? `${p.color}08` : "transparent",
              border: "none",
              borderBottom: activeTab === p.key ? `2px solid ${p.color}` : "2px solid transparent",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontFamily: "inherit",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div style={{ padding: "20px 24px", minHeight: 120 }}>
        {loading === activeTab && !content && (
          <p className="font-sans text-[14px]" style={{ color: FAINT }}>
            Adapting for {activePlatform.label}...
          </p>
        )}

        {content && (
          <div>
            <p
              className="font-sans"
              style={{
                fontSize: 15,
                color: INK,
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                marginBottom: 16,
              }}
            >
              {content}
            </p>
            <button
              onClick={() => handleCopy(content, activeTab)}
              className="font-sans text-[13px] font-semibold"
              style={{
                background: copied === activeTab ? "#E8F5E0" : "#f9fafb",
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                padding: "8px 16px",
                cursor: "pointer",
                color: copied === activeTab ? "#16a34a" : DIM,
              }}
            >
              {copied === activeTab ? "Copied!" : "Copy"}
            </button>
          </div>
        )}

        {!loading && !content && (
          <button
            onClick={() => generateForPlatform(activeTab)}
            className="font-sans text-[14px] font-semibold"
            style={{
              background: BLUE,
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "10px 24px",
              cursor: "pointer",
            }}
          >
            Generate for {activePlatform.label}
          </button>
        )}
      </div>

      {/* Voice label */}
      <div
        style={{
          padding: "12px 24px",
          borderTop: `1px solid ${BORDER}`,
          background: "#f9fafb",
        }}
      >
        <p className="font-mono text-[11px]" style={{ color: FAINT }}>
          Written in your voice · {voiceProfile.top_traits?.join(". ")}.
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | head -5`

- [ ] **Step 3: Commit**

```bash
git add components/MultiplyPanel.tsx
git commit -m "feat: add MultiplyPanel shared component with platform tabs"
```

---

### Task 4: `/voice/try` Page

**Files:**

- Create: `app/voice/try/page.tsx`

**Interfaces:**

- Consumes: `/api/generate-draft` endpoint; `getProfile()` from `lib/supabase/profiles.ts`; `createLogEntry()` from `lib/supabase/log-entries.ts`; `createStandaloneDraft()` from `lib/supabase/drafts.ts`; `<MultiplyPanel />` from `components/MultiplyPanel.tsx`; `VoiceProfile` from `lib/voice-dimensions.ts`
- Produces: `/voice/try` page with input → draft → multiply flow

- [ ] **Step 1: Create the page**

```typescript
"use client";
import { useState, useEffect } from "react";
import { getProfile } from "@/lib/supabase/profiles";
import { createLogEntry } from "@/lib/supabase/log-entries";
import { createStandaloneDraft } from "@/lib/supabase/drafts";
import MultiplyPanel from "@/components/MultiplyPanel";
import type { VoiceProfile } from "@/lib/voice-dimensions";
import posthog from "posthog-js";

const INK = "#1A1A18";
const BLUE = "#4A6CF7";
const DIM = "#6B6860";
const FAINT = "#A8A49C";
const CREAM = "#F7F4EF";

type Phase = "input" | "generating" | "result";

export default function TryVoicePage() {
  const [phase, setPhase] = useState<Phase>("input");
  const [rawInput, setRawInput] = useState("");
  const [draft, setDraft] = useState("");
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile | null>(null);
  const [showMultiply, setShowMultiply] = useState(false);

  useEffect(() => {
    getProfile().then((p) => {
      setVoiceProfile((p?.voice_profile as VoiceProfile) || null);
    });
  }, []);

  async function handleGenerate() {
    if (!rawInput.trim() || !voiceProfile) return;
    setPhase("generating");

    try {
      // Save raw input as first log entry
      const entry = await createLogEntry(rawInput.trim(), {
        type: "note",
        source: "try-voice",
      });

      // Generate draft
      const res = await fetch("/api/generate-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryContent: rawInput.trim(),
          voiceProfile,
          businessContext: "",
          platform: "linkedin",
        }),
      });

      if (!res.ok) throw new Error("Generate failed");

      const text = await res.text();
      setDraft(text);

      // Save draft
      if (entry) {
        await createStandaloneDraft(text, rawInput.trim(), entry.id);
      }

      posthog.capture("try_voice_completed", {
        input_length: rawInput.trim().length,
        draft_length: text.length,
      });

      setPhase("result");
    } catch (err) {
      console.error("Try voice failed:", err);
      setPhase("input");
    }
  }

  function handleDashboard() {
    window.location.href = "/dashboard";
  }

  // --- INPUT PHASE ---
  if (phase === "input") {
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
          <h1
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 36,
              fontWeight: 400,
              color: INK,
              marginBottom: 12,
              lineHeight: 1.2,
            }}
          >
            See what your voice can do
          </h1>
          <p
            className="font-sans"
            style={{
              fontSize: 17,
              color: DIM,
              lineHeight: 1.6,
              marginBottom: 32,
            }}
          >
            Drop a rough thought. A rant, a note, something you explained to
            someone today.
          </p>
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="e.g. I think most people approach hiring wrong because they look for skills instead of taste..."
            style={{
              width: "100%",
              minHeight: 180,
              padding: 20,
              fontSize: 16,
              lineHeight: 1.7,
              color: INK,
              background: "#fff",
              border: `1px solid ${FAINT}`,
              borderRadius: 14,
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />
          <button
            onClick={handleGenerate}
            disabled={!rawInput.trim() || !voiceProfile}
            style={{
              width: "100%",
              marginTop: 16,
              padding: "16px 0",
              fontSize: 17,
              fontWeight: 700,
              color: "#fff",
              background: !rawInput.trim() || !voiceProfile ? FAINT : BLUE,
              border: "none",
              borderRadius: 12,
              cursor:
                !rawInput.trim() || !voiceProfile ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            Write it in my voice
          </button>
        </div>
      </div>
    );
  }

  // --- GENERATING PHASE ---
  if (phase === "generating") {
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
              border: "3px solid #e5e5e5",
              borderTopColor: BLUE,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ fontSize: 18, color: DIM }}>Writing in your voice...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // --- RESULT PHASE ---
  if (phase === "result" && voiceProfile) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: CREAM,
          padding: "48px 24px 80px",
        }}
      >
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          {/* Voice header */}
          <p
            className="font-mono text-[12px] mb-6"
            style={{ color: FAINT }}
          >
            Written in your voice ·{" "}
            <span style={{ color: DIM }}>
              {voiceProfile.top_traits?.join(". ")}.
            </span>
          </p>

          {/* Draft card (read-only) */}
          <div
            style={{
              background: "#fff",
              border: `1px solid ${FAINT}40`,
              borderRadius: 16,
              padding: "32px 32px",
              marginBottom: 24,
            }}
          >
            <p
              className="font-sans"
              style={{
                fontSize: 16,
                color: INK,
                lineHeight: 1.8,
                whiteSpace: "pre-wrap",
              }}
            >
              {draft}
            </p>
          </div>

          {/* Multiply panel */}
          {showMultiply && (
            <div style={{ marginBottom: 24 }}>
              <MultiplyPanel
                draftText={draft}
                voiceProfile={voiceProfile}
              />
            </div>
          )}

          {/* CTAs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {!showMultiply && (
              <button
                onClick={() => setShowMultiply(true)}
                style={{
                  width: "100%",
                  padding: "16px 0",
                  fontSize: 17,
                  fontWeight: 700,
                  color: "#fff",
                  background: BLUE,
                  border: "none",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Multiply this
              </button>
            )}
            <button
              onClick={handleDashboard}
              style={{
                width: "100%",
                padding: "14px 0",
                fontSize: 15,
                fontWeight: 600,
                color: DIM,
                background: "transparent",
                border: `1.5px solid ${FAINT}`,
                borderRadius: 12,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Go to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | head -5`

- [ ] **Step 3: Commit**

```bash
git add app/voice/try/page.tsx
git commit -m "feat: add Try Your Voice page at /voice/try"
```

---

### Task 5: Middleware Gate + Dashboard Multiply Button

**Files:**

- Modify: `middleware.ts`
- Modify: `app/dashboard/page.tsx`

**Interfaces:**

- Consumes: `<MultiplyPanel />` from `components/MultiplyPanel.tsx`; `VoiceProfile` from `lib/voice-dimensions.ts`
- Produces: middleware redirects new users to `/voice/try`; "Multiply" button in draft editor toolbar

- [ ] **Step 1: Update middleware to gate new users to `/voice/try`**

In `middleware.ts`, replace the current dashboard gate with a more detailed check:

```typescript
// New user routing: voice profile + log entries
if (path.startsWith("/dashboard") || path === "/voice/try") {
  const { data: profile } = await supabase.from("profiles").select("id, voice_profile").eq("id", user.id).maybeSingle();

  if (!profile) {
    // No profile row — brand new user, send to voice exercise
    return NextResponse.redirect(new URL("/voice", request.url));
  }

  // For /dashboard: if they have voice_profile but zero logs, send to /voice/try
  if (path.startsWith("/dashboard") && profile.voice_profile) {
    const { count } = await supabase
      .from("log_entries")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (count === 0) {
      return NextResponse.redirect(new URL("/voice/try", request.url));
    }
  }
}
```

Also add `/voice/try` to the PROTECTED array:

```typescript
const PROTECTED = ["/write", "/settings", "/shelf", "/dashboard", "/voice/try"];
```

- [ ] **Step 2: Add "Multiply" button to StandaloneWriteMode in `app/dashboard/page.tsx`**

Find the toolbar area in StandaloneWriteMode (near the "Regenerate" button, around line 2900). Add a "Multiply" toggle button alongside it.

First, add the import at the top of the file:

```typescript
import MultiplyPanel from "@/components/MultiplyPanel";
```

Add state inside StandaloneWriteMode:

```typescript
const [showMultiply, setShowMultiply] = useState(false);
```

Add the "Multiply" button next to the "Regenerate" button in the toolbar:

```typescript
{draft.source_entry_id && profile?.voice_profile && (
  <button
    onClick={() => setShowMultiply(!showMultiply)}
    style={{
      background: showMultiply ? `${BLUE}10` : "transparent",
      border: `1.5px solid ${showMultiply ? BLUE : FAINT}`,
      borderRadius: 8,
      padding: "8px 16px",
      fontSize: 13,
      color: showMultiply ? BLUE : DIM,
      cursor: "pointer",
      fontWeight: 600,
    }}
  >
    Multiply
  </button>
)}
```

Add the MultiplyPanel below the voice notes section (before the "Check my writing" button area):

```typescript
{showMultiply && profile?.voice_profile && (
  <div className="mt-6 mb-4">
    <MultiplyPanel
      draftText={content}
      voiceProfile={profile.voice_profile as VoiceProfile}
    />
  </div>
)}
```

- [ ] **Step 3: Verify it compiles and test manually**

Run: `npm run dev`

- Test `/voice/try` as a new user with voice_profile but 0 logs
- Test "Multiply" button in the draft editor on an existing draft

- [ ] **Step 4: Commit**

```bash
git add middleware.ts app/dashboard/page.tsx
git commit -m "feat: middleware gate to /voice/try + Multiply button in draft editor"
```
