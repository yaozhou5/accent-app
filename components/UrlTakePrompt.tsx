"use client";

import { useState } from "react";

const INK = "#111827";
const BODY = "#4b5563";
const DIM = "#6b7280";
const BLUE = "#1a1a1a";
const BORDER = "#e5e7eb";

interface UrlTakePromptProps {
  url: string;
  onSubmit: (take: string) => void;
  onClose: () => void;
}

// Shown instead of the format picker when a note is just a bare link — there's
// nothing to write from until the user says what they actually think of it.
export default function UrlTakePrompt({ url, onSubmit, onClose }: UrlTakePromptProps) {
  const [take, setTake] = useState("");

  const handleSubmit = () => {
    if (!take.trim()) return;
    onSubmit(take.trim());
  };

  return (
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)", zIndex: 100 }}
      onClick={onClose}
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
        <div className="flex items-center justify-between mb-2">
          <h2 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 20, fontWeight: 600, color: INK }}>
            What&apos;s your take on this?
          </h2>
          <button
            onClick={onClose}
            className="font-mono text-[12px]"
            style={{ color: DIM, background: "none", border: "none", cursor: "pointer" }}
          >
            Close ✕
          </button>
        </div>
        <p className="font-sans" style={{ fontSize: 13, color: DIM, lineHeight: 1.5, marginBottom: 16 }}>
          Share what stood out, what you agree or disagree with — even a sentence is enough.
        </p>

        {/* Link preview — just for reference, this is what they're reacting to */}
        <div className="p-3 mb-4" style={{ background: "#f9fafb", border: `1px solid ${BORDER}` }}>
          <p className="font-mono" style={{ fontSize: 12, color: BODY, wordBreak: "break-all" }}>
            {url}
          </p>
        </div>

        <textarea
          value={take}
          onChange={(e) => setTake(e.target.value)}
          placeholder="e.g. This matches what I've seen with..."
          className="w-full outline-none font-sans"
          style={{
            fontSize: 14,
            color: INK,
            lineHeight: 1.6,
            padding: "10px 12px",
            border: `1px solid ${BORDER}`,
            borderRadius: 0,
            background: "#fff",
            minHeight: 90,
            resize: "vertical",
            marginBottom: 16,
          }}
          autoFocus
        />

        <button
          onClick={handleSubmit}
          disabled={!take.trim()}
          className="w-full py-3 font-sans font-semibold text-[14px]"
          style={{
            background: take.trim() ? BLUE : BORDER,
            color: take.trim() ? "#fff" : DIM,
            border: "none",
            borderRadius: 0,
            cursor: take.trim() ? "pointer" : "default",
          }}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
