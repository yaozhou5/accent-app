"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { getProfile, upsertProfile, type UserProfile } from "@/lib/supabase/profiles";
import type { VoiceProfile } from "@/lib/voice-dimensions";
import {
  getCurrentPlan,
  getAllPlans,
  type ContentPlan,
  type ContentPlanData,
  type ContentPlanPost,
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
  finalizeDraftEdit,
  createStandaloneDraft,
  getAllDrafts,
  markAsPublished,
  deleteDraft,
  type Draft,
} from "@/lib/supabase/drafts";
import { ArrowRight, ArrowLeft } from "@/components/ArrowIcon";
import { PLAYBOOKS, getPlaybook, type Playbook } from "@/lib/playbooks";
import PlaybookEditor from "@/components/PlaybookEditor";
import VoiceCoach, { type CoachResult } from "@/components/VoiceCoach";
import DraftFormatModal, {
  FORMATS,
  type DraftFormat,
  ERROR_MESSAGES,
  DEFAULT_ERROR_MESSAGE,
} from "@/components/DraftFormatModal";
import UrlTakePrompt from "@/components/UrlTakePrompt";
import VoiceLearningCard from "@/components/VoiceLearningCard";
import VoiceIdentityCard from "@/components/VoiceIdentityCard";
import { getVoiceLearningData, type VoiceLearningData } from "@/lib/supabase/voice-learning";

// Design tokens
const INK = "#111827"; // gray-900
const BODY = "#4b5563"; // gray-600 — body text, log entries
const DIM = "#6b7280"; // gray-500 — inactive tabs
const FAINT = "#9ca3af"; // gray-400 — labels, timestamps
const BLUE = "#1a1a1a"; // primary action — dark, no blue in Accent UI
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

// A note that's nothing but a bare link has no "raw thinking" to draft
// from — same check LogTab already uses to auto-tag an entry as type "link".
function getUrlOnlyLink(content: string): string | null {
  const trimmed = content.trim();
  const detected = detectUrl(trimmed);
  return detected && trimmed === detected ? detected : null;
}

type Tab = "log" | "playbooks" | "history" | "voice-profile";
const TYPE_CARD_STYLES: Record<string, { bg: string; text: string; label: string; labelColor: string; dot: string }> = {
  note: { bg: "#D8EDE1", text: "#1E4030", label: "Note", labelColor: "#1E4030", dot: "#3D6B4A" },
  link: { bg: "#E0E4F5", text: "#252E6B", label: "Link", labelColor: "#252E6B", dot: "#3D4B8F" },
  quote: { bg: "#F4EAC8", text: "#6B4D0A", label: "Quote", labelColor: "#6B4D0A", dot: "#9B7213" },
};
function getCardStyle(entry: LogEntry): { bg: string; text: string; label: string; labelColor: string; dot: string } {
  return TYPE_CARD_STYLES[entry.type] || TYPE_CARD_STYLES.note;
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
  onPostNote: (
    entry: LogEntry,
    options?: { format?: DraftFormat; focus?: string }
  ) => Promise<{ ok: true } | { ok: false; reason: string }>;
  postingEntryId: string | null;
  profile: UserProfile | null;
}) {
  const [formatPickerEntry, setFormatPickerEntry] = useState<LogEntry | null>(null);
  const [urlTakeEntry, setUrlTakeEntry] = useState<LogEntry | null>(null);
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
  const [expandedContent, setExpandedContent] = useState<Set<string>>(new Set());
  const [overflowingIds, setOverflowingIds] = useState<Set<string>>(new Set());
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

  // Setup card state (first-time users without content_topic)
  const showSetup = logEntries.length === 0 && profile && !profile.content_topic;
  const [setupDismissed, setSetupDismissed] = useState(false);
  const [setupTopic, setSetupTopic] = useState("");
  const [setupAudience, setSetupAudience] = useState<string[]>([]);
  const [setupSaving, setSetupSaving] = useState(false);

  // Voice quiz prompt (dismissible banner for users who never completed the quiz)
  const showVoicePrompt = !!profile && !profile.voice_profile;
  const [voicePromptDismissed, setVoicePromptDismissed] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("voice_quiz_prompt_dismissed") === "1";
    return false;
  });
  const voicePromptShownRef = useRef(false);
  useEffect(() => {
    if (showVoicePrompt && !voicePromptDismissed && !voicePromptShownRef.current) {
      voicePromptShownRef.current = true;
      try {
        posthog.capture("voice_quiz_prompt_shown");
      } catch {}
    }
  }, [showVoicePrompt, voicePromptDismissed]);
  const dismissVoicePrompt = () => {
    try {
      localStorage.setItem("voice_quiz_prompt_dismissed", "1");
    } catch {}
    setVoicePromptDismissed(true);
    try {
      posthog.capture("voice_quiz_prompt_dismissed");
    } catch {}
  };

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

  // Shared by "+ Log it" and "Edit my draft ->" — both log the note the same
  // way; they only differ in what happens after.
  const logInput = async (): Promise<LogEntry | null> => {
    if ((!input.trim() && pendingImages.length === 0) || submitting) return null;
    setSubmitting(true);
    setError(null);
    let result: LogEntry | null = null;
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
        result = entry;
      } else setError("Failed to save.");
    } catch (e: unknown) {
      setError(`Failed: ${e instanceof Error ? e.message : "Unknown error"}`);
    }
    setSubmitting(false);
    return result;
  };

  const handleSubmit = async () => {
    await logInput();
  };

  // Logs the note like normal, then opens the editor with the user's own
  // text as the draft — no AI generation, no voice transformation.
  const handleEditMyDraft = async () => {
    const entry = await logInput();
    if (!entry) return;
    const draft = await createStandaloneDraft(entry.content, entry.content, entry.id);
    if (draft) {
      try {
        posthog.capture("edit_my_draft_started", { entry_id: entry.id });
      } catch {}
      onStartDraft({ draft });
    }
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
      {/* First-time setup card — hides header and composer */}
      {showSetup && !setupDismissed ? (
        <div
          style={{
            maxWidth: 620,
            margin: "0 auto 16px",
            padding: "24px 28px",
            background: "#F0ECE4",
            border: "1px solid #e0ddd5",
          }}
        >
          <h3
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: 18,
              fontWeight: 600,
              color: "#1a1a1a",
              margin: "0 0 16px",
            }}
          >
            One more thing before you start.
          </h3>

          {/* Topic input */}
          <label
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: FAINT,
              fontWeight: 600,
              display: "block",
              marginBottom: 6,
            }}
          >
            What are you building?
          </label>
          <input
            value={setupTopic}
            onChange={(e) => setSetupTopic(e.target.value)}
            placeholder="e.g. a pet memorial brand, an AI health tool, a design studio"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 16,
              width: "100%",
              padding: "12px 14px",
              border: "1px solid #e0ddd5",
              background: "#fff",
              color: "#1a1a1a",
              outline: "none",
              boxSizing: "border-box",
              marginBottom: 20,
            }}
          />

          {/* Audience select */}
          <label
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: FAINT,
              fontWeight: 600,
              display: "block",
              marginBottom: 8,
            }}
          >
            Who should hear about it?
          </label>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 }}>
            {["Peers in my industry", "Potential customers", "Investors", "General audience"].map((opt) => (
              <button
                key={opt}
                onClick={() =>
                  setSetupAudience((prev) => (prev.includes(opt) ? prev.filter((a) => a !== opt) : [...prev, opt]))
                }
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 15,
                  textAlign: "left",
                  background: "#fff",
                  color: "#1a1a1a",
                  border: setupAudience.includes(opt) ? "2px solid #1a1a1a" : "1px solid #e0ddd5",
                  padding: setupAudience.includes(opt) ? "13px 17px" : "14px 18px",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {opt}
              </button>
            ))}
          </div>

          {/* Actions */}
          <button
            onClick={async () => {
              if (!setupTopic.trim() || setupAudience.length === 0) return;
              setSetupSaving(true);
              await upsertProfile({ content_topic: setupTopic.trim(), target_audience: setupAudience.join(", ") });
              setSetupSaving(false);
              setSetupDismissed(true);
            }}
            disabled={!setupTopic.trim() || setupAudience.length === 0 || setupSaving}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              width: "100%",
              padding: "14px 0",
              fontSize: 15,
              fontWeight: 600,
              background: !setupTopic.trim() || setupAudience.length === 0 ? "#1a1a1a" : "#1a1a1a",
              color: "#fff",
              border: "none",
              cursor: !setupTopic.trim() || setupAudience.length === 0 ? "not-allowed" : "pointer",
              opacity: !setupTopic.trim() || setupAudience.length === 0 ? 0.35 : 1,
            }}
          >
            {setupSaving ? "Saving..." : "Save & start"}
          </button>
          <button
            onClick={() => setSetupDismissed(true)}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              display: "block",
              margin: "12px auto 0",
              fontSize: 13,
              color: FAINT,
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            Skip for now
          </button>
        </div>
      ) : (
        <>
          {/* Log header */}
          <div style={{ padding: "24px 20px 16px", maxWidth: 620, margin: "0 auto" }}>
            <h2
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: 24,
                fontWeight: 600,
                color: "#1a1a1a",
                margin: 0,
              }}
            >
              Log
            </h2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: FAINT, marginTop: 4 }}>
              {logEntries.length === 0
                ? "Start by capturing a few moments from your week."
                : logEntries.length < 5
                  ? `You have ${logEntries.length} note${logEntries.length !== 1 ? "s" : ""}. Keep going.`
                  : `${logEntries.length} notes`}
            </p>
          </div>

          {/* Voice quiz prompt — dismissible, persists via localStorage */}
          {showVoicePrompt && !voicePromptDismissed && (
            <div
              style={{
                maxWidth: 620,
                margin: "0 auto 16px",
                padding: "20px 24px",
                background: "#F0ECE4",
                border: "1px solid #e0ddd5",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 15,
                    fontWeight: 600,
                    color: "#1a1a1a",
                    margin: "0 0 4px",
                  }}
                >
                  Find your writing voice
                </p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: FAINT, margin: 0 }}>
                  A 2-minute quiz unlocks your voice profile — tailored tips and a coach that helps every draft sound
                  like you.
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                <Link
                  href="/voice"
                  onClick={() => {
                    try {
                      posthog.capture("voice_quiz_prompt_started");
                    } catch {}
                  }}
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#fff",
                    background: "#1a1a1a",
                    padding: "10px 18px",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  Take the quiz
                </Link>
                <button
                  onClick={dismissVoicePrompt}
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    color: FAINT,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Compose — centered input card */}
          <div
            id="compose-card"
            className="overflow-hidden transition-colors"
            style={{
              borderRadius: 0,
              border: dragOver ? `2px solid ${BLUE}` : "1px solid #e0ddd5",
              background: dragOver ? `${BLUE}04` : "#fff",
              margin: "20px auto 0",
              maxWidth: 620,
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
                      style={{ width: 72, height: 72, objectFit: "cover", border: `1px solid ${BORDER}` }}
                    />
                    <button
                      onClick={() => removePendingImage(idx)}
                      className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center"
                      style={{ background: INK, color: "#fff", fontSize: 10, border: "none", cursor: "pointer" }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="log-compose-autosize font-sans" data-value={input}>
              <textarea
                ref={composeRef}
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
                placeholder="What happened? A thought, a link, something someone said..."
                className="w-full outline-none font-sans"
                style={{ color: INK, background: "transparent" }}
              />
            </div>
            {attachError && (
              <p className="font-sans text-[12px] px-4 pb-1" style={{ color: "#DC2626" }}>
                {attachError}
              </p>
            )}
            <div className="flex items-center justify-between px-5 pb-4">
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
                  className="p-2 hover:bg-gray-50"
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
              <span className="font-mono log-compose-kbd-hint" style={{ fontSize: 12, color: "#bbb" }}>
                ⌘↵ to log
              </span>
              <span style={{ flex: 1 }} />
              {input.trim() && (
                <button
                  onClick={handleEditMyDraft}
                  disabled={submitting}
                  className="font-sans font-medium"
                  style={{
                    background: "none",
                    border: "none",
                    color: DIM,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: submitting ? "wait" : "pointer",
                    padding: "8px 10px",
                  }}
                >
                  Edit my draft →
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={(!input.trim() && pendingImages.length === 0) || submitting}
                className="font-sans font-medium disabled:opacity-30 disabled:cursor-not-allowed"
                style={{
                  padding: "8px 18px",
                  borderRadius: 0,
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
                  className="font-mono text-[11px] px-2.5 py-1 transition-all"
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
              className="flex items-center gap-2 p-3"
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
                      className="font-sans text-[12px] px-3 py-1.5"
                      style={{ border: `1px solid ${BORDER}`, color: DIM, background: "#fff", cursor: "pointer" }}
                    >
                      Bookmark
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      className="font-sans text-[12px] px-3 py-1.5"
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

          {/* Bento grid feed on desktop; single-column full-width stack below 768px */}
          <style>{`
            @media (max-width: 767px) {
              .bento-log-grid {
                grid-template-columns: 1fr !important;
                gap: 8px !important;
                padding-left: 16px !important;
                padding-right: 16px !important;
              }
              .log-note-text {
                font-size: 16px !important;
              }
            }
          `}</style>
          <div
            className="bento-log-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
              padding: "8px 20px 20px",
              gridAutoRows: "auto",
            }}
          >
            {visibleEntries.length === 0 ? (
              <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px 20px" }}>
                {profile?.voice_profile?.top_traits && (
                  <p
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 12,
                      color: FAINT,
                      letterSpacing: "0.04em",
                      marginBottom: 16,
                    }}
                  >
                    Your voice: {profile.voice_profile.top_traits.join(". ")}.
                  </p>
                )}
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 17,
                    color: DIM,
                    lineHeight: 1.6,
                    maxWidth: 440,
                    margin: "0 auto",
                  }}
                >
                  Start by logging a few moments from your week. A conversation, something you read, a decision you
                  made. Ideas emerge when you have enough to see patterns.
                </p>
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
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      <span style={{ whiteSpace: "nowrap" }}>{dayLabel}</span>
                      <span style={{ flex: 1, height: 1, background: "#d5d0c8" }} />
                    </div>
                    {dayEntries.map((entry) => {
                      const cardStyle = getCardStyle(entry);
                      const entryUrl = entry.url || entry.link_url || (entry.content ? detectUrl(entry.content) : null);
                      const used = isUsedInPlan(entry);
                      const isSelected = selected.has(entry.id);
                      const hasImages = (entry.image_urls?.length || 0) > 0 || !!entry.image_url;
                      return (
                        <div
                          key={entry.id}
                          onClick={selectMode ? () => toggleSelect(entry.id) : undefined}
                          className="relative"
                          style={{
                            gridColumn: "span 1",
                            minWidth: 0,
                            borderRadius: 0,
                            padding: "20px 22px",
                            background: isSelected ? `${BLUE}` : cardStyle.bg,
                            color: isSelected ? "#fff" : cardStyle.text,
                            cursor: selectMode ? "pointer" : "default",
                            transition: "transform 0.15s ease",
                            position: "relative",
                            display: "flex",
                            flexDirection: "column",
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
                                className="hover:bg-black/5 flex items-center justify-center"
                                style={{ width: 44, height: 44, background: "none", border: "none", cursor: "pointer" }}
                              >
                                <svg width="16" height="16" viewBox="0 0 16 16" fill={cardStyle.text}>
                                  <circle cx="8" cy="3" r="1.5" opacity={0.5} />
                                  <circle cx="8" cy="8" r="1.5" opacity={0.5} />
                                  <circle cx="8" cy="13" r="1.5" opacity={0.5} />
                                </svg>
                              </button>
                              {menuOpen === entry.id && (
                                <div
                                  className="absolute right-0 sm:right-0 mt-1 overflow-hidden"
                                  style={{
                                    background: "#F5F0E8",
                                    border: "1px solid #e0ddd5",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                                    zIndex: 10,
                                    minWidth: 130,
                                    right: 0,
                                  }}
                                >
                                  <button
                                    onClick={(ev) => {
                                      ev.stopPropagation();
                                      handleStartEdit(entry);
                                      setMenuOpen(null);
                                    }}
                                    className="w-full text-left px-4 py-2.5 font-sans text-[13px]"
                                    style={{ color: INK, border: "none", background: "transparent", cursor: "pointer" }}
                                    onMouseEnter={(e) => {
                                      (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.03)";
                                    }}
                                    onMouseLeave={(e) => {
                                      (e.currentTarget as HTMLElement).style.background = "transparent";
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <div style={{ borderTop: "1px solid #d5d0c8", margin: "4px 0" }} />
                                  <button
                                    onClick={(ev) => {
                                      ev.stopPropagation();
                                      setDeleteConfirmId(entry.id);
                                      setMenuOpen(null);
                                    }}
                                    className="w-full text-left px-4 py-2.5 font-sans text-[13px]"
                                    style={{
                                      color: "#A0524A",
                                      border: "none",
                                      background: "transparent",
                                      cursor: "pointer",
                                    }}
                                    onMouseEnter={(e) => {
                                      (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.03)";
                                    }}
                                    onMouseLeave={(e) => {
                                      (e.currentTarget as HTMLElement).style.background = "transparent";
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
                              className="absolute inset-0 flex items-center justify-center"
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
                                    className="font-sans text-[13px] px-4 py-2"
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
                                    className="font-sans text-[13px] px-4 py-2"
                                    style={{ background: "#DC2626", color: "#fff", border: "none", cursor: "pointer" }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                          {/* Top header: type dot+label left, timestamp right */}
                          <div
                            style={{
                              fontSize: 11,
                              marginBottom: 10,
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <span style={{ fontFamily: "'DM Mono', monospace", fontWeight: 600, fontSize: 11 }}>
                              <span style={{ color: cardStyle.dot }}>● </span>
                              <span style={{ color: cardStyle.labelColor }}>{cardStyle.label}</span>
                            </span>
                          </div>
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
                                  fontSize: 16,
                                  color: INK,
                                  lineHeight: 1.6,
                                  padding: "8px 10px",
                                  border: "1.5px solid #C4B99A",
                                  borderRadius: 0,
                                  background: "transparent",
                                  overflow: "hidden",
                                }}
                                autoFocus
                              />
                              <div className="flex gap-2 mt-2 justify-end">
                                <button
                                  onClick={handleCancelEdit}
                                  className="font-sans text-[13px]"
                                  style={{ color: "#B5B0A6", background: "none", border: "none", cursor: "pointer" }}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={handleSaveEdit}
                                  disabled={submitting}
                                  className="font-sans font-medium disabled:opacity-30"
                                  style={{
                                    fontSize: 13,
                                    padding: "6px 16px",
                                    background: "#1a1a1a",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: 0,
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
                                <div>
                                  <p
                                    ref={(el) => {
                                      // Only measure while clamped — once expanded, the clamp is
                                      // removed and scrollHeight naturally equals clientHeight,
                                      // which would otherwise wipe the "Show more" button.
                                      if (!el || expandedContent.has(entry.id)) return;
                                      const isOverflowing = el.scrollHeight > el.clientHeight + 1;
                                      setOverflowingIds((prev) => {
                                        const has = prev.has(entry.id);
                                        if (isOverflowing === has) return prev;
                                        const next = new Set(prev);
                                        if (isOverflowing) next.add(entry.id);
                                        else next.delete(entry.id);
                                        return next;
                                      });
                                    }}
                                    className="font-sans log-note-text"
                                    style={
                                      expandedContent.has(entry.id)
                                        ? {
                                            fontSize: 15,
                                            color: "#1a1a1a",
                                            lineHeight: 1.6,
                                            whiteSpace: "pre-wrap",
                                            wordBreak: "break-word",
                                            paddingRight: 28,
                                          }
                                        : {
                                            fontSize: 15,
                                            color: "#1a1a1a",
                                            lineHeight: 1.6,
                                            whiteSpace: "pre-wrap",
                                            wordBreak: "break-word",
                                            paddingRight: 28,
                                            display: "-webkit-box",
                                            WebkitLineClamp: 5,
                                            WebkitBoxOrient: "vertical",
                                            overflow: "hidden",
                                          }
                                    }
                                  >
                                    {entry.content}
                                  </p>
                                  {overflowingIds.has(entry.id) && (
                                    <button
                                      onClick={(ev) => {
                                        ev.stopPropagation();
                                        setExpandedContent((prev) => {
                                          const next = new Set(prev);
                                          if (next.has(entry.id)) next.delete(entry.id);
                                          else next.add(entry.id);
                                          return next;
                                        });
                                      }}
                                      className="font-mono"
                                      style={{
                                        fontSize: 11,
                                        color: cardStyle.text,
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        padding: "4px 0",
                                        marginTop: 2,
                                        textDecoration: "underline",
                                      }}
                                    >
                                      {expandedContent.has(entry.id) ? "Show less" : "Show more"}
                                    </button>
                                  )}
                                </div>
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
                                    className="w-full cursor-pointer hover:opacity-95"
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
                                        className="w-full cursor-pointer hover:opacity-95"
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
                                  <img src={images[0]} alt="" className="w-full mt-2" style={{ border: "none" }} />
                                )}
                                {expandedImage && expandedImage !== entry.id && images.includes(expandedImage) && (
                                  <img src={expandedImage} alt="" className="w-full mt-2" style={{ border: "none" }} />
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
                                  className="no-underline block mt-3 overflow-hidden hover:opacity-95 transition-opacity"
                                  style={{ border: "none" }}
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
                                      style={{
                                        fontSize: 13,
                                        color: "#1a1a1a",
                                        lineHeight: 1.4,
                                        display: "-webkit-box",
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: "vertical",
                                        overflow: "hidden",
                                        wordBreak: "break-word",
                                      }}
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
                          {/* Tags and actions row */}
                          {(entry.tags.length > 0 || used || !selectMode) && (
                            <div
                              style={{
                                fontSize: 10,
                                marginTop: 10,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <span style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                                {entry.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    style={{
                                      padding: "1px 6px",
                                      borderRadius: 0,
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
                                      padding: "1px 6px",
                                      borderRadius: 0,
                                      background: "rgba(0,0,0,0.06)",
                                      color: "#666",
                                      fontSize: 10,
                                    }}
                                  >
                                    Used in Ideas
                                  </span>
                                )}
                              </span>
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
                                    padding: 15,
                                    margin: -15,
                                    lineHeight: 1,
                                  }}
                                >
                                  <svg
                                    width="14"
                                    height="18"
                                    viewBox="0 0 14 18"
                                    fill={entry.bookmarked ? cardStyle.text : "none"}
                                    stroke={cardStyle.text}
                                    strokeWidth="1.5"
                                    style={{ opacity: entry.bookmarked ? 0.7 : 0.4 }}
                                  >
                                    <path d="M1 3C1 1.89543 1.89543 1 3 1H11C12.1046 1 13 1.89543 13 3V17L7 13L1 17V3Z" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          )}
                          {bookmarkNoteId === entry.id && (
                            <div className="mt-2 flex gap-2 items-center" onClick={(ev) => ev.stopPropagation()}>
                              <input
                                value={bookmarkNote}
                                onChange={(ev) => setBookmarkNote(ev.target.value)}
                                onKeyDown={(ev) => {
                                  if (ev.key === "Enter") handleConfirmBookmark();
                                }}
                                placeholder="Why I saved this (optional)"
                                className="flex-1 outline-none font-sans text-[16px]"
                                style={{
                                  color: INK,
                                  padding: "6px 10px",
                                  border: "1px solid transparent",
                                  borderRadius: 0,
                                  background: "#F1EFEA",
                                }}
                                onFocus={(e) => {
                                  (e.currentTarget as HTMLElement).style.border = "1px solid #C4B99A";
                                }}
                                onBlur={(e) => {
                                  (e.currentTarget as HTMLElement).style.border = "1px solid transparent";
                                }}
                                autoFocus
                              />
                              <button
                                onClick={handleConfirmBookmark}
                                className="font-sans font-medium shrink-0"
                                style={{
                                  fontSize: 13,
                                  padding: "6px 16px",
                                  background: "#1a1a1a",
                                  color: "#fff",
                                  border: "none",
                                  borderRadius: 0,
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
                          {/* Primary action */}
                          {!selectMode && editingId !== entry.id && entry.content && entry.content.trim() && (
                            <button
                              onClick={(ev) => {
                                ev.stopPropagation();
                                try {
                                  posthog.capture("note_to_draft_started", { entry_id: entry.id });
                                } catch {}
                                if (getUrlOnlyLink(entry.content || "")) {
                                  setUrlTakeEntry(entry);
                                } else {
                                  setFormatPickerEntry(entry);
                                }
                              }}
                              className="w-full font-sans font-semibold"
                              style={{
                                marginTop: 14,
                                padding: "10px 14px",
                                background: cardStyle.text,
                                color: cardStyle.bg,
                                border: "none",
                                fontSize: 13,
                                letterSpacing: "0.01em",
                                cursor: "pointer",
                                textAlign: "center",
                              }}
                            >
                              Turn into draft →
                            </button>
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
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 font-sans text-[13px] px-4 py-2.5"
              style={{ background: INK, color: "#fff", animation: "fadeIn 0.2s ease" }}
            >
              {toast}
            </div>
          )}

          {formatPickerEntry && (
            <DraftFormatModal
              entry={formatPickerEntry}
              onGenerate={async (format, focus) => {
                const result = await onPostNote(formatPickerEntry, { format, focus: focus || undefined });
                if (result.ok) setFormatPickerEntry(null);
                return result;
              }}
              onClose={() => setFormatPickerEntry(null)}
            />
          )}

          {urlTakeEntry &&
            (() => {
              const url = getUrlOnlyLink(urlTakeEntry.content || "");
              if (!url) return null;
              return (
                <UrlTakePrompt
                  url={url}
                  onSubmit={(take) => {
                    const combined = `${take}\n\nLink for context: ${url}`;
                    setFormatPickerEntry({ ...urlTakeEntry, content: combined });
                    setUrlTakeEntry(null);
                  }}
                  onClose={() => setUrlTakeEntry(null)}
                />
              );
            })()}
        </>
      )}
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
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
      <div style={{ padding: "4px 0 16px" }}>
        <h2
          style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontSize: 24,
            fontWeight: 600,
            color: "#1a1a1a",
            margin: 0,
          }}
        >
          History
        </h2>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: FAINT, marginTop: 4 }}>
          {draftsWithContext.length === 0
            ? "Nothing here yet. Start from a playbook."
            : `${draftsWithContext.length} draft${draftsWithContext.length !== 1 ? "s" : ""}`}
        </p>
      </div>
      <div className="flex gap-1 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              fontWeight: filter === f.key ? 500 : 400,
              padding: "6px 14px",
              background: filter === f.key ? "#1a1a1a" : "transparent",
              color: filter === f.key ? "#fff" : "#999",
              border: "none",
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
          {filtered.map((d, dIdx) => {
            const pb = d.playbook_id ? getPlaybook(d.playbook_id) : null;
            return (
              <div
                key={d.id}
                style={{ padding: "16px 0", borderTop: dIdx > 0 ? "1px solid #e0ddd5" : "none", position: "relative" }}
              >
                <div
                  className="cursor-pointer"
                  onClick={() => {
                    if (d.playbook_id && pb && d.playbook_sections) {
                      onOpenPlaybookDraft(d, pb);
                      return;
                    }
                    if (d.plan_id) onOpenDraft(d.plan_id, d.post_index ?? 0);
                    else onOpenStandaloneDraft(d);
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
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
                    {/* Three-dot menu */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpenId(menuOpenId === d.id ? null : d.id);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px 6px",
                        fontSize: 18,
                        color: FAINT,
                        flexShrink: 0,
                        lineHeight: 1,
                      }}
                    >
                      ⋮
                    </button>
                  </div>
                </div>
                {/* Meta row */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {pb && (
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: 10,
                        padding: "2px 8px",
                        background: pb.color,
                        color: "#fff",
                        fontFamily: "'Fraunces', Georgia, serif",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {pb.name}
                    </span>
                  )}
                  {d.published ? (
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: 10,
                        padding: "2px 8px",
                        background: "#E8F5E0",
                        color: "#3D6B2E",
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      Published{d.published_platform ? ` on ${d.published_platform}` : ""}
                    </span>
                  ) : (
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: 10,
                        padding: "2px 8px",
                        background: "#F0ECE4",
                        color: "#8B7355",
                        fontFamily: "'DM Mono', monospace",
                      }}
                    >
                      Draft
                    </span>
                  )}
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: FAINT }}>
                    {getDayLabel(d.updated_at)} · {d.wordCount} words
                  </span>
                  {d.published && d.published_url && (
                    <a
                      href={d.published_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="no-underline"
                      style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: BLUE }}
                    >
                      View post <ArrowRight size={10} />
                    </a>
                  )}
                </div>
                {/* Dropdown menu */}
                {menuOpenId === d.id && (
                  <div
                    style={{
                      position: "absolute",
                      top: 16,
                      right: 0,
                      background: "#fff",
                      border: `1px solid ${BORDER}`,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      zIndex: 20,
                      minWidth: 160,
                      overflow: "hidden",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        setMenuOpenId(null);
                        if (d.playbook_id && pb && d.playbook_sections) {
                          onOpenPlaybookDraft(d, pb);
                        } else if (d.plan_id) {
                          onOpenDraft(d.plan_id, d.post_index ?? 0);
                        } else {
                          onOpenStandaloneDraft(d);
                        }
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 16px",
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 13,
                        color: INK,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "#f5f5f0";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = "none";
                      }}
                    >
                      Edit
                    </button>
                    {!d.published && (
                      <button
                        onClick={() => {
                          setMenuOpenId(null);
                          setPublishingId(d.id);
                        }}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "10px 16px",
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 13,
                          color: INK,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "#f5f5f0";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "none";
                        }}
                      >
                        Mark as published
                      </button>
                    )}
                    {deleteConfirmId === d.id ? (
                      <div style={{ padding: "10px 16px", borderTop: `1px solid ${BORDER}` }}>
                        <p
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 12,
                            color: "#DC2626",
                            marginBottom: 8,
                          }}
                        >
                          Delete this draft?
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={async () => {
                              await deleteDraft(d.id);
                              setDeleteConfirmId(null);
                              setMenuOpenId(null);
                              onDraftsUpdated();
                            }}
                            style={{
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: 12,
                              padding: "4px 12px",
                              background: "#DC2626",
                              color: "#fff",
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            style={{
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: 12,
                              padding: "4px 12px",
                              background: "none",
                              color: FAINT,
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(d.id)}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "10px 16px",
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 13,
                          color: "#DC2626",
                          background: "none",
                          border: "none",
                          borderTop: `1px solid ${BORDER}`,
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "#fef2f2";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background = "none";
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
                {/* Publish form (inline, shown when Mark as published is clicked) */}
                {publishingId === d.id && (
                  <div
                    className="mt-3 p-4 space-y-3"
                    style={{ background: "#fafafa", border: `1px solid ${BORDER}` }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div>
                      <span
                        style={{
                          fontFamily: "'DM Mono', monospace",
                          fontSize: 11,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          color: FAINT,
                          fontWeight: 500,
                          display: "block",
                          marginBottom: 8,
                        }}
                      >
                        Where did you post this?
                      </span>
                      <div className="flex gap-2 flex-wrap">
                        {PUBLISH_PLATFORMS.map((p) => (
                          <button
                            key={p}
                            onClick={() => setPubPlatform(p)}
                            style={{
                              fontFamily: "'DM Sans', sans-serif",
                              fontSize: 12,
                              padding: "6px 14px",
                              background: pubPlatform === p ? "#1a1a1a" : "transparent",
                              color: pubPlatform === p ? "#fff" : DIM,
                              border: "none",
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
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 16,
                        width: "100%",
                        outline: "none",
                        color: INK,
                        padding: "8px 12px",
                        border: `1px solid ${BORDER}`,
                        background: "#fff",
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePublish(d.id)}
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 13,
                          fontWeight: 600,
                          padding: "8px 18px",
                          background: BLUE,
                          color: "#fff",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setPublishingId(null)}
                        style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: 13,
                          color: FAINT,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
              <div className="p-4" style={{ background: "#f9fafb", border: `1px solid ${BORDER}` }}>
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
              <div className="p-4 space-y-2" style={{ background: "#f9fafb", border: `1px solid ${BORDER}` }}>
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
              className="w-full py-3.5 font-sans font-semibold text-[15px] disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}
            >
              {coachLoading ? "Checking..." : "Check my writing"}
            </button>
            <button
              onClick={handleExplicitSave}
              className="w-full py-3 font-sans font-semibold text-[14px]"
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
            <div className="p-4" style={{ background: "#fafafa", border: `1px solid ${BORDER}` }}>
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
              <div className="p-4" style={{ background: "#fafafa", border: `1px solid ${BORDER}` }}>
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
                      className="p-4"
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
                          className="flex items-center gap-1 px-3 py-1.5 font-sans text-[12px]"
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
                          className="flex items-center gap-1 px-3 py-1.5 font-sans text-[12px]"
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
              <div className="p-4" style={{ borderLeft: `3px solid ${BLUE}`, background: `${BLUE}04` }}>
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
                className="w-full py-3.5 font-sans font-semibold text-[15px] transition-transform hover:scale-[1.01] hover:-translate-y-px"
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
function IconSparkles({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 3l1.5 5.5L17 10l-5.5 1.5L10 17l-1.5-5.5L3 10l5.5-1.5z" />
      <path d="M16 3l0.6 2 2 0.6-2 0.6-0.6 2-0.6-2-2-0.6 2-0.6z" />
    </svg>
  );
}

function StandaloneWriteMode({
  draft,
  sourceImages,
  initialFormat,
  profile,
  onBack,
  onSaveDone,
}: {
  draft: Draft;
  sourceImages?: string[];
  initialFormat?: DraftFormat;
  profile: UserProfile | null;
  onBack: () => void;
  onSaveDone: () => void;
}) {
  const [content, setContent] = useState(draft.content);
  const [saving, setSaving] = useState(false);
  // Format is chosen once at generation time (DraftFormatModal) — no longer
  // switchable from within the editor, so this is just a display value.
  const regenerateFormat = initialFormat;
  const [showNote, setShowNote] = useState(true);
  const [showDraftSection, setShowDraftSection] = useState(true);
  const [voiceCoachOpen, setVoiceCoachOpen] = useState(false);
  const [coachResult, setCoachResult] = useState<CoachResult | null>(null);
  const [selectedAnnotationIndex, setSelectedAnnotationIndex] = useState<number | null>(null);
  const [coachLeftView, setCoachLeftView] = useState<"highlighted" | "edit">("edit");
  // Mobile-only: the side-by-side split is unreadable under 768px, so it
  // becomes a tab switcher there instead (desktop keeps the split as-is).
  // Defaults to "coach" since that's the content the user just asked to see.
  const [mobileCoachTab, setMobileCoachTab] = useState<"edit" | "coach">("coach");
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef(draft.content);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Set for real in openVoiceCoach(); this initial value is never read since
  // closeVoiceCoach() can only run after openVoiceCoach() has already fired.
  const voiceCoachOpenedAt = useRef(0);

  // Once Voice Coach analysis loads, default the left column to the
  // highlighted view so the annotations are visible in context.
  useEffect(() => {
    if (coachResult && coachResult.annotations.length > 0) setCoachLeftView("highlighted");
  }, [coachResult]);

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

  const openVoiceCoach = () => {
    voiceCoachOpenedAt.current = Date.now();
    try {
      posthog.capture("voice_coach_opened", { draft_id: draft.id });
    } catch {}
    setVoiceCoachOpen(true);
    setMobileCoachTab("coach");
  };

  const closeVoiceCoach = () => {
    const timeSpent = Math.round((Date.now() - voiceCoachOpenedAt.current) / 1000);
    try {
      posthog.capture("voice_coach_closed", { draft_id: draft.id, time_spent_seconds: timeSpent });
    } catch {}
    setVoiceCoachOpen(false);
    setSelectedAnnotationIndex(null);
    setCoachLeftView("edit");
    setMobileCoachTab("coach");
  };

  // Build the highlighted, click-to-select view of the current draft for the
  // Voice Coach split panel — matches on each annotation's edited_text (the
  // version actually present in the current draft).
  function renderCoachHighlightedDraft() {
    const anns = coachResult?.annotations || [];
    let remaining = content;
    const segments: { text: string; annotationIndex?: number }[] = [];
    const matches = anns
      .map((a, i) => ({ ...a, originalIndex: i }))
      .filter((a) => a.edited_text && remaining.includes(a.edited_text))
      .sort((a, b) => remaining.indexOf(a.edited_text) - remaining.indexOf(b.edited_text));

    for (const ann of matches) {
      const idx = remaining.indexOf(ann.edited_text);
      if (idx === -1) continue;
      if (idx > 0) segments.push({ text: remaining.slice(0, idx) });
      segments.push({ text: ann.edited_text, annotationIndex: ann.originalIndex });
      remaining = remaining.slice(idx + ann.edited_text.length);
    }
    if (remaining) segments.push({ text: remaining });

    return segments.map((seg, i) => {
      if (seg.annotationIndex === undefined) {
        return (
          <span key={i} style={{ whiteSpace: "pre-wrap" }}>
            {seg.text}
          </span>
        );
      }
      const ann = anns[seg.annotationIndex];
      const isSelected = selectedAnnotationIndex === seg.annotationIndex;
      const toward = ann.direction === "toward";
      return (
        <span
          key={i}
          onClick={() => setSelectedAnnotationIndex(isSelected ? null : seg.annotationIndex!)}
          style={{
            whiteSpace: "pre-wrap",
            cursor: "pointer",
            borderRadius: 0,
            padding: "0 2px",
            background: isSelected ? (toward ? "#16a34a30" : "#B4530930") : toward ? "#16a34a15" : "#B4530915",
            borderBottom: `2px solid ${toward ? "#16a34a80" : "#B4530980"}`,
            transition: "background 0.15s",
          }}
        >
          {seg.text}
        </span>
      );
    });
  }

  const unsavedChanges = content.trim() !== lastSavedRef.current.trim();
  const isEdited = !!draft.original_draft && content.trim() !== draft.original_draft.trim();
  const voiceCoachVisible = !!(draft.original_draft && draft.original_draft.trim());

  return (
    <div className="min-h-screen" style={{ background: "#F5F0E8" }}>
      <div
        style={{
          maxWidth: voiceCoachOpen ? 1100 : 720,
          margin: "0 auto",
          padding: "24px 20px",
          transition: "max-width 0.35s ease",
        }}
      >
        {voiceCoachOpen && (
          <div className="coach-mobile-tabs">
            <button
              onClick={() => setMobileCoachTab("edit")}
              className={mobileCoachTab === "edit" ? "coach-mobile-tab-active" : "coach-mobile-tab"}
            >
              Your edit
            </button>
            <button
              onClick={() => setMobileCoachTab("coach")}
              className={mobileCoachTab === "coach" ? "coach-mobile-tab-active" : "coach-mobile-tab"}
            >
              Voice Coach
            </button>
          </div>
        )}
        <div
          style={{
            display: "flex",
            gap: voiceCoachOpen ? 24 : 0,
            alignItems: "flex-start",
            transition: "gap 0.35s ease",
          }}
        >
          <div
            className={voiceCoachOpen && mobileCoachTab === "coach" ? "coach-mobile-tab-hidden" : undefined}
            style={{
              flex: voiceCoachOpen ? "1 1 50%" : "1 1 auto",
              minWidth: 0,
              transition: "flex-basis 0.35s ease",
            }}
          >
            <div
              style={
                voiceCoachOpen ? { maxHeight: "calc(100vh - 48px)", overflowY: "auto", paddingRight: 12 } : undefined
              }
            >
              <div className="flex items-center justify-between mb-6">
                <button
                  onClick={onBack}
                  className="font-mono text-[12px]"
                  style={{ color: DIM, background: "none", border: "none", cursor: "pointer" }}
                >
                  <ArrowLeft size={12} /> Back
                </button>
                <span
                  className="font-mono text-[11px]"
                  style={{ color: saving ? BLUE : saveError ? "#DC2626" : unsavedChanges ? "#B45309" : FAINT }}
                >
                  {saving ? "Saving..." : saveError ? "Save failed" : unsavedChanges ? "Unsaved changes" : "Saved"}
                </span>
              </div>

              {/* Voice identity + format cards */}
              {(!!(draft.source_entry_id && profile?.voice_profile) || !!regenerateFormat) && (
                <div className="flex editor-identity-cards" style={{ gap: 12, marginBottom: 16 }}>
                  {draft.source_entry_id && profile?.voice_profile && (
                    <div
                      style={{
                        flex: 1,
                        background: "linear-gradient(135deg, #1A1917, #2D2B28)",
                        color: "#fff",
                        padding: "12px 16px",
                        borderRadius: 8,
                      }}
                    >
                      <span
                        className="font-mono uppercase block mb-1"
                        style={{ fontSize: 10, letterSpacing: "0.08em", color: "rgba(255,255,255,0.5)" }}
                      >
                        Your voice
                      </span>
                      <span className="font-sans block" style={{ fontSize: 15, fontWeight: 500 }}>
                        {(profile.voice_profile as VoiceProfile).top_traits?.join(" · ")}
                      </span>
                    </div>
                  )}
                  {regenerateFormat && (
                    <div
                      style={{
                        flex: "0 0 auto",
                        background: "#fff",
                        border: `1px solid ${BORDER}`,
                        padding: "12px 16px",
                        borderRadius: 8,
                      }}
                    >
                      <span
                        className="font-mono uppercase block mb-1"
                        style={{ fontSize: 10, letterSpacing: "0.08em", color: FAINT }}
                      >
                        Format
                      </span>
                      <span className="font-sans block" style={{ fontSize: 14, fontWeight: 500, color: INK }}>
                        {FORMATS.find((f) => f.key === regenerateFormat)?.label}
                      </span>
                    </div>
                  )}
                </div>
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
                          fontFamily: "'Fraunces', Georgia, serif",
                          fontSize: 12,
                          fontWeight: 600,
                          background: pb.color,
                          color: pb.textColor,
                          padding: "4px 12px",
                          borderRadius: 0,
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

              {/* Only show "Your note" when the draft actually differs from it —
                for the direct "Edit my draft" path they're the same text, so
                there's nothing meaningful to compare. */}
              {draft.source_note && draft.source_note.trim() !== (draft.original_draft || "").trim() && (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => setShowNote(!showNote)}
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
                  </div>
                  {showNote && (
                    <div className="p-4" style={{ background: "#f9fafb", border: `1px solid ${BORDER}` }}>
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
                        className="w-full"
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

              <div className="mb-2">
                <button
                  onClick={() => setShowDraftSection(!showDraftSection)}
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
                  Your draft{" "}
                  <span
                    style={{
                      fontSize: 10,
                      transition: "transform 0.2s",
                      transform: showDraftSection ? "rotate(0)" : "rotate(-90deg)",
                    }}
                  >
                    ▼
                  </span>
                </button>
              </div>

              {showDraftSection && (
                <>
                  {voiceCoachOpen && coachResult && coachResult.annotations.length > 0 && (
                    <div className="mb-3">
                      <button
                        onClick={() => setCoachLeftView(coachLeftView === "highlighted" ? "edit" : "highlighted")}
                        className="font-mono text-[11px]"
                        style={{ color: DIM, background: "none", border: "none", cursor: "pointer" }}
                      >
                        {coachLeftView === "highlighted" ? "Edit text" : "Show highlights"}
                      </button>
                    </div>
                  )}

                  {/* Draft content — coach highlights or plain textarea */}
                  {voiceCoachOpen &&
                  coachLeftView === "highlighted" &&
                  coachResult &&
                  coachResult.annotations.length > 0 ? (
                    <div
                      className="font-sans"
                      style={{ fontSize: 16, color: INK, lineHeight: 1.8, minHeight: "40vh", whiteSpace: "pre-wrap" }}
                    >
                      {renderCoachHighlightedDraft()}
                    </div>
                  ) : (
                    // Distinct from the quoted "Your note" box below it — a solid
                    // fill + accent left border reads as an active field, not
                    // reference text, so it's clearer this is what you edit.
                    <div
                      style={{
                        background: "#fff",
                        border: `1px solid ${BORDER}`,
                        borderLeft: `3px solid ${BLUE}`,
                        padding: "16px 18px",
                      }}
                    >
                      {!isEdited && (
                        <p
                          className="font-sans"
                          style={{ fontSize: 12, color: FAINT, fontStyle: "italic", marginBottom: 10 }}
                        >
                          Edit this draft to make it yours
                        </p>
                      )}
                      <div className="autosize-textarea-wrap font-sans" data-value={content}>
                        <textarea
                          value={content}
                          onChange={(e) => handleChange(e.target.value)}
                          onBlur={() => {
                            if (content.trim()) finalizeDraftEdit(draft.id, content);
                          }}
                          placeholder="Start writing..."
                          className="w-full outline-none font-sans"
                          style={{ color: INK, background: "transparent", cursor: "text" }}
                          autoFocus
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {voiceCoachVisible && (
                <div
                  className="editor-cta-footer"
                  style={{ marginTop: 24, paddingTop: 16, borderTop: `0.5px solid ${BORDER}` }}
                >
                  {!isEdited && (
                    <p
                      className="font-sans text-center"
                      style={{ fontSize: 12, color: DIM, marginBottom: 8, lineHeight: 1.4 }}
                    >
                      Edit the draft above, then ask &quot;How did I do?&quot;
                    </p>
                  )}
                  <button
                    onClick={() => {
                      if (isEdited) openVoiceCoach();
                    }}
                    disabled={!isEdited}
                    className="w-full flex items-center justify-center gap-1.5 font-sans font-semibold"
                    style={{
                      border: isEdited ? "none" : `0.5px solid ${BORDER}`,
                      borderRadius: 8,
                      padding: "12px 14px",
                      fontSize: 13,
                      color: isEdited ? "#fff" : FAINT,
                      background: isEdited ? BLUE : "transparent",
                      cursor: isEdited ? "pointer" : "default",
                    }}
                  >
                    <IconSparkles size={15} />
                    How did I do?
                  </button>
                </div>
              )}
            </div>
          </div>

          {voiceCoachOpen && (
            <div
              className={mobileCoachTab === "edit" ? "coach-mobile-tab-hidden" : undefined}
              style={{
                flex: "1 1 50%",
                minWidth: 0,
                position: "sticky",
                top: 24,
                animation: "voiceCoachPanelIn 0.35s ease",
              }}
            >
              <div style={{ maxHeight: "calc(100vh - 48px)", overflowY: "auto" }}>
                <VoiceCoach
                  draftId={draft.id}
                  originalDraft={draft.original_draft || ""}
                  currentDraft={content}
                  voiceProfile={profile?.voice_profile as VoiceProfile | undefined}
                  selectedIndex={selectedAnnotationIndex}
                  onSelectIndex={setSelectedAnnotationIndex}
                  onResultChange={setCoachResult}
                  onApplySuggestion={(updated) => {
                    setContent(updated);
                    saveDraftById(draft.id, updated);
                    lastSavedRef.current = updated;
                  }}
                  onClose={closeVoiceCoach}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════ DASHBOARD PAGE ══════════════ */
export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allPlans, setAllPlans] = useState<ContentPlan[]>([]);
  const [logEntriesState, setLogEntries] = useState<LogEntry[]>([]);
  const [draftsState, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTabRaw] = useState<Tab>("log");
  const setTab = (t: Tab) => {
    setTabRaw(t);
    if (typeof window !== "undefined") {
      window.history.pushState({ tab: t }, "", `#${t}`);
    }
  };

  // Read hash on mount + handle browser back/forward
  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as Tab;
    if (["log", "playbooks", "history", "voice-profile"].includes(hash)) setTabRaw(hash);
    const handlePop = () => {
      const h = window.location.hash.replace("#", "") as Tab;
      if (["log", "playbooks", "history", "voice-profile"].includes(h)) setTabRaw(h);
      else setTabRaw("log");
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);
  // ideasWeek removed — Ideas tab no longer exists
  const [writeMode, setWriteMode] = useState<{ planId: string; postIndex: number } | null>(null);
  const [standaloneDraft, setStandaloneDraft] = useState<{
    draft: Draft;
    images?: string[];
    format?: DraftFormat;
  } | null>(null);
  const [activePlaybook, setActivePlaybook] = useState<{ playbook: Playbook; draft?: Draft } | null>(null);
  const [developEntries, setDevelopEntries] = useState<LogEntry[] | null>(null);
  const [tooltipStep, setTooltipStep] = useState<number | null>(null);
  const [postingEntryId, setPostingEntryId] = useState<string | null>(null);
  // Result of the most recent note→draft generation. Lives here, not in
  // DraftFormatModal or LogTab, so it survives a tab switch — LogTab (and
  // the modal inside it) unmounts the instant `tab` changes away from
  // "log", which used to make the "Writing..." state vanish mid-request
  // even though the fetch kept running. Success no longer force-navigates
  // into the editor either: by the time a generation resolves, the user may
  // have moved on, so it surfaces as a dismissible, click-to-open notice.
  const [draftResult, setDraftResult] = useState<
    { status: "ready"; draft: Draft; format?: DraftFormat } | { status: "failed"; reason: string } | null
  >(null);
  const [voiceLearning, setVoiceLearning] = useState<VoiceLearningData | null>(null);

  useEffect(() => {
    getVoiceLearningData().then(setVoiceLearning);
  }, []);

  useEffect(() => {
    async function load() {
      const [p, plan, plans, entries, draftsList] = await Promise.all([
        getProfile(),
        getCurrentPlan(),
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

  async function handlePostNote(
    entry: LogEntry,
    options?: { format?: DraftFormat; focus?: string }
  ): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (!profile?.voice_profile) {
      // No voice profile — prompt user to complete exercise
      if (confirm("Take 60 seconds to discover your voice first?")) {
        window.location.href = "/voice";
      }
      return { ok: false, reason: "no_voice_profile" };
    }

    // Set loading state
    setPostingEntryId(entry.id);
    // Client-perceived wait time — from click to whatever happens, success
    // or failure. maxRetries: 2 on the server's Anthropic client means a
    // failing call can take a lot longer than one request, and this is the
    // number that answers "how long did someone actually wait."
    const startedAt = Date.now();
    const reportFailure = (reason: string) => {
      try {
        posthog.capture("draft_generation_failed", {
          entry_id: entry.id,
          reason,
          duration_ms: Date.now() - startedAt,
          format: options?.format,
        });
      } catch {}
    };

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
          ...(options?.format ? { format: options.format } : {}),
          ...(options?.focus ? { focus: options.focus } : {}),
        }),
      });

      if (!res.ok) {
        let reason = "error";
        try {
          const body = await res.json();
          if (typeof body?.reason === "string") reason = body.reason;
        } catch {
          // Non-JSON error body — fall back to the generic reason.
        }
        console.error("generate-draft failed:", reason);
        setDraftResult({ status: "failed", reason });
        reportFailure(reason);
        return { ok: false, reason };
      }

      const text = await res.text();

      const draft = await createStandaloneDraft(text, entry.content || "", entry.id);

      if (!draft) {
        console.error("Post failed: createStandaloneDraft returned null");
        setDraftResult({ status: "failed", reason: "save_failed" });
        reportFailure("save_failed");
        return { ok: false, reason: "save_failed" };
      }

      posthog.capture("note_written", {
        entry_id: entry.id,
        platform: profile.platforms?.[0] || "linkedin",
        format: options?.format,
      });
      // Refresh the drafts list, but don't force-navigate into the editor —
      // by the time this resolves the user may have moved on to something
      // else. Surface it as a dismissible, click-to-open notice instead.
      const allDrafts = await getAllDrafts();
      setDrafts(allDrafts);
      setDraftResult({ status: "ready", draft, format: options?.format });
      return { ok: true };
    } catch (err) {
      console.error("Post failed:", err);
      setDraftResult({ status: "failed", reason: "network_error" });
      reportFailure("network_error");
      return { ok: false, reason: "network_error" };
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
        initialFormat={standaloneDraft.format}
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
      <div className="min-h-screen" style={{ background: "#F5F0E8" }} suppressHydrationWarning>
        <header
          style={{ position: "sticky", top: 0, background: "#F5F0E8", zIndex: 10, borderBottom: "0.5px solid #e0ddd5" }}
          suppressHydrationWarning
        >
          <div style={{ display: "flex", alignItems: "center", padding: "12px 20px" }} suppressHydrationWarning>
            <span
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: 18,
                fontWeight: 600,
                fontStyle: "italic",
                color: "#1a1a1a",
              }}
              suppressHydrationWarning
            >
              accent
            </span>
          </div>
        </header>
        <div style={{ padding: "20px" }} className="animate-pulse">
          <div className="h-7 w-48 mb-4" style={{ background: "#f0f0f0" }} />
          <div className="h-44" style={{ background: "#fafafa" }} />
        </div>
      </div>
    );

  const TABS: { key: Tab; label: string }[] = [
    { key: "log", label: "Log" },
    { key: "playbooks", label: "Templates" },
    { key: "history", label: "Drafts" },
    { key: "voice-profile", label: "Voice Profile" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#F5F0E8" }} suppressHydrationWarning>
      <header
        style={{ position: "sticky", top: 0, background: "#F5F0E8", zIndex: 10, borderBottom: "0.5px solid #e0ddd5" }}
        suppressHydrationWarning
      >
        <div style={{ display: "flex", alignItems: "center", padding: "12px 20px", gap: 4 }} suppressHydrationWarning>
          <Link
            href="/"
            className="no-underline"
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: 18,
              fontWeight: 600,
              fontStyle: "italic",
              color: "#1a1a1a",
              marginRight: 16,
            }}
            suppressHydrationWarning
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
                borderRadius: 0,
                padding: "6px 14px",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>

      {/* Note→draft generation status — fixed position so it survives tab
          switches (LogTab, which owns the format-picker modal, unmounts the
          instant `tab` changes away from "log"). Success never auto-opens
          the editor; it's a click-to-view notice so a late-arriving result
          can't yank the user out of whatever they're doing now. */}
      {(postingEntryId || draftResult) && (
        <>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div
            style={{
              position: "fixed",
              bottom: 24,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 60,
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "#1a1a1a",
              color: "#fff",
              padding: "12px 16px",
              maxWidth: "calc(100vw - 32px)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
            }}
          >
            {postingEntryId && !draftResult && (
              <>
                <span
                  aria-hidden
                  style={{
                    width: 14,
                    height: 14,
                    flexShrink: 0,
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    animation: "spin 0.7s linear infinite",
                  }}
                />
                <span>Writing your draft…</span>
              </>
            )}
            {draftResult?.status === "ready" && (
              <>
                <span>Your draft is ready.</span>
                <button
                  onClick={() => {
                    setStandaloneDraft({ draft: draftResult.draft, format: draftResult.format });
                    setDraftResult(null);
                  }}
                  className="font-sans font-semibold"
                  style={{
                    background: "#fff",
                    color: "#1a1a1a",
                    border: "none",
                    borderRadius: 0,
                    padding: "6px 12px",
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  View
                </button>
                <button
                  onClick={() => setDraftResult(null)}
                  aria-label="Dismiss"
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 14,
                    padding: 0,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </>
            )}
            {draftResult?.status === "failed" && (
              <>
                <span>{ERROR_MESSAGES[draftResult.reason] || DEFAULT_ERROR_MESSAGE}</span>
                <button
                  onClick={() => setDraftResult(null)}
                  aria-label="Dismiss"
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 14,
                    padding: 0,
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              </>
            )}
          </div>
        </>
      )}

      <div className="pb-12" style={tab === "history" ? { maxWidth: 640, margin: "0 auto", padding: 20 } : undefined}>
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
            {/* Page header */}
            <div style={{ padding: "24px 20px 16px" }}>
              <h2
                style={{
                  fontFamily: "'Fraunces', Georgia, serif",
                  fontSize: 24,
                  fontWeight: 600,
                  color: "#1a1a1a",
                  margin: 0,
                }}
              >
                Templates
              </h2>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: FAINT, marginTop: 4 }}>
                9 proven structures. Pick one and fill in your thinking.
              </p>
            </div>

            {/* Bento grid */}
            <div
              className="playbooks-grid"
              style={{
                display: "grid",
                gap: 8,
                padding: "0 20px 20px",
              }}
            >
              {PLAYBOOKS.map((playbook, idx) => {
                const isHero = playbook.gridSpan?.startsWith("span 2");
                const muted = playbook.textColor === "#1a1a1a" ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.45)";
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
                      borderRadius: 0,
                      padding: isHero ? "24px 26px" : "18px 20px",
                      minHeight: isHero ? 280 : 160,
                      maxHeight: 300,
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      position: "relative",
                      transition: "transform 0.15s ease",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = "scale(0.99)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.transform = "scale(1)";
                    }}
                  >
                    {/* Number */}
                    <span style={{ fontSize: 12, fontFamily: "'DM Mono', monospace", color: muted }}>
                      {String(idx + 1).padStart(2, "0")}
                    </span>

                    {/* Name + Tagline at bottom */}
                    <div>
                      <p
                        style={{
                          fontFamily: "'Fraunces', Georgia, serif",
                          fontSize: isHero ? 30 : 20,
                          fontWeight: 600,
                          lineHeight: 1.15,
                          margin: 0,
                        }}
                      >
                        {playbook.name}
                      </p>
                      <p
                        style={{
                          fontSize: 13,
                          fontFamily: "'DM Sans', sans-serif",
                          color: muted,
                          margin: "8px 0 0",
                          lineHeight: 1.4,
                        }}
                      >
                        {playbook.tagline}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            <style>{`
              .playbooks-grid { grid-template-columns: 1fr; }
              @media (max-width: 640px) {
                /* Hero cards request "span 2" via inline style — left alone,
                   that forces the browser to keep an implicit 2nd column
                   track even though grid-template-columns is 1fr, so every
                   card needs its own span forced to 1 here too. */
                .playbooks-grid > button { grid-column: span 1 !important; grid-row: span 1 !important; }
              }
              @media (min-width: 641px) {
                .playbooks-grid { grid-template-columns: repeat(4, 1fr); }
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
        {tab === "voice-profile" && (
          <div>
            <div style={{ padding: "24px 20px 16px", maxWidth: 620, margin: "0 auto" }}>
              <h2
                style={{
                  fontFamily: "'Fraunces', Georgia, serif",
                  fontSize: 24,
                  fontWeight: 600,
                  color: "#1a1a1a",
                  margin: 0,
                }}
              >
                Voice Profile
              </h2>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: FAINT, marginTop: 4 }}>
                Your voice test results and how your voice has evolved from Voice Coach sessions.
              </p>
            </div>
            <VoiceIdentityCard voiceProfile={(profile?.voice_profile as VoiceProfile) || null} />
            <VoiceLearningCard data={voiceLearning} />
          </div>
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
        <div className="px-4 py-3" style={{ background: "#111827", minWidth: 240, maxWidth: 300 }}>
          <p className="font-sans text-[14px] mb-3" style={{ color: "#fff", lineHeight: 1.5 }}>
            {current.text}
          </p>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px]" style={{ color: "#6b7280" }}>
              {step}/3
            </span>
            <button
              onClick={onNext}
              className="font-sans text-[13px] font-semibold px-3 py-1"
              style={{ background: "#1a1a1a", color: "#fff", border: "none", cursor: "pointer" }}
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
