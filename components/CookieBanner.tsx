"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const CONSENT_KEY = "accent-cookie-consent";

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) setShow(true);
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 md:pb-6">
      <div className="max-w-[480px] md:max-w-[600px] mx-auto bg-paper border border-ink/15 rounded-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.08)] px-4 py-3.5 flex items-center gap-3">
        <p className="flex-1 text-xs md:text-sm font-sans text-ink/70 leading-snug">
          We use analytics cookies to improve Accent.{" "}
          <Link
            href="/privacy-contact"
            className="text-teal underline underline-offset-2 hover:no-underline"
          >
            Learn more
          </Link>
          .
        </p>
        <button
          onClick={handleAccept}
          className="shrink-0 px-3 py-2 rounded-[8px] bg-ink text-white text-xs md:text-sm font-sans font-medium hover:bg-ink/90 transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  );
}
