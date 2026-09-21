"use client";

import { useLayoutEffect, useState } from "react";
import Link from "next/link";
import posthog from "posthog-js";
import styles from "@/app/page.module.css";

const DISMISS_KEY = "accent-content-banner-dismissed";

function isDismissed(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function markDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // Private browsing or storage disabled — it'll just show again next visit.
  }
}

export default function AnnouncementBar() {
  // Starts visible so the server-rendered HTML already includes the bar —
  // no layout shift for the common case of a visitor who hasn't dismissed
  // it. useLayoutEffect (not useEffect) hides it before the browser paints
  // if they already have, so a returning dismisser never sees it flash in.
  const [visible, setVisible] = useState(true);

  useLayoutEffect(() => {
    if (isDismissed()) setVisible(false);
  }, []);

  if (!visible) return null;

  function handleLinkClick() {
    try {
      if (posthog && posthog.__loaded) {
        posthog.capture("content_tool_banner_click");
      }
    } catch {
      // PostHog not available — don't let this break navigation.
    }
  }

  function handleDismiss() {
    markDismissed();
    setVisible(false);
  }

  return (
    <div className={styles.announcementBar}>
      <div className={styles.announcementBarIn}>
        <Link href="/content" className={styles.announcementLink} onClick={handleLinkClick}>
          Looking for the writing tool? It’s still here →
        </Link>
        <button
          type="button"
          className={styles.announcementClose}
          onClick={handleDismiss}
          aria-label="Dismiss this announcement"
        >
          ×
        </button>
      </div>
    </div>
  );
}
