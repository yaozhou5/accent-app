import posthog from "posthog-js";

posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  api_host: "/ingest",
  ui_host: "https://eu.posthog.com",
  defaults: "2026-01-30",
  capture_exceptions: true,
  debug: process.env.NODE_ENV === "development",
  // maskAllInputs is already the library default (masks real form fields).
  // maskTextSelector: "*" additionally masks all DOM text in replays, so
  // page content — like the /practice transcript, which isn't a form
  // field — is never visible in a recording.
  session_recording: {
    maskTextSelector: "*",
  },
});
