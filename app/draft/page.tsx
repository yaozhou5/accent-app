"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const BG = "#FAF9F6";
const INK = "#1A1A18";
const DIM = "#6B6860";
const FAINT = "#A8A49C";

const TONE_COLORS: Record<string, string> = {
  sharper: "#C0392B", softer: "#7DCEA0", formal: "#5B7DB1", casual: "#E8A838",
  poetic: "#A569BD", direct: "#2C3E50", warm: "#E67E22", clinical: "#7F8C8D",
  urgent: "#E74C3C", playful: "#3498DB", darker: "#4A235A", lighter: "#58D68D",
  blunt: "#C0392B", tender: "#EC7063", precise: "#2980B9", bold: "#D35400",
};

type Suggestion = { word: string; tone: string; reason: string };

function getSentenceAround(text: string, cursorPos: number): string {
  const before = text.slice(0, cursorPos);
  const after = text.slice(cursorPos);
  const sentenceStart = Math.max(
    before.lastIndexOf(". ") + 2,
    before.lastIndexOf("! ") + 2,
    before.lastIndexOf("? ") + 2,
    before.lastIndexOf("\n") + 1,
    0
  );
  let sentenceEnd = cursorPos;
  const nextPeriod = after.search(/[.!?]\s/);
  if (nextPeriod !== -1) sentenceEnd = cursorPos + nextPeriod + 1;
  else sentenceEnd = text.length;
  return text.slice(sentenceStart, sentenceEnd).trim();
}

export default function DraftPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedWord, setSelectedWord] = useState("");
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const wordCount = body.trim() ? body.trim().split(/\s+/).length : 0;

  const handleMouseUp = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    if (start === end) return;

    const selected = body.slice(start, end).trim();
    if (!selected || selected.includes(" ") || selected.length > 30) return;

    // Get position for popup
    const rect = textarea.getBoundingClientRect();
    // Estimate position based on character offset
    const textBeforeSelection = body.slice(0, start);
    const lines = textBeforeSelection.split("\n");
    const lineHeight = 36; // approximate
    const charWidth = 10; // approximate
    const lineNum = lines.length;
    const colNum = lines[lines.length - 1].length;

    const x = Math.min(rect.left + colNum * charWidth, rect.right - 280);
    const y = rect.top + lineNum * lineHeight + 20;

    setSelectedWord(selected);
    setSelectionRange({ start, end });
    setPopupPos({ x: Math.max(16, x), y: Math.min(y, window.innerHeight - 300) });

    // Fetch suggestions
    const sentence = getSentenceAround(body, start);
    setLoading(true);
    setSuggestions([]);

    fetch("/api/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullText: body, selectedWord: selected, sentence }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.suggestions) setSuggestions(data.suggestions);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [body]);

  const handleReplace = (newWord: string) => {
    if (!selectionRange) return;
    const before = body.slice(0, selectionRange.start);
    const after = body.slice(selectionRange.end);
    setBody(before + newWord + after);
    dismiss();
  };

  const dismiss = () => {
    setPopupPos(null);
    setSuggestions([]);
    setSelectedWord("");
    setSelectionRange(null);
  };

  // Dismiss on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Dismiss when clicking outside popup
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        dismiss();
      }
    };
    if (popupPos) {
      window.addEventListener("mousedown", onClick);
      return () => window.removeEventListener("mousedown", onClick);
    }
  }, [popupPos]);

  return (
    <div className="min-h-screen relative" style={{ background: BG }}>
      {/* Word count */}
      <div
        className="fixed top-6 right-8 font-mono text-[12px] transition-opacity duration-500 pointer-events-none"
        style={{ color: FAINT, opacity: wordCount > 0 ? 1 : 0 }}
      >
        {wordCount} {wordCount === 1 ? "word" : "words"}
      </div>

      {/* Editor */}
      <div className="max-w-[680px] mx-auto px-6 pt-20 pb-40">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full font-serif bg-transparent border-none outline-none mb-6"
          style={{
            fontSize: 36,
            fontWeight: 400,
            color: INK,
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
          }}
        />
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onMouseUp={handleMouseUp}
          placeholder="Start writing..."
          className="w-full bg-transparent border-none outline-none resize-none"
          style={{
            fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif",
            fontSize: 19,
            color: INK,
            lineHeight: 1.9,
            minHeight: "60vh",
          }}
        />
      </div>

      {/* Suggestion popup */}
      {popupPos && (
        <div
          ref={popupRef}
          className="fixed z-50"
          style={{
            left: popupPos.x,
            top: popupPos.y,
            width: 280,
            background: "#fff",
            borderRadius: 12,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
            border: "1px solid rgba(0,0,0,0.08)",
            overflow: "hidden",
          }}
        >
          <div
            className="px-4 py-2.5 flex items-center justify-between"
            style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}
          >
            <span className="font-sans text-[12px] font-medium" style={{ color: DIM }}>
              Alternatives for &ldquo;{selectedWord}&rdquo;
            </span>
            <button
              onClick={dismiss}
              className="text-[16px] leading-none"
              style={{ color: FAINT, background: "none", border: "none", cursor: "pointer" }}
            >
              &times;
            </button>
          </div>

          {loading ? (
            <div className="px-4 py-6 text-center">
              <div className="font-sans text-[13px]" style={{ color: FAINT }}>
                Thinking...
              </div>
            </div>
          ) : (
            <div>
              {suggestions.map((s, i) => {
                const dotColor = TONE_COLORS[s.tone.toLowerCase()] || "#888";
                return (
                  <button
                    key={i}
                    onClick={() => handleReplace(s.word)}
                    className="w-full text-left px-4 py-3 transition-colors hover:bg-[#f5f4f0] flex flex-col gap-1"
                    style={{
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      borderBottom:
                        i < suggestions.length - 1
                          ? "1px solid rgba(0,0,0,0.04)"
                          : "none",
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="font-sans text-[15px] font-semibold"
                        style={{ color: INK }}
                      >
                        {s.word}
                      </span>
                      <span className="flex items-center gap-1">
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: dotColor,
                            display: "inline-block",
                          }}
                        />
                        <span
                          className="font-mono text-[10px] uppercase"
                          style={{ color: dotColor, letterSpacing: "0.04em" }}
                        >
                          {s.tone}
                        </span>
                      </span>
                    </div>
                    <span
                      className="font-sans text-[12px]"
                      style={{ color: DIM, lineHeight: 1.4 }}
                    >
                      {s.reason}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
