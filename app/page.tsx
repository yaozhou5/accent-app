"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import AccentAnimated from "@/components/AccentAnimated";

const INK = "#1A1A18";
const DIM = "rgba(26,26,24,0.50)";
const BLUE = "#2563EB";
const BLUE_SOFT = "rgba(37,99,235,0.07)";
const BORDER = "rgba(26,26,24,0.06)";
const BORDER_VIS = "rgba(26,26,24,0.12)";
const CALENDLY = "https://calendly.com/yaozhou/quick-intro";


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

  const s1 = useReveal(), s2 = useReveal(), s3 = useReveal(), s4 = useReveal(), s4b = useReveal(), s5 = useReveal(), s6 = useReveal();

  const dotGridBg = "radial-gradient(circle, rgba(26,26,24,0.03) 1px, transparent 1px)";

  return (
    <div style={{ background: "#fff", color: INK }}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300" style={{ height: 52, background: scrolled ? "rgba(255,255,255,0.92)" : "transparent", backdropFilter: scrolled ? "blur(16px)" : "none", WebkitBackdropFilter: scrolled ? "blur(16px)" : "none", borderBottom: scrolled ? `1px solid ${BORDER}` : "none" }}>
        <div className="max-w-[960px] mx-auto px-5 md:px-12 h-full flex items-center justify-between">
          <span className="font-serif transition-colors" style={{ fontSize: 20, fontWeight: 600, color: scrolled ? INK : "#fff" }}>accent</span>
          <div className="flex items-center gap-4">
            <Link href="/write" className="no-underline font-sans text-[13px] hidden sm:inline" style={{ color: scrolled ? INK : "#fff" }}>Try it free</Link>
            <a href={CALENDLY} target="_blank" rel="noopener noreferrer" className="no-underline px-4 py-2 rounded-full text-[12px] sm:text-[13px] sm:px-5 font-sans font-semibold transition-transform hover:scale-[1.02] hover:-translate-y-px" style={{ background: BLUE, color: "#fff", borderRadius: 40 }}>Get your content plan</a>
          </div>
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
            <Link href="/write" className="no-underline w-full sm:w-auto inline-block px-7 py-3.5 rounded-full font-sans font-semibold text-[15px] transition-transform hover:scale-[1.02] hover:-translate-y-px" style={{ background: BLUE, color: "#fff", borderRadius: 40 }}>Start your workspace →</Link>
          </div>
          <a href="#demo" className="no-underline inline-block mt-4 font-sans text-[13px] transition-opacity hover:opacity-100" style={{ color: "rgba(255,255,255,0.5)" }}>See how it works ↓</a>
        </div>
      </section>

      {/* Pain quote */}
      <section ref={s1.ref} style={s1.style}>
        <div className="max-w-[640px] mx-auto px-6 py-10 md:py-14">
          <div className="pl-6" style={{ borderLeft: `2px solid ${BLUE}` }}>
            <p className="font-serif italic" style={{ fontSize: "clamp(19px, 2.8vw, 24px)", fontWeight: 300, lineHeight: 1.55, color: INK }}>
              "I can write a decent post. I just never know which post to write."
            </p>
            <p className="font-sans mt-3.5" style={{ fontSize: 13, color: DIM }}>Every founder, every Sunday night</p>
          </div>
        </div>
      </section>

      {/* Demo */}
      <section id="demo" style={{ background: "#FAFAFA" }}>
        <div ref={s2.ref} style={s2.style} className="max-w-[900px] mx-auto px-6 py-12 md:py-20">
          <div className="text-center mb-10">
            <span className="font-mono uppercase" style={{ fontSize: 11, letterSpacing: "0.14em", color: BLUE }}>How it works</span>
            <h2 className="font-serif mt-3" style={{ fontSize: "clamp(24px, 3.6vw, 36px)", fontWeight: 400 }}>Drop what happened. Get your plan.</h2>
          </div>
          <div className="flex justify-center">
            <AccentAnimated />
          </div>
          <div className="text-center mt-10">
            <a href={CALENDLY} target="_blank" rel="noopener noreferrer" className="no-underline inline-block px-7 py-3.5 rounded-full font-sans font-semibold text-[15px] transition-transform hover:scale-[1.02] hover:-translate-y-px" style={{ background: BLUE, color: "#fff", borderRadius: 40 }}>
              Get your content plan →
            </a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section ref={s3.ref} style={s3.style}>
        <div className="max-w-[660px] mx-auto px-6 py-12 md:py-20">
          <h2 className="font-serif text-center mb-8 md:mb-14" style={{ fontSize: "clamp(24px, 3.6vw, 34px)", fontWeight: 400 }}>Drop. Plan. Write.</h2>
          <div>
            {[
              { n: "01", title: "Drop in your week", desc: "Quick notes, voice memos, random thoughts. Whatever comes to mind. 2-3 minutes throughout your week.", icon: "M4 4h16v16H4z M8 8h8 M8 12h5" },
              { n: "02", title: "Get your plan", desc: "Accent connects the dots. It tells you which moments are worth posting, which channel each one fits, and when to publish. Your content calendar, built from your real life.", icon: "M6 6h0.01 M12 6h0.01 M18 6h0.01 M6 12h0.01 M18 12h0.01 M12 18h0.01 M6 6L12 12 M18 6L12 12 M12 12L12 18" },
              { n: "03", title: "Write it yourself", desc: "Pick a story and write it. Accent coaches you as you go — better words, tighter structure, the angle that makes people stop scrolling.", icon: "M4 20L8 16L18 6L20 8L10 18L6 20z M14 10L16 8" },
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

      {/* What AI agents can't do */}
      <section ref={s4.ref} style={{ ...s4.style, background: "#FAFAFA", backgroundImage: dotGridBg, backgroundSize: "24px 24px" }}>
        <div className="max-w-[840px] mx-auto px-6 py-12 md:py-20">
          <h2 className="font-serif text-center mb-3" style={{ fontSize: "clamp(24px, 3.6vw, 28px)", fontWeight: 400 }}>What AI agents can't do</h2>
          <p className="font-sans text-center mx-auto mb-8 md:mb-12" style={{ fontSize: 15, color: "#6B6B6B", maxWidth: 480 }}>AI can rewrite your text. It can't know your story.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: "🧠", bg: "#a855f7", title: "Remembers your journey", desc: "We know you almost quit 3 weeks ago. We know your most engaged follower is a VC. We know your community call almost didn't happen. Every week builds on the last." },
              { icon: "👁", bg: "#f59e0b", title: "Sees what you're hiding", desc: "You mentioned the first sale but not that you cried after. The real stories are the ones you don't type. We ask the questions AI won't." },
              { icon: "🎯", bg: "#ef4444", title: "Knows good from great", desc: "AI suggests 3 stories equally. We know the vendor ghosting + first sale is the one that breaks through. The other two are fine. This one is special." },
              { icon: "🤝", bg: "#3b82f6", title: "Builds your brand over time", desc: "Your imposter syndrome post got 10x engagement 3 weeks ago. Your audience is waiting for more of that. We track what lands and guide you back to it." },
            ].map(c => (
              <div key={c.title} style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid rgba(0,0,0,0.04)", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                <div className="mb-3 flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: "50%", background: `${c.bg}10` }}>
                  <span style={{ fontSize: 28 }}>{c.icon}</span>
                </div>
                <h3 className="font-sans mb-2" style={{ fontSize: 15, fontWeight: 600, color: INK }}>{c.title}</h3>
                <p className="font-sans" style={{ fontSize: 13, color: "#6B6B6B", lineHeight: 1.6 }}>{c.desc}</p>
              </div>
            ))}
          </div>
          <p className="font-sans text-center mx-auto mt-8" style={{ fontSize: 14, color: "#333", maxWidth: 520, lineHeight: 1.6 }}>
            An AI agent costs $0 and gives you generic suggestions. A content strategist costs $4,000/month. Accent gives you a strategist who knows your story — starting at <span style={{ color: BLUE, fontWeight: 600 }}>$29/month</span>.
          </p>
        </div>
      </section>

      {/* Differentiator */}
      <section ref={s4b.ref} style={s4b.style}>
        <div className="mx-4 sm:mx-6 my-6 md:my-8 relative overflow-hidden" style={{ background: INK, borderRadius: 18, padding: "clamp(28px, 6vw, 52px) clamp(20px, 5vw, 44px)", maxWidth: 840, marginLeft: "auto", marginRight: "auto" }}>
          {/* Subtle background decoration */}
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 20% 50%, rgba(37,99,235,0.06) 0%, transparent 60%), radial-gradient(ellipse at 80% 30%, rgba(139,92,246,0.04) 0%, transparent 50%)" }} />
          <div className="relative grid grid-cols-1 lg:grid-cols-2" style={{ gap: 36 }}>
            <div>
              <span className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: "0.1em", color: BLUE }}>Why Accent is different</span>
              <h2 className="font-serif mt-3 mb-4" style={{ fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 400, color: "#fff", lineHeight: 1.3 }}>
                Other tools start with <em style={{ opacity: 0.45 }}>content</em>.<br />Accent starts with <em style={{ color: BLUE }}>you</em>.
              </h2>
              <p className="font-sans" style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>
                We spend time getting to know what you're building, who you're building it for, and where you are in the journey. That context shapes everything — which stories to tell, where to tell them, and how to make them land.
              </p>
            </div>
            <div className="space-y-3">
              {[
                { icon: "📅", label: "Content calendars", line1: "Here's when to post", line2: "But not what", highlight: false },
                { icon: "🤖", label: "AI writers", line1: "Here's a post we wrote for you", line2: "Could be anyone's", highlight: false },
                { icon: "✦", label: "Accent", line1: "We know what you're building. Here's what to share this week.", line2: "And you write every word", highlight: true },
              ].map(c => (
                <div key={c.label} className="rounded-[10px] transition-all" style={{ padding: 18, background: c.highlight ? BLUE_SOFT : "rgba(255,255,255,0.03)", border: `1px solid ${c.highlight ? "rgba(37,99,235,0.18)" : "rgba(255,255,255,0.05)"}`, boxShadow: c.highlight ? "0 0 20px rgba(37,99,235,0.08)" : "none", animation: c.highlight ? "glowPulse 3s ease infinite" : "none" }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span style={{ fontSize: 14 }}>{c.icon}</span>
                    <span className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: "0.08em", color: c.highlight ? BLUE : "rgba(255,255,255,0.28)" }}>{c.label}</span>
                  </div>
                  <p className="font-sans" style={{ fontSize: 13, color: c.highlight ? "#fff" : "rgba(255,255,255,0.38)" }}>{c.line1}</p>
                  <p className="font-sans italic mt-0.5" style={{ fontSize: 12, color: c.highlight ? BLUE : "rgba(255,255,255,0.22)" }}>{c.line2}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section ref={s5.ref} style={{ ...s5.style, background: "#FAFAFA", backgroundImage: dotGridBg, backgroundSize: "24px 24px" }}>
        <div className="max-w-[840px] mx-auto px-6 py-12 md:py-20">
          <h2 className="font-serif text-center mb-8 md:mb-12" style={{ fontSize: "clamp(24px, 3.6vw, 34px)", fontWeight: 400, lineHeight: 1.3 }}>
            Built for founders who'd rather talk to customers<br className="hidden md:inline" /> <em>than plan content</em>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 14 }}>
            {[
              { emoji: "🏠", bg: "#f59e0b", title: "Community builders", pain: "Running events, having conversations, but never turning those moments into content", how: "Drop notes after each event. Accent shows which moments resonate." },
              { emoji: "🚀", bg: "#3b82f6", title: "Build-in-public founders", pain: "Want to share the journey but stare at blank pages every week", how: "Your week is the content. Accent finds the stories you're too close to see." },
              { emoji: "🌍", bg: "#22c55e", title: "Non-native speakers", pain: "Strong ideas but second-guessing every English sentence", how: "Write in your voice. Accent helps you find the right words — and actually learn them." },
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
            <span style={{ fontWeight: 700, fontStyle: "italic" }}>The content plan is in there.</span>
          </h2>
          <p className="font-sans mx-auto mb-6" style={{ fontSize: 15, color: DIM, lineHeight: 1.6, maxWidth: 380 }}>
            15 minutes. We learn what you're building, who you're talking to, and what happened this week. You walk away with your first content plan. First 2 weeks free.
          </p>
          <a href={CALENDLY} target="_blank" rel="noopener noreferrer" className="no-underline inline-block px-8 py-4 rounded-full font-sans font-semibold text-[16px] transition-transform hover:scale-[1.02] hover:-translate-y-px" style={{ background: BLUE, color: "#fff", borderRadius: 40 }}>
            Get your content plan →
          </a>
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
      `}</style>
    </div>
  );
}
