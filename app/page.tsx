"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const INK = "#1A1A18";
const DIM = "rgba(26,26,24,0.50)";
const BLUE = "#2563EB";
const BLUE_SOFT = "rgba(37,99,235,0.07)";
const BORDER = "rgba(26,26,24,0.06)";
const BORDER_VIS = "rgba(26,26,24,0.12)";

function useReveal(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setTimeout(() => setV(true), delay);
    }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [delay]);
  return { ref, style: { opacity: v ? 1 : 0, transform: v ? "translateY(0)" : "translateY(18px)", transition: "opacity 0.75s ease, transform 0.75s ease" } as React.CSSProperties, visible: v };
}

const FRAGMENTS = [
  { day: "Mon", text: "Vendor ghosted after 2 calls. Feeling defeated." },
  { day: "Tue", text: "First organic sale!! Someone DM'd saying they found us through a friend" },
  { day: "Tue", text: "Onboarding is a mess. New customer took 20 min to figure out how to pay" },
  { day: "Wed", text: "Community call — 8 people showed up. Record." },
  { day: "Thu", text: "Conversation with a founder in Berlin. She's doing the exact same thing" },
];

const PLAN_CARDS = [
  { title: "The vendor ghosting + first organic sale", channel: "LinkedIn", when: "Tuesday morning", why: "The contrast between rejection and surprise is the most relatable founder moment. Your audience of early-stage builders lives this daily.", nudge: "Start with the ghosting. Let the reader think the day was a loss. Then reveal the DM." },
  { title: "Your onboarding is broken — and you're admitting it", channel: "Community Post", when: "Wednesday", why: "Most founders hide product flaws. Admitting a customer struggled for 20 minutes builds trust and invites help.", nudge: "Ask your community: 'Our first paying customer almost didn't make it through onboarding. What does yours look like?'" },
  { title: "8 people showed up", channel: "Newsletter", when: "Friday", why: "You almost buried this. 8 attendees when you're starting is a milestone. Your subscribers who are thinking about communities need to hear that 8 is enough.", nudge: "The story isn't '8 people came.' It's 'I expected 2 and 8 showed up and here's what that taught me.'" },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [activeCard, setActiveCard] = useState(0);
  const [cardsReady, setCardsReady] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const s1 = useReveal();
  const s2 = useReveal();
  const demoRef = useRef<HTMLDivElement>(null);
  const s3 = useReveal();
  const s4 = useReveal();
  const s5 = useReveal();
  const s6 = useReveal();

  // Trigger plan cards after demo section enters view
  useEffect(() => {
    const el = demoRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setTimeout(() => setCardsReady(true), 800);
    }, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div style={{ background: "#fff", color: INK }}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300" style={{ height: 58, background: scrolled ? "rgba(255,255,255,0.92)" : "transparent", backdropFilter: scrolled ? "blur(16px)" : "none", WebkitBackdropFilter: scrolled ? "blur(16px)" : "none", borderBottom: scrolled ? `1px solid ${BORDER}` : "none" }}>
        <div className="max-w-[960px] mx-auto px-6 h-full flex items-center justify-between">
          <span className="font-serif" style={{ fontSize: 20, fontWeight: 600, color: INK }}>accent</span>
          <div className="flex flex-col items-end gap-1">
            <a href="https://calendly.com/yaozhou/quick-intro" className="no-underline px-5 py-2 rounded-full text-[13px] font-sans font-semibold" style={{ background: BLUE, color: "#fff", borderRadius: 40 }}>Book your onboarding</a>
            <span className="font-sans" style={{ fontSize: 11, color: "rgba(26,26,24,0.35)" }}>First 2 weeks free</span>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center" style={{ paddingTop: 140, paddingBottom: 72 }}>
        <div className="max-w-[760px] mx-auto px-6">
          <div className="flex items-center justify-center gap-3 mb-8">
            <span style={{ width: 18, height: 1, background: BLUE, display: "inline-block" }} />
            <span className="font-mono uppercase" style={{ fontSize: 11, letterSpacing: "0.14em", color: BLUE }}>Content planning for solo founders</span>
            <span style={{ width: 18, height: 1, background: BLUE, display: "inline-block" }} />
          </div>
          <h1 className="font-serif" style={{ fontSize: "clamp(32px, 5vw, 50px)", lineHeight: 1.15, letterSpacing: "-0.03em" }}>
            <span style={{ fontWeight: 300 }}>Stop wondering what to post.</span><br />
            <span style={{ fontWeight: 700, fontStyle: "italic" }}>Start knowing.</span>
          </h1>
          <p className="font-sans mx-auto mt-6" style={{ fontSize: 17, color: DIM, lineHeight: 1.7, maxWidth: 500 }}>
            Drop in what happened this week. Accent tells you what's worth posting, where, and why. Then helps you write it in your own voice.
          </p>
          <div className="flex justify-center gap-3 mt-8 flex-wrap">
            <a href="#demo" className="no-underline px-7 py-3.5 rounded-full font-sans font-semibold text-[15px]" style={{ background: BLUE, color: "#fff", borderRadius: 40 }}>See how it works</a>
            <a href="https://calendly.com/yaozhou/quick-intro" className="no-underline px-6 py-3 rounded-full font-sans font-medium text-[14px]" style={{ border: `1px solid ${BORDER_VIS}`, color: INK, borderRadius: 40 }}>Book your onboarding</a>
          </div>
        </div>
      </section>

      {/* Pain quote */}
      <section ref={s1.ref} style={s1.style}>
        <div className="max-w-[640px] mx-auto px-6 py-14">
          <div className="pl-6" style={{ borderLeft: `2px solid ${BLUE}` }}>
            <p className="font-serif italic" style={{ fontSize: "clamp(19px, 2.8vw, 24px)", fontWeight: 300, lineHeight: 1.55, color: INK }}>
              "The hardest part isn't writing the post. It's knowing which post is worth writing."
            </p>
            <p className="font-sans mt-3.5" style={{ fontSize: 13, color: DIM }}>Every founder, every Sunday night</p>
          </div>
        </div>
      </section>

      {/* Demo */}
      <section id="demo" ref={demoRef} style={{ background: "#FAFAFA" }}>
        <div ref={s2.ref} style={s2.style} className="max-w-[900px] mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <span className="font-mono uppercase" style={{ fontSize: 11, letterSpacing: "0.14em", color: BLUE }}>Your week → Your content plan</span>
            <h2 className="font-serif mt-3" style={{ fontSize: "clamp(24px, 3.6vw, 36px)", fontWeight: 400 }}>5 fragments in. 3-post plan out.</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 28 }}>
            {/* Left — fragments */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="rounded-full" style={{ width: 6, height: 6, background: cardsReady ? "#22c55e" : "#22c55e", animation: cardsReady ? "none" : "pulse 1.5s ease infinite" }} />
                <span className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: "0.1em", color: DIM }}>
                  {cardsReady ? "Your week" : "Reading your week..."}
                </span>
              </div>
              <div className="space-y-2">
                {FRAGMENTS.map((f, i) => (
                  <div key={i} className="transition-all" style={{ padding: "14px 18px", background: "#fff", borderRadius: 10, border: `1px solid ${BORDER}`, opacity: s2.visible ? 1 : 0, transform: s2.visible ? "none" : "translateY(10px)", transition: `all 0.5s ease ${i * 0.1}s` }}>
                    <span className="font-mono block mb-1" style={{ fontSize: 10, color: DIM }}>{f.day}</span>
                    <p className="font-sans" style={{ fontSize: 13, lineHeight: 1.55, color: DIM }}>{f.text}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 font-sans flex items-center gap-1" style={{ fontSize: 12, color: DIM }}>
                <span>🕐</span> 3 minutes of input total
              </p>
            </div>

            {/* Right — plan cards */}
            <div>
              <span className="font-mono uppercase block mb-3" style={{ fontSize: 10, letterSpacing: "0.1em", color: BLUE }}>Your content plan this week</span>
              <div className="space-y-2.5">
                {PLAN_CARDS.map((card, i) => {
                  const isActive = activeCard === i;
                  return (
                    <div
                      key={i}
                      onClick={() => setActiveCard(i)}
                      className="cursor-pointer transition-all"
                      style={{
                        padding: 24, borderRadius: 12, background: isActive ? BLUE_SOFT : "#fff",
                        border: `1px solid ${isActive ? BLUE : BORDER}`,
                        opacity: cardsReady ? 1 : 0,
                        transform: cardsReady ? "translateX(0)" : "translateX(20px)",
                        transition: `all 0.4s ease ${i * 0.12}s, background 0.2s, border-color 0.2s`,
                        boxShadow: isActive ? `0 0 0 1px ${BLUE}20` : "none",
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-sans text-[14px] font-medium" style={{ color: INK }}>{card.title}</span>
                        <span className="font-mono shrink-0 text-[10px] px-2.5 py-0.5 rounded-full" style={{ color: BLUE, background: BLUE_SOFT }}>{card.channel}</span>
                      </div>
                      {isActive && (
                        <div className="mt-4 space-y-3" style={{ animation: "fadeIn 0.3s ease" }}>
                          <span className="font-mono uppercase" style={{ fontSize: 9, letterSpacing: "0.1em", color: DIM }}>Post on {card.when}</span>
                          <p className="font-sans" style={{ fontSize: 13, lineHeight: 1.6, color: DIM }}>{card.why}</p>
                          <div className="pl-3.5" style={{ borderLeft: `2px solid ${BLUE}` }}>
                            <span className="font-mono uppercase block mb-1" style={{ fontSize: 9, letterSpacing: "0.1em", color: BLUE }}>Writing nudge</span>
                            <p className="font-sans italic" style={{ fontSize: 13, lineHeight: 1.55, color: INK }}>{card.nudge}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section ref={s3.ref} style={s3.style}>
        <div className="max-w-[660px] mx-auto px-6 py-20">
          <h2 className="font-serif text-center mb-14" style={{ fontSize: "clamp(24px, 3.6vw, 34px)", fontWeight: 400 }}>Drop. Plan. Write.</h2>
          <div>
            {[
              { n: "01", title: "Drop in your week", desc: "Quick notes, voice memos, random thoughts. Not drafts. Just fragments. 2-3 minutes throughout your week." },
              { n: "02", title: "Get your plan", desc: "Accent connects the dots. It tells you which moments are worth posting, which channel each one fits, and when to publish. Your content calendar, built from your real life." },
              { n: "03", title: "Write it yourself", desc: "Pick a story and write it. Accent coaches you as you go — word suggestions, structural feedback, and what makes your angle different from everyone else's." },
            ].map((s, i, arr) => (
              <div key={s.n} className="grid gap-4" style={{ gridTemplateColumns: "44px 1fr", paddingTop: 20, paddingBottom: 20, borderBottom: i < arr.length - 1 ? `1px solid ${BORDER}` : "none" }}>
                <span className="font-mono" style={{ fontSize: 12, color: BLUE, fontWeight: 500, paddingTop: 2 }}>{s.n}</span>
                <div>
                  <h3 className="font-serif mb-1.5" style={{ fontSize: 22, fontWeight: 400 }}>{s.title}</h3>
                  <p className="font-sans" style={{ fontSize: 14, color: DIM, lineHeight: 1.65 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiator */}
      <section ref={s4.ref} style={s4.style}>
        <div className="mx-6 my-8" style={{ background: INK, borderRadius: 18, padding: "52px 44px", maxWidth: 840, marginLeft: "auto", marginRight: "auto" }}>
          <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 36 }}>
            <div>
              <span className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: "0.1em", color: BLUE }}>Why Accent is different</span>
              <h2 className="font-serif mt-3 mb-4" style={{ fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 400, color: "#fff", lineHeight: 1.3 }}>
                Other tools start with <em style={{ opacity: 0.45 }}>content</em>.<br />Accent starts with <em style={{ color: BLUE }}>you</em>.
              </h2>
              <p className="font-sans" style={{ fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.7 }}>
                Content planners give you a calendar. AI writers give you generic text. Neither knows who you are. Accent starts by understanding your story, your audience, and what you're building. The content follows from there.
              </p>
            </div>
            <div className="space-y-3">
              {[
                { icon: "📅", label: "Content calendars", line1: "Tell you when to post", line2: "→ Don't know who you are", highlight: false },
                { icon: "🤖", label: "AI writers", line1: "Write posts for you", line2: "→ Sound like everyone else", highlight: false },
                { icon: "✦", label: "Accent", line1: "Learns your story first, then plans your content", line2: "→ Sounds like you because it started with you", highlight: true },
              ].map(c => (
                <div key={c.label} className="p-4.5 rounded-[10px]" style={{ padding: 18, background: c.highlight ? BLUE_SOFT : "rgba(255,255,255,0.03)", border: `1px solid ${c.highlight ? "rgba(37,99,235,0.18)" : "rgba(255,255,255,0.05)"}` }}>
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
      <section ref={s5.ref} style={s5.style}>
        <div className="max-w-[840px] mx-auto px-6 py-20">
          <h2 className="font-serif text-center mb-12" style={{ fontSize: "clamp(24px, 3.6vw, 34px)", fontWeight: 400, lineHeight: 1.3 }}>
            Built for founders who'd rather talk to customers<br /><em>than plan content</em>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: 14 }}>
            {[
              { title: "Community builders", pain: "Running events, having conversations, but never turning those moments into content", how: "Drop notes after each event. Accent shows which moments resonate." },
              { title: "Build-in-public founders", pain: "Want to share the journey but stare at blank pages every week", how: "Your week is the content. Accent finds the stories you're too close to see." },
              { title: "Non-native speakers", pain: "Strong ideas but second-guessing every English sentence", how: "Write in your voice. Accent coaches word by word — teaching, not replacing." },
            ].map(c => (
              <div key={c.title} style={{ padding: "24px 22px", border: `1px solid ${BORDER}`, borderRadius: 12 }}>
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
        <div className="max-w-[520px] mx-auto px-6 py-20 text-center">
          <h2 className="font-serif mb-4" style={{ fontSize: "clamp(24px, 3.6vw, 36px)", lineHeight: 1.2 }}>
            <span style={{ fontWeight: 300 }}>Your week already happened.</span><br />
            <span style={{ fontWeight: 700, fontStyle: "italic" }}>The content plan is in there.</span>
          </h2>
          <p className="font-sans mx-auto mb-6" style={{ fontSize: 15, color: DIM, lineHeight: 1.6, maxWidth: 380 }}>
            15 minutes. We learn what you're building, who you're talking to, and what happened this week. You walk away with your first content plan. First 2 weeks free.
          </p>
          <a href="https://calendly.com/yaozhou/quick-intro" className="no-underline inline-block px-8 py-4 rounded-full font-sans font-semibold text-[16px]" style={{ background: BLUE, color: "#fff", borderRadius: 40 }}>
            Book your onboarding →
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
      `}</style>
    </div>
  );
}
