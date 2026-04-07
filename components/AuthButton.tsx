"use client";

import { useState, useEffect } from "react";
import posthog from "posthog-js";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
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
      } else if (event === "SIGNED_OUT") {
        posthog.reset();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const validateEmail = (value: string): string | null => {
    const trimmed = value.trim().toLowerCase();
    // Basic format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return "Please enter a valid email address.";
    }
    // Common typo detection for popular providers
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

  const handleSignIn = async (e: React.FormEvent) => {
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
        emailRedirectTo: `${location.origin}/`,
      },
    });

    setLoading(false);
    if (!error) {
      setSent(true);
      posthog.capture("magic_link_requested");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
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
            <h2 className="font-serif font-bold text-xl text-ink">Sign in to Accent</h2>
            <p className="mt-1 font-sans text-sm text-ink/60">
              Save your writing to the Shelf across devices.
            </p>
          </div>

          {sent ? (
            <div className="bg-teal-light rounded-[8px] px-4 py-3 text-teal font-sans text-sm">
              Check your email for the magic link!
            </div>
          ) : (
            <form onSubmit={handleSignIn} className="space-y-3">
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
                className="w-full py-2.5 rounded-[8px] bg-coral text-[#1B3A2D] text-sm font-sans font-medium hover:bg-coral/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send magic link"}
              </button>
            </form>
          )}

          <button
            onClick={() => {
              setShowLogin(false);
              setSent(false);
              setEmail("");
            }}
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
      onClick={() => { setShowLogin(true); posthog.capture("sign_in_initiated"); }}
      className="text-xs font-sans text-ink/40 hover:text-ink/60 transition-colors"
    >
      Sign in
    </button>
  );
}
