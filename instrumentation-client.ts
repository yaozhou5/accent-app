import posthog from "posthog-js";
import { getConsent } from "@/lib/analytics-consent";

// Default (no consent, or explicitly rejected) is cookieless: distinct_id
// lives in memory only, wiped every reload, no persistent identity across
// visits, no session recording. Autocapture still fires — it's the same
// question "did this page get used" without persisting who. Accepting
// (components/ConsentBanner.tsx) upgrades a running instance to
// localStorage+cookie persistence and starts session recording at
// runtime; this branch just makes a returning accepted visitor start in
// that state immediately instead of flashing memory-only first.
const accepted = getConsent() === "accepted";

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: "/ingest",
  ui_host: "https://eu.posthog.com",
  defaults: "2026-01-30",
  capture_exceptions: true,
  debug: process.env.NODE_ENV === "development",
  persistence: accepted ? "localStorage+cookie" : "memory",
  disable_session_recording: !accepted,
  person_profiles: "identified_only",
  // maskAllInputs is already the library default (masks real form fields).
  // maskTextSelector: "*" additionally masks all DOM text in replays, so
  // page content — like the /practice transcript, which isn't a form
  // field — is never visible in a recording.
  session_recording: {
    maskTextSelector: "*",
  },
});

if (accepted) posthog.startSessionRecording();
