@AGENTS.md

## Working rules

- Never run `db push`, migrations, or SQL against production without asking first.
- Never merge to `master` or deploy to production without explicit go-ahead. Work on the `clock` branch, deploy previews.
- Plan first and wait for approval on anything non-trivial.
- Use functional `setRuns((prev) => ...)` updates in ClockApp — never read the `runs` closure directly inside a handler; it goes stale when multiple calls land before a re-render.
- Run the transcription fixture script after any change to `transcribe.worker.ts` or `transcribeChunks.ts`: `npx vitest run lib/clock/transcribeChunks.test.ts`.
- Privacy: audio and transcripts must never leave the device without asking first. Analytics carry counts only, never content. If a change would affect what `/privacy` says, say so and propose the new wording.
  - Approved exception: the "Give one specific example" chip sends the transcript to `/api/check-ai-chip` when the user selects it (opt-in, labelled on the chip).
- At the end of each task, update "Current state" in this file to match reality.

## Current state

**On `clock`, not yet on `master`/production:** commit `b500631` ("No filler words" chip rename with per-phrase counts and an id migration for old runs; link preview / OG metadata and brand mark updated to the speaking-practice framing; investor- and writing-tool-framed page descriptions on `/` and `/practice` replaced). `master`'s HEAD is `ff3d6ad` (Fix words UX rework), last merged and deployed to production 2026-09-30. Deployed to a Vercel preview, not production.

**Open items:**

- Practice page copy pass — not done:
  - `components/clock/ClockApp.tsx`'s instructions line above the chips still ends "...The clock shows how long it took you to get there."
  - `components/clock/ModelIntro.tsx` still names the model directly ("whisper-base.en") and its download size.
  - `.player` in `app/clock/page.module.css` has no custom styling — still the browser's native `<audio controls>` chrome.
