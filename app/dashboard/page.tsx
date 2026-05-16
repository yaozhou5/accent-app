"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getProfile, type UserProfile } from "@/lib/supabase/profiles";
import { createWeeklyDump, getAllDumps, type WeeklyDump } from "@/lib/supabase/planner";
import { savePlan, getCurrentPlan, getAllPlans, getPlanByWeek, getWeekStart, type ContentPlan, type ContentPlanData, type ContentPlanPost } from "@/lib/supabase/planner";
import { createLogEntry, updateLogEntryTags, getLogEntries, getThisWeekEntries, uploadLogImage, detectUrl, type LogEntry } from "@/lib/supabase/log-entries";
import { useRef } from "react";

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
function LogTab({ allDumps, logEntries, setLogEntries, onSwitchToIdeas }: {
  allDumps: WeeklyDump[];
  logEntries: LogEntry[];
  setLogEntries: (fn: (prev: LogEntry[]) => LogEntry[]) => void;
  onSwitchToIdeas: (weekStart?: string) => void;
}) {
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [expandedDump, setExpandedDump] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tagEntryAsync = (entry: LogEntry) => {
    const tagContent = entry.content || "";
    const extras: string[] = [];
    if (entry.image_url) extras.push("[has attached image]");
    if (entry.link_url) extras.push(`[link: ${entry.link_url}]`);
    fetch("/api/tag-entry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: `${tagContent} ${extras.join(" ")}`.trim() }),
    }).then(r => r.json()).then(({ tags }) => {
      if (tags?.length) {
        updateLogEntryTags(entry.id, tags);
        setLogEntries((prev: LogEntry[]) => prev.map(e => e.id === entry.id ? { ...e, tags } : e));
      }
    }).catch(() => {});
  };

  const handleSubmitEntry = async () => {
    if ((!input.trim() && !pendingImage) || submitting) return;
    setSubmitting(true);

    let imageUrl: string | null = null;
    if (pendingImage) {
      imageUrl = await uploadLogImage(pendingImage);
      setPendingImage(null);
      setPendingImagePreview(null);
    }

    const linkUrl = input.trim() ? detectUrl(input.trim()) : null;
    const entry = await createLogEntry(input.trim(), { image_url: imageUrl, link_url: linkUrl });
    if (entry) {
      setLogEntries((prev: LogEntry[]) => [entry, ...prev]);
      setInput("");
      tagEntryAsync(entry);
    }
    setSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmitEntry(); }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingImage(file);
    setPendingImagePreview(URL.createObjectURL(file));
    e.target.value = "";
  };

  const grouped = groupByDay(logEntries);

  return (
    <div>
      {/* Compose input */}
      <div className="mb-6 rounded-[12px] overflow-hidden" style={{ border: `1px solid ${BORDER}`, background: "#fff" }}>
        {pendingImagePreview && (
          <div className="px-4 pt-3 relative inline-block">
            <img src={pendingImagePreview} alt="Preview" className="rounded-[8px]" style={{ maxHeight: 100, border: `1px solid ${BORDER}` }} />
            <button onClick={() => { setPendingImage(null); setPendingImagePreview(null); }}
              className="absolute top-1 right-2 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: INK, color: "#fff", fontSize: 10, border: "none", cursor: "pointer" }}>×</button>
          </div>
        )}
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Quick note... meeting, idea, frustration, anything"
          rows={3}
          className="w-full outline-none resize-none font-sans"
          style={{ fontSize: 15, color: INK, lineHeight: 1.6, padding: "14px 16px 8px", border: "none", background: "transparent", minHeight: 80 }}
        />
        <div className="flex items-center justify-between px-3 pb-3">
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageSelect} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full transition-colors hover:bg-gray-50"
            style={{ border: "none", background: "transparent", cursor: "pointer" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={pendingImage ? BLUE : FAINT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
            </svg>
          </button>
          <button
            onClick={handleSubmitEntry}
            disabled={(!input.trim() && !pendingImage) || submitting}
            className="px-5 py-2 rounded-full font-sans font-semibold text-[13px] disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}
          >
            {submitting ? "..." : "Log"}
          </button>
        </div>
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
                {entries.map(entry => {
                  const entryLinkUrl = entry.link_url || (entry.content ? detectUrl(entry.content) : null);
                  const entryDomain = entryLinkUrl ? (() => { try { return new URL(entryLinkUrl).hostname; } catch { return entryLinkUrl; } })() : null;
                  return (
                    <div key={entry.id} className="rounded-[10px] p-3.5" style={{ border: `1px solid ${BORDER}`, background: "#fff" }}>
                      {entry.content && <p className="font-sans text-[14px]" style={{ color: INK, lineHeight: 1.55 }}>{entry.content}</p>}
                      {entry.image_url && (
                        <div className="mt-2">
                          <img
                            src={entry.image_url}
                            alt="Log attachment"
                            className="rounded-[6px] cursor-pointer transition-opacity hover:opacity-90"
                            style={{ maxHeight: expandedImage === entry.id ? 400 : 100, border: `1px solid ${BORDER}`, objectFit: "cover" }}
                            onClick={() => setExpandedImage(expandedImage === entry.id ? null : entry.id)}
                          />
                        </div>
                      )}
                      {entryLinkUrl && (
                        <a href={entryLinkUrl} target="_blank" rel="noopener noreferrer" className="no-underline block mt-2 p-2.5 rounded-[6px] transition-colors hover:bg-gray-50"
                          style={{ border: `1px solid ${BORDER}` }}>
                          <span className="font-mono text-[11px] block" style={{ color: BLUE }}>{entryDomain}</span>
                          <span className="font-mono text-[10px] block mt-0.5" style={{ color: FAINT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entryLinkUrl}</span>
                        </a>
                      )}
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
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

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
function IdeasTab({ profile, allPlans, weekEntries, initialWeek, onPlanGenerated, onSwitchToLog }: {
  profile: UserProfile;
  allPlans: ContentPlan[];
  weekEntries: LogEntry[];
  initialWeek?: string;
  onPlanGenerated: (plan: ContentPlan) => void;
  onSwitchToLog: () => void;
}) {
  const weeks = Array.from(new Set(allPlans.map(p => p.week_start))).sort().reverse();
  const targetWeek = getWeekStart();
  const hasCurrentPlan = allPlans.some(p => p.week_start === targetWeek);

  const [weekIdx, setWeekIdx] = useState(() => {
    if (initialWeek) { const idx = weeks.indexOf(initialWeek); return idx >= 0 ? idx : 0; }
    return 0;
  });
  const [expanded, setExpanded] = useState<number | null>(null);
  const [extraContext, setExtraContext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGenerate, setShowGenerate] = useState(!hasCurrentPlan);

  useEffect(() => {
    if (initialWeek) {
      const idx = weeks.indexOf(initialWeek);
      if (idx >= 0) { setWeekIdx(idx); setShowGenerate(false); }
    }
  }, [initialWeek]);

  const primaryGoal = (profile.goals || [])[0]?.replace(/_/g, " ") || "content";
  const platformsList = (profile.platforms || []).join(", ") || "not set";
  const freq = profile.posting_frequency || "not set";

  const handleGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    setError(null);
    try {
      const entriesPayload = weekEntries.map(e => ({
        content: e.content || "",
        tags: e.tags,
        image_url: e.image_url,
        link_url: e.link_url,
      }));

      // If there are entries, use them. If only extra context, send as dump.
      const combined = weekEntries.map(e => e.content || "").join("\n");
      const dumpContent = extraContext.trim() ? `${combined}\n\nAdditional context: ${extraContext.trim()}` : combined;
      const savedDump = await createWeeklyDump(dumpContent || extraContext.trim() || "No notes this week");
      if (!savedDump) { setError("Failed to save."); setGenerating(false); return; }

      const body = weekEntries.length > 0
        ? { entries: entriesPayload, dump: extraContext.trim() || undefined, profile }
        : { dump: extraContext.trim() || "Generate a plan based on my profile and goals", profile };

      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) { setError("Failed to generate plan."); setGenerating(false); return; }
      const planData: ContentPlanData = await res.json();
      const saved = await savePlan(savedDump.id, planData);
      if (!saved) { setError("Plan generated but failed to save."); setGenerating(false); return; }
      onPlanGenerated(saved);
      setShowGenerate(false);
    } catch {
      setError("Something went wrong.");
    }
    setGenerating(false);
  };

  // Generate view (no current plan)
  if (showGenerate && !hasCurrentPlan) {
    return (
      <div>
        <h2 className="font-serif mb-6" style={{ fontSize: 24, fontWeight: 400, color: INK }}>Ready to plan your week?</h2>

        {/* Context summary */}
        <div className="rounded-[12px] p-5 mb-6 space-y-3" style={{ background: "#fafafa", border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between">
            <span className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: "0.08em", color: FAINT }}>Your context</span>
            <a href="/settings" className="font-mono text-[11px] no-underline" style={{ color: BLUE }}>Edit profile</a>
          </div>
          <div className="space-y-2">
            <p className="font-sans text-[14px]" style={{ color: INK }}>
              <span style={{ color: FAINT }}>Notes this week:</span> <strong>{weekEntries.length}</strong>{weekEntries.length === 0 && <span style={{ color: FAINT }}> — add some in the Log tab first</span>}
            </p>
            <p className="font-sans text-[14px]" style={{ color: INK }}>
              <span style={{ color: FAINT }}>Goal:</span> <strong style={{ textTransform: "capitalize" }}>{primaryGoal}</strong>
            </p>
            <p className="font-sans text-[14px]" style={{ color: INK }}>
              <span style={{ color: FAINT }}>Posting on:</span> {platformsList}
            </p>
            <p className="font-sans text-[14px]" style={{ color: INK }}>
              <span style={{ color: FAINT }}>Target:</span> {freq} posts/week
            </p>
          </div>
        </div>

        {/* Extra context */}
        <div className="mb-6">
          <label className="font-mono uppercase block mb-2" style={{ fontSize: 10, letterSpacing: "0.08em", color: FAINT }}>Anything else happening this week? (optional)</label>
          <textarea
            value={extraContext}
            onChange={e => setExtraContext(e.target.value)}
            placeholder="Launching a new feature, meeting an investor, attending an event..."
            rows={3}
            className="w-full outline-none resize-y font-sans"
            style={{ fontSize: 15, color: INK, lineHeight: 1.6, padding: "12px 16px", border: `1px solid ${BORDER}`, borderRadius: 10 }}
          />
        </div>

        {error && <p className="font-sans text-[13px] mb-3" style={{ color: "#DC2626" }}>{error}</p>}

        <button
          onClick={handleGenerate}
          disabled={generating}
          className="w-full py-3.5 rounded-full font-sans font-semibold text-[15px] disabled:opacity-50"
          style={{ background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}
        >
          {generating ? "Generating your plan..." : "Generate my plan"}
        </button>

        {generating && (
          <div className="mt-6 space-y-3 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-[12px] p-5" style={{ background: "#fff", border: `1px solid ${BORDER}` }}>
                <div className="h-3 rounded w-16 mb-3" style={{ background: "#e5e5e5" }} />
                <div className="h-5 rounded w-3/4 mb-2" style={{ background: "#e5e5e5" }} />
                <div className="h-12 rounded" style={{ background: "#f0f0f0" }} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // No plans at all
  if (weeks.length === 0 && hasCurrentPlan) {
    // This shouldn't happen, but fallback
  }
  if (weeks.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="font-sans mb-4" style={{ fontSize: 15, color: FAINT }}>No plans yet.</p>
        <button onClick={() => setShowGenerate(true)} className="font-sans text-[14px]" style={{ color: BLUE, background: "none", border: "none", cursor: "pointer" }}>
          Generate your first plan →
        </button>
      </div>
    );
  }

  // Plan view with week selector
  const currentWeek = weeks[weekIdx];
  const plan = allPlans.find(p => p.week_start === currentWeek);
  const raw = plan?.plan;
  const planData: ContentPlanData | null = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : null;

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

          {/* New dump button switches to Log */}
          <button onClick={onSwitchToLog} className="mt-6 w-full py-3 rounded-full font-sans text-[14px]"
            style={{ border: `1px solid ${BORDER}`, color: DIM, background: "transparent", cursor: "pointer" }}>
            Add more notes for next week
          </button>
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

  // Week entries for Ideas tab context
  const nowDate = new Date();
  const nowDay = nowDate.getDay();
  const nowDiff = nowDay === 0 ? 6 : nowDay - 1;
  const mondayDate = new Date(nowDate);
  mondayDate.setDate(nowDate.getDate() - nowDiff);
  mondayDate.setHours(0, 0, 0, 0);
  const weekEntries = logEntriesState.filter(e => new Date(e.created_at) >= mondayDate);

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
          <LogTab allDumps={allDumps} logEntries={logEntriesState} setLogEntries={setLogEntries} onSwitchToIdeas={switchToIdeas} />
        )}
        {tab === "ideas" && (
          <IdeasTab profile={profile!} allPlans={allPlans} weekEntries={weekEntries} initialWeek={ideasWeek} onPlanGenerated={handlePlanGenerated} onSwitchToLog={() => setTab("log")} />
        )}
        {tab === "shelf" && (
          <ShelfTab allPlans={allPlans} />
        )}
      </div>
    </div>
  );
}
