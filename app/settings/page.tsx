"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getProfile, upsertProfile } from "@/lib/supabase/profiles";
import { ArrowLeft } from "@/components/ArrowIcon";
import { DIMENSION_LABELS, normalizeScore, type DimensionKey, type VoiceProfile } from "@/lib/voice-dimensions";

const INK = "#111827";
const BLUE = "#4A6CF7";
const DIM = "#6b7280";
const FAINT = "#9ca3af";
const BORDER = "#e5e7eb";

export default function SettingsPage() {
  const [email, setEmail] = useState("");
  const [resetting, setResetting] = useState(false);
  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
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
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen" style={{ background: "#fff" }}>
      <nav style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[640px] mx-auto px-5 py-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="no-underline font-serif"
            style={{ fontSize: 20, fontWeight: 600, color: INK }}
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
                                background: BLUE,
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
                        borderRadius: 9999,
                        background: BLUE,
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
                        borderRadius: 9999,
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
                    borderRadius: 9999,
                    background: BLUE,
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

          <div className="pt-4 space-y-3" style={{ borderTop: `1px solid ${BORDER}` }}>
            <button
              onClick={handleSignOut}
              className="w-full py-3 rounded-full font-sans text-[14px]"
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
