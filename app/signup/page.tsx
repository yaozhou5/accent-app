"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import posthog from "posthog-js";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromVoice, setFromVoice] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setFromVoice(!!sessionStorage.getItem("pending_voice_profile"));
  }, []);
  const supabase = createClient();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setStep("code");
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6 || loading) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code, type: "email" });
    setLoading(false);
    if (error) setError("Invalid or expired code.");
    else {
      posthog.capture("signup_completed", { email: email.trim().toLowerCase() });
      // Save pending voice profile and send email report
      const pending = sessionStorage.getItem("pending_voice_profile");
      if (pending) {
        try {
          const voiceProfile = JSON.parse(pending);
          const { upsertProfile } = await import("@/lib/supabase/profiles");
          await upsertProfile({
            voice_profile: voiceProfile,
            onboarding_completed: true,
          });
          sessionStorage.removeItem("pending_voice_profile");
          // Send the full voice report email
          await fetch("/api/send-voice-report", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ voiceProfile }),
          }).catch(() => {});
        } catch (e) {
          console.error("Failed to save voice profile:", e);
        }
        window.location.href = "/voice/report";
      } else {
        // No voice profile yet — send them to take the exercise
        window.location.href = "/voice";
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#F5F0E8" }}>
      <div className="max-w-[380px] w-full">
        <Link
          href="/"
          className="no-underline font-serif block mb-10"
          style={{ fontSize: 24, color: "#1A1A18", fontFamily: "'Fraunces', Georgia, serif", fontStyle: "italic" }}
        >
          accent
        </Link>
        <h1
          className="font-serif mb-2"
          style={{ fontSize: 28, fontWeight: 400, color: "#1A1A18", fontFamily: "'Fraunces', Georgia, serif" }}
        >
          {fromVoice ? "Your voice report is ready" : "Start writing like you"}
        </h1>
        <p className="font-sans mb-8" style={{ fontSize: 15, color: "#A8A49C" }}>
          {fromVoice
            ? "Enter your email to save your profile and get the full report."
            : "Free account. No credit card."}
        </p>

        {step === "email" ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full px-4 py-3 font-sans text-[16px] outline-none"
              style={{ border: "1px solid #e0ddd5", color: "#1A1A18" }}
            />
            {error && (
              <p className="font-sans text-[13px]" style={{ color: "#DC2626" }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 font-sans font-semibold text-[15px] disabled:opacity-50"
              style={{ background: "#1a1a1a", color: "#fff", border: "none", cursor: "pointer" }}
            >
              {loading ? "Sending code..." : fromVoice ? "Send my report" : "Create account"}
            </button>
            <p className="text-center text-[12px] font-sans" style={{ color: "#AAAAAA" }}>
              By signing up you agree to our{" "}
              <Link href="/privacy-contact" style={{ color: "#A8A49C" }}>
                Privacy Policy
              </Link>
              .
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="font-sans text-[14px]" style={{ color: "#A8A49C" }}>
              We sent a code to {email}
            </p>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full px-4 py-3 font-mono text-[20px] text-center outline-none tracking-[0.3em]"
              style={{ border: "1px solid #e0ddd5", color: "#1A1A18" }}
            />
            {error && (
              <p className="font-sans text-[13px]" style={{ color: "#DC2626" }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full py-3.5 font-sans font-semibold text-[15px] disabled:opacity-50"
              style={{ background: "#1a1a1a", color: "#fff", border: "none", cursor: "pointer" }}
            >
              {loading ? "Verifying..." : "Verify code"}
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-[14px] font-sans" style={{ color: "#A8A49C" }}>
          Already have an account?{" "}
          <Link href="/login" className="no-underline font-medium" style={{ color: "#1a1a1a" }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
