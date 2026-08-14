"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
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
import { upsertProfile } from "@/lib/supabase/profiles";
import { createClient } from "@/lib/supabase/client";
import posthog from "posthog-js";

const INK = "#1A1A18";
const BLUE = "#1A1A18";
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

type Phase = "intro" | "pairs" | "loading" | "result";

const GREEN = "#4FA97E";

export default function VoiceDiscoveryPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [currentPair, setCurrentPair] = useState(0);
  const [choices, setChoices] = useState<("a" | "b")[]>([]);
  // Null until the user actually taps/clicks an option — never defaults to
  // "a" or 0, and resets on every new pair so nothing carries over.
  const [selectedChoice, setSelectedChoice] = useState<"a" | "b" | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [result, setResult] = useState<{
    dimensions: VoiceDimensions;
    topTraits: string[];
    edge: string;
    gap: string;
  } | null>(null);

  // Check auth status on mount
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
  }, []);

  // Every new pair starts with nothing selected — covers both advancing
  // forward and going Back to a previous question.
  useEffect(() => {
    setSelectedChoice(null);
  }, [currentPair]);

  // WebKit re-evaluates :hover against whatever's under a *stationary*
  // cursor right after a layout change (confirmed via Playwright's webkit
  // engine) — not just on genuine pointer movement. Gating the hover CSS
  // class behind a real mousemove event, reset each pair, closes that gap
  // for desktop Safari on top of the (hover: hover) media query, which
  // already rules touch devices out entirely.
  const [pointerHasMoved, setPointerHasMoved] = useState(false);
  useEffect(() => {
    setPointerHasMoved(false);
    const onMove = () => setPointerHasMoved(true);
    window.addEventListener("mousemove", onMove, { once: true });
    return () => window.removeEventListener("mousemove", onMove);
    // currentPair alone misses the intro -> pairs transition into question 1,
    // since currentPair is already 0 both before and after entering "pairs".
  }, [phase, currentPair]);

  // Shows the tap as selected for a beat before advancing, so there's
  // visible confirmation instead of an instant, jarring jump to the next
  // pair. selectedChoice is reset by the pair-change effect below.
  const SELECTION_FLASH_MS = 280;
  function handleSelect(choice: "a" | "b") {
    if (selectedChoice) return; // ignore taps while already advancing
    setSelectedChoice(choice);
    setTimeout(() => handleChoice(choice), SELECTION_FLASH_MS);
  }

  async function handleChoice(choice: "a" | "b") {
    const newChoices = [...choices, choice];
    setChoices(newChoices);

    if (newChoices.length < VOICE_PAIRS.length) {
      setCurrentPair(currentPair + 1);
    } else {
      setPhase("loading");
      const dimensions = scorePairs(newChoices);
      const topTraits = getTopTraits(dimensions);

      // Generate edge/gap (no auth required for this endpoint)
      let edge = "";
      let gap = "";
      try {
        const res = await fetch("/api/voice-result", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dimensions, businessContext: "" }),
        });
        const data = await res.json();
        edge = data.edge || "";
        gap = data.gap || "";
      } catch (err) {
        console.error("voice-result fetch error:", err);
      }

      if (!edge) edge = "Your combination of traits creates a voice that stands out. See the full report for details.";
      if (!gap) gap = "Every voice has blind spots. Your full report includes personalized tips.";

      const voiceProfile: VoiceProfile = {
        dimensions,
        top_traits: topTraits,
        edge,
        gap,
        completed_at: new Date().toISOString(),
      };

      // If logged in, save directly. Otherwise, store in localStorage — not
      // sessionStorage, which dies with the tab. This is a stopgap; the
      // profile still doesn't survive a fresh browser/device, only a closed
      // tab. Server-side persistence with an anon id replaces this later.
      if (isLoggedIn) {
        await upsertProfile({
          voice_profile: voiceProfile,
          onboarding_completed: true,
        });
      } else {
        localStorage.setItem("pending_voice_profile", JSON.stringify(voiceProfile));
      }

      posthog.capture("voice_discovery_completed", {
        top_traits: topTraits,
        dimensions,
      });

      // The full report is shown on screen for everyone at this point — no email required.
      posthog.capture("voice_report_viewed");

      // If this quiz was reached via the "sound more like you" invitation on
      // a profile-less draft, close the loop so we can measure follow-through.
      try {
        if (localStorage.getItem("voice_quiz_invitation_pending") === "1") {
          localStorage.removeItem("voice_quiz_invitation_pending");
          posthog.capture("voice_quiz_invitation_completed");
        }
      } catch {}

      setResult({ dimensions, topTraits, edge, gap });
      setPhase("result");
    }
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
        <Link
          href="/login"
          style={{
            position: "fixed",
            top: 20,
            right: 24,
            fontSize: 14,
            fontWeight: 600,
            color: INK,
            textDecoration: "none",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Log in
        </Link>
        <div style={{ maxWidth: 520, textAlign: "center" }}>
          <h1
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: INK,
              marginBottom: 16,
              lineHeight: 1.2,
              fontFamily: "'Fraunces', Georgia, serif",
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
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            You&apos;ll see 12 pairs of writing samples. Tap the one that sounds more like you. No right answers — just
            instinct.
          </p>
          <button
            onClick={() => setPhase("pairs")}
            style={{
              background: "#1A1A18",
              color: "#fff",
              border: "none",
              borderRadius: 0,
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
        <div
          style={{
            maxWidth: 600,
            margin: "0 auto 32px",
            width: "100%",
          }}
        >
          {/* Back button */}
          {currentPair > 0 && (
            <button
              onClick={() => {
                setCurrentPair(currentPair - 1);
                setChoices((prev) => prev.slice(0, -1));
              }}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                color: DIM,
                padding: "0 0 12px",
                fontFamily: "'DM Mono', monospace",
              }}
            >
              &larr; Back
            </button>
          )}
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
              fontFamily: "'DM Mono', monospace",
            }}
          >
            {currentPair + 1} / {VOICE_PAIRS.length}
          </p>
        </div>

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
                fontSize: 22,
                fontWeight: 700,
                color: INK,
                marginBottom: 16,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Which sounds more like you?
            </p>
            {(["a", "b"] as const).map((choice) => {
              const isSelected = selectedChoice === choice;
              return (
                <button
                  key={choice}
                  onClick={() => handleSelect(choice)}
                  disabled={selectedChoice !== null}
                  className={`voice-pair-option${pointerHasMoved ? " voice-pair-option-hover-ready" : ""}`}
                  aria-pressed={isSelected}
                  style={{
                    background: isSelected ? "#EAF6EF" : "#fff",
                    border: `1.5px solid ${isSelected ? GREEN : "#e5e5e5"}`,
                    boxShadow: isSelected ? `0 0 0 1px ${GREEN}` : "none",
                    borderRadius: 0,
                    padding: "24px 28px",
                    fontSize: 17,
                    lineHeight: 1.6,
                    color: INK,
                    textAlign: "left",
                    cursor: selectedChoice !== null ? "default" : "pointer",
                    transition: "border-color 0.15s, box-shadow 0.15s, background 0.15s",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {choice === "a" ? pair.optionA : pair.optionB}
                </button>
              );
            })}
          </div>
        </div>
        {/* Real-hover devices only — a JS mouseenter/mouseleave implementation
            here previously caused WebKit to apply the hover style as a
            phantom highlight right after the phase transition (no actual
            pointer movement needed to trigger it), and iOS Safari would get
            it stuck on the tapped option since touch synthesizes hover
            events that never cleanly fire mouseleave. */}
        <style>{`
          @media (hover: hover) and (pointer: fine) {
            /* !important: the button's own inline style sets border-color
               and box-shadow for the neutral/selected states on every
               render, which otherwise beats a plain (non-important)
               stylesheet rule regardless of :hover matching. */
            .voice-pair-option-hover-ready:hover:not(:disabled) {
              border-color: #1A1A18 !important;
              box-shadow: 0 0 0 1px #1A1A18 !important;
            }
          }
        `}</style>
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
          <p style={{ fontSize: 18, color: DIM, fontFamily: "'DM Sans', sans-serif" }}>Analyzing your voice...</p>
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
          <h1
            style={{
              fontSize: 36,
              fontWeight: 800,
              color: INK,
              marginBottom: 32,
              lineHeight: 1.2,
              fontFamily: "'Fraunces', Georgia, serif",
            }}
          >
            {result.topTraits.join(". ")}.
          </h1>

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
              const pct = ((norm + 1) / 2) * 100;
              return (
                <div key={key}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 13,
                      color: DIM,
                      marginBottom: 6,
                      fontFamily: "'DM Mono', monospace",
                    }}
                  >
                    <span>{labels.low}</span>
                    <span>{labels.high}</span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      background: "#e5e5e5",
                      borderRadius: 2,
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
                        background: INK,
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
              borderRadius: 0,
              padding: "28px 32px",
              marginBottom: 20,
              border: "1px solid #e5e5e5",
            }}
          >
            <h3
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 12,
                fontWeight: 700,
                color: INK,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 12,
              }}
            >
              Your edge
            </h3>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, color: INK, lineHeight: 1.65 }}>
              {result.edge}
            </p>
          </div>

          {/* Gap */}
          <div
            style={{
              background: "#fff",
              borderRadius: 0,
              padding: "28px 32px",
              marginBottom: 36,
              border: "1px solid #e5e5e5",
            }}
          >
            <h3
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 12,
                fontWeight: 700,
                color: "#8B7355",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 12,
              }}
            >
              Watch out for
            </h3>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, color: INK, lineHeight: 1.65 }}>
              {result.gap}
            </p>
          </div>

          {/* Writing tips per dimension */}
          <h2
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: 24,
              fontWeight: 600,
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
              marginBottom: 40,
            }}
          >
            {(Object.entries(result.dimensions) as [DimensionKey, number][]).map(([key, raw]) => {
              const norm = normalizeScore(key, raw);
              const labels = DIMENSION_LABELS[key];
              const label = norm >= 0 ? labels.high : labels.low;
              return (
                <div
                  key={key}
                  style={{
                    background: "#fff",
                    borderRadius: 0,
                    padding: "20px 24px",
                    border: "1px solid #e5e5e5",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 12,
                      fontWeight: 700,
                      color: INK,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      marginBottom: 8,
                    }}
                  >
                    {label}
                  </p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, color: INK, lineHeight: 1.6 }}>
                    {voiceTip(key, norm)}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Save the profile / continue */}
          {isLoggedIn ? (
            <div
              style={{
                background: "#fff",
                borderRadius: 0,
                padding: "28px 32px",
                border: "1px solid #e5e5e5",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: INK,
                  marginBottom: 20,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Your profile is saved.
              </p>
              <Link
                href="/voice/report"
                style={{
                  display: "block",
                  width: "100%",
                  background: "#1A1A18",
                  color: "#fff",
                  border: "none",
                  borderRadius: 0,
                  padding: "16px 0",
                  fontSize: 18,
                  fontWeight: 700,
                  textDecoration: "none",
                  boxSizing: "border-box",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                View full report
              </Link>
            </div>
          ) : (
            <div
              style={{
                background: "#fff",
                borderRadius: 0,
                padding: "28px 32px",
                border: "1px solid #e5e5e5",
              }}
            >
              <p
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: INK,
                  marginBottom: 4,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Keep this profile
              </p>
              <p
                style={{
                  fontSize: 15,
                  color: DIM,
                  marginBottom: 20,
                  lineHeight: 1.5,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Create a free account and it&apos;s saved — plus you can start writing in your voice right away.
              </p>
              {/* pending_voice_profile lives in localStorage now, so it's no
                  longer tab-scoped — but same-tab is still the natural UX
                  for a signup flow, so keeping default Link behavior. */}
              <Link
                href="/signup"
                onClick={() => {
                  try {
                    posthog.capture("voice_result_signup_clicked");
                  } catch {}
                }}
                style={{
                  display: "block",
                  width: "100%",
                  background: "#1A1A18",
                  color: "#fff",
                  border: "none",
                  borderRadius: 0,
                  padding: "16px 0",
                  fontSize: 18,
                  fontWeight: 700,
                  textAlign: "center",
                  textDecoration: "none",
                  boxSizing: "border-box",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Save my voice profile
              </Link>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
