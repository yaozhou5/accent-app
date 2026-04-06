<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into accent. The following changes were made:

- **`instrumentation-client.ts`** (new): Initialises PostHog client-side via the Next.js 15.3+ `instrumentation-client` file. Uses a reverse proxy path (`/ingest`) and enables `capture_exceptions` for automatic error tracking.
- **`lib/posthog-server.ts`** (new): Server-side PostHog client factory using `posthog-node`, with `flushAt: 1` / `flushInterval: 0` for serverless-safe event flushing.
- **`next.config.ts`** (updated): Added `/ingest` rewrites to `eu.i.posthog.com` and `eu-assets.i.posthog.com` to improve reliability through a reverse proxy. Added `skipTrailingSlashRedirect: true`.
- **`lib/use-streaming-check.ts`** (updated): Passes `X-POSTHOG-DISTINCT-ID` header to the API route so server-side events can be correlated with the correct client identity.
- **`components/WriteTab.tsx`** (updated): Captures `writing_submitted` and `writing_result_completed` events; tracks `mode_switched` when the user toggles between Quick fix and Teach me.
- **`components/AuthButton.tsx`** (updated): Captures `sign_in_initiated` and `magic_link_requested`; calls `posthog.identify()` on `SIGNED_IN` and `posthog.reset()` on `SIGNED_OUT`.
- **`components/CopyButton.tsx`** (updated): Captures `result_copied` with a `saved_to_shelf` property.
- **`components/AppShell.tsx`** (updated): Captures `tab_switched` when the user navigates between the Write and Shelf tabs.
- **`components/VoiceWaitlistCard.tsx`** (updated): Captures `voice_waitlist_joined` and `voice_waitlist_dismissed`.
- **`components/ShelfTab.tsx`** (updated): Captures `shelf_entry_opened` and `shelf_entry_deleted`.
- **`app/api/check/route.ts`** (updated): Server-side capture of `api_check_completed` (with `issues_count`, `had_changes`, `language`) and `api_check_rate_limited`, both correlated to the client's PostHog distinct ID.

| Event | Description | File |
|-------|-------------|------|
| `writing_submitted` | User clicks "Fix it" to analyse their text | `components/WriteTab.tsx` |
| `writing_result_completed` | Analysis finished and result is displayed | `components/WriteTab.tsx` |
| `result_copied` | User copies the improved text (optionally saving to Shelf) | `components/CopyButton.tsx` |
| `mode_switched` | User switches between Quick fix and Teach me modes | `components/WriteTab.tsx` |
| `tab_switched` | User switches between the Write and Shelf tabs | `components/AppShell.tsx` |
| `sign_in_initiated` | User opens the sign-in modal | `components/AuthButton.tsx` |
| `magic_link_requested` | User submits sign-in form to receive a magic link | `components/AuthButton.tsx` |
| `voice_waitlist_joined` | User submits email to join the voice profile waitlist | `components/VoiceWaitlistCard.tsx` |
| `voice_waitlist_dismissed` | User dismisses the voice waitlist prompt | `components/VoiceWaitlistCard.tsx` |
| `shelf_entry_opened` | User opens a saved shelf entry | `components/ShelfTab.tsx` |
| `shelf_entry_deleted` | User deletes a saved shelf entry | `components/ShelfTab.tsx` |
| `api_check_completed` | Server: writing analysis succeeded | `app/api/check/route.ts` |
| `api_check_rate_limited` | Server: request blocked by rate limiter | `app/api/check/route.ts` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://eu.posthog.com/project/154355/dashboard/606470
- **Writing Conversion Funnel** (submit → result → copy): https://eu.posthog.com/project/154355/insights/E3CBn6Wj
- **Daily Active Writers** (DAU submitting & copying): https://eu.posthog.com/project/154355/insights/IUpx0I8n
- **Mode Usage: Quick fix vs Teach me**: https://eu.posthog.com/project/154355/insights/D9tLfzQk
- **Sign-in Funnel** (modal open → magic link sent): https://eu.posthog.com/project/154355/insights/ZPwBDxb3
- **Voice Waitlist: Joined vs Dismissed**: https://eu.posthog.com/project/154355/insights/c56YgXuG

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
