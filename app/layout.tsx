import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, DM_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { PostHogProvider } from "@/components/PostHogProvider";
import "./globals.css";

const fraunces = Fraunces({
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
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
  description: "Content planning for solo founders. Drop in your week, get your content plan.",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Stop wondering what to post. Start knowing.",
    description: "Content planning for solo founders. Drop in your week, get your content plan.",
    url: "https://myaccent.io",
    siteName: "accent.",
    images: [
      { url: "https://myaccent.io/api/og", width: 1200, height: 630 },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Stop wondering what to post. Start knowing.",
    description: "Content planning for solo founders. Drop in your week, get your content plan.",
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
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@1&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;1,8..60,400&display=swap" />
      </head>
      <body className="min-h-screen" suppressHydrationWarning>
        <PostHogProvider>{children}</PostHogProvider>
        <Analytics />
      </body>
    </html>
  );
}
