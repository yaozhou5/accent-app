"use client";

import { useState, useEffect } from "react";
import posthog from "posthog-js";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (event === "SIGNED_IN" && currentUser) {
        posthog.identify(currentUser.id, { email: currentUser.email });
        setShowLogin(false);
        setStep("email");
        setEmail("");
        setCode("");
      } else if (event === "SIGNED_OUT") {
        posthog.reset();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const validateEmail = (value: string): string | null => {
    const trimmed = value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return "Please enter a valid email address.";
    }
    const domain = trimmed.split("@")[1];
    const commonTypos: Record<string, string> = {
      "gmial.com": "gmail.com",
      "gmal.com": "gmail.com",
      "gmai.com": "gmail.com",
      "gmail.co": "gmail.com",
      "gmail.cm": "gmail.com",
      "gnail.com": "gmail.com",
      "gmaill.com": "gmail.com",
      "yhoo.com": "yahoo.com",
      "yaho.com": "yahoo.com",
      "yahho.com": "yahoo.com",
      "hotmial.com": "hotmail.com",
      "hotmal.com": "hotmail.com",
      "hotnail.com": "hotmail.com",
      "outlok.com": "outlook.com",
      "outloo.com": "outlook.com",
    };
    if (commonTypos[domain]) {
      return `Did you mean ${trimmed.split("@")[0]}@${commonTypos[domain]}?`;
    }
    return null;
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading) return;

    const validationError = validateEmail(email);
    if (validationError) {
      setEmailError(validationError);
      return;
    }
    setEmailError(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
      },
    });

    setLoading(false);
    if (!error) {
      setStep("code");
      posthog.capture("magic_link_requested");
    } else {
      setEmailError(error.message);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6 || loading) return;
    setCodeError(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: code,
      type: "email",
    });

    setLoading(false);
    if (error) {
      console.error("[OTP] verify error:", error);
      console.error("[OTP] error details:", JSON.stringify(error, null, 2));
      setCodeError(error.message || "Invalid or expired code. Please try again.");
    } else {
      console.log("[OTP] success:", data);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const resetForm = () => {
    setShowLogin(false);
    setStep("email");
    setEmail("");
    setCode("");
    setEmailError(null);
    setCodeError(null);
  };

  if (user) {
    return (
      <button
        onClick={handleSignOut}
        className="text-xs font-sans text-ink/40 hover:text-ink/60 transition-colors"
      >
        Sign out
      </button>
    );
  }

  if (showLogin) {
    return (
      <div className="fixed inset-0 bg-ink/20 z-50 flex items-center justify-center px-4">
        <div className="bg-paper rounded-[12px] border border-ink/10 px-5 py-6 w-full max-w-[360px] space-y-4">
          <div>
            <h2 className="font-serif font-bold text-xl text-ink">
              Sign in to Accent
            </h2>
            <p className="mt-1 font-sans text-sm text-ink/60">
              {step === "email"
                ? "We\u2019ll email you a 6-digit code."
                : `We sent a code to ${email}.`}
            </p>
          </div>

          {step === "email" ? (
            <form onSubmit={handleSendCode} className="space-y-3">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  placeholder="your@email.com"
                  className="w-full px-3 py-2.5 rounded-[8px] border border-ink/10 bg-white font-sans text-sm text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-teal/20"
                  required
                />
                {emailError && (
                  <p className="mt-1.5 text-xs font-sans text-coral">
                    {emailError}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-[8px] bg-[#2563EB] text-white text-sm font-sans font-medium hover:opacity-90 transition-colors disabled:opacity-50"
              >
                {loading ? "Sending\u2026" : "Send code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-3">
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    if (codeError) setCodeError(null);
                  }}
                  placeholder="000000"
                  className="w-full px-3 py-3 rounded-[8px] border border-ink/10 bg-white font-mono text-lg text-ink placeholder:text-ink/20 text-center tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-teal/20"
                  required
                  autoFocus
                />
                {codeError && (
                  <p className="mt-1.5 text-xs font-sans text-coral text-center">
                    {codeError}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full py-2.5 rounded-[8px] bg-[#2563EB] text-white text-sm font-sans font-medium hover:opacity-90 transition-colors disabled:opacity-50"
              >
                {loading ? "Verifying\u2026" : "Verify code"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setCode("");
                  setCodeError(null);
                }}
                className="w-full text-xs font-sans text-ink/40 hover:text-ink/60 transition-colors py-1"
              >
                Use a different email
              </button>
            </form>
          )}

          <button
            onClick={resetForm}
            className="w-full text-xs font-sans text-ink/40 hover:text-ink/60 transition-colors py-1"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      data-auth-trigger
      onClick={() => {
        setShowLogin(true);
        posthog.capture("sign_in_initiated");
      }}
      className="text-xs font-sans text-ink/40 hover:text-ink/60 transition-colors"
    >
      Sign in
    </button>
  );
}
