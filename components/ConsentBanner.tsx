"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getConsent, setConsent } from "@/lib/analytics-consent";
import styles from "./ConsentBanner.module.css";

// Dispatched by the "Cookie settings" footer link (added per-page) to
// reopen the banner regardless of any stored choice.
export const REOPEN_CONSENT_EVENT = "cookie-settings:open";

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getConsent() === null);
    const reopen = () => setVisible(true);
    window.addEventListener(REOPEN_CONSENT_EVENT, reopen);
    return () => window.removeEventListener(REOPEN_CONSENT_EVENT, reopen);
  }, []);

  if (!visible) return null;

  function handleAccept() {
    setConsent("accepted");
    setVisible(false);
  }

  function handleReject() {
    setConsent("rejected");
    setVisible(false);
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
