"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getProfile, upsertProfile } from "@/lib/supabase/profiles";
import { getVoiceLearningData, type VoiceLearningData } from "@/lib/supabase/voice-learning";
import { ArrowLeft } from "@/components/ArrowIcon";
import { DIMENSION_LABELS, normalizeScore, type DimensionKey, type VoiceProfile } from "@/lib/voice-dimensions";

const INK = "#111827";
const DIM = "#6b7280";
const FAINT = "#9ca3af";
const BORDER = "#e5e7eb";

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

export default function SettingsPage() {
  const [email, setEmail] = useState("");
  const [resetting, setResetting] = useState(false);
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [voiceLearning, setVoiceLearning] = useState<VoiceLearningData | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }
      setEmail(user.email || "");
    });
    getProfile().then((p) => {
      setVoiceProfile((p?.voice_profile as VoiceProfile) || null);
      setProfileLoaded(true);
    });
    getVoiceLearningData().then(setVoiceLearning);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen" style={{ background: "#F5F0E8" }}>
      <nav style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[640px] mx-auto px-5 py-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="no-underline font-serif"
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: INK,
              fontFamily: "'Fraunces', Georgia, serif",
              fontStyle: "italic",
            }}
          >
            accent
          </Link>
          <Link href="/dashboard" className="no-underline font-mono text-[12px]" style={{ color: DIM }}>
            <ArrowLeft size={12} /> Back
          </Link>
        </div>
      </nav>

      <div className="max-w-[480px] mx-auto px-5 py-12">
        <h1 className="font-serif mb-8" style={{ fontSize: 24, fontWeight: 600, color: INK }}>
          Settings
        </h1>

        <div className="space-y-6">
          <div>
            <label
              className="font-mono uppercase block mb-2"
              style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}
            >
              Email
            </label>
            <p className="font-sans text-[15px]" style={{ color: INK }}>
              {email}
            </p>
          </div>

          {/* Your Voice section */}
          {profileLoaded && (
            <div className="pt-4" style={{ borderTop: `1px solid ${BORDER}` }}>
              <label
                className="font-mono uppercase block mb-4"
                style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}
              >
                Your Voice
              </label>

              {voiceProfile ? (
                <div>
                  {/* Headline */}
                  <p className="font-sans" style={{ fontSize: 20, fontWeight: 800, color: INK, marginBottom: 20 }}>
                    {voiceProfile.top_traits.join(". ")}.
                  </p>

                  {/* Spectrum bars */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
                    {(Object.entries(voiceProfile.dimensions) as [DimensionKey, number][]).map(([key, raw]) => {
                      const norm = normalizeScore(key, raw);
                      const labels = DIMENSION_LABELS[key];
                      const pct = ((norm + 1) / 2) * 100;
                      return (
                        <div key={key}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
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

                  {/* Buttons */}
                  <div style={{ display: "flex", gap: 12 }}>
                    <a
                      href="/voice/report"
                      className="font-sans text-[14px]"
                      style={{
                        flex: 1,
                        display: "block",
                        textAlign: "center",
                        padding: "10px 0",
                        borderRadius: 0,
                        background: "#1a1a1a",
                        color: "#fff",
                        textDecoration: "none",
                        fontWeight: 600,
                      }}
                    >
                      View full report
                    </a>
                    <button
                      onClick={async () => {
                        setResetting(true);
                        await upsertProfile({ voice_profile: null });
                        window.location.href = "/voice";
                      }}
                      disabled={resetting}
                      className="font-sans text-[14px]"
                      style={{
                        flex: 1,
                        padding: "10px 0",
                        borderRadius: 0,
                        border: `1px solid ${BORDER}`,
                        color: DIM,
                        background: "transparent",
                        cursor: "pointer",
                      }}
                    >
                      {resetting ? "Redirecting..." : "Retake test"}
                    </button>
                  </div>
                </div>
              ) : (
                <a
                  href="/voice"
                  className="font-sans text-[14px] block text-center"
                  style={{
                    padding: "14px 0",
                    borderRadius: 0,
                    background: "#1a1a1a",
                    color: "#fff",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                >
                  Discover your voice
                </a>
              )}
            </div>
          )}

          {/* Voice Learning section */}
          {voiceLearning && (
            <div className="pt-4" style={{ borderTop: `1px solid ${BORDER}` }}>
              <label
                className="font-mono uppercase block mb-4"
                style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}
              >
                Voice Learning
              </label>

              {voiceLearning.sessionCount === 0 ? (
                <p className="font-sans text-[14px]" style={{ color: DIM, lineHeight: 1.6 }}>
                  Run a draft through Voice Coach and edit it — Accent learns your voice from what you change.
                </p>
              ) : (
                <div>
                  <p className="font-sans text-[15px] mb-4" style={{ color: INK }}>
                    <strong>{voiceLearning.sessionCount}</strong> Voice Coach session
                    {voiceLearning.sessionCount === 1 ? "" : "s"} analyzed
                  </p>

                  {voiceLearning.profile && Object.keys(voiceLearning.profile.structural_habits).length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                      {Object.entries(voiceLearning.profile.structural_habits).map(([key, value]) => (
                        <div key={key} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                          <span style={{ color: DIM }}>{STRUCTURAL_LABELS[key] || key}</span>
                          <span style={{ color: INK, fontWeight: 600 }}>{STRUCTURAL_VALUES[value] || value}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {voiceLearning.profile && voiceLearning.profile.substitution_pairs.length > 0 && (
                    <div style={{ marginBottom: 20 }}>
                      <p
                        className="font-mono uppercase"
                        style={{ fontSize: 10, letterSpacing: "0.05em", color: FAINT, marginBottom: 8 }}
                      >
                        Learned substitutions
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {voiceLearning.profile.substitution_pairs.slice(0, 5).map((pair, i) => (
                          <p key={i} className="font-sans text-[13px]" style={{ color: DIM }}>
                            <span style={{ textDecoration: "line-through" }}>{pair.from}</span>{" "}
                            <span style={{ color: INK }}>→ {pair.to}</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {voiceLearning.profile &&
                    (voiceLearning.profile.preferred_words.length > 0 ||
                      voiceLearning.profile.banned_words.length > 0) && (
                      <div style={{ marginBottom: 20 }}>
                        {voiceLearning.profile.preferred_words.length > 0 && (
                          <p className="font-sans text-[13px]" style={{ color: DIM, marginBottom: 4 }}>
                            Words you favor:{" "}
                            <span style={{ color: INK }}>{voiceLearning.profile.preferred_words.join(", ")}</span>
                          </p>
                        )}
                        {voiceLearning.profile.banned_words.length > 0 && (
                          <p className="font-sans text-[13px]" style={{ color: DIM }}>
                            Words you avoid:{" "}
                            <span style={{ color: INK }}>{voiceLearning.profile.banned_words.join(", ")}</span>
                          </p>
                        )}
                      </div>
                    )}

                  {voiceLearning.profile && voiceLearning.profile.best_examples.length > 0 && (
                    <div>
                      <p
                        className="font-mono uppercase"
                        style={{ fontSize: 10, letterSpacing: "0.05em", color: FAINT, marginBottom: 8 }}
                      >
                        Your voice at its best
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {voiceLearning.profile.best_examples.slice(0, 3).map((ex, i) => (
                          <p
                            key={i}
                            className="font-sans text-[13px]"
                            style={{ color: INK, fontStyle: "italic", lineHeight: 1.5 }}
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
          )}

          <div className="pt-4 space-y-3" style={{ borderTop: `1px solid ${BORDER}` }}>
            <button
              onClick={handleSignOut}
              className="w-full py-3 font-sans text-[14px]"
              style={{ border: `1px solid ${BORDER}`, color: DIM, background: "transparent", cursor: "pointer" }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
