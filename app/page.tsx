"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "@/components/ArrowIcon";
import LandingDemo from "@/components/LandingDemo";

const INK = "#1A1A18";
const DIM = "rgba(26,26,24,0.50)";
const FAINT = "#A8A49C";
const BLUE = "#1a1a1a";
const BORDER = "rgba(26,26,24,0.06)";

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
    s4 = useReveal(),
    s5 = useReveal(),
    s6 = useReveal();

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
          <Link
            href="/voice"
            className="no-underline px-4 py-2 text-[12px] sm:text-[13px] sm:px-5 font-sans font-semibold transition-transform hover:scale-[1.02] hover:-translate-y-px"
            style={{ background: "#F5F0E8", color: "#1a1a1a", borderRadius: 0 }}
          >
            Find your voice
          </Link>
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
            background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.7) 100%)",
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
            Never worry about
            <br className="sm:hidden" /> content again.
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
            One system. Your real week becomes your best content. Your voice stays yours.
          </p>
          <div className="mt-6 md:mt-8">
            <Link
              href="/voice"
              className="no-underline w-full sm:w-auto inline-block px-7 py-3.5 font-sans font-semibold text-[15px] transition-transform hover:scale-[1.02] hover:-translate-y-px"
              style={{ background: "#F5F0E8", color: "#1a1a1a", borderRadius: 0 }}
            >
              Find your voice <ArrowRight size={14} color="#1a1a1a" />
            </Link>
            <p className="mt-2 font-sans" style={{ fontSize: 13, color: "rgba(255,255,255,0.9)" }}>
              Start free. No credit card.
            </p>
          </div>
          <a
            href="#demo"
            className="no-underline inline-block mt-4 font-sans text-[13px] transition-opacity hover:opacity-100"
            style={{ color: "rgba(255,255,255,0.9)" }}
          >
            See how it works ↓
          </a>
        </div>
      </section>

      {/* Pain quote */}
      <section ref={s1.ref} style={s1.style}>
        <div className="max-w-[640px] mx-auto px-6 py-10 md:py-14">
          <div className="pl-6" style={{ borderLeft: `2px solid ${BLUE}` }}>
            <p
              className="font-serif italic"
              style={{ fontSize: "clamp(19px, 2.8vw, 24px)", fontWeight: 300, lineHeight: 1.55, color: INK }}
            >
              "I have plenty of material scattered everywhere. I just never know which piece matters most, for which
              channel, or when to post it. So I end up posting nothing."
            </p>
            <p className="font-sans mt-3.5" style={{ fontSize: 13, color: DIM }}>
              — Heather, founder
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="demo" style={{ background: "#F0ECE4" }}>
        <div ref={s2.ref} style={s2.style} className="max-w-[760px] mx-auto px-6 py-12 md:py-20">
          <div className="text-center mb-12">
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: FAINT,
              }}
            >
              How it works
            </span>
            <h2
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: "clamp(24px, 3.6vw, 36px)",
                fontWeight: 400,
                marginTop: 12,
              }}
            >
              Your week is your content. We connect the dots.
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              {
                num: "01",
                title: "Discover your voice",
                desc: "A 60-second exercise maps how you naturally communicate — direct or contextual, warm or cool, storyteller or structurer.",
                color: "#1A1512",
              },
              {
                num: "02",
                title: "Log your week",
                desc: "Capture thoughts, links, conversations, decisions. No pressure to write — just note what happened.",
                color: "#C4614A",
              },
              {
                num: "03",
                title: "Write from playbooks",
                desc: "9 proven structures turn your raw notes into polished posts. Your voice stays yours — we just connect the dots.",
                color: "#1E5C58",
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
                <div>
                  <h3
                    style={{
                      fontFamily: "'Fraunces', Georgia, serif",
                      fontSize: 20,
                      fontWeight: 600,
                      color: "#1a1a1a",
                      margin: "0 0 6px",
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 15,
                      color: DIM,
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link
              href="/voice"
              className="no-underline inline-block px-7 py-3.5 font-sans font-semibold text-[15px] transition-transform hover:scale-[1.02] hover:-translate-y-px"
              style={{ background: BLUE, color: "#fff", borderRadius: 0 }}
            >
              Find your voice <ArrowRight size={14} color="#fff" />
            </Link>
            <p className="mt-2 font-sans" style={{ fontSize: 13, color: DIM }}>
              Start free. No credit card.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive demo */}
      <section>
        <div className="max-w-[840px] mx-auto px-6 py-12 md:py-20">
          <div className="text-center mb-10">
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 11,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: FAINT,
              }}
            >
              See it in action
            </span>
            <h2
              style={{
                fontFamily: "'Fraunces', Georgia, serif",
                fontSize: "clamp(24px, 3.6vw, 36px)",
                fontWeight: 400,
                marginTop: 12,
              }}
            >
              From thought to post in one loop.
            </h2>
          </div>
          <LandingDemo />
        </div>
      </section>

      {/* Why this works */}
      <section ref={s3.ref} style={s3.style}>
        <div className="max-w-[840px] mx-auto px-6 py-12 md:py-20">
          <h2
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: "clamp(24px, 3.6vw, 32px)",
              fontWeight: 400,
              color: INK,
              textAlign: "center",
              marginBottom: 32,
            }}
          >
            Why this works when everything else didn&apos;t.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
            {[
              {
                title: "It's not ChatGPT.",
                desc: "ChatGPT starts from zero every time. Accent knows your voice, your themes, your last 20 weeks. The longer you use it, the better it knows your story.",
              },
              {
                title: "The rhythm is the feature.",
                desc: "Great content isn't one viral post. It's showing up every week. Accent makes the habit invisible.",
              },
            ].map((b, i) => (
              <div
                key={b.title}
                className="why-card hover:-translate-y-1"
                style={{
                  background: "#F0ECE4",
                  padding: 32,
                  opacity: s3.visible ? 1 : 0,
                  transform: s3.visible ? "translateY(0)" : "translateY(20px)",
                  transition: `opacity 0.6s ease-out ${i * 0.1}s, transform 0.6s ease-out ${i * 0.1}s, box-shadow 0.25s ease`,
                  boxShadow: "0 0 0 rgba(0,0,0,0)",
                }}
              >
                <h3
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 17,
                    fontWeight: 600,
                    color: INK,
                    marginBottom: 8,
                  }}
                >
                  {b.title}
                </h3>
                <p
                  style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, color: DIM, lineHeight: 1.7, margin: 0 }}
                >
                  {b.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section style={{ background: "#F0ECE4" }}>
        <div ref={s4.ref} style={s4.style} className="max-w-[640px] mx-auto px-6 py-12 md:py-20">
          <h2
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: "clamp(24px, 3.6vw, 32px)",
              fontWeight: 400,
              color: INK,
              textAlign: "center",
              marginBottom: 12,
            }}
          >
            Simple pricing
          </h2>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 15,
              color: DIM,
              textAlign: "center",
              marginBottom: 32,
            }}
          >
            3 posts free every month. Unlimited for $19/month.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div style={{ background: "#FAFAF7", padding: 28 }}>
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: FAINT,
                  display: "block",
                  marginBottom: 16,
                }}
              >
                Free
              </span>
              <ul className="space-y-2.5" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {["Unlimited logging", "Unlimited ideas", "3 posts per month", "Writing tools included"].map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2"
                    style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: INK }}
                  >
                    <span style={{ color: INK, flexShrink: 0 }}>&#10003;</span> {f}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ background: "#1A1512", padding: 28 }}>
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "#A8A49C",
                  display: "block",
                  marginBottom: 16,
                }}
              >
                Pro — $19/mo
              </span>
              <ul className="space-y-2.5" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {["Unlimited posts", "Brand voice memory", "Full content shelf", "Weekly rhythm tracking"].map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2"
                    style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#F0EAE0" }}
                  >
                    <span style={{ color: "#F0EAE0", flexShrink: 0 }}>&#10003;</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section ref={s5.ref} style={s5.style}>
        <div className="max-w-[840px] mx-auto px-6 py-12 md:py-20">
          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 14 }}>
            {[
              {
                emoji: "🏠",
                bg: "#C4A030",
                title: "Community builders",
                pain: "Running events, having conversations, but never turning those moments into content",
                how: "Drop notes after each event. Accent shows which moments resonate.",
              },
              {
                emoji: "🚀",
                bg: "#C4614A",
                title: "Build-in-public founders",
                pain: "Want to share the journey but stare at blank pages every week",
                how: "Your week is the content. Accent finds the stories you're too close to see.",
              },
              {
                emoji: "🧑‍💻",
                bg: "#1E5C58",
                title: "Solo founders",
                pain: "No marketing team, no content strategist, no time. Just you and a system that actually works.",
                how: "Log your week, Accent does the rest.",
              },
            ].map((c) => (
              <div key={c.title} style={{ padding: "24px 22px", background: "#F0ECE4" }}>
                <div
                  className="mb-3 flex items-center justify-center"
                  style={{ width: 48, height: 48, borderRadius: "50%", background: `${c.bg}18` }}
                >
                  <span style={{ fontSize: 24 }}>{c.emoji}</span>
                </div>
                <h3
                  style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 17, fontWeight: 400, marginBottom: 12 }}
                >
                  {c.title}
                </h3>
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    color: DIM,
                    lineHeight: 1.55,
                    marginBottom: 12,
                  }}
                >
                  {c.pain}
                </p>
                <div style={{ borderTop: `1px solid #e0ddd5`, paddingTop: 12 }}>
                  <p
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13,
                      color: INK,
                      lineHeight: 1.55,
                      margin: 0,
                    }}
                  >
                    {c.how}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section ref={s6.ref} style={s6.style}>
        <div className="max-w-[520px] mx-auto px-6 py-14 md:py-20 text-center">
          <h2 className="font-serif mb-4" style={{ fontSize: "clamp(24px, 3.6vw, 36px)", lineHeight: 1.2 }}>
            <span style={{ fontWeight: 300 }}>Your week already happened.</span>
            <br />
            <span style={{ fontWeight: 700, fontStyle: "italic" }}>The content is in there.</span>
          </h2>
          <p className="font-sans mx-auto mb-6" style={{ fontSize: 15, color: DIM, lineHeight: 1.6, maxWidth: 380 }}>
            3 posts free every month. Unlimited for $19/month.
          </p>
          <Link
            href="/voice"
            className="no-underline inline-block px-8 py-4 font-sans font-semibold text-[16px] transition-transform hover:scale-[1.02] hover:-translate-y-px"
            style={{ background: BLUE, color: "#fff", borderRadius: 0 }}
          >
            Find your voice <ArrowRight size={14} color="#fff" />
          </Link>
          <p className="mt-2 font-sans" style={{ fontSize: 13, color: DIM }}>
            Start free. No credit card.
          </p>
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
            <a href="mailto:hello@myaccent.io" className="no-underline" style={{ color: DIM }}>
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
        .why-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.06) !important; }
      `}</style>
    </div>
  );
}
