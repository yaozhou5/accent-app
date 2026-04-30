"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

const AppShell = dynamic(() => import("@/components/AppShell").then(m => m.AppShell), { ssr: false });

const BLUE = "#2563EB";
const INK = "#1A1A18";
const DIM = "#6B6B6B";
const BORDER = "#E5E5E5";

type Story = { angle: string; channel: string; insight: string; nudge: string };
type CoachResult = { structure: string; choices: Array<{ original: string; alternatives: Array<{ word: string; reason: string }> }>; stand_out: { common_take: string; your_angle: string; bold_move: string }; channel_fit: string };

/* ── Diary View ── */
function DiaryView() {
  const [entry, setEntry] = useState("");
  const [stories, setStories] = useState<Story[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeStory, setActiveStory] = useState<number | null>(null);

  // Writing mode state
  const [writingMode, setWritingMode] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [draft, setDraft] = useState("");
  const [coaching, setCoaching] = useState<CoachResult | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showEntry, setShowEntry] = useState(false);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const wordCount = entry.trim() ? entry.trim().split(/\s+/).length : 0;

  const handleFindStories = async () => {
    if (!entry.trim() || loading) return;
    setLoading(true);
    setStories(null);
    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entry }),
      });
      const data = await res.json();
      if (data.stories) setStories(data.stories);
    } catch {}
    setLoading(false);
  };

  const handleWriteThis = (story: Story) => {
    setSelectedStory(story);
    setWritingMode(true);
    setDraft("");
    setCoaching(null);
  };

  const handleCoachMe = async () => {
    if (!draft.trim() || coachLoading) return;
    setCoachLoading(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft, channel: selectedStory?.channel, originalEntry: entry, angle: selectedStory?.angle }),
      });
      const data = await res.json();
      setCoaching(data);
    } catch {}
    setCoachLoading(false);
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Writing mode
  if (writingMode && selectedStory) {
    return (
      <div className="max-w-[720px] mx-auto px-5 py-8">
        <button onClick={() => setWritingMode(false)} className="mb-6 font-mono text-[12px]" style={{ color: DIM, background: "none", border: "none", cursor: "pointer" }}>← Back to stories</button>

        <div className="mb-6">
          <span className="font-mono text-[11px] inline-block px-2 py-0.5 rounded-full mb-2" style={{ background: `${BLUE}0A`, color: BLUE, border: `1px solid ${BLUE}20` }}>{selectedStory.channel}</span>
          <h2 className="font-serif" style={{ fontSize: 24, fontWeight: 400, color: INK }}>{selectedStory.angle}</h2>
          <p className="font-sans text-[14px] mt-2 italic" style={{ color: DIM }}>{selectedStory.nudge}</p>
        </div>

        {/* Reference */}
        <div className="mb-6">
          <button onClick={() => setShowEntry(!showEntry)} className="font-mono text-[11px] uppercase" style={{ color: "#AAAAAA", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.06em" }}>
            {showEntry ? "Hide diary entry ▲" : "Show diary entry ▼"}
          </button>
          {showEntry && (
            <div className="mt-2 p-4 rounded-[8px]" style={{ background: "#FAFAFA", border: `1px solid ${BORDER}` }}>
              <p className="font-sans text-[14px]" style={{ color: DIM, lineHeight: 1.6 }}>{entry}</p>
            </div>
          )}
        </div>

        {/* Editor */}
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder="Write your post here. Your voice, your words."
          rows={10}
          className="w-full outline-none resize-y font-sans mb-4"
          style={{ fontSize: 16, color: INK, lineHeight: 1.7, padding: "16px 20px", border: `1px solid ${BORDER}`, borderRadius: 10, background: "#fff", minHeight: 200 }}
        />

        <div className="flex items-center justify-between mb-6">
          <span className="font-mono text-[11px]" style={{ color: "#AAAAAA" }}>{draft.trim() ? draft.trim().split(/\s+/).length : 0} words</span>
          <div className="flex gap-2">
            <button onClick={handleCoachMe} disabled={!draft.trim() || coachLoading} className="px-5 py-2.5 rounded-full font-sans font-semibold text-[14px] disabled:opacity-30" style={{ background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}>
              {coachLoading ? "Coaching..." : "Coach me"}
            </button>
            <button onClick={handleCopy} disabled={!draft.trim()} className="px-5 py-2 rounded-full font-mono text-[13px] disabled:opacity-30" style={{ border: `1px solid ${BORDER}`, background: "transparent", cursor: "pointer", color: DIM }}>
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
        </div>

        {/* Coaching results */}
        {coaching && (
          <div className="space-y-4 mb-8">
            <div className="p-4 rounded-[10px]" style={{ border: `1px solid ${BORDER}` }}>
              <span className="font-mono uppercase block mb-2" style={{ fontSize: 10, letterSpacing: "0.06em", color: "#AAAAAA" }}>Structure</span>
              <p className="font-sans text-[14px]" style={{ color: INK, lineHeight: 1.5 }}>{coaching.structure}</p>
            </div>
            <div className="p-4 rounded-[10px]" style={{ border: `1px solid ${BORDER}` }}>
              <span className="font-mono uppercase block mb-2" style={{ fontSize: 10, letterSpacing: "0.06em", color: "#AAAAAA" }}>How to stand out</span>
              <div className="space-y-2">
                <p className="font-sans text-[13px]" style={{ color: DIM }}><strong style={{ color: INK }}>Everyone else:</strong> {coaching.stand_out.common_take}</p>
                <div className="pl-3" style={{ borderLeft: `2px solid ${BLUE}` }}>
                  <p className="font-sans text-[14px]" style={{ color: INK }}><strong>Your angle:</strong> {coaching.stand_out.your_angle}</p>
                </div>
                <p className="font-sans text-[14px] font-medium" style={{ color: INK }}><strong>Bold move:</strong> {coaching.stand_out.bold_move}</p>
              </div>
            </div>
            {coaching.channel_fit && (
              <p className="font-sans text-[13px]" style={{ color: DIM }}><strong style={{ color: INK }}>Channel fit:</strong> {coaching.channel_fit}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Diary + Stories view
  return (
    <div className="max-w-[640px] mx-auto px-5 py-8">
      <span className="font-mono text-[11px] uppercase block mb-4" style={{ color: "#AAAAAA", letterSpacing: "0.1em" }}>{today}</span>
      <h2 className="font-serif mb-2" style={{ fontSize: 28, fontWeight: 400, color: INK }}>What happened today?</h2>
      <p className="font-sans mb-6 text-[14px]" style={{ color: DIM }}>Don't write a post. Just write what's on your mind. 2 minutes is enough.</p>

      <textarea
        value={entry}
        onChange={e => setEntry(e.target.value)}
        placeholder="This week I..."
        rows={8}
        className="w-full outline-none resize-y font-sans mb-2"
        style={{ fontSize: 16, color: INK, lineHeight: 1.7, padding: "16px 20px", border: `1px solid ${BORDER}`, borderRadius: 10, background: "#fff", minHeight: 180 }}
      />
      <div className="flex items-center justify-between mb-6">
        <span className="font-mono text-[11px]" style={{ color: "#AAAAAA" }}>{wordCount} words</span>
      </div>

      <button onClick={handleFindStories} disabled={!entry.trim() || loading} className="w-full py-3.5 rounded-full font-sans font-semibold text-[15px] transition-opacity hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed mb-8" style={{ background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}>
        {loading ? "Finding your stories..." : "Find my stories →"}
      </button>

      {/* Stories */}
      {stories && stories.length > 0 && (
        <div>
          <span className="font-mono uppercase block mb-3" style={{ fontSize: 10, letterSpacing: "0.1em", color: DIM }}>Stories found</span>
          <div className="space-y-3">
            {stories.map((story, i) => (
              <div key={i} className="transition-all" style={{ background: "#fff", border: `1px solid ${activeStory === i ? BLUE : BORDER}`, borderRadius: 10, overflow: "hidden" }}>
                <button onClick={() => setActiveStory(activeStory === i ? null : i)} className="w-full text-left p-4 flex items-start justify-between gap-3" style={{ border: "none", background: "transparent", cursor: "pointer" }}>
                  <div>
                    <span className="font-sans text-[15px] font-medium block" style={{ color: INK }}>{story.angle}</span>
                    <span className="font-mono text-[11px] mt-1 inline-block px-2 py-0.5 rounded-full" style={{ background: `${BLUE}0A`, color: BLUE, border: `1px solid ${BLUE}20` }}>{story.channel}</span>
                  </div>
                  <span className="text-[12px] shrink-0 mt-1" style={{ color: "#AAAAAA", transition: "transform 0.2s", transform: activeStory === i ? "rotate(180deg)" : "none" }}>▼</span>
                </button>
                {activeStory === i && (
                  <div className="px-4 pb-4 space-y-3">
                    <div className="pl-3" style={{ borderLeft: `2px solid ${BLUE}` }}>
                      <span className="font-mono uppercase block mb-1" style={{ fontSize: 10, color: "#AAAAAA" }}>Insight</span>
                      <p className="font-sans text-[14px]" style={{ color: INK, lineHeight: 1.5 }}>{story.insight}</p>
                    </div>
                    <div>
                      <span className="font-mono uppercase block mb-1" style={{ fontSize: 10, color: "#AAAAAA" }}>Writing nudge</span>
                      <p className="font-sans text-[14px] italic" style={{ color: DIM, lineHeight: 1.5 }}>{story.nudge}</p>
                    </div>
                    <button onClick={() => handleWriteThis(story)} className="px-5 py-2.5 rounded-full font-sans font-semibold text-[14px]" style={{ background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}>
                      Write this →
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Spread View (imported from existing) ── */
function SpreadView() {
  return (
    <div className="max-w-[640px] mx-auto px-5 py-12 text-center">
      <h2 className="font-serif mb-4" style={{ fontSize: 24, fontWeight: 400, color: INK }}>Spread</h2>
      <p className="font-sans mb-6" style={{ fontSize: 15, color: DIM }}>Paste a draft and spread it across channels.</p>
      <p className="font-sans text-[14px]" style={{ color: "#AAAAAA" }}>Coming soon to the new diary flow. Use the standalone version at <a href="/write?tab=tools" style={{ color: BLUE }}>/write</a>.</p>
    </div>
  );
}

/* ── Main Page ── */
export default function WritePage() {
  const [mode, setMode] = useState<"diary" | "tools">("diary");

  return (
    <div className="min-h-screen" style={{ background: "#fff" }}>
      <nav style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[960px] mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/" className="no-underline font-serif" style={{ fontSize: 20, fontWeight: 600, color: INK }}>accent</Link>
          <div className="flex items-center gap-1 p-0.5 rounded-full" style={{ background: "#F5F5F5" }}>
            <button onClick={() => setMode("diary")} className="px-4 py-1.5 rounded-full text-[13px] font-mono transition-all" style={{
              background: mode === "diary" ? "#fff" : "transparent", color: mode === "diary" ? INK : DIM,
              border: "none", cursor: "pointer", boxShadow: mode === "diary" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}>Diary</button>
            <button onClick={() => setMode("tools")} className="px-4 py-1.5 rounded-full text-[13px] font-mono transition-all" style={{
              background: mode === "tools" ? "#fff" : "transparent", color: mode === "tools" ? INK : DIM,
              border: "none", cursor: "pointer", boxShadow: mode === "tools" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}>Tools</button>
          </div>
          <Link href="/settings" className="no-underline font-mono text-[12px]" style={{ color: DIM }}>Settings</Link>
        </div>
      </nav>

      {mode === "diary" ? (
        <DiaryView />
      ) : (
        <div className="max-w-[640px] mx-auto px-5 py-8">
          <AppShell />
        </div>
      )}
    </div>
  );
}
