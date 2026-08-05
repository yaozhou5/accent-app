"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const INK = "#1A1A18";
const DIM = "#6B6860";
const FAINT = "#A8A49C";
const BG = "#F5F0E8";
const PEACH_BG = "#F3E1C8";
const PEACH_TEXT = "#5A3E1B";
const GREEN_BG = "#D8EDE1";
const GREEN_TEXT = "#1E4030";

type Phase = "log" | "coach";
const PHASES: Phase[] = ["log", "coach"];
const PHASE_DURATION = [5000, 9500];

const NOTE_TEXT =
  "Most people are treating AI like a reason to build more, but I think that's the wrong instinct. What we should be doing is subtracting, and saying no to more outputs, more features, more channels, just because they're cheap to produce. Cheap to make doesn't mean it should exist.";

const EDITED_LINES: { text: string; highlight: "peach" | "green" | "none" }[] = [
  { text: "Most people are treating AI like an opportunity to build more.", highlight: "peach" },
  { text: "More features, more content, more channels, because it costs almost nothing.", highlight: "peach" },
  { text: "But cheap to make doesn't mean it should exist.", highlight: "none" },
  {
    text: "The real discipline in an AI-first world is subtracting. Not what can I build, but what should I stop building.",
    highlight: "green",
  },
];

const ANNOTATION_CARDS = [
  {
    label: "TONE · QUESTION",
    before: "Most people are treating AI like a permission slip to build more.",
    after: "Most people are treating AI like an opportunity to build more.",
    note: "You swapped 'permission slip' for 'opportunity' — a softer opening than your usual edge.",
  },
  {
    label: "COMPRESSION · INSIGHT",
    before:
      "The real discipline in an AI-first world isn't generating, it's subtracting — saying no to the output that's easy to produce but doesn't need to be there.",
    after:
      "The real discipline in an AI-first world is subtracting. Not what can I build, but what should I stop building.",
    note: "You cut the throat-clearing and landed the line in half the words.",
  },
];

const YOUR_EDGE =
  "You instinctively end on a reframe rather than a conclusion — you hand readers a sharper way of thinking, not a verdict.";
const ONE_STRETCH =
  "Your closing reframe is your strongest move, but it's floating. Anchor it with one concrete example next time.";

export default function LandingDemo() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const phase = PHASES[phaseIndex];

  const [logNoteVisible, setLogNoteVisible] = useState(false);
  const [logFooterVisible, setLogFooterVisible] = useState(false);

  const [coachNoteVisible, setCoachNoteVisible] = useState(false);
  const [coachEditsVisible, setCoachEditsVisible] = useState(false);
  const [coachNoticeVisible, setCoachNoticeVisible] = useState(false);
  const [coachCardsVisible, setCoachCardsVisible] = useState([false, false]);
  const [coachFooterVisible, setCoachFooterVisible] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const advancePhase = useCallback(() => {
    setPhaseIndex((prev) => (prev + 1) % PHASES.length);
    setLogNoteVisible(false);
    setLogFooterVisible(false);
    setCoachNoteVisible(false);
    setCoachEditsVisible(false);
    setCoachNoticeVisible(false);
    setCoachCardsVisible([false, false]);
    setCoachFooterVisible(false);
  }, []);

  useEffect(() => {
    timerRef.current = setTimeout(advancePhase, PHASE_DURATION[phaseIndex]);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phaseIndex, advancePhase]);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    if (phase === "log") {
      timers.push(setTimeout(() => setLogNoteVisible(true), 500));
      timers.push(setTimeout(() => setLogFooterVisible(true), 1600));
    }
    if (phase === "coach") {
      timers.push(setTimeout(() => setCoachNoteVisible(true), 500));
      timers.push(setTimeout(() => setCoachEditsVisible(true), 1300));
      timers.push(setTimeout(() => setCoachNoticeVisible(true), 2200));
      timers.push(setTimeout(() => setCoachCardsVisible([true, false]), 3200));
      timers.push(setTimeout(() => setCoachCardsVisible([true, true]), 4400));
      timers.push(setTimeout(() => setCoachFooterVisible(true), 5600));
    }
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  const highlightStyle = (h: "peach" | "green" | "none") =>
    h === "peach"
      ? { background: PEACH_BG, color: PEACH_TEXT }
      : h === "green"
        ? { background: GREEN_BG, color: GREEN_TEXT }
        : {};

  return (
    <div style={{ maxWidth: 760, margin: "0 auto" }}>
      <div
        style={{
          background: BG,
          border: "1px solid #e0ddd5",
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
        }}
      >
        {/* Title bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "10px 14px",
            borderBottom: "1px solid #e0ddd5",
            background: "#FAFAF7",
          }}
        >
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#e0ddd5" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#e0ddd5" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#e0ddd5" }} />
          </div>
          <div style={{ flex: 1, textAlign: "center" }}>
            <span
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontStyle: "italic",
                fontSize: 13,
                fontWeight: 600,
                color: INK,
              }}
            >
              accent
            </span>
          </div>
          <div style={{ width: 42 }} />
        </div>

        {/* Mini nav — hidden during the Voice Coach phase, which is a full-screen editor with no tab bar */}
        {phase === "log" && (
          <div
            style={{
              display: "flex",
              gap: 2,
              padding: "8px 14px",
              borderBottom: "0.5px solid #e0ddd5",
              background: BG,
            }}
          >
            {[
              { id: "log", label: "Log" },
              { id: "playbooks", label: "Templates" },
              { id: "drafts", label: "Drafts" },
            ].map((t) => (
              <div
                key={t.id}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                  fontWeight: t.id === "log" ? 500 : 400,
                  color: t.id === "log" ? "#fff" : "#999",
                  background: t.id === "log" ? "#1a1a1a" : "transparent",
                  padding: "4px 10px",
                  transition: "all 0.3s ease",
                }}
              >
                {t.label}
              </div>
            ))}
          </div>
        )}

        {/* Content area */}
        <div style={{ minHeight: 440, padding: "18px 16px", position: "relative", background: BG }}>
          {/* LOG VIEW */}
          <div
            style={{
              position: "absolute",
              inset: "18px 16px",
              opacity: phase === "log" ? 1 : 0,
              transition: "opacity 0.4s ease",
              pointerEvents: phase === "log" ? "auto" : "none",
            }}
          >
            <h3
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: 20,
                fontWeight: 600,
                color: INK,
                margin: "0 0 4px",
              }}
            >
              Log
            </h3>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: FAINT, margin: "0 0 16px" }}>
              Start by capturing a few moments from your week.
            </p>

            <div style={{ background: "#fff", border: "1px solid #e0ddd5", padding: "16px 18px" }}>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12.5,
                  color: INK,
                  lineHeight: 1.6,
                  margin: 0,
                  minHeight: 66,
                  opacity: logNoteVisible ? 1 : 0,
                  transition: "opacity 0.5s ease",
                }}
              >
                {NOTE_TEXT}
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 14,
                  opacity: logFooterVisible ? 1 : 0,
                  transform: logFooterVisible ? "translateY(0)" : "translateY(4px)",
                  transition: "all 0.4s ease",
                }}
              >
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: FAINT }}>⌘↵ to log</span>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: DIM }}>Edit my draft →</span>
                  <div
                    style={{
                      background: INK,
                      color: "#fff",
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "6px 12px",
                    }}
                  >
                    + Log it
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* VOICE COACH VIEW */}
          <div
            style={{
              position: "absolute",
              inset: "18px 16px",
              display: "flex",
              gap: 14,
              opacity: phase === "coach" ? 1 : 0,
              transition: "opacity 0.4s ease",
              pointerEvents: phase === "coach" ? "auto" : "none",
            }}
          >
            {/* Left: draft + edits */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                <div style={{ background: INK, color: "#fff", padding: "6px 10px", flex: 1 }}>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#A8A49C", margin: 0 }}>
                    YOUR VOICE
                  </p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600, margin: "2px 0 0" }}>
                    Direct · Impressionistic · Warm
                  </p>
                </div>
                <div style={{ background: "#fff", border: "1px solid #e0ddd5", padding: "6px 10px" }}>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: FAINT, margin: 0 }}>FORMAT</p>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 600, margin: "2px 0 0" }}>
                    Quick take
                  </p>
                </div>
              </div>

              <div
                style={{
                  opacity: coachNoteVisible ? 1 : 0,
                  transition: "opacity 0.4s ease",
                  marginBottom: 10,
                }}
              >
                <p
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: FAINT,
                    margin: "0 0 4px",
                  }}
                >
                  Your note ▾
                </p>
                <div style={{ background: "#EFEBE3", padding: "8px 10px" }}>
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontStyle: "italic",
                      fontSize: 9.5,
                      color: DIM,
                      lineHeight: 1.5,
                      margin: 0,
                    }}
                  >
                    {NOTE_TEXT}
                  </p>
                </div>
              </div>

              <div
                style={{
                  opacity: coachEditsVisible ? 1 : 0,
                  transform: coachEditsVisible ? "translateY(0)" : "translateY(6px)",
                  transition: "all 0.45s ease",
                }}
              >
                <p
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: FAINT,
                    margin: "0 0 4px",
                  }}
                >
                  Edit text
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {EDITED_LINES.map((line, i) => (
                    <span
                      key={i}
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 10.5,
                        lineHeight: 1.5,
                        color: INK,
                        padding: line.highlight !== "none" ? "2px 4px" : 0,
                        ...highlightStyle(line.highlight),
                      }}
                    >
                      {line.text}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Voice Coach panel */}
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              <p
                style={{
                  fontFamily: "'Fraunces', Georgia, serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: INK,
                  margin: 0,
                }}
              >
                Voice Coach
              </p>

              <div
                style={{
                  background: "#fff",
                  border: "1px solid #e0ddd5",
                  padding: "8px 10px",
                  opacity: coachNoticeVisible ? 1 : 0,
                  transition: "opacity 0.4s ease",
                }}
              >
                <p
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: FAINT,
                    margin: "0 0 4px",
                  }}
                >
                  What I notice
                </p>
                <p
                  style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9.5, color: DIM, lineHeight: 1.5, margin: 0 }}
                >
                  You consistently strip away the AI&apos;s hedging, trusting the reader to arrive at the point without
                  being walked there.
                </p>
              </div>

              {ANNOTATION_CARDS.map((card, i) => (
                <div
                  key={card.label}
                  style={{
                    background: "#fff",
                    border: "1px solid #e0ddd5",
                    padding: "7px 9px",
                    opacity: coachCardsVisible[i] ? 1 : 0,
                    transform: coachCardsVisible[i] ? "translateY(0)" : "translateY(6px)",
                    transition: "all 0.4s ease",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 7.5,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: "#C4614A",
                      margin: "0 0 3px",
                    }}
                  >
                    {card.label}
                  </p>
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 9,
                      color: FAINT,
                      textDecoration: "line-through",
                      lineHeight: 1.4,
                      margin: "0 0 2px",
                    }}
                  >
                    {card.before}
                  </p>
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 9,
                      color: INK,
                      lineHeight: 1.4,
                      margin: "0 0 3px",
                    }}
                  >
                    {card.after}
                  </p>
                  <p
                    style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: DIM, lineHeight: 1.4, margin: 0 }}
                  >
                    {card.note}
                  </p>
                </div>
              ))}

              <div
                style={{
                  display: "flex",
                  gap: 6,
                  opacity: coachFooterVisible ? 1 : 0,
                  transition: "opacity 0.4s ease",
                }}
              >
                <div style={{ flex: 1, background: "#fff", border: "1px solid #e0ddd5", padding: "7px 9px" }}>
                  <p
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 7.5,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: FAINT,
                      margin: "0 0 3px",
                    }}
                  >
                    Your edge
                  </p>
                  <p
                    style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: DIM, lineHeight: 1.4, margin: 0 }}
                  >
                    {YOUR_EDGE}
                  </p>
                </div>
                <div style={{ flex: 1, background: "#fff", border: "1px solid #e0ddd5", padding: "7px 9px" }}>
                  <p
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: 7.5,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: FAINT,
                      margin: "0 0 3px",
                    }}
                  >
                    One stretch
                  </p>
                  <p
                    style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: DIM, lineHeight: 1.4, margin: 0 }}
                  >
                    {ONE_STRETCH}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Phase dots */}
        <div style={{ display: "flex", justifyContent: "center", gap: 6, padding: "12px 0", background: BG }}>
          {PHASES.map((_, i) => (
            <div
              key={i}
              style={{
                width: i === phaseIndex ? 16 : 6,
                height: 6,
                borderRadius: 3,
                background: i === phaseIndex ? INK : "#e0ddd5",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
