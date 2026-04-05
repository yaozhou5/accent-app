import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, DM_Sans } from "next/font/google";
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
  title: "Accent",
  description: "Writing improvement for second-language English writers",
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
      <body className="min-h-screen" suppressHydrationWarning>{children}</body>
    </html>
  );
}
