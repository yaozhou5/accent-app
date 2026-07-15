"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft } from "@/components/ArrowIcon";

const INK = "#111827";
const BODY = "#4b5563";
const DIM = "#6b7280";
const FAINT = "#9ca3af";
const BLUE = "#1a1a1a";
const BORDER = "#e5e7eb";

interface CoachFeedback {
  overall: string;
  structure_feedback: string;
  phrases_to_improve: Array<{ original: string; suggestion: string; reason: string }>;
  micro_lesson: { title: string; explanation: string };
}

export default function QuickCheckPage() {
  const [content, setContent] = useState("");
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<CoachFeedback | null>(null);
  const feedbackRef = useRef<HTMLDivElement>(null);

  const handleCheck = async () => {
    if (!content.trim() || checking) return;
    setChecking(true);
    try {
      const res = await fetch("/api/coach-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: content.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setFeedback(data);
        setTimeout(() => feedbackRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
    } catch {}
    setChecking(false);
  };

  return (
    <div className="min-h-screen" style={{ background: "#F5F0E8" }}>
      <div className="max-w-[640px] mx-auto px-5 py-6">
        <div className="flex items-center justify-between mb-6">
          <Link href="/dashboard" className="no-underline font-mono" style={{ fontSize: 13, color: FAINT }}>
            <ArrowLeft size={12} /> Back
          </Link>
        </div>

        <span
          className="font-mono uppercase block mb-2"
          style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}
        >
          Quick check
        </span>
        <p className="font-sans mb-6" style={{ fontSize: 16, color: DIM }}>
          Paste a draft. Get feedback and one lesson.
        </p>

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste your draft here..."
          className="w-full outline-none resize-y font-sans"
          style={{
            fontSize: 16,
            color: INK,
            lineHeight: 1.8,
            padding: 0,
            border: "none",
            background: "transparent",
            minHeight: "35vh",
          }}
          autoFocus
        />

        {content.trim().length > 20 && (
          <button
            onClick={handleCheck}
            disabled={checking}
            className="mt-6 w-full py-3.5 font-sans font-semibold text-[15px] transition-transform hover:scale-[1.01] hover:-translate-y-px disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: BLUE, color: "#fff", border: "none", borderRadius: 0, cursor: "pointer" }}
          >
            {checking ? "Checking..." : "Check my writing"}
          </button>
        )}

        {feedback && (
          <div ref={feedbackRef} className="mt-8 space-y-5 pb-12">
            <div className="p-4 rounded-[10px]" style={{ background: "#fafafa", border: `1px solid ${BORDER}` }}>
              <span
                className="font-mono uppercase block mb-2"
                style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}
              >
                Overall
              </span>
              <p className="font-sans" style={{ fontSize: 16, color: INK, lineHeight: 1.6 }}>
                {feedback.overall}
              </p>
            </div>

            {feedback.structure_feedback && (
              <div className="p-4 rounded-[10px]" style={{ background: "#fafafa", border: `1px solid ${BORDER}` }}>
                <span
                  className="font-mono uppercase block mb-2"
                  style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}
                >
                  Structure
                </span>
                <p className="font-sans" style={{ fontSize: 16, color: INK, lineHeight: 1.6 }}>
                  {feedback.structure_feedback}
                </p>
              </div>
            )}

            {feedback.phrases_to_improve.length > 0 && (
              <div className="space-y-3">
                <span
                  className="font-mono uppercase block"
                  style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}
                >
                  Phrases to improve
                </span>
                {feedback.phrases_to_improve.map((p, i) => (
                  <div key={i} className="p-4 rounded-[10px]" style={{ border: `1px solid ${BORDER}` }}>
                    <p className="font-sans line-through" style={{ fontSize: 16, color: DIM }}>
                      {p.original}
                    </p>
                    <p className="font-sans font-semibold mt-1" style={{ fontSize: 16, color: INK }}>
                      {p.suggestion}
                    </p>
                    <p className="font-mono mt-1" style={{ fontSize: 13, color: FAINT }}>
                      {p.reason}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {feedback.micro_lesson && (
              <div className="p-4 rounded-[10px]" style={{ borderLeft: `3px solid ${BLUE}`, background: `${BLUE}04` }}>
                <span
                  className="font-mono uppercase block mb-1"
                  style={{ fontSize: 11, letterSpacing: "0.05em", color: BLUE, fontWeight: 500 }}
                >
                  Lesson
                </span>
                <p className="font-serif mb-2" style={{ fontSize: 16, fontWeight: 600, color: INK }}>
                  {feedback.micro_lesson.title}
                </p>
                <p className="font-sans" style={{ fontSize: 16, color: DIM, lineHeight: 1.6 }}>
                  {feedback.micro_lesson.explanation}
                </p>
              </div>
            )}

            <button
              onClick={() => setFeedback(null)}
              className="font-mono"
              style={{ fontSize: 13, color: FAINT, background: "none", border: "none", cursor: "pointer" }}
            >
              Dismiss feedback
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
