"use client";
import { useState, useEffect } from "react";
import { getProfile } from "@/lib/supabase/profiles";
import { createLogEntry } from "@/lib/supabase/log-entries";
import { createStandaloneDraft } from "@/lib/supabase/drafts";
import MultiplyPanel from "@/components/MultiplyPanel";
import type { VoiceProfile } from "@/lib/voice-dimensions";
import posthog from "posthog-js";

const INK = "#1A1A18";
const BLUE = "#4A6CF7";
const DIM = "#6B6860";
const FAINT = "#A8A49C";
const CREAM = "#F7F4EF";

type Phase = "input" | "generating" | "result";

export default function TryVoicePage() {
  const [phase, setPhase] = useState<Phase>("input");
  const [rawInput, setRawInput] = useState("");
  const [draft, setDraft] = useState("");
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile | null>(null);
  const [showMultiply, setShowMultiply] = useState(false);

  useEffect(() => {
    getProfile().then((p) => {
      setVoiceProfile((p?.voice_profile as VoiceProfile) || null);
    });
  }, []);

  async function handleGenerate() {
    if (!rawInput.trim() || !voiceProfile) return;
    setPhase("generating");

    try {
      // Save raw input as first log entry
      const entry = await createLogEntry(rawInput.trim(), {
        type: "note",
        source: "try-voice",
      });

      // Generate draft
      const res = await fetch("/api/generate-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryContent: rawInput.trim(),
          voiceProfile,
          businessContext: "",
          platform: "linkedin",
        }),
      });

      if (!res.ok) throw new Error("Generate failed");

      const text = await res.text();
      setDraft(text);

      // Save draft
      if (entry) {
        await createStandaloneDraft(text, rawInput.trim(), entry.id);
      }

      posthog.capture("try_voice_completed", {
        input_length: rawInput.trim().length,
        draft_length: text.length,
      });

      setPhase("result");
    } catch (err) {
      console.error("Try voice failed:", err);
      setPhase("input");
    }
  }

  function handleDashboard() {
    window.location.href = "/dashboard";
  }

  // --- INPUT PHASE ---
  if (phase === "input") {
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
              fontFamily: "Georgia, serif",
              fontSize: 36,
              fontWeight: 400,
              color: INK,
              marginBottom: 12,
              lineHeight: 1.2,
            }}
          >
            See what your voice can do
          </h1>
          <p
            className="font-sans"
            style={{
              fontSize: 17,
              color: DIM,
              lineHeight: 1.6,
              marginBottom: 32,
            }}
          >
            Drop a rough thought. A rant, a note, something you explained to someone today.
          </p>
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="e.g. I think most people approach hiring wrong because they look for skills instead of taste..."
            style={{
              width: "100%",
              minHeight: 180,
              padding: 20,
              fontSize: 16,
              lineHeight: 1.7,
              color: INK,
              background: "#fff",
              border: `1px solid ${FAINT}`,
              borderRadius: 14,
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />
          <button
            onClick={handleGenerate}
            disabled={!rawInput.trim() || !voiceProfile}
            style={{
              width: "100%",
              marginTop: 16,
              padding: "16px 0",
              fontSize: 17,
              fontWeight: 700,
              color: "#fff",
              background: !rawInput.trim() || !voiceProfile ? FAINT : BLUE,
              border: "none",
              borderRadius: 12,
              cursor: !rawInput.trim() || !voiceProfile ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            Write it in my voice
          </button>
        </div>
      </div>
    );
  }

  // --- GENERATING PHASE ---
  if (phase === "generating") {
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
              border: "3px solid #e5e5e5",
              borderTopColor: BLUE,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ fontSize: 18, color: DIM }}>Writing in your voice...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  // --- RESULT PHASE ---
  if (phase === "result" && voiceProfile) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          background: CREAM,
          padding: "48px 24px 80px",
        }}
      >
        <div style={{ maxWidth: 640, margin: "0 auto" }}>
          {/* Voice header */}
          <p className="font-mono text-[12px] mb-6" style={{ color: FAINT }}>
            Written in your voice · <span style={{ color: DIM }}>{voiceProfile.top_traits?.join(". ")}.</span>
          </p>

          {/* Draft card (read-only) */}
          <div
            style={{
              background: "#fff",
              border: `1px solid ${FAINT}40`,
              borderRadius: 16,
              padding: "32px 32px",
              marginBottom: 24,
            }}
          >
            <p
              className="font-sans"
              style={{
                fontSize: 16,
                color: INK,
                lineHeight: 1.8,
                whiteSpace: "pre-wrap",
              }}
            >
              {draft}
            </p>
          </div>

          {/* Multiply panel */}
          {showMultiply && (
            <div style={{ marginBottom: 24 }}>
              <MultiplyPanel draftText={draft} voiceProfile={voiceProfile} />
            </div>
          )}

          {/* CTAs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {!showMultiply && (
              <button
                onClick={() => setShowMultiply(true)}
                style={{
                  width: "100%",
                  padding: "16px 0",
                  fontSize: 17,
                  fontWeight: 700,
                  color: "#fff",
                  background: BLUE,
                  border: "none",
                  borderRadius: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Multiply this
              </button>
            )}
            <button
              onClick={handleDashboard}
              style={{
                width: "100%",
                padding: "14px 0",
                fontSize: 15,
                fontWeight: 600,
                color: DIM,
                background: "transparent",
                border: `1.5px solid ${FAINT}`,
                borderRadius: 12,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Go to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
