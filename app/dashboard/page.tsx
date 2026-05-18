"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { getProfile, upsertProfile, type UserProfile } from "@/lib/supabase/profiles";
import { createWeeklyDump, getAllDumps, type WeeklyDump } from "@/lib/supabase/planner";
import { savePlan, updatePlanPosts, getCurrentPlan, getAllPlans, getWeekStart, type ContentPlan, type ContentPlanData, type ContentPlanPost } from "@/lib/supabase/planner";
import { createLogEntry, updateLogEntryTags, getLogEntries, uploadLogImage, detectUrl, toggleBookmark, archiveLogEntries, deleteLogEntry, type LogEntry, type LogEntryType } from "@/lib/supabase/log-entries";
import { getDraft, saveDraft, getAllDrafts, markAsPublished, type Draft } from "@/lib/supabase/drafts";

// Design tokens
const INK = "#111827";      // gray-900
const BODY = "#4b5563";     // gray-600 — body text, log entries
const DIM = "#6b7280";      // gray-500 — inactive tabs
const FAINT = "#9ca3af";    // gray-400 — labels, timestamps
const BLUE = "#3B82F6";     // primary action
const BORDER = "#e5e7eb";   // gray-200

const PLATFORM_LABELS: Record<string, string> = { linkedin: "LinkedIn", x: "X", substack: "Substack", xiaohongshu: "小红书", threads: "Threads" };
const CONTENT_TYPE_COLORS: Record<string, string> = {
  "personal-story": "#8b5cf6", "lesson": "#3b82f6", "behind-the-scenes": "#0d9488",
  "listicle": "#f59e0b", "hot-take": "#ef4444", "social-proof": "#22c55e",
};
const TAG_COLORS: Record<string, string> = {
  "build log": "#64748b",
  "founder diary": "#a8926a",
  "market signal": "#5eaaa8",
  "milestone": "#6ab07c",
  "inspiration": "#9b8ec4",
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
function groupByWeek(entries: LogEntry[]): { label: string; weekStart: Date; entries: LogEntry[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = today.getDay();
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));

  const groups = new Map<string, { label: string; weekStart: Date; entries: LogEntry[] }>();
  for (const e of entries) {
    const d = new Date(e.created_at);
    const entryDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const entryDay = entryDate.getDay();
    const entryMonday = new Date(entryDate);
    entryMonday.setDate(entryDate.getDate() - (entryDay === 0 ? 6 : entryDay - 1));
    const key = entryMonday.toISOString().split("T")[0];

    if (!groups.has(key)) {
      const diff = Math.round((thisMonday.getTime() - entryMonday.getTime()) / 86400000);
      let label: string;
      if (diff === 0) label = "This week";
      else if (diff === 7) label = "Last week";
      else {
        const fri = new Date(entryMonday); fri.setDate(entryMonday.getDate() + 4);
        const fmt = (dt: Date) => dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        label = `${fmt(entryMonday)}–${fmt(fri)}`;
      }
      groups.set(key, { label, weekStart: entryMonday, entries: [] });
    }
    groups.get(key)!.entries.push(e);
  }
  return Array.from(groups.values()).sort((a, b) => b.weekStart.getTime() - a.weekStart.getTime());
}
function getDomain(url: string): string { try { return new URL(url).hostname; } catch { return url; } }

type Tab = "log" | "ideas" | "drafts";
type LogFilter = "all" | "notes" | "links" | "quotes" | "bookmarked" | "unused";

/* ══════════════ LOG TAB ══════════════ */
function LogTab({ logEntries, setLogEntries, allPlans, onSwitchToIdeas }: {
  logEntries: LogEntry[];
  setLogEntries: (fn: (prev: LogEntry[]) => LogEntry[]) => void;
  allPlans: ContentPlan[];
  onSwitchToIdeas: () => void;
}) {
  const [input, setInput] = useState("");
  const [entryType, setEntryType] = useState<LogEntryType>("note");
  const [source, setSource] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [bookmarkNoteId, setBookmarkNoteId] = useState<string | null>(null);
  const [bookmarkNote, setBookmarkNote] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<LogFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute which entries were used in plans (match source_snippet to content)
  const usedContents = new Set<string>();
  for (const p of allPlans) {
    const pd = typeof p.plan === "string" ? JSON.parse(p.plan) : p.plan;
    for (const post of (pd?.posts || [])) {
      if (post.source_snippet) usedContents.add(post.source_snippet.toLowerCase().trim());
    }
  }
  const isUsedInPlan = (e: LogEntry) => e.content && usedContents.has(e.content.toLowerCase().trim());

  // Filter + search
  const visibleEntries = logEntries.filter(e => {
    if (e.archived) return false;
    if (filter === "notes" && e.type !== "note") return false;
    if (filter === "links" && e.type !== "link") return false;
    if (filter === "quotes" && e.type !== "quote") return false;
    if (filter === "bookmarked" && !e.bookmarked) return false;
    if (filter === "unused" && (isUsedInPlan(e) || e.bookmarked)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!(e.content || "").toLowerCase().includes(q) && !(e.tags || []).some(t => t.includes(q))) return false;
    }
    return true;
  });

  // Unused nudge
  const twoWeeksAgo = new Date(); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const unusedOldCount = logEntries.filter(e => !e.archived && !isUsedInPlan(e) && !e.bookmarked && new Date(e.created_at) < twoWeeksAgo).length;

  const weeks = groupByWeek(visibleEntries);

  // Auto-collapse older weeks
  useEffect(() => {
    const toCollapse = new Set<string>();
    weeks.forEach((w, i) => { if (i > 0) toCollapse.add(w.label); });
    setCollapsedWeeks(toCollapse);
  }, [logEntries.length]);

  const tagEntryAsync = (entry: LogEntry) => {
    fetch("/api/tag-entry", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: entry.content || "", entryType: entry.type }) })
      .then(r => r.json()).then(({ tags }) => { if (tags?.length) { updateLogEntryTags(entry.id, tags); setLogEntries((prev: LogEntry[]) => prev.map(e => e.id === entry.id ? { ...e, tags } : e)); } }).catch(() => {});
  };

  const handleSubmit = async () => {
    if ((!input.trim() && !pendingImage) || submitting) return;
    setSubmitting(true); setError(null);
    try {
      let imageUrl: string | null = null;
      if (pendingImage) { imageUrl = await uploadLogImage(pendingImage); setPendingImage(null); setPendingImagePreview(null); }
      const detectedLink = entryType === "note" ? detectUrl(input.trim()) : null;
      const entryUrl = entryType === "link" ? (detectUrl(input.trim()) || input.trim()) : null;
      const entry = await createLogEntry(input.trim(), { image_url: imageUrl, link_url: detectedLink, type: entryType, url: entryUrl, source: entryType === "quote" && source.trim() ? source.trim() : null });
      if (entry) { setLogEntries((prev: LogEntry[]) => [entry, ...prev]); setInput(""); setSource(""); tagEntryAsync(entry); }
      else setError("Failed to save.");
    } catch (e: unknown) { setError(`Failed: ${e instanceof Error ? e.message : "Unknown error"}`); }
    setSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey && entryType !== "quote") { e.preventDefault(); handleSubmit(); } };
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file) return; setPendingImage(file); setPendingImagePreview(URL.createObjectURL(file)); e.target.value = ""; };

  const handleToggleBookmark = async (id: string, current: boolean) => {
    if (!current) { setBookmarkNoteId(id); setBookmarkNote(""); return; }
    const ok = await toggleBookmark(id, false);
    if (ok) { setLogEntries((prev: LogEntry[]) => prev.map(e => e.id === id ? { ...e, bookmarked: false } : e)); setToast("Removed from Shelf"); setTimeout(() => setToast(null), 1500); }
  };
  const handleConfirmBookmark = async () => {
    if (!bookmarkNoteId) return;
    const ok = await toggleBookmark(bookmarkNoteId, true, bookmarkNote.trim() || undefined);
    if (ok) { setLogEntries((prev: LogEntry[]) => prev.map(e => e.id === bookmarkNoteId ? { ...e, bookmarked: true } : e)); setToast("Saved to Shelf"); setTimeout(() => setToast(null), 1500); }
    setBookmarkNoteId(null); setBookmarkNote("");
  };

  const toggleSelect = (id: string) => { const s = new Set(selected); if (s.has(id)) s.delete(id); else s.add(id); setSelected(s); };
  const handleBulkBookmark = async () => {
    for (const id of selected) { await toggleBookmark(id, true); }
    setLogEntries((prev: LogEntry[]) => prev.map(e => selected.has(e.id) ? { ...e, bookmarked: true } : e));
    setSelected(new Set()); setSelectMode(false); setToast(`${selected.size} bookmarked`); setTimeout(() => setToast(null), 1500);
  };
  const handleBulkArchive = async () => {
    const ids = Array.from(selected);
    const ok = await archiveLogEntries(ids);
    if (ok) { setLogEntries((prev: LogEntry[]) => prev.map(e => selected.has(e.id) ? { ...e, archived: true } : e)); }
    setSelected(new Set()); setSelectMode(false); setToast(`${ids.length} archived`); setTimeout(() => setToast(null), 1500);
  };
  const handleBulkDelete = async () => {
    for (const id of selected) { await deleteLogEntry(id); }
    setLogEntries((prev: LogEntry[]) => prev.filter(e => !selected.has(e.id)));
    setSelected(new Set()); setSelectMode(false); setToast(`Deleted`); setTimeout(() => setToast(null), 1500);
  };

  const placeholders: Record<LogEntryType, string> = {
    note: "Quick note... what happened today, an idea, something you learned",
    link: "Paste a URL that inspired you...",
    quote: "A quote or snippet you want to remember...",
  };
  const FILTERS: { key: LogFilter; label: string }[] = [
    { key: "all", label: "All" }, { key: "notes", label: "Notes" }, { key: "links", label: "Links" },
    { key: "quotes", label: "Quotes" }, { key: "bookmarked", label: "Saved" }, { key: "unused", label: "Unused" },
  ];

  return (
    <div>
      {/* Compose */}
      <div id="compose-card" className="mb-6 rounded-[12px] overflow-hidden" style={{ border: `1px solid ${BORDER}`, background: "#fff" }}>
        <div className="flex gap-2 px-5 pt-4">
          {(["note", "link", "quote"] as LogEntryType[]).map(t => (
            <button key={t} onClick={() => setEntryType(t)} className="font-sans text-[13px] px-3.5 py-1.5 rounded-full transition-all"
              style={{ minHeight: 36, background: entryType === t ? `${BLUE}08` : "transparent", color: entryType === t ? BLUE : FAINT, border: entryType === t ? `1px solid ${BLUE}20` : `1px solid transparent`, cursor: "pointer" }}>
              {t === "note" ? "Note" : t === "link" ? "Link" : "Quote"}
            </button>
          ))}
        </div>
        {pendingImagePreview && (
          <div className="px-5 pt-3 relative inline-block">
            <img src={pendingImagePreview} alt="" className="rounded-[8px]" style={{ maxHeight: 100, border: `1px solid ${BORDER}` }} />
            <button onClick={() => { setPendingImage(null); setPendingImagePreview(null); }} className="absolute top-1 right-3 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: INK, color: "#fff", fontSize: 10, border: "none", cursor: "pointer" }}>×</button>
          </div>
        )}
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown} placeholder={placeholders[entryType]} rows={3}
          className="w-full outline-none resize-none font-sans" style={{ fontSize: 15, color: INK, lineHeight: 1.6, padding: "14px 20px 8px", border: "none", background: "transparent", minHeight: 80, fontStyle: entryType === "quote" ? "italic" : "normal" }} />
        {entryType === "quote" && (
          <div className="px-5 pb-1"><input value={source} onChange={e => setSource(e.target.value)} placeholder="Source (optional)" className="w-full outline-none font-sans text-[13px]" style={{ color: DIM, padding: "4px 0", border: "none", background: "transparent" }} /></div>
        )}
        <div className="flex items-center justify-between px-4 pb-4">
          <div className="flex items-center gap-1">
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageSelect} className="hidden" />
            {entryType === "note" && (
              <button onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-full hover:bg-gray-50" style={{ border: "none", background: "transparent", cursor: "pointer", minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={pendingImage ? BLUE : FAINT} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
              </button>
            )}
          </div>
          <button onClick={handleSubmit} disabled={(!input.trim() && !pendingImage) || submitting} className="rounded-full font-sans font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ fontSize: 15, padding: "12px 24px", background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}>
            {submitting ? "Saving..." : "Log"}
          </button>
        </div>
      </div>

      {error && <p className="font-sans text-[13px] mb-4" style={{ color: "#DC2626" }}>{error}</p>}

      {/* Unused nudge */}
      {unusedOldCount >= 5 && filter !== "unused" && (
        <div className="mb-6 p-4 rounded-[12px] flex items-center justify-between" style={{ background: `${BLUE}06`, border: `1px solid ${BLUE}15` }}>
          <p className="font-sans text-[14px]" style={{ color: INK }}>You have <strong>{unusedOldCount}</strong> unused notes — ready to turn them into content?</p>
          <button onClick={onSwitchToIdeas} className="font-sans text-[13px] font-semibold shrink-0 ml-3" style={{ color: BLUE, background: "none", border: "none", cursor: "pointer" }}>Go to Ideas →</button>
        </div>
      )}

      {/* Search + filters */}
      {logEntries.length > 0 && (
        <div className="mb-6 space-y-3">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notes..."
            className="w-full outline-none font-sans" style={{ fontSize: 14, color: INK, padding: "10px 14px", border: `1px solid ${BORDER}`, borderRadius: 8, background: "#fff" }} />
          <div className="flex items-center gap-2 flex-wrap">
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} className="font-sans text-[12px] px-3 py-1.5 rounded-full transition-all"
                style={{ background: filter === f.key ? `${BLUE}10` : "transparent", color: filter === f.key ? BLUE : FAINT, border: filter === f.key ? `1px solid ${BLUE}20` : `1px solid ${BORDER}`, cursor: "pointer" }}>
                {f.label}
              </button>
            ))}
            <button onClick={() => { setSelectMode(!selectMode); setSelected(new Set()); }} className="ml-auto font-sans text-[12px] px-3 py-1.5 rounded-full"
              style={{ color: selectMode ? BLUE : FAINT, border: `1px solid ${selectMode ? BLUE : BORDER}`, background: selectMode ? `${BLUE}08` : "transparent", cursor: "pointer" }}>
              {selectMode ? "Cancel" : "Select"}
            </button>
          </div>
        </div>
      )}

      {/* Bulk actions bar */}
      {selectMode && selected.size > 0 && (
        <div className="mb-4 flex items-center gap-2 p-3 rounded-[10px]" style={{ background: "#fafafa", border: `1px solid ${BORDER}` }}>
          <span className="font-sans text-[13px]" style={{ color: DIM }}>{selected.size} selected</span>
          <div className="ml-auto flex gap-2">
            <button onClick={handleBulkBookmark} className="font-sans text-[12px] px-3 py-1.5 rounded-full" style={{ border: `1px solid ${BORDER}`, color: DIM, background: "#fff", cursor: "pointer" }}>Bookmark</button>
            <button onClick={handleBulkArchive} className="font-sans text-[12px] px-3 py-1.5 rounded-full" style={{ border: `1px solid ${BORDER}`, color: DIM, background: "#fff", cursor: "pointer" }}>Archive</button>
            <button onClick={handleBulkDelete} className="font-sans text-[12px] px-3 py-1.5 rounded-full" style={{ border: `1px solid #DC2626`, color: "#DC2626", background: "#fff", cursor: "pointer" }}>Delete</button>
          </div>
        </div>
      )}

      {/* Feed */}
      {visibleEntries.length === 0 ? (
        <div className="text-center py-12"><p className="font-sans" style={{ fontSize: 15, color: FAINT }}>{search || filter !== "all" ? "No matching notes." : "No notes yet. What happened today?"}</p></div>
      ) : (
        <div className="space-y-6">
          {weeks.map(({ label, entries: weekEntries }) => {
            const isCollapsed = collapsedWeeks.has(label);
            return (
              <div key={label}>
                <button onClick={() => { const s = new Set(collapsedWeeks); if (s.has(label)) s.delete(label); else s.add(label); setCollapsedWeeks(s); }}
                  className="flex items-center gap-2 mb-3 w-full" style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  <span className="font-mono uppercase" style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}>{label}</span>
                  <span className="font-mono" style={{ fontSize: 11, color: FAINT }}>{weekEntries.length}</span>
                  <span style={{ fontSize: 10, color: FAINT, transition: "transform 0.2s", transform: isCollapsed ? "rotate(-90deg)" : "rotate(0)", marginLeft: 2 }}>▼</span>
                </button>
                {!isCollapsed && (
                  <div className="space-y-4">
                    {weekEntries.map(entry => {
                      const isQuote = entry.type === "quote";
                      const isLink = entry.type === "link";
                      const entryUrl = entry.url || entry.link_url || (entry.content ? detectUrl(entry.content) : null);
                      const used = isUsedInPlan(entry);
                      const isSelected = selected.has(entry.id);
                      return (
                        <div key={entry.id} onClick={selectMode ? () => toggleSelect(entry.id) : undefined}
                          className="rounded-[12px] transition-all" style={{
                          padding: "20px", border: `1px solid ${isSelected ? BLUE : BORDER}`, background: isSelected ? `${BLUE}04` : "#fff",
                          borderLeft: isQuote ? `3px solid ${BLUE}` : isLink ? `3px solid #0d9488` : isSelected ? `3px solid ${BLUE}` : `1px solid ${BORDER}`,
                          cursor: selectMode ? "pointer" : "default",
                        }}>
                          {isQuote && <span style={{ fontSize: 22, color: FAINT, lineHeight: 1 }}>"</span>}
                          {entry.content && <p className="font-sans" style={{ fontSize: 15, color: BODY, lineHeight: 1.6, fontStyle: isQuote ? "italic" : "normal" }}>{entry.content}</p>}
                          {isQuote && entry.source && <p className="font-sans mt-1" style={{ fontSize: 12, color: FAINT }}>— {entry.source}</p>}
                          {entry.image_url && (
                            <div className={entry.content ? "mt-3" : ""}>
                              <img src={entry.image_url} alt="" className="w-full rounded-[8px] cursor-pointer hover:opacity-90" style={{ maxHeight: 200, objectFit: "cover", border: `1px solid ${BORDER}` }}
                                onClick={() => setExpandedImage(expandedImage === entry.id ? null : entry.id)} />
                              {expandedImage === entry.id && <img src={entry.image_url} alt="" className="w-full rounded-[8px] mt-2" style={{ border: `1px solid ${BORDER}` }} />}
                            </div>
                          )}
                          {(isLink || entryUrl) && entryUrl && (
                            <a href={entryUrl} target="_blank" rel="noopener noreferrer" className="no-underline block mt-2 p-2.5 rounded-[6px] hover:bg-gray-50" style={{ border: `1px solid ${BORDER}` }}>
                              <span className="font-mono text-[11px] block" style={{ color: "#0d9488" }}>{getDomain(entryUrl)}</span>
                              <span className="font-mono text-[10px] block mt-0.5 truncate" style={{ color: FAINT }}>{entryUrl}</span>
                            </a>
                          )}
                          <div className="flex items-center gap-2 mt-3 flex-wrap">
                            <span className="font-mono" style={{ fontSize: 12, color: FAINT }}>{getDayLabel(entry.created_at)} {formatTime(entry.created_at)}</span>
                            {entry.tags.map(tag => (
                              <span key={tag} className="font-mono text-[12px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${TAG_COLORS[tag] || DIM}15`, color: TAG_COLORS[tag] || DIM }}>{tag}</span>
                            ))}
                            {used && <span className="font-mono text-[11px] px-2 py-0.5 rounded-full" style={{ background: `${BLUE}10`, color: BLUE }}>Used in Ideas</span>}
                            {entry.bookmarked && <span className="font-mono text-[11px] px-2 py-0.5 rounded-full" style={{ background: "#f59e0b15", color: "#f59e0b" }}>Saved</span>}
                            {!selectMode && (
                              <button onClick={(ev) => { ev.stopPropagation(); handleToggleBookmark(entry.id, entry.bookmarked || false); }}
                                className="ml-auto p-2" style={{ background: "none", border: "none", cursor: "pointer", minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill={entry.bookmarked ? BLUE : "none"} stroke={entry.bookmarked ? BLUE : FAINT}
                                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "fill 0.2s, stroke 0.2s" }}>
                                  <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                                </svg>
                              </button>
                            )}
                          </div>
                          {bookmarkNoteId === entry.id && (
                            <div className="mt-2 flex gap-2 items-center" onClick={ev => ev.stopPropagation()}>
                              <input value={bookmarkNote} onChange={ev => setBookmarkNote(ev.target.value)} onKeyDown={ev => { if (ev.key === "Enter") handleConfirmBookmark(); }}
                                placeholder="Why I saved this (optional)" className="flex-1 outline-none font-sans text-[13px]"
                                style={{ color: INK, padding: "6px 10px", border: `1px solid ${BORDER}`, borderRadius: 8, background: "#fafafa" }} autoFocus />
                              <button onClick={handleConfirmBookmark} className="font-sans font-semibold rounded-full shrink-0"
                                style={{ fontSize: 14, padding: "8px 18px", background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}>Save</button>
                              <button onClick={() => setBookmarkNoteId(null)} className="font-sans text-[12px] px-2 py-1.5 shrink-0"
                                style={{ color: FAINT, background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 font-sans text-[13px] px-4 py-2.5 rounded-full"
          style={{ background: INK, color: "#fff", animation: "fadeIn 0.2s ease" }}>
          {toast}
        </div>
      )}
    </div>
  );
}

/* ══════════════ IDEAS TAB ══════════════ */
function IdeasTab({ profile, allPlans, weekEntries, initialWeek, onPlanGenerated, onPlanUpdated, onSwitchToLog, onWritePost, onProfileUpdated }: {
  profile: UserProfile; allPlans: ContentPlan[]; weekEntries: LogEntry[];
  initialWeek?: string; onPlanGenerated: (plan: ContentPlan) => void;
  onPlanUpdated: (plan: ContentPlan) => void;
  onSwitchToLog: () => void; onWritePost: (planId: string, postIndex: number) => void;
  onProfileUpdated: (fields: Partial<UserProfile>) => void;
}) {
  const weeks = Array.from(new Set(allPlans.map(p => p.week_start))).sort().reverse();
  const targetWeek = getWeekStart();
  const hasCurrentPlan = allPlans.some(p => p.week_start === targetWeek);

  const [weekIdx, setWeekIdx] = useState(() => { if (initialWeek) { const i = weeks.indexOf(initialWeek); return i >= 0 ? i : 0; } return 0; });
  const [extraContext, setExtraContext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGenerate, setShowGenerate] = useState(!hasCurrentPlan);
  const [loadingMore, setLoadingMore] = useState(false);
  const [maxedOut, setMaxedOut] = useState(false);

  useEffect(() => { if (initialWeek) { const i = weeks.indexOf(initialWeek); if (i >= 0) { setWeekIdx(i); setShowGenerate(false); } } }, [initialWeek]);

  const [editing, setEditing] = useState(false);
  const [editWhatYouDo, setEditWhatYouDo] = useState(profile.what_you_do || "");
  const [editWhatYouBuild, setEditWhatYouBuild] = useState(profile.what_you_build || "");
  const [editWhyYouPost, setEditWhyYouPost] = useState(profile.why_you_post || "");
  const [editPlatforms, setEditPlatforms] = useState<string[]>(profile.platforms || []);
  const [editFrequency, setEditFrequency] = useState(profile.posting_frequency || "3-4");
  const [editSaving, setEditSaving] = useState(false);

  const noteCount = weekEntries.filter(e => e.type === "note" || !e.type).length;
  const linkCount = weekEntries.filter(e => e.type === "link").length;
  const quoteCount = weekEntries.filter(e => e.type === "quote").length;
  const totalEntries = weekEntries.length;

  const WHY_OPTIONS = ["Get customers", "Build authority", "Find collaborators", "Document the journey"];
  const PLATFORM_OPTIONS = ["LinkedIn", "X", "Substack", "小红书", "Threads"];
  const FREQ_OPTIONS = ["1-2/week", "3-4/week", "Daily"];

  const handleSaveProfile = async () => {
    setEditSaving(true);
    await upsertProfile({
      what_you_do: editWhatYouDo.trim() || null,
      what_you_build: editWhatYouBuild.trim() || null,
      why_you_post: editWhyYouPost || null,
      platforms: editPlatforms,
      posting_frequency: editFrequency,
    });
    setEditSaving(false);
    setEditing(false);
    // Update parent profile
    onProfileUpdated({
      what_you_do: editWhatYouDo.trim() || null,
      what_you_build: editWhatYouBuild.trim() || null,
      why_you_post: editWhyYouPost || null,
      platforms: editPlatforms,
      posting_frequency: editFrequency,
    });
  };

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
      onPlanGenerated(saved); setShowGenerate(false); setWeekIdx(0);
    } catch { setError("Something went wrong."); }
    setGenerating(false);
  };

  const handleMoreIdeas = async (currentPlan: ContentPlan, currentPlanData: ContentPlanData) => {
    if (loadingMore || currentPlanData.posts.length >= 5) return;
    setLoadingMore(true); setError(null);
    try {
      const existingPrompts = currentPlanData.posts.map(p => p.prompt || p.key_takeaway || p.hook || "").filter(Boolean);
      const entriesPayload = weekEntries.map(e => ({ content: e.content || "", tags: e.tags, url: e.url, type: e.type, source: e.source }));
      const body = {
        entries: entriesPayload.length > 0 ? entriesPayload : undefined,
        dump: entriesPayload.length === 0 ? "Generate more ideas based on my profile" : undefined,
        profile,
        moreIdeas: { count: 2, exclude: existingPrompts },
      };
      const res = await fetch("/api/generate-plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) { setError("Failed to generate more ideas."); setLoadingMore(false); return; }
      const newData: ContentPlanData = await res.json();
      const merged: ContentPlanData = { strategy_note: currentPlanData.strategy_note, posts: [...currentPlanData.posts, ...newData.posts].slice(0, 5) };
      const updated = await updatePlanPosts(currentPlan.id, merged);
      if (updated) {
        onPlanUpdated(updated);
        setMaxedOut(true);
      } else {
        setError("Generated ideas but failed to save.");
      }
    } catch {
      setError("Something went wrong.");
    }
    setLoadingMore(false);
  };

  // Generate view (either no plan exists, or user clicked Regenerate)
  if (showGenerate) {
    return (
      <div>
        <h2 className="font-serif mb-6" style={{ fontSize: 24, fontWeight: 600, color: INK }}>Ready to plan your week?</h2>
        <div className="rounded-[12px] p-5 mb-6" style={{ background: "#fafafa", border: `1px solid ${BORDER}` }}>
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono uppercase" style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}>📋 Your week at a glance</span>
            <button onClick={() => setEditing(!editing)} className="font-mono text-[11px]" style={{ color: BLUE, background: "none", border: "none", cursor: "pointer" }}>
              {editing ? "Cancel" : "Edit"}
            </button>
          </div>

          {!editing ? (
            <div className="space-y-2">
              <p className="font-sans text-[14px]" style={{ color: INK }}><span style={{ color: FAINT }}>Notes this week:</span> <strong>{noteCount}</strong></p>
              {(linkCount > 0 || quoteCount > 0) && (
                <p className="font-sans text-[14px]" style={{ color: INK }}>
                  <span style={{ color: FAINT }}>Inspiration:</span> {linkCount > 0 && <strong>{linkCount} link{linkCount !== 1 ? "s" : ""}</strong>}{linkCount > 0 && quoteCount > 0 && ", "}{quoteCount > 0 && <strong>{quoteCount} quote{quoteCount !== 1 ? "s" : ""}</strong>}
                </p>
              )}
              {profile.what_you_do && <p className="font-sans text-[14px]" style={{ color: INK }}><span style={{ color: FAINT }}>You:</span> {profile.what_you_do}</p>}
              {profile.what_you_build && <p className="font-sans text-[14px]" style={{ color: INK }}><span style={{ color: FAINT }}>Building:</span> {profile.what_you_build}</p>}
              {profile.why_you_post && <p className="font-sans text-[14px]" style={{ color: INK }}><span style={{ color: FAINT }}>Why:</span> {profile.why_you_post}</p>}
              <p className="font-sans text-[14px]" style={{ color: INK }}><span style={{ color: FAINT }}>Platforms:</span> {(profile.platforms || []).join(", ") || "not set"}</p>
              <p className="font-sans text-[14px]" style={{ color: INK }}><span style={{ color: FAINT }}>Frequency:</span> {profile.posting_frequency || "not set"}</p>
              {totalEntries < 3 && (
                <p className="font-sans text-[13px] pt-2" style={{ color: "#f59e0b" }}>Add a few more notes to your Log this week — the more context, the better your plan.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="font-mono uppercase block mb-1" style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}>What do you do?</label>
                <input value={editWhatYouDo} onChange={e => setEditWhatYouDo(e.target.value)}
                  placeholder="I'm building a content planning tool for founders"
                  className="w-full outline-none font-sans text-[14px]" style={{ color: INK, padding: "8px 12px", border: `1px solid ${BORDER}`, borderRadius: 8, background: "#fff" }} />
              </div>
              <div>
                <label className="font-mono uppercase block mb-1" style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}>What are you building?</label>
                <input value={editWhatYouBuild} onChange={e => setEditWhatYouBuild(e.target.value)}
                  placeholder="Accent — helps founders post consistently"
                  className="w-full outline-none font-sans text-[14px]" style={{ color: INK, padding: "8px 12px", border: `1px solid ${BORDER}`, borderRadius: 8, background: "#fff" }} />
              </div>
              <div>
                <label className="font-mono uppercase block mb-1" style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}>Why do you post?</label>
                <div className="flex flex-wrap gap-2">
                  {WHY_OPTIONS.map(w => (
                    <button key={w} onClick={() => setEditWhyYouPost(editWhyYouPost === w ? "" : w)}
                      className="font-sans text-[12px] px-3 py-2 rounded-full transition-all"
                      style={{ minHeight: 36, background: editWhyYouPost === w ? `${BLUE}12` : "#fff", color: editWhyYouPost === w ? BLUE : DIM, border: `1px solid ${editWhyYouPost === w ? BLUE + "30" : BORDER}`, cursor: "pointer" }}>
                      {w}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="font-mono uppercase block mb-1" style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}>Platforms</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_OPTIONS.map(p => (
                    <button key={p} onClick={() => setEditPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])}
                      className="font-sans text-[12px] px-3 py-2 rounded-full transition-all"
                      style={{ minHeight: 36, background: editPlatforms.includes(p) ? `${BLUE}12` : "#fff", color: editPlatforms.includes(p) ? BLUE : DIM, border: `1px solid ${editPlatforms.includes(p) ? BLUE + "30" : BORDER}`, cursor: "pointer" }}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="font-mono uppercase block mb-1" style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}>How often?</label>
                <div className="flex gap-2">
                  {FREQ_OPTIONS.map(f => (
                    <button key={f} onClick={() => setEditFrequency(f)}
                      className="font-sans text-[12px] px-3 py-2 rounded-full transition-all"
                      style={{ minHeight: 36, background: editFrequency === f ? `${BLUE}12` : "#fff", color: editFrequency === f ? BLUE : DIM, border: `1px solid ${editFrequency === f ? BLUE + "30" : BORDER}`, cursor: "pointer" }}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={handleSaveProfile} disabled={editSaving}
                className="w-full rounded-full font-sans font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ fontSize: 15, padding: "12px 24px", background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}>
                {editSaving ? "Saving..." : "Save"}
              </button>
            </div>
          )}
        </div>
        <div className="mb-6">
          <label className="font-mono uppercase block mb-2" style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}>Anything else on your mind this week? (optional)</label>
          <textarea value={extraContext} onChange={e => setExtraContext(e.target.value)} placeholder="Launching a new feature, meeting an investor..." rows={3}
            className="w-full outline-none resize-y font-sans" style={{ fontSize: 15, color: INK, lineHeight: 1.6, padding: "12px 16px", border: `1px solid ${BORDER}`, borderRadius: 10 }} />
        </div>
        {error && <p className="font-sans text-[13px] mb-3" style={{ color: "#DC2626" }}>{error}</p>}
        <button onClick={handleGenerate} disabled={generating} className="w-full rounded-full font-sans font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ fontSize: 15, padding: "12px 24px", background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}>
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
          <span className="font-serif block" style={{ fontSize: 16, fontWeight: 600, color: INK }}>{weekLabel(currentWeek)}</span>
          <span className="font-sans" style={{ fontSize: 14, color: FAINT }}>{planData ? `${planData.posts.length} posts` : "No plan"}</span>
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
              <p className="font-sans" style={{ fontSize: 16, color: INK, lineHeight: 1.6 }}>{planData.strategy_note}</p>
            </div>
          )}
          <div className="space-y-4">
            {planData.posts.map((post, i) => {
              const typeColor = CONTENT_TYPE_COLORS[post.type] || CONTENT_TYPE_COLORS[post.post_type || ""] || BLUE;
              const typeLabel = (post.type || post.post_type || "").replace(/-/g, " ");
              const nudge = post.prompt || post.key_takeaway || post.hook || "";
              const rawSnippet = post.source_snippet || "";
              const sourceSnippet = rawSnippet.length > 5 && !/^[\s\-\[\]]*$/.test(rawSnippet) ? rawSnippet : "";

              return (
                <div key={i} className="rounded-[12px]" style={{ padding: "24px 20px", border: `1px solid ${BORDER}`, background: "#fff" }}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-mono text-[12px] font-semibold px-2.5 py-1 rounded capitalize" style={{ background: `${typeColor}10`, color: typeColor }}>{typeLabel}</span>
                      <span className="font-sans" style={{ fontSize: 14, color: FAINT }}>{post.day} · {PLATFORM_LABELS[post.platform] || post.platform}</span>
                    </div>

                    <p className="font-serif" style={{ fontSize: 18, color: INK, lineHeight: 1.5, fontWeight: 500 }}>{nudge}</p>

                    {sourceSnippet && (
                      <div className="mt-4 pl-4" style={{ borderLeft: `2px solid ${BORDER}` }}>
                        <p className="font-sans italic" style={{ fontSize: 15, color: BODY, lineHeight: 1.55 }}>"{sourceSnippet}"</p>
                      </div>
                    )}

                    {!sourceSnippet && post.reasoning && (
                      <p className="font-sans mt-3" style={{ fontSize: 15, color: BODY, lineHeight: 1.6 }}>{post.reasoning}</p>
                    )}

                    <button onClick={() => { if (plan) onWritePost(plan.id, i); }}
                      className="mt-5 rounded-full font-sans font-semibold accent-btn-outline"
                      style={{ fontSize: 15, padding: "10px 20px", border: `2px solid ${BLUE}`, background: "#fff", color: BLUE, cursor: "pointer" }}>
                      Write this →
                    </button>
                </div>
              );
            })}
          </div>
          {planData.posts.length < 5 && !maxedOut ? (
            <button onClick={() => handleMoreIdeas(plan!, planData)} disabled={loadingMore}
              className="mt-6 w-full rounded-full font-sans font-semibold disabled:opacity-50 accent-btn-outline"
              style={{ fontSize: 15, padding: "10px 20px", border: `2px solid ${BLUE}`, background: "#fff", color: BLUE, cursor: "pointer" }}>
              {loadingMore ? "Finding more ideas..." : "Show me more ideas"}
            </button>
          ) : planData.posts.length >= 5 || maxedOut ? (
            <p className="mt-6 text-center font-sans font-medium" style={{ fontSize: 14, color: FAINT, padding: "8px 0" }}>
              ✓ All set for this week
            </p>
          ) : null}
          <button onClick={onSwitchToLog} className="mt-2 w-full rounded-full font-sans font-semibold accent-btn-outline"
            style={{ fontSize: 15, padding: "10px 20px", border: `2px solid ${BLUE}`, background: "#fff", color: BLUE, cursor: "pointer" }}>Add more notes for next week</button>
          <button onClick={() => { setShowGenerate(true); }} className="mt-2 w-full rounded-full font-sans font-semibold accent-btn-outline"
            style={{ fontSize: 15, padding: "10px 20px", border: `2px solid ${BLUE}`, background: "#fff", color: BLUE, cursor: "pointer" }}>Regenerate plan</button>
        </div>
      )}
    </div>
  );
}

/* ══════════════ DRAFTS TAB ══════════════ */
const PUBLISH_PLATFORMS = ["LinkedIn", "X", "Threads", "Substack", "Other"];

function DraftsTab({ drafts, allPlans, onOpenDraft, onDraftsUpdated }: { drafts: Draft[]; allPlans: ContentPlan[]; onOpenDraft: (planId: string, postIndex: number) => void; onDraftsUpdated: () => void }) {
  const [filter, setFilter] = useState<"all" | "drafts" | "published">("all");
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [pubPlatform, setPubPlatform] = useState("LinkedIn");
  const [pubUrl, setPubUrl] = useState("");

  const draftsWithContext = drafts.filter(d => d.content.trim()).map(d => {
    const plan = allPlans.find(p => p.id === d.plan_id);
    const planData = plan ? (typeof plan.plan === "string" ? JSON.parse(plan.plan) : plan.plan) as ContentPlanData : null;
    const post = planData?.posts?.[d.post_index];
    const prompt = post?.prompt || post?.key_takeaway || post?.hook || "";
    const platform = post?.platform || "";
    const wordCount = d.content.trim().split(/\s+/).length;
    return { ...d, prompt, platform, wordCount };
  });

  const filtered = draftsWithContext.filter(d => {
    if (filter === "drafts") return !d.published;
    if (filter === "published") return d.published;
    return true;
  });

  const handlePublish = async (draftId: string) => {
    const result = await markAsPublished(draftId, pubPlatform, pubUrl.trim() || undefined);
    if (result) { onDraftsUpdated(); }
    setPublishingId(null); setPubPlatform("LinkedIn"); setPubUrl("");
  };

  const FILTERS: { key: typeof filter; label: string }[] = [
    { key: "all", label: "All" }, { key: "drafts", label: "Drafts" }, { key: "published", label: "Published" },
  ];

  return (
    <div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} className="font-sans text-[12px] px-3 py-1.5 rounded-full transition-all"
            style={{ background: filter === f.key ? `${BLUE}10` : "transparent", color: filter === f.key ? BLUE : FAINT, border: filter === f.key ? `1px solid ${BLUE}20` : `1px solid ${BORDER}`, cursor: "pointer" }}>
            {f.label}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-sans" style={{ fontSize: 15, color: FAINT }}>
            {filter === "all" ? "No drafts yet. Tap \"Write this →\" on any idea to start." : `No ${filter} yet.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(d => (
            <div key={d.id} className="rounded-[12px]" style={{ padding: "20px", border: `1px solid ${BORDER}`, background: "#fff" }}>
              <div className="cursor-pointer" onClick={() => onOpenDraft(d.plan_id, d.post_index)}>
                {d.prompt && <p className="font-sans mb-2" style={{ fontSize: 13, color: FAINT, lineHeight: 1.4 }}>{d.prompt}</p>}
                <p className="font-sans" style={{ fontSize: 15, color: BODY, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{d.content}</p>
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {d.platform && <span className="font-sans text-[12px] px-2 py-0.5 rounded-full" style={{ background: "#f0f0f0", color: DIM }}>{PLATFORM_LABELS[d.platform] || d.platform}</span>}
                <span className="font-mono" style={{ fontSize: 12, color: FAINT }}>{d.wordCount} words · {getDayLabel(d.updated_at)}</span>
                {d.published ? (
                  <>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded-full" style={{ background: "#22c55e15", color: "#16a34a" }}>Published</span>
                    {d.published_platform && <span className="font-mono text-[11px]" style={{ color: FAINT }}>on {d.published_platform}</span>}
                    {d.published_url && (
                      <a href={d.published_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        className="no-underline font-mono text-[11px]" style={{ color: BLUE }}>View post →</a>
                    )}
                  </>
                ) : (
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded-full" style={{ background: "#f59e0b15", color: "#f59e0b" }}>Draft</span>
                )}
              </div>
              {/* Publish action */}
              {!d.published && publishingId !== d.id && (
                <button onClick={(e) => { e.stopPropagation(); setPublishingId(d.id); }}
                  className="mt-3 font-sans text-[13px]" style={{ color: FAINT, background: "none", border: "none", cursor: "pointer" }}>
                  Mark as published
                </button>
              )}
              {publishingId === d.id && (
                <div className="mt-3 p-4 rounded-[10px] space-y-3" style={{ background: "#fafafa", border: `1px solid ${BORDER}` }} onClick={e => e.stopPropagation()}>
                  <div>
                    <span className="font-mono uppercase block mb-2" style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}>Where did you post this?</span>
                    <div className="flex gap-2 flex-wrap">
                      {PUBLISH_PLATFORMS.map(p => (
                        <button key={p} onClick={() => setPubPlatform(p)} className="font-sans text-[12px] px-3 py-1.5 rounded-full transition-all"
                          style={{ background: pubPlatform === p ? `${BLUE}10` : "#fff", color: pubPlatform === p ? BLUE : DIM, border: `1px solid ${pubPlatform === p ? BLUE + "30" : BORDER}`, cursor: "pointer" }}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input value={pubUrl} onChange={e => setPubUrl(e.target.value)} placeholder="Paste link (optional)"
                    className="w-full outline-none font-sans text-[13px]" style={{ color: INK, padding: "8px 12px", border: `1px solid ${BORDER}`, borderRadius: 8, background: "#fff" }} />
                  <div className="flex gap-2">
                    <button onClick={() => handlePublish(d.id)} className="font-sans font-semibold rounded-full"
                      style={{ fontSize: 13, padding: "8px 18px", background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}>Mark as published</button>
                    <button onClick={() => setPublishingId(null)} className="font-sans text-[13px]"
                      style={{ color: FAINT, background: "none", border: "none", cursor: "pointer" }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ══════════════ WRITE MODE ══════════════ */
interface CoachFeedback {
  overall: string;
  structure_feedback: string;
  phrases_to_improve: Array<{ original: string; suggestion: string; reason: string }>;
  micro_lesson: { title: string; explanation: string };
}

function WriteMode({ planId, postIndex, post, onBack, onSaveDone }: { planId: string; postIndex: number; post: ContentPlanPost; onBack: () => void; onSaveDone: () => void }) {
  const [content, setContent] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showStructure, setShowStructure] = useState(true);
  const [showNote, setShowNote] = useState(true);
  const [coaching, setCoaching] = useState<CoachFeedback | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const autoSaveInterval = useRef<NodeJS.Timeout | null>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const lastSavedRef = useRef("");

  useEffect(() => {
    getDraft(planId, postIndex).then(d => { if (d) { setContent(d.content); lastSavedRef.current = d.content; } setLoaded(true); });
  }, [planId, postIndex]);

  // Auto-save every 30 seconds
  useEffect(() => {
    autoSaveInterval.current = setInterval(async () => {
      if (content.trim() && content !== lastSavedRef.current) {
        setSaving(true);
        await saveDraft(planId, postIndex, content);
        lastSavedRef.current = content;
        setSaving(false);
      }
    }, 30000);
    return () => { if (autoSaveInterval.current) clearInterval(autoSaveInterval.current); };
  }, [content, planId, postIndex]);

  const handleChange = (val: string) => {
    setContent(val);
    // Debounced save on typing (1s)
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      setSaving(true);
      await saveDraft(planId, postIndex, val);
      lastSavedRef.current = val;
      setSaving(false);
    }, 1000);
  };

  const [saveError, setSaveError] = useState<string | null>(null);

  const handleExplicitSave = async () => {
    setSaving(true); setSaveError(null);
    const result = await saveDraft(planId, postIndex, content);
    lastSavedRef.current = content;
    setSaving(false);
    if (result) {
      onSaveDone();
    } else {
      setSaveError("Failed to save draft. Check browser console for details.");
    }
  };

  const handleCheckWriting = async () => {
    if (!content.trim() || coachLoading) return;
    setCoachLoading(true);
    try {
      const res = await fetch("/api/coach-draft", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: content.trim(), key_takeaway: post.prompt || post.key_takeaway || post.hook, structure: post.structure, platform: post.platform }),
      });
      if (res.ok) { const data = await res.json(); setCoaching(data); setTimeout(() => feedbackRef.current?.scrollIntoView({ behavior: "smooth" }), 100); }
    } catch {}
    setCoachLoading(false);
  };

  const handleApplySuggestions = async () => {
    if (!coaching) return;
    let updated = content;
    for (const p of coaching.phrases_to_improve) {
      if (p.original && p.suggestion) updated = updated.replace(p.original, p.suggestion);
    }
    setContent(updated);
    setSaving(true);
    await saveDraft(planId, postIndex, updated);
    lastSavedRef.current = updated;
    setSaving(false);
    setCoaching(null);
  };

  const handleKeepOriginal = async () => {
    setSaving(true);
    await saveDraft(planId, postIndex, content);
    lastSavedRef.current = content;
    setSaving(false);
    setCoaching(null);
    onSaveDone();
  };

  if (!loaded) return <div className="py-12 text-center"><span className="font-sans text-[14px]" style={{ color: FAINT }}>Loading...</span></div>;

  const hasStructure = post.structure && post.structure.length > 0;
  const displayText = post.prompt || post.key_takeaway || post.hook || "";
  const rawSnippet = post.source_snippet || "";
  const sourceNote = rawSnippet.length > 5 && !/^[\s\-\[\]]*$/.test(rawSnippet) ? rawSnippet : "";

  return (
    <div className="min-h-screen" style={{ background: "#fff" }}>
      <div className="max-w-[640px] mx-auto px-5 py-6">
        <div className="flex items-center justify-between mb-6">
          <button onClick={onBack} className="font-mono text-[12px]" style={{ color: DIM, background: "none", border: "none", cursor: "pointer" }}>← Back to plan</button>
          <span className="font-mono text-[11px]" style={{ color: saving ? BLUE : saveError ? "#DC2626" : FAINT }}>{saving ? "Saving..." : saveError ? "Save failed" : "Saved"}</span>
        </div>

        <p className="font-serif font-semibold mb-4" style={{ fontSize: 18, color: INK }}>{displayText}</p>

        {sourceNote && (
          <div className="mb-6">
            <button onClick={() => setShowNote(!showNote)} className="font-mono text-[11px] uppercase mb-2 flex items-center gap-1" style={{ color: FAINT, background: "none", border: "none", cursor: "pointer", letterSpacing: "0.05em", fontWeight: 500 }}>
              Your note <span style={{ fontSize: 10, transition: "transform 0.2s", transform: showNote ? "rotate(0)" : "rotate(-90deg)" }}>▼</span>
            </button>
            {showNote && (
              <div className="p-4 rounded-[10px]" style={{ background: "#f9fafb", border: `1px solid ${BORDER}` }}>
                <p className="font-sans" style={{ fontSize: 15, color: BODY, lineHeight: 1.6, fontStyle: "italic" }}>{sourceNote}</p>
              </div>
            )}
          </div>
        )}

        {hasStructure && (
          <div className="mb-6">
            <button onClick={() => setShowStructure(!showStructure)} className="font-mono text-[11px] uppercase mb-2 flex items-center gap-1" style={{ color: FAINT, background: "none", border: "none", cursor: "pointer", letterSpacing: "0.05em", fontWeight: 500 }}>
              Structure <span style={{ fontSize: 10, transition: "transform 0.2s", transform: showStructure ? "rotate(0)" : "rotate(-90deg)" }}>▼</span>
            </button>
            {showStructure && (
              <div className="p-4 rounded-[10px] space-y-2" style={{ background: "#f9fafb", border: `1px solid ${BORDER}` }}>
                {(post.structure || []).map((step: string, j: number) => (
                  <p key={j} className="font-sans text-[13px]" style={{ color: DIM, lineHeight: 1.5 }}>
                    <span className="font-mono text-[11px] mr-2" style={{ color: BLUE }}>{j + 1}.</span>{step}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <textarea value={content} onChange={e => handleChange(e.target.value)} placeholder="Start writing..."
          className="w-full outline-none resize-y font-sans"
          style={{ fontSize: 16, color: INK, lineHeight: 1.8, padding: 0, border: "none", background: "transparent", minHeight: "40vh" }}
          autoFocus />

        {/* Action buttons */}
        {content.trim().length > 20 && !coaching && (
          <div className="mt-6 space-y-3">
            <button onClick={handleCheckWriting} disabled={coachLoading}
              className="w-full rounded-full font-sans font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ fontSize: 15, padding: "12px 24px", background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}>
              {coachLoading ? "Checking..." : "Check my writing"}
            </button>
            <button onClick={handleExplicitSave}
              className="w-full rounded-full font-sans font-semibold accent-btn-outline"
              style={{ fontSize: 15, padding: "10px 20px", border: `2px solid ${BLUE}`, background: "#fff", color: BLUE, cursor: "pointer" }}>
              Save draft
            </button>
            {saveError && <p className="font-sans text-[13px] mt-2" style={{ color: "#DC2626" }}>{saveError}</p>}
          </div>
        )}

        {/* Coaching feedback */}
        {coaching && (
          <div ref={feedbackRef} className="mt-8 space-y-5">
            <div className="p-4 rounded-[10px]" style={{ background: "#fafafa", border: `1px solid ${BORDER}` }}>
              <span className="font-mono uppercase block mb-2" style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}>Overall</span>
              <p className="font-sans" style={{ fontSize: 16, color: INK, lineHeight: 1.6 }}>{coaching.overall}</p>
            </div>

            {coaching.structure_feedback && (
              <div className="p-4 rounded-[10px]" style={{ background: "#fafafa", border: `1px solid ${BORDER}` }}>
                <span className="font-mono uppercase block mb-2" style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}>Structure</span>
                <p className="font-sans" style={{ fontSize: 16, color: INK, lineHeight: 1.6 }}>{coaching.structure_feedback}</p>
              </div>
            )}

            {coaching.phrases_to_improve.length > 0 && (
              <div className="space-y-3">
                <span className="font-mono uppercase block" style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}>Phrases to improve</span>
                {coaching.phrases_to_improve.map((p, i) => (
                  <div key={i} className="p-4 rounded-[10px]" style={{ border: `1px solid ${BORDER}` }}>
                    <p className="font-sans line-through" style={{ fontSize: 16, color: DIM }}>{p.original}</p>
                    <p className="font-sans font-semibold mt-1" style={{ fontSize: 16, color: INK }}>{p.suggestion}</p>
                    <p className="font-mono text-[11px] mt-1" style={{ color: FAINT }}>{p.reason}</p>
                  </div>
                ))}
              </div>
            )}

            {coaching.micro_lesson && (
              <div className="p-4 rounded-[10px]" style={{ borderLeft: `3px solid ${BLUE}`, background: `${BLUE}04` }}>
                <span className="font-mono uppercase block mb-1" style={{ fontSize: 10, letterSpacing: "0.06em", color: BLUE }}>Lesson</span>
                <p className="font-serif mb-2" style={{ fontSize: 16, fontWeight: 600, color: INK }}>{coaching.micro_lesson.title}</p>
                <p className="font-sans text-[14px]" style={{ color: DIM, lineHeight: 1.6 }}>{coaching.micro_lesson.explanation}</p>
              </div>
            )}

            {/* Post-feedback actions */}
            <div className="space-y-3 pt-2 pb-8">
              <button onClick={handleApplySuggestions}
                className="w-full rounded-full font-sans font-semibold"
                style={{ fontSize: 15, padding: "12px 24px", background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}>
                Apply suggestions
              </button>
              <button onClick={handleKeepOriginal}
                className="w-full rounded-full font-sans font-semibold accent-btn-outline"
                style={{ fontSize: 15, padding: "10px 20px", border: `2px solid ${BLUE}`, background: "#fff", color: BLUE, cursor: "pointer" }}>
                Keep original & save
              </button>
            </div>
          </div>
        )}
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
  const [draftsState, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("log");
  const [ideasWeek, setIdeasWeek] = useState<string | undefined>();
  const [writeMode, setWriteMode] = useState<{ planId: string; postIndex: number } | null>(null);
  const [tooltipStep, setTooltipStep] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      const [p, plan, dumps, plans, entries, draftsList] = await Promise.all([getProfile(), getCurrentPlan(), getAllDumps(), getAllPlans(), getLogEntries(), getAllDrafts()]);
      setProfile(p); setCurrentPlan(plan); setAllDumps(dumps); setAllPlans(plans); setLogEntries(entries); setDrafts(draftsList);
      if (plan) setTab("ideas");
      // Show onboarding tooltip for first-time users
      if (p && !p.tooltip_seen && entries.length === 0 && !plan) setTooltipStep(1);
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
      if (post) return <WriteMode planId={writeMode.planId} postIndex={writeMode.postIndex} post={post} onBack={() => setWriteMode(null)} onSaveDone={() => { setWriteMode(null); setTab("drafts"); getAllDrafts().then(setDrafts); }} />;
    }
    setWriteMode(null);
  }

  if (loading) return (
    <div className="min-h-screen" style={{ background: "#fff" }}>
      <header style={{ borderBottom: `1px solid ${BORDER}` }}><div className="max-w-[640px] mx-auto px-5 py-4"><span className="font-serif" style={{ fontSize: 20, fontWeight: 600, color: INK }}>accent</span></div></header>
      <div className="max-w-[640px] mx-auto px-5 py-8 animate-pulse"><div className="h-7 rounded w-48 mb-4" style={{ background: "#f0f0f0" }} /><div className="h-44 rounded-[12px]" style={{ background: "#fafafa" }} /></div>
    </div>
  );

  const TABS: { key: Tab; label: string }[] = [{ key: "log", label: "Log" }, { key: "ideas", label: "Ideas" }, { key: "drafts", label: "Drafts" }];

  return (
    <div className="min-h-screen" style={{ background: "#fff" }}>
      <header style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[640px] mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/" className="no-underline font-serif" style={{ fontSize: 20, fontWeight: 600, color: INK }}>accent</Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard/write" className="no-underline flex items-center" style={{ color: DIM }} title="Quick check">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
            </Link>
            <Link href="/settings" className="no-underline font-mono text-[12px]" style={{ color: DIM }}>Settings</Link>
          </div>
        </div>
      </header>
      <div style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[640px] mx-auto px-5 flex gap-6">
          {TABS.map(t => (
            <button key={t.key} id={`tab-${t.key}`} onClick={() => { setTab(t.key); if (t.key !== "ideas") setIdeasWeek(undefined); }}
              className="font-sans py-3.5 relative" style={{ fontSize: 16, fontWeight: tab === t.key ? 700 : 500, color: tab === t.key ? INK : DIM, background: "none", border: "none", borderBottom: `2px solid ${tab === t.key ? INK : "transparent"}`, cursor: "pointer" }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="max-w-[640px] mx-auto px-5 pt-6 pb-12">
        {tab === "log" && <LogTab logEntries={logEntriesState} setLogEntries={setLogEntries} allPlans={allPlans} onSwitchToIdeas={() => setTab("ideas")} />}
        {tab === "ideas" && <IdeasTab profile={profile!} allPlans={allPlans} weekEntries={weekEntries} initialWeek={ideasWeek} onPlanGenerated={handlePlanGenerated} onPlanUpdated={(updated) => setAllPlans(prev => prev.map(p => p.id === updated.id ? updated : p))} onSwitchToLog={() => setTab("log")} onWritePost={(pid, pi) => setWriteMode({ planId: pid, postIndex: pi })} onProfileUpdated={(fields) => setProfile(prev => prev ? { ...prev, ...fields } : prev)} />}
        {tab === "drafts" && <DraftsTab drafts={draftsState} allPlans={allPlans} onOpenDraft={(pid, pi) => setWriteMode({ planId: pid, postIndex: pi })} onDraftsUpdated={() => getAllDrafts().then(setDrafts)} />}
      </div>

      {/* Onboarding tooltip */}
      {tooltipStep !== null && <OnboardingTooltip step={tooltipStep} onNext={() => {
        if (tooltipStep < 3) setTooltipStep(tooltipStep + 1);
        else { setTooltipStep(null); upsertProfile({ tooltip_seen: true }); }
      }} onDismiss={() => { setTooltipStep(null); upsertProfile({ tooltip_seen: true }); }} />}
    </div>
  );
}

/* ══════════════ ONBOARDING TOOLTIP ══════════════ */
function OnboardingTooltip({ step, onNext, onDismiss }: { step: number; onNext: () => void; onDismiss: () => void }) {
  const steps = [
    { target: "compose-card", text: "Start here — write what happened today" },
    { target: "tab-ideas", text: "We'll turn your notes into a weekly content plan" },
    { target: "tab-drafts", text: "Your written posts live here" },
  ];
  const current = steps[step - 1];
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    const update = () => {
      const el = document.getElementById(current.target);
      if (el) {
        const rect = el.getBoundingClientRect();
        setPos({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
      }
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [step, current.target]);

  if (!pos) return null;

  return (
    <>
      <div onClick={onDismiss} className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.15)" }} />
      <div className="fixed z-50" style={{ top: pos.top, left: Math.min(Math.max(pos.left, 160), window.innerWidth - 160), transform: "translateX(-50%)" }}>
        <div style={{ width: 0, height: 0, borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderBottom: "8px solid #111827", margin: "0 auto" }} />
        <div className="rounded-[10px] px-4 py-3" style={{ background: "#111827", minWidth: 240, maxWidth: 300 }}>
          <p className="font-sans text-[14px] mb-3" style={{ color: "#fff", lineHeight: 1.5 }}>{current.text}</p>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px]" style={{ color: "#6b7280" }}>{step}/3</span>
            <button onClick={onNext} className="font-sans text-[13px] font-semibold px-3 py-1 rounded-full"
              style={{ background: "#3B82F6", color: "#fff", border: "none", cursor: "pointer" }}>
              {step < 3 ? "Next →" : "Got it"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
