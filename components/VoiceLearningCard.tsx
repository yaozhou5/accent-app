import type { VoiceLearningData } from "@/lib/supabase/voice-learning";

const INK = "#111827";
const DIM = "#6b7280";
const FAINT = "#9ca3af";
const BORDER = "#e0ddd5";

const STRUCTURAL_LABELS: Record<string, string> = {
  opener_style: "Opens with",
  closer_style: "Closes with",
  paragraph_length_tendency: "Paragraphs",
  fragment_usage: "Fragments",
};

const STRUCTURAL_VALUES: Record<string, string> = {
  question: "Questions",
  short: "Short, punchy lines",
  long: "Long sentences",
  medium: "Medium length",
  frequent: "Frequent",
  occasional: "Occasional",
  rare: "Rare",
};

export default function VoiceLearningCard({ data }: { data: VoiceLearningData | null }) {
  if (!data) return null;

  const habits = data.profile ? Object.entries(data.profile.structural_habits) : [];
  const avoidedWords = data.profile?.banned_words ?? [];
  const bestExamples = data.profile?.best_examples ?? [];

  return (
    <div
      style={{
        maxWidth: 620,
        margin: "20px auto 0",
        padding: "24px 28px",
        background: "#F0ECE4",
        border: `1px solid ${BORDER}`,
      }}
    >
      <p
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 11,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: FAINT,
          fontWeight: 500,
          margin: "0 0 12px",
        }}
      >
        Voice Learning
      </p>

      {data.sessionCount === 0 ? (
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: DIM, lineHeight: 1.6, margin: 0 }}>
          Run a draft through Voice Coach and edit it — Accent learns your voice from what you change.
        </p>
      ) : (
        <div>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: INK, margin: "0 0 16px" }}>
            <strong>{data.sessionCount}</strong> Voice Coach session{data.sessionCount === 1 ? "" : "s"} analyzed
          </p>

          {habits.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
              {habits.map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                  }}
                >
                  <span style={{ color: DIM }}>{STRUCTURAL_LABELS[key] || key}</span>
                  <span style={{ color: INK, fontWeight: 600 }}>{STRUCTURAL_VALUES[value] || value}</span>
                </div>
              ))}
            </div>
          )}

          {avoidedWords.length > 0 && (
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: DIM, marginBottom: 18 }}>
              Words you avoid: <span style={{ color: INK }}>{avoidedWords.join(", ")}</span>
            </p>
          )}

          {bestExamples.length > 0 && (
            <div>
              <p
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 10,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: FAINT,
                  margin: "0 0 8px",
                }}
              >
                Your voice at its best
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {bestExamples.slice(0, 3).map((ex, i) => (
                  <p
                    key={i}
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13,
                      color: INK,
                      fontStyle: "italic",
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    &ldquo;{ex}&rdquo;
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
