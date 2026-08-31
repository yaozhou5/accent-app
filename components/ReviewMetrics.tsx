"use client";

import { useMemo } from "react";
import { ALL_AI_PHRASES } from "@/lib/ai-phrases";

// --- Types ---

export interface MetricMatch {
  start: number;
  end: number;
}

export type MetricId = "ai-tells" | "hedges" | "borrowed" | null;

export interface MetricsResult {
  aiTells: { count: number; per100: number; matches: MetricMatch[] };
  hedges: { count: number; per100: number; matches: MetricMatch[] };
  borrowed: { count: number; per100: number; matches: MetricMatch[] };
  sentenceVariation: {
    bars: number[]; // word counts per sentence
    sd: number;
    tooShort: boolean; // <8 sentences
  };
  // Per-word hit counts for over-triggering candidates (dev diagnostics)
  _overTriggerReport: Record<string, number>;
}

// --- Constants ---

const HEDGE_PHRASES = [
  "kind of",
  "sort of",
  "sort of like",
  "I think",
  "maybe",
  "just",
  "a bit",
  "a little",
  "slightly",
  "somewhat",
  "perhaps",
  "fairly",
  "rather",
  "I guess",
  "arguably",
  "I wanna say",
  "I would say",
  "I'd say",
  "in some way",
  "in a way",
  "more or less",
  "pretty much",
  "if that makes sense",
  "or something",
  "I mean",
  "you know",
  "I feel like",
  "seems like",
  "tends to",
];

// Over-triggering candidates to report individually
const HEDGE_WATCH = new Set(["just", "rather", "I mean", "you know"]);

const BORROWED_PATTERNS = [
  // "not X, but Y" — with optional comma
  /\bnot\s+\S+(?:\s+\S+){0,3},?\s+but\s+\S+/gi,
  // "it's not just X, it's Y"
  /\bit['']s\s+not\s+just\s+.{1,40},?\s+it['']s\s+/gi,
  // "X isn't X — it's Y" (em dash or hyphen)
  /\b\S+\s+isn['']t\s+\S+\s*[—–-]\s*it['']s\s+/gi,
];

// Abbreviations that shouldn't trigger sentence breaks
const ABBREVS =
  /\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|e\.g|i\.e|a\.m|p\.m|Inc|Ltd|Corp|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec|St|Ave|Blvd|Fig|No|Vol)\./gi;

// --- Matching functions ---

function findPhraseMatches(text: string, phrases: string[]): MetricMatch[] {
  const matches: MetricMatch[] = [];
  const lower = text.toLowerCase();
  for (const phrase of phrases) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`\\b${escaped}\\b`, "gi");
    let m: RegExpExecArray | null;
    while ((m = re.exec(lower)) !== null) {
      matches.push({ start: m.index, end: m.index + m[0].length });
    }
  }
  return matches.sort((a, b) => a.start - b.start);
}

function findRegexMatches(text: string, patterns: RegExp[]): MetricMatch[] {
  const matches: MetricMatch[] = [];
  for (const pattern of patterns) {
    const re = new RegExp(pattern.source, pattern.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      matches.push({ start: m.index, end: m.index + m[0].length });
    }
  }
  return matches.sort((a, b) => a.start - b.start);
}

// Sentence splitting: split on . ! ? followed by whitespace, but not after
// common abbreviations (Mr., e.g., i.e., etc.). Replace abbreviation dots
// with a placeholder, split, then restore.
function splitSentences(text: string): string[] {
  // Protect abbreviation dots
  const placeholder = "\x00";
  const protected_ = text.replace(ABBREVS, (m) => m.slice(0, -1) + placeholder);
  // Split on sentence-ending punctuation followed by whitespace or end
  const raw = protected_.split(/(?<=[.!?])\s+/);
  return raw
    .map((s) => s.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), ".").trim())
    .filter((s) => s.length > 0);
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// --- Main compute ---

export function computeMetrics(text: string): MetricsResult {
  const words = wordCount(text);
  const per100 = words > 0 ? 100 / words : 0;

  // AI tells
  const aiMatches = findPhraseMatches(text, ALL_AI_PHRASES);

  // Hedges
  const hedgeMatches = findPhraseMatches(text, HEDGE_PHRASES);

  // Over-trigger report for watched words
  const overTriggerReport: Record<string, number> = {};
  for (const word of [...HEDGE_WATCH, "leverage", "foster"]) {
    const re = new RegExp(`\\b${word}\\b`, "gi");
    const count = (text.match(re) || []).length;
    if (count > 0) overTriggerReport[word] = count;
  }

  // Borrowed structures
  const borrowedMatches = findRegexMatches(text, BORROWED_PATTERNS);

  // Sentence variation
  const sentences = splitSentences(text);
  const bars = sentences.map(wordCount);
  const sd = stdDev(bars);
  const tooShort = sentences.length < 8;

  return {
    aiTells: {
      count: aiMatches.length,
      per100: Math.round(aiMatches.length * per100 * 10) / 10,
      matches: aiMatches,
    },
    hedges: {
      count: hedgeMatches.length,
      per100: Math.round(hedgeMatches.length * per100 * 10) / 10,
      matches: hedgeMatches,
    },
    borrowed: {
      count: borrowedMatches.length,
      per100: Math.round(borrowedMatches.length * per100 * 10) / 10,
      matches: borrowedMatches,
    },
    sentenceVariation: { bars, sd, tooShort },
    _overTriggerReport: overTriggerReport,
  };
}

// --- Styles ---

const SECTION_LABEL_STYLE: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: 13,
  fontWeight: 500,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#1f2937",
};

const FAINT = "#a1a1aa";
const RULE_COLOR = "#e5e0d5";

// --- Component ---

interface ReviewMetricsProps {
  text: string;
  activeMetric: MetricId;
  onToggleMetric: (id: MetricId) => void;
}

const SERIF = "'Fraunces', Georgia, serif";

const EXPLANATIONS: Record<string, string> = {
  "ai-tells": "Phrases that show up constantly in machine-written text.",
  hedges: "Words that soften a claim. Not errors — but notice where they cluster.",
  borrowed: "Sentence shapes lifted from somewhere else.",
  variation: "How much your sentence lengths vary. Flat is a machine tell.",
};

// Cap height of 52px serif numeral, used for sparkline alignment
const NUMERAL_HEIGHT = 42; // approximate cap height at 52px

export default function ReviewMetrics({ text, activeMetric, onToggleMetric }: ReviewMetricsProps) {
  const metrics = useMemo(() => computeMetrics(text), [text]);
  const words = wordCount(text);

  const cols: { id: MetricId; label: string; count: number; per100: number; explainKey: string }[] = [
    {
      id: "ai-tells",
      label: "AI tells",
      count: metrics.aiTells.count,
      per100: metrics.aiTells.per100,
      explainKey: "ai-tells",
    },
    { id: "hedges", label: "Hedges", count: metrics.hedges.count, per100: metrics.hedges.per100, explainKey: "hedges" },
    {
      id: "borrowed",
      label: "Borrowed structures",
      count: metrics.borrowed.count,
      per100: metrics.borrowed.per100,
      explainKey: "borrowed",
    },
  ];

  const { bars, tooShort } = metrics.sentenceVariation;
  const maxBar = Math.max(...bars, 1);

  return (
    <div className="mb-8">
      <div style={{ marginBottom: 24 }}>
        <span style={{ fontFamily: SERIF, fontSize: 15, color: "#4b5563", display: "block" }}>
          Counted, not judged.
        </span>
        <span className="font-sans" style={{ fontSize: 15, color: "#78716c" }}>
          These are habits, not mistakes.
        </span>
      </div>

      <div className="review-metrics-grid" style={{ display: "grid" }}>
        {cols.map((col, ci) => {
          const isActive = activeMetric === col.id;
          const isZero = col.count === 0;
          const clickable = !isZero;
          return (
            <button
              key={col.id}
              onClick={clickable ? () => onToggleMetric(isActive ? null : col.id) : undefined}
              style={{
                background: "none",
                border: "none",
                borderLeft: ci > 0 ? "1px solid #e5e0d5" : "none",
                padding: "0 20px",
                paddingLeft: ci === 0 ? 0 : 20,
                cursor: clickable ? "pointer" : "default",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Label */}
              <span
                style={{
                  ...SECTION_LABEL_STYLE,
                  color: isActive ? "#1c1917" : "#6b7280",
                }}
              >
                {col.label}
              </span>

              {/* Numeral + rate on same baseline */}
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
                <span
                  style={{
                    fontFamily: SERIF,
                    fontSize: 52,
                    fontWeight: 400,
                    color: "#1c1917",
                    lineHeight: 1,
                    opacity: isZero ? 0.3 : 1,
                  }}
                >
                  {col.count}
                </span>
                {!isZero && words > 0 && (
                  <span style={{ fontFamily: "monospace", fontSize: 11, color: FAINT }}>{col.per100}/100w</span>
                )}
              </div>

              {/* Explanation */}
              <span
                className="font-sans"
                style={{
                  fontSize: 12,
                  color: isActive ? "#4b5563" : FAINT,
                  lineHeight: 1.4,
                  marginTop: 20,
                }}
              >
                {EXPLANATIONS[col.explainKey]}
              </span>
            </button>
          );
        })}

        {/* Column 4: Sentence variation — not clickable */}
        <div
          style={{
            borderLeft: "1px solid #e5e0d5",
            padding: "0 20px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span style={SECTION_LABEL_STYLE}>Sentence variation</span>

          {/* Sparkline at numeral height */}
          <div style={{ marginTop: 6, display: "flex", alignItems: "flex-end", gap: 2, height: NUMERAL_HEIGHT }}>
            {bars.map((wc, i) => (
              <div
                key={i}
                style={{
                  width: 3,
                  height: Math.max(2, (wc / maxBar) * NUMERAL_HEIGHT),
                  background: `rgba(28, 25, 23, ${tooShort ? 0.15 : 0.6})`,
                  borderRadius: 1,
                }}
              />
            ))}
          </div>

          {/* Rate position — "too short to measure" when applicable */}
          {tooShort && (
            <span style={{ fontFamily: "monospace", fontSize: 11, color: FAINT, marginTop: 4 }}>
              too short to measure
            </span>
          )}

          {/* Explanation */}
          <span
            className="font-sans"
            style={{
              fontSize: 12,
              color: FAINT,
              lineHeight: 1.4,
              marginTop: 20,
            }}
          >
            {EXPLANATIONS.variation}
          </span>
        </div>
      </div>

      <style>{`
        .review-metrics-grid {
          grid-template-columns: 1fr 1fr;
          row-gap: 24px;
        }
        .review-metrics-grid > *:nth-child(1),
        .review-metrics-grid > *:nth-child(3) {
          border-left: none !important;
          padding-left: 0 !important;
        }
        @media (min-width: 700px) {
          .review-metrics-grid {
            grid-template-columns: repeat(4, 1fr);
            row-gap: 0;
          }
          .review-metrics-grid > *:nth-child(3) {
            border-left: 1px solid #e5e0d5 !important;
            padding-left: 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
