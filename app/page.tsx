"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import AccentAnimated from "@/components/AccentAnimated";

const INK = "#1A1A18";
const DIM = "rgba(26,26,24,0.50)";
const BLUE = "#2563EB";
const BORDER = "rgba(26,26,24,0.06)";
const BORDER_VIS = "rgba(26,26,24,0.12)";


function useReveal(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setTimeout(() => setV(true), delay); }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);
  return { ref, style: { opacity: v ? 1 : 0, transform: v ? "translateY(0)" : "translateY(18px)", transition: "opacity 0.75s ease, transform 0.75s ease" } as React.CSSProperties, visible: v };
}


export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const s1 = useReveal(), s2 = useReveal(), s3 = useReveal(), s4 = useReveal(), s5 = useReveal(), s6 = useReveal();

  const dotGridBg = "radial-gradient(circle, rgba(26,26,24,0.03) 1px, transparent 1px)";

  return (
    <div style={{ background: "#fff", color: INK }}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300" style={{ height: 52, background: scrolled ? "rgba(255,255,255,0.92)" : "transparent", backdropFilter: scrolled ? "blur(16px)" : "none", WebkitBackdropFilter: scrolled ? "blur(16px)" : "none", borderBottom: scrolled ? `1px solid ${BORDER}` : "none" }}>
        <div className="max-w-[960px] mx-auto px-5 md:px-12 h-full flex items-center justify-between">
          <span className="font-serif transition-colors" style={{ fontSize: 20, fontWeight: 600, color: scrolled ? INK : "#fff" }}>accent</span>
          <Link href="/signup" className="no-underline px-4 py-2 rounded-full text-[12px] sm:text-[13px] sm:px-5 font-sans font-semibold transition-transform hover:scale-[1.02] hover:-translate-y-px" style={{ background: BLUE, color: "#fff", borderRadius: 40 }}>Start your workspace</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center relative overflow-hidden flex items-center justify-center" style={{ minHeight: "min(100svh, 700px)" }}>
        {/* Video background */}
        <video autoPlay muted loop playsInline preload="auto" className="absolute inset-0 w-full h-full object-cover z-[1]" src="/hero.mp4" />
        {/* Dark overlay — gradient for better text contrast */}
        <div className="absolute inset-0 z-[2]" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.7) 100%)" }} />
        {/* Mobile fallback — solid dark bg if video doesn't load */}
        <div className="absolute inset-0 z-0" style={{ background: "#111" }} />

        <div className="max-w-[760px] mx-auto px-6 sm:px-8 relative z-[3] py-14 md:py-20">
          <h1 className="font-serif" style={{ fontSize: "clamp(28px, 7vw, 50px)", fontWeight: 300, lineHeight: 1.12, letterSpacing: "-0.03em", color: "#fff" }}>
            Never worry about<br className="sm:hidden" /> content again.
          </h1>
          <p className="font-sans mx-auto mt-4 md:mt-6" style={{ fontSize: "clamp(15px, 3.8vw, 17px)", color: "rgba(255,255,255,0.7)", lineHeight: 1.6, maxWidth: 520 }}>
            One system. Consistent content. Your voice.
          </p>
          <div className="mt-6 md:mt-8">
            <Link href="/signup" className="no-underline w-full sm:w-auto inline-block px-7 py-3.5 rounded-full font-sans font-semibold text-[15px] transition-transform hover:scale-[1.02] hover:-translate-y-px" style={{ background: BLUE, color: "#fff", borderRadius: 40 }}>Start your workspace →</Link>
            <p className="mt-2 font-sans" style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Start free. No credit card.</p>
          </div>
          <a href="#demo" className="no-underline inline-block mt-4 font-sans text-[13px] transition-opacity hover:opacity-100" style={{ color: "rgba(255,255,255,0.5)" }}>See how it works ↓</a>
        </div>
      </section>

      {/* Pain quote */}
      <section ref={s1.ref} style={s1.style}>
        <div className="max-w-[640px] mx-auto px-6 py-10 md:py-14">
          <div className="pl-6" style={{ borderLeft: `2px solid ${BLUE}` }}>
            <p className="font-serif italic" style={{ fontSize: "clamp(19px, 2.8vw, 24px)", fontWeight: 300, lineHeight: 1.55, color: INK }}>
              "I have things worth sharing. I just don't have time to figure out how to share them."
            </p>
            <p className="font-sans mt-3.5" style={{ fontSize: 13, color: DIM }}>— Every founder, eventually</p>
          </div>
        </div>
      </section>

      {/* Demo */}
      <section id="demo" style={{ background: "#FAFAFA" }}>
        <div ref={s2.ref} style={s2.style} className="max-w-[900px] mx-auto px-6 py-12 md:py-20">
          <div className="text-center mb-10">
            <span className="font-mono uppercase" style={{ fontSize: 11, letterSpacing: "0.14em", color: BLUE }}>How it works</span>
            <h2 className="font-serif mt-3" style={{ fontSize: "clamp(24px, 3.6vw, 36px)", fontWeight: 400 }}>Your week is your content. We connect the dots.</h2>
          </div>
          <div className="flex justify-center">
            <AccentAnimated />
          </div>
          <div className="text-center mt-10">
            <Link href="/signup" className="no-underline inline-block px-7 py-3.5 rounded-full font-sans font-semibold text-[15px] transition-transform hover:scale-[1.02] hover:-translate-y-px" style={{ background: BLUE, color: "#fff", borderRadius: 40 }}>
              Start your workspace →
            </Link>
            <p className="mt-2 font-sans" style={{ fontSize: 13, color: DIM }}>Start free. No credit card.</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section ref={s3.ref} style={s3.style}>
        <div className="max-w-[660px] mx-auto px-6 py-12 md:py-20">
          <h2 className="font-serif text-center mb-8 md:mb-14" style={{ fontSize: "clamp(24px, 3.6vw, 34px)", fontWeight: 400 }}>Four stations. One flow.</h2>
          <div>
            {[
              { n: "01", title: "Log", desc: "Quick notes, voice memos, random thoughts. Whatever comes to mind. 2-3 minutes throughout your week.", icon: "M4 4h16v16H4z M8 8h8 M8 12h5" },
              { n: "02", title: "Ideas", desc: "Accent connects the dots. It turns your real moments into post ideas — matched to your voice, your brand, your channels.", icon: "M6 6h0.01 M12 6h0.01 M18 6h0.01 M6 12h0.01 M18 12h0.01 M12 18h0.01 M6 6L12 12 M18 6L12 12 M12 12L12 18" },
              { n: "03", title: "Write", desc: "Pick a story and write it. Accent helps you as you go — better words, tighter structure, the angle that makes people stop scrolling.", icon: "M4 20L8 16L18 6L20 8L10 18L6 20z M14 10L16 8" },
              { n: "04", title: "Shelf", desc: "Done? It goes to your shelf. Your content library, your rhythm tracker, proof the system is working. Never lose a post again.", icon: "M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z M9 7h6 M9 11h6 M9 15h4" },
            ].map((s, i, arr) => (
              <div key={s.n} className="grid gap-4" style={{ gridTemplateColumns: "44px 1fr", paddingTop: 20, paddingBottom: 20, borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                <div>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8 }}>
                    <path d={s.icon} />
                  </svg>
                  <span className="font-mono block" style={{ fontSize: 12, color: BLUE, fontWeight: 500 }}>{s.n}</span>
                </div>
                <div>
                  <h3 className="font-serif mb-1.5" style={{ fontSize: 22, fontWeight: 400 }}>{s.title}</h3>
                  <p className="font-sans" style={{ fontSize: 14, color: DIM, lineHeight: 1.65 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why this works */}
      <section ref={s4.ref} style={s4.style}>
        <div className="max-w-[840px] mx-auto px-6 py-12 md:py-20">
          <h2 className="font-serif text-center mb-8 md:mb-12" style={{ fontSize: "clamp(24px, 3.6vw, 32px)", fontWeight: 400, color: INK }}>Why this works when everything else didn't.</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {[
              { title: "It's not a coach.", desc: "You don't need someone telling you what to post. You need a place where content happens naturally — from your actual life." },
              { title: "It's not ChatGPT.", desc: "ChatGPT forgets you exist. Accent remembers your last 20 weeks, your voice, your brand. Context compounds." },
              { title: "It starts with you, not AI.", desc: "Log what happened first. Then ideas come from your stories — not from a prompt. Real input, real output." },
              { title: "The rhythm is the feature.", desc: "Great content isn't one viral post. It's showing up every week. Accent makes the habit invisible." },
            ].map((b, i) => (
              <div key={b.title} className="why-card hover:-translate-y-1" style={{ background: "#f9f8f6", borderRadius: 12, padding: 32, opacity: s4.visible ? 1 : 0, transform: s4.visible ? "translateY(0)" : "translateY(20px)", transition: `opacity 0.6s ease-out ${i * 0.1}s, transform 0.6s ease-out ${i * 0.1}s, box-shadow 0.25s ease`, boxShadow: "0 0 0 rgba(0,0,0,0)" }}>
                <h3 className="font-sans mb-2" style={{ fontSize: 17, fontWeight: 600, color: INK }}>{b.title}</h3>
                <p className="font-sans" style={{ fontSize: 15, color: DIM, lineHeight: 1.7 }}>{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section style={{ background: "#FAFAFA" }}>
        <div className="max-w-[640px] mx-auto px-6 py-12 md:py-20">
          <h2 className="font-serif text-center mb-3" style={{ fontSize: "clamp(24px, 3.6vw, 32px)", fontWeight: 400, color: INK }}>Simple pricing</h2>
          <p className="font-sans text-center mb-8 md:mb-12" style={{ fontSize: 15, color: DIM }}>3 posts free every month. Unlimited for $19/month.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div style={{ background: "#fff", borderRadius: 12, padding: 28, border: `1px solid ${BORDER}` }}>
              <span className="font-mono uppercase block mb-4" style={{ fontSize: 11, letterSpacing: "0.08em", color: DIM }}>Free</span>
              <ul className="space-y-2.5" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {["Unlimited logging", "Unlimited ideas", "3 posts per month", "Writing tools included"].map(f => (
                  <li key={f} className="font-sans flex items-start gap-2" style={{ fontSize: 14, color: INK }}>
                    <span style={{ color: "#22c55e", flexShrink: 0 }}>&#10003;</span> {f}
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ background: "#fff", borderRadius: 12, padding: 28, border: `1.5px solid ${BLUE}` }}>
              <span className="font-mono uppercase block mb-4" style={{ fontSize: 11, letterSpacing: "0.08em", color: BLUE }}>Pro — $19/mo</span>
              <ul className="space-y-2.5" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {["Unlimited posts", "Brand voice memory", "Full content shelf", "Weekly rhythm tracking"].map(f => (
                  <li key={f} className="font-sans flex items-start gap-2" style={{ fontSize: 14, color: INK }}>
                    <span style={{ color: BLUE, flexShrink: 0 }}>&#10003;</span> {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section ref={s5.ref} style={{ ...s5.style, background: "#FAFAFA", backgroundImage: dotGridBg, backgroundSize: "24px 24px" }}>
        <div className="max-w-[840px] mx-auto px-6 py-12 md:py-20">
          <h2 className="font-serif text-center mb-8 md:mb-12" style={{ fontSize: "clamp(24px, 3.6vw, 34px)", fontWeight: 400, lineHeight: 1.3 }}>
            Built for founders who'd rather build<br className="hidden md:inline" /> <em>than plan content</em>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 14 }}>
            {[
              { emoji: "🏠", bg: "#f59e0b", title: "Community builders", pain: "Running events, having conversations, but never turning those moments into content", how: "Drop notes after each event. Accent shows which moments resonate." },
              { emoji: "🚀", bg: "#3b82f6", title: "Build-in-public founders", pain: "Want to share the journey but stare at blank pages every week", how: "Your week is the content. Accent finds the stories you're too close to see." },
              { emoji: "🧑‍💻", bg: "#8b5cf6", title: "Solo founders", pain: "No marketing team, no content strategist, no time. Just you and a system that actually works.", how: "Log your week, Accent does the rest." },
            ].map(c => (
              <div key={c.title} style={{ padding: "24px 22px", border: `1px solid ${BORDER}`, borderRadius: 12, background: "#fff" }}>
                <div className="mb-3 flex items-center justify-center" style={{ width: 56, height: 56, borderRadius: "50%", background: `${c.bg}14` }}>
                  <span style={{ fontSize: 28 }}>{c.emoji}</span>
                </div>
                <h3 className="font-serif mb-3" style={{ fontSize: 17, fontWeight: 400 }}>{c.title}</h3>
                <p className="font-sans text-[13px] mb-3" style={{ color: DIM, lineHeight: 1.55 }}>{c.pain}</p>
                <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
                  <p className="font-sans text-[13px]" style={{ color: INK, lineHeight: 1.55 }}>{c.how}</p>
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
            <span style={{ fontWeight: 300 }}>Your week already happened.</span><br />
            <span style={{ fontWeight: 700, fontStyle: "italic" }}>The content is in there.</span>
          </h2>
          <p className="font-sans mx-auto mb-6" style={{ fontSize: 15, color: DIM, lineHeight: 1.6, maxWidth: 380 }}>
            3 posts free every month. Unlimited for $19/month.
          </p>
          <Link href="/signup" className="no-underline inline-block px-8 py-4 rounded-full font-sans font-semibold text-[16px] transition-transform hover:scale-[1.02] hover:-translate-y-px" style={{ background: BLUE, color: "#fff", borderRadius: 40 }}>
            Start your workspace →
          </Link>
          <p className="mt-2 font-sans" style={{ fontSize: 13, color: DIM }}>Start free. No credit card.</p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-[840px] mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-serif" style={{ fontSize: 16, fontWeight: 600, color: INK }}>accent</span>
          <div className="flex gap-6 text-[12px] font-sans" style={{ color: DIM }}>
            <span>Built in Amsterdam</span>
            <Link href="/privacy-contact" className="no-underline" style={{ color: DIM }}>Privacy</Link>
            <a href="mailto:hello@myaccent.io" className="no-underline" style={{ color: DIM }}>Contact</a>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes float { from{transform:translateY(0) rotate(var(--rot,0deg))} to{transform:translateY(-4px) rotate(var(--rot,0deg))} }
        @keyframes glowPulse { 0%,100%{box-shadow:0 0 20px rgba(37,99,235,0.08)} 50%{box-shadow:0 0 28px rgba(37,99,235,0.15)} }
        .why-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.06) !important; }
      `}</style>
    </div>
  );
}
