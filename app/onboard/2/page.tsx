"use client";
import { useState } from "react";
import { upsertProfile, getProfile } from "@/lib/supabase/profiles";
import {
  VOICE_PAIRS,
  DIMENSION_LABELS,
  scorePairs,
  getTopTraits,
  normalizeScore,
  type DimensionKey,
  type VoiceProfile,
  type VoiceDimensions,
} from "@/lib/voice-dimensions";
import posthog from "posthog-js";

const INK = "#1A1A18";
const BLUE = "#4A6CF7";
const DIM = "#6B6860";
const FAINT = "#A8A49C";
const CREAM = "#F7F4EF";

type Phase = "intro" | "pairs" | "loading" | "result";

export default function VoiceDiscoveryPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [currentPair, setCurrentPair] = useState(0);
  const [choices, setChoices] = useState<("a" | "b")[]>([]);
  const [result, setResult] = useState<{
    dimensions: VoiceDimensions;
    topTraits: string[];
    edge: string;
    gap: string;
  } | null>(null);

  async function handleChoice(choice: "a" | "b") {
    const newChoices = [...choices, choice];
    setChoices(newChoices);

    if (newChoices.length < VOICE_PAIRS.length) {
      setCurrentPair(currentPair + 1);
    } else {
      // All 12 pairs answered — score and generate result
      setPhase("loading");
      const dimensions = scorePairs(newChoices);
      const topTraits = getTopTraits(dimensions);

      // Get business context from profile
      const profile = await getProfile();
      const businessContext = [profile?.business_description, profile?.interview_q1, profile?.interview_q3]
        .filter(Boolean)
        .join(" ");

      // Generate edge/gap
      let edge = "";
      let gap = "";
      try {
        const res = await fetch("/api/voice-result", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dimensions, businessContext }),
        });
        const data = await res.json();
        edge = data.edge || "";
        gap = data.gap || "";
      } catch {
        edge = "Your voice has a distinctive combination of traits that sets you apart.";
        gap = "Keep experimenting with the edges of your style.";
      }

      const voiceProfile: VoiceProfile = {
        dimensions,
        top_traits: topTraits,
        edge,
        gap,
        completed_at: new Date().toISOString(),
      };

      // Save to profile
      await upsertProfile({
        voice_profile: voiceProfile,
        onboarding_completed: true,
      });

      posthog.capture("voice_discovery_completed", {
        top_traits: topTraits,
        dimensions,
      });

      setResult({ dimensions, topTraits, edge, gap });
      setPhase("result");
    }
  }

  function handleFinish() {
    window.location.href = "/dashboard";
  }

  // --- INTRO SCREEN ---
  if (phase === "intro") {
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
        <div style={{ maxWidth: 520, textAlign: "center" }}>
          <h1
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: INK,
              marginBottom: 16,
              lineHeight: 1.2,
            }}
          >
            Find your voice in 60 seconds
          </h1>
          <p
            style={{
              fontSize: 18,
              color: DIM,
              lineHeight: 1.6,
              marginBottom: 32,
            }}
          >
            You&apos;ll see 12 pairs of writing samples. Tap the one that sounds more like you. No right answers — just
            instinct.
          </p>
          <button
            onClick={() => setPhase("pairs")}
            style={{
              background: BLUE,
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "16px 48px",
              fontSize: 18,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Start
          </button>
        </div>
      </div>
    );
  }

  // --- PAIRS SCREEN ---
  if (phase === "pairs") {
    const pair = VOICE_PAIRS[currentPair];
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: CREAM,
          display: "flex",
          flexDirection: "column",
          padding: 24,
        }}
      >
        {/* Progress bar */}
        <div
          style={{
            maxWidth: 600,
            margin: "0 auto 32px",
            width: "100%",
          }}
        >
          <div
            style={{
              height: 4,
              background: "#e5e5e5",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${((currentPair + 1) / VOICE_PAIRS.length) * 100}%`,
                background: BLUE,
                borderRadius: 2,
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <p
            style={{
              textAlign: "center",
              fontSize: 13,
              color: FAINT,
              marginTop: 8,
            }}
          >
            {currentPair + 1} / {VOICE_PAIRS.length}
          </p>
        </div>

        {/* Pair question */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              maxWidth: 800,
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <p
              style={{
                textAlign: "center",
                fontSize: 15,
                color: FAINT,
                marginBottom: 8,
              }}
            >
              Which sounds more like you?
            </p>
            {(["a", "b"] as const).map((choice) => (
              <button
                key={choice}
                onClick={() => handleChoice(choice)}
                style={{
                  background: "#fff",
                  border: "1.5px solid #e5e5e5",
                  borderRadius: 12,
                  padding: "24px 28px",
                  fontSize: 17,
                  lineHeight: 1.6,
                  color: INK,
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLElement).style.borderColor = BLUE;
                  (e.target as HTMLElement).style.boxShadow = `0 0 0 1px ${BLUE}`;
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLElement).style.borderColor = "#e5e5e5";
                  (e.target as HTMLElement).style.boxShadow = "none";
                }}
              >
                {choice === "a" ? pair.optionA : pair.optionB}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- LOADING SCREEN ---
  if (phase === "loading") {
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
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: `3px solid #e5e5e5`,
              borderTopColor: BLUE,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ fontSize: 18, color: DIM }}>Analyzing your voice...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // --- RESULT SCREEN ---
  if (phase === "result" && result) {
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
        <div style={{ maxWidth: 600, width: "100%" }}>
          {/* Top traits headline */}
          <h1
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: INK,
              marginBottom: 32,
              lineHeight: 1.2,
            }}
          >
            {result.topTraits.join(". ")}.
          </h1>

          {/* Spectrum bars */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 20,
              marginBottom: 36,
            }}
          >
            {(Object.entries(result.dimensions) as [DimensionKey, number][]).map(([key, raw]) => {
              const norm = normalizeScore(key, raw);
              const labels = DIMENSION_LABELS[key];
              const pct = ((norm + 1) / 2) * 100; // -1..+1 → 0..100%
              return (
                <div key={key}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                      color: DIM,
                      marginBottom: 6,
                    }}
                  >
                    <span>{labels.low}</span>
                    <span>{labels.high}</span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      background: "#e5e5e5",
                      borderRadius: 4,
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        left: `${pct}%`,
                        top: "50%",
                        transform: "translate(-50%, -50%)",
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        background: BLUE,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Edge */}
          <div style={{ marginBottom: 24 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: FAINT,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 8,
              }}
            >
              Your edge
            </h3>
            <p style={{ fontSize: 17, color: INK, lineHeight: 1.6 }}>{result.edge}</p>
          </div>

          {/* Gap */}
          <div style={{ marginBottom: 36 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 700,
                color: FAINT,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 8,
              }}
            >
              Watch out for
            </h3>
            <p style={{ fontSize: 17, color: INK, lineHeight: 1.6 }}>{result.gap}</p>
          </div>

          {/* CTA */}
          <button
            onClick={handleFinish}
            style={{
              width: "100%",
              background: BLUE,
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "16px 0",
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

  return null;
}
