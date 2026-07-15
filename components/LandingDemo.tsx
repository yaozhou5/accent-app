"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const INK = "#1A1A18";
const DIM = "#6B6860";
const FAINT = "#A8A49C";
const BG = "#F5F0E8";

type Phase = "log" | "plan" | "editor" | "draft";
const PHASES: Phase[] = ["log", "plan", "editor", "draft"];
const PHASE_DURATION = [4000, 6000, 4500, 4000];

const LOG_NOTES = [
  {
    text: "Had a call with Marcus about pricing. He said our page looks like it was built by engineers, not humans.",
    color: "#D8EDE1",
    textColor: "#1E4030",
    label: "Note",
    dot: "#3D6B4A",
  },
  {
    text: "Shipped the onboarding rewrite. Took 3 days instead of the 2 weeks we planned.",
    color: "#D8EDE1",
    textColor: "#1E4030",
    label: "Note",
    dot: "#3D6B4A",
  },
  {
    text: "Can't stop thinking about the pricing problem. It feels structural, not cosmetic.",
    color: "#D8EDE1",
    textColor: "#1E4030",
    label: "Note",
    dot: "#3D6B4A",
  },
];

const PLAN_POSTS = [
  {
    title: "The pricing problem nobody talks about",
    platform: "LinkedIn",
    day: "Tue",
    color: "#8B2525",
    angle: "Contrarian take on why pricing pages fail",
  },
  {
    title: "We shipped in 3 days. Here's what we cut.",
    platform: "X",
    day: "Wed",
    color: "#1A1512",
    angle: "Build log with a lesson on scope",
  },
  {
    title: "What Marcus said that changed everything",
    platform: "Newsletter",
    day: "Fri",
    color: "#C4614A",
    angle: "Story-to-lesson from a real conversation",
  },
];

const EDITOR_SECTIONS = [
  { label: "BOLD CLAIM", text: "Most pricing pages are built for the company, not the customer." },
  { label: "WHY THEY THINK THAT", text: "Everyone copies what big companies do. Enterprise pricing grids." },
  {
    label: "WHAT YOU'VE SEEN",
    text: "The best conversions come from pages that answer one question: is this worth it for me?",
  },
  { label: "TAKEAWAY", text: "Build your pricing page for the person, not the spreadsheet." },
];

const DRAFT_TEXT = `Most pricing pages are built for the company, not the customer.

You've seen them — the three-column grid, the feature matrix, the enterprise tier nobody clicks. We copy it because everyone does it.

But the best-converting pages I've seen do something different. They answer one question: is this worth it for me?

Not "what features do I get." Not "how does this compare to competitors." Just: will this solve my problem, and is the price fair?

Build your pricing page for the person, not the spreadsheet.`;

export default function LandingDemo() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const phase = PHASES[phaseIndex];

  // Sub-animation states
  const [notesVisible, setNotesVisible] = useState([false, false, false]);
  const [planVisible, setPlanVisible] = useState([false, false, false]);
  const [planHeadingVisible, setPlanHeadingVisible] = useState(false);
  const [editorFilled, setEditorFilled] = useState(false);
  const [draftBadge, setDraftBadge] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const advancePhase = useCallback(() => {
    setPhaseIndex((prev) => (prev + 1) % PHASES.length);
    setNotesVisible([false, false, false]);
    setPlanVisible([false, false, false]);
    setPlanHeadingVisible(false);
    setEditorFilled(false);
    setDraftBadge(false);
  }, []);

  // Phase timer
  useEffect(() => {
    timerRef.current = setTimeout(advancePhase, PHASE_DURATION[phaseIndex]);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phaseIndex, advancePhase]);

  // Sub-animations
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    if (phase === "log") {
      timers.push(setTimeout(() => setNotesVisible([true, false, false]), 600));
      timers.push(setTimeout(() => setNotesVisible([true, true, false]), 1400));
      timers.push(setTimeout(() => setNotesVisible([true, true, true]), 2200));
    }
    if (phase === "plan") {
      timers.push(setTimeout(() => setPlanHeadingVisible(true), 400));
      timers.push(setTimeout(() => setPlanVisible([true, false, false]), 1200));
      timers.push(setTimeout(() => setPlanVisible([true, true, false]), 2200));
      timers.push(setTimeout(() => setPlanVisible([true, true, true]), 3200));
    }
    if (phase === "editor") {
      timers.push(setTimeout(() => setEditorFilled(true), 1200));
    }
    if (phase === "draft") {
      timers.push(setTimeout(() => setDraftBadge(true), 1500));
    }
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  const activeTab = phase === "log" ? "log" : phase === "plan" ? "log" : phase === "editor" ? "playbooks" : "draft";

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

        {/* Mini nav */}
        <div
          style={{ display: "flex", gap: 2, padding: "8px 14px", borderBottom: "0.5px solid #e0ddd5", background: BG }}
        >
          {[
            { id: "log", label: "Log" },
            { id: "playbooks", label: "Playbooks" },
            { id: "draft", label: "History" },
          ].map((t) => (
            <div
              key={t.id}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 11,
                fontWeight: activeTab === t.id ? 500 : 400,
                color: activeTab === t.id ? "#fff" : "#999",
                background: activeTab === t.id ? "#1a1a1a" : "transparent",
                padding: "4px 10px",
                transition: "all 0.3s ease",
              }}
            >
              {t.label}
            </div>
          ))}
        </div>

        {/* Content area */}
        <div style={{ minHeight: 360, padding: "16px 14px", position: "relative", background: BG }}>
          {/* LOG VIEW */}
          <div
            style={{
              position: "absolute",
              inset: "16px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              opacity: phase === "log" ? 1 : 0,
              transition: "opacity 0.4s ease",
              pointerEvents: phase === "log" ? "auto" : "none",
            }}
          >
            {LOG_NOTES.map((note, i) => (
              <div
                key={i}
                style={{
                  background: note.color,
                  padding: "14px 16px",
                  opacity: notesVisible[i] ? 1 : 0,
                  transform: notesVisible[i] ? "translateY(0)" : "translateY(10px)",
                  transition: "all 0.45s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 600, color: note.dot }}>
                    ● {note.label}
                  </span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: note.dot }}>
                    {["9:30am", "2:15pm", "11:00pm"][i]}
                  </span>
                </div>
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 11,
                    color: note.textColor,
                    lineHeight: 1.5,
                    margin: 0,
                  }}
                >
                  {note.text}
                </p>
              </div>
            ))}
          </div>

          {/* PLAN VIEW */}
          <div
            style={{
              position: "absolute",
              inset: "16px 14px",
              display: "flex",
              flexDirection: "column",
              opacity: phase === "plan" ? 1 : 0,
              transition: "opacity 0.4s ease",
              pointerEvents: phase === "plan" ? "auto" : "none",
            }}
          >
            {/* Mini note cluster */}
            <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
              {LOG_NOTES.map((n, i) => (
                <div key={i} style={{ flex: 1, background: n.color, padding: "6px 8px", opacity: 0.6 }}>
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 8,
                      color: n.textColor,
                      lineHeight: 1.3,
                      margin: 0,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {n.text}
                  </p>
                </div>
              ))}
            </div>

            {/* Arrow */}
            <div
              style={{
                textAlign: "center",
                marginBottom: 12,
                opacity: planHeadingVisible ? 1 : 0,
                transition: "opacity 0.3s ease",
              }}
            >
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: FAINT }}>
                ↓ accent found 3 posts
              </span>
            </div>

            {/* Plan heading */}
            <div
              style={{
                marginBottom: 12,
                opacity: planHeadingVisible ? 1 : 0,
                transform: planHeadingVisible ? "translateY(0)" : "translateY(6px)",
                transition: "all 0.4s ease",
              }}
            >
              <h3
                style={{
                  fontFamily: "'Fraunces', Georgia, serif",
                  fontSize: 16,
                  fontWeight: 600,
                  color: INK,
                  margin: 0,
                }}
              >
                This week
              </h3>
            </div>

            {/* Plan posts */}
            {PLAN_POSTS.map((post, i) => (
              <div
                key={post.title}
                style={{
                  display: "flex",
                  gap: 0,
                  marginBottom: 8,
                  opacity: planVisible[i] ? 1 : 0,
                  transform: planVisible[i] ? "translateY(0)" : "translateY(8px)",
                  transition: "all 0.45s ease",
                }}
              >
                {/* Color bar */}
                <div style={{ width: 3, background: post.color, flexShrink: 0 }} />
                <div style={{ background: "#FAFAF7", padding: "12px 14px", flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 4,
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 12,
                        fontWeight: 600,
                        color: INK,
                        margin: 0,
                        lineHeight: 1.3,
                      }}
                    >
                      {post.title}
                    </p>
                    <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 12 }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: FAINT }}>
                        {post.platform}
                      </span>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: FAINT }}>{post.day}</span>
                    </div>
                  </div>
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 10,
                      color: FAINT,
                      fontStyle: "italic",
                      margin: 0,
                      lineHeight: 1.4,
                    }}
                  >
                    {post.angle}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* EDITOR VIEW */}
          <div
            style={{
              position: "absolute",
              inset: "16px 14px",
              display: "flex",
              flexDirection: "column",
              gap: 0,
              opacity: phase === "editor" ? 1 : 0,
              transition: "opacity 0.4s ease",
              pointerEvents: phase === "editor" ? "auto" : "none",
            }}
          >
            {/* Editor header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  background: "#8B2525",
                  display: "flex",
                  alignItems: "flex-end",
                  padding: "4px 5px",
                }}
              >
                <span
                  style={{
                    fontFamily: "'Fraunces', Georgia, serif",
                    fontSize: 6,
                    fontWeight: 600,
                    color: "#FFF5F5",
                    lineHeight: 1.1,
                  }}
                >
                  Contrarian Flip
                </span>
              </div>
              <div>
                <p
                  style={{
                    fontFamily: "'Fraunces', Georgia, serif",
                    fontSize: 15,
                    fontWeight: 600,
                    color: INK,
                    margin: 0,
                  }}
                >
                  The Contrarian Flip
                </p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: FAINT, margin: 0 }}>
                  Challenge what everyone accepts
                </p>
              </div>
            </div>

            {/* Sections */}
            {EDITOR_SECTIONS.map((section, i) => (
              <div key={section.label} style={{ marginBottom: 8 }}>
                <p
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: FAINT,
                    fontWeight: 600,
                    marginBottom: 3,
                  }}
                >
                  {section.label}
                </p>
                <div
                  style={{
                    background: "#FAFAF7",
                    padding: "8px 10px",
                    borderLeft: i === 0 ? "2px solid #8B2525" : "2px solid transparent",
                    minHeight: 24,
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 11,
                      lineHeight: 1.5,
                      margin: 0,
                      color: editorFilled ? INK : FAINT,
                      transition: "color 0.3s ease",
                    }}
                  >
                    {editorFilled ? section.text : "Start typing..."}
                  </p>
                </div>
              </div>
            ))}

            {/* Develop button */}
            <div style={{ marginTop: 2 }}>
              <div
                style={{
                  background: INK,
                  color: "#fff",
                  textAlign: "center",
                  padding: "8px 0",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                  fontWeight: 600,
                  opacity: editorFilled ? 1 : 0.35,
                  transition: "opacity 0.4s ease",
                }}
              >
                Develop into draft
              </div>
            </div>
          </div>

          {/* DRAFT VIEW */}
          <div
            style={{
              position: "absolute",
              inset: "16px 14px",
              display: "flex",
              flexDirection: "column",
              opacity: phase === "draft" ? 1 : 0,
              transition: "opacity 0.4s ease",
              pointerEvents: phase === "draft" ? "auto" : "none",
            }}
          >
            {/* Voice badge */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
                opacity: draftBadge ? 1 : 0,
                transform: draftBadge ? "translateY(0)" : "translateY(4px)",
                transition: "all 0.4s ease",
              }}
            >
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: FAINT }}>
                Voice: Direct. Precise. Warm.
              </span>
              <span
                style={{
                  fontSize: 8,
                  padding: "2px 6px",
                  background: "#8B2525",
                  color: "#FFF5F5",
                  fontFamily: "'Fraunces', Georgia, serif",
                }}
              >
                Contrarian Flip
              </span>
            </div>

            {/* Draft content */}
            <div style={{ background: "#FAFAF7", padding: "16px 18px", flex: 1, overflow: "hidden" }}>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                  color: INK,
                  lineHeight: 1.7,
                  margin: 0,
                  whiteSpace: "pre-wrap",
                }}
              >
                {DRAFT_TEXT}
              </p>
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
