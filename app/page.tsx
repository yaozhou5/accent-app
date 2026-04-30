"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const INK = "#1A1A18";
const DIM = "#6B6B6B";
const FAINT = "rgba(26,26,24,0.4)";
const BLUE = "#2563EB";
const BG = "#FFFFFF";
const ALT_BG = "#FAFAFA";
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

function AnimNum({ target, suffix = "" }: { target: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [val, setVal] = useState("0");
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        const num = parseInt(target) || 0;
        if (num === 0) { setVal(target); return; }
        let i = 0;
        const step = () => { i += Math.ceil(num / 20); if (i >= num) { setVal(target); return; } setVal(String(i)); requestAnimationFrame(step); };
        step();
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target]);
  return <span ref={ref}>{val}{suffix}</span>;
}

const EXAMPLES = [
  { label: "Community update", text: "I just launched a small community for designers in Amsterdam who want to learn about business. We meet every two weeks and share what we're working on. It's been really helpful for me and I think it could help others too. If you're interested you can join through the link in my bio." },
  { label: "Product launch", text: "We've been working on this for 6 months and it's finally ready. It's a tool that helps freelancers track their time and send invoices in one place. We built it because we were tired of using 3 different apps for something that should be simple. It's free to try and we'd love your feedback." },
  { label: "Cold outreach", text: "Hi, I saw your profile and I think our product could help your team. We make a project management tool that's designed for small agencies. Would you be open to a quick call this week to discuss?" },
];

const DEMO_CHANNELS = ["linkedin", "tweet", "cold_dm", "newsletter", "community_post"];
const DEMO_CHANNEL_LABELS: Record<string, string> = { linkedin: "LinkedIn", tweet: "Tweet", cold_dm: "Cold DM", newsletter: "Newsletter", community_post: "Community Post" };

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  // Demo state
  const [demoDraft, setDemoDraft] = useState("");
  const [demoChannel, setDemoChannel] = useState("linkedin");
  const [demoState, setDemoState] = useState<"input" | "loading" | "result">("input");
  const [demoResult, setDemoResult] = useState("");
  const [demoStandOut, setDemoStandOut] = useState<{ common_take: string; unique_angle: string; bold_move: string } | null>(null);
  const [demoUsed, setDemoUsed] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDemoUsed(!!sessionStorage.getItem("accent-demo-used"));
    }
  }, []);

  const handleDemo = async () => {
    if (!demoDraft.trim() || demoState === "loading") return;
    setDemoState("loading");
    try {
      const res = await fetch("/api/spread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: demoDraft, channels: [demoChannel] }),
      });
      const data = await res.json();
      if (data.results?.[demoChannel]) {
        const r = data.results[demoChannel];
        setDemoResult(typeof r === "string" ? r : r.text || "");
        setDemoStandOut(r.stand_out || null);
        setDemoState("result");
        sessionStorage.setItem("accent-demo-used", "1");
        setDemoUsed(true);
      } else { setDemoState("input"); }
    } catch { setDemoState("input"); }
  };

  const s1 = useReveal(), s2 = useReveal(), s3 = useReveal(), s4 = useReveal(), s5 = useReveal(), s6 = useReveal(), s7 = useReveal();

  return (
    <div style={{ background: BG, color: INK }}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300" style={{ background: scrolled ? "rgba(255,255,255,0.92)" : "transparent", backdropFilter: scrolled ? "blur(12px)" : "none", WebkitBackdropFilter: scrolled ? "blur(12px)" : "none", borderBottom: scrolled ? `1px solid ${BORDER}` : "none" }}>
        <div className="max-w-[1040px] mx-auto px-6 py-4 flex items-center justify-between">
          <span className="font-serif" style={{ fontSize: 20, fontWeight: 600, color: INK }}>accent</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="no-underline font-sans text-[13px]" style={{ color: DIM }}>Log in</Link>
            <Link href="/signup" className="no-underline px-5 py-2 rounded-full text-[13px] font-sans font-semibold" style={{ background: BLUE, color: "#fff" }}>
              Try it free →
            </Link>
          </div>
        </div>
      </nav>

      {/* 1. Hero */}
      <section className="text-center" style={{ paddingTop: 140, paddingBottom: 80 }}>
        <div className="max-w-[680px] mx-auto px-6">
          <div className="flex items-center justify-center gap-3 mb-8">
            <span style={{ width: 24, height: 1, background: BLUE, display: "inline-block" }} />
            <span className="font-mono uppercase" style={{ fontSize: 11, letterSpacing: "0.14em", color: BLUE }}>For solo founders who write</span>
            <span style={{ width: 24, height: 1, background: BLUE, display: "inline-block" }} />
          </div>
          <h1 className="font-serif" style={{ fontSize: "clamp(36px, 7vw, 56px)", lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            <span style={{ fontWeight: 300 }}>You're already writing.</span>
            <br />
            <span style={{ fontWeight: 700, fontStyle: "italic" }}>Make it go further.</span>
          </h1>
          <p className="font-sans mx-auto mt-6" style={{ fontSize: 18, color: DIM, lineHeight: 1.6, maxWidth: 540 }}>
            You spend 45 minutes on a community update and 30 people see it. Accent turns that one draft into LinkedIn posts, cold DMs, tweets, and newsletters that actually sound like you.
          </p>
          <div className="flex justify-center gap-3 mt-8 flex-wrap">
            <a href="#demo" className="no-underline px-7 py-3.5 rounded-full font-sans font-semibold text-[15px]" style={{ background: BLUE, color: "#fff" }}>
              Try it on your writing →
            </a>
            <Link href="/signup" className="no-underline px-6 py-3 rounded-full font-sans font-medium text-[14px]" style={{ border: `1.5px solid ${BORDER}`, color: INK }}>
              Create free account
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Pain quote */}
      <section ref={s1.ref} style={s1.style}>
        <div className="max-w-[680px] mx-auto px-6 py-16">
          <div className="pl-7" style={{ borderLeft: `2px solid ${BLUE}` }}>
            <p className="font-serif italic" style={{ fontSize: "clamp(20px, 3.5vw, 26px)", fontWeight: 300, lineHeight: 1.4, color: INK }}>
              "I didn't sign up to be a content machine. But apparently that's half the job now."
            </p>
            <p className="font-sans mt-4" style={{ fontSize: 14, color: DIM }}>Every solo founder, eventually</p>
          </div>
        </div>
      </section>

      {/* 3. Live Demo */}
      <section id="demo" ref={s2.ref} style={{ ...s2.style, background: ALT_BG }}>
        <div className="max-w-[720px] mx-auto px-6 py-20">
          <div className="text-center mb-10">
            <span className="font-mono uppercase" style={{ fontSize: 11, letterSpacing: "0.14em", color: BLUE }}>Try it now</span>
            <h2 className="font-serif mt-3" style={{ fontSize: "clamp(28px, 5vw, 40px)", fontWeight: 400 }}>See what Accent does with your writing</h2>
          </div>

          {demoState === "input" && (
            <div>
              {demoUsed ? (
                <div className="text-center p-8" style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 10 }}>
                  <p className="font-sans text-[16px] mb-4" style={{ color: INK }}>You've used your free demo.</p>
                  <Link href="/signup" className="no-underline px-7 py-3.5 rounded-full font-sans font-semibold text-[15px]" style={{ background: BLUE, color: "#fff" }}>
                    Sign up to keep going →
                  </Link>
                </div>
              ) : (
                <>
                  <textarea value={demoDraft} onChange={e => setDemoDraft(e.target.value)} placeholder="Paste something you've already written..."
                    rows={6} className="w-full outline-none resize-y font-sans mb-3"
                    style={{ fontSize: 16, color: INK, lineHeight: 1.7, padding: "16px 20px", border: `1px solid ${BORDER}`, borderRadius: 10, background: "#fff" }} />

                  <div className="flex flex-wrap gap-2 mb-4">
                    {EXAMPLES.map(ex => (
                      <button key={ex.label} onClick={() => setDemoDraft(ex.text)} className="px-3 py-1.5 rounded-full text-[12px] font-mono" style={{ border: `1px solid ${BORDER}`, background: "transparent", color: DIM, cursor: "pointer" }}>
                        Use example: {ex.label.toLowerCase()}
                      </button>
                    ))}
                  </div>

                  <div className="mb-6">
                    <span className="font-mono uppercase block mb-2" style={{ fontSize: 10, letterSpacing: "0.1em", color: DIM }}>Channel</span>
                    <div className="flex flex-wrap gap-1">
                      {DEMO_CHANNELS.map(ch => (
                        <button key={ch} onClick={() => setDemoChannel(ch)} className="px-3 py-1.5 rounded-full text-[12px] font-mono transition-all" style={{
                          background: demoChannel === ch ? BLUE : "transparent", color: demoChannel === ch ? "#fff" : DIM,
                          border: demoChannel === ch ? "none" : `1px solid ${BORDER}`, cursor: "pointer",
                        }}>{DEMO_CHANNEL_LABELS[ch]}</button>
                      ))}
                    </div>
                  </div>

                  <button onClick={handleDemo} disabled={!demoDraft.trim()} className="w-full py-3.5 rounded-full font-sans font-semibold text-[15px] transition-opacity hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed" style={{ background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}>
                    See what Accent does →
                  </button>
                </>
              )}
            </div>
          )}

          {demoState === "loading" && (
            <div className="text-center py-16">
              <p className="font-mono text-[13px]" style={{ color: DIM }}>Reading your draft...</p>
              <div className="mt-4 flex justify-center gap-2">
                {[0, 1, 2].map(i => <div key={i} className="rounded-full" style={{ width: 6, height: 6, background: BLUE, opacity: 0.4, animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />)}
              </div>
            </div>
          )}

          {demoState === "result" && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: "0.1em", color: DIM }}>{DEMO_CHANNEL_LABELS[demoChannel]} version</span>
                <button onClick={() => { navigator.clipboard.writeText(demoResult); }} className="px-4 py-1.5 rounded-full text-[12px] font-mono" style={{ border: `1px solid ${BORDER}`, background: "transparent", color: DIM, cursor: "pointer" }}>
                  Copy
                </button>
              </div>
              <div className="p-5 mb-4" style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 10 }}>
                <p className="font-sans whitespace-pre-wrap" style={{ fontSize: 15, lineHeight: 1.7, color: INK }}>{demoResult}</p>
              </div>

              {demoStandOut && (
                <div className="p-5 mb-6 space-y-3" style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 10 }}>
                  <span className="font-mono uppercase block" style={{ fontSize: 10, letterSpacing: "0.06em", color: "#AAAAAA" }}>How to stand out</span>
                  <div>
                    <span className="font-mono uppercase block mb-1" style={{ fontSize: 10, color: "#AAAAAA" }}>What everyone says</span>
                    <p className="font-sans text-[14px]" style={{ color: INK, lineHeight: 1.5 }}>{demoStandOut.common_take}</p>
                  </div>
                  <div className="pl-3" style={{ borderLeft: `2px solid ${BLUE}` }}>
                    <span className="font-mono uppercase block mb-1" style={{ fontSize: 10, color: "#AAAAAA" }}>Your angle</span>
                    <p className="font-sans text-[14px]" style={{ color: INK, lineHeight: 1.5 }}>{demoStandOut.unique_angle}</p>
                  </div>
                  <div>
                    <span className="font-mono uppercase block mb-1" style={{ fontSize: 10, color: "#AAAAAA" }}>One bold move</span>
                    <p className="font-sans text-[14px] font-medium" style={{ color: INK, lineHeight: 1.5 }}>{demoStandOut.bold_move}</p>
                  </div>
                </div>
              )}

              <div className="text-center p-6" style={{ background: `${BLUE}06`, border: `1px solid ${BLUE}15`, borderRadius: 10 }}>
                <p className="font-sans text-[16px] mb-1" style={{ color: INK }}>This is one channel.</p>
                <p className="font-sans text-[15px] mb-4" style={{ color: DIM }}>Sign up to spread your writing across all of them.</p>
                <Link href="/signup" className="no-underline inline-block px-7 py-3 rounded-full font-sans font-semibold text-[15px]" style={{ background: BLUE, color: "#fff" }}>
                  Create free account →
                </Link>
                <p className="font-sans text-[12px] mt-2" style={{ color: "#AAAAAA" }}>No credit card. Free to start.</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. Stats */}
      <section ref={s3.ref} style={s3.style}>
        <div className="max-w-[800px] mx-auto px-6 py-4" style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
          <div className="grid grid-cols-3 text-center py-6">
            {[
              { num: "1", label: "draft", sub: "you write" },
              { num: "5", label: "channels", sub: "it reaches" },
              { num: "10", label: "the reach", sub: "same effort" },
            ].map((s) => (
              <div key={s.label}>
                <div className="font-serif" style={{ fontSize: 48, fontWeight: 300, color: INK }}><AnimNum target={s.num} suffix={s.num === "10" ? "x" : ""} /></div>
                <div className="font-mono uppercase" style={{ fontSize: 10, letterSpacing: "0.1em", color: DIM }}>{s.label}</div>
                <div className="font-sans" style={{ fontSize: 13, color: DIM, marginTop: 2 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Use cases */}
      <section ref={s4.ref} style={s4.style}>
        <div className="max-w-[1000px] mx-auto px-6 py-20">
          <span className="font-mono uppercase block text-center mb-3" style={{ fontSize: 11, letterSpacing: "0.14em", color: BLUE }}>Built for your week</span>
          <h2 className="font-serif text-center mb-12" style={{ fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 400 }}>Every founder has these moments</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { title: "Launch day", pain: "You're launching next week and need a Product Hunt post, 3 tweets, a LinkedIn announcement, and a cold email to press.", solve: "Write your launch story once. Accent shapes it for every channel, in your voice." },
              { title: "Cold outreach", pain: "You know your product solves a real problem but your DMs sound like every other founder's.", solve: "Paste your pitch. Accent rewrites it so it reads like a person, not a template." },
              { title: "Weekly content", pain: "You posted a community update. 30 people saw it. That insight deserved more.", solve: "Turn one update into a LinkedIn post, a tweet thread, and a newsletter intro. Same ideas, native to each platform." },
            ].map((c) => (
              <div key={c.title} className="p-5 transition-all" style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 10 }}
                onMouseEnter={e => e.currentTarget.style.borderColor = BLUE}
                onMouseLeave={e => e.currentTarget.style.borderColor = BORDER}
              >
                <h3 className="font-serif mb-3" style={{ fontSize: 20, fontWeight: 400 }}>{c.title}</h3>
                <p className="font-sans text-[14px] mb-4" style={{ color: DIM, lineHeight: 1.5 }}>{c.pain}</p>
                <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
                  <p className="font-sans text-[14px]" style={{ color: INK, lineHeight: 1.5 }}>{c.solve}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Differentiator */}
      <section ref={s5.ref} style={s5.style}>
        <div className="mx-6 my-8 rounded-[16px]" style={{ background: INK }}>
          <div className="max-w-[960px] mx-auto px-8 py-16 grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <span className="font-mono uppercase" style={{ fontSize: 11, letterSpacing: "0.14em", color: BLUE }}>Not another AI writer</span>
              <h2 className="font-serif mt-3 mb-4" style={{ fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 400, color: "#fff" }}>
                ChatGPT writes <em>for</em> you.
                <br />
                Accent writes <em>like</em> you.
              </h2>
              <p className="font-sans" style={{ fontSize: 15, color: "rgba(255,255,255,0.55)", lineHeight: 1.6 }}>
                AI writers produce content that sounds like everyone. Accent starts with YOUR draft, YOUR voice, YOUR ideas. It adapts the format and tone per channel without smoothing out the parts that make it yours.
              </p>
            </div>
            <div className="space-y-4">
              <div className="p-4 rounded-[8px]" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <span className="font-mono uppercase block mb-2" style={{ fontSize: 10, letterSpacing: "0.08em", color: "rgba(255,255,255,0.3)" }}>Generic AI</span>
                <p className="font-serif" style={{ fontSize: 15, color: "rgba(255,255,255,0.45)", lineHeight: 1.6 }}>
                  "We are excited to announce our new community for designers."
                </p>
              </div>
              <div className="p-4 rounded-[8px]" style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BLUE}60` }}>
                <span className="font-mono uppercase block mb-2" style={{ fontSize: 10, letterSpacing: "0.08em", color: BLUE }}>Accent</span>
                <p className="font-serif" style={{ fontSize: 15, color: "rgba(255,255,255,0.9)", lineHeight: 1.6 }}>
                  "Most designers in Amsterdam work alone. I got tired of it. So I started inviting people over."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. How it works */}
      <section ref={s6.ref} style={s6.style}>
        <div className="max-w-[640px] mx-auto px-6 py-20">
          <h2 className="font-serif text-center mb-14" style={{ fontSize: "clamp(26px, 4vw, 36px)", fontWeight: 400 }}>Three steps. No content strategy required.</h2>
          <div className="space-y-10">
            {[
              { n: "01", title: "Paste your draft", desc: "Whatever you were going to write anyway. A community update, an email, a rough idea." },
              { n: "02", title: "Pick your channels", desc: "LinkedIn, cold DM, tweet, newsletter. Accent adapts the tone, length, and structure for each." },
              { n: "03", title: "Sound like yourself", desc: "Every version keeps your voice. No corporate smoothing. No AI blandness. Just you, sharper." },
            ].map((s) => (
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

      {/* 8. Final CTA */}
      <section ref={s7.ref} style={s7.style}>
        <div className="max-w-[560px] mx-auto px-6 py-20 text-center">
          <h2 className="font-serif mb-4" style={{ fontSize: "clamp(30px, 5vw, 44px)", lineHeight: 1.1 }}>
            <span style={{ fontWeight: 300 }}>You wrote it.</span>
            <br />
            <span style={{ fontWeight: 700, fontStyle: "italic" }}>Let it work.</span>
          </h2>
          <p className="font-sans mx-auto mb-8" style={{ fontSize: 16, color: DIM, lineHeight: 1.6, maxWidth: 420 }}>
            Free to start. No credit card. Paste something you've already written and see what Accent does with it.
          </p>
          <Link href="/signup" className="no-underline inline-block px-8 py-4 rounded-full font-sans font-semibold text-[16px]" style={{ background: BLUE, color: "#fff" }}>
            Start writing like you →
          </Link>
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

      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} } @keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:1} }`}</style>
    </div>
  );
}
