"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase(), options: { shouldCreateUser: true } });
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
    else router.push("/onboarding");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#fff" }}>
      <div className="max-w-[380px] w-full">
        <Link href="/" className="no-underline font-serif block mb-10" style={{ fontSize: 24, color: "#1A1A18" }}>accent</Link>
        <h1 className="font-serif mb-2" style={{ fontSize: 28, fontWeight: 400, color: "#1A1A18" }}>Start writing like you</h1>
        <p className="font-sans mb-8" style={{ fontSize: 15, color: "#6B6B6B" }}>Free account. No credit card.</p>

        {step === "email" ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com"
              className="w-full px-4 py-3 rounded-[10px] font-sans text-[16px] outline-none" style={{ border: "1px solid #E5E5E5", color: "#1A1A18" }} />
            {error && <p className="font-sans text-[13px]" style={{ color: "#DC2626" }}>{error}</p>}
            <button type="submit" disabled={loading} className="w-full py-3.5 rounded-full font-sans font-semibold text-[15px] disabled:opacity-50" style={{ background: "#2563EB", color: "#fff", border: "none", cursor: "pointer" }}>
              {loading ? "Sending code..." : "Create account"}
            </button>
            <p className="text-center text-[12px] font-sans" style={{ color: "#AAAAAA" }}>
              By signing up you agree to our <Link href="/privacy-contact" style={{ color: "#6B6B6B" }}>Privacy Policy</Link>.
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="font-sans text-[14px]" style={{ color: "#6B6B6B" }}>We sent a code to {email}</p>
            <input type="text" inputMode="numeric" maxLength={6} required value={code}
              onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000"
              className="w-full px-4 py-3 rounded-[10px] font-mono text-[20px] text-center outline-none tracking-[0.3em]" style={{ border: "1px solid #E5E5E5", color: "#1A1A18" }} />
            {error && <p className="font-sans text-[13px]" style={{ color: "#DC2626" }}>{error}</p>}
            <button type="submit" disabled={loading || code.length !== 6} className="w-full py-3.5 rounded-full font-sans font-semibold text-[15px] disabled:opacity-50" style={{ background: "#2563EB", color: "#fff", border: "none", cursor: "pointer" }}>
              {loading ? "Verifying..." : "Verify code"}
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-[14px] font-sans" style={{ color: "#6B6B6B" }}>
          Already have an account? <Link href="/login" className="no-underline font-medium" style={{ color: "#2563EB" }}>Log in</Link>
        </p>
      </div>
    </div>
  );
}
