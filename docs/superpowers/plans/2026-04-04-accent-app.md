# Accent App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Accent, a writing improvement web app for second-language English writers with two tabs (Write and Shelf), Claude API integration, voice learning, and i18n support.

**Architecture:** Single-page Next.js App Router app. Client-side tab switching between Write and Shelf. Two server-side API routes (`/api/check`, `/api/practice-check`) calling Claude API. Voice profile stored in localStorage. Hardcoded shelf content.

**Tech Stack:** Next.js 14+ (App Router), TypeScript, Tailwind CSS 3, Anthropic SDK, Vercel deployment

---

### Task 1: Scaffold Next.js Project & Configure Theme

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`
- Create: `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

- [ ] **Step 1: Create Next.js project**

Run:
```bash
cd /Users/yaozhou/accent-app
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --use-npm
```

- [ ] **Step 2: Install Anthropic SDK**

Run:
```bash
npm install @anthropic-ai/sdk
```

- [ ] **Step 3: Configure Tailwind with custom theme**

Update `tailwind.config.ts`:
```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#FFFEF4",
        sand: "#D0CFC1",
        coral: "#E8593C",
        sage: "#4A7C5F",
        warm: "#F5F0E8",
        ink: "#1C1917",
        "coral-light": "#FEF2EF",
        "sage-light": "#F0FAF4",
      },
      fontFamily: {
        serif: ["var(--font-literata)", "Georgia", "serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
```

- [ ] **Step 4: Configure fonts in root layout**

Update `app/layout.tsx`:
```tsx
import type { Metadata } from "next";
import { Literata, JetBrains_Mono, DM_Sans } from "next/font/google";
import "./globals.css";

const literata = Literata({
  subsets: ["latin"],
  variable: "--font-literata",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Accent",
  description: "Writing improvement for second-language English writers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${literata.variable} ${jetbrains.variable} ${dmSans.variable}`}
    >
      <body className="bg-paper text-ink font-sans min-h-screen">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Set up globals.css**

Update `app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    min-font-size: 11px;
  }
  body {
    font-weight: 400;
    -webkit-font-smoothing: antialiased;
  }
}
```

- [ ] **Step 6: Create placeholder page**

Update `app/page.tsx`:
```tsx
export default function Home() {
  return (
    <main className="max-w-[480px] mx-auto px-4 py-6">
      <h1 className="font-serif text-2xl">Accent</h1>
    </main>
  );
}
```

- [ ] **Step 7: Verify dev server starts**

Run: `npm run dev`
Expected: App loads at localhost:3000 with "Accent" heading on paper background

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with custom theme, fonts, and colors"
```

---

### Task 2: Build i18n System

**Files:**
- Create: `lib/i18n.ts`

- [ ] **Step 1: Create i18n translations file**

Create `lib/i18n.ts`:
```ts
export type Locale = "en" | "zh" | "nl";

export const localeNames: Record<Locale, string> = {
  en: "English",
  zh: "Chinese",
  nl: "Dutch",
};

const translations = {
  en: {
    appName: "Accent",
    write: "Write",
    shelf: "Shelf",
    quick: "Quick",
    learn: "Learn",
    checkButton: "Check my writing",
    placeholder: "Paste your draft here...",
    precision: "Precision",
    rhythm: "Rhythm",
    voice: "Voice",
    structure: "Structure",
    tryIt: "Try it",
    submit: "Submit",
    tryWritingIt: "Try writing it yourself",
    checkAgain: "Check again",
    greatWriting: "This is good writing!",
    practicePrompt: "Practice prompt",
    craftLesson: "Craft lesson",
    teachingNotes: "Teaching notes",
    yourVoice: "your voice",
    canImprove: "can improve",
    microLesson: "Micro-lesson",
    before: "Before",
    after: "After",
    feedbackPlaceholder: "Write your version here...",
    languageLabel: "Language",
  },
  zh: {
    appName: "Accent",
    write: "写作",
    shelf: "书架",
    quick: "快速",
    learn: "学习",
    checkButton: "检查我的写作",
    placeholder: "在这里粘贴你的草稿...",
    precision: "精确",
    rhythm: "节奏",
    voice: "声音",
    structure: "结构",
    tryIt: "试试",
    submit: "提交",
    tryWritingIt: "试着自己写",
    checkAgain: "再次检查",
    greatWriting: "写得很好！",
    practicePrompt: "练习提示",
    craftLesson: "写作课",
    teachingNotes: "教学笔记",
    yourVoice: "你的声音",
    canImprove: "可以改进",
    microLesson: "微课",
    before: "之前",
    after: "之后",
    feedbackPlaceholder: "在这里写你的版本...",
    languageLabel: "语言",
  },
  nl: {
    appName: "Accent",
    write: "Schrijven",
    shelf: "Plank",
    quick: "Snel",
    learn: "Leren",
    checkButton: "Controleer mijn tekst",
    placeholder: "Plak je tekst hier...",
    precision: "Precisie",
    rhythm: "Ritme",
    voice: "Stem",
    structure: "Structuur",
    tryIt: "Probeer het",
    submit: "Verstuur",
    tryWritingIt: "Probeer het zelf te schrijven",
    checkAgain: "Opnieuw controleren",
    greatWriting: "Dit is goed geschreven!",
    practicePrompt: "Oefenopdracht",
    craftLesson: "Schrijfles",
    teachingNotes: "Lesnotities",
    yourVoice: "jouw stem",
    canImprove: "kan beter",
    microLesson: "Microles",
    before: "Voor",
    after: "Na",
    feedbackPlaceholder: "Schrijf hier jouw versie...",
    languageLabel: "Taal",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["en"];

export function t(locale: Locale, key: TranslationKey): string {
  return translations[locale][key];
}

export function useTranslations(locale: Locale) {
  return (key: TranslationKey) => t(locale, key);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/i18n.ts
git commit -m "feat: add i18n translations for English, Chinese, and Dutch"
```

---

### Task 3: Build App Shell with Header & Tabs

**Files:**
- Create: `components/Header.tsx`
- Create: `components/TabBar.tsx`
- Create: `components/AppShell.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create Header component**

Create `components/Header.tsx`:
```tsx
"use client";

import { Locale, localeNames } from "@/lib/i18n";

interface HeaderProps {
  locale: Locale;
  onLocaleChange: (locale: Locale) => void;
}

export function Header({ locale, onLocaleChange }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3">
      <h1 className="font-serif text-xl font-semibold tracking-tight">
        Accent
      </h1>
      <select
        value={locale}
        onChange={(e) => onLocaleChange(e.target.value as Locale)}
        className="bg-warm border border-sand rounded-md px-2 py-1 text-sm font-sans text-ink cursor-pointer focus:outline-none focus:ring-2 focus:ring-coral/30"
        aria-label="Language"
      >
        {(Object.entries(localeNames) as [Locale, string][]).map(
          ([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          )
        )}
      </select>
    </header>
  );
}
```

- [ ] **Step 2: Create TabBar component**

Create `components/TabBar.tsx`:
```tsx
"use client";

interface TabBarProps {
  activeTab: "write" | "shelf";
  onTabChange: (tab: "write" | "shelf") => void;
  labels: { write: string; shelf: string };
}

export function TabBar({ activeTab, onTabChange, labels }: TabBarProps) {
  return (
    <nav className="flex border-b border-sand px-4" role="tablist">
      {(["write", "shelf"] as const).map((tab) => (
        <button
          key={tab}
          role="tab"
          aria-selected={activeTab === tab}
          onClick={() => onTabChange(tab)}
          className={`px-4 py-2.5 text-sm font-sans font-medium transition-colors relative ${
            activeTab === tab
              ? "text-ink"
              : "text-sand hover:text-ink/60"
          }`}
        >
          {labels[tab]}
          {activeTab === tab && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-coral" />
          )}
        </button>
      ))}
    </nav>
  );
}
```

- [ ] **Step 3: Create AppShell component**

Create `components/AppShell.tsx`:
```tsx
"use client";

import { useState, useEffect } from "react";
import { Header } from "./Header";
import { TabBar } from "./TabBar";
import { Locale } from "@/lib/i18n";
import { useTranslations } from "@/lib/i18n";

export function AppShell() {
  const [locale, setLocale] = useState<Locale>("en");
  const [activeTab, setActiveTab] = useState<"write" | "shelf">("write");
  const t = useTranslations(locale);

  useEffect(() => {
    const saved = localStorage.getItem("accent-locale") as Locale | null;
    if (saved && ["en", "zh", "nl"].includes(saved)) {
      setLocale(saved);
    }
  }, []);

  const handleLocaleChange = (newLocale: Locale) => {
    setLocale(newLocale);
    localStorage.setItem("accent-locale", newLocale);
  };

  return (
    <div className="max-w-[480px] mx-auto min-h-screen flex flex-col">
      <Header locale={locale} onLocaleChange={handleLocaleChange} />
      <TabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        labels={{ write: t("write"), shelf: t("shelf") }}
      />
      <main className="flex-1 px-4 py-4">
        {activeTab === "write" ? (
          <div>Write tab placeholder</div>
        ) : (
          <div>Shelf tab placeholder</div>
        )}
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Update page.tsx to use AppShell**

Update `app/page.tsx`:
```tsx
import { AppShell } from "@/components/AppShell";

export default function Home() {
  return <AppShell />;
}
```

- [ ] **Step 5: Verify tabs switch and locale persists**

Run: `npm run dev`
Expected: Header with "Accent" + language dropdown. Tabs switch between Write/Shelf placeholders.

- [ ] **Step 6: Commit**

```bash
git add components/ app/page.tsx
git commit -m "feat: add app shell with header, tab bar, and locale switcher"
```

---

### Task 4: Build Voice Profile System

**Files:**
- Create: `lib/voice-profile.ts`

- [ ] **Step 1: Create voice profile module**

Create `lib/voice-profile.ts`:
```ts
export interface VoiceSession {
  date: string;
  draftExcerpt: string;
  phrasesKept: string[];
  phrasesReplaced: string[];
  wordFrequency: Record<string, number>;
}

export interface VoiceProfile {
  sessions: VoiceSession[];
}

const STORAGE_KEY = "accent-voice-profile";

export function getVoiceProfile(): VoiceProfile {
  if (typeof window === "undefined") return { sessions: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sessions: [] };
    return JSON.parse(raw) as VoiceProfile;
  } catch {
    return { sessions: [] };
  }
}

export function saveSession(session: VoiceSession): void {
  const profile = getVoiceProfile();
  profile.sessions.push(session);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function getSessionCount(): number {
  return getVoiceProfile().sessions.length;
}

export function getVoiceTier(): "new" | "tentative" | "confident" {
  const count = getSessionCount();
  if (count <= 2) return "new";
  if (count <= 5) return "tentative";
  return "confident";
}

export function getKeptPhrases(): string[] {
  return getVoiceProfile().sessions.flatMap((s) => s.phrasesKept);
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/voice-profile.ts
git commit -m "feat: add localStorage voice profile system with progressive tiers"
```

---

### Task 5: Build API Types & Shared Types

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Create shared types**

Create `lib/types.ts`:
```ts
export type Verdict = "great" | "mostly_good" | "needs_work";
export type WriteMode = "quick" | "learn";

// Quick mode
export interface QuickCheckRequest {
  text: string;
  mode: "quick";
  language: string;
  sessionCount: number;
}

export interface QuickCheckResponse {
  verdict: Verdict;
  rewrite: string | null;
  microLesson: string | null;
  original: string;
  suggestions?: string[];
}

// Learn mode
export interface AnnotatedPhrase {
  text: string;
  type: "improve" | "voice";
  startIndex: number;
  endIndex: number;
  explanation?: string;
  rewrites?: string[];
}

export interface LearnCheckRequest {
  text: string;
  mode: "learn";
  language: string;
  sessionCount: number;
  keptPhrases?: string[];
}

export interface LearnCheckResponse {
  verdict: Verdict;
  annotatedPhrases: AnnotatedPhrase[];
  teachingNotes: string;
  practicePrompts: string[];
  original: string;
}

export type CheckRequest = QuickCheckRequest | LearnCheckRequest;
export type CheckResponse = QuickCheckResponse | LearnCheckResponse;

// Practice check
export interface PracticeCheckRequest {
  original: string;
  userAttempt: string;
  context: string;
  language: string;
}

export interface PracticeCheckResponse {
  feedback: string;
  isImproved: boolean;
  suggestions: string[];
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add shared TypeScript types for API requests and responses"
```

---

### Task 6: Build `/api/check` Route

**Files:**
- Create: `app/api/check/route.ts`
- Create: `lib/prompts.ts`

- [ ] **Step 1: Create Claude prompt templates**

Create `lib/prompts.ts`:
```ts
import { Verdict } from "./types";

export function buildQuickPrompt(
  text: string,
  language: string,
  sessionCount: number
): string {
  const voiceTier =
    sessionCount <= 2 ? "new" : sessionCount <= 5 ? "tentative" : "confident";

  return `You are a writing coach for second-language English writers. The user's UI language is ${language}.

Analyze this draft and return a JSON response. Be encouraging but honest.

Voice calibration: The user has completed ${sessionCount} sessions (tier: ${voiceTier}).
${voiceTier === "new" ? "Focus only on flagging AI-sounding patterns, clichés, filler words, and generic phrases." : ""}
${voiceTier === "tentative" ? "Begin tentatively identifying the user's writing voice patterns." : ""}
${voiceTier === "confident" ? "Confidently identify phrases that reflect the user's unique voice." : ""}

Determine a verdict:
- "great": The writing is genuinely good. No significant issues. Return this for clean, clear, purposeful prose.
- "mostly_good": Minor improvements possible but the writing is solid overall.
- "needs_work": Significant improvements needed in clarity, structure, or natural English expression.

Return ONLY valid JSON in this exact format:
{
  "verdict": "great" | "mostly_good" | "needs_work",
  "rewrite": "improved version of the full text (null if verdict is great)",
  "microLesson": "one brief writing tip relevant to what you found (null if verdict is great)",
  "original": "the original text back",
  "suggestions": ["specific suggestion 1", "specific suggestion 2"]
}

The user's draft:
${text}`;
}

export function buildLearnPrompt(
  text: string,
  language: string,
  sessionCount: number,
  keptPhrases: string[]
): string {
  const voiceTier =
    sessionCount <= 2 ? "new" : sessionCount <= 5 ? "tentative" : "confident";

  return `You are a writing coach for second-language English writers using Learn mode. The user's UI language is ${language}.

Analyze this draft and annotate specific phrases. Be encouraging and educational.

Voice calibration: The user has completed ${sessionCount} sessions (tier: ${voiceTier}).
${voiceTier === "new" ? "Focus only on flagging AI-sounding patterns. Mark genuinely good phrases as 'voice' type sparingly." : ""}
${voiceTier === "tentative" ? "Begin tentatively matching voice patterns. Phrases similar to these previously-kept phrases may be their voice: ${keptPhrases.slice(-20).join(", ")}" : ""}
${voiceTier === "confident" ? "Confidently identify voice. The user tends to keep phrases like: ${keptPhrases.slice(-30).join(", ")}" : ""}

For each notable phrase, classify as:
- "improve": Can be better (coral highlight). Include explanation and 2-3 rewrite options.
- "voice": This is the user's authentic voice (green highlight). Briefly note why it works.

Return ONLY valid JSON in this exact format:
{
  "verdict": "great" | "mostly_good" | "needs_work",
  "annotatedPhrases": [
    {
      "text": "exact phrase from the draft",
      "type": "improve" | "voice",
      "startIndex": 0,
      "endIndex": 10,
      "explanation": "why this phrase was flagged",
      "rewrites": ["option 1", "option 2"]
    }
  ],
  "teachingNotes": "2-3 sentences of overall teaching feedback",
  "practicePrompts": ["prompt 1", "prompt 2"],
  "original": "the original text back"
}

The user's draft:
${text}`;
}

export function buildPracticeCheckPrompt(
  original: string,
  userAttempt: string,
  context: string,
  language: string
): string {
  return `You are a writing coach. The user's UI language is ${language}.

The user was given this original phrase to improve:
"${original}"

Context: ${context}

Their rewrite attempt:
"${userAttempt}"

Evaluate their attempt. Be encouraging. Did they improve it? What's working? Any further suggestions?

Return ONLY valid JSON:
{
  "feedback": "2-3 sentences of specific feedback",
  "isImproved": true/false,
  "suggestions": ["suggestion if needed"]
}`;
}
```

- [ ] **Step 2: Create /api/check route**

Create `app/api/check/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildQuickPrompt, buildLearnPrompt } from "@/lib/prompts";
import {
  CheckRequest,
  QuickCheckResponse,
  LearnCheckResponse,
} from "@/lib/types";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CheckRequest;
    const { text, mode, language, sessionCount } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "Text is required" },
        { status: 400 }
      );
    }

    const prompt =
      mode === "quick"
        ? buildQuickPrompt(text, language, sessionCount)
        : buildLearnPrompt(
            text,
            language,
            sessionCount,
            "keptPhrases" in body ? body.keptPhrases || [] : []
          );

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return NextResponse.json(
        { error: "Unexpected response format" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(content.text) as
      | QuickCheckResponse
      | LearnCheckResponse;
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Check API error:", error);
    return NextResponse.json(
      { error: "Failed to analyze writing" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/prompts.ts app/api/check/route.ts
git commit -m "feat: add /api/check route with Claude prompts for quick and learn modes"
```

---

### Task 7: Build `/api/practice-check` Route

**Files:**
- Create: `app/api/practice-check/route.ts`

- [ ] **Step 1: Create practice-check route**

Create `app/api/practice-check/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { buildPracticeCheckPrompt } from "@/lib/prompts";
import { PracticeCheckRequest, PracticeCheckResponse } from "@/lib/types";

const anthropic = new Anthropic();

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PracticeCheckRequest;
    const { original, userAttempt, context, language } = body;

    if (!userAttempt || !userAttempt.trim()) {
      return NextResponse.json(
        { error: "User attempt is required" },
        { status: 400 }
      );
    }

    const prompt = buildPracticeCheckPrompt(
      original,
      userAttempt,
      context,
      language
    );

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return NextResponse.json(
        { error: "Unexpected response format" },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(content.text) as PracticeCheckResponse;
    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Practice check API error:", error);
    return NextResponse.json(
      { error: "Failed to check practice" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/practice-check/route.ts
git commit -m "feat: add /api/practice-check route for writing practice feedback"
```

---

### Task 8: Build Write Tab — Quick Mode UI

**Files:**
- Create: `components/WriteTab.tsx`
- Create: `components/QuickMode.tsx`
- Create: `components/VerdictBanner.tsx`
- Create: `components/BeforeAfter.tsx`
- Modify: `components/AppShell.tsx`

- [ ] **Step 1: Create VerdictBanner component**

Create `components/VerdictBanner.tsx`:
```tsx
"use client";

import { Verdict } from "@/lib/types";

interface VerdictBannerProps {
  verdict: Verdict;
  greatLabel: string;
}

export function VerdictBanner({ verdict, greatLabel }: VerdictBannerProps) {
  if (verdict === "great") {
    return (
      <div className="bg-sage-light border border-sage/30 rounded-lg px-4 py-3 text-sage font-sans text-sm font-medium">
        {greatLabel}
      </div>
    );
  }
  return null;
}
```

- [ ] **Step 2: Create BeforeAfter component**

Create `components/BeforeAfter.tsx`:
```tsx
"use client";

interface BeforeAfterProps {
  before: string;
  after: string;
  beforeLabel: string;
  afterLabel: string;
}

export function BeforeAfter({
  before,
  after,
  beforeLabel,
  afterLabel,
}: BeforeAfterProps) {
  return (
    <div className="space-y-3">
      <div>
        <span className="text-xs font-sans font-medium text-sand uppercase tracking-wide">
          {beforeLabel}
        </span>
        <div className="mt-1 bg-coral-light rounded-lg px-3 py-2.5 font-mono text-sm leading-relaxed text-ink/70 whitespace-pre-wrap">
          {before}
        </div>
      </div>
      <div>
        <span className="text-xs font-sans font-medium text-sand uppercase tracking-wide">
          {afterLabel}
        </span>
        <div className="mt-1 bg-sage-light rounded-lg px-3 py-2.5 font-mono text-sm leading-relaxed text-ink whitespace-pre-wrap">
          {after}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create QuickMode component**

Create `components/QuickMode.tsx`:
```tsx
"use client";

import { useState } from "react";
import { QuickCheckResponse, Locale } from "@/lib/types";
import { useTranslations } from "@/lib/i18n";
import { getSessionCount, getKeptPhrases, saveSession } from "@/lib/voice-profile";
import { VerdictBanner } from "./VerdictBanner";
import { BeforeAfter } from "./BeforeAfter";

interface QuickModeProps {
  locale: Locale;
}

export function QuickMode({ locale }: QuickModeProps) {
  const t = useTranslations(locale);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<QuickCheckResponse | null>(null);

  const handleCheck = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          mode: "quick",
          language: locale,
          sessionCount: getSessionCount(),
        }),
      });
      const data = (await res.json()) as QuickCheckResponse;
      setResult(data);

      saveSession({
        date: new Date().toISOString(),
        draftExcerpt: text.slice(0, 200),
        phrasesKept: [],
        phrasesReplaced: [],
        wordFrequency: {},
      });
    } catch (error) {
      console.error("Check failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("placeholder")}
        className="w-full h-40 bg-warm border border-sand rounded-lg px-3 py-2.5 font-mono text-sm leading-relaxed text-ink placeholder:text-sand resize-none focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral/50"
      />
      <button
        onClick={handleCheck}
        disabled={!text.trim() || loading}
        className="w-full bg-coral text-white font-sans font-medium text-sm py-2.5 rounded-lg hover:bg-coral/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "..." : t("checkButton")}
      </button>

      {result && (
        <div className="space-y-4 pt-2">
          <VerdictBanner verdict={result.verdict} greatLabel={t("greatWriting")} />

          {result.rewrite && (
            <BeforeAfter
              before={result.original}
              after={result.rewrite}
              beforeLabel={t("before")}
              afterLabel={t("after")}
            />
          )}

          {result.microLesson && (
            <div className="bg-warm rounded-lg px-3 py-2.5">
              <span className="text-xs font-sans font-medium text-sand uppercase tracking-wide">
                {t("microLesson")}
              </span>
              <p className="mt-1 font-serif text-sm leading-relaxed text-ink">
                {result.microLesson}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

Note: The import of `Locale` from `@/lib/types` is wrong — it should come from `@/lib/i18n`. Fix in Step 3 by importing `Locale` from `@/lib/i18n`.

- [ ] **Step 4: Create WriteTab component**

Create `components/WriteTab.tsx`:
```tsx
"use client";

import { useState } from "react";
import { Locale } from "@/lib/i18n";
import { useTranslations } from "@/lib/i18n";
import { QuickMode } from "./QuickMode";

interface WriteTabProps {
  locale: Locale;
}

export function WriteTab({ locale }: WriteTabProps) {
  const t = useTranslations(locale);
  const [mode, setMode] = useState<"quick" | "learn">("quick");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["quick", "learn"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-sans font-medium transition-colors ${
              mode === m
                ? "bg-ink text-paper"
                : "bg-warm text-ink/60 hover:text-ink"
            }`}
          >
            <span>{m === "quick" ? "⚡" : "📖"}</span>
            {t(m)}
          </button>
        ))}
      </div>

      {mode === "quick" ? (
        <QuickMode locale={locale} />
      ) : (
        <div className="text-sand text-sm">Learn mode placeholder</div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Wire WriteTab into AppShell**

Update `components/AppShell.tsx` — replace the Write tab placeholder:
```tsx
// Add import at top:
import { WriteTab } from "./WriteTab";

// Replace {activeTab === "write" ? <div>Write tab placeholder</div> : ...} with:
{activeTab === "write" ? (
  <WriteTab locale={locale} />
) : (
  <div>Shelf tab placeholder</div>
)}
```

- [ ] **Step 6: Verify Quick mode works end-to-end**

Run: `npm run dev`
Expected: Write tab shows Quick/Learn toggle, textarea, check button. Quick mode submits to API and shows results.

- [ ] **Step 7: Commit**

```bash
git add components/
git commit -m "feat: add Write tab with Quick mode UI, verdict banner, and before/after view"
```

---

### Task 9: Build Write Tab — Learn Mode UI

**Files:**
- Create: `components/LearnMode.tsx`
- Create: `components/AnnotatedText.tsx`
- Create: `components/PhraseCard.tsx`
- Create: `components/PracticeBox.tsx`
- Modify: `components/WriteTab.tsx`

- [ ] **Step 1: Create PracticeBox component**

Create `components/PracticeBox.tsx`:
```tsx
"use client";

import { useState } from "react";
import { PracticeCheckResponse } from "@/lib/types";
import { Locale } from "@/lib/i18n";
import { useTranslations } from "@/lib/i18n";

interface PracticeBoxProps {
  originalPhrase: string;
  context: string;
  locale: Locale;
}

export function PracticeBox({
  originalPhrase,
  context,
  locale,
}: PracticeBoxProps) {
  const t = useTranslations(locale);
  const [attempt, setAttempt] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<PracticeCheckResponse | null>(null);

  const handleCheck = async () => {
    if (!attempt.trim() || loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/practice-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          original: originalPhrase,
          userAttempt: attempt,
          context,
          language: locale,
        }),
      });
      const data = (await res.json()) as PracticeCheckResponse;
      setFeedback(data);
    } catch (error) {
      console.error("Practice check failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-sans font-medium text-ink/60">
        {t("tryWritingIt")}
      </p>
      <textarea
        value={attempt}
        onChange={(e) => setAttempt(e.target.value)}
        placeholder={t("feedbackPlaceholder")}
        className="w-full h-20 bg-paper border border-sand rounded-md px-2.5 py-2 font-mono text-sm leading-relaxed text-ink placeholder:text-sand resize-none focus:outline-none focus:ring-2 focus:ring-coral/30"
      />
      <button
        onClick={handleCheck}
        disabled={!attempt.trim() || loading}
        className="text-sm font-sans font-medium text-coral hover:text-coral/80 transition-colors disabled:opacity-50"
      >
        {loading ? "..." : feedback ? t("checkAgain") : t("submit")}
      </button>

      {feedback && (
        <div
          className={`rounded-md px-3 py-2 text-sm font-sans ${
            feedback.isImproved
              ? "bg-sage-light text-sage"
              : "bg-coral-light text-coral"
          }`}
        >
          <p>{feedback.feedback}</p>
          {feedback.suggestions.length > 0 && (
            <ul className="mt-1.5 list-disc list-inside text-xs">
              {feedback.suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create PhraseCard component**

Create `components/PhraseCard.tsx`:
```tsx
"use client";

import { AnnotatedPhrase } from "@/lib/types";
import { Locale } from "@/lib/i18n";
import { PracticeBox } from "./PracticeBox";

interface PhraseCardProps {
  phrase: AnnotatedPhrase;
  locale: Locale;
}

export function PhraseCard({ phrase, locale }: PhraseCardProps) {
  if (phrase.type === "voice") {
    return (
      <div className="bg-sage-light rounded-lg px-3 py-2.5">
        <p className="font-mono text-sm text-sage font-medium">
          &ldquo;{phrase.text}&rdquo;
        </p>
        {phrase.explanation && (
          <p className="mt-1 font-sans text-xs text-sage/80">
            {phrase.explanation}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="bg-coral-light rounded-lg px-3 py-2.5">
      <p className="font-mono text-sm text-coral font-medium">
        &ldquo;{phrase.text}&rdquo;
      </p>
      {phrase.explanation && (
        <p className="mt-1.5 font-sans text-xs text-ink/70">
          {phrase.explanation}
        </p>
      )}
      {phrase.rewrites && phrase.rewrites.length > 0 && (
        <div className="mt-2 space-y-1">
          {phrase.rewrites.map((rw, i) => (
            <p
              key={i}
              className="font-mono text-xs text-ink/60 pl-2 border-l-2 border-coral/30"
            >
              {rw}
            </p>
          ))}
        </div>
      )}
      <PracticeBox
        originalPhrase={phrase.text}
        context={phrase.explanation || ""}
        locale={locale}
      />
    </div>
  );
}
```

- [ ] **Step 3: Create AnnotatedText component**

Create `components/AnnotatedText.tsx`:
```tsx
"use client";

import { AnnotatedPhrase } from "@/lib/types";

interface AnnotatedTextProps {
  text: string;
  phrases: AnnotatedPhrase[];
  onPhraseClick: (phrase: AnnotatedPhrase) => void;
}

export function AnnotatedText({
  text,
  phrases,
  onPhraseClick,
}: AnnotatedTextProps) {
  const sorted = [...phrases].sort((a, b) => a.startIndex - b.startIndex);

  const segments: Array<{
    text: string;
    phrase?: AnnotatedPhrase;
  }> = [];

  let cursor = 0;
  for (const phrase of sorted) {
    if (phrase.startIndex > cursor) {
      segments.push({ text: text.slice(cursor, phrase.startIndex) });
    }
    segments.push({
      text: text.slice(phrase.startIndex, phrase.endIndex),
      phrase,
    });
    cursor = phrase.endIndex;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }

  return (
    <div className="font-mono text-sm leading-relaxed whitespace-pre-wrap">
      {segments.map((seg, i) =>
        seg.phrase ? (
          <button
            key={i}
            onClick={() => onPhraseClick(seg.phrase!)}
            className={`rounded px-0.5 -mx-0.5 cursor-pointer transition-colors ${
              seg.phrase.type === "improve"
                ? "bg-coral/20 hover:bg-coral/30 text-coral"
                : "bg-sage/20 hover:bg-sage/30 text-sage"
            }`}
          >
            {seg.text}
          </button>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create LearnMode component**

Create `components/LearnMode.tsx`:
```tsx
"use client";

import { useState } from "react";
import { AnnotatedPhrase, LearnCheckResponse } from "@/lib/types";
import { Locale } from "@/lib/i18n";
import { useTranslations } from "@/lib/i18n";
import {
  getSessionCount,
  getKeptPhrases,
  saveSession,
} from "@/lib/voice-profile";
import { VerdictBanner } from "./VerdictBanner";
import { AnnotatedText } from "./AnnotatedText";
import { PhraseCard } from "./PhraseCard";

interface LearnModeProps {
  locale: Locale;
}

export function LearnMode({ locale }: LearnModeProps) {
  const t = useTranslations(locale);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LearnCheckResponse | null>(null);
  const [selectedPhrase, setSelectedPhrase] =
    useState<AnnotatedPhrase | null>(null);

  const handleCheck = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setResult(null);
    setSelectedPhrase(null);

    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          mode: "learn",
          language: locale,
          sessionCount: getSessionCount(),
          keptPhrases: getKeptPhrases(),
        }),
      });
      const data = (await res.json()) as LearnCheckResponse;
      setResult(data);

      const voicePhrases = data.annotatedPhrases
        .filter((p) => p.type === "voice")
        .map((p) => p.text);
      const improvedPhrases = data.annotatedPhrases
        .filter((p) => p.type === "improve")
        .map((p) => p.text);

      saveSession({
        date: new Date().toISOString(),
        draftExcerpt: text.slice(0, 200),
        phrasesKept: voicePhrases,
        phrasesReplaced: improvedPhrases,
        wordFrequency: {},
      });
    } catch (error) {
      console.error("Check failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("placeholder")}
        className="w-full h-40 bg-warm border border-sand rounded-lg px-3 py-2.5 font-mono text-sm leading-relaxed text-ink placeholder:text-sand resize-none focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral/50"
      />
      <button
        onClick={handleCheck}
        disabled={!text.trim() || loading}
        className="w-full bg-coral text-white font-sans font-medium text-sm py-2.5 rounded-lg hover:bg-coral/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "..." : t("checkButton")}
      </button>

      {result && (
        <div className="space-y-4 pt-2">
          <VerdictBanner
            verdict={result.verdict}
            greatLabel={t("greatWriting")}
          />

          <AnnotatedText
            text={result.original}
            phrases={result.annotatedPhrases}
            onPhraseClick={setSelectedPhrase}
          />

          {selectedPhrase && (
            <PhraseCard phrase={selectedPhrase} locale={locale} />
          )}

          {result.teachingNotes && (
            <div className="bg-warm rounded-lg px-3 py-2.5">
              <span className="text-xs font-sans font-medium text-sand uppercase tracking-wide">
                {t("teachingNotes")}
              </span>
              <p className="mt-1 font-serif text-sm leading-relaxed text-ink">
                {result.teachingNotes}
              </p>
            </div>
          )}

          {result.practicePrompts.length > 0 && (
            <div className="bg-warm rounded-lg px-3 py-2.5">
              <span className="text-xs font-sans font-medium text-sand uppercase tracking-wide">
                {t("practicePrompt")}
              </span>
              <ul className="mt-1.5 space-y-1">
                {result.practicePrompts.map((prompt, i) => (
                  <li
                    key={i}
                    className="font-serif text-sm leading-relaxed text-ink"
                  >
                    {prompt}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Wire LearnMode into WriteTab**

Update `components/WriteTab.tsx` — add import and replace placeholder:
```tsx
// Add import:
import { LearnMode } from "./LearnMode";

// Replace the learn mode placeholder with:
{mode === "quick" ? (
  <QuickMode locale={locale} />
) : (
  <LearnMode locale={locale} />
)}
```

- [ ] **Step 6: Commit**

```bash
git add components/
git commit -m "feat: add Learn mode with annotated text, phrase cards, and practice boxes"
```

---

### Task 10: Build Writer's Shelf Tab

**Files:**
- Create: `lib/shelf-data.ts`
- Create: `components/ShelfTab.tsx`
- Create: `components/PassageCard.tsx`
- Modify: `components/AppShell.tsx`

- [ ] **Step 1: Create shelf data**

Create `lib/shelf-data.ts`:
```ts
export type ShelfCategory = "precision" | "rhythm" | "voice" | "structure";

export interface ShelfPassage {
  id: string;
  author: string;
  excerpt: string;
  category: ShelfCategory;
  craftLesson: string;
  writingPrompt: string;
}

export const shelfPassages: ShelfPassage[] = [
  // Precision
  {
    id: "hemingway-1",
    author: "Ernest Hemingway",
    excerpt:
      "He was an old man who fished alone in a skiff in the Gulf Stream and he had gone eighty-four days now without taking a fish.",
    category: "precision",
    craftLesson:
      "Hemingway loads a single sentence with specific, concrete details — alone, skiff, Gulf Stream, eighty-four days. Every word carries weight. No adjective is decorative; each one narrows the picture.",
    writingPrompt:
      "Write a single sentence that introduces a character through specific details about what they do. No adjectives that don't earn their place.",
  },
  {
    id: "hemingway-2",
    author: "Ernest Hemingway",
    excerpt:
      "The world breaks everyone and afterward many are strong at the broken places.",
    category: "precision",
    craftLesson:
      "Precision isn't just about physical details. Here Hemingway states a large truth in plain, exact language. 'Breaks' and 'broken places' do double duty as literal and metaphorical.",
    writingPrompt:
      "Write one sentence that captures a big truth using only plain, concrete words. No abstractions.",
  },
  {
    id: "pg-1",
    author: "Paul Graham",
    excerpt:
      "Write like you talk. Here's a simple trick for getting it: after you finish writing something, read it out loud and fix anything that sounds wrong.",
    category: "precision",
    craftLesson:
      "Graham's power is in actionable precision. He doesn't say 'be natural' — he gives you a specific test you can apply. Good nonfiction makes the reader feel they can act immediately.",
    writingPrompt:
      "Explain a skill you have in two sentences. First, the principle. Then, one specific action the reader can take right now.",
  },
  // Rhythm
  {
    id: "didion-1",
    author: "Joan Didion",
    excerpt:
      "We tell ourselves stories in order to live. The princess is caged in the consulate. The man with the candy will lead the children into the sea.",
    category: "rhythm",
    craftLesson:
      "Didion opens with a short declaration, then illustrates it with images that accelerate. The rhythm shifts from thesis to proof, from abstract to concrete. Each sentence gets more specific and more unsettling.",
    writingPrompt:
      "Write three sentences: the first states something you believe, the next two illustrate it with increasingly vivid images.",
  },
  {
    id: "vuong-1",
    author: "Ocean Vuong",
    excerpt:
      "The most beautiful part of your body is where it's headed. & remember, the body is not a grave, it is a map.",
    category: "rhythm",
    craftLesson:
      "Vuong uses rhythm to create surprise. 'Where it's headed' subverts our expectation of a body part. The ampersand creates a breath, a pause, then the reversal: not a grave, a map. Rhythm here is inseparable from meaning.",
    writingPrompt:
      "Write two sentences about the body or a physical object. Use the second sentence to overturn what the first one seemed to mean.",
  },
  {
    id: "vonnegut-1",
    author: "Kurt Vonnegut",
    excerpt:
      "And so it goes.",
    category: "rhythm",
    craftLesson:
      "Three words that carry the weight of every death in Slaughterhouse-Five. A refrain works by accumulation — the first time it's nothing, but after fifty repetitions it contains everything. Rhythm can be a structural tool, not just a sentence-level one.",
    writingPrompt:
      "Write a short paragraph about a recurring event. End with the same short phrase each time something happens. Make the phrase gain weight.",
  },
  // Voice
  {
    id: "didion-2",
    author: "Joan Didion",
    excerpt:
      "I write entirely to find out what I'm thinking, what I'm looking at, what I see and what it means. What I want and what I fear.",
    category: "voice",
    craftLesson:
      "Voice emerges when a writer stops performing and starts thinking on the page. Didion's repetition of 'what I' isn't stylistic decoration — it's the actual process of a mind sorting itself out. Authenticity reads as voice.",
    writingPrompt:
      "Complete this sentence five different ways: 'I write because...' Don't plan them — write fast, and let each one surprise you.",
  },
  {
    id: "vonnegut-2",
    author: "Kurt Vonnegut",
    excerpt:
      "Here is a lesson in creative writing. First rule: Do not use semicolons. They are transvestite hermaphrodites representing absolutely nothing. All they do is show you've been to college.",
    category: "voice",
    craftLesson:
      "Vonnegut's voice comes from irreverence combined with conviction. He states opinions as facts, escalates to absurdity, then lands on a sharp social observation. Voice isn't about being funny — it's about being unafraid to sound like yourself.",
    writingPrompt:
      "Write a strong opinion about a small thing (a punctuation mark, a food, a daily habit). State it as fact. Escalate. Then land on why it actually matters.",
  },
  {
    id: "vuong-2",
    author: "Ocean Vuong",
    excerpt:
      "Let me begin again. Dear Ma, I am writing to reach you — even if each word I put down is one word further from where you are.",
    category: "voice",
    craftLesson:
      "Vuong's voice is intimate and contradictory. 'Writing to reach you' and 'one word further from where you are' exist in tension. A distinctive voice often lives in the gap between what the writer wants and what language can do.",
    writingPrompt:
      "Write a short letter (3-4 sentences) to someone you can't reach. Let the act of writing be part of what you write about.",
  },
  // Structure
  {
    id: "pg-2",
    author: "Paul Graham",
    excerpt:
      "The way to get startup ideas is not to try to think of startup ideas. It's to look for problems, preferably problems you have yourself.",
    category: "structure",
    craftLesson:
      "Graham structures arguments by negation: he tells you what NOT to do first, then pivots to what works. This creates a satisfying reversal. The reader feels their assumption overturned, making the real advice land harder.",
    writingPrompt:
      "Write two sentences about how to do something. First sentence: the common approach that's wrong. Second: what actually works.",
  },
  {
    id: "hemingway-3",
    author: "Ernest Hemingway",
    excerpt:
      "If a writer of prose knows enough of what he is writing about he may omit things that he knows and the reader, if the writer is writing truly enough, will have a feeling of those things as strongly as though the writer had stated them.",
    category: "structure",
    craftLesson:
      "Hemingway's iceberg theory: structure is as much about what you leave out as what you include. The sentence itself demonstrates the principle — it's one long, winding thought that leaves you to fill in the specific examples.",
    writingPrompt:
      "Describe a scene where something important has just happened — but don't say what it was. Let the reader feel it through details alone.",
  },
  {
    id: "pg-3",
    author: "Paul Graham",
    excerpt:
      "The best essays are not about a topic. They're about a surprise — something the writer figured out while writing.",
    category: "structure",
    craftLesson:
      "Graham reveals that structure can be emergent. The essay isn't a container for pre-formed ideas — it's a vehicle for discovering them. This reframes structure as exploration rather than architecture.",
    writingPrompt:
      "Start writing about something you think you understand. After three sentences, write something that surprises you. Follow that surprise.",
  },
];
```

- [ ] **Step 2: Create PassageCard component**

Create `components/PassageCard.tsx`:
```tsx
"use client";

import { useState } from "react";
import { ShelfPassage } from "@/lib/shelf-data";
import { Locale } from "@/lib/i18n";
import { useTranslations } from "@/lib/i18n";
import { PracticeBox } from "./PracticeBox";

interface PassageCardProps {
  passage: ShelfPassage;
  locale: Locale;
}

export function PassageCard({ passage, locale }: PassageCardProps) {
  const t = useTranslations(locale);
  const [showPrompt, setShowPrompt] = useState(false);

  return (
    <div className="bg-warm rounded-xl px-4 py-4 space-y-3">
      <blockquote className="font-serif text-sm leading-relaxed text-ink italic">
        &ldquo;{passage.excerpt}&rdquo;
      </blockquote>
      <p className="font-sans text-xs text-sand font-medium">
        — {passage.author}
      </p>

      <div>
        <span className="text-xs font-sans font-medium text-sand uppercase tracking-wide">
          {t("craftLesson")}
        </span>
        <p className="mt-1 font-sans text-xs leading-relaxed text-ink/80">
          {passage.craftLesson}
        </p>
      </div>

      <button
        onClick={() => setShowPrompt(!showPrompt)}
        className="text-sm font-sans font-medium text-coral hover:text-coral/80 transition-colors"
      >
        {showPrompt ? "Close" : t("tryIt")}
      </button>

      {showPrompt && (
        <div className="space-y-2 pt-1">
          <p className="font-sans text-xs text-ink/70 leading-relaxed">
            {passage.writingPrompt}
          </p>
          <PracticeBox
            originalPhrase={passage.excerpt}
            context={`Writing prompt: ${passage.writingPrompt}. Inspired by ${passage.author}'s style.`}
            locale={locale}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create ShelfTab component**

Create `components/ShelfTab.tsx`:
```tsx
"use client";

import { useState } from "react";
import { shelfPassages, ShelfCategory } from "@/lib/shelf-data";
import { Locale } from "@/lib/i18n";
import { useTranslations } from "@/lib/i18n";
import { PassageCard } from "./PassageCard";

interface ShelfTabProps {
  locale: Locale;
}

const categories: ShelfCategory[] = [
  "precision",
  "rhythm",
  "voice",
  "structure",
];

export function ShelfTab({ locale }: ShelfTabProps) {
  const t = useTranslations(locale);
  const [activeCategory, setActiveCategory] =
    useState<ShelfCategory>("precision");

  const filtered = shelfPassages.filter(
    (p) => p.category === activeCategory
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-sans font-medium whitespace-nowrap transition-colors ${
              activeCategory === cat
                ? "bg-ink text-paper"
                : "bg-warm text-ink/60 hover:text-ink"
            }`}
          >
            {t(cat)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map((passage) => (
          <PassageCard key={passage.id} passage={passage} locale={locale} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Wire ShelfTab into AppShell**

Update `components/AppShell.tsx` — add import and replace Shelf placeholder:
```tsx
// Add import:
import { ShelfTab } from "./ShelfTab";

// Replace the shelf placeholder:
{activeTab === "write" ? (
  <WriteTab locale={locale} />
) : (
  <ShelfTab locale={locale} />
)}
```

- [ ] **Step 5: Commit**

```bash
git add lib/shelf-data.ts components/PassageCard.tsx components/ShelfTab.tsx components/AppShell.tsx
git commit -m "feat: add Writer's Shelf tab with curated passages and practice prompts"
```

---

### Task 11: Create .env.local Template and Vercel Config

**Files:**
- Create: `.env.example`
- Create: `.gitignore` additions

- [ ] **Step 1: Create .env.example**

Create `.env.example`:
```
ANTHROPIC_API_KEY=your-api-key-here
```

- [ ] **Step 2: Verify .gitignore includes .env.local**

The default Next.js `.gitignore` already includes `.env*.local`. Verify this is present.

- [ ] **Step 3: Commit**

```bash
git add .env.example
git commit -m "feat: add .env.example for API key configuration"
```

---

### Task 12: Final Integration & Polish

**Files:**
- Modify: Various components as needed

- [ ] **Step 1: Run build to check for type errors**

Run: `npm run build`
Expected: Clean build with no TypeScript errors

- [ ] **Step 2: Fix any type or build errors found**

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "fix: resolve build errors and finalize app"
```

- [ ] **Step 4: Push to remote**

```bash
git push -u origin master
```
