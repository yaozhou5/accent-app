"use client";

import { useState } from "react";
import type { LogEntry } from "@/lib/supabase/log-entries";

const INK = "#111827";
const BODY = "#4b5563";
const DIM = "#6b7280";
const FAINT = "#9ca3af";
const BLUE = "#1a1a1a";
const BORDER = "#e5e7eb";

export type DraftFormat = "quick_take" | "full_post";

export const FORMATS: { key: DraftFormat; label: string; description: string }[] = [
  { key: "quick_take", label: "Quick take", description: "2-4 sentences, one sharp point" },
  { key: "full_post", label: "Full post", description: "150-250 words, developed idea" },
];

// Machine-readable failure reasons (from generate-draft's response, or from
// handlePostNote's own catch/save-failure branches) mapped to copy a user
// can act on. Falls back to a generic retry prompt for anything unlisted.
export const ERROR_MESSAGES: Record<string, string> = {
  timeout: "That took too long to generate. Try again?",
  rate_limited: "Getting a lot of requests right now. Try again in a moment.",
  upstream_error: "Something went wrong generating your draft. Try again?",
  empty_response: "Didn't get a usable draft back. Try again?",
  save_failed: "Generated the draft but couldn't save it. Try again?",
  network_error: "Couldn't reach the server. Check your connection and try again.",
  auth_expired: "Your session expired. Sign in again and retry.",
  bad_input: "The note was empty — add some text and try again.",
};
export const DEFAULT_ERROR_MESSAGE = "Something went wrong. Try again?";

interface DraftFormatModalProps {
  entry: LogEntry;
  onGenerate: (format: DraftFormat, focus: string) => Promise<{ ok: true } | { ok: false; reason: string }>;
  onClose: () => void;
}

export default function DraftFormatModal({ entry, onGenerate, onClose }: DraftFormatModalProps) {
  const [format, setFormat] = useState<DraftFormat | null>(null);
  const [focus, setFocus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!format || submitting) return;
    setSubmitting(true);
    setError(null);
    const result = await onGenerate(format, focus.trim());
    if (!result.ok) {
      setError(ERROR_MESSAGES[result.reason] || DEFAULT_ERROR_MESSAGE);
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)", zIndex: 100 }}
      onClick={submitting ? undefined : onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-[440px]"
        style={{
          background: "#fff",
          padding: "24px 24px 20px",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, fontWeight: 600, color: INK }}>
            Turn into draft
          </h2>
          <button
            onClick={onClose}
            disabled={submitting}
            className="font-mono text-[12px]"
            style={{ color: DIM, background: "none", border: "none", cursor: submitting ? "default" : "pointer" }}
          >
            Close ✕
          </button>
        </div>

        {/* Note preview — so the user remembers what they wrote */}
        <div className="p-3 mb-5" style={{ background: "#f9fafb", border: `1px solid ${BORDER}` }}>
          <p
            className="font-sans"
            style={{
              fontSize: 13,
              color: BODY,
              lineHeight: 1.5,
              fontStyle: "italic",
              whiteSpace: "pre-wrap",
              display: "-webkit-box",
              WebkitLineClamp: 4,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {entry.content}
          </p>
        </div>

        {/* Format picker */}
        <span
          className="font-mono uppercase block mb-2"
          style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}
        >
          Format
        </span>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {FORMATS.map((f) => {
            const selected = format === f.key;
            return (
              <button
                key={f.key}
                onClick={() => {
                  setFormat(f.key);
                  setError(null);
                }}
                disabled={submitting}
                style={{
                  textAlign: "left",
                  padding: "12px 14px",
                  background: selected ? `${BLUE}08` : "#fff",
                  border: `1.5px solid ${selected ? BLUE : BORDER}`,
                  borderRadius: 0,
                  cursor: submitting ? "default" : "pointer",
                }}
              >
                <span
                  className="font-sans font-semibold block"
                  style={{ fontSize: 14, color: selected ? BLUE : INK, marginBottom: 2 }}
                >
                  {f.label}
                </span>
                <span className="font-sans block" style={{ fontSize: 12, color: FAINT, lineHeight: 1.4 }}>
                  {f.description}
                </span>
              </button>
            );
          })}
        </div>

        {/* Optional focus — only appears once a format is chosen */}
        {format && (
          <div className="mb-5">
            <label
              className="font-mono uppercase block mb-2"
              style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}
            >
              What&apos;s the main point? (optional)
            </label>
            <input
              value={focus}
              onChange={(e) => setFocus(e.target.value)}
              disabled={submitting}
              placeholder="e.g. the lesson I learned, not just what happened"
              className="w-full outline-none font-sans"
              style={{
                fontSize: 16,
                color: INK,
                padding: "10px 12px",
                border: `1px solid ${BORDER}`,
                borderRadius: 0,
                background: "#fff",
              }}
              autoFocus
            />
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="font-sans"
            style={{ fontSize: 13, color: "#B91C1C", marginBottom: 10, lineHeight: 1.45 }}
          >
            {error}
          </p>
        )}

        <button
          onClick={handleSubmit}
          disabled={!format || submitting}
          className="w-full py-3 font-sans font-semibold text-[14px]"
          style={{
            background: format ? BLUE : BORDER,
            color: format ? "#fff" : FAINT,
            border: "none",
            borderRadius: 0,
            cursor: !format || submitting ? "default" : "pointer",
          }}
        >
          {submitting ? "Writing..." : "Write draft →"}
        </button>
      </div>
    </div>
  );
}
