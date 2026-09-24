# Self-hosted fonts

These `.woff2` files are the **latin-only** subset Google Fonts already serves —
fetched once and committed here so the build never depends on Google Fonts or
Fontshare being reachable (they caused repeated transient build failures via
`next/font/google`).

Each file was pulled from the Google Fonts CSS2 API with a modern-browser user
agent, taking the `@font-face` block under the `/* latin */` comment specifically
(Google's API returns multiple subsets per request; this is the one used by
`subsets: ["latin"]` in the original `next/font/google` config):

```bash
curl -s -A "Mozilla/5.0 ... Chrome/128.0.0.0 Safari/537.36" \
  "https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400&display=swap" \
  | awk '/\/\* latin \*\//{found=1} found && /src: url\(/{print; exit}'
# then curl the resulting fonts.gstatic.com URL to a .woff2 file
```

`Canela-*.otf` predates this and was supplied directly, not fetched this way.

## Fonts and why each weight/style exists

- **fraunces-\*** (300/400/500/600/700 × normal/italic) — `--font-fraunces` /
  Tailwind `font-serif`, dashboard-side UI. Matches the original
  `next/font/google` weight list exactly.
- **jetbrains-mono-400-normal** — `--font-jetbrains` / Tailwind `font-mono`.
  Only weight 400 exists in the app (no `font-bold`/`font-semibold` ever
  appears alongside `font-mono`).
- **dm-sans-\*** (400/500/600/700, normal only) — `--font-dm-sans` / Tailwind
  `font-sans`. Covers `font-medium`/`font-semibold`/`font-bold` combined with
  `font-sans` throughout the dashboard.
- **newsreader-\*** (300/400/500, normal only) — `--font-newsreader` /
  `--serif` token, used by the ported static pages (`/`, `/practice`,
  `/privacy`, `/terms`, `/listen`).
- **archivo-\*** (400/500/600, normal only) — `--font-archivo` / `--sans`
  token, same static pages.
- **source-serif-4-\*** (400 normal, 500 normal, 400 italic) — applied via a
  literal `font-family: "Source Serif 4"` in `app/draft/page.tsx`, not a CSS
  variable. Self-hosted via a plain `@font-face` in `globals.css` (same
  pattern as Canela) so that file didn't need to change. Weights match what
  the removed Google Fonts `<link>` tag requested.
- **dm-mono-400/500-normal** — applied via a literal `font-family: "DM Mono"`
  across the dashboard/voice pages, not a CSS variable. Also self-hosted via
  `@font-face`, same reasoning as Source Serif 4.

`Instrument Serif` and `Switzer` were in the removed `<link>` tags but never
actually applied anywhere in the app (checked — no `font-family` reference to
either survives outside those tags), so they were dropped rather than
self-hosted.
