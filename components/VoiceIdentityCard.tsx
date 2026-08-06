import { DIMENSION_LABELS, normalizeScore, type DimensionKey, type VoiceProfile } from "@/lib/voice-dimensions";

const INK = "#111827";
const DIM = "#6b7280";
const FAINT = "#9ca3af";
const BORDER = "#e0ddd5";

export default function VoiceIdentityCard({ voiceProfile }: { voiceProfile: VoiceProfile | null }) {
  if (!voiceProfile) {
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
          Voice Test
        </p>
        <p
          style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: DIM, lineHeight: 1.6, margin: "0 0 16px" }}
        >
          Take the 60-second voice exercise to find your writing identity.
        </p>
        <a
          href="/voice"
          style={{
            display: "inline-block",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            fontWeight: 600,
            color: "#fff",
            background: "#1a1a1a",
            padding: "10px 20px",
            textDecoration: "none",
          }}
        >
          Discover your voice
        </a>
      </div>
    );
  }

  const dims = voiceProfile.dimensions;

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
        Voice Test
      </p>

      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 20, fontWeight: 800, color: INK, margin: "0 0 20px" }}>
        {voiceProfile.top_traits.join(". ")}.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
        {(Object.entries(dims) as [DimensionKey, number][]).map(([key, raw]) => {
          const norm = normalizeScore(key, raw);
          const labels = DIMENSION_LABELS[key];
          const pct = ((norm + 1) / 2) * 100;
          return (
            <div key={key}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  color: DIM,
                  marginBottom: 4,
                }}
              >
                <span>{labels.low}</span>
                <span>{labels.high}</span>
              </div>
              <div style={{ height: 6, background: "#e5e5e5", borderRadius: 3, position: "relative" }}>
                <div
                  style={{
                    position: "absolute",
                    left: `${pct}%`,
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: "#1a1a1a",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
        <div>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "#4A6CF7",
              margin: "0 0 6px",
            }}
          >
            Your edge
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: INK, lineHeight: 1.6, margin: 0 }}>
            {voiceProfile.edge}
          </p>
        </div>
        <div>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "#8B7355",
              margin: "0 0 6px",
            }}
          >
            Watch out for
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: INK, lineHeight: 1.6, margin: 0 }}>
            {voiceProfile.gap}
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <a
          href="/voice/report"
          style={{
            flex: 1,
            textAlign: "center",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: "#fff",
            background: "#1a1a1a",
            padding: "10px 0",
            textDecoration: "none",
          }}
        >
          View full report
        </a>
        <a
          href="/voice"
          style={{
            flex: 1,
            textAlign: "center",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 13,
            fontWeight: 600,
            color: DIM,
            border: `1px solid ${BORDER}`,
            padding: "10px 0",
            textDecoration: "none",
          }}
        >
          Retake test
        </a>
      </div>
    </div>
  );
}
