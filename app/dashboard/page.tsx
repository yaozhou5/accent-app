"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getProfile, type UserProfile } from "@/lib/supabase/profiles";
import { createWeeklyDump, getAllDumps, type WeeklyDump } from "@/lib/supabase/planner";
import { savePlan, getCurrentPlan, getAllPlans, getPlanByWeek, getWeekStart, type ContentPlan, type ContentPlanData, type ContentPlanPost } from "@/lib/supabase/planner";
import { createLogEntry, updateLogEntryTags, getLogEntries, getThisWeekEntries, type LogEntry } from "@/lib/supabase/log-entries";

const INK = "#1A1A18";
const DIM = "#6B6B6B";
const FAINT = "#AAAAAA";
const BLUE = "#2563EB";
const BORDER = "#E5E5E5";

const PLATFORM_ICONS: Record<string, string> = {
  instagram: "IG", linkedin: "in", x: "X", threads: "TH", tiktok: "TT",
};
const POST_TYPE_COLORS: Record<string, string> = {
  "origin story": "#8b5cf6", "launch moment": "#ef4444", "founder decision": "#f59e0b",
  "behind the scenes": "#0d9488", "user proof": "#22c55e", "industry take": "#3b82f6",
  "vulnerability": "#ec4899", "lesson learned": "#6366f1",
};

function weekLabel(weekStart: string): string {
  const mon = new Date(weekStart + "T12:00:00");
  const fri = new Date(mon);
  fri.setDate(mon.getDate() + 4);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(mon)}-${fmt(fri)}`;
}

type Tab = "log" | "ideas" | "shelf";

const TAG_COLORS: Record<string, string> = {
  launch: "#ef4444", frustration: "#f59e0b", meeting: "#3b82f6", idea: "#8b5cf6",
  milestone: "#22c55e", rejection: "#ec4899", partnership: "#0d9488", decision: "#f97316",
  win: "#22c55e", "customer feedback": "#06b6d4", hiring: "#6366f1", product: "#2563EB",
  marketing: "#e11d48", fundraising: "#7c3aed", personal: "#78716c",
};

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const entry = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((today.getTime() - entry.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function groupByDay(entries: LogEntry[]): Map<string, LogEntry[]> {
  const groups = new Map<string, LogEntry[]>();
  for (const e of entries) {
    const label = getDayLabel(e.created_at);
    const arr = groups.get(label) || [];
    arr.push(e);
    groups.set(label, arr);
  }
  return groups;
}

/* ══════════════ LOG TAB ══════════════ */
function LogTab({ profile, allDumps, logEntries, setLogEntries, onPlanGenerated, onSwitchToIdeas }: {
  profile: UserProfile;
  allDumps: WeeklyDump[];
  logEntries: LogEntry[];
  setLogEntries: (fn: (prev: LogEntry[]) => LogEntry[]) => void;
  onPlanGenerated: (plan: ContentPlan) => void;
  onSwitchToIdeas: (weekStart?: string) => void;
}) {
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dump, setDump] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDumpFallback, setShowDumpFallback] = useState(false);
  const [expandedDump, setExpandedDump] = useState<string | null>(null);

  // Get this week's entries for the generate button
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const mondayDate = new Date(now);
  mondayDate.setDate(now.getDate() - diff);
  mondayDate.setHours(0, 0, 0, 0);
  const weekEntries = logEntries.filter(e => new Date(e.created_at) >= mondayDate);

  const handleSubmitEntry = async () => {
    if (!input.trim() || submitting) return;
    setSubmitting(true);
    const entry = await createLogEntry(input.trim());
    if (entry) {
      setLogEntries((prev: LogEntry[]) => [entry, ...prev]);
      setInput("");
      // Tag async in background
      fetch("/api/tag-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: entry.content }),
      }).then(r => r.json()).then(({ tags }) => {
        if (tags?.length) {
          updateLogEntryTags(entry.id, tags);
          setLogEntries((prev: LogEntry[]) => prev.map(e => e.id === entry.id ? { ...e, tags } : e));
        }
      }).catch(() => {});
    }
    setSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmitEntry(); }
  };

  const handleGenerateFromEntries = async () => {
    if (weekEntries.length === 0 || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const combined = weekEntries.map(e => e.content).join("\n");
      const savedDump = await createWeeklyDump(combined);
      if (!savedDump) { setError("Failed to save."); setGenerating(false); return; }
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: weekEntries.map(e => ({ content: e.content, tags: e.tags })), profile }),
      });
      if (!res.ok) { setError("Failed to generate plan."); setGenerating(false); return; }
      const planData: ContentPlanData = await res.json();
      const saved = await savePlan(savedDump.id, planData);
      if (!saved) { setError("Plan generated but failed to save."); setGenerating(false); return; }
      onPlanGenerated(saved);
    } catch {
      setError("Something went wrong.");
    }
    setGenerating(false);
  };

  const handleGenerateFromDump = async () => {
    if (!dump.trim() || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const savedDump = await createWeeklyDump(dump.trim());
      if (!savedDump) { setError("Failed to save."); setGenerating(false); return; }
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dump: dump.trim(), profile }),
      });
      if (!res.ok) { setError("Failed to generate plan."); setGenerating(false); return; }
      const planData: ContentPlanData = await res.json();
      const saved = await savePlan(savedDump.id, planData);
      if (!saved) { setError("Plan generated but failed to save."); setGenerating(false); return; }
      onPlanGenerated(saved);
    } catch {
      setError("Something went wrong.");
    }
    setGenerating(false);
  };

  const grouped = groupByDay(logEntries);

  return (
    <div>
      {/* Quick entry input */}
      <div className="flex gap-2 mb-6">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Quick note... meeting, idea, frustration, anything"
          className="flex-1 outline-none font-sans"
          style={{ fontSize: 15, color: INK, padding: "12px 16px", border: `1px solid ${BORDER}`, borderRadius: 24, background: "#fff" }}
        />
        <button
          onClick={handleSubmitEntry}
          disabled={!input.trim() || submitting}
          className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center disabled:opacity-30"
          style={{ background: BLUE, border: "none", cursor: "pointer" }}
        >
          <span style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>+</span>
        </button>
      </div>

      {/* Entries feed */}
      {logEntries.length === 0 ? (
        <div className="text-center py-12">
          <p className="font-sans" style={{ fontSize: 15, color: FAINT }}>No notes yet. What happened today?</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([dayLabel, entries]) => (
            <div key={dayLabel}>
              <span className="font-mono uppercase block mb-2" style={{ fontSize: 10, letterSpacing: "0.08em", color: FAINT }}>{dayLabel}</span>
              <div className="space-y-2">
                {entries.map(entry => (
                  <div key={entry.id} className="rounded-[10px] p-3.5" style={{ border: `1px solid ${BORDER}`, background: "#fff" }}>
                    <p className="font-sans text-[14px]" style={{ color: INK, lineHeight: 1.55 }}>{entry.content}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="font-mono text-[10px]" style={{ color: FAINT }}>{formatTime(entry.created_at)}</span>
                      {entry.tags.map(tag => (
                        <span key={tag} className="font-mono text-[10px] px-2 py-0.5 rounded-full"
                          style={{ background: `${TAG_COLORS[tag] || DIM}15`, color: TAG_COLORS[tag] || DIM }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Generate from entries */}
      {weekEntries.length > 0 && (
        <button
          onClick={handleGenerateFromEntries}
          disabled={generating}
          className="mt-8 w-full py-3.5 rounded-full font-sans font-semibold text-[15px] disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}
        >
          {generating ? "Generating your plan..." : `Generate plan from this week's notes (${weekEntries.length})`}
        </button>
      )}

      {error && <p className="font-sans text-[13px] mt-3" style={{ color: "#DC2626" }}>{error}</p>}

      {generating && (
        <div className="mt-4 space-y-3 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-[12px] p-5" style={{ background: "#fafafa", border: `1px solid ${BORDER}` }}>
              <div className="h-3 rounded w-16 mb-3" style={{ background: "#e5e5e5" }} />
              <div className="h-5 rounded w-3/4 mb-2" style={{ background: "#e5e5e5" }} />
              <div className="h-12 rounded" style={{ background: "#f0f0f0" }} />
            </div>
          ))}
        </div>
      )}

      {/* Dump fallback */}
      <div className="mt-10">
        <button onClick={() => setShowDumpFallback(!showDumpFallback)}
          className="font-mono text-[11px] uppercase" style={{ color: FAINT, background: "none", border: "none", cursor: "pointer", letterSpacing: "0.06em" }}>
          {showDumpFallback ? "Hide dump area ▲" : "Or dump everything at once ▼"}
        </button>
        {showDumpFallback && (
          <div className="mt-3">
            <textarea value={dump} onChange={e => setDump(e.target.value)}
              placeholder="This week we're launching the beta, had a call with a potential investor, onboarding is still broken..."
              rows={6} className="w-full outline-none resize-y font-sans mb-3"
              style={{ fontSize: 16, color: INK, lineHeight: 1.7, padding: "16px 20px", border: `1px solid ${BORDER}`, borderRadius: 12, minHeight: 150 }} />
            <button onClick={handleGenerateFromDump} disabled={!dump.trim() || generating}
              className="w-full py-3.5 rounded-full font-sans font-semibold text-[15px] disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}>
              {generating ? "Generating..." : "Generate my plan"}
            </button>
          </div>
        )}
      </div>

      {/* Past dumps */}
      {allDumps.length > 0 && (
        <div className="mt-10">
          <span className="font-mono uppercase block mb-4" style={{ fontSize: 10, letterSpacing: "0.08em", color: FAINT }}>Past dumps</span>
          <div className="space-y-3">
            {allDumps.map(d => {
              const isOpen = expandedDump === d.id;
              return (
                <div key={d.id} className="rounded-[10px] cursor-pointer" style={{ border: `1px solid ${BORDER}`, background: "#fff" }}
                  onClick={() => setExpandedDump(isOpen ? null : d.id)}>
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-[11px]" style={{ color: BLUE }}>{weekLabel(d.week_start)}</span>
                      <span style={{ color: FAINT, fontSize: 12, transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "none" }}>▼</span>
                    </div>
                    {!isOpen && (
                      <p className="font-sans text-[13px]" style={{ color: DIM, lineHeight: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                        {d.content}
                      </p>
                    )}
                    {isOpen && (
                      <div>
                        <p className="font-sans text-[14px] mb-3" style={{ color: INK, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{d.content}</p>
                        <button onClick={e => { e.stopPropagation(); onSwitchToIdeas(d.week_start); }}
                          className="font-mono text-[11px]" style={{ color: BLUE, background: "none", border: "none", cursor: "pointer" }}>
                          View plan →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════ IDEAS TAB ══════════════ */
function IdeasTab({ profile, allPlans, initialWeek }: { profile: UserProfile; allPlans: ContentPlan[]; initialWeek?: string }) {
  const weeks = Array.from(new Set(allPlans.map(p => p.week_start))).sort().reverse();
  const [weekIdx, setWeekIdx] = useState(() => {
    if (initialWeek) { const idx = weeks.indexOf(initialWeek); return idx >= 0 ? idx : 0; }
    return 0;
  });
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    if (initialWeek) {
      const idx = weeks.indexOf(initialWeek);
      if (idx >= 0) setWeekIdx(idx);
    }
  }, [initialWeek]);

  if (weeks.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="font-sans" style={{ fontSize: 15, color: FAINT }}>No plans yet. Go to the Log tab and generate your first plan.</p>
      </div>
    );
  }

  const currentWeek = weeks[weekIdx];
  const plan = allPlans.find(p => p.week_start === currentWeek);
  const raw = plan?.plan;
  const planData: ContentPlanData | null = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null;
  const primaryGoal = (profile.goals || [])[0]?.replace("_", " ") || "content";

  return (
    <div>
      {/* Week selector */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setWeekIdx(Math.min(weekIdx + 1, weeks.length - 1))} disabled={weekIdx >= weeks.length - 1}
          className="p-2 rounded-full disabled:opacity-20" style={{ border: `1px solid ${BORDER}`, background: "transparent", cursor: "pointer" }}>
          <span style={{ fontSize: 14, color: DIM }}>←</span>
        </button>
        <div className="text-center">
          <span className="font-mono text-[12px] block" style={{ color: BLUE }}>{weekLabel(currentWeek)}</span>
          <span className="font-mono text-[10px]" style={{ color: FAINT }}>{planData ? `${planData.posts.length} posts` : "No plan"}</span>
        </div>
        <button onClick={() => setWeekIdx(Math.max(weekIdx - 1, 0))} disabled={weekIdx <= 0}
          className="p-2 rounded-full disabled:opacity-20" style={{ border: `1px solid ${BORDER}`, background: "transparent", cursor: "pointer" }}>
          <span style={{ fontSize: 14, color: DIM }}>→</span>
        </button>
      </div>

      {!planData ? (
        <div className="text-center py-12">
          <p className="font-sans" style={{ fontSize: 15, color: FAINT }}>No plan for this week.</p>
        </div>
      ) : (
        <div>
          {planData.strategy_note && (
            <div className="mb-5 p-4 rounded-[10px]" style={{ background: "#fafafa", border: `1px solid ${BORDER}` }}>
              <p className="font-sans text-[14px]" style={{ color: INK, lineHeight: 1.6 }}>{planData.strategy_note}</p>
            </div>
          )}
          <div className="space-y-3">
            {planData.posts.map((post, i) => {
              const isExpanded = expanded === i;
              const typeColor = POST_TYPE_COLORS[post.post_type] || BLUE;
              const dateObj = new Date(post.date + "T12:00:00");
              const dayNum = dateObj.getDate();
              const dayName = post.day.slice(0, 3);

              return (
                <div key={i} onClick={() => setExpanded(isExpanded ? null : i)}
                  className="rounded-[12px] transition-all cursor-pointer"
                  style={{ border: `1px solid ${isExpanded ? BLUE : BORDER}`, background: isExpanded ? `${BLUE}04` : "#fff" }}>
                  <div className="flex gap-4 p-5">
                    <div className="shrink-0 text-center" style={{ width: 44 }}>
                      <span className="font-mono uppercase block" style={{ fontSize: 10, color: DIM }}>{dayName}</span>
                      <span className="font-serif block" style={{ fontSize: 22, fontWeight: 600, color: INK }}>{dayNum}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: "#f0f0f0", color: DIM }}>
                          {PLATFORM_ICONS[post.platform] || post.platform}
                        </span>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: `${typeColor}12`, color: typeColor }}>
                          {post.post_type}
                        </span>
                      </div>
                      <p className="font-sans font-medium" style={{ fontSize: 15, color: INK, lineHeight: 1.45 }}>{post.hook}</p>
                      {!isExpanded && (
                        <p className="font-sans mt-1.5" style={{ fontSize: 13, color: DIM, lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                          {post.reasoning}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 mt-1" style={{ color: FAINT, fontSize: 12, transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "none" }}>▼</span>
                  </div>
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-0 ml-16 space-y-4" style={{ borderTop: `1px solid ${BORDER}` }}>
                      <div className="pt-4">
                        <span className="font-mono uppercase block mb-1" style={{ fontSize: 10, color: FAINT, letterSpacing: "0.06em" }}>Why this post</span>
                        <p className="font-sans text-[14px]" style={{ color: INK, lineHeight: 1.6 }}>{post.reasoning}</p>
                      </div>
                      <div>
                        <span className="font-mono uppercase block mb-1" style={{ fontSize: 10, color: FAINT, letterSpacing: "0.06em" }}>Goal alignment</span>
                        <p className="font-sans text-[14px]" style={{ color: INK, lineHeight: 1.55 }}>{post.goal_alignment}</p>
                      </div>
                      <button disabled className="px-5 py-2 rounded-full font-sans text-[13px] opacity-40 cursor-default" style={{ border: `1px solid ${BORDER}`, background: "transparent", color: DIM }}>
                        Help me write this · coming soon
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════ SHELF TAB ══════════════ */
function ShelfTab({ allPlans }: { allPlans: ContentPlan[] }) {
  // Flatten all posts across all plans, grouped by week
  const weeks = allPlans
    .map(p => ({ weekStart: p.week_start, planData: (typeof p.plan === "string" ? JSON.parse(p.plan) : p.plan) as ContentPlanData }))
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart));

  if (weeks.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="font-sans" style={{ fontSize: 15, color: FAINT }}>No content yet. Generate your first plan to build your library.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {weeks.map(({ weekStart, planData }) => (
        <div key={weekStart}>
          <span className="font-mono uppercase block mb-3" style={{ fontSize: 11, letterSpacing: "0.08em", color: BLUE }}>
            {weekLabel(weekStart)}
          </span>
          <div className="space-y-2">
            {planData.posts.map((post: ContentPlanPost, i: number) => {
              const typeColor = POST_TYPE_COLORS[post.post_type] || BLUE;
              return (
                <div key={i} className="flex items-start gap-3 p-3 rounded-[8px]" style={{ border: `1px solid ${BORDER}` }}>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded shrink-0 mt-0.5" style={{ background: "#f0f0f0", color: DIM }}>
                    {PLATFORM_ICONS[post.platform] || post.platform}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-[14px] font-medium" style={{ color: INK, lineHeight: 1.4 }}>{post.hook}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-[10px]" style={{ color: FAINT }}>{post.day} {post.date}</span>
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${typeColor}12`, color: typeColor }}>{post.post_type}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
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

  useEffect(() => {
    async function load() {
      const [p, plan, dumps, plans, entries] = await Promise.all([
        getProfile(), getCurrentPlan(), getAllDumps(), getAllPlans(), getLogEntries(),
      ]);
      setProfile(p);
      setCurrentPlan(plan);
      setAllDumps(dumps);
      setAllPlans(plans);
      setLogEntries(entries);
      if (plan) setTab("ideas");
      setLoading(false);
    }
    load();
  }, []);

  const handlePlanGenerated = (plan: ContentPlan) => {
    setCurrentPlan(plan);
    setAllPlans(prev => [plan, ...prev]);
    setTab("ideas");
  };

  const switchToIdeas = (weekStart?: string) => {
    setIdeasWeek(weekStart);
    setTab("ideas");
  };

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: "#fff" }}>
        <header style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="max-w-[640px] mx-auto px-5 py-4">
            <span className="font-serif" style={{ fontSize: 20, fontWeight: 600, color: INK }}>accent</span>
          </div>
        </header>
        <div className="max-w-[640px] mx-auto px-5 py-8 animate-pulse">
          <div className="h-7 rounded w-48 mb-4" style={{ background: "#f0f0f0" }} />
          <div className="h-44 rounded-[12px]" style={{ background: "#fafafa" }} />
        </div>
      </div>
    );
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: "log", label: "Log" },
    { key: "ideas", label: "Ideas" },
    { key: "shelf", label: "Shelf" },
  ];

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

      {/* Tabs */}
      <div style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[640px] mx-auto px-5 flex gap-6">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); if (t.key !== "ideas") setIdeasWeek(undefined); }}
              className="font-mono text-[12px] py-3 transition-colors"
              style={{
                color: tab === t.key ? BLUE : DIM,
                borderBottom: tab === t.key ? `2px solid ${BLUE}` : "2px solid transparent",
                background: "none", border: "none", borderBottomStyle: "solid", borderBottomWidth: 2,
                borderBottomColor: tab === t.key ? BLUE : "transparent",
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[640px] mx-auto px-5 py-8">
        {tab === "log" && (
          <LogTab profile={profile!} allDumps={allDumps} logEntries={logEntriesState} setLogEntries={setLogEntries} onPlanGenerated={handlePlanGenerated} onSwitchToIdeas={switchToIdeas} />
        )}
        {tab === "ideas" && (
          <IdeasTab profile={profile!} allPlans={allPlans} initialWeek={ideasWeek} />
        )}
        {tab === "shelf" && (
          <ShelfTab allPlans={allPlans} />
        )}
      </div>
    </div>
  );
}
