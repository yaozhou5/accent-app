"use client";

import { useState, useRef, useEffect, useMemo, type ReactNode } from "react";
import posthog from "posthog-js";
import ReviewMetrics, { computeMetrics, type MetricId, type MetricMatch } from "@/components/ReviewMetrics";

const INK = "#111827";
const BODY = "#4b5563";
const DIM = "#6b7280";
const FAINT = "#9ca3af";
const BLUE = "#1a1a1a";
const BORDER = "#e5e7eb";
const HIGHLIGHT = "#FEF3C7"; // amber-100

// Shared style for section labels: HOLDS, DRIFTS, VOICE NOTES, GRAMMAR.
const SECTION_LABEL: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: "0.05em",
  textTransform: "uppercase" as const,
  color: "#6b7280",
  display: "block",
  marginBottom: 8,
};

// --- Types ---

interface VoiceNote {
  index: number;
  passage: string;
  note: string;
  summary?: string;
  dimension?: string;
}

interface GrammarFix {
  original: string;
  replacement: string;
}

interface ReviewResult {
  overall_read: {
    voice_holds: string;
    voice_drifts: string;
  };
  voice_notes: VoiceNote[];
  grammar: {
    count: number;
    fixes: GrammarFix[];
  };
}

interface ReviewModeProps {
  onResultsChange?: (hasResults: boolean) => void;
  apiEndpoint?: string;
  maxWords?: number;
  footer?: ReactNode;
  initialText?: string;
}

// --- Helpers ---

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function normalizeForComparison(s: string): string {
  return s
    .replace(/[\u2018\u2019\u201A\u2039\u203A]/g, "'")
    .replace(/[\u201C\u201D\u201E\u00AB\u00BB]/g, '"')
    .replace(/[\u2012\u2013\u2014\u2015]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\s+/g, " ")
    .trim();
}

function findPassageIndex(text: string, passage: string): number {
  const exact = text.indexOf(passage);
  if (exact !== -1) return exact;
  const normText = normalizeForComparison(text);
  const normPassage = normalizeForComparison(passage);
  const normIdx = normText.indexOf(normPassage);
  if (normIdx === -1) return -1;
  let origIdx = 0;
  let normCount = 0;
  while (origIdx < text.length && normCount < normIdx) {
    if (/\s/.test(text[origIdx]) && origIdx > 0 && /\s/.test(text[origIdx - 1])) {
      origIdx++;
      continue;
    }
    origIdx++;
    normCount++;
  }
  while (origIdx < text.length && /\s/.test(text[origIdx]) && origIdx > 0 && /\s/.test(text[origIdx - 1])) origIdx++;
  return origIdx;
}

function findPassageEnd(text: string, passage: string, startIdx: number): number {
  const passageEnd = startIdx + passage.length;
  const exactSlice = text.slice(startIdx, passageEnd);
  if (normalizeForComparison(exactSlice) === normalizeForComparison(passage)) return passageEnd;
  const normPassage = normalizeForComparison(passage);
  let normCount = 0;
  let end = startIdx;
  while (end < text.length && normCount < normPassage.length) {
    if (/\s/.test(text[end]) && end > startIdx && /\s/.test(text[end - 1])) {
      end++;
      continue;
    }
    end++;
    normCount++;
  }
  return end;
}

function differsOnlyInWhitespace(a: string, b: string): boolean {
  return a.replace(/\s+/g, " ").trim() === b.replace(/\s+/g, " ").trim();
}

interface DiffToken {
  text: string;
  type: "same" | "removed" | "added";
}

function inlineWordDiff(original: string, replacement: string): DiffToken[] {
  const oldReal = original.split(/(\s+)/).filter((w) => w.trim());
  const newReal = replacement.split(/(\s+)/).filter((w) => w.trim());
  const m = oldReal.length,
    n = newReal.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--)
      dp[i][j] = oldReal[i] === newReal[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const tokens: DiffToken[] = [];
  let i = 0,
    j = 0;
  while (i < m && j < n) {
    if (oldReal[i] === newReal[j]) {
      if (tokens.length > 0) tokens.push({ text: " ", type: "same" });
      tokens.push({ text: newReal[j], type: "same" });
      i++;
      j++;
    } else if ((dp[i + 1]?.[j] ?? 0) >= (dp[i]?.[j + 1] ?? 0)) {
      if (tokens.length > 0) tokens.push({ text: " ", type: "same" });
      tokens.push({ text: oldReal[i], type: "removed" });
      i++;
    } else {
      if (tokens.length > 0) tokens.push({ text: " ", type: "same" });
      tokens.push({ text: newReal[j], type: "added" });
      j++;
    }
  }
  while (i < m) {
    if (tokens.length > 0) tokens.push({ text: " ", type: "same" });
    tokens.push({ text: oldReal[i], type: "removed" });
    i++;
  }
  while (j < n) {
    if (tokens.length > 0) tokens.push({ text: " ", type: "same" });
    tokens.push({ text: newReal[j], type: "added" });
    j++;
  }
  return tokens;
}

const ERROR_MESSAGES: Record<string, string> = {
  timeout: "That took too long. Try again?",
  rate_limited: "",
  daily_limit: "",
  upstream_error: "Something went wrong. Try again?",
  parse_error: "Couldn't parse the review. Try again?",
  auth_expired: "Your session expired. Sign in again.",
  bad_input: "Paste some text first.",
  too_long: "",
  network_error: "Couldn't reach the server. Check your connection.",
};
const DEFAULT_ERROR_MESSAGE = "Something went wrong. Try again?";

// --- Component ---

export default function ReviewMode({
  onResultsChange,
  apiEndpoint = "/api/review",
  maxWords,
  footer,
  initialText = "",
}: ReviewModeProps) {
  const [text, setText] = useState(initialText);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ReactNode>("");
  const [result, setResult] = useState<ReviewResult | null>(null);

  // Voice note state — notes start OPEN, click to fold ("shut")
  const [foldedNotes, setFoldedNotes] = useState<Set<number>>(new Set());
  const [hoveredNote, setHoveredNote] = useState<number | null>(null);
  const [dismissedNotes, setDismissedNotes] = useState<Set<number>>(new Set());
  const [acceptedNotes, setAcceptedNotes] = useState<Set<number>>(new Set());

  // Metrics highlight state
  const [activeMetric, setActiveMetric] = useState<MetricId>(null);

  // Grammar state
  const [grammarExpanded, setGrammarExpanded] = useState(false);
  const [skippedFixes, setSkippedFixes] = useState<Set<number>>(new Set());
  const [appliedFixes, setAppliedFixes] = useState<Set<number>>(new Set());
  const [draftText, setDraftText] = useState(text);

  const textDisplayRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const [copied, setCopied] = useState(false);

  const filteredFixes = result
    ? result.grammar.fixes
        .map((fix, origIdx) => ({ fix, origIdx }))
        .filter(({ fix }) => !differsOnlyInWhitespace(fix.original, fix.replacement))
    : [];
  const grammarCount = filteredFixes.length;

  const visibleNotes = result
    ? result.voice_notes.filter((n) => !dismissedNotes.has(n.index) && !acceptedNotes.has(n.index))
    : [];

  useEffect(() => {
    onResultsChange?.(result !== null);
  }, [result, onResultsChange]);

  // --- Handlers ---

  const handleSubmit = async () => {
    if (!text.trim() || loading) return;
    setLoading(true);
    setError("");
    setResult(null);
    setFoldedNotes(new Set());
    setDismissedNotes(new Set());
    setAcceptedNotes(new Set());
    setGrammarExpanded(false);
    setSkippedFixes(new Set());
    setAppliedFixes(new Set());
    setActiveMetric(null);

    const words = wordCount(text);
    if (maxWords && words > maxWords) {
      setError(
        <>
          That&apos;s {words.toLocaleString()} words — the limit here is {maxWords}. Paste a shorter section, or{" "}
          <a href="/login?redirect=/review" style={{ color: "#1a1a1a", fontWeight: 500 }}>
            sign in
          </a>{" "}
          to review up to 3,000 words.
        </>
      );
      setLoading(false);
      return;
    }

    posthog.capture("review_started", { word_count: words });

    try {
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        const reason = data.reason || "error";
        posthog.capture("review_failed", { reason });
        const msg = ERROR_MESSAGES[reason];
        if (reason === "rate_limited" || reason === "daily_limit" || reason === "too_long") {
          const serverMsg = data.error || DEFAULT_ERROR_MESSAGE;
          const parts = serverMsg.split("Sign in");
          if (parts.length === 2) {
            setError(
              <>
                {parts[0]}
                <a href="/login?redirect=/review" style={{ color: "#1a1a1a", fontWeight: 500 }}>
                  Sign in
                </a>
                {parts[1]}
              </>
            );
          } else {
            setError(serverMsg);
          }
        } else {
          setError(msg || DEFAULT_ERROR_MESSAGE);
        }
        setLoading(false);
        return;
      }

      setDraftText(text);
      setResult(data);
      posthog.capture("review_completed");
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {
      posthog.capture("review_failed", { reason: "network_error" });
      setError(ERROR_MESSAGES.network_error);
    }
    setLoading(false);
  };

  const handleToggleMetric = (id: MetricId) => {
    setActiveMetric(id);
    if (id !== null) {
      setTimeout(() => {
        const el = textDisplayRef.current?.querySelector("mark");
        el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 50);
    }
  };

  const handleToggleFold = (index: number) => {
    setFoldedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
        posthog.capture("voice_note_expanded", { index });
      } else {
        next.add(index);
      }
      return next;
    });
    setActiveMetric(null);
  };

  const handleAcceptNote = (index: number) => {
    setAcceptedNotes((prev) => new Set(prev).add(index));
    posthog.capture("voice_note_accepted", { index });
  };

  const handleDismissNote = (index: number) => {
    setDismissedNotes((prev) => new Set(prev).add(index));
    posthog.capture("voice_note_dismissed", { index });
  };

  const handleSkipFix = (index: number) => {
    setSkippedFixes((prev) => new Set(prev).add(index));
  };

  const handleApplyFix = (index: number) => {
    const entry = filteredFixes[index];
    if (!entry) return;
    const { fix } = entry;
    setDraftText((prev) => {
      const pos = prev.indexOf(fix.original);
      if (pos === -1) return prev;
      return prev.slice(0, pos) + fix.replacement + prev.slice(pos + fix.original.length);
    });
    setAppliedFixes((prev) => new Set(prev).add(index));
    posthog.capture("grammar_fix_applied", { index });
  };

  const handleCopyDraft = async () => {
    try {
      await navigator.clipboard.writeText(draftText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = draftText;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleReset = () => {
    setText("");
    setDraftText("");
    setResult(null);
    setError("");
    setFoldedNotes(new Set());
    setDismissedNotes(new Set());
    setAcceptedNotes(new Set());
    setGrammarExpanded(false);
    setSkippedFixes(new Set());
    setAppliedFixes(new Set());
    setActiveMetric(null);
  };

  // --- Passage regions for highlight ---

  const passageRegions = (() => {
    if (!result) return [];
    return visibleNotes
      .map((note) => {
        const start = findPassageIndex(draftText, note.passage);
        if (start === -1) return null;
        const end = findPassageEnd(draftText, note.passage, start);
        return { start, end, index: note.index };
      })
      .filter((r): r is { start: number; end: number; index: number } => r !== null)
      .sort((a, b) => a.start - b.start);
  })();

  const metricsData = useMemo(() => (result ? computeMetrics(draftText) : null), [result, draftText]);

  const activeMetricMatches: MetricMatch[] = useMemo(() => {
    if (!metricsData || !activeMetric) return [];
    if (activeMetric === "ai-tells") return metricsData.aiTells.matches;
    if (activeMetric === "hedges") return metricsData.hedges.matches;
    if (activeMetric === "borrowed") return metricsData.borrowed.matches;
    return [];
  }, [metricsData, activeMetric]);

  // --- Split draft into paragraphs, map notes to paragraph indices ---

  const paragraphs = draftText.split(/\n{2,}|\r\n(?:\r\n)+/).filter((p) => p.trim());

  // Map each visible note to the paragraph index containing its passage start
  const notesByParagraph = (() => {
    const map = new Map<number, VoiceNote[]>();
    if (!result) return map;

    const paraOffsets: { start: number; end: number }[] = [];
    let searchFrom = 0;
    for (const para of paragraphs) {
      const idx = draftText.indexOf(para, searchFrom);
      if (idx !== -1) {
        paraOffsets.push({ start: idx, end: idx + para.length });
        searchFrom = idx + para.length;
      }
    }

    for (const note of visibleNotes) {
      const passageStart = findPassageIndex(draftText, note.passage);
      if (passageStart === -1) continue;

      let paraIdx = paraOffsets.findIndex((p) => passageStart >= p.start && passageStart < p.end);
      if (paraIdx === -1) paraIdx = paraOffsets.length - 1;

      const existing = map.get(paraIdx) || [];
      existing.push(note);
      map.set(paraIdx, existing);
    }

    for (const [, notes] of map) {
      notes.sort((a, b) => {
        const aStart = findPassageIndex(draftText, a.passage);
        const bStart = findPassageIndex(draftText, b.passage);
        return aStart - bStart;
      });
    }

    return map;
  })();

  // --- Render a paragraph with highlights ---

  const renderParagraphWithHighlights = (paraText: string, paraStart: number) => {
    // Determine which regions to render within this paragraph
    type Region = { start: number; end: number; kind: "note" | "metric"; index?: number };
    const regions: Region[] = [];

    if (activeMetric && activeMetricMatches.length > 0) {
      for (const m of activeMetricMatches) {
        if (m.end > paraStart && m.start < paraStart + paraText.length) {
          regions.push({
            start: Math.max(m.start - paraStart, 0),
            end: Math.min(m.end - paraStart, paraText.length),
            kind: "metric",
          });
        }
      }
    } else {
      for (const r of passageRegions) {
        if (r.end > paraStart && r.start < paraStart + paraText.length) {
          regions.push({
            start: Math.max(r.start - paraStart, 0),
            end: Math.min(r.end - paraStart, paraText.length),
            kind: "note",
            index: r.index,
          });
        }
      }
    }

    if (regions.length === 0) return <>{paraText}</>;

    const parts: ReactNode[] = [];
    let cursor = 0;

    for (const region of regions) {
      if (region.start < cursor) continue;
      if (region.start > cursor) parts.push(<span key={`t-${cursor}`}>{paraText.slice(cursor, region.start)}</span>);

      const regionText = paraText.slice(region.start, region.end);

      if (region.kind === "metric") {
        parts.push(
          <mark
            key={`m-${region.start}`}
            style={{ color: "inherit", background: HIGHLIGHT, padding: "2px 0", borderRadius: 2 }}
          >
            {regionText}
          </mark>
        );
      } else {
        const isHovered = hoveredNote === region.index;
        parts.push(
          <mark
            key={`p-${region.index}`}
            data-passage-index={region.index}
            onClick={() => handleToggleFold(region.index!)}
            onMouseEnter={() => setHoveredNote(region.index!)}
            onMouseLeave={() => setHoveredNote(null)}
            style={{
              color: "inherit",
              background: isHovered ? HIGHLIGHT : "transparent",
              textDecorationLine: "underline",
              textDecorationStyle: "solid" as const,
              textDecorationColor: isHovered ? "transparent" : "#a8a29e",
              textUnderlineOffset: "3px",
              textDecorationThickness: "1px",
              padding: "2px 0",
              borderRadius: 2,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            {regionText}
          </mark>
        );
      }
      cursor = region.end;
    }

    if (cursor < paraText.length) parts.push(<span key={`t-${cursor}`}>{paraText.slice(cursor)}</span>);
    return <>{parts}</>;
  };

  // --- Render inline note ---

  const renderInlineNote = (note: VoiceNote) => {
    const isFolded = foldedNotes.has(note.index);
    const isHovered = hoveredNote === note.index;
    const summaryText = note.summary || note.dimension || "Voice";

    return (
      <div
        key={`note-${note.index}`}
        className="review-inline-note"
        data-note-index={note.index}
        onMouseEnter={() => setHoveredNote(note.index)}
        onMouseLeave={() => setHoveredNote(null)}
        onClick={() => handleToggleFold(note.index)}
        style={{
          margin: "-6px 0 26px 0",
          borderLeft: `2px solid ${isHovered ? "#4b5563" : "#b8a888"}`,
          padding: "2px 0 2px 18px",
          cursor: "pointer",
          maxHeight: isFolded ? 26 : 500,
          overflow: "hidden",
          opacity: isFolded ? 0.55 : 1,
          transition: "max-height 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.2s ease, border-color 0.15s ease",
        }}
      >
        {/* Dimension label + summary (visible when folded) */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, minHeight: 22 }}>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.06em",
              color: "#6b7280",
              textTransform: "uppercase" as const,
              flexShrink: 0,
            }}
          >
            {note.dimension || "Voice"}
          </span>
          {isFolded && (
            <span
              style={{
                fontSize: 13,
                color: "#9ca3af",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {summaryText}
            </span>
          )}
        </div>

        {/* Body text (hidden when folded via max-height) */}
        <p
          className="font-sans"
          style={{ fontSize: 15, lineHeight: 1.6, color: "#4b5563", marginTop: 8, maxWidth: "68ch" }}
        >
          {note.note}
        </p>

        {/* Noted / Dismiss buttons */}
        <div style={{ display: "flex", gap: 8, marginTop: 14 }} onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleAcceptNote(note.index)}
            className="font-mono"
            style={{
              fontSize: 11,
              color: FAINT,
              background: "none",
              border: `1px solid ${BORDER}`,
              borderRadius: 4,
              padding: "3px 10px",
              cursor: "pointer",
            }}
          >
            Noted
          </button>
          <button
            onClick={() => handleDismissNote(note.index)}
            className="font-mono"
            style={{
              fontSize: 11,
              color: FAINT,
              background: "none",
              border: `1px solid ${BORDER}`,
              borderRadius: 4,
              padding: "3px 10px",
              cursor: "pointer",
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    );
  };

  // --- Paste box (no results yet) ---
  if (!result) {
    return (
      <div style={{ maxWidth: 640 }}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your writing here..."
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
        {text.trim().length > 20 &&
          (() => {
            const words = wordCount(text);
            const overLimit = maxWords ? words > maxWords : false;
            return (
              <>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-mono" style={{ fontSize: 12, color: overLimit ? "#DC2626" : FAINT }}>
                    {words.toLocaleString()}
                    {maxWords ? ` / ${maxWords}` : ""} words
                  </span>
                  {overLimit && (
                    <span className="font-sans" style={{ fontSize: 13, color: "#DC2626" }}>
                      Paste a shorter section, or sign in for up to 3,000 words.
                    </span>
                  )}
                </div>
                {error && (
                  <p className="font-sans mt-4" style={{ fontSize: 14, color: "#DC2626" }}>
                    {error}
                  </p>
                )}
                <button
                  onClick={handleSubmit}
                  disabled={loading || overLimit}
                  className="mt-6 w-full py-3.5 font-sans font-semibold text-[15px] transition-transform hover:scale-[1.01] hover:-translate-y-px disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{ background: BLUE, color: "#fff", border: "none", borderRadius: 0, cursor: "pointer" }}
                >
                  {loading ? "Reading..." : "Get a read on this"}
                </button>
              </>
            );
          })()}
      </div>
    );
  }

  // --- Results ---

  // Build paragraph offsets for rendering
  const paraOffsets: number[] = [];
  let searchFrom = 0;
  for (const para of paragraphs) {
    const idx = draftText.indexOf(para, searchFrom);
    paraOffsets.push(idx !== -1 ? idx : searchFrom);
    searchFrom = (idx !== -1 ? idx : searchFrom) + para.length;
  }

  return (
    <div ref={resultsRef} style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Metrics strip */}
      {metricsData && (
        <ReviewMetrics text={draftText} activeMetric={activeMetric} onToggleMetric={handleToggleMetric} />
      )}

      {/* Holds / Drifts */}
      <div className="mb-6 rounded-[8px]" style={{ background: "#fdfcfb", border: "1px solid #ede9e6", padding: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <span style={SECTION_LABEL}>Holds</span>
            <p className="font-sans" style={{ fontSize: 14, color: "#57534e", lineHeight: 1.5, maxWidth: "68ch" }}>
              {result.overall_read.voice_holds}
            </p>
          </div>
          <div>
            <span style={SECTION_LABEL}>Drifts</span>
            <p className="font-sans" style={{ fontSize: 14, color: "#57534e", lineHeight: 1.5, maxWidth: "68ch" }}>
              {result.overall_read.voice_drifts}
            </p>
          </div>
        </div>
      </div>

      {/* Draft with inline notes */}
      <div ref={textDisplayRef}>
        {paragraphs.map((para, pi) => {
          const paraStart = paraOffsets[pi];
          const notesForPara = notesByParagraph.get(pi) || [];

          return (
            <div key={pi}>
              <p
                className="font-sans"
                style={{
                  fontSize: 16,
                  color: BODY,
                  lineHeight: 1.7,
                  maxWidth: "68ch",
                  whiteSpace: "pre-wrap",
                  marginBottom: 16,
                }}
              >
                {renderParagraphWithHighlights(para, paraStart)}
              </p>
              {notesForPara.map((note) => renderInlineNote(note))}
            </div>
          );
        })}
      </div>

      {/* Grammar fixes */}
      {grammarCount > 0 && (
        <div className="mb-6 mt-8">
          <button
            onClick={() => setGrammarExpanded(!grammarExpanded)}
            className="text-left"
            style={{
              ...SECTION_LABEL,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              marginBottom: grammarExpanded ? 12 : 0,
            }}
          >
            Grammar · {grammarCount} fix{grammarCount !== 1 ? "es" : ""}
            <span style={{ marginLeft: 6, fontSize: 9 }}>{grammarExpanded ? "▲" : "▼"}</span>
          </button>

          {grammarExpanded && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {filteredFixes.map(({ fix }, i) => {
                const isSkipped = skippedFixes.has(i);
                const isApplied = appliedFixes.has(i);
                const isDone = isSkipped || isApplied;
                const diffTokens = inlineWordDiff(fix.original, fix.replacement);
                return (
                  <div
                    key={i}
                    className="rounded-[8px]"
                    style={{ border: `1px solid ${BORDER}`, padding: 10, opacity: isDone ? 0.35 : 1 }}
                  >
                    <div
                      className="font-sans"
                      style={{ fontSize: 13, color: BODY, lineHeight: 1.6, wordBreak: "break-word" }}
                    >
                      {isDone ? (
                        <span style={{ color: DIM }}>
                          {isApplied ? fix.replacement : fix.original}
                          {isApplied && (
                            <span className="font-mono" style={{ marginLeft: 8, fontSize: 10, color: FAINT }}>
                              applied
                            </span>
                          )}
                        </span>
                      ) : (
                        diffTokens.map((tok, ti) =>
                          tok.type === "removed" ? (
                            <span
                              key={ti}
                              style={{ textDecorationLine: "line-through", color: "#DC2626", opacity: 0.7 }}
                            >
                              {tok.text}
                            </span>
                          ) : tok.type === "added" ? (
                            <span
                              key={ti}
                              style={{
                                textDecorationLine: "underline",
                                textDecorationColor: "#16A34A",
                                color: INK,
                                fontWeight: 500,
                              }}
                            >
                              {tok.text}
                            </span>
                          ) : (
                            <span key={ti}>{tok.text}</span>
                          )
                        )
                      )}
                    </div>
                    {!isDone && (
                      <div style={{ marginTop: 6, display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        <button
                          onClick={() => handleApplyFix(i)}
                          className="font-mono"
                          style={{
                            fontSize: 10,
                            color: INK,
                            background: "none",
                            border: `1px solid ${INK}`,
                            borderRadius: 4,
                            padding: "2px 7px",
                            cursor: "pointer",
                          }}
                        >
                          Apply
                        </button>
                        <button
                          onClick={() => handleSkipFix(i)}
                          className="font-mono"
                          style={{
                            fontSize: 10,
                            color: FAINT,
                            background: "none",
                            border: `1px solid ${BORDER}`,
                            borderRadius: 4,
                            padding: "2px 7px",
                            cursor: "pointer",
                          }}
                        >
                          Skip
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Copy + Review another piece */}
      <div className="mb-12 mt-6">
        {appliedFixes.size > 0 && (
          <button
            onClick={handleCopyDraft}
            className="font-sans"
            style={{
              fontSize: 14,
              color: "#F5F0E8",
              background: "#1f2937",
              border: "none",
              borderRadius: 4,
              padding: "10px 18px",
              cursor: "pointer",
            }}
          >
            {copied ? "Copied" : "Copy corrected text"}
          </button>
        )}
        <button
          onClick={handleReset}
          className="font-sans review-start-over"
          style={{
            fontSize: 14,
            color: "#6b7280",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            marginTop: 12,
            display: "block",
          }}
        >
          Review another piece
        </button>
        {footer}
      </div>

      <style>{`
        .review-start-over:hover { text-decoration: underline; }
        .review-inline-note:hover { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
