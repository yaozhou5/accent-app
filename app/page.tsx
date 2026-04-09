"use client";

import Link from "next/link";
import posthog from "posthog-js";
import { SocraticDemo } from "@/components/SocraticDemo";

function AccentLogo({ size = "md" }: { size?: "md" | "sm" }) {
  const fontSize = size === "md" ? 22 : 18;
  const dotSize = size === "md" ? 7 : 6;
  const dotTop = size === "md" ? 6 : 5;
  return (
    <span className="inline-flex items-start">
      <span
        className="font-serif font-bold tracking-tight text-[#1B3A2D]"
        style={{ fontSize, lineHeight: 1 }}
      >
        accent
      </span>
      <span
        className="bg-[#F5C842] rounded-full shrink-0"
        style={{
          width: dotSize,
          height: dotSize,
          marginLeft: 2,
          marginTop: dotTop,
        }}
      />
    </span>
  );
}

export default function LandingPage() {
  const trackCTA = (location: string) => {
    posthog.capture("landing_cta_clicked", { location });
  };

  return (
    <div className="min-h-screen bg-[#FDFAF3] text-[#1C1917]">
      {/* Nav */}
      <nav className="max-w-[640px] mx-auto px-5 py-5 flex items-center justify-between">
        <AccentLogo />
        <Link
          href="/write"
          onClick={() => trackCTA("nav")}
          className="px-4 py-2 rounded-[10px] border border-[#1B3A2D]/20 text-[13px] font-sans font-medium text-[#1B3A2D] hover:bg-[#1B3A2D]/5 transition-colors"
        >
          Try it free
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-[640px] mx-auto px-5 pt-8 pb-20">
        <div className="inline-block px-3 py-1 rounded-full bg-[#F5F2EB] border border-[#1B3A2D]/10 text-[12px] font-sans font-medium text-[#8A8579] mb-6">
          For people who write with AI
        </div>
        <h1
          className="font-serif font-bold text-[#1B3A2D] leading-[1.05] tracking-tight"
          style={{ fontSize: "clamp(36px, 9vw, 52px)" }}
        >
          Stop sounding
          <br />
          like AI.
          <br />
          <span className="relative inline-block">
            Start sounding
            <span
              className="absolute left-0 right-0 bg-[#F5C842]"
              style={{ bottom: "0.08em", height: "0.18em", zIndex: -1 }}
            />
          </span>
          <br />
          like you.
        </h1>
        <p className="mt-6 text-[17px] leading-relaxed text-[#1C1917]/70 max-w-[520px]">
          The tool that makes you a better writer. Fixes your writing — and
          teaches you why.
        </p>
        <Link
          href="/write"
          onClick={() => trackCTA("hero")}
          className="inline-flex items-center mt-8 px-5 py-3 rounded-[12px] bg-[#1B3A2D] text-white text-[15px] font-sans font-medium hover:bg-[#1B3A2D]/90 transition-colors"
        >
          Try it free &rarr;
        </Link>
      </section>

      {/* Socratic demo section */}
      <section className="bg-[#F5F2EB] border-y border-[#1B3A2D]/10">
        <div className="max-w-[640px] mx-auto px-5 py-16">
          <h2
            className="font-serif font-bold text-[#1B3A2D] leading-tight tracking-tight"
            style={{ fontSize: "clamp(28px, 6.5vw, 38px)" }}
          >
            Other tools fix your words.
            <br />
            Accent finds your voice.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-[#1C1917]/70 max-w-[560px]">
            Instead of replacing what you wrote, Accent asks what you meant —
            then helps you say it better, in your own way.
          </p>

          <div className="mt-10">
            <SocraticDemo />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-[640px] mx-auto px-5 py-20">
        <h2
          className="font-serif font-bold text-[#1B3A2D] leading-tight tracking-tight mb-10"
          style={{ fontSize: "clamp(28px, 6.5vw, 38px)" }}
        >
          Not another grammar tool
        </h2>
        <div className="space-y-10">
          <div>
            <h3 className="font-sans font-bold text-[18px] text-[#1B3A2D] mb-2">
              Quick fix.
            </h3>
            <p className="text-[16px] leading-relaxed text-[#1C1917]/70">
              Paste your text. Get it back cleaner, clearer, and still sounding
              like you. Not like ChatGPT.
            </p>
          </div>
          <div>
            <h3 className="font-sans font-bold text-[18px] text-[#1B3A2D] mb-2">
              Teach me.
            </h3>
            <p className="text-[16px] leading-relaxed text-[#1C1917]/70">
              Accent doesn&apos;t just correct — it asks you what you meant,
              explains the pattern behind the problem, and helps you write it
              your way.
            </p>
          </div>
          <div>
            <h3 className="font-sans font-bold text-[18px] text-[#1B3A2D] mb-2">
              Your shelf.
            </h3>
            <p className="text-[16px] leading-relaxed text-[#1C1917]/70">
              Every revision is saved. Watch your writing improve over time.
              See your patterns change.
            </p>
          </div>
        </div>
      </section>

      {/* Pull quote */}
      <section className="bg-[#1B3A2D]">
        <div className="max-w-[640px] mx-auto px-5 py-20">
          <blockquote
            className="font-serif italic text-[#FDFAF3] leading-[1.3] text-center"
            style={{ fontSize: "clamp(22px, 5vw, 30px)" }}
          >
            &ldquo;I used to rewrite everything with ChatGPT before sending it.
            One day I read back what I&apos;d sent and thought: this
            doesn&apos;t sound like me at all.&rdquo;
          </blockquote>
          <p className="mt-6 text-center text-[15px] text-[#FDFAF3]/70 font-sans">
            The corrections were right. But the voice was gone.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-[640px] mx-auto px-5 py-20 text-center">
        <h2
          className="font-serif font-bold text-[#1B3A2D] leading-tight tracking-tight"
          style={{ fontSize: "clamp(30px, 7vw, 44px)" }}
        >
          Your writing is good.
          <br />
          Make it yours.
        </h2>
        <p className="mt-5 text-[16px] text-[#1C1917]/60">
          Free to try. No account needed.
        </p>
        <Link
          href="/write"
          onClick={() => trackCTA("final")}
          className="inline-flex items-center mt-8 px-6 py-3.5 rounded-[12px] bg-[#F5C842] text-[#1B3A2D] text-[16px] font-sans font-semibold hover:bg-[#F5C842]/90 transition-colors"
        >
          Start writing &rarr;
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1B3A2D]/10">
        <div className="max-w-[640px] mx-auto px-5 py-8 flex flex-col sm:flex-row items-center gap-3 sm:justify-between">
          <AccentLogo size="sm" />
          <p className="text-[12px] text-[#8A8579] font-sans">
            Built in Amsterdam ·{" "}
            <Link href="/privacy-contact" className="hover:text-[#1B3A2D]">
              Privacy
            </Link>{" "}
            ·{" "}
            <a
              href="mailto:hello@myaccent.io"
              className="hover:text-[#1B3A2D]"
            >
              hello@myaccent.io
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
