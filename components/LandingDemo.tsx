"use client";

const INK = "#1A1A18";
const DIM = "#6B6860";
const FAINT = "#A8A49C";
const BG = "#F5F0E8";

const INPUT_URL = "sampleapp.io";
const INPUT_NOTES = `We just shipped the ability to invite team members. It's been the #1 request since launch. Took longer than expected because we had to rethink permissions from scratch — the original model assumed a single user.

Also quietly fixed the onboarding flow. New users were dropping off at the second step because we asked for too much context upfront. Now it's two fields and a button.`;

const OUTPUT_POST = `We spent six weeks on a feature most tools ship in a sprint.

Team invites sounds simple — until you realise your whole permissions model assumed one person per account. We had to rebuild the foundation before we could add the door.

While we were in there, we noticed something else: 40% of new signups were abandoning onboarding at step two. We were asking for a company name, a role, a team size, and a use case before anyone had seen the product. Now it's an email and a "get started" button. Completion went from 60% to 89%.

Two lessons from this month: (1) the feature your users ask for is rarely the thing that takes the longest — the thing underneath it is, and (2) nobody will tell you your onboarding is broken. They just leave.`;

export default function LandingDemo() {
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
        {/* Title bar — browser chrome */}
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

        {/* Two-panel content */}
        <div
          className="demo-panels"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            minHeight: 420,
          }}
        >
          {/* Left panel — input */}
          <div
            style={{
              padding: "20px 18px",
              borderRight: "1px solid #e0ddd5",
              background: BG,
            }}
          >
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: FAINT,
                display: "block",
                marginBottom: 12,
              }}
            >
              Your link
            </span>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                color: INK,
                background: "#fff",
                border: "1px solid #e0ddd5",
                padding: "8px 12px",
                marginBottom: 16,
              }}
            >
              {INPUT_URL}
            </div>

            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: FAINT,
                display: "block",
                marginBottom: 8,
              }}
            >
              What happened this week
            </span>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                color: DIM,
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
                margin: 0,
              }}
            >
              {INPUT_NOTES}
            </p>
          </div>

          {/* Right panel — output */}
          <div
            style={{
              padding: "20px 18px",
              background: "#FAFAF7",
            }}
          >
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: FAINT,
                display: "block",
                marginBottom: 12,
              }}
            >
              Your post
            </span>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                color: INK,
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                margin: 0,
              }}
            >
              {OUTPUT_POST}
            </p>
          </div>
        </div>
      </div>

      {/* Responsive: stack on mobile */}
      <style>{`
        @media (max-width: 640px) {
          .demo-panels {
            grid-template-columns: 1fr !important;
          }
          .demo-panels > div:first-child {
            border-right: none !important;
            border-bottom: 1px solid #e0ddd5;
          }
        }
      `}</style>
    </div>
  );
}
