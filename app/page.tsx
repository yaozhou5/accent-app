"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const INK = "#1A1A18";
const DIM = "rgba(26,26,24,0.50)";
const FAINT = "#A8A49C";
const BLUE = "#1a1a1a";
const BORDER = "rgba(26,26,24,0.06)";
const CONTACT_EMAIL = "hello@myaccent.io";

function useReveal(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setTimeout(() => setV(true), delay);
      },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);
  return {
    ref,
    style: {
      opacity: v ? 1 : 0,
      transform: v ? "translateY(0)" : "translateY(18px)",
      transition: "opacity 0.75s ease, transform 0.75s ease",
    } as React.CSSProperties,
    visible: v,
  };
}

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const s1 = useReveal(),
    s2 = useReveal(),
    s3 = useReveal(),
    s4 = useReveal();

  return (
    <div style={{ background: "#F5F0E8", color: INK }}>
      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          height: 52,
          background: scrolled ? "rgba(245,240,232,0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(16px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(16px)" : "none",
          borderBottom: scrolled ? `1px solid ${BORDER}` : "none",
        }}
      >
        <div className="max-w-[960px] mx-auto px-5 md:px-12 h-full flex items-center justify-between">
          <span
            className="transition-colors"
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: scrolled ? INK : "#fff",
              fontFamily: "'Fraunces', Georgia, serif",
              fontStyle: "italic",
            }}
          >
            accent
          </span>
          <div className="flex items-center gap-4 sm:gap-5">
            <Link
              href="/login"
              className="no-underline text-[12px] sm:text-[13px] font-sans font-semibold transition-colors"
              style={{ color: scrolled ? INK : "#fff" }}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="no-underline px-4 py-2 text-[12px] sm:text-[13px] sm:px-5 font-sans font-semibold transition-transform hover:scale-[1.02] hover:-translate-y-px"
              style={{ background: "#F5F0E8", color: "#1a1a1a", borderRadius: 0, border: "none", cursor: "pointer" }}
            >
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section
        className="text-center relative overflow-hidden flex items-center justify-center"
        style={{ minHeight: "min(100svh, 700px)" }}
      >
        {/* Video background */}
        <video
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          className="absolute inset-0 w-full h-full object-cover z-[1]"
          src="/hero.mp4"
        />
        {/* Dark overlay — gradient for better text contrast */}
        <div
          className="absolute inset-0 z-[2]"
          style={{
            background: "linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.8) 100%)",
          }}
        />
        {/* Mobile fallback — solid dark bg if video doesn't load */}
        <div className="absolute inset-0 z-0" style={{ background: "#111" }} />

        <div className="max-w-[760px] mx-auto px-6 sm:px-8 relative z-[3] py-14 md:py-20">
          <h1
            className="font-serif"
            style={{
              fontSize: "clamp(28px, 7vw, 50px)",
              fontWeight: 300,
              lineHeight: 1.12,
              letterSpacing: "-0.03em",
              color: "#fff",
            }}
          >
            Pitch feedback,
            <br />
            <span style={{ fontStyle: "italic", fontWeight: 600 }}>attached to the moment you said it.</span>
          </h1>
          <p
            className="font-sans mx-auto mt-4 md:mt-6"
            style={{
              fontSize: "clamp(15px, 3.8vw, 17px)",
              color: "rgba(255,255,255,0.7)",
              lineHeight: 1.6,
              maxWidth: 520,
            }}
          >
            Most pitch feedback arrives as a few lines on paper after the fact. Useful in the room, gone by the next
            week.
          </p>
          <div className="mt-6 md:mt-8">
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="no-underline inline-block font-sans font-semibold text-[15px] px-7 py-3.5 transition-transform hover:scale-[1.02] hover:-translate-y-px whitespace-nowrap"
              style={{ background: "#1a1a1a", color: "#F5F0E8", border: "none", borderRadius: 0, cursor: "pointer" }}
            >
              Get in touch
            </a>
          </div>
        </div>
      </section>

      {/* What it is */}
      <section ref={s1.ref} style={s1.style}>
        <div className="max-w-[640px] mx-auto px-6 py-12 md:py-16">
          <h2
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: "clamp(22px, 3.2vw, 30px)",
              fontWeight: 400,
              lineHeight: 1.35,
              color: INK,
              marginBottom: 16,
            }}
          >
            What it is
          </h2>
          <p
            className="font-sans"
            style={{ fontSize: 15, color: DIM, lineHeight: 1.7, maxWidth: 560, marginBottom: 16 }}
          >
            PitchRoom records a founder pitching, transcribes it, and anchors every comment to the second it was said.
            You get back your own words with the notes in the margin, and an overall read on the pitch as a whole.
          </p>
          <p className="font-sans" style={{ fontSize: 15, color: DIM, lineHeight: 1.7, maxWidth: 560 }}>
            Most pitch feedback evaporates. A fifteen-minute call, some good observations, and nothing left by next
            month. This keeps it, session after session, so the fourth time isn&apos;t the first time again.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: "#F0ECE4" }}>
        <div ref={s2.ref} style={s2.style} className="max-w-[760px] mx-auto px-6 py-12 md:py-20">
          <div className="text-center mb-12">
            <h2
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: "clamp(24px, 3.6vw, 36px)",
                fontWeight: 400,
              }}
            >
              How it works
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              { num: "01", text: "You pitch. We record." },
              {
                num: "02",
                text: "Afterwards, someone marks up the transcript — what landed, what didn't, what never got said.",
              },
              {
                num: "03",
                text: "You get a document: your pitch, the comments where they belong, and one note on the shape of the whole thing.",
              },
            ].map((step) => (
              <div
                key={step.num}
                style={{
                  display: "flex",
                  gap: 20,
                  padding: "28px 0",
                  borderBottom: "1px solid #e0ddd5",
                }}
              >
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 13,
                    color: FAINT,
                    flexShrink: 0,
                    paddingTop: 2,
                  }}
                >
                  {step.num}
                </span>
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 16,
                    color: INK,
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {step.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section>
        <div className="max-w-[480px] mx-auto px-6 py-8 md:py-10 text-center">
          <div style={{ border: `1px solid ${BORDER}`, background: "#F0ECE4", padding: "14px 20px" }}>
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: FAINT,
                display: "block",
                marginBottom: 6,
              }}
            >
              Privacy
            </span>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13.5, color: DIM, lineHeight: 1.5, margin: 0 }}>
              Your audio stays on the device it was recorded on. Nothing is uploaded.
            </p>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section ref={s3.ref} style={s3.style}>
        <div className="max-w-[640px] mx-auto px-6 py-12 md:py-16">
          <h2
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: "clamp(22px, 3.2vw, 30px)",
              fontWeight: 400,
              lineHeight: 1.35,
              color: INK,
              marginBottom: 16,
            }}
          >
            Who it&apos;s for
          </h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: DIM, lineHeight: 1.7, maxWidth: 560 }}>
            Accelerators, incubators and programmes running regular pitch practice, where one or two facilitators are
            trying to give useful feedback to forty founders.
          </p>
        </div>
      </section>

      {/* Right now */}
      <section ref={s4.ref} style={s4.style}>
        <div className="max-w-[520px] mx-auto px-6 py-14 md:py-20 text-center">
          <h2 className="font-serif mb-4" style={{ fontSize: "clamp(24px, 3.6vw, 36px)", lineHeight: 1.2 }}>
            Right now
          </h2>
          <p className="font-sans mx-auto mb-2" style={{ fontSize: 15, color: DIM, lineHeight: 1.6, maxWidth: 420 }}>
            This is early. I&apos;m running sessions myself, for a small number of programmes, and improving it from
            what comes back.
          </p>
          <p className="font-sans mx-auto mb-6" style={{ fontSize: 15, color: DIM, lineHeight: 1.6, maxWidth: 420 }}>
            If you run a programme — or you&apos;re a founder who wants one session marked up — email me.
          </p>
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="no-underline inline-block px-8 py-4 font-sans font-semibold text-[16px] transition-transform hover:scale-[1.02] hover:-translate-y-px"
            style={{ background: BLUE, color: "#fff", borderRadius: 0, border: "none", cursor: "pointer" }}
          >
            Email me
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-[840px] mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: INK,
              fontFamily: "'Fraunces', Georgia, serif",
              fontStyle: "italic",
            }}
          >
            accent
          </span>
          <div className="flex gap-6 text-[12px] font-sans" style={{ color: DIM }}>
            <Link href="/privacy-contact" className="no-underline" style={{ color: DIM }}>
              Privacy
            </Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className="no-underline" style={{ color: DIM }}>
              Contact
            </a>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes float { from{transform:translateY(0) rotate(var(--rot,0deg))} to{transform:translateY(-4px) rotate(var(--rot,0deg))} }
        @keyframes glowPulse { 0%,100%{box-shadow:0 0 20px rgba(26,26,24,0.08)} 50%{box-shadow:0 0 28px rgba(26,26,24,0.15)} }
      `}</style>
    </div>
  );
}
