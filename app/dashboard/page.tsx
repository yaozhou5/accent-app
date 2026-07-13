"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { getProfile, upsertProfile, type UserProfile } from "@/lib/supabase/profiles";
import type { VoiceProfile } from "@/lib/voice-dimensions";
import { createWeeklyDump, getAllDumps, type WeeklyDump } from "@/lib/supabase/planner";
import {
  savePlan,
  updatePlanPosts,
  getCurrentPlan,
  getAllPlans,
  getWeekStart,
  getCurrentWeekMonday,
  type ContentPlan,
  type ContentPlanData,
  type ContentPlanPost,
  type WeeklyThemes,
  type Theme,
  saveThemePlan,
  updateThemePick,
} from "@/lib/supabase/planner";
import {
  createLogEntry,
  updateLogEntryTags,
  updateLogEntry,
  getLogEntries,
  uploadLogImage,
  detectUrl,
  toggleBookmark,
  archiveLogEntries,
  deleteLogEntry,
  type LogEntry,
  type LogEntryType,
} from "@/lib/supabase/log-entries";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import posthog from "posthog-js";
import {
  getDraft,
  saveDraft,
  saveDraftById,
  createStandaloneDraft,
  getAllDrafts,
  markAsPublished,
  type Draft,
} from "@/lib/supabase/drafts";
import { ArrowRight, ArrowLeft } from "@/components/ArrowIcon";
// MultiplyPanel available at @/components/MultiplyPanel but not used in dashboard currently
import {
  getCoachingSession,
  saveCoachingSession,
  type CoachingMessage,
  type CoachingSuggestion,
} from "@/lib/supabase/coaching";
import { PLAYBOOKS, getPlaybook, type Playbook } from "@/lib/playbooks";
import PlaybookEditor from "@/components/PlaybookEditor";

// Design tokens
const INK = "#111827"; // gray-900
const BODY = "#4b5563"; // gray-600 — body text, log entries
const DIM = "#6b7280"; // gray-500 — inactive tabs
const FAINT = "#9ca3af"; // gray-400 — labels, timestamps
const BLUE = "#3B82F6"; // primary action
const BORDER = "#e5e7eb"; // gray-200

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  x: "X",
  substack: "Substack",
  xiaohongshu: "小红书",
  threads: "Threads",
};
const CONTENT_TYPE_COLORS: Record<string, string> = {
  "personal-story": "#8b5cf6",
  lesson: "#3b82f6",
  "behind-the-scenes": "#0d9488",
  listicle: "#f59e0b",
  "hot-take": "#ef4444",
  "social-proof": "#22c55e",
};
const TAG_COLORS: Record<string, string> = {
  "build log": "#64748b",
  "founder diary": "#a8926a",
  "market signal": "#5eaaa8",
  milestone: "#6ab07c",
  inspiration: "#9b8ec4",
};

function weekLabel(ws: string): string {
  const m = new Date(ws + "T12:00:00");
  const f = new Date(m);
  f.setDate(m.getDate() + 4);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(m)}-${fmt(f)}`;
}
function getDayLabel(ds: string): string {
  const d = new Date(ds),
    now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const entry = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((today.getTime() - entry.getTime()) / 86400000);
  const datePart = d.toLocaleDateString("en-US", { month: "long", day: "numeric" }).toUpperCase();
  if (diff === 0) return `TODAY, ${datePart}`;
  if (diff === 1) return `YESTERDAY, ${datePart}`;
  if (diff < 7) {
    const weekday = d.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
    return `${weekday}, ${datePart}`;
  }
  return datePart;
}
function formatTime(ds: string): string {
  return new Date(ds).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
function getReadableTitle(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, "").split("/").pop() || "";
    if (path && path !== "") {
      return path.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
    return u.hostname;
  } catch {
    return url;
  }
}

type Tab = "log" | "playbooks" | "history";
const PASTEL_CARDS: { bg: string; text: string; label: string; labelColor: string }[] = [
  { bg: "rgba(200,75,49,0.12)", text: "#1a1a1a", label: "Conversation", labelColor: "#C84B31" },
  { bg: "rgba(74,88,153,0.12)", text: "#1a1a1a", label: "Win", labelColor: "#4A5899" },
  { bg: "rgba(139,58,58,0.12)", text: "#1a1a1a", label: "Frustration", labelColor: "#8B3A3A" },
  { bg: "rgba(45,58,58,0.12)", text: "#1a1a1a", label: "Reading", labelColor: "#2D3A3A" },
  { bg: "rgba(176,141,46,0.12)", text: "#1a1a1a", label: "Decision", labelColor: "#B08D2E" },
];
const CHIP_COLORS: Record<string, string> = {
  "A call or conversation": "#C84B31",
  "A win": "#4A5899",
  "A frustration": "#8B3A3A",
  "Something I read": "#2D3A3A",
  "A decision I made": "#B08D2E",
};
function getCardStyle(content: string, idx: number): { bg: string; text: string; label: string; labelColor: string } {
  const c = (content || "").toLowerCase();
  if (c.startsWith("today i talked to") || c.includes("call") || c.includes("conversation")) return PASTEL_CARDS[0];
  if (c.startsWith("something that went well") || c.includes("win") || c.includes("went well")) return PASTEL_CARDS[1];
  if (c.startsWith("i got frustrated") || c.includes("frustrat")) return PASTEL_CARDS[2];
  if (c.startsWith("i read something") || c.includes("i read") || c.includes("article")) return PASTEL_CARDS[3];
  if (c.startsWith("i decided to") || c.includes("decision") || c.includes("decided")) return PASTEL_CARDS[4];
  return PASTEL_CARDS[idx % PASTEL_CARDS.length];
}

/* ══════════════ LOG TAB ══════════════ */
function LogTab({
  logEntries,
  setLogEntries,
  allPlans,
  onStartDraft,
  onPostNote,
  postingEntryId,
  profile,
}: {
  logEntries: LogEntry[];
  setLogEntries: (fn: (prev: LogEntry[]) => LogEntry[]) => void;
  allPlans: ContentPlan[];
  onStartDraft: (data: { draft: Draft; images?: string[] }) => void;
  onPostNote: (entry: LogEntry) => void;
  postingEntryId: string | null;
  profile: UserProfile | null;
}) {
  const [input, setInputRaw] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("accent-log-draft") || "";
    return "";
  });
  const setInput = (val: string) => {
    setInputRaw(val);
    if (typeof window !== "undefined") localStorage.setItem("accent-log-draft", val);
  };
  const [entryType, setEntryType] = useState<LogEntryType>(() => {
    if (typeof window !== "undefined") return (localStorage.getItem("accent-log-type") as LogEntryType) || "note";
    return "note";
  });
  const setEntryTypeWithSave = (t: LogEntryType) => {
    setEntryType(t);
    if (typeof window !== "undefined") localStorage.setItem("accent-log-type", t);
  };
  const [source, setSource] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [pendingPreviews, setPendingPreviews] = useState<string[]>([]);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [bookmarkNoteId, setBookmarkNoteId] = useState<string | null>(null);
  const [bookmarkNote, setBookmarkNote] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [ogCache, setOgCache] = useState<
    Record<string, { title: string | null; description: string | null; image: string | null }>
  >({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composeRef = useRef<HTMLTextAreaElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [attachError, setAttachError] = useState<string | null>(null);

  const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

  const addImageFiles = (files: File[]) => {
    const valid: File[] = [];
    for (const f of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(f.type)) {
        setAttachError("Only JPG, PNG, WebP, and GIF allowed.");
        continue;
      }
      if (f.size > MAX_IMAGE_SIZE) {
        setAttachError("Max 5MB per image.");
        continue;
      }
      valid.push(f);
    }
    if (valid.length > 0) {
      setAttachError(null);
      setPendingImages((prev) => [...prev, ...valid].slice(0, 5));
      setPendingPreviews((prev) => [...prev, ...valid.map((f) => URL.createObjectURL(f))].slice(0, 5));
    }
  };

  // Prevent browser from opening dropped files globally
  useEffect(() => {
    const prevent = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("dragover", prevent);
    window.addEventListener("drop", prevent);
    return () => {
      window.removeEventListener("dragover", prevent);
      window.removeEventListener("drop", prevent);
    };
  }, []);

  // Compute which entries were used in plans (match source_snippet to content)
  const usedContents = new Set<string>();
  for (const p of allPlans) {
    const pd = typeof p.plan === "string" ? JSON.parse(p.plan) : p.plan;
    for (const post of pd?.posts || []) {
      if (post.source_snippet) usedContents.add(post.source_snippet.toLowerCase().trim());
    }
  }
  const isUsedInPlan = (e: LogEntry) => e.content && usedContents.has(e.content.toLowerCase().trim());

  // Filter entries (show all, just exclude archived and apply tag filter)
  const visibleEntries = logEntries.filter((e) => {
    if (e.archived) return false;
    if (tagFilter && !(e.tags || []).includes(tagFilter)) return false;
    return true;
  });

  // Unused nudge
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const unusedOldCount = logEntries.filter(
    (e) => !e.archived && !isUsedInPlan(e) && !e.bookmarked && new Date(e.created_at) < twoWeeksAgo
  ).length;

  // Group by day for simple chronological feed
  const dayGroups = (() => {
    const groups: { label: string; entries: LogEntry[] }[] = [];
    const map = new Map<string, LogEntry[]>();
    for (const e of visibleEntries) {
      const label = getDayLabel(e.created_at);
      if (!map.has(label)) {
        map.set(label, []);
        groups.push({ label, entries: map.get(label)! });
      }
      map.get(label)!.push(e);
    }
    return groups;
  })();

  // Fetch OG metadata for link entries
  useEffect(() => {
    const urls = logEntries
      .filter((e) => (e.type === "link" || e.url || e.link_url) && !ogCache[e.url || e.link_url || ""])
      .map((e) => e.url || e.link_url)
      .filter((u): u is string => !!u);
    const unique = [...new Set(urls)].slice(0, 10); // limit to 10 fetches
    for (const url of unique) {
      fetch("/api/og-meta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      })
        .then((r) => r.json())
        .then((data) => setOgCache((prev) => ({ ...prev, [url]: data })))
        .catch(() => {});
    }
  }, [logEntries.length]);

  const tagEntryAsync = (entry: LogEntry) => {
    fetch("/api/tag-entry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: entry.content || "", entryType: entry.type }),
    })
      .then((r) => r.json())
      .then(({ tags }) => {
        if (tags?.length) {
          updateLogEntryTags(entry.id, tags);
          setLogEntries((prev: LogEntry[]) => prev.map((e) => (e.id === entry.id ? { ...e, tags } : e)));
        }
      })
      .catch(() => {});
  };

  const handleSubmit = async () => {
    if ((!input.trim() && pendingImages.length === 0) || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      let imageUrls: string[] = [];
      if (pendingImages.length > 0) {
        const uploads = await Promise.all(pendingImages.map((f) => uploadLogImage(f)));
        imageUrls = uploads.filter((u): u is string => u !== null);
        setPendingImages([]);
        setPendingPreviews([]);
      }
      const detectedUrl = detectUrl(input.trim());
      const isLinkOnly = detectedUrl && input.trim() === detectedUrl;
      const autoType: LogEntryType = isLinkOnly ? "link" : "note";
      const entry = await createLogEntry(input.trim(), {
        image_url: imageUrls[0] || null,
        image_urls: imageUrls,
        link_url: detectedUrl,
        type: autoType,
        url: isLinkOnly ? detectedUrl : null,
      });
      if (entry) {
        setLogEntries((prev: LogEntry[]) => [entry, ...prev]);
        setInput("");
        setSource("");
        tagEntryAsync(entry);
        try {
          posthog.capture("note_logged", {
            type: entry.type,
            has_images: imageUrls.length > 0,
            has_url: !!detectedUrl,
          });
        } catch {}
      } else setError("Failed to save.");
    } catch (e: unknown) {
      setError(`Failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
    setSubmitting(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    addImageFiles(Array.from(e.target.files || []));
    e.target.value = "";
  };
  const removePendingImage = (idx: number) => {
    setPendingImages((prev) => prev.filter((_, i) => i !== idx));
    setPendingPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleToggleBookmark = async (id: string, current: boolean) => {
    if (!current) {
      setBookmarkNoteId(id);
      setBookmarkNote("");
      return;
    }
    const ok = await toggleBookmark(id, false);
    if (ok) {
      setLogEntries((prev: LogEntry[]) => prev.map((e) => (e.id === id ? { ...e, bookmarked: false } : e)));
      setToast("Removed from Shelf");
      setTimeout(() => setToast(null), 1500);
    }
  };
  const handleConfirmBookmark = async () => {
    if (!bookmarkNoteId) return;
    const ok = await toggleBookmark(bookmarkNoteId, true, bookmarkNote.trim() || undefined);
    if (ok) {
      setLogEntries((prev: LogEntry[]) => prev.map((e) => (e.id === bookmarkNoteId ? { ...e, bookmarked: true } : e)));
      setToast("Saved to Shelf");
      setTimeout(() => setToast(null), 1500);
    }
    setBookmarkNoteId(null);
    setBookmarkNote("");
  };

  const toggleSelect = (id: string) => {
    const s = new Set(selected);
    if (s.has(id)) s.delete(id);
    else s.add(id);
    setSelected(s);
  };
  const handleBulkBookmark = async () => {
    for (const id of selected) {
      await toggleBookmark(id, true);
    }
    setLogEntries((prev: LogEntry[]) => prev.map((e) => (selected.has(e.id) ? { ...e, bookmarked: true } : e)));
    setSelected(new Set());
    setSelectMode(false);
    setToast(`${selected.size} bookmarked`);
    setTimeout(() => setToast(null), 1500);
  };
  const handleBulkArchive = async () => {
    const ids = Array.from(selected);
    const ok = await archiveLogEntries(ids);
    if (ok) {
      setLogEntries((prev: LogEntry[]) => prev.map((e) => (selected.has(e.id) ? { ...e, archived: true } : e)));
    }
    setSelected(new Set());
    setSelectMode(false);
    setToast(`${ids.length} archived`);
    setTimeout(() => setToast(null), 1500);
  };
  const handleBulkDelete = async () => {
    for (const id of selected) {
      await deleteLogEntry(id);
    }
    setLogEntries((prev: LogEntry[]) => prev.filter((e) => !selected.has(e.id)));
    setSelected(new Set());
    setSelectMode(false);
    setToast(`Deleted`);
    setTimeout(() => setToast(null), 1500);
  };

  const [editText, setEditText] = useState("");
  const handleStartEdit = (entry: LogEntry) => {
    setEditingId(entry.id);
    setEditText(entry.content || "");
    setMenuOpen(null);
  };
  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSubmitting(true);
    const ok = await updateLogEntry(editingId, editText.trim());
    if (ok) {
      setLogEntries((prev: LogEntry[]) =>
        prev.map((e) => (e.id === editingId ? { ...e, content: editText.trim() } : e))
      );
      setEditingId(null);
      setEditText("");
    }
    setSubmitting(false);
  };
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };
  const handleDeleteEntry = async (id: string) => {
    await deleteLogEntry(id);
    setLogEntries((prev: LogEntry[]) => prev.filter((e) => e.id !== id));
    setDeleteConfirmId(null);
    setToast("Deleted");
    setTimeout(() => setToast(null), 1500);
  };

  const availableTags = Array.from(new Set(logEntries.filter((e) => !e.archived).flatMap((e) => e.tags || [])))
    .filter(Boolean)
    .sort();

  return (
    <div
      onClick={() => {
        if (menuOpen) setMenuOpen(null);
      }}
    >
      {/* Type pills — always visible, above input */}
      <div style={{ display: "flex", gap: 16, justifyContent: "center", padding: "20px 20px 12px" }}>
        {[
          { label: "Conversation", color: "#C84B31" },
          { label: "Win", color: "#4A5899" },
          { label: "Frustration", color: "#8B3A3A" },
          { label: "Reading", color: "#2D3A3A" },
          { label: "Decision", color: "#B08D2E" },
        ].map((chip) => {
          const isActive = selectedType === chip.label;
          return (
            <button
              key={chip.label}
              onClick={() => {
                setSelectedType(isActive ? null : chip.label);
                setTimeout(() => composeRef.current?.focus(), 0);
              }}
              className="font-sans"
              style={{
                fontSize: 14,
                padding: "6px 14px",
                borderRadius: 20,
                border: isActive ? `1.5px solid ${chip.color}` : "1.5px solid transparent",
                color: isActive ? chip.color : "#888",
                background: "transparent",
                cursor: "pointer",
                transition: "all 0.15s",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: chip.color, flexShrink: 0 }} />
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Compose — centered input card */}
      <div
        id="compose-card"
        className="overflow-hidden transition-colors"
        style={{
          borderRadius: 10,
          border: dragOver ? `2px solid ${BLUE}` : "none",
          background: dragOver ? `${BLUE}04` : "#fff",
          margin: "20px auto 0",
          maxWidth: 640,
          borderLeft: "3px solid #e0ddd5",
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          addImageFiles(Array.from(e.dataTransfer.files));
        }}
      >
        {pendingPreviews.length > 0 && (
          <div className="px-5 pt-3 flex gap-2 flex-wrap">
            {pendingPreviews.map((preview, idx) => (
              <div key={idx} className="relative inline-block">
                <img
                  src={preview}
                  alt=""
                  className="rounded-[8px]"
                  style={{ width: 72, height: 72, objectFit: "cover", border: `1px solid ${BORDER}` }}
                />
                <button
                  onClick={() => removePendingImage(idx)}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: INK, color: "#fff", fontSize: 10, border: "none", cursor: "pointer" }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {/* Type pills moved above compose card */}
        <textarea
          ref={(el) => {
            composeRef.current = el;
            if (el) {
              el.style.height = "auto";
              el.style.height = Math.max(56, el.scrollHeight) + "px";
            }
          }}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={(e) => {
            const items = Array.from(e.clipboardData.items);
            const imageFiles = items
              .filter((it) => it.type.startsWith("image/"))
              .map((it) => it.getAsFile())
              .filter((f): f is File => f !== null);
            if (imageFiles.length > 0) {
              e.preventDefault();
              addImageFiles(imageFiles);
            }
          }}
          placeholder="What happened? A conversation, a win, a frustration, something you read, a decision you made..."
          className="w-full outline-none resize-none font-sans"
          style={{
            fontSize: 15,
            color: INK,
            lineHeight: 1.6,
            padding: "14px 16px 8px",
            border: "none",
            background: "transparent",
            minHeight: 56,
            overflow: "hidden",
          }}
        />
        {attachError && (
          <p className="font-sans text-[12px] px-4 pb-1" style={{ color: "#DC2626" }}>
            {attachError}
          </p>
        )}
        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={handleImageSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-full hover:bg-gray-50"
              style={{
                border: "none",
                background: "transparent",
                cursor: "pointer",
                minWidth: 44,
                minHeight: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke={pendingImages.length > 0 ? BLUE : FAINT}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </button>
          </div>
          <span className="font-mono" style={{ fontSize: 12, color: "#bbb" }}>
            ⌘↵ to log
          </span>
          <span style={{ flex: 1 }} />
          <button
            onClick={handleSubmit}
            disabled={(!input.trim() && pendingImages.length === 0) || submitting}
            className="font-sans font-medium disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              background: "#1a1a1a",
              color: "#fff",
              fontSize: 13,
              fontWeight: 500,
              border: "none",
              cursor: "pointer",
            }}
          >
            {submitting ? "Saving..." : "+ Log it"}
          </button>
        </div>
      </div>

      {error && (
        <p className="font-sans text-[13px]" style={{ color: "#DC2626", padding: "4px 20px 0" }}>
          {error}
        </p>
      )}

      {/* Tag filters */}
      {logEntries.length > 0 && availableTags.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap" style={{ padding: "8px 20px 0" }}>
          <span className="font-mono text-[10px] uppercase" style={{ color: FAINT, letterSpacing: "0.05em" }}>
            Tags:
          </span>
          {availableTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              className="font-mono text-[11px] px-2.5 py-1 rounded-full transition-all"
              style={{
                background: tagFilter === tag ? `${TAG_COLORS[tag] || DIM}20` : "transparent",
                color: TAG_COLORS[tag] || DIM,
                border: tagFilter === tag ? `1px solid ${TAG_COLORS[tag] || DIM}40` : `1px solid ${BORDER}`,
                cursor: "pointer",
              }}
            >
              {tag}
            </button>
          ))}
          {tagFilter && (
            <button
              onClick={() => setTagFilter(null)}
              className="font-sans text-[11px]"
              style={{ color: FAINT, background: "none", border: "none", cursor: "pointer" }}
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Bulk actions bar */}
      {selectMode && (
        <div
          className="flex items-center gap-2 p-3 rounded-[10px]"
          style={{ background: "#fafafa", border: `1px solid ${BORDER}`, margin: "8px 20px 0" }}
        >
          <span className="font-sans text-[13px]" style={{ color: DIM }}>
            {selected.size} selected
          </span>
          <div className="ml-auto flex gap-2">
            {selected.size > 0 && (
              <>
                <button
                  onClick={handleBulkBookmark}
                  className="font-sans text-[12px] px-3 py-1.5 rounded-full"
                  style={{ border: `1px solid ${BORDER}`, color: DIM, background: "#fff", cursor: "pointer" }}
                >
                  Bookmark
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="font-sans text-[12px] px-3 py-1.5 rounded-full"
                  style={{ border: `1px solid #DC2626`, color: "#DC2626", background: "#fff", cursor: "pointer" }}
                >
                  Delete
                </button>
              </>
            )}
            <button
              onClick={() => {
                setSelectMode(false);
                setSelected(new Set());
              }}
              className="font-sans text-[13px]"
              style={{ color: FAINT, background: "none", border: "none", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bento grid feed */}
      <style>{`@media (max-width: 640px) { .bento-log-grid { grid-template-columns: repeat(2, 1fr) !important; } }`}</style>
      <div
        className="bento-log-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 12,
          padding: "8px 40px 20px",
          gridAutoRows: "minmax(140px, auto)",
        }}
      >
        {visibleEntries.length === 0 ? (
          <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px 0" }}>
            <p style={{ fontSize: 18, color: "#6B6860" }}>What happened this week?</p>
            <p style={{ fontSize: 14, color: "#A8A49C", marginTop: 8 }}>Log a thought and turn it into a post.</p>
          </div>
        ) : (
          <>
            {dayGroups.map(({ label: dayLabel, entries: dayEntries }) => (
              <React.Fragment key={dayLabel}>
                <div
                  style={{
                    gridColumn: "1 / -1",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#999",
                    padding: "16px 0 4px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    fontFamily: "monospace",
                  }}
                >
                  <span style={{ whiteSpace: "nowrap" }}>{dayLabel}</span>
                  <span style={{ flex: 1, height: 1, background: "#d5d0c8" }} />
                </div>
                {dayEntries.map((entry) => {
                  const contentLen = (entry.content || "").length;
                  const gridSpan = contentLen > 200 ? "span 3" : contentLen > 80 ? "span 2" : "span 1";
                  const globalIdx = visibleEntries.indexOf(entry);
                  const cardStyle = getCardStyle(entry.content || "", globalIdx);
                  const entryUrl = entry.url || entry.link_url || (entry.content ? detectUrl(entry.content) : null);
                  const used = isUsedInPlan(entry);
                  const isSelected = selected.has(entry.id);
                  return (
                    <div
                      key={entry.id}
                      onClick={selectMode ? () => toggleSelect(entry.id) : undefined}
                      className="relative overflow-hidden"
                      style={{
                        gridColumn: gridSpan,
                        borderRadius: 10,
                        padding: "16px 18px",
                        minHeight: 140,
                        background: isSelected ? `${BLUE}` : cardStyle.bg,
                        color: isSelected ? "#fff" : cardStyle.text,
                        cursor: selectMode ? "pointer" : "default",
                        transition: "transform 0.15s ease",
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                      onMouseEnter={(ev) => {
                        (ev.currentTarget as HTMLElement).style.transform = "scale(0.99)";
                      }}
                      onMouseLeave={(ev) => {
                        (ev.currentTarget as HTMLElement).style.transform = "scale(1)";
                      }}
                    >
                      {/* Menu */}
                      {!selectMode && editingId !== entry.id && (
                        <div className="absolute" style={{ top: 8, right: 4, zIndex: 2 }}>
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setMenuOpen(menuOpen === entry.id ? null : entry.id);
                            }}
                            className="rounded hover:bg-black/5 flex items-center justify-center"
                            style={{ width: 44, height: 44, background: "none", border: "none", cursor: "pointer" }}
                          >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="#999">
                              <circle cx="8" cy="3" r="1.5" />
                              <circle cx="8" cy="8" r="1.5" />
                              <circle cx="8" cy="13" r="1.5" />
                            </svg>
                          </button>
                          {menuOpen === entry.id && (
                            <div
                              className="absolute right-0 sm:right-0 mt-1 rounded-[8px] overflow-hidden"
                              style={{
                                background: "#fff",
                                border: `1px solid ${BORDER}`,
                                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                                zIndex: 10,
                                minWidth: 130,
                                right: 0,
                              }}
                            >
                              <button
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  handleStartEdit(entry);
                                }}
                                className="w-full text-left px-4 py-2.5 font-sans text-[13px] hover:bg-gray-50"
                                style={{ color: INK, border: "none", background: "transparent", cursor: "pointer" }}
                              >
                                Edit
                              </button>
                              <button
                                onClick={async (ev) => {
                                  ev.stopPropagation();
                                  setMenuOpen(null);
                                  onPostNote(entry);
                                }}
                                disabled={postingEntryId === entry.id}
                                className="w-full text-left px-4 py-2.5 font-sans text-[13px] hover:bg-gray-50"
                                style={{
                                  color: "#fff",
                                  background: BLUE,
                                  border: "none",
                                  cursor: postingEntryId === entry.id ? "wait" : "pointer",
                                  borderRadius: 6,
                                  margin: "4px 8px",
                                  width: "calc(100% - 16px)",
                                  fontWeight: 600,
                                }}
                              >
                                {postingEntryId === entry.id ? "Writing..." : "Write"}
                              </button>
                              <button
                                onClick={(ev) => {
                                  ev.stopPropagation();
                                  setDeleteConfirmId(entry.id);
                                  setMenuOpen(null);
                                }}
                                className="w-full text-left px-4 py-2.5 font-sans text-[13px] hover:bg-gray-50"
                                style={{
                                  color: "#DC2626",
                                  border: "none",
                                  background: "transparent",
                                  cursor: "pointer",
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      {/* Delete confirmation */}
                      {deleteConfirmId === entry.id && (
                        <div
                          className="absolute inset-0 rounded-[12px] flex items-center justify-center"
                          style={{ background: "rgba(255,255,255,0.95)", zIndex: 5 }}
                          onClick={(ev) => ev.stopPropagation()}
                        >
                          <div className="text-center">
                            <p className="font-sans text-[14px] mb-3" style={{ color: INK }}>
                              Delete this note?
                            </p>
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="font-sans text-[13px] px-4 py-2 rounded-full"
                                style={{
                                  border: `1px solid ${BORDER}`,
                                  color: DIM,
                                  background: "#fff",
                                  cursor: "pointer",
                                }}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleDeleteEntry(entry.id)}
                                className="font-sans text-[13px] px-4 py-2 rounded-full"
                                style={{ background: "#DC2626", color: "#fff", border: "none", cursor: "pointer" }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      {editingId === entry.id ? (
                        <div onClick={(ev) => ev.stopPropagation()}>
                          <textarea
                            ref={(el) => {
                              if (el) {
                                el.style.height = "auto";
                                el.style.height = Math.max(60, el.scrollHeight) + "px";
                              }
                            }}
                            value={editText}
                            onChange={(ev) => setEditText(ev.target.value)}
                            className="w-full outline-none resize-none font-sans"
                            style={{
                              fontSize: 15,
                              color: INK,
                              lineHeight: 1.6,
                              padding: "8px 10px",
                              border: `1px solid ${BLUE}`,
                              borderRadius: 8,
                              background: "#fafafa",
                              overflow: "hidden",
                            }}
                            autoFocus
                          />
                          <div className="flex gap-2 mt-2 justify-end">
                            <button
                              onClick={handleCancelEdit}
                              className="font-sans text-[13px]"
                              style={{ color: FAINT, background: "none", border: "none", cursor: "pointer" }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleSaveEdit}
                              disabled={submitting}
                              className="font-sans font-semibold rounded-full disabled:opacity-30"
                              style={{
                                fontSize: 13,
                                padding: "6px 16px",
                                background: BLUE,
                                color: "#fff",
                                border: "none",
                                cursor: "pointer",
                              }}
                            >
                              {submitting ? "..." : "Save"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {entry.content && !(entryUrl && entry.content.trim() === entryUrl) && (
                            <p
                              className="font-sans"
                              style={{
                                fontSize: 15,
                                color: "#1a1a1a",
                                lineHeight: 1.6,
                                whiteSpace: "pre-wrap",
                                paddingRight: 28,
                              }}
                            >
                              {entry.content}
                            </p>
                          )}
                        </>
                      )}
                      {(() => {
                        const images =
                          entry.image_urls && entry.image_urls.length > 0
                            ? entry.image_urls
                            : entry.image_url
                              ? [entry.image_url]
                              : [];
                        if (images.length === 0) return null;
                        return (
                          <div className={entry.content ? "mt-3" : ""}>
                            {images.length === 1 ? (
                              <img
                                src={images[0]}
                                alt=""
                                className="w-full rounded-[10px] cursor-pointer hover:opacity-95"
                                style={{
                                  maxHeight: 200,
                                  objectFit: "cover",
                                  border: "1px solid rgba(0,0,0,0.08)",
                                }}
                                onClick={() => setExpandedImage(expandedImage === entry.id ? null : entry.id)}
                              />
                            ) : (
                              <div className="grid gap-2 grid-cols-2">
                                {images.map((url, idx) => (
                                  <img
                                    key={idx}
                                    src={url}
                                    alt=""
                                    className="w-full rounded-[8px] cursor-pointer hover:opacity-95"
                                    style={{
                                      height: 100,
                                      objectFit: "cover",
                                      border: "1px solid rgba(0,0,0,0.08)",
                                    }}
                                    onClick={() => setExpandedImage(expandedImage === url ? null : url)}
                                  />
                                ))}
                              </div>
                            )}
                            {expandedImage === entry.id && images.length === 1 && (
                              <img
                                src={images[0]}
                                alt=""
                                className="w-full rounded-[10px] mt-2"
                                style={{ border: "1px solid rgba(0,0,0,0.08)" }}
                              />
                            )}
                            {expandedImage && expandedImage !== entry.id && images.includes(expandedImage) && (
                              <img
                                src={expandedImage}
                                alt=""
                                className="w-full rounded-[8px] mt-2"
                                style={{ border: "1px solid rgba(0,0,0,0.08)" }}
                              />
                            )}
                          </div>
                        );
                      })()}
                      {(entry.type === "link" || entryUrl) &&
                        entryUrl &&
                        (() => {
                          const og = ogCache[entryUrl];
                          return (
                            <a
                              href={entryUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="no-underline block mt-3 rounded-[10px] overflow-hidden hover:opacity-95 transition-opacity"
                              style={{ border: "1px solid rgba(0,0,0,0.08)" }}
                            >
                              {og?.image && (
                                <img
                                  src={og.image}
                                  alt=""
                                  className="w-full"
                                  style={{ maxHeight: 120, objectFit: "cover" }}
                                />
                              )}
                              <div style={{ padding: "10px 12px" }}>
                                <p
                                  className="font-sans font-semibold"
                                  style={{ fontSize: 13, color: "#1a1a1a", lineHeight: 1.4 }}
                                >
                                  {og?.title || getReadableTitle(entryUrl)}
                                </p>
                                {og?.description && (
                                  <p
                                    className="font-sans mt-1"
                                    style={{
                                      fontSize: 12,
                                      color: "#666",
                                      lineHeight: 1.4,
                                      display: "-webkit-box",
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: "vertical",
                                      overflow: "hidden",
                                    }}
                                  >
                                    {og.description}
                                  </p>
                                )}
                                <span className="font-mono block mt-1" style={{ fontSize: 10, color: "#999" }}>
                                  {getDomain(entryUrl)}
                                </span>
                              </div>
                            </a>
                          );
                        })()}
                      <div
                        style={{
                          fontSize: 10,
                          marginTop: 10,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ color: cardStyle.labelColor, fontWeight: 600 }}>● {cardStyle.label}</span>
                          {entry.tags.map((tag) => (
                            <span
                              key={tag}
                              style={{
                                marginLeft: 4,
                                padding: "1px 6px",
                                borderRadius: 4,
                                background: "rgba(0,0,0,0.06)",
                                color: "#666",
                                fontSize: 10,
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                          {used && (
                            <span
                              style={{
                                marginLeft: 4,
                                padding: "1px 6px",
                                borderRadius: 4,
                                background: "rgba(0,0,0,0.06)",
                                color: "#666",
                                fontSize: 10,
                              }}
                            >
                              Used in Ideas
                            </span>
                          )}
                        </span>
                        <span style={{ color: "#999", fontSize: 10, display: "flex", alignItems: "center", gap: 6 }}>
                          {formatTime(entry.created_at)}
                          {!selectMode && (
                            <button
                              onClick={(ev) => {
                                ev.stopPropagation();
                                handleToggleBookmark(entry.id, entry.bookmarked || false);
                              }}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: 0,
                                color: "#999",
                                fontSize: 14,
                                lineHeight: 1,
                              }}
                            >
                              🔖
                            </button>
                          )}
                        </span>
                      </div>
                      {bookmarkNoteId === entry.id && (
                        <div className="mt-2 flex gap-2 items-center" onClick={(ev) => ev.stopPropagation()}>
                          <input
                            value={bookmarkNote}
                            onChange={(ev) => setBookmarkNote(ev.target.value)}
                            onKeyDown={(ev) => {
                              if (ev.key === "Enter") handleConfirmBookmark();
                            }}
                            placeholder="Why I saved this (optional)"
                            className="flex-1 outline-none font-sans text-[13px]"
                            style={{
                              color: INK,
                              padding: "6px 10px",
                              border: `1px solid ${BORDER}`,
                              borderRadius: 8,
                              background: "#fafafa",
                            }}
                            autoFocus
                          />
                          <button
                            onClick={handleConfirmBookmark}
                            className="font-sans font-semibold rounded-full shrink-0"
                            style={{
                              fontSize: 14,
                              padding: "8px 18px",
                              background: BLUE,
                              color: "#fff",
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setBookmarkNoteId(null)}
                            className="font-sans text-[12px] px-2 py-1.5 shrink-0"
                            style={{ color: FAINT, background: "none", border: "none", cursor: "pointer" }}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 font-sans text-[13px] px-4 py-2.5 rounded-full"
          style={{ background: INK, color: "#fff", animation: "fadeIn 0.2s ease" }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

/* ══════════════ IDEAS TAB ══════════════ */
function IdeasTab({
  profile,
  allPlans,
  weekEntries,
  allEntries,
  initialWeek,
  initialDevelopEntries,
  onPlanGenerated,
  onPlanUpdated,
  onSwitchToLog,
  onWritePost,
  onStartDraft,
  onProfileUpdated,
  onQuickLog,
}: {
  profile: UserProfile;
  allPlans: ContentPlan[];
  weekEntries: LogEntry[];
  allEntries: LogEntry[];
  initialDevelopEntries?: LogEntry[] | null;
  initialWeek?: string;
  onPlanGenerated: (plan: ContentPlan) => void;
  onPlanUpdated: (plan: ContentPlan) => void;
  onSwitchToLog: () => void;
  onWritePost: (planId: string, postIndex: number) => void;
  onStartDraft: (data: { draft: Draft }) => void;
  onProfileUpdated: (fields: Partial<UserProfile>) => void;
  onQuickLog: (text: string) => Promise<void>;
}) {
  // Filter out future weeks — only show weeks where week_start is before next Monday
  const now = new Date();
  const nowDay = now.getDay();
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + (nowDay === 0 ? 1 : 8 - nowDay));
  const nextMondayStr = nextMonday.toISOString().split("T")[0];
  const weeks = Array.from(new Set(allPlans.map((p) => p.week_start)))
    .filter((w) => w < nextMondayStr)
    .sort()
    .reverse();
  const targetWeek = getCurrentWeekMonday(); // display: always this week
  const planTargetWeek = getWeekStart(); // generation: may target next week Thu+
  const hasCurrentPlan = allPlans.some((p) => p.week_start === targetWeek || p.week_start === planTargetWeek);

  const [weekIdx, setWeekIdx] = useState(() => {
    if (initialWeek) {
      const i = weeks.indexOf(initialWeek);
      if (i >= 0) return i;
    }
    // Default to the week containing today
    const todayIdx = weeks.indexOf(targetWeek);
    if (todayIdx >= 0) return todayIdx;
    return 0;
  });
  // Coaching conversation state
  const [coachNotes, setCoachNotes] = useState<LogEntry[]>([]);
  const [coachMessages, setCoachMessages] = useState<CoachingMessage[]>([]);
  const [coachReply, setCoachReply] = useState("");
  const [coachSuggestions, setCoachSuggestions] = useState<CoachingSuggestion[]>([]);
  const [coachLoading, setCoachLoading] = useState(false);
  // Persist coaching session to DB (fire-and-forget)
  const persistSession = (entries: LogEntry[], messages: CoachingMessage[], suggestions: CoachingSuggestion[]) => {
    if (entries.length === 0) return;
    saveCoachingSession(
      entries.map((e) => e.id),
      messages,
      suggestions
    ).catch(() => {});
  };

  // Auto-start coaching if navigated from Log tab
  const autoStartRef = useRef<string | null>(null);
  useEffect(() => {
    if (initialDevelopEntries?.length) {
      const key = initialDevelopEntries.map((e) => e.id).join(",");
      if (autoStartRef.current !== key) {
        autoStartRef.current = key;
        startCoaching(initialDevelopEntries);
      }
    }
  }, [initialDevelopEntries]);

  const coachApiPayload = (entries: LogEntry[]) => {
    const combinedNote = entries
      .map((e) => e.content || "")
      .filter(Boolean)
      .join("\n\n---\n\n");
    const notesList = entries.map((e) => e.content || "").filter(Boolean);
    const recentNotes = allEntries
      .filter((e) => !entries.some((n) => n.id === e.id))
      .map((e) => e.content || "")
      .filter(Boolean)
      .slice(0, 5);
    return { note: combinedNote, notes: notesList, recentNotes, profile };
  };

  const startCoaching = async (entries: LogEntry[]) => {
    setCoachNotes(entries);
    setCoachReply("");
    setCoachLoading(true);
    // Check for existing session first
    try {
      const existing = await getCoachingSession(entries.map((e) => e.id));
      if (existing && existing.messages.length > 0) {
        setCoachMessages(existing.messages);
        setCoachSuggestions(existing.suggestions);
        setCoachLoading(false);
        return;
      }
    } catch {}
    // No existing session — start fresh
    setCoachMessages([]);
    setCoachSuggestions([]);
    try {
      const res = await fetch("/api/coach-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...coachApiPayload(entries), step: "question" }),
      });
      const data = await res.json();
      console.log("coach-note question response:", res.status, data);
      if (res.ok && data.response) {
        const msgs: CoachingMessage[] = [{ role: "ai", text: data.response }];
        setCoachMessages(msgs);
        persistSession(entries, msgs, []);
      } else {
        // API failed — show fallback question so the conversation isn't dead
        const fallback: CoachingMessage[] = [
          {
            role: "ai",
            text: "What happened here that made you want to share it? What was the moment that stuck with you?",
          },
        ];
        setCoachMessages(fallback);
      }
    } catch (err) {
      console.error("coach-note question error:", err);
      const fallback: CoachingMessage[] = [
        {
          role: "ai",
          text: "What happened here that made you want to share it? What was the moment that stuck with you?",
        },
      ];
      setCoachMessages(fallback);
    }
    setCoachLoading(false);
  };

  const submitCoachReply = async () => {
    if (!coachReply.trim() || coachNotes.length === 0) return;
    const reply = coachReply.trim();
    const updatedMessages: CoachingMessage[] = [...coachMessages, { role: "user", text: reply }];
    setCoachMessages(updatedMessages);
    setCoachReply("");
    setCoachLoading(true);
    // Count user replies — force suggest on 3rd reply
    const userReplyCount = updatedMessages.filter((m) => m.role === "user").length;
    const forceAngles = userReplyCount >= 3;
    try {
      const res = await fetch("/api/coach-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...coachApiPayload(coachNotes),
          step: forceAngles ? "suggest" : "respond",
          conversation: updatedMessages,
        }),
      });
      const data = await res.json();
      console.log("coach-note respond:", res.status, data);
      if (res.ok && data.type === "followup" && data.response) {
        const newMsgs: CoachingMessage[] = [...updatedMessages, { role: "ai", text: data.response }];
        setCoachMessages(newMsgs);
        persistSession(coachNotes, newMsgs, coachSuggestions);
      } else if (res.ok && (data.type === "suggest" || forceAngles) && data.structured) {
        const newSuggestions = [...coachSuggestions, data.structured];
        setCoachSuggestions(newSuggestions);
        persistSession(coachNotes, updatedMessages, newSuggestions);
      } else {
        // API failed — add fallback so conversation isn't dead
        const newMsgs: CoachingMessage[] = [
          ...updatedMessages,
          {
            role: "ai",
            text: "I couldn't process that — try telling me more about what happened and what surprised you.",
          },
        ];
        setCoachMessages(newMsgs);
      }
    } catch (err) {
      console.error("coach-note respond error:", err);
      const newMsgs: CoachingMessage[] = [
        ...updatedMessages,
        { role: "ai", text: "Something went wrong on my end. Try replying again." },
      ];
      setCoachMessages(newMsgs);
    }
    setCoachLoading(false);
  };

  const getAnotherAngle = async () => {
    if (coachSuggestions.length >= 3 || coachNotes.length === 0) return;
    setCoachLoading(true);
    try {
      const res = await fetch("/api/coach-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...coachApiPayload(coachNotes),
          step: "suggest",
          conversation: coachMessages,
          previousAngles: coachSuggestions.map((s) => s.hook),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.structured) {
          const newSuggestions = [...coachSuggestions, data.structured];
          setCoachSuggestions(newSuggestions);
          persistSession(coachNotes, coachMessages, newSuggestions);
        }
      }
    } catch {}
    setCoachLoading(false);
  };
  const [generating, setGenerating] = useState(false);
  const [showQueued, setShowQueued] = useState(false);

  useEffect(() => {
    if (initialWeek) {
      const i = weeks.indexOf(initialWeek);
      if (i >= 0) {
        setWeekIdx(i);
      }
    }
  }, [initialWeek]);

  // Determine if current plan uses new theme format
  const currentPlan = allPlans.find((p) => p.week_start === targetWeek || p.week_start === planTargetWeek);
  const isThemePlan = currentPlan?.plan && "themes" in currentPlan.plan;
  const themePlan = isThemePlan ? (currentPlan!.plan as unknown as WeeklyThemes) : null;

  // Past picked themes for continuity
  const pastPickedThemes = allPlans
    .filter((p) => p.plan && "themes" in p.plan && (p.plan as unknown as WeeklyThemes).picked_theme_index !== null)
    .map((p) => {
      const wt = p.plan as unknown as WeeklyThemes;
      return wt.themes[wt.picked_theme_index!]?.tension;
    })
    .filter(Boolean);

  const FORMAT_LABELS: Record<string, string> = {
    story: "Story",
    lesson: "Lesson",
    framework: "Framework",
    "contrarian-take": "Contrarian take",
  };

  const generateThemes = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/generate-themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          entries: weekEntries,
          pastThemes: pastPickedThemes,
        }),
      });
      const data = await res.json();
      if (data.themes?.length) {
        const themesData: WeeklyThemes = {
          themes: data.themes,
          picked_theme_index: null,
          context: data.context || "",
        };
        if (currentPlan) {
          // Replace existing plan
          const updated = await updatePlanPosts(currentPlan.id, themesData as unknown as ContentPlanData);
          if (updated) onPlanUpdated(updated);
        } else {
          // Create new plan
          const dump = await createWeeklyDump("");
          if (dump) {
            const plan = await saveThemePlan(dump.id, themesData);
            if (plan) onPlanGenerated(plan);
          }
        }
      }
    } catch (err) {
      console.error("Theme generation failed:", err);
    } finally {
      setGenerating(false);
    }
  };

  // --- Theme-based rendering below ---

  // Generate view (either no plan exists, or user clicked Regenerate)
  // Coaching conversation view
  if (coachNotes.length > 0) {
    const lastMessage = coachMessages[coachMessages.length - 1];
    const waitingForReply = lastMessage?.role === "ai" && coachSuggestions.length === 0;
    return (
      <div>
        <button
          onClick={() => {
            setCoachNotes([]);
            setCoachMessages([]);
            setCoachSuggestions([]);
            setCoachReply("");
          }}
          className="font-mono text-[12px] mb-6"
          style={{ color: DIM, background: "none", border: "none", cursor: "pointer" }}
        >
          <ArrowLeft size={12} /> Back to Ideas
        </button>

        {/* Source notes */}
        <div className="p-4 rounded-[12px] mb-6" style={{ background: "#fafafa", border: `1px solid ${BORDER}` }}>
          <span
            className="font-mono uppercase block mb-2"
            style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}
          >
            {coachNotes.length === 1 ? "Your note" : `Your ${coachNotes.length} notes`}
          </span>
          {coachNotes.map((n, i) => (
            <div key={n.id}>
              {i > 0 && <hr className="my-3" style={{ border: "none", borderTop: `1px solid ${BORDER}` }} />}
              <p className="font-sans" style={{ fontSize: 15, color: INK, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {n.content}
              </p>
            </div>
          ))}
        </div>

        {/* Conversation turns */}
        {coachMessages.map((msg, i) => (
          <div key={i} className="flex items-start gap-3 mb-6">
            {msg.role === "ai" ? (
              <>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: BLUE, color: "#fff", fontSize: 14, fontWeight: 600 }}
                >
                  A
                </div>
                <div
                  className="p-4 rounded-[12px] flex-1"
                  style={{ background: `${BLUE}06`, border: `1px solid ${BLUE}15` }}
                >
                  <p className="font-sans" style={{ fontSize: 15, color: INK, lineHeight: 1.6 }}>
                    {msg.text}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "#e5e7eb", color: DIM, fontSize: 14, fontWeight: 600 }}
                >
                  Y
                </div>
                <div
                  className="p-4 rounded-[12px] flex-1"
                  style={{ background: "#fff", border: `1px solid ${BORDER}` }}
                >
                  <p className="font-sans" style={{ fontSize: 15, color: BODY, lineHeight: 1.6 }}>
                    {msg.text}
                  </p>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {coachLoading && coachSuggestions.length === 0 && (
          <div className="flex items-start gap-3 mb-6">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: BLUE, color: "#fff", fontSize: 14, fontWeight: 600 }}
            >
              A
            </div>
            <div
              className="p-3 rounded-[10px] animate-pulse"
              style={{ background: "#f0f0f0", width: 200, height: 20 }}
            />
          </div>
        )}

        {/* Reply input */}
        {waitingForReply && !coachLoading && (
          <div className="flex items-start gap-3 mb-6">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "#e5e7eb", color: DIM, fontSize: 14, fontWeight: 600 }}
            >
              Y
            </div>
            <div className="flex-1">
              <textarea
                value={coachReply}
                onChange={(e) => setCoachReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && coachReply.trim()) {
                    e.preventDefault();
                    submitCoachReply();
                  }
                }}
                placeholder="Your answer..."
                className="w-full outline-none resize-none font-sans rounded-[12px]"
                style={{
                  fontSize: 15,
                  color: INK,
                  lineHeight: 1.6,
                  padding: "12px 16px",
                  border: `1px solid ${BORDER}`,
                  background: "#fff",
                  minHeight: 80,
                }}
                autoFocus
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={submitCoachReply}
                  disabled={!coachReply.trim() || coachLoading}
                  className="px-5 py-2.5 rounded-full font-sans font-semibold text-[14px] disabled:opacity-30"
                  style={{ background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}
                >
                  Reply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Story angle suggestions */}
        {coachSuggestions.length > 0 && (
          <>
            {coachSuggestions.map((suggestion, i) => (
              <div key={i} className="flex items-start gap-3 mb-4">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: BLUE, color: "#fff", fontSize: 14, fontWeight: 600 }}
                >
                  A
                </div>
                <div
                  className="p-5 rounded-[12px] flex-1"
                  style={{ background: `${BLUE}06`, border: `1px solid ${BLUE}15` }}
                >
                  <span
                    className="font-mono uppercase block mb-2"
                    style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}
                  >
                    Story angle{coachSuggestions.length > 1 ? ` ${i + 1}` : ""}
                  </span>
                  <p className="font-serif mb-3" style={{ fontSize: 17, color: INK, lineHeight: 1.5, fontWeight: 500 }}>
                    {suggestion.hook}
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="font-mono text-[11px] px-2 py-0.5 rounded capitalize"
                      style={{ background: `${BLUE}10`, color: BLUE }}
                    >
                      {suggestion.type}
                    </span>
                    <span className="font-sans text-[13px]" style={{ color: FAINT }}>
                      {suggestion.platform}
                    </span>
                  </div>
                  <p className="font-sans" style={{ fontSize: 14, color: BODY, lineHeight: 1.5 }}>
                    {suggestion.why}
                  </p>
                  <button
                    onClick={async () => {
                      // Persist session before navigating away
                      await saveCoachingSession(
                        coachNotes.map((n) => n.id),
                        coachMessages,
                        coachSuggestions
                      );
                      const sourceNote = coachNotes
                        .map((n) => n.content || "")
                        .filter(Boolean)
                        .join("\n\n");
                      const content = suggestion.hook + "\n\n";
                      const d = await createStandaloneDraft(content, sourceNote, coachNotes[0]?.id || "");
                      if (d) onStartDraft({ draft: d });
                    }}
                    className="mt-4 px-5 py-2.5 rounded-full font-sans font-semibold text-[14px]"
                    style={{ background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}
                  >
                    Write this <ArrowRight size={12} color="#fff" />
                  </button>
                </div>
              </div>
            ))}

            {/* Show another angle */}
            {coachSuggestions.length < 3 && !coachLoading && (
              <div className="flex justify-center mb-4">
                <button
                  onClick={getAnotherAngle}
                  className="font-sans text-[14px] font-semibold"
                  style={{ color: BLUE, background: "none", border: "none", cursor: "pointer" }}
                >
                  Show another angle
                </button>
              </div>
            )}
            {coachLoading && coachSuggestions.length > 0 && (
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: BLUE, color: "#fff", fontSize: 14, fontWeight: 600 }}
                >
                  A
                </div>
                <div
                  className="p-3 rounded-[10px] animate-pulse"
                  style={{ background: "#f0f0f0", width: 200, height: 20 }}
                />
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // State 1: No plan for this week
  if (!hasCurrentPlan) {
    const weekLogCount = weekEntries.length;
    return (
      <div style={{ padding: "60px 24px", textAlign: "center", maxWidth: 520, margin: "0 auto" }}>
        <h2 className="font-serif" style={{ fontSize: 28, fontWeight: 600, color: INK, marginBottom: 12 }}>
          What&apos;s your story this week?
        </h2>
        <p className="font-sans" style={{ fontSize: 16, color: DIM, marginBottom: 32, lineHeight: 1.6 }}>
          {weekLogCount > 0
            ? `You logged ${weekLogCount} moment${weekLogCount === 1 ? "" : "s"} this week.`
            : "No logs yet — that\u2019s fine. We\u2019ll work with what we know about your voice."}
        </p>
        <button
          onClick={generateThemes}
          disabled={generating}
          className="px-8 py-4 rounded-full font-sans font-semibold text-[16px]"
          style={{
            background: BLUE,
            color: "#fff",
            border: "none",
            cursor: generating ? "wait" : "pointer",
            opacity: generating ? 0.6 : 1,
          }}
        >
          {generating ? "Thinking..." : "Show me 3 themes"}
        </button>
        {generating && (
          <div className="mt-6 space-y-3 animate-pulse">
            {[1, 2, 3].map((i) => (
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

  // Old plan format — show read-only with upgrade option
  if (hasCurrentPlan && !isThemePlan) {
    return (
      <div style={{ padding: "32px 24px", maxWidth: 640, margin: "0 auto" }}>
        <p className="font-sans text-[15px]" style={{ color: DIM }}>
          This week has a plan from an earlier version. Switch to the new format?
        </p>
        <button
          onClick={generateThemes}
          disabled={generating}
          className="mt-4 px-6 py-3 rounded-full font-sans font-semibold text-[14px]"
          style={{ background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}
        >
          {generating ? "Generating..." : "Generate themes instead"}
        </button>
      </div>
    );
  }

  // State 2: Themes shown, none picked yet
  if (isThemePlan && themePlan && themePlan.picked_theme_index === null) {
    return (
      <div style={{ padding: "32px 24px", maxWidth: 640, margin: "0 auto" }}>
        {/* Context line */}
        {themePlan.context && (
          <p className="font-sans text-[14px] mb-6" style={{ color: DIM, lineHeight: 1.5 }}>
            {themePlan.context}
          </p>
        )}

        {/* Theme cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {themePlan.themes.map((theme, i) => (
            <div
              key={i}
              style={{
                background: "#fff",
                border: `1px solid ${BORDER}`,
                borderRadius: 14,
                padding: "24px 28px",
              }}
            >
              <p
                className="font-sans"
                style={{ fontSize: 18, fontWeight: 700, color: INK, lineHeight: 1.4, marginBottom: 8 }}
              >
                {theme.tension}
              </p>
              <p className="font-sans text-[14px]" style={{ color: DIM, lineHeight: 1.5, marginBottom: 16 }}>
                {theme.why_now}
              </p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span
                  className="font-mono text-[11px] uppercase"
                  style={{
                    color: BLUE,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    background: `${BLUE}10`,
                    padding: "4px 10px",
                    borderRadius: 6,
                  }}
                >
                  {FORMAT_LABELS[theme.format] || theme.format}
                </span>
                <button
                  onClick={async () => {
                    const updated = await updateThemePick(currentPlan!.id, i);
                    if (updated) onPlanUpdated(updated);
                  }}
                  className="font-sans text-[14px] font-semibold"
                  style={{
                    background: BLUE,
                    color: "#fff",
                    border: "none",
                    borderRadius: 20,
                    padding: "8px 20px",
                    cursor: "pointer",
                  }}
                >
                  Write about this
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Regenerate */}
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button
            onClick={generateThemes}
            disabled={generating}
            className="font-sans text-[13px]"
            style={{ background: "none", border: "none", color: DIM, cursor: "pointer" }}
          >
            {generating ? "Regenerating..." : "Regenerate themes"}
          </button>
        </div>
      </div>
    );
  }

  // State 3: Theme picked
  if (isThemePlan && themePlan && themePlan.picked_theme_index !== null) {
    const picked = themePlan.themes[themePlan.picked_theme_index];
    const queuedThemes = themePlan.themes.filter((_, i) => i !== themePlan.picked_theme_index);

    return (
      <div style={{ padding: "32px 24px", maxWidth: 640, margin: "0 auto" }}>
        {/* Picked theme */}
        <div
          style={{
            background: `${BLUE}08`,
            border: `2px solid ${BLUE}30`,
            borderRadius: 14,
            padding: "24px 28px",
            marginBottom: 24,
          }}
        >
          <p
            className="font-mono text-[11px] uppercase mb-2"
            style={{ color: BLUE, fontWeight: 600, letterSpacing: "0.04em" }}
          >
            This week&apos;s theme
          </p>
          <p
            className="font-sans"
            style={{ fontSize: 20, fontWeight: 700, color: INK, lineHeight: 1.4, marginBottom: 8 }}
          >
            {picked.tension}
          </p>
          <p className="font-sans text-[14px]" style={{ color: DIM, lineHeight: 1.5 }}>
            {picked.why_now}
          </p>
        </div>

        {/* Change theme link */}
        <button
          onClick={async () => {
            const themesData: WeeklyThemes = {
              ...themePlan,
              picked_theme_index: null,
              themes: themePlan.themes.map((t) => ({ ...t, queued: false })),
            };
            const updated = await updatePlanPosts(currentPlan!.id, themesData as unknown as ContentPlanData);
            if (updated) onPlanUpdated(updated);
          }}
          className="font-sans text-[13px] mb-8 block"
          style={{ background: "none", border: "none", color: DIM, cursor: "pointer" }}
        >
          &larr; Change theme
        </button>

        {/* Write CTA */}
        <button
          onClick={async () => {
            const d = await createStandaloneDraft("", picked.tension, picked.source_entry_id || "");
            if (d) onStartDraft({ draft: d });
          }}
          className="w-full py-3.5 rounded-full font-sans font-semibold text-[15px] mb-6"
          style={{ background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}
        >
          Start writing
        </button>

        {/* Saved for later */}
        {queuedThemes.length > 0 && (
          <div>
            <button
              onClick={() => setShowQueued(!showQueued)}
              className="font-mono text-[11px] uppercase flex items-center gap-1"
              style={{
                color: FAINT,
                background: "none",
                border: "none",
                cursor: "pointer",
                letterSpacing: "0.05em",
                fontWeight: 500,
              }}
            >
              Saved for later ({queuedThemes.length}){" "}
              <span
                style={{
                  fontSize: 10,
                  transition: "transform 0.2s",
                  transform: showQueued ? "rotate(0)" : "rotate(-90deg)",
                }}
              >
                &#9660;
              </span>
            </button>
            {showQueued && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                {queuedThemes.map((theme, i) => (
                  <div
                    key={i}
                    style={{
                      background: "#f9fafb",
                      border: `1px solid ${BORDER}`,
                      borderRadius: 10,
                      padding: "16px 20px",
                    }}
                  >
                    <p className="font-sans text-[15px]" style={{ color: INK, fontWeight: 600, lineHeight: 1.4 }}>
                      {theme.tension}
                    </p>
                    <p className="font-sans text-[13px] mt-1" style={{ color: FAINT }}>
                      {FORMAT_LABELS[theme.format] || theme.format}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Fallback — should not normally reach here
  return (
    <div style={{ padding: "60px 24px", textAlign: "center" }}>
      <p className="font-sans" style={{ fontSize: 15, color: FAINT }}>
        Something went wrong loading your themes.
      </p>
    </div>
  );
}

/* ══════════════ DRAFTS TAB ══════════════ */
const PUBLISH_PLATFORMS = ["LinkedIn", "X", "Threads", "Substack", "Other"];

function DraftsTab({
  drafts,
  allPlans,
  onOpenDraft,
  onOpenStandaloneDraft,
  onOpenPlaybookDraft,
  onDraftsUpdated,
}: {
  drafts: Draft[];
  allPlans: ContentPlan[];
  onOpenDraft: (planId: string, postIndex: number) => void;
  onOpenStandaloneDraft: (draft: Draft) => void;
  onOpenPlaybookDraft: (draft: Draft, playbook: Playbook) => void;
  onDraftsUpdated: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "drafts" | "published">("all");
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [pubPlatform, setPubPlatform] = useState("LinkedIn");
  const [pubUrl, setPubUrl] = useState("");

  const draftsWithContext = drafts
    .filter((d) => d.content.trim())
    .map((d) => {
      let prompt = "";
      let platform = "";
      if (d.plan_id) {
        const plan = allPlans.find((p) => p.id === d.plan_id);
        const planData = plan
          ? ((typeof plan.plan === "string" ? JSON.parse(plan.plan) : plan.plan) as ContentPlanData)
          : null;
        const post = planData?.posts?.[d.post_index ?? 0];
        prompt = post?.prompt || post?.key_takeaway || post?.hook || "";
        platform = post?.platform || "";
      } else {
        prompt = d.source_note
          ? `From your note: "${d.source_note.slice(0, 80)}${d.source_note.length > 80 ? "..." : ""}"`
          : "Standalone draft";
      }
      const wordCount = d.content.trim().split(/\s+/).length;
      return { ...d, prompt, platform, wordCount };
    });

  const filtered = draftsWithContext.filter((d) => {
    if (filter === "drafts") return !d.published;
    if (filter === "published") return d.published;
    return true;
  });

  const handlePublish = async (draftId: string) => {
    const result = await markAsPublished(draftId, pubPlatform, pubUrl.trim() || undefined);
    if (result) {
      posthog.capture("marked_published", { platform: pubPlatform, has_url: !!pubUrl.trim() });
      onDraftsUpdated();
    }
    setPublishingId(null);
    setPubPlatform("LinkedIn");
    setPubUrl("");
  };

  const FILTERS: { key: typeof filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "drafts", label: "Drafts" },
    { key: "published", label: "Published" },
  ];

  // Find most common playbook
  const playbookCounts: Record<string, number> = {};
  for (const d of draftsWithContext) {
    if (d.playbook_id) {
      playbookCounts[d.playbook_id] = (playbookCounts[d.playbook_id] || 0) + 1;
    }
  }
  const topPlaybookId = Object.entries(playbookCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topPlaybook = topPlaybookId ? getPlaybook(topPlaybookId) : null;

  return (
    <div>
      {/* History title */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>
          History
        </h2>
        <p style={{ fontSize: 14, color: "#999", marginTop: 6 }}>
          {draftsWithContext.length} draft{draftsWithContext.length !== 1 ? "s" : ""}
          {topPlaybook ? ` · You write a lot of ${topPlaybook.name} posts.` : ""}
        </p>
      </div>
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="font-sans text-[12px] px-3 py-1.5 rounded-full transition-all"
            style={{
              background: filter === f.key ? `${BLUE}10` : "transparent",
              color: filter === f.key ? BLUE : FAINT,
              border: filter === f.key ? `1px solid ${BLUE}20` : `1px solid ${BORDER}`,
              cursor: "pointer",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-sans" style={{ fontSize: 15, color: FAINT }}>
            {filter === "all" ? 'No drafts yet. Tap "Write this" on any idea to start.' : `No ${filter} yet.`}
          </p>
        </div>
      ) : (
        <div>
          {filtered.map((d, dIdx) => (
            <div key={d.id} style={{ padding: "16px 0", borderTop: dIdx > 0 ? "1px solid #e0e0e0" : "none" }}>
              <div
                className="cursor-pointer"
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
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  {d.playbook_id &&
                    (() => {
                      const pb = getPlaybook(d.playbook_id);
                      return (
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: 10,
                            padding: "3px 8px",
                            borderRadius: 4,
                            background: pb?.color || "#141414",
                            color: "#fff",
                            fontFamily: "Georgia, serif",
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                            marginTop: 2,
                          }}
                        >
                          {pb?.name || d.playbook_id}
                        </span>
                      );
                    })()}
                  <p
                    className="font-sans"
                    style={{
                      fontSize: 15,
                      color: BODY,
                      lineHeight: 1.6,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      margin: 0,
                    }}
                  >
                    {d.content}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap" style={{ paddingLeft: d.playbook_id ? 0 : 0 }}>
                <span className="font-mono" style={{ fontSize: 11, color: FAINT }}>
                  {getDayLabel(d.updated_at)} · {d.wordCount} words
                </span>
                {d.published ? (
                  <>
                    <span
                      className="font-mono text-[11px] px-2 py-0.5 rounded-full"
                      style={{ background: "#22c55e15", color: "#16a34a" }}
                    >
                      Published
                    </span>
                    {d.published_platform && (
                      <span className="font-mono text-[11px]" style={{ color: FAINT }}>
                        on {d.published_platform}
                      </span>
                    )}
                    {d.published_url && (
                      <a
                        href={d.published_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="no-underline font-mono text-[11px]"
                        style={{ color: BLUE }}
                      >
                        View post <ArrowRight size={10} />
                      </a>
                    )}
                  </>
                ) : (
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: 10,
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: "#FFF3CD",
                      color: "#856404",
                    }}
                  >
                    Draft
                  </span>
                )}
              </div>
              {/* Publish action */}
              {!d.published && publishingId !== d.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPublishingId(d.id);
                  }}
                  className="mt-3 font-sans text-[13px]"
                  style={{ color: FAINT, background: "none", border: "none", cursor: "pointer" }}
                >
                  Mark as published
                </button>
              )}
              {publishingId === d.id && (
                <div
                  className="mt-3 p-4 rounded-[10px] space-y-3"
                  style={{ background: "#fafafa", border: `1px solid ${BORDER}` }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div>
                    <span
                      className="font-mono uppercase block mb-2"
                      style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}
                    >
                      Where did you post this?
                    </span>
                    <div className="flex gap-2 flex-wrap">
                      {PUBLISH_PLATFORMS.map((p) => (
                        <button
                          key={p}
                          onClick={() => setPubPlatform(p)}
                          className="font-sans text-[12px] px-3 py-1.5 rounded-full transition-all"
                          style={{
                            background: pubPlatform === p ? `${BLUE}10` : "#fff",
                            color: pubPlatform === p ? BLUE : DIM,
                            border: `1px solid ${pubPlatform === p ? BLUE + "30" : BORDER}`,
                            cursor: "pointer",
                          }}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    value={pubUrl}
                    onChange={(e) => setPubUrl(e.target.value)}
                    placeholder="Paste link (optional)"
                    className="w-full outline-none font-sans text-[13px]"
                    style={{
                      color: INK,
                      padding: "8px 12px",
                      border: `1px solid ${BORDER}`,
                      borderRadius: 8,
                      background: "#fff",
                    }}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePublish(d.id)}
                      className="font-sans font-semibold rounded-full"
                      style={{
                        fontSize: 13,
                        padding: "8px 18px",
                        background: BLUE,
                        color: "#fff",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Mark as published
                    </button>
                    <button
                      onClick={() => setPublishingId(null)}
                      className="font-sans text-[13px]"
                      style={{ color: FAINT, background: "none", border: "none", cursor: "pointer" }}
                    >
                      Cancel
                    </button>
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

function WriteMode({
  planId,
  postIndex,
  post,
  onBack,
  onSaveDone,
}: {
  planId: string;
  postIndex: number;
  post: ContentPlanPost;
  onBack: () => void;
  onSaveDone: () => void;
}) {
  const [content, setContent] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showStructure, setShowStructure] = useState(true);
  const [showNote, setShowNote] = useState(true);
  const [coaching, setCoaching] = useState<CoachFeedback | null>(null);
  const [coachLoading, setCoachLoading] = useState(false);
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const autoSaveInterval = useRef<NodeJS.Timeout | null>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const lastSavedRef = useRef("");

  useEffect(() => {
    getDraft(planId, postIndex).then((d) => {
      if (d) {
        setContent(d.content);
        lastSavedRef.current = d.content;
      }
      setLoaded(true);
    });
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
    return () => {
      if (autoSaveInterval.current) clearInterval(autoSaveInterval.current);
    };
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
    setSaving(true);
    setSaveError(null);
    const result = await saveDraft(planId, postIndex, content);
    lastSavedRef.current = content;
    setSaving(false);
    if (result) {
      posthog.capture("draft_saved", { source: "idea", word_count: content.trim().split(/\s+/).length });
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft: content.trim(),
          key_takeaway: post.prompt || post.key_takeaway || post.hook,
          structure: post.structure,
          platform: post.platform,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCoaching(data);
        setTimeout(() => feedbackRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } catch {}
    setCoachLoading(false);
  };

  const handleSaveWithSuggestions = async () => {
    if (!coaching) return;
    let updated = content;
    coaching.phrases_to_improve.forEach((p, i) => {
      if (accepted.has(i) && p.original && p.suggestion) updated = updated.replace(p.original, p.suggestion);
    });
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

  if (!loaded)
    return (
      <div className="py-12 text-center">
        <span className="font-sans text-[14px]" style={{ color: FAINT }}>
          Loading...
        </span>
      </div>
    );

  const hasStructure = post.structure && post.structure.length > 0;
  const displayText = post.prompt || post.key_takeaway || post.hook || "";
  const rawSnippet = post.source_snippet || "";
  const sourceNote = rawSnippet.length > 5 && !/^[\s\-\[\]]*$/.test(rawSnippet) ? rawSnippet : "";

  return (
    <div className="min-h-screen" style={{ background: "#F5F0E8" }}>
      <div className="max-w-[640px] mx-auto px-5 py-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="font-mono text-[12px]"
            style={{ color: DIM, background: "none", border: "none", cursor: "pointer" }}
          >
            <ArrowLeft size={12} /> Back to plan
          </button>
          <span className="font-mono text-[11px]" style={{ color: saving ? BLUE : saveError ? "#DC2626" : FAINT }}>
            {saving ? "Saving..." : saveError ? "Save failed" : "Saved"}
          </span>
        </div>

        <p className="font-serif font-semibold mb-4" style={{ fontSize: 18, color: INK }}>
          {displayText}
        </p>

        {sourceNote && (
          <div className="mb-6">
            <button
              onClick={() => setShowNote(!showNote)}
              className="font-mono text-[11px] uppercase mb-2 flex items-center gap-1"
              style={{
                color: FAINT,
                background: "none",
                border: "none",
                cursor: "pointer",
                letterSpacing: "0.05em",
                fontWeight: 500,
              }}
            >
              Your note{" "}
              <span
                style={{
                  fontSize: 10,
                  transition: "transform 0.2s",
                  transform: showNote ? "rotate(0)" : "rotate(-90deg)",
                }}
              >
                ▼
              </span>
            </button>
            {showNote && (
              <div className="p-4 rounded-[10px]" style={{ background: "#f9fafb", border: `1px solid ${BORDER}` }}>
                <p className="font-sans" style={{ fontSize: 15, color: BODY, lineHeight: 1.6, fontStyle: "italic" }}>
                  {sourceNote}
                </p>
              </div>
            )}
          </div>
        )}

        {hasStructure && (
          <div className="mb-6">
            <button
              onClick={() => setShowStructure(!showStructure)}
              className="font-mono text-[11px] uppercase mb-2 flex items-center gap-1"
              style={{
                color: FAINT,
                background: "none",
                border: "none",
                cursor: "pointer",
                letterSpacing: "0.05em",
                fontWeight: 500,
              }}
            >
              Structure{" "}
              <span
                style={{
                  fontSize: 10,
                  transition: "transform 0.2s",
                  transform: showStructure ? "rotate(0)" : "rotate(-90deg)",
                }}
              >
                ▼
              </span>
            </button>
            {showStructure && (
              <div
                className="p-4 rounded-[10px] space-y-2"
                style={{ background: "#f9fafb", border: `1px solid ${BORDER}` }}
              >
                {(post.structure || []).map((step: string, j: number) => (
                  <p key={j} className="font-sans text-[13px]" style={{ color: DIM, lineHeight: 1.5 }}>
                    <span className="font-mono text-[11px] mr-2" style={{ color: BLUE }}>
                      {j + 1}.
                    </span>
                    {step}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        <textarea
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Start writing..."
          className="w-full outline-none resize-y font-sans"
          style={{
            fontSize: 16,
            color: INK,
            lineHeight: 1.8,
            padding: 0,
            border: "none",
            background: "transparent",
            minHeight: "40vh",
          }}
          autoFocus
        />

        {/* Action buttons */}
        {content.trim().length > 20 && !coaching && (
          <div className="mt-6 space-y-3">
            <button
              onClick={handleCheckWriting}
              disabled={coachLoading}
              className="w-full py-3.5 rounded-full font-sans font-semibold text-[15px] disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}
            >
              {coachLoading ? "Checking..." : "Check my writing"}
            </button>
            <button
              onClick={handleExplicitSave}
              className="w-full py-3 rounded-full font-sans font-semibold text-[14px]"
              style={{ background: "transparent", color: FAINT, border: `1.5px solid ${BORDER}`, cursor: "pointer" }}
            >
              Save draft
            </button>
            {saveError && (
              <p className="font-sans text-[13px] mt-2" style={{ color: "#DC2626" }}>
                {saveError}
              </p>
            )}
          </div>
        )}

        {/* Coaching feedback */}
        {coaching && (
          <div ref={feedbackRef} className="mt-8 space-y-5">
            <div className="p-4 rounded-[10px]" style={{ background: "#fafafa", border: `1px solid ${BORDER}` }}>
              <span
                className="font-mono uppercase block mb-2"
                style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}
              >
                Overall
              </span>
              <p className="font-sans" style={{ fontSize: 16, color: INK, lineHeight: 1.6 }}>
                {coaching.overall}
              </p>
            </div>

            {coaching.structure_feedback && (
              <div className="p-4 rounded-[10px]" style={{ background: "#fafafa", border: `1px solid ${BORDER}` }}>
                <span
                  className="font-mono uppercase block mb-2"
                  style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}
                >
                  Structure
                </span>
                <p className="font-sans" style={{ fontSize: 16, color: INK, lineHeight: 1.6 }}>
                  {coaching.structure_feedback}
                </p>
              </div>
            )}

            {coaching.phrases_to_improve.length > 0 && (
              <div className="space-y-3">
                <span
                  className="font-mono uppercase block"
                  style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}
                >
                  Suggestions
                </span>
                {coaching.phrases_to_improve.map((p, i) => {
                  const isAccepted = accepted.has(i);
                  return (
                    <div
                      key={i}
                      className="p-4 rounded-[10px]"
                      style={{
                        border: `1px solid ${isAccepted ? BLUE : BORDER}`,
                        background: isAccepted ? `${BLUE}04` : "#fff",
                      }}
                    >
                      <p className="font-sans font-semibold" style={{ fontSize: 16, color: INK }}>
                        {p.suggestion}
                      </p>
                      <p className="font-sans mt-1.5" style={{ fontSize: 14, color: FAINT }}>
                        Original: {p.original}
                      </p>
                      <p className="font-mono text-[11px] mt-1" style={{ color: FAINT }}>
                        {p.reason}
                      </p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() =>
                            setAccepted((prev) => {
                              const s = new Set(prev);
                              s.add(i);
                              return s;
                            })
                          }
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full font-sans text-[12px]"
                          style={{
                            background: isAccepted ? BLUE : "#fff",
                            color: isAccepted ? "#fff" : DIM,
                            border: `1px solid ${isAccepted ? BLUE : BORDER}`,
                            cursor: "pointer",
                          }}
                        >
                          ✓ Accept
                        </button>
                        <button
                          onClick={() =>
                            setAccepted((prev) => {
                              const s = new Set(prev);
                              s.delete(i);
                              return s;
                            })
                          }
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full font-sans text-[12px]"
                          style={{ background: "#fff", color: FAINT, border: `1px solid ${BORDER}`, cursor: "pointer" }}
                        >
                          ✕ Skip
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {coaching.micro_lesson && (
              <div className="p-4 rounded-[10px]" style={{ borderLeft: `3px solid ${BLUE}`, background: `${BLUE}04` }}>
                <span
                  className="font-mono uppercase block mb-1"
                  style={{ fontSize: 10, letterSpacing: "0.06em", color: BLUE }}
                >
                  Lesson
                </span>
                <p className="font-serif mb-2" style={{ fontSize: 16, fontWeight: 600, color: INK }}>
                  {coaching.micro_lesson.title}
                </p>
                <p className="font-sans text-[14px]" style={{ color: DIM, lineHeight: 1.6 }}>
                  {coaching.micro_lesson.explanation}
                </p>
              </div>
            )}

            {/* Post-feedback actions */}
            <div className="space-y-3 pt-2 pb-8">
              <button
                onClick={handleSaveWithSuggestions}
                className="w-full py-3.5 rounded-full font-sans font-semibold text-[15px] transition-transform hover:scale-[1.01] hover:-translate-y-px"
                style={{ background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}
              >
                {accepted.size > 0
                  ? `Save with ${accepted.size} suggestion${accepted.size > 1 ? "s" : ""}`
                  : "Save as-is"}
              </button>
              <button
                onClick={handleKeepOriginal}
                className="w-full font-sans text-[14px]"
                style={{ color: FAINT, background: "none", border: "none", cursor: "pointer", padding: "10px 0" }}
              >
                Dismiss feedback
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════ STANDALONE WRITE MODE ══════════════ */
function StandaloneWriteMode({
  draft,
  sourceImages,
  profile,
  onBack,
  onSaveDone,
}: {
  draft: Draft;
  sourceImages?: string[];
  profile: UserProfile | null;
  onBack: () => void;
  onSaveDone: () => void;
}) {
  const [content, setContent] = useState(draft.content);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [showNote, setShowNote] = useState(true);
  const [showEdits, setShowEdits] = useState(false);
  const [annotations, setAnnotations] = useState<
    { phrase: string; dimension: string; explanation: string; alternative: string }[]
  >([]);
  const [activeAnnotation, setActiveAnnotation] = useState<number | null>(null);
  const [loadingEdits, setLoadingEdits] = useState(false);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef(draft.content);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (content.trim() && content !== lastSavedRef.current) {
        setSaving(true);
        await saveDraftById(draft.id, content);
        lastSavedRef.current = content;
        setSaving(false);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [content, draft.id]);

  // Fetch inline annotations on demand when "Show edits" is toggled
  async function fetchAnnotations() {
    if (annotations.length > 0 || loadingEdits || !profile?.voice_profile) return;
    setLoadingEdits(true);
    const vp = profile.voice_profile as VoiceProfile;
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

  const handleChange = (val: string) => {
    setContent(val);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      setSaving(true);
      await saveDraftById(draft.id, val);
      lastSavedRef.current = val;
      setSaving(false);
    }, 1000);
  };

  const handleExplicitSave = async () => {
    setSaving(true);
    setSaveError(null);
    const result = await saveDraftById(draft.id, content);
    lastSavedRef.current = content;
    setSaving(false);
    if (result) {
      posthog.capture("draft_saved", { source: "standalone", word_count: content.trim().split(/\s+/).length });
      onSaveDone();
    } else setSaveError("Failed to save.");
  };

  function applyAnnotation(index: number) {
    const note = annotations[index];
    if (!note) return;
    const updated = content.replace(note.phrase, note.alternative);
    setContent(updated);
    setAnnotations((prev) => prev.filter((_, i) => i !== index));
    setActiveAnnotation(null);
    // Auto-save
    saveDraftById(draft.id, updated);
    lastSavedRef.current = updated;
  }

  return (
    <div className="min-h-screen" style={{ background: "#F5F0E8" }}>
      <div className="max-w-[640px] mx-auto px-5 py-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="font-mono text-[12px]"
            style={{ color: DIM, background: "none", border: "none", cursor: "pointer" }}
          >
            <ArrowLeft size={12} /> Back
          </button>
          <div className="flex items-center gap-3">
            {draft.source_entry_id && profile?.voice_profile && (
              <button
                onClick={async () => {
                  if (!draft.source_note) return;
                  setRegenerating(true);
                  const businessContext = [profile.business_description].filter(Boolean).join(" ");
                  try {
                    const res = await fetch("/api/generate-draft", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        entryContent: draft.source_note,
                        voiceProfile: profile.voice_profile,
                        businessContext,
                        platform: profile.platforms?.[0] || "linkedin",
                      }),
                    });
                    if (!res.ok) throw new Error("Generate failed");
                    const text = await res.text();
                    await saveDraftById(draft.id, text);
                    setContent(text);
                    lastSavedRef.current = text;
                    posthog.capture("draft_regenerated", { draft_id: draft.id });
                  } catch (err) {
                    console.error("Regenerate failed:", err);
                  } finally {
                    setRegenerating(false);
                  }
                }}
                disabled={regenerating}
                style={{
                  background: "transparent",
                  border: `1.5px solid ${FAINT}`,
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 13,
                  color: DIM,
                  cursor: regenerating ? "wait" : "pointer",
                  fontWeight: 600,
                }}
              >
                {regenerating ? "Regenerating..." : "Regenerate"}
              </button>
            )}
            {draft.source_entry_id && profile?.voice_profile && (
              <button
                onClick={() => {
                  const next = !showEdits;
                  setShowEdits(next);
                  if (next) fetchAnnotations();
                  if (!next) setActiveAnnotation(null);
                }}
                disabled={loadingEdits}
                style={{
                  background: showEdits ? `${BLUE}10` : "transparent",
                  border: `1.5px solid ${showEdits ? BLUE : FAINT}`,
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 13,
                  color: showEdits ? BLUE : DIM,
                  cursor: loadingEdits ? "wait" : "pointer",
                  fontWeight: 600,
                }}
              >
                {loadingEdits ? "Loading..." : showEdits ? "Hide edits" : "Show edits"}
              </button>
            )}
            <span className="font-mono text-[11px]" style={{ color: saving ? BLUE : saveError ? "#DC2626" : FAINT }}>
              {saving ? "Saving..." : saveError ? "Save failed" : "Saved"}
            </span>
          </div>
        </div>

        {/* Voice profile indicator */}
        {draft.source_entry_id && profile?.voice_profile && (
          <p className="font-mono text-[12px] mb-4" style={{ color: FAINT }}>
            Written in your voice &middot;{" "}
            <span style={{ color: DIM }}>{(profile.voice_profile as VoiceProfile).top_traits?.join(". ")}.</span>
          </p>
        )}

        {/* Playbook origin tag */}
        {draft.playbook_id &&
          (() => {
            const pb = getPlaybook(draft.playbook_id);
            return pb ? (
              <div className="flex items-center gap-2 mb-4">
                <span
                  style={{
                    display: "inline-block",
                    fontFamily: "Georgia, serif",
                    fontSize: 12,
                    fontWeight: 600,
                    background: pb.color,
                    color: pb.textColor,
                    padding: "4px 12px",
                    borderRadius: 20,
                  }}
                >
                  {pb.name}
                </span>
                <span className="font-mono text-[11px]" style={{ color: FAINT }}>
                  Developed from your playbook
                </span>
              </div>
            ) : null;
          })()}

        {draft.source_note && (
          <div className="mb-6">
            <button
              onClick={() => setShowNote(!showNote)}
              className="font-mono text-[11px] uppercase mb-2 flex items-center gap-1"
              style={{
                color: FAINT,
                background: "none",
                border: "none",
                cursor: "pointer",
                letterSpacing: "0.05em",
                fontWeight: 500,
              }}
            >
              Your note{" "}
              <span
                style={{
                  fontSize: 10,
                  transition: "transform 0.2s",
                  transform: showNote ? "rotate(0)" : "rotate(-90deg)",
                }}
              >
                ▼
              </span>
            </button>
            {showNote && (
              <div className="p-4 rounded-[10px]" style={{ background: "#f9fafb", border: `1px solid ${BORDER}` }}>
                <p
                  className="font-sans"
                  style={{
                    fontSize: 15,
                    color: BODY,
                    lineHeight: 1.6,
                    fontStyle: "italic",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}
                >
                  {draft.source_note}
                </p>
              </div>
            )}
          </div>
        )}

        {sourceImages && sourceImages.length > 0 && (
          <div className="mb-6">
            <span
              className="font-mono text-[11px] uppercase block mb-2"
              style={{ color: FAINT, letterSpacing: "0.05em", fontWeight: 500 }}
            >
              Reference images
            </span>
            <div
              className={sourceImages.length === 1 ? "" : "grid gap-2"}
              style={sourceImages.length > 1 ? { gridTemplateColumns: "1fr 1fr" } : {}}
            >
              {sourceImages.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt=""
                  className="w-full rounded-[10px]"
                  style={{
                    maxHeight: sourceImages.length === 1 ? 300 : 180,
                    objectFit: "cover",
                    border: `1px solid ${BORDER}`,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Draft content — textarea when edits off, annotated view when on */}
        {showEdits && annotations.length > 0 ? (
          <div
            className="font-sans"
            style={{
              fontSize: 16,
              color: INK,
              lineHeight: 1.8,
              minHeight: "40vh",
              position: "relative",
            }}
          >
            {(() => {
              // Build segments: split content by annotation phrases
              let remaining = content;
              const segments: { text: string; annotationIndex?: number }[] = [];
              const sortedAnnotations = annotations
                .map((a, i) => ({ ...a, originalIndex: i }))
                .filter((a) => remaining.includes(a.phrase))
                .sort((a, b) => remaining.indexOf(a.phrase) - remaining.indexOf(b.phrase));

              for (const ann of sortedAnnotations) {
                const idx = remaining.indexOf(ann.phrase);
                if (idx === -1) continue;
                if (idx > 0) segments.push({ text: remaining.slice(0, idx) });
                segments.push({ text: ann.phrase, annotationIndex: ann.originalIndex });
                remaining = remaining.slice(idx + ann.phrase.length);
              }
              if (remaining) segments.push({ text: remaining });

              return segments.map((seg, i) =>
                seg.annotationIndex !== undefined ? (
                  <span key={i} style={{ position: "relative", display: "inline" }}>
                    <span
                      onClick={() =>
                        setActiveAnnotation(activeAnnotation === seg.annotationIndex ? null : seg.annotationIndex!)
                      }
                      style={{
                        background: activeAnnotation === seg.annotationIndex ? `${BLUE}20` : `${BLUE}10`,
                        borderBottom: `2px solid ${BLUE}60`,
                        cursor: "pointer",
                        borderRadius: 2,
                        padding: "0 2px",
                        transition: "background 0.15s",
                      }}
                    >
                      {seg.text}
                    </span>
                    {activeAnnotation === seg.annotationIndex && (
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: "100%",
                          marginTop: 8,
                          width: 360,
                          background: "#fff",
                          border: `1px solid ${BORDER}`,
                          borderRadius: 12,
                          padding: "16px 20px",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                          zIndex: 50,
                        }}
                      >
                        <p
                          className="font-mono text-[11px] uppercase"
                          style={{ color: BLUE, fontWeight: 600, marginBottom: 8 }}
                        >
                          {annotations[seg.annotationIndex!].dimension}
                        </p>
                        <p className="font-sans text-[13px]" style={{ color: INK, lineHeight: 1.5, marginBottom: 10 }}>
                          {annotations[seg.annotationIndex!].explanation}
                        </p>
                        <p
                          className="font-sans text-[13px]"
                          style={{
                            color: DIM,
                            lineHeight: 1.5,
                            fontStyle: "italic",
                            marginBottom: 14,
                            padding: "8px 12px",
                            background: "#f9fafb",
                            borderRadius: 8,
                          }}
                        >
                          {annotations[seg.annotationIndex!].alternative}
                        </p>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => applyAnnotation(seg.annotationIndex!)}
                            className="font-sans text-[13px] font-semibold"
                            style={{
                              background: BLUE,
                              color: "#fff",
                              border: "none",
                              borderRadius: 8,
                              padding: "6px 16px",
                              cursor: "pointer",
                            }}
                          >
                            Apply
                          </button>
                          <button
                            onClick={() => setActiveAnnotation(null)}
                            className="font-sans text-[13px]"
                            style={{
                              background: "transparent",
                              border: `1px solid ${BORDER}`,
                              borderRadius: 8,
                              padding: "6px 16px",
                              color: DIM,
                              cursor: "pointer",
                            }}
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    )}
                  </span>
                ) : (
                  <span key={i} style={{ whiteSpace: "pre-wrap" }}>
                    {seg.text}
                  </span>
                )
              );
            })()}
          </div>
        ) : (
          <textarea
            ref={(el) => {
              if (el) {
                el.style.height = "auto";
                el.style.height = Math.max(200, el.scrollHeight) + "px";
              }
            }}
            value={content}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="Start writing..."
            className="w-full outline-none resize-none font-sans"
            style={{
              fontSize: 16,
              color: INK,
              lineHeight: 1.8,
              padding: 0,
              border: "none",
              background: "transparent",
              minHeight: "40vh",
              overflow: "hidden",
            }}
            autoFocus
          />
        )}

        {content.trim().length > 20 && (
          <div className="mt-6 space-y-3">
            <button
              onClick={handleExplicitSave}
              className="w-full py-3 rounded-full font-sans font-semibold text-[14px]"
              style={{ background: "transparent", color: FAINT, border: `1.5px solid ${BORDER}`, cursor: "pointer" }}
            >
              Save draft
            </button>
            {saveError && (
              <p className="font-sans text-[13px]" style={{ color: "#DC2626" }}>
                {saveError}
              </p>
            )}
          </div>
        )}

        {/* Coaching feedback removed — replaced by inline annotations */}
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
  const [tab, setTabRaw] = useState<Tab>(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "") as Tab;
      if (["log", "playbooks", "history"].includes(hash)) return hash;
    }
    return "log";
  });
  const setTab = (t: Tab) => {
    setTabRaw(t);
    if (typeof window !== "undefined") {
      window.history.pushState({ tab: t }, "", `#${t}`);
    }
  };

  // Handle browser back/forward
  useEffect(() => {
    const handlePop = (e: PopStateEvent) => {
      const hash = window.location.hash.replace("#", "") as Tab;
      if (["log", "playbooks", "history"].includes(hash)) setTabRaw(hash);
      else setTabRaw("log");
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);
  // ideasWeek removed — Ideas tab no longer exists
  const [writeMode, setWriteMode] = useState<{ planId: string; postIndex: number } | null>(null);
  const [standaloneDraft, setStandaloneDraft] = useState<{ draft: Draft; images?: string[] } | null>(null);
  const [activePlaybook, setActivePlaybook] = useState<{ playbook: Playbook; draft?: Draft } | null>(null);
  const [developEntries, setDevelopEntries] = useState<LogEntry[] | null>(null);
  const [tooltipStep, setTooltipStep] = useState<number | null>(null);
  const [postingEntryId, setPostingEntryId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [p, plan, dumps, plans, entries, draftsList] = await Promise.all([
        getProfile(),
        getCurrentPlan(),
        getAllDumps(),
        getAllPlans(),
        getLogEntries(),
        getAllDrafts(),
      ]);
      // If entries are empty but profile exists, retry once (auth session may not be ready)
      let finalEntries = entries;
      if (finalEntries.length === 0 && p) {
        await new Promise((r) => setTimeout(r, 500));
        finalEntries = await getLogEntries();
      }
      setProfile(p);
      setCurrentPlan(plan);
      setAllDumps(dumps);
      setAllPlans(plans);
      setLogEntries(finalEntries);
      setDrafts(draftsList);
      // plan loaded — stay on log tab
      if (p && !p.tooltip_seen && finalEntries.length === 0 && !plan) setTooltipStep(1);

      // Check for ?develop=<entryId> param (from onboarding payoff)
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const developId = params.get("develop");
        if (developId) {
          let entry = finalEntries.find((e) => e.id === developId);
          // Entry may not be available yet — retry once
          if (!entry) {
            await new Promise((r) => setTimeout(r, 1000));
            const retried = await getLogEntries();
            if (retried.length > finalEntries.length) {
              finalEntries = retried;
              setLogEntries(retried);
            }
            entry = retried.find((e) => e.id === developId);
          }
          if (entry) {
            setDevelopEntries([entry]);
          }
        }
      }

      setLoading(false);
    }
    load();

    // Refetch when auth session changes (login, token refresh)
    const supabase = createSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) load();
    });
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const nowDate = new Date();
  const nowDay = nowDate.getDay();
  const nowDiff = nowDay === 0 ? 6 : nowDay - 1;
  const mondayDate = new Date(nowDate);
  mondayDate.setDate(nowDate.getDate() - nowDiff);
  mondayDate.setHours(0, 0, 0, 0);
  const weekEntries = logEntriesState.filter((e) => new Date(e.created_at) >= mondayDate);

  const handlePlanGenerated = (plan: ContentPlan) => {
    setCurrentPlan(plan);
    setAllPlans((prev) => [plan, ...prev]);
  };

  async function handlePostNote(entry: LogEntry) {
    if (!profile?.voice_profile) {
      // No voice profile — prompt user to complete exercise
      if (confirm("Take 60 seconds to discover your voice first?")) {
        window.location.href = "/voice";
      }
      return;
    }

    // Set loading state
    setPostingEntryId(entry.id);

    // Business context is optional — voice profile alone is enough
    const businessContext = [profile.business_description].filter(Boolean).join(" ");

    try {
      const res = await fetch("/api/generate-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryContent: entry.content,
          voiceProfile: profile.voice_profile,
          businessContext,
          platform: profile.platforms?.[0] || "linkedin",
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      const text = await res.text();

      const draft = await createStandaloneDraft(text, entry.content || "", entry.id);

      if (draft) {
        posthog.capture("note_written", {
          entry_id: entry.id,
          platform: profile.platforms?.[0] || "linkedin",
        });
        // Refresh drafts and open draft editor
        const allDrafts = await getAllDrafts();
        setDrafts(allDrafts);
        setStandaloneDraft({ draft });
      }
    } catch (err) {
      console.error("Post failed:", err);
    } finally {
      setPostingEntryId(null);
    }
  }

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
        onDevelop={(d) => {
          setActivePlaybook(null);
          setStandaloneDraft({ draft: d });
          getAllDrafts().then(setDrafts);
        }}
      />
    );
  }

  // Standalone write mode (from note → draft)
  if (standaloneDraft) {
    return (
      <StandaloneWriteMode
        draft={standaloneDraft.draft}
        sourceImages={standaloneDraft.images}
        profile={profile}
        onBack={() => setStandaloneDraft(null)}
        onSaveDone={() => {
          setStandaloneDraft(null);
          setTab("history");
          getAllDrafts().then(setDrafts);
        }}
      />
    );
  }

  // Write mode (from plan idea)
  if (writeMode) {
    const plan = allPlans.find((p) => p.id === writeMode.planId);
    if (plan) {
      const planData: ContentPlanData = typeof plan.plan === "string" ? JSON.parse(plan.plan) : plan.plan;
      const post = planData.posts[writeMode.postIndex];
      if (post)
        return (
          <WriteMode
            planId={writeMode.planId}
            postIndex={writeMode.postIndex}
            post={post}
            onBack={() => setWriteMode(null)}
            onSaveDone={() => {
              setWriteMode(null);
              setTab("history");
              getAllDrafts().then(setDrafts);
            }}
          />
        );
    }
    setWriteMode(null);
  }

  if (loading)
    return (
      <div className="min-h-screen" style={{ background: "#F5F0E8" }}>
        <header
          style={{ position: "sticky", top: 0, background: "#F5F0E8", zIndex: 10, borderBottom: "0.5px solid #e0ddd5" }}
        >
          <div style={{ display: "flex", alignItems: "center", padding: "12px 20px" }}>
            <span style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 600, color: "#1a1a1a" }}>
              accent
            </span>
          </div>
        </header>
        <div style={{ padding: "20px" }} className="animate-pulse">
          <div className="h-7 rounded w-48 mb-4" style={{ background: "#f0f0f0" }} />
          <div className="h-44 rounded-[10px]" style={{ background: "#fafafa" }} />
        </div>
      </div>
    );

  const TABS: { key: Tab; label: string }[] = [
    { key: "log", label: "Log" },
    { key: "playbooks", label: "Playbooks" },
    { key: "history", label: "History" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#F5F0E8" }}>
      <header
        style={{ position: "sticky", top: 0, background: "#F5F0E8", zIndex: 10, borderBottom: "0.5px solid #e0ddd5" }}
      >
        <div style={{ display: "flex", alignItems: "center", padding: "12px 20px", gap: 4 }}>
          <Link
            href="/"
            className="no-underline"
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 18,
              fontWeight: 600,
              fontStyle: "italic",
              color: "#1a1a1a",
              marginRight: 16,
            }}
          >
            accent
          </Link>
          {TABS.map((t) => (
            <button
              key={t.key}
              id={`tab-${t.key}`}
              onClick={() => setTab(t.key)}
              className="font-sans"
              style={{
                fontSize: 14,
                fontWeight: tab === t.key ? 500 : 400,
                color: tab === t.key ? "#fff" : "#999",
                background: tab === t.key ? "#1a1a1a" : "none",
                border: "none",
                borderRadius: 6,
                padding: "6px 14px",
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>
      <div
        className={`pb-12 ${tab === "history" ? "max-w-[640px]" : ""}`}
        style={tab === "history" ? { padding: 20 } : undefined}
      >
        {tab === "log" && (
          <LogTab
            logEntries={logEntriesState}
            setLogEntries={setLogEntries}
            allPlans={allPlans}
            onStartDraft={(data) => setStandaloneDraft(data)}
            onPostNote={handlePostNote}
            postingEntryId={postingEntryId}
            profile={profile}
          />
        )}
        {tab === "playbooks" && (
          <div>
            {/* Playbooks title */}
            <div style={{ padding: "24px 20px 8px" }}>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 700, color: "#1a1a1a", margin: 0 }}>
                Playbooks
              </h2>
              <p style={{ fontSize: 16, color: "#999", marginTop: 6, lineHeight: 1.5 }}>
                {PLAYBOOKS.length} proven structures. Pick a vibe, fill in your thinking, publish.
              </p>
            </div>
            {/* Bento grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 8,
                padding: "8px 20px 20px",
              }}
            >
              {PLAYBOOKS.map((playbook, playbookIdx) => {
                const isWide = playbook.gridSpan?.includes("span 2");
                const isHero = playbook.gridSpan === "span 2 / span 2";
                return (
                  <button
                    key={playbook.id}
                    onClick={() => setActivePlaybook({ playbook })}
                    style={{
                      gridColumn: playbook.gridSpan?.split(" / ")[0] || "span 1",
                      gridRow: playbook.gridSpan?.split(" / ")[1] || "span 1",
                      background: playbook.color,
                      color: playbook.textColor,
                      border: "none",
                      borderRadius: 10,
                      padding: "16px 18px",
                      minHeight: isHero ? 280 : 140,
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                      position: "relative",
                      overflow: "hidden",
                      transition: "transform 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = "scale(0.99)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                    }}
                    onMouseDown={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = "scale(0.97)";
                    }}
                    onMouseUp={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = "scale(0.99)";
                    }}
                  >
                    {/* Card number */}
                    <span
                      style={{
                        position: "absolute",
                        top: 14,
                        left: 16,
                        fontSize: 11,
                        fontFamily: "monospace",
                        color: playbook.textColor === "#1a1a1a" ? "rgba(0,0,0,0.25)" : "rgba(255,255,255,0.3)",
                        zIndex: 1,
                      }}
                    >
                      {String(playbookIdx + 1).padStart(2, "0")}
                    </span>
                    {/* Decorative graphic element */}
                    {playbook.id === "contrarian-flip" && (
                      <div style={{ position: "absolute", top: 16, right: 16, opacity: 0.06 }}>
                        {[80, 56, 32].map((s) => (
                          <div
                            key={s}
                            style={{
                              width: s,
                              height: s,
                              border: `1.5px solid ${playbook.textColor}`,
                              borderRadius: "50%",
                              position: "absolute",
                              top: (80 - s) / 2,
                              right: (80 - s) / 2,
                            }}
                          />
                        ))}
                      </div>
                    )}
                    {playbook.id === "story-to-lesson" && (
                      <div style={{ position: "absolute", top: 18, left: 20 }}>
                        {[60, 44, 28].map((w, i) => (
                          <div
                            key={i}
                            style={{
                              width: w,
                              height: 2,
                              background: playbook.textColor,
                              opacity: 0.12 - i * 0.03,
                              marginBottom: 6,
                              borderRadius: 1,
                            }}
                          />
                        ))}
                      </div>
                    )}
                    {playbook.id === "origin-story" && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.22))",
                          borderRadius: 12,
                          pointerEvents: "none",
                        }}
                      />
                    )}
                    <p
                      style={{
                        fontFamily: "Georgia, serif",
                        fontSize: isHero ? 24 : isWide ? 18 : playbook.category === "email" ? 14 : 15,
                        fontWeight: 600,
                        lineHeight: 1.15,
                        margin: 0,
                        marginBottom: playbook.description && isWide ? 5 : 4,
                        position: "relative",
                        zIndex: 1,
                      }}
                    >
                      {playbook.name}
                    </p>
                    {playbook.description && isWide && (
                      <p
                        style={{
                          fontSize: 12,
                          color: playbook.textColor === "#1a1a1a" ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.5)",
                          lineHeight: 1.4,
                          margin: "5px 0 0",
                          position: "relative",
                          zIndex: 1,
                        }}
                      >
                        {playbook.description}
                      </p>
                    )}
                    <p
                      style={{
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: playbook.textColor === "#1a1a1a" ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.35)",
                        margin: "4px 0 0",
                        position: "relative",
                        zIndex: 1,
                      }}
                    >
                      {`${playbook.sections.length} sections · ~${playbook.estimateWords} words`}
                    </p>
                    {isHero && (
                      <p
                        style={{
                          fontSize: 12,
                          color: playbook.textColor === "#1a1a1a" ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.45)",
                          margin: "8px 0 0",
                          position: "relative",
                          zIndex: 1,
                        }}
                      >
                        Open &gt;
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Mobile grid override */}
            <style>{`
              @media (max-width: 640px) {
                [style*="grid-template-columns: repeat(4"] {
                  grid-template-columns: repeat(2, 1fr) !important;
                }
              }
            `}</style>
          </div>
        )}
        {tab === "history" && (
          <DraftsTab
            drafts={draftsState}
            allPlans={allPlans}
            onOpenDraft={(pid, pi) => setWriteMode({ planId: pid, postIndex: pi })}
            onOpenStandaloneDraft={(d) => setStandaloneDraft({ draft: d })}
            onOpenPlaybookDraft={(d, pb) => setActivePlaybook({ playbook: pb, draft: d })}
            onDraftsUpdated={() => getAllDrafts().then(setDrafts)}
          />
        )}
      </div>

      {/* Onboarding tooltip */}
      {tooltipStep !== null && (
        <OnboardingTooltip
          step={tooltipStep}
          onNext={() => {
            if (tooltipStep < 3) setTooltipStep(tooltipStep + 1);
            else {
              setTooltipStep(null);
              upsertProfile({ tooltip_seen: true });
            }
          }}
          onDismiss={() => {
            setTooltipStep(null);
            upsertProfile({ tooltip_seen: true });
          }}
        />
      )}
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
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [step, current.target]);

  if (!pos) return null;

  return (
    <>
      <div onClick={onDismiss} className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.15)" }} />
      <div
        className="fixed z-50"
        style={{
          top: pos.top,
          left: Math.min(Math.max(pos.left, 160), window.innerWidth - 160),
          transform: "translateX(-50%)",
        }}
      >
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderBottom: "8px solid #111827",
            margin: "0 auto",
          }}
        />
        <div className="rounded-[10px] px-4 py-3" style={{ background: "#111827", minWidth: 240, maxWidth: 300 }}>
          <p className="font-sans text-[14px] mb-3" style={{ color: "#fff", lineHeight: 1.5 }}>
            {current.text}
          </p>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px]" style={{ color: "#6b7280" }}>
              {step}/3
            </span>
            <button
              onClick={onNext}
              className="font-sans text-[13px] font-semibold px-3 py-1 rounded-full"
              style={{ background: "#3B82F6", color: "#fff", border: "none", cursor: "pointer" }}
            >
              {step < 3 ? (
                <>
                  Next <ArrowRight size={11} color="#fff" />
                </>
              ) : (
                "Got it"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
