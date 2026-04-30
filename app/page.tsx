"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const INK = "#1A1A18";
const DIM = "#6B6B6B";
const BLUE = "#2563EB";
const BORDER = "#E5E5E5";

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, style: { opacity: v ? 1 : 0, transform: v ? "translateY(0)" : "translateY(20px)", transition: "opacity 0.6s ease, transform 0.6s ease" } as React.CSSProperties };
}

const DEMO_ENTRY = `Had a weird day. A vendor I was really excited about completely ghosted me after two calls. Spent the morning feeling defeated. Then around lunch, someone I've never talked to DM'd me saying they found us through a friend and wanted to sign up. First real organic sale. Didn't even know what to say. Also realized our onboarding flow is a mess — took her 20 minutes to figure out how to pay. Need to fix that. Community call tonight went well though, 8 people showed up which is a record.`;

const DEMO_STORIES = [
  { angle: "The contrast between rejection and surprise", channel: "LinkedIn", insight: "A vendor ghosted you on the same day you got your first organic customer. That tension — doors closing and opening simultaneously — is the most relatable founder moment.", nudge: "Start with the vendor ghosting. Let the reader assume the day was a loss. Then reveal the DM. The reversal is the hook." },
  { angle: "Your onboarding is broken and you're saying it out loud", channel: "Community Post", insight: "Most founders hide their product flaws. You just admitted a paying customer struggled for 20 minutes. That honesty is rare and builds trust.", nudge: "Ask your community for help. 'Our first paying customer almost didn't make it through onboarding. What's your setup look like?'" },
  { angle: "8 people showed up", channel: "Newsletter", insight: "You almost buried this. A community call with 8 attendees when you're just starting is a milestone.", nudge: "The story isn't '8 people came to my call.' It's 'I expected 2 and 8 showed up and here's what that taught me.'" },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [expandedStory, setExpandedStory] = useState<number | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const s1 = useReveal(), s2 = useReveal(), s3 = useReveal(), s4 = useReveal(), s5 = useReveal(), s6 = useReveal();

  return (
    <div style={{ background: "#fff", color: INK }}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300" style={{ background: scrolled ? "rgba(255,255,255,0.92)" : "transparent", backdropFilter: scrolled ? "blur(12px)" : "none", WebkitBackdropFilter: scrolled ? "blur(12px)" : "none", borderBottom: scrolled ? `1px solid ${BORDER}` : "none" }}>
        <div className="max-w-[1040px] mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-serif" style={{ fontSize: 20, fontWeight: 600, color: INK }}>accent</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="no-underline font-sans text-[13px]" style={{ color: DIM }}>Log in</Link>
            <Link href="/signup" className="no-underline px-5 py-2 rounded-full text-[13px] font-sans font-semibold" style={{ background: BLUE, color: "#fff" }}>Start your diary →</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center" style={{ paddingTop: 140, paddingBottom: 60 }}>
        <div className="max-w-[680px] mx-auto px-6">
          <div className="flex items-center justify-center gap-3 mb-8">
            <span style={{ width: 24, height: 1, background: BLUE, display: "inline-block" }} />
            <span className="font-mono uppercase" style={{ fontSize: 11, letterSpacing: "0.14em", color: BLUE }}>For founders who build in public</span>
            <span style={{ width: 24, height: 1, background: BLUE, display: "inline-block" }} />
          </div>
          <h1 className="font-serif" style={{ fontSize: "clamp(36px, 7vw, 52px)", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            <span style={{ fontWeight: 300 }}>Your week is full of stories.</span><br />
            <span style={{ fontWeight: 700, fontStyle: "italic" }}>You just don't see them yet.</span>
          </h1>
          <p className="font-sans mx-auto mt-6" style={{ fontSize: 17, color: "rgba(26,26,24,0.5)", lineHeight: 1.6, maxWidth: 520 }}>
            Accent is a founder's diary that turns your daily experiences into build-in-public content. You journal what happened. Accent shows you what's worth sharing and where. You write it yourself.
          </p>
          <div className="flex justify-center gap-3 mt-8 flex-wrap">
            <a href="#demo" className="no-underline px-7 py-3.5 rounded-full font-sans font-semibold text-[15px]" style={{ background: BLUE, color: "#fff" }}>See how it works</a>
            <Link href="/signup" className="no-underline px-6 py-3 rounded-full font-sans font-medium text-[14px]" style={{ border: `1.5px solid ${BORDER}`, color: INK }}>Start your diary</Link>
          </div>
        </div>
      </section>

      {/* Problem section */}
      <section ref={s1.ref} style={s1.style}>
        <div className="max-w-[800px] mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <h3 className="font-mono uppercase mb-4" style={{ fontSize: 11, letterSpacing: "0.1em", color: DIM }}>What founders do now</h3>
            <ul className="space-y-3 list-none p-0">
              {["Stare at blank page", "Wonder 'what should I post?'", "Paste into ChatGPT", "Get generic content back", "Post it, feel nothing"].map((t, i) => (
                <li key={i} className="font-sans text-[15px] flex items-start gap-2" style={{ color: "rgba(26,26,24,0.5)" }}>
                  <span style={{ color: "#DC2626", fontSize: 12, marginTop: 4 }}>✕</span>{t}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-mono uppercase mb-4" style={{ fontSize: 11, letterSpacing: "0.1em", color: BLUE }}>What Accent does</h3>
            <ul className="space-y-3 list-none p-0">
              {["Journal what happened today", "Accent finds the stories", "Shows you the angle + channel", "You write it, with coaching", "Post it, mean every word"].map((t, i) => (
                <li key={i} className="font-sans text-[15px] flex items-start gap-2" style={{ color: INK }}>
                  <span style={{ color: BLUE, fontSize: 12, marginTop: 4 }}>✓</span>{t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Demo */}
      <section id="demo" ref={s2.ref} style={{ ...s2.style, background: "#FAFAFA" }}>
        <div className="max-w-[1000px] mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <span className="font-mono uppercase" style={{ fontSize: 11, letterSpacing: "0.14em", color: BLUE }}>See it in action</span>
            <h2 className="font-serif mt-3" style={{ fontSize: "clamp(28px, 5vw, 40px)", fontWeight: 400 }}>One diary entry. Three stories found.</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <span className="font-mono uppercase block mb-3" style={{ fontSize: 10, letterSpacing: "0.1em", color: DIM }}>Diary entry</span>
              <div className="p-5" style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 10 }}>
                <p className="font-sans" style={{ fontSize: 15, lineHeight: 1.7, color: INK }}>{DEMO_ENTRY}</p>
              </div>
              <p className="mt-2 font-mono text-[11px]" style={{ color: "#AAAAAA" }}>87 words, 2 minutes to write</p>
            </div>
            <div>
              <span className="font-mono uppercase block mb-3" style={{ fontSize: 10, letterSpacing: "0.1em", color: DIM }}>Stories found</span>
              <div className="space-y-3">
                {DEMO_STORIES.map((story, i) => (
                  <div key={i} className="transition-all" style={{ background: "#fff", border: `1px solid ${expandedStory === i ? BLUE : BORDER}`, borderRadius: 10, overflow: "hidden" }}>
                    <button onClick={() => setExpandedStory(expandedStory === i ? null : i)} className="w-full text-left p-4 flex items-start justify-between gap-3" style={{ border: "none", background: "transparent", cursor: "pointer" }}>
                      <div>
                        <span className="font-sans text-[15px] font-medium block" style={{ color: INK }}>{story.angle}</span>
                        <span className="font-mono text-[11px] mt-1 inline-block px-2 py-0.5 rounded-full" style={{ background: `${BLUE}0A`, color: BLUE, border: `1px solid ${BLUE}20` }}>{story.channel}</span>
                      </div>
                      <span className="text-[12px] shrink-0 mt-1" style={{ color: "#AAAAAA", transition: "transform 0.2s", transform: expandedStory === i ? "rotate(180deg)" : "none" }}>▼</span>
                    </button>
                    {expandedStory === i && (
                      <div className="px-4 pb-4 space-y-3">
                        <div className="pl-3" style={{ borderLeft: `2px solid ${BLUE}` }}>
                          <span className="font-mono uppercase block mb-1" style={{ fontSize: 10, color: "#AAAAAA" }}>Insight</span>
                          <p className="font-sans text-[14px]" style={{ color: INK, lineHeight: 1.5 }}>{story.insight}</p>
                        </div>
                        <div>
                          <span className="font-mono uppercase block mb-1" style={{ fontSize: 10, color: "#AAAAAA" }}>Writing nudge</span>
                          <p className="font-sans text-[14px] italic" style={{ color: DIM, lineHeight: 1.5 }}>{story.nudge}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="text-center mt-12 p-6 rounded-[10px]" style={{ background: `${BLUE}06`, border: `1px solid ${BLUE}15` }}>
            <p className="font-sans text-[16px]" style={{ color: INK }}>That was someone else's week.</p>
            <p className="font-sans text-[15px] mb-4" style={{ color: DIM }}>What happened in yours?</p>
            <Link href="/signup" className="no-underline inline-block px-7 py-3 rounded-full font-sans font-semibold text-[15px]" style={{ background: BLUE, color: "#fff" }}>Start your diary →</Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section ref={s3.ref} style={s3.style}>
        <div className="max-w-[640px] mx-auto px-6 py-20">
          <h2 className="font-serif text-center mb-14" style={{ fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 400 }}>Three steps. Two minutes a day.</h2>
          <div className="space-y-10">
            {[
              { n: "01", title: "Journal", desc: "Spend 2 minutes writing what happened today. Not a post. Not a draft. Just what's on your mind." },
              { n: "02", title: "See", desc: "Accent reads your entries and surfaces stories you missed. It maps each one to a channel and tells you why your angle is different." },
              { n: "03", title: "Write", desc: "Pick a story and write it yourself. Accent coaches you as you go, flagging where you're burying the lead, suggesting stronger words." },
            ].map(s => (
              <div key={s.n} className="flex gap-6">
                <span className="font-mono shrink-0" style={{ fontSize: 14, color: BLUE, fontWeight: 500, marginTop: 3 }}>{s.n}</span>
                <div>
                  <h3 className="font-serif mb-1" style={{ fontSize: 20, fontWeight: 400 }}>{s.title}</h3>
                  <p className="font-sans" style={{ fontSize: 15, color: DIM, lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Differentiator */}
      <section ref={s4.ref} style={s4.style}>
        <div className="mx-6 my-8 rounded-[16px]" style={{ background: INK }}>
          <div className="max-w-[960px] mx-auto px-8 py-16 grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="font-serif mb-4" style={{ fontSize: "clamp(24px, 4vw, 32px)", fontWeight: 400, color: "#fff" }}>
                AI writing tools make you dependent.<br />Accent makes you independent.
              </h2>
            </div>
            <div className="space-y-3">
              {[
                { label: "ChatGPT", desc: "Writes content for you. You sound like everyone.", border: "rgba(255,255,255,0.08)" },
                { label: "Repurposing tools", desc: "Reformats your post. Same ideas, different shape.", border: "rgba(255,255,255,0.08)" },
                { label: "Accent", desc: "Finds your stories, coaches your writing. Your voice, your experiences, undeniable.", border: `${BLUE}60` },
              ].map(c => (
                <div key={c.label} className="p-4 rounded-[8px]" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${c.border}` }}>
                  <span className="font-mono uppercase block mb-1" style={{ fontSize: 10, letterSpacing: "0.08em", color: c.label === "Accent" ? BLUE : "rgba(255,255,255,0.3)" }}>{c.label}</span>
                  <p className="font-sans text-[14px]" style={{ color: c.label === "Accent" ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section ref={s5.ref} style={s5.style}>
        <div className="max-w-[1000px] mx-auto px-6 py-20">
          <h2 className="font-serif text-center mb-12" style={{ fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 400 }}>Built for founders like you</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { title: "The first-time founder", desc: "Building a community, shipping a product, no idea what to post. Your days are full of content. You just need help seeing it." },
              { title: "The non-native speaker", desc: "Your ideas are strong. Your English is good enough. You just second-guess every sentence. Accent coaches, not corrects." },
              { title: "The build-in-public founder", desc: "You want to share the journey but stare at blank pages. Your diary already has the stories. Accent pulls them out." },
            ].map(c => (
              <div key={c.title} className="p-5" style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 10 }}>
                <h3 className="font-serif mb-2" style={{ fontSize: 18, fontWeight: 400 }}>{c.title}</h3>
                <p className="font-sans text-[14px]" style={{ color: DIM, lineHeight: 1.5 }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section ref={s6.ref} style={s6.style}>
        <div className="max-w-[560px] mx-auto px-6 py-20 text-center">
          <h2 className="font-serif mb-4" style={{ fontSize: "clamp(30px, 5vw, 44px)", lineHeight: 1.1 }}>
            <span style={{ fontWeight: 300 }}>Your week already happened.</span><br />
            <span style={{ fontWeight: 700, fontStyle: "italic" }}>The content is in there.</span>
          </h2>
          <Link href="/signup" className="no-underline inline-block mt-6 px-8 py-4 rounded-full font-sans font-semibold text-[16px]" style={{ background: BLUE, color: "#fff" }}>Start your diary →</Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${BORDER}` }}>
        <div className="max-w-[1040px] mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-serif" style={{ fontSize: 16, color: INK }}>accent</span>
          <div className="flex gap-6 text-[12px] font-sans" style={{ color: DIM }}>
            <span>Built in Amsterdam</span>
            <Link href="/privacy-contact" className="no-underline" style={{ color: DIM }}>Privacy</Link>
            <a href="mailto:hello@myaccent.io" className="no-underline" style={{ color: DIM }}>Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
