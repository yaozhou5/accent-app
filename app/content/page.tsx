"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { PRO_PRICE_SHORT, PRO_PRICE_LONG } from "@/lib/pricing";

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
    s3 = useReveal(),
    s4 = useReveal(),
    s5 = useReveal(),
    s6 = useReveal(),
    s7 = useReveal();

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
            Find your users
            <br />
            <span style={{ fontStyle: "italic", fontWeight: 600 }}>before you finish the product.</span>
          </h1>
        </div>
      </section>

      {/* Distribution-first statement */}
      <section ref={s1.ref} style={s1.style}>
        <div className="max-w-[640px] mx-auto px-6 py-10 md:py-14">
          <p
            className="font-serif"
            style={{
              fontSize: "clamp(19px, 2.8vw, 24px)",
              fontWeight: 600,
              lineHeight: 1.55,
              color: INK,
              marginBottom: 8,
            }}
          >
            Most founders build for months before anyone outside the room hears about it.
          </p>
          <p
            className="font-sans"
            style={{ fontSize: "clamp(15px, 2.2vw, 17px)", fontWeight: 400, lineHeight: 1.6, color: DIM }}
          >
            Distribution-first means talking about the work while it&apos;s still changing.
          </p>
        </div>
      </section>

      {/* Who it's for — Founders statement */}
      <section ref={s5.ref} style={s5.style}>
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
            Built for founders who are building and talking about it at the same time.
          </h2>
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 15,
              color: DIM,
              lineHeight: 1.7,
              maxWidth: 560,
            }}
          >
            No marketing team. No content calendar. Just you, your product, and a weekly post that tells the right
            people what you&apos;re working on. Accent turns your building updates into posts that actually get read.
          </p>
        </div>
      </section>

      {/* Why weekly posting works */}
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
            Why founders who post weekly get funded faster.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 16 }}>
            {[
              {
                title: "Your audience grows with your product.",
                desc: "By the time you launch, thousands of people already know what you're building and why. No cold outreach, no launch-day scramble. The people who need it have been following along.",
              },
              {
                title: "Investors find you, not the other way around.",
                desc: "A founder who posts every week about what they're learning is more fundable than one who appears out of nowhere with a deck. Consistent public building is the best warm intro that exists.",
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
            Start free. Go unlimited for {PRO_PRICE_LONG}.
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
                {["3 posts per month", "Your voice, not AI-generic", "Review and edit tools", "No credit card"].map(
                  (f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2"
                      style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: INK }}
                    >
                      <span style={{ color: INK, flexShrink: 0 }}>&#10003;</span> {f}
                    </li>
                  )
                )}
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
                Pro — {PRO_PRICE_SHORT}
              </span>
              <ul className="space-y-2.5" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {[
                  "Unlimited posts",
                  "Voice profile that learns how you write",
                  "Weekly posting reminders",
                  "Full edit history",
                ].map((f) => (
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

      {/* Final CTA */}
      <section ref={s6.ref} style={s6.style}>
        <div className="max-w-[520px] mx-auto px-6 py-14 md:py-20 text-center">
          <h2 className="font-serif mb-6" style={{ fontSize: "clamp(24px, 3.6vw, 36px)", lineHeight: 1.2 }}>
            Find your users before you finish the product.
          </h2>
          <Link
            href="/signup"
            className="no-underline inline-block px-8 py-4 font-sans font-semibold text-[16px] transition-transform hover:scale-[1.02] hover:-translate-y-px"
            style={{ background: BLUE, color: "#fff", borderRadius: 0, border: "none", cursor: "pointer" }}
          >
            Sign up
          </Link>
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
