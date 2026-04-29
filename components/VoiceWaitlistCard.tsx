"use client";

import { useState, useEffect } from "react";
import posthog from "posthog-js";
import { createClient } from "@/lib/supabase/client";
import { joinVoiceWaitlist } from "@/lib/supabase/waitlist";

interface VoiceWaitlistCardProps {
  sessionCount: number;
}

const JOINED_KEY = "voice_waitlist_joined";
const DISMISSED_KEY = "voice_waitlist_dismissed";

export function VoiceWaitlistCard({ sessionCount }: VoiceWaitlistCardProps) {
  const [show, setShow] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [signedInToastVisible, setSignedInToastVisible] = useState(false);

  useEffect(() => {
    if (sessionCount < 3) return;

    // Check dismissed / joined flags
    const joined = localStorage.getItem(JOINED_KEY) === "true";
    const dismissed = localStorage.getItem(DISMISSED_KEY) === "true";
    if (joined || dismissed) return;

    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        // Signed-in users get a brief toast
        setIsSignedIn(true);
        setSignedInToastVisible(true);
        localStorage.setItem(JOINED_KEY, "true");
        setTimeout(() => setSignedInToastVisible(false), 4000);
      } else {
        setShow(true);
      }
    });
  }, [sessionCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    const ok = await joinVoiceWaitlist(email.trim(), sessionCount);
    setLoading(false);
    if (ok) {
      localStorage.setItem(JOINED_KEY, "true");
      setSubmitted(true);
      posthog.capture("voice_waitlist_joined", { session_count: sessionCount });
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setShow(false);
    posthog.capture("voice_waitlist_dismissed", { session_count: sessionCount });
  };

  if (isSignedIn && signedInToastVisible) {
    return (
      <div className="bg-teal-light border border-teal/30 rounded-[12px] px-4 py-3 text-sm font-sans text-teal font-medium text-center">
        Accent is building your voice profile.
      </div>
    );
  }

  if (!show) return null;

  return (
    <div className="relative bg-paper border border-teal rounded-[12px] p-5">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-ink/40 hover:text-ink text-lg leading-none w-6 h-6 flex items-center justify-center"
        aria-label="Dismiss"
      >
        &times;
      </button>

      {submitted ? (
        <p className="font-sans text-sm text-ink pr-6">
          You&apos;re on the list. We&apos;ll be in touch.
        </p>
      ) : (
        <>
          <p className="font-sans text-sm text-ink leading-relaxed pr-6">
            Accent is getting to know how you write.
          </p>
          <p className="font-sans text-sm text-ink/70 leading-relaxed mt-1 mb-3">
            Drop your email and we&apos;ll tell you when your voice profile is
            ready.
          </p>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="flex-1 min-w-0 bg-white border border-ink/15 rounded-[8px] px-3 py-2 text-sm font-sans text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-teal/20 focus:border-teal/40"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-[8px] bg-[#2563EB] text-white text-sm font-sans font-medium hover:opacity-90 transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {loading ? "..." : "Notify me"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
