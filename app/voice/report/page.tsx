"use client";
import { useEffect, useState } from "react";
import { getProfile } from "@/lib/supabase/profiles";
import {
  DIMENSION_LABELS,
  normalizeScore,
  type DimensionKey,
  type VoiceProfile,
  type VoiceDimensions,
} from "@/lib/voice-dimensions";

const INK = "#1A1A18";
const BLUE = "#4A6CF7";
const DIM = "#6B6860";
const FAINT = "#A8A49C";
const CREAM = "#F7F4EF";

function voiceTip(key: DimensionKey, norm: number): string {
  const tips: Record<DimensionKey, { pos: string; neg: string }> = {
    directness: {
      pos: "Lead with your conclusion. Your reader should know your point in the first line — then decide whether to keep reading for the reasoning.",
      neg: "Your contextual style builds trust before making a point. Use it to walk readers through your thinking — but make sure the point lands clearly by the end.",
    },
    precision: {
      pos: "Numbers and specifics are your superpower. When you say '12 deals, up from 7,' the reader trusts you instantly. Keep using concrete proof.",
      neg: "You paint pictures instead of citing spreadsheets. That's memorable — but drop in one sharp number per post to anchor the story.",
    },
    temperature: {
      pos: "You let people in. Vulnerability makes your writing stick. Don't over-edit the honesty out — it's what makes readers feel something.",
      neg: "Your measured tone signals competence. To avoid sounding distant, add one personal moment per piece — just enough warmth to feel human.",
    },
    authority: {
      pos: "You take positions and stand behind them. That's rare and magnetic. Make sure you earn each declaration with evidence or experience.",
      neg: "You invite readers to think with you. That builds genuine engagement. Occasionally, try ending with a clear stance instead of a question.",
    },
    rhythm: {
      pos: "Short punchy sentences hit hard. Vary length occasionally — a longer sentence after three short ones creates emphasis through contrast.",
      neg: "Your flowing prose carries readers through complex ideas smoothly. Break up walls of text with a short sentence for emphasis.",
    },
    framing: {
      pos: "You open with scenes and stories. That's the hardest skill to teach and you have it naturally. Make sure the insight follows the story.",
      neg: "Your structured openings set clear expectations. Try starting one post with a specific moment — even one sentence of scene-setting adds dimension.",
    },
    energy: {
      pos: "You provoke. You challenge. That gets attention. Balance it by delivering on the promise — a bold opening needs substance behind it.",
      neg: "Your reflective tone attracts thoughtful readers. To grow your reach, try one post that starts with a bold, surprising claim.",
    },
  };
  return norm >= 0 ? tips[key].pos : tips[key].neg;
}

export default function VoiceReportPage() {
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProfile().then((p) => {
      setProfile((p?.voice_profile as VoiceProfile) || null);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: CREAM,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: DIM, fontSize: 18 }}>Loading your voice report...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: CREAM,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ color: DIM, fontSize: 18, marginBottom: 24 }}>No voice profile found.</p>
          <a
            href="/voice"
            style={{
              background: BLUE,
              color: "#fff",
              borderRadius: 12,
              padding: "14px 36px",
              fontSize: 16,
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Take the voice exercise
          </a>
        </div>
      </div>
    );
  }

  const dims = profile.dimensions;

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: CREAM,
        padding: "48px 24px 80px",
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        {/* Header */}
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: FAINT,
            marginBottom: 8,
          }}
        >
          Your Voice Profile
        </p>
        <h1
          style={{
            fontSize: 40,
            fontWeight: 800,
            color: INK,
            lineHeight: 1.15,
            marginBottom: 40,
          }}
        >
          {profile.top_traits.join(". ")}.
        </h1>

        {/* Spectrum bars */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 24,
            marginBottom: 48,
          }}
        >
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
                    fontSize: 14,
                    fontWeight: 600,
                    color: DIM,
                    marginBottom: 8,
                  }}
                >
                  <span>{labels.low}</span>
                  <span>{labels.high}</span>
                </div>
                <div
                  style={{
                    height: 10,
                    background: "#e5e5e5",
                    borderRadius: 5,
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: `${pct}%`,
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: BLUE,
                      boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Edge */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "28px 32px",
            marginBottom: 20,
            border: "1px solid #e5e5e5",
          }}
        >
          <h3
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: BLUE,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 12,
            }}
          >
            Your edge
          </h3>
          <p style={{ fontSize: 18, color: INK, lineHeight: 1.65 }}>{profile.edge}</p>
        </div>

        {/* Gap */}
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "28px 32px",
            marginBottom: 40,
            border: "1px solid #e5e5e5",
          }}
        >
          <h3
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#D97706",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 12,
            }}
          >
            Watch out for
          </h3>
          <p style={{ fontSize: 18, color: INK, lineHeight: 1.65 }}>{profile.gap}</p>
        </div>

        {/* Writing tips per dimension */}
        <h2
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: INK,
            marginBottom: 20,
          }}
        >
          Writing tips for your voice
        </h2>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            marginBottom: 48,
          }}
        >
          {(Object.entries(dims) as [DimensionKey, number][]).map(([key, raw]) => {
            const norm = normalizeScore(key, raw);
            const labels = DIMENSION_LABELS[key];
            const label = norm >= 0 ? labels.high : labels.low;
            return (
              <div
                key={key}
                style={{
                  background: "#fff",
                  borderRadius: 12,
                  padding: "20px 24px",
                  border: "1px solid #e5e5e5",
                }}
              >
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: BLUE,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    marginBottom: 8,
                  }}
                >
                  {label}
                </p>
                <p
                  style={{
                    fontSize: 16,
                    color: INK,
                    lineHeight: 1.6,
                  }}
                >
                  {voiceTip(key, norm)}
                </p>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <button
          onClick={() => {
            window.location.href = "/dashboard";
          }}
          style={{
            width: "100%",
            background: BLUE,
            color: "#fff",
            border: "none",
            borderRadius: 12,
            padding: "18px 0",
            fontSize: 18,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Start logging
        </button>
      </div>
    </div>
  );
}
