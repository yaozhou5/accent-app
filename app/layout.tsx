import type { Metadata } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/react";
import { PostHogProvider } from "@/components/PostHogProvider";
import "./globals.css";

// Self-hosted — see public/fonts/README.md for how these were produced.
// Weight/style coverage matches what was previously requested from Google
// Fonts (either via next/font/google's config below each block, or via the
// removed <link> tags), so no font actually used in the app lost coverage.

const fraunces = localFont({
  src: [
    { path: "../public/fonts/fraunces-300-normal.woff2", weight: "300", style: "normal" },
    { path: "../public/fonts/fraunces-300-italic.woff2", weight: "300", style: "italic" },
    { path: "../public/fonts/fraunces-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/fraunces-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../public/fonts/fraunces-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/fraunces-500-italic.woff2", weight: "500", style: "italic" },
    { path: "../public/fonts/fraunces-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/fraunces-600-italic.woff2", weight: "600", style: "italic" },
    { path: "../public/fonts/fraunces-700-normal.woff2", weight: "700", style: "normal" },
    { path: "../public/fonts/fraunces-700-italic.woff2", weight: "700", style: "italic" },
  ],
  variable: "--font-fraunces",
  display: "swap",
});

// No bold/semibold ever appears alongside font-mono in the app, so just the
// one weight — matches the previous next/font/google call, which also never
// requested one (variable-font default).
const jetbrains = localFont({
  src: "../public/fonts/jetbrains-mono-400-normal.woff2",
  weight: "400",
  style: "normal",
  variable: "--font-jetbrains",
  display: "swap",
});

// Weights cover Tailwind's font-medium/font-semibold/font-bold combined
// with font-sans throughout the dashboard.
const dmSans = localFont({
  src: [
    { path: "../public/fonts/dm-sans-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/dm-sans-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/dm-sans-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../public/fonts/dm-sans-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-dm-sans",
  display: "swap",
});

// Used by the ported static pages (/, /practice, /privacy, /terms, /listen)
// — see globals.css's --serif/--sans tokens. Weights match the previous
// next/font/google call exactly.
const newsreader = localFont({
  src: [
    { path: "../public/fonts/newsreader-300-normal.woff2", weight: "300", style: "normal" },
    { path: "../public/fonts/newsreader-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/newsreader-500-normal.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-newsreader",
  display: "swap",
});

const archivo = localFont({
  src: [
    { path: "../public/fonts/archivo-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/archivo-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/archivo-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://myaccent.io"),
  title: "accent.",
  description: "AI that learns your voice. Every draft gets closer.",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Your voice. AI-assisted.",
    description: "AI that learns your voice. Every draft gets closer.",
    url: "https://myaccent.io",
    siteName: "accent.",
    images: [{ url: "https://myaccent.io/api/og", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Your voice. AI-assisted.",
    description: "AI that learns your voice. Every draft gets closer.",
    images: ["https://myaccent.io/api/og"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${jetbrains.variable} ${dmSans.variable} ${newsreader.variable} ${archivo.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1A1A18" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Accent" />
        <link rel="apple-touch-icon" href="/logo-square.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="min-h-screen" suppressHydrationWarning>
        <PostHogProvider>{children}</PostHogProvider>
        <Analytics />
      </body>
    </html>
  );
}
