"use client";

import { useEffect, useRef, useState } from "react";
import posthog from "posthog-js";
import styles from "@/app/clock/page.module.css";
import { hasActedOnEmailCapture, markEmailCaptureActedOn } from "@/lib/clock/emailCapture";

function capture(event: string) {
  try {
    if (posthog && posthog.__loaded) posthog.capture(event);
  } catch {
    // PostHog not available — never let tracking break the feature.
  }
}

type Status = "idle" | "submitting" | "done" | "error";

export default function EmailCapture({ runIndex }: { runIndex: number }) {
  const [actedUpon, setActedUpon] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const shownRef = useRef(false);

  useEffect(() => {
    hasActedOnEmailCapture()
      .then(setActedUpon)
      .catch(() => setActedUpon(false));
  }, []);

  useEffect(() => {
    if (actedUpon === false && !shownRef.current) {
      shownRef.current = true;
      capture("practice_email_shown");
    }
  }, [actedUpon]);

  if (actedUpon !== false) return null;

  if (status === "done") {
    return (
      <div className={styles.emailCapture}>
        <p className={styles.emailCaptureText}>Thanks — I&apos;ll set it up and be in touch.</p>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;
    setStatus("submitting");
    try {
      const res = await fetch("/api/practice-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, runIndex }),
      });
      if (!res.ok) throw new Error("request failed");
      await markEmailCaptureActedOn();
      capture("practice_email_submitted");
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  function handleDismiss() {
    markEmailCaptureActedOn().catch(() => {});
    capture("practice_email_dismissed");
    setActedUpon(true);
  }

  return (
    <div className={styles.emailCapture}>
      <button
        type="button"
        className={styles.emailCaptureClose}
        onClick={handleDismiss}
        aria-label="Dismiss this offer"
      >
        ×
      </button>
      <p className={styles.emailCaptureText}>
        Want a stranger to listen to your 60 seconds and tell you what they heard? Leave your email and I&apos;ll set it
        up.
      </p>
      <form className={styles.emailCaptureForm} onSubmit={handleSubmit}>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className={styles.emailCaptureInput}
          disabled={status === "submitting"}
        />
        <button type="submit" className={styles.emailCaptureBtn} disabled={status === "submitting"}>
          {status === "submitting" ? "Sending…" : "Send it to me."}
        </button>
      </form>
      {status === "error" && <p className={styles.emailCaptureError}>Something went wrong — try again?</p>}
    </div>
  );
}
