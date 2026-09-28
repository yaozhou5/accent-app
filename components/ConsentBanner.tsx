"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { clearPostHogStorage, getConsent, setConsent } from "@/lib/analytics-consent";
import { createClient } from "@/lib/supabase/client";
import { identifyUser } from "@/lib/identify-user";
import styles from "./ConsentBanner.module.css";

// Dispatched by a "Cookie settings" link (footer or elsewhere) to reopen
// the banner regardless of any stored choice.
export const REOPEN_CONSENT_EVENT = "cookie-settings:open";

// "hidden" only during the brief pre-effect window (SSR-safe default,
// avoids a hydration mismatch since localStorage isn't readable on the
// server). After mount it's always "banner" or "tab" — never hidden
// entirely, since a choice has to stay as reachable to withdraw as it was
// to give. Most routes have no footer to hold a "Cookie settings" link
// (dashboard, /write, /draft, /settings, /review, /voice, /login,
// /signup, ...), so this component itself — already mounted globally in
// app/layout.tsx — is what makes withdrawal reachable everywhere.
type Mode = "hidden" | "banner" | "tab";

export function ConsentBanner() {
  const [mode, setMode] = useState<Mode>("hidden");

  useEffect(() => {
    setMode(getConsent() === null ? "banner" : "tab");
    const reopen = () => setMode("banner");
    window.addEventListener(REOPEN_CONSENT_EVENT, reopen);
    return () => window.removeEventListener(REOPEN_CONSENT_EVENT, reopen);
  }, []);

  if (mode === "hidden") return null;

  async function handleAccept() {
    setConsent("accepted");
    posthog.set_config({ persistence: "localStorage+cookie" });
    posthog.startSessionRecording();
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) identifyUser(user);
    setMode("tab");
  }

  function handleReject() {
    setConsent("rejected");
    posthog.stopSessionRecording();
    posthog.reset();
    posthog.set_config({ persistence: "memory" });
    clearPostHogStorage();
    setMode("tab");
  }

  if (mode === "tab") {
    return (
      <button type="button" className={styles.tab} onClick={() => setMode("banner")}>
        Cookie settings
      </button>
    );
  }

  return (
    <div className={styles.banner} role="dialog" aria-label="Cookie consent">
      <p className={styles.text}>
        We use analytics to understand how the product is used. <Link href="/privacy">Read our privacy policy</Link>.
      </p>
      <div className={styles.actions}>
        <button type="button" className={styles.button} onClick={handleReject}>
          Reject
        </button>
        <button type="button" className={styles.button} onClick={handleAccept}>
          Accept
        </button>
      </div>
    </div>
  );
}
