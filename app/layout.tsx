import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, DM_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { PostHogProvider } from "@/components/PostHogProvider";
import "./globals.css";

const fraunces = Fraunces({
  weight: "700",
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://myaccent.io"),
  title: "accent.",
  description: "The tool that makes you a better writer.",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Stop sounding like AI. Start sounding like you.",
    description: "The tool that makes you a better writer.",
    url: "https://myaccent.io",
    siteName: "accent.",
    images: [
      { url: "https://myaccent.io/api/og", width: 1200, height: 630 },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Stop sounding like AI. Start sounding like you.",
    description: "The tool that makes you a better writer.",
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
      className={`${fraunces.variable} ${jetbrains.variable} ${dmSans.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="stylesheet" href="https://api.fontshare.com/v2/css?f[]=switzer@400,700,800,900&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@1&display=swap" />
      </head>
      <body className="min-h-screen" suppressHydrationWarning>
        <PostHogProvider>{children}</PostHogProvider>
        <Analytics />
      </body>
    </html>
  );
}
