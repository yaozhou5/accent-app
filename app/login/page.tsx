"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect") || "/dashboard";
  const redirectTo = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/dashboard";
  const supabase = createClient();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (error) {
      setError(error.message.includes("Signups not allowed") ? "No account found. Sign up first." : error.message);
    } else setStep("code");
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6 || loading) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code, type: "email" });
    setLoading(false);
    if (error) {
      setError("Invalid or expired code.");
    } else {
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
        router.push(redirectTo);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#F5F0E8" }}>
      <div className="max-w-[380px] w-full">
        <Link
          href="/"
          className="no-underline block mb-10"
          style={{ fontSize: 24, color: "#1A1A18", fontFamily: "'Fraunces', Georgia, serif", fontStyle: "italic" }}
        >
          accent
        </Link>
        <h1
          className="mb-2"
          style={{ fontSize: 28, fontWeight: 400, color: "#1A1A18", fontFamily: "'Fraunces', Georgia, serif" }}
        >
          Welcome back
        </h1>
        <p className="mb-8" style={{ fontSize: 15, color: "#A8A49C", fontFamily: "'DM Sans', sans-serif" }}>
          Sign in with your email.
        </p>

        {step === "email" ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full px-4 py-3 text-[16px] outline-none"
              style={{ border: "1px solid #e0ddd5", color: "#1A1A18", fontFamily: "'DM Sans', sans-serif" }}
            />
            {error && (
              <p className="text-[13px]" style={{ color: "#DC2626", fontFamily: "'DM Sans', sans-serif" }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 font-semibold text-[15px] disabled:opacity-50"
              style={{
                background: "#1A1A18",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {loading ? "Sending code..." : "Send login code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-[14px]" style={{ color: "#A8A49C", fontFamily: "'DM Sans', sans-serif" }}>
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
              className="w-full px-4 py-3 text-[20px] text-center outline-none tracking-[0.3em]"
              style={{ border: "1px solid #e0ddd5", color: "#1A1A18", fontFamily: "'DM Mono', monospace" }}
            />
            {error && (
              <p className="text-[13px]" style={{ color: "#DC2626", fontFamily: "'DM Sans', sans-serif" }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full py-3.5 font-semibold text-[15px] disabled:opacity-50"
              style={{
                background: "#1A1A18",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {loading ? "Verifying..." : "Verify code"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
              className="w-full text-[13px]"
              style={{
                color: "#A8A49C",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Use a different email
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-[14px]" style={{ color: "#A8A49C", fontFamily: "'DM Sans', sans-serif" }}>
          Don't have an account?{" "}
          <Link href="/signup" className="no-underline font-medium" style={{ color: "#1A1A18" }}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
