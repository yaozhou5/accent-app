"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createLog, getLogs, type LogEntry } from "@/lib/supabase/logs";

const INK = "#1A1A18";
const DIM = "#6B6B6B";
const FAINT = "#AAAAAA";
const BORDER = "#E5E5E5";
const TEAL = "#0d9488";
const TEAL_LIGHT = "#f0fdfa";

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

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

function groupByDay(entries: LogEntry[]): Map<string, LogEntry[]> {
  const groups = new Map<string, LogEntry[]>();
  for (const entry of entries) {
    const label = getDayLabel(entry.created_at);
    const existing = groups.get(label) || [];
    existing.push(entry);
    groups.set(label, existing);
  }
  return groups;
}

export default function LogPage() {
  const [text, setText] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<"week" | "all">("week");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newId, setNewId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLoading(true);
    getLogs(filter).then(data => {
      setLogs(data);
      setLoading(false);
    });
  }, [filter]);

  const handleSubmit = async () => {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const entry = await createLog(text.trim());
      if (entry) {
        setLogs(prev => [entry, ...prev]);
        setNewId(entry.id);
        setTimeout(() => setNewId(null), 600);
        setText("");
      } else {
        setError("Failed to save. Make sure the logs table exists in Supabase.");
      }
    } catch (e) {
      console.error("Log submit error:", e);
      setError("Something went wrong. Check the console for details.");
    }
    setSubmitting(false);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const charCount = text.length;
  const grouped = groupByDay(logs);

  return (
    <div className="min-h-screen" style={{ background: "#fff" }}>
      {/* Header */}
      <header style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[640px] mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/write" className="no-underline flex items-center" style={{ color: DIM }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="font-serif" style={{ fontSize: 22, fontWeight: 600, color: INK }}>Log</h1>
          </div>
          <div className="flex rounded-full overflow-hidden" style={{ border: `1px solid ${BORDER}` }}>
            {(["week", "all"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="font-mono text-[11px] px-3.5 py-1.5 transition-colors"
                style={{
                  background: filter === f ? TEAL : "transparent",
                  color: filter === f ? "#fff" : DIM,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {f === "week" ? "This week" : "All time"}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="max-w-[640px] mx-auto px-5 py-6">
        {/* Log input */}
        <div className="mb-8">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="What happened today?"
              rows={4}
              className="w-full outline-none resize-y font-sans"
              style={{
                fontSize: 16,
                color: INK,
                lineHeight: 1.7,
                padding: "16px 20px",
                border: `1px solid ${BORDER}`,
                borderRadius: 12,
                background: "#fff",
                minHeight: 120,
              }}
            />
            <span
              className="absolute font-mono"
              style={{ bottom: 12, right: 16, fontSize: 11, color: FAINT }}
            >
              {charCount}
            </span>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || submitting}
            className="mt-3 w-full py-3 rounded-full font-sans font-semibold text-[15px] transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: TEAL, color: "#fff", border: "none", cursor: "pointer" }}
          >
            {submitting ? "Logging..." : "Log"}
          </button>
          {error && (
            <p className="mt-2 text-center font-sans text-[13px]" style={{ color: "#DC2626" }}>{error}</p>
          )}
          <p className="mt-2 text-center font-mono" style={{ fontSize: 11, color: FAINT }}>
            Cmd+Enter to submit
          </p>
        </div>

        {/* Log entries */}
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i}>
                <div className="h-3 rounded w-20 mb-3" style={{ background: "#f0f0f0" }} />
                <div className="h-16 rounded-[10px]" style={{ background: "#fafafa" }} />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <p className="font-sans" style={{ fontSize: 15, color: FAINT }}>
              Nothing yet. What happened today?
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Array.from(grouped.entries()).map(([day, entries]) => (
              <div key={day}>
                <span
                  className="font-mono uppercase block mb-3"
                  style={{ fontSize: 11, letterSpacing: "0.08em", color: TEAL }}
                >
                  {day}
                </span>
                <div className="space-y-3">
                  {entries.map(entry => (
                    <div
                      key={entry.id}
                      className="rounded-[10px]"
                      style={{
                        padding: "16px 20px",
                        background: TEAL_LIGHT,
                        border: `1px solid ${BORDER}`,
                        opacity: newId === entry.id ? 0 : 1,
                        transform: newId === entry.id ? "translateY(-8px)" : "none",
                        animation: newId === entry.id ? "logSlideIn 0.5s ease forwards" : "none",
                      }}
                    >
                      <p
                        className="font-sans"
                        style={{ fontSize: 15, color: INK, lineHeight: 1.65, whiteSpace: "pre-wrap" }}
                      >
                        {entry.content}
                      </p>
                      <span
                        className="font-mono block mt-2"
                        style={{ fontSize: 11, color: FAINT }}
                      >
                        {formatTime(entry.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes logSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
