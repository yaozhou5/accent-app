"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { getProfile, type UserProfile } from "@/lib/supabase/profiles";
import { createWeeklyDump, getAllDumps, type WeeklyDump } from "@/lib/supabase/planner";
import { savePlan, getCurrentPlan, getAllPlans, getWeekStart, type ContentPlan, type ContentPlanData, type ContentPlanPost } from "@/lib/supabase/planner";
import { createLogEntry, updateLogEntryTags, getLogEntries, uploadLogImage, detectUrl, toggleBookmark, type LogEntry, type LogEntryType } from "@/lib/supabase/log-entries";
import { getDraft, saveDraft } from "@/lib/supabase/drafts";

const INK = "#1A1A18";
const DIM = "#6B6B6B";
const FAINT = "#AAAAAA";
const BLUE = "#2563EB";
const BORDER = "#E5E5E5";

const PLATFORM_ICONS: Record<string, string> = { instagram: "IG", linkedin: "in", x: "X", threads: "TH", tiktok: "TT" };
const CONTENT_TYPE_COLORS: Record<string, string> = {
  "personal-story": "#8b5cf6", "lesson": "#3b82f6", "behind-the-scenes": "#0d9488",
  "listicle": "#f59e0b", "hot-take": "#ef4444", "social-proof": "#22c55e",
};
const TAG_COLORS: Record<string, string> = {
  launch: "#ef4444", frustration: "#f59e0b", meeting: "#3b82f6", idea: "#8b5cf6",
  milestone: "#22c55e", rejection: "#ec4899", partnership: "#0d9488", decision: "#f97316",
  win: "#22c55e", "customer feedback": "#06b6d4", hiring: "#6366f1", product: "#2563EB",
  marketing: "#e11d48", fundraising: "#7c3aed", personal: "#78716c",
};

function weekLabel(ws: string): string {
  const m = new Date(ws + "T12:00:00");
  const f = new Date(m); f.setDate(m.getDate() + 4);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(m)}-${fmt(f)}`;
}
function getDayLabel(ds: string): string {
  const d = new Date(ds), now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const entry = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((today.getTime() - entry.getTime()) / 86400000);
  if (diff === 0) return "Today"; if (diff === 1) return "Yesterday";
  if (diff < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}
function formatTime(ds: string): string { return new Date(ds).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }); }
function groupByDay(entries: LogEntry[]): Map<string, LogEntry[]> {
  const g = new Map<string, LogEntry[]>();
  for (const e of entries) { const l = getDayLabel(e.created_at); g.set(l, [...(g.get(l) || []), e]); }
  return g;
}
function getDomain(url: string): string { try { return new URL(url).hostname; } catch { return url; } }

type Tab = "log" | "ideas" | "shelf";

/* ══════════════ LOG TAB ══════════════ */
function LogTab({ logEntries, setLogEntries }: {
  logEntries: LogEntry[];
  setLogEntries: (fn: (prev: LogEntry[]) => LogEntry[]) => void;
}) {
  const [input, setInput] = useState("");
  const [entryType, setEntryType] = useState<LogEntryType>("note");
  const [source, setSource] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tagEntryAsync = (entry: LogEntry) => {
    const tagContent = entry.content || "";
    const extras: string[] = [];
    if (entry.image_url) extras.push("[image]");
    if (entry.url) extras.push(`[link: ${entry.url}]`);
    if (entry.type === "quote") extras.push("[quote]");
    fetch("/api/tag-entry", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: `${tagContent} ${extras.join(" ")}`.trim() }),
    }).then(r => r.json()).then(({ tags }) => {
      if (tags?.length) {
        updateLogEntryTags(entry.id, tags);
        setLogEntries((prev: LogEntry[]) => prev.map(e => e.id === entry.id ? { ...e, tags } : e));
      }
    }).catch(() => {});
  };

  const handleSubmit = async () => {
    if ((!input.trim() && !pendingImage) || submitting) return;
    setSubmitting(true);
    setError(null);

    try {
      let imageUrl: string | null = null;
      if (pendingImage) {
        imageUrl = await uploadLogImage(pendingImage);
        setPendingImage(null); setPendingImagePreview(null);
      }

      const detectedLink = entryType === "note" ? detectUrl(input.trim()) : null;
      const entryUrl = entryType === "link" ? (detectUrl(input.trim()) || input.trim()) : null;

      const entry = await createLogEntry(input.trim(), {
        image_url: imageUrl,
        link_url: detectedLink,
        type: entryType,
        url: entryUrl,
        source: entryType === "quote" && source.trim() ? source.trim() : null,
      });
      if (entry) {
        setLogEntries((prev: LogEntry[]) => [entry, ...prev]);
        setInput(""); setSource("");
        tagEntryAsync(entry);
      } else {
        setError("Failed to save. Check that the database columns exist (type, url, source, bookmarked).");
      }
    } catch (e) {
      console.error("Submit error:", e);
      setError("Something went wrong. Check console.");
    }
    setSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && entryType !== "quote") { e.preventDefault(); handleSubmit(); }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setPendingImage(file); setPendingImagePreview(URL.createObjectURL(file)); e.target.value = "";
  };

  const handleToggleBookmark = async (id: string, current: boolean) => {
    const ok = await toggleBookmark(id, !current);
    if (ok) setLogEntries((prev: LogEntry[]) => prev.map(e => e.id === id ? { ...e, bookmarked: !current } : e));
  };

  const grouped = groupByDay(logEntries);
  const placeholders: Record<LogEntryType, string> = {
    note: "Quick note... meeting, idea, frustration, anything",
    link: "Paste a URL that inspired you...",
    quote: "A quote or snippet you want to remember...",
  };

  return (
    <div>
      {/* Compose */}
      <div className="mb-6 rounded-[12px] overflow-hidden" style={{ border: `1px solid ${BORDER}`, background: "#fff" }}>
        {/* Type chips */}
        <div className="flex gap-1.5 px-4 pt-3">
          {(["note", "link", "quote"] as LogEntryType[]).map(t => (
            <button key={t} onClick={() => setEntryType(t)}
              className="font-mono text-[11px] px-3 py-1 rounded-full transition-all capitalize"
              style={{ background: entryType === t ? `${BLUE}12` : "transparent", color: entryType === t ? BLUE : FAINT, border: entryType === t ? `1px solid ${BLUE}30` : `1px solid transparent`, cursor: "pointer" }}>
              {t === "note" ? "📝 Note" : t === "link" ? "🔗 Link" : "💬 Quote"}
            </button>
          ))}
        </div>
        {pendingImagePreview && (
          <div className="px-4 pt-3 relative inline-block">
            <img src={pendingImagePreview} alt="Preview" className="rounded-[8px]" style={{ maxHeight: 100, border: `1px solid ${BORDER}` }} />
            <button onClick={() => { setPendingImage(null); setPendingImagePreview(null); }}
              className="absolute top-1 right-2 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: INK, color: "#fff", fontSize: 10, border: "none", cursor: "pointer" }}>×</button>
          </div>
        )}
        <textarea
          value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
          placeholder={placeholders[entryType]} rows={3}
          className="w-full outline-none resize-none font-sans"
          style={{ fontSize: 15, color: INK, lineHeight: 1.6, padding: "12px 16px 4px", border: "none", background: "transparent", minHeight: 72, fontStyle: entryType === "quote" ? "italic" : "normal" }}
        />
        {entryType === "quote" && (
          <div className="px-4 pb-1">
            <input value={source} onChange={e => setSource(e.target.value)} placeholder="Source (optional): Paul Graham, a podcast, overheard..."
              className="w-full outline-none font-sans text-[13px]" style={{ color: DIM, padding: "4px 0", border: "none", background: "transparent" }} />
          </div>
        )}
        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex items-center gap-1">
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageSelect} className="hidden" />
            {entryType === "note" && (
              <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full transition-colors hover:bg-gray-50"
                style={{ border: "none", background: "transparent", cursor: "pointer" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={pendingImage ? BLUE : FAINT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                </svg>
              </button>
            )}
          </div>
          <button onClick={handleSubmit} disabled={(!input.trim() && !pendingImage) || submitting}
            className="px-5 py-2 rounded-full font-sans font-semibold text-[13px] disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}>
            {submitting ? "..." : "Log"}
          </button>
        </div>
      </div>

      {error && <p className="font-sans text-[13px] mb-4" style={{ color: "#DC2626" }}>{error}</p>}

      {/* Feed */}
      {logEntries.length === 0 ? (
        <div className="text-center py-12"><p className="font-sans" style={{ fontSize: 15, color: FAINT }}>No notes yet. What happened today?</p></div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([dayLabel, entries]) => (
            <div key={dayLabel}>
              <span className="font-mono uppercase block mb-2" style={{ fontSize: 10, letterSpacing: "0.08em", color: FAINT }}>{dayLabel}</span>
              <div className="space-y-2">
                {entries.map(entry => {
                  const isQuote = entry.type === "quote";
                  const isLink = entry.type === "link";
                  const entryUrl = entry.url || entry.link_url || (entry.content ? detectUrl(entry.content) : null);
                  return (
                    <div key={entry.id} className="rounded-[10px] p-3.5" style={{
                      border: `1px solid ${BORDER}`, background: "#fff",
                      borderLeft: isQuote ? `3px solid ${BLUE}` : isLink ? `3px solid #0d9488` : `1px solid ${BORDER}`,
                    }}>
                      {isQuote && <span style={{ fontSize: 24, color: FAINT, lineHeight: 1 }}>"</span>}
                      {entry.content && (
                        <p className="font-sans text-[14px]" style={{ color: INK, lineHeight: 1.55, fontStyle: isQuote ? "italic" : "normal" }}>{entry.content}</p>
                      )}
                      {isQuote && entry.source && (
                        <p className="font-sans text-[12px] mt-1" style={{ color: FAINT }}>— {entry.source}</p>
                      )}
                      {entry.image_url && (
                        <div className="mt-2">
                          <img src={entry.image_url} alt="" className="rounded-[6px] cursor-pointer hover:opacity-90"
                            style={{ maxHeight: expandedImage === entry.id ? 400 : 100, border: `1px solid ${BORDER}`, objectFit: "cover" }}
                            onClick={() => setExpandedImage(expandedImage === entry.id ? null : entry.id)} />
                        </div>
                      )}
                      {(isLink || entryUrl) && entryUrl && (
                        <a href={entryUrl} target="_blank" rel="noopener noreferrer"
                          className="no-underline block mt-2 p-2.5 rounded-[6px] hover:bg-gray-50" style={{ border: `1px solid ${BORDER}` }}>
                          <span className="font-mono text-[11px] block" style={{ color: "#0d9488" }}>{getDomain(entryUrl)}</span>
                          <span className="font-mono text-[10px] block mt-0.5 truncate" style={{ color: FAINT }}>{entryUrl}</span>
                        </a>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="font-mono text-[10px]" style={{ color: FAINT }}>{formatTime(entry.created_at)}</span>
                        {entry.tags.map(tag => (
                          <span key={tag} className="font-mono text-[10px] px-2 py-0.5 rounded-full"
                            style={{ background: `${TAG_COLORS[tag] || DIM}15`, color: TAG_COLORS[tag] || DIM }}>{tag}</span>
                        ))}
                        <button onClick={() => handleToggleBookmark(entry.id, entry.bookmarked || false)}
                          className="ml-auto p-0.5" style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, opacity: entry.bookmarked ? 1 : 0.3 }}>
                          {entry.bookmarked ? "🔖" : "🔖"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════ IDEAS TAB ══════════════ */
function IdeasTab({ profile, allPlans, weekEntries, initialWeek, onPlanGenerated, onSwitchToLog, onWritePost }: {
  profile: UserProfile; allPlans: ContentPlan[]; weekEntries: LogEntry[];
  initialWeek?: string; onPlanGenerated: (plan: ContentPlan) => void;
  onSwitchToLog: () => void; onWritePost: (planId: string, postIndex: number) => void;
}) {
  const weeks = Array.from(new Set(allPlans.map(p => p.week_start))).sort().reverse();
  const targetWeek = getWeekStart();
  const hasCurrentPlan = allPlans.some(p => p.week_start === targetWeek);

  const [weekIdx, setWeekIdx] = useState(() => { if (initialWeek) { const i = weeks.indexOf(initialWeek); return i >= 0 ? i : 0; } return 0; });
  const [expanded, setExpanded] = useState<number | null>(null);
  const [extraContext, setExtraContext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGenerate, setShowGenerate] = useState(!hasCurrentPlan);

  useEffect(() => { if (initialWeek) { const i = weeks.indexOf(initialWeek); if (i >= 0) { setWeekIdx(i); setShowGenerate(false); } } }, [initialWeek]);

  const primaryGoal = (profile.goals || [])[0]?.replace(/_/g, " ") || "content";
  const platformsList = (profile.platforms || []).join(", ") || "not set";
  const freq = profile.posting_frequency || "not set";
  const noteCount = weekEntries.filter(e => e.type === "note" || !e.type).length;
  const linkCount = weekEntries.filter(e => e.type === "link").length;
  const quoteCount = weekEntries.filter(e => e.type === "quote").length;
  const totalEntries = weekEntries.length;

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true); setError(null);
    try {
      const entriesPayload = weekEntries.map(e => ({ content: e.content || "", tags: e.tags, image_url: e.image_url, link_url: e.link_url, url: e.url, type: e.type, source: e.source }));
      const shelfItems = weekEntries.filter(e => (e.type === "link" || e.type === "quote" || e.bookmarked));
      const combined = weekEntries.map(e => e.content || "").join("\n");
      const dumpContent = extraContext.trim() ? `${combined}\n\nAdditional context: ${extraContext.trim()}` : combined;
      const savedDump = await createWeeklyDump(dumpContent || extraContext.trim() || "No notes this week");
      if (!savedDump) { setError("Failed to save."); setGenerating(false); return; }
      const body = { entries: entriesPayload.length > 0 ? entriesPayload : undefined, dump: extraContext.trim() || (entriesPayload.length === 0 ? "Generate a plan based on my profile" : undefined), shelfItems: shelfItems.length > 0 ? shelfItems : undefined, profile };
      const res = await fetch("/api/generate-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { setError("Failed to generate plan."); setGenerating(false); return; }
      const planData: ContentPlanData = await res.json();
      const saved = await savePlan(savedDump.id, planData);
      if (!saved) { setError("Plan generated but failed to save."); setGenerating(false); return; }
      onPlanGenerated(saved); setShowGenerate(false);
    } catch { setError("Something went wrong."); }
    setGenerating(false);
  };

  // Generate view
  if (showGenerate && !hasCurrentPlan) {
    return (
      <div>
        <h2 className="font-serif mb-6" style={{ fontSize: 24, fontWeight: 400, color: INK }}>Ready to plan your week?</h2>
        <div className="rounded-[12px] p-5 mb-6 space-y-3" style={{ background: "#fafafa", border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between">
            <span className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: "0.08em", color: FAINT }}>📋 Your week at a glance</span>
            <Link href="/settings" className="font-mono text-[11px] no-underline" style={{ color: BLUE }}>Edit profile</Link>
          </div>
          <div className="space-y-2">
            <p className="font-sans text-[14px]" style={{ color: INK }}>
              <span style={{ color: FAINT }}>Notes this week:</span> <strong>{noteCount}</strong>
            </p>
            {(linkCount > 0 || quoteCount > 0) && (
              <p className="font-sans text-[14px]" style={{ color: INK }}>
                <span style={{ color: FAINT }}>Inspiration saved:</span> {linkCount > 0 && <strong>{linkCount} link{linkCount !== 1 ? "s" : ""}</strong>}{linkCount > 0 && quoteCount > 0 && ", "}{quoteCount > 0 && <strong>{quoteCount} quote{quoteCount !== 1 ? "s" : ""}</strong>}
              </p>
            )}
            <p className="font-sans text-[14px]" style={{ color: INK }}><span style={{ color: FAINT }}>Goal:</span> <strong style={{ textTransform: "capitalize" }}>{primaryGoal}</strong></p>
            <p className="font-sans text-[14px]" style={{ color: INK }}><span style={{ color: FAINT }}>Posting on:</span> {platformsList}</p>
            <p className="font-sans text-[14px]" style={{ color: INK }}><span style={{ color: FAINT }}>Target:</span> {freq} posts/week</p>
          </div>
          {totalEntries < 3 && (
            <p className="font-sans text-[13px] pt-2" style={{ color: "#f59e0b" }}>Add a few more notes to your Log this week — the more context, the better your plan.</p>
          )}
        </div>
        <div className="mb-6">
          <label className="font-mono uppercase block mb-2" style={{ fontSize: 10, letterSpacing: "0.08em", color: FAINT }}>Anything else on your mind this week? (optional)</label>
          <textarea value={extraContext} onChange={e => setExtraContext(e.target.value)} placeholder="Launching a new feature, meeting an investor..." rows={3}
            className="w-full outline-none resize-y font-sans" style={{ fontSize: 15, color: INK, lineHeight: 1.6, padding: "12px 16px", border: `1px solid ${BORDER}`, borderRadius: 10 }} />
        </div>
        {error && <p className="font-sans text-[13px] mb-3" style={{ color: "#DC2626" }}>{error}</p>}
        <button onClick={handleGenerate} disabled={generating} className="w-full py-3.5 rounded-full font-sans font-semibold text-[15px] disabled:opacity-50"
          style={{ background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}>
          {generating ? "Generating your plan..." : "Generate my plan"}
        </button>
        {generating && <div className="mt-6 space-y-3 animate-pulse">{[1, 2, 3].map(i => <div key={i} className="rounded-[12px] p-5" style={{ background: "#fff", border: `1px solid ${BORDER}` }}><div className="h-3 rounded w-16 mb-3" style={{ background: "#e5e5e5" }} /><div className="h-5 rounded w-3/4 mb-2" style={{ background: "#e5e5e5" }} /><div className="h-12 rounded" style={{ background: "#f0f0f0" }} /></div>)}</div>}
      </div>
    );
  }

  if (weeks.length === 0) {
    return (<div className="text-center py-16"><p className="font-sans mb-4" style={{ fontSize: 15, color: FAINT }}>No plans yet.</p>
      <button onClick={() => setShowGenerate(true)} className="font-sans text-[14px]" style={{ color: BLUE, background: "none", border: "none", cursor: "pointer" }}>Generate your first plan →</button></div>);
  }

  const currentWeek = weeks[weekIdx];
  const plan = allPlans.find(p => p.week_start === currentWeek);
  const raw = plan?.plan;
  const planData: ContentPlanData | null = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setWeekIdx(Math.min(weekIdx + 1, weeks.length - 1))} disabled={weekIdx >= weeks.length - 1}
          className="p-2 rounded-full disabled:opacity-20" style={{ border: `1px solid ${BORDER}`, background: "transparent", cursor: "pointer" }}><span style={{ fontSize: 14, color: DIM }}>←</span></button>
        <div className="text-center">
          <span className="font-mono text-[12px] block" style={{ color: BLUE }}>{weekLabel(currentWeek)}</span>
          <span className="font-mono text-[10px]" style={{ color: FAINT }}>{planData ? `${planData.posts.length} posts` : "No plan"}</span>
        </div>
        <button onClick={() => setWeekIdx(Math.max(weekIdx - 1, 0))} disabled={weekIdx <= 0}
          className="p-2 rounded-full disabled:opacity-20" style={{ border: `1px solid ${BORDER}`, background: "transparent", cursor: "pointer" }}><span style={{ fontSize: 14, color: DIM }}>→</span></button>
      </div>
      {!planData ? (
        <div className="text-center py-12"><p className="font-sans" style={{ fontSize: 15, color: FAINT }}>No plan for this week.</p></div>
      ) : (
        <div>
          {planData.strategy_note && (
            <div className="mb-5 p-4 rounded-[10px]" style={{ background: "#fafafa", border: `1px solid ${BORDER}` }}>
              <p className="font-sans text-[14px]" style={{ color: INK, lineHeight: 1.6 }}>{planData.strategy_note}</p>
            </div>
          )}
          <div className="space-y-3">
            {planData.posts.map((post, i) => {
              const isExp = expanded === i;
              const typeColor = CONTENT_TYPE_COLORS[post.type] || CONTENT_TYPE_COLORS[post.post_type || ""] || BLUE;
              const typeLabel = post.type || post.post_type || "";
              const dateObj = new Date(post.date + "T12:00:00");
              const dayNum = dateObj.getDate();
              const dayName = post.day.slice(0, 3);
              const displayText = post.key_takeaway || post.hook || "";
              const hasStructure = post.structure && post.structure.length > 0;

              return (
                <div key={i} onClick={() => setExpanded(isExp ? null : i)} className="rounded-[12px] transition-all cursor-pointer"
                  style={{ border: `1px solid ${isExp ? BLUE : BORDER}`, background: isExp ? `${BLUE}04` : "#fff" }}>
                  <div className="flex gap-4 p-5">
                    <div className="shrink-0 text-center" style={{ width: 44 }}>
                      <span className="font-mono uppercase block" style={{ fontSize: 10, color: DIM }}>{dayName}</span>
                      <span className="font-serif block" style={{ fontSize: 22, fontWeight: 600, color: INK }}>{dayNum}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: "#f0f0f0", color: DIM }}>{PLATFORM_ICONS[post.platform] || post.platform}</span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: `${typeColor}12`, color: typeColor }}>{typeLabel}</span>
                      </div>
                      <p className="font-sans font-semibold" style={{ fontSize: 15, color: INK, lineHeight: 1.45 }}>{displayText}</p>
                      {!isExp && hasStructure && (
                        <p className="font-sans mt-1.5" style={{ fontSize: 13, color: DIM, lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {post.structure.join(" → ")}
                        </p>
                      )}
                      {!isExp && !hasStructure && post.reasoning && (
                        <p className="font-sans mt-1.5" style={{ fontSize: 13, color: DIM, lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{post.reasoning}</p>
                      )}
                    </div>
                    <span className="shrink-0 mt-1" style={{ color: FAINT, fontSize: 12, transition: "transform 0.2s", transform: isExp ? "rotate(180deg)" : "none" }}>▼</span>
                  </div>
                  {isExp && (
                    <div className="px-5 pb-5 pt-0 ml-16 space-y-4" style={{ borderTop: `1px solid ${BORDER}` }}>
                      {hasStructure && (
                        <div className="pt-4">
                          <span className="font-mono uppercase block mb-2" style={{ fontSize: 10, color: FAINT, letterSpacing: "0.06em" }}>Structure</span>
                          <ol className="space-y-2 pl-0" style={{ listStyle: "none", counterReset: "step" }}>
                            {post.structure.map((step: string, j: number) => (
                              <li key={j} className="font-sans text-[14px] flex gap-2" style={{ color: INK, lineHeight: 1.55 }}>
                                <span className="font-mono text-[11px] shrink-0 mt-0.5" style={{ color: BLUE }}>{j + 1}.</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      )}
                      {post.reasoning && (
                        <div><span className="font-mono uppercase block mb-1" style={{ fontSize: 10, color: FAINT, letterSpacing: "0.06em" }}>Why this post</span>
                          <p className="font-sans text-[14px]" style={{ color: INK, lineHeight: 1.6 }}>{post.reasoning}</p></div>
                      )}
                      {post.goal_alignment && (
                        <div><span className="font-mono uppercase block mb-1" style={{ fontSize: 10, color: FAINT, letterSpacing: "0.06em" }}>Goal alignment</span>
                          <p className="font-sans text-[14px]" style={{ color: INK, lineHeight: 1.55 }}>{post.goal_alignment}</p></div>
                      )}
                      <button onClick={e => { e.stopPropagation(); if (plan) onWritePost(plan.id, i); }}
                        className="px-5 py-2 rounded-full font-sans text-[13px] font-medium"
                        style={{ border: `1px solid ${BLUE}`, background: "transparent", color: BLUE, cursor: "pointer" }}>
                        Write this →
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button onClick={onSwitchToLog} className="mt-6 w-full py-3 rounded-full font-sans text-[14px]"
            style={{ border: `1px solid ${BORDER}`, color: DIM, background: "transparent", cursor: "pointer" }}>Add more notes for next week</button>
        </div>
      )}
    </div>
  );
}

/* ══════════════ SHELF TAB ══════════════ */
function ShelfTab({ logEntries, setLogEntries }: { logEntries: LogEntry[]; setLogEntries: (fn: (prev: LogEntry[]) => LogEntry[]) => void }) {
  const [filter, setFilter] = useState<"all" | "links" | "quotes" | "bookmarked">("all");

  const shelfItems = logEntries.filter(e => {
    if (filter === "links") return e.type === "link";
    if (filter === "quotes") return e.type === "quote";
    if (filter === "bookmarked") return e.bookmarked;
    return e.type === "link" || e.type === "quote" || e.bookmarked;
  });

  const handleRemove = async (id: string) => {
    const entry = logEntries.find(e => e.id === id);
    if (!entry) return;
    if (entry.bookmarked) {
      const ok = await toggleBookmark(id, false);
      if (ok) setLogEntries((prev: LogEntry[]) => prev.map(e => e.id === id ? { ...e, bookmarked: false } : e));
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {(["all", "links", "quotes", "bookmarked"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="font-mono text-[11px] px-3 py-1.5 rounded-full capitalize transition-all"
            style={{ background: filter === f ? `${BLUE}12` : "transparent", color: filter === f ? BLUE : FAINT, border: filter === f ? `1px solid ${BLUE}30` : `1px solid ${BORDER}`, cursor: "pointer" }}>
            {f === "all" ? "All" : f === "links" ? "🔗 Links" : f === "quotes" ? "💬 Quotes" : "🔖 Bookmarked"}
          </button>
        ))}
      </div>
      {shelfItems.length === 0 ? (
        <div className="text-center py-16"><p className="font-sans" style={{ fontSize: 15, color: FAINT }}>
          {filter === "all" ? "Save links, quotes, or bookmark notes to build your inspiration bank." : `No ${filter} items yet.`}
        </p></div>
      ) : (
        <div className="space-y-3">
          {shelfItems.map(item => {
            const entryUrl = item.url || item.link_url;
            return (
              <div key={item.id} className="rounded-[10px] p-4" style={{
                border: `1px solid ${BORDER}`, background: "#fff",
                borderLeft: item.type === "quote" ? `3px solid ${BLUE}` : item.type === "link" ? `3px solid #0d9488` : `1px solid ${BORDER}`,
              }}>
                {item.type === "quote" && <span style={{ fontSize: 20, color: FAINT, lineHeight: 1 }}>"</span>}
                {item.content && <p className="font-sans text-[14px]" style={{ color: INK, lineHeight: 1.55, fontStyle: item.type === "quote" ? "italic" : "normal" }}>{item.content}</p>}
                {item.type === "quote" && item.source && <p className="font-sans text-[12px] mt-1" style={{ color: FAINT }}>— {item.source}</p>}
                {entryUrl && (
                  <a href={entryUrl} target="_blank" rel="noopener noreferrer" className="no-underline block mt-2 p-2 rounded-[6px] hover:bg-gray-50" style={{ border: `1px solid ${BORDER}` }}>
                    <span className="font-mono text-[11px]" style={{ color: "#0d9488" }}>{getDomain(entryUrl)}</span>
                  </a>
                )}
                <div className="flex items-center justify-between mt-2">
                  <span className="font-mono text-[10px]" style={{ color: FAINT }}>{getDayLabel(item.created_at)} · {formatTime(item.created_at)}</span>
                  {item.bookmarked && <button onClick={() => handleRemove(item.id)} className="font-mono text-[10px]" style={{ color: FAINT, background: "none", border: "none", cursor: "pointer" }}>Remove</button>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════ WRITE MODE ══════════════ */
function WriteMode({ planId, postIndex, post, onBack }: { planId: string; postIndex: number; post: ContentPlanPost; onBack: () => void }) {
  const [content, setContent] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showStructure, setShowStructure] = useState(true);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    getDraft(planId, postIndex).then(d => { if (d) setContent(d.content); setLoaded(true); });
  }, [planId, postIndex]);

  const handleChange = (val: string) => {
    setContent(val);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      setSaving(true);
      await saveDraft(planId, postIndex, val);
      setSaving(false);
    }, 1000);
  };

  if (!loaded) return <div className="py-12 text-center"><span className="font-sans text-[14px]" style={{ color: FAINT }}>Loading...</span></div>;

  const hasStructure = post.structure && post.structure.length > 0;
  const displayText = post.key_takeaway || post.hook || "";

  return (
    <div className="min-h-screen" style={{ background: "#fff" }}>
      <div className="max-w-[640px] mx-auto px-5 py-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="font-mono text-[12px]" style={{ color: DIM, background: "none", border: "none", cursor: "pointer" }}>← Back to plan</button>
          <span className="font-mono text-[11px]" style={{ color: saving ? BLUE : FAINT }}>{saving ? "Saving..." : "Saved"}</span>
        </div>

        <p className="font-sans text-[14px] font-semibold mb-4" style={{ color: DIM }}>{displayText}</p>

        {hasStructure && (
          <div className="mb-6">
            <button onClick={() => setShowStructure(!showStructure)} className="font-mono text-[11px] uppercase mb-2" style={{ color: FAINT, background: "none", border: "none", cursor: "pointer", letterSpacing: "0.06em" }}>
              {showStructure ? "Hide structure ▲" : "Show structure ▼"}
            </button>
            {showStructure && (
              <div className="p-4 rounded-[10px] space-y-2" style={{ background: "#fafafa", border: `1px solid ${BORDER}` }}>
                {post.structure.map((step: string, j: number) => (
                  <p key={j} className="font-sans text-[13px]" style={{ color: DIM, lineHeight: 1.5 }}>
                    <span className="font-mono text-[11px] mr-2" style={{ color: BLUE }}>{j + 1}.</span>{step}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <textarea
          value={content} onChange={e => handleChange(e.target.value)}
          placeholder="Start writing..."
          className="w-full outline-none resize-y font-sans"
          style={{ fontSize: 17, color: INK, lineHeight: 1.8, padding: 0, border: "none", background: "transparent", minHeight: "50vh" }}
          autoFocus
        />
      </div>
    </div>
  );
}

/* ══════════════ DASHBOARD PAGE ══════════════ */
export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [currentPlan, setCurrentPlan] = useState<ContentPlan | null>(null);
  const [allDumps, setAllDumps] = useState<WeeklyDump[]>([]);
  const [allPlans, setAllPlans] = useState<ContentPlan[]>([]);
  const [logEntriesState, setLogEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("log");
  const [ideasWeek, setIdeasWeek] = useState<string | undefined>();
  const [writeMode, setWriteMode] = useState<{ planId: string; postIndex: number } | null>(null);

  useEffect(() => {
    async function load() {
      const [p, plan, dumps, plans, entries] = await Promise.all([getProfile(), getCurrentPlan(), getAllDumps(), getAllPlans(), getLogEntries()]);
      setProfile(p); setCurrentPlan(plan); setAllDumps(dumps); setAllPlans(plans); setLogEntries(entries);
      if (plan) setTab("ideas");
      setLoading(false);
    }
    load();
  }, []);

  const nowDate = new Date(); const nowDay = nowDate.getDay(); const nowDiff = nowDay === 0 ? 6 : nowDay - 1;
  const mondayDate = new Date(nowDate); mondayDate.setDate(nowDate.getDate() - nowDiff); mondayDate.setHours(0, 0, 0, 0);
  const weekEntries = logEntriesState.filter(e => new Date(e.created_at) >= mondayDate);

  const handlePlanGenerated = (plan: ContentPlan) => { setCurrentPlan(plan); setAllPlans(prev => [plan, ...prev]); setTab("ideas"); };
  const switchToIdeas = (ws?: string) => { setIdeasWeek(ws); setTab("ideas"); };

  // Write mode
  if (writeMode) {
    const plan = allPlans.find(p => p.id === writeMode.planId);
    if (plan) {
      const planData: ContentPlanData = typeof plan.plan === "string" ? JSON.parse(plan.plan) : plan.plan;
      const post = planData.posts[writeMode.postIndex];
      if (post) return <WriteMode planId={writeMode.planId} postIndex={writeMode.postIndex} post={post} onBack={() => setWriteMode(null)} />;
    }
    setWriteMode(null);
  }

  if (loading) return (
    <div className="min-h-screen" style={{ background: "#fff" }}>
      <header style={{ borderBottom: `1px solid ${BORDER}` }}><div className="max-w-[640px] mx-auto px-5 py-4"><span className="font-serif" style={{ fontSize: 20, fontWeight: 600, color: INK }}>accent</span></div></header>
      <div className="max-w-[640px] mx-auto px-5 py-8 animate-pulse"><div className="h-7 rounded w-48 mb-4" style={{ background: "#f0f0f0" }} /><div className="h-44 rounded-[12px]" style={{ background: "#fafafa" }} /></div>
    </div>
  );

  const TABS: { key: Tab; label: string }[] = [{ key: "log", label: "Log" }, { key: "ideas", label: "Ideas" }, { key: "shelf", label: "Shelf" }];

  return (
    <div className="min-h-screen" style={{ background: "#fff" }}>
      <header style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[640px] mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/" className="no-underline font-serif" style={{ fontSize: 20, fontWeight: 600, color: INK }}>accent</Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard/write" className="no-underline font-mono text-[12px]" style={{ color: DIM }}>Writing coach</Link>
            <Link href="/settings" className="no-underline font-mono text-[12px]" style={{ color: DIM }}>Settings</Link>
          </div>
        </div>
      </header>
      <div style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[640px] mx-auto px-5 flex gap-6">
          {TABS.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); if (t.key !== "ideas") setIdeasWeek(undefined); }}
              className="font-mono text-[12px] py-3" style={{ color: tab === t.key ? BLUE : DIM, background: "none", border: "none", borderBottom: `2px solid ${tab === t.key ? BLUE : "transparent"}`, cursor: "pointer" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="max-w-[640px] mx-auto px-5 py-8">
        {tab === "log" && <LogTab logEntries={logEntriesState} setLogEntries={setLogEntries} />}
        {tab === "ideas" && <IdeasTab profile={profile!} allPlans={allPlans} weekEntries={weekEntries} initialWeek={ideasWeek} onPlanGenerated={handlePlanGenerated} onSwitchToLog={() => setTab("log")} onWritePost={(pid, pi) => setWriteMode({ planId: pid, postIndex: pi })} />}
        {tab === "shelf" && <ShelfTab logEntries={logEntriesState} setLogEntries={setLogEntries} />}
      </div>
    </div>
  );
}
