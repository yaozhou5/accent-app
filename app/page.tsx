"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { createClient } from "@/lib/supabase/client";

/* ───── DESIGN TOKENS ───── */
const INK = "#1A1A18";
const DIM = "#6B6860";
const FAINT = "#A8A49C";
const RULE = "#D9D5CE";
const ACCENT = "#B8964E";
const CREAM = "#F7F4EF";

/* ───── GAME DATA ───── */
type Option = { text: string; score: number; type: string };
type Round = { flat: string; options: Option[]; insights: string[] };

const ROUNDS: Round[] = [
  {
    flat: "It was a really beautiful sunset.",
    options: [
      { text: "The sunset painted the sky in breathtaking shades of gold and crimson.", score: 1, type: "polisher" },
      { text: "We stopped talking and just watched.", score: 4, type: "writer" },
      { text: "Best sunset I've ever seen, honestly.", score: 2, type: "safe" },
      { text: "The kind of sunset that makes you forgive a bad day.", score: 3, type: "editor" },
    ],
    insights: [
      "More adjectives \u2260 more feeling. The reader drowns in decoration.",
      "You removed the sunset and showed what it did to people. That's the move.",
      "Honest, but generic. Anyone could say this about any sunset.",
      "Nice turn. 'Forgive a bad day' earns the sunset without describing it.",
    ],
  },
  {
    flat: "I miss my grandmother a lot.",
    options: [
      { text: "My grandmother was an incredible woman and I think about her every single day.", score: 1, type: "polisher" },
      { text: "I still dial her number sometimes. Just to hear the voicemail.", score: 4, type: "writer" },
      { text: "Miss you, grandma. Life isn't the same without you.", score: 2, type: "safe" },
      { text: "Nobody makes the house smell like that anymore.", score: 3, type: "editor" },
    ],
    insights: [
      "'Incredible woman' means nothing. Which woman? What made her her?",
      "One specific action. Devastating. This is what voice sounds like.",
      "Warm but forgettable. You'd scroll past this.",
      "You cut the word 'miss' entirely. The reader feels it more.",
    ],
  },
  {
    flat: "Moving to a new city is scary but exciting.",
    options: [
      { text: "New city. No friends. No favorite coffee spot. No idea where I'm going. Can't wait.", score: 3, type: "editor" },
      { text: "Embarking on a new chapter in a vibrant city full of endless possibilities and new beginnings.", score: 1, type: "polisher" },
      { text: "Scared honestly. But the good kind of scared.", score: 2, type: "safe" },
      { text: "I don't know a single person there. That's exactly why I'm going.", score: 4, type: "writer" },
    ],
    insights: [
      "The rhythm does the work. Short hits build tension, then the flip.",
      "This is what AI sounds like. Every word is correct. None of them are yours.",
      "Real feeling, but you played it safe at the end. The 'good kind' softens it.",
      "One sentence. One turn. Nothing wasted. Maximum punch.",
    ],
  },
  {
    flat: "My dad worked really hard to give us a good life.",
    options: [
      { text: "My father sacrificed so much for our family. His tireless dedication and selfless love shaped who I am today.", score: 1, type: "polisher" },
      { text: "I never saw him sit down.", score: 4, type: "writer" },
      { text: "He worked nights so we wouldn't notice we were poor. We noticed.", score: 3, type: "editor" },
      { text: "Dad gave us everything. I wish I'd told him that more often.", score: 2, type: "safe" },
    ],
    insights: [
      "'Tireless dedication and selfless love.' That's a eulogy template, not a memory.",
      "Six words. No adjectives. You see the whole man.",
      "The turn at the end. 'We noticed.' That cracks the whole thing open.",
      "Genuine. But it tells the reader what to feel instead of showing them.",
    ],
  },
  {
    flat: "I was really nervous before my big presentation.",
    options: [
      { text: "The anxiety was overwhelming as I stood before the audience, my heart pounding with anticipation.", score: 1, type: "polisher" },
      { text: "I was so nervous I almost didn't go through with it. But I did and I'm proud of myself.", score: 2, type: "safe" },
      { text: "Hands shaking. Mouth dry. First slide up. Then I forgot to be scared.", score: 3, type: "editor" },
      { text: "I threw up in the bathroom at 8:55. Presented at 9.", score: 4, type: "writer" },
    ],
    insights: [
      "'Heart pounding with anticipation.' You decorated the fear instead of showing it.",
      "Honest, but the 'proud of myself' wraps it up too neatly. Life doesn't do that.",
      "Good rhythm. The fragments make the reader feel the speed of the moment.",
      "Brutal. Specific. Unforgettable. Two timestamps tell the whole story.",
    ],
  },
];

function getResult(score: number) {
  if (score >= 17) return { title: "The Writer", desc: "You go specific. You go visceral. You trust the reader to feel it without being told. Most people have lost this instinct. You haven't.", cta: "You already have voice. Imagine it sharper." };
  if (score >= 13) return { title: "The Editor", desc: "You know what hits. You see the good option. But sometimes you pull back before committing. Choosing clever over honest. The instinct is there. It just needs permission.", cta: "You're one draft away from great." };
  if (score >= 9) return { title: "The Safe Voice", desc: "You're warm and honest. People like what you write. But they don't remember it. You go for 'nice' when you could go for 'true.' The generic option feels comfortable because it's what everyone picks.", cta: "Comfortable isn't memorable. Train the muscle." };
  return { title: "The Polisher", desc: "You reach for bigger words when smaller ones would hit harder. You decorate when you should delete. This isn't a talent problem. It's a habit. AI writes like this too. That should worry you.", cta: "Your voice is underneath all that polish. Let's find it." };
}

/* ───── BACKGROUND WRITING DECO ───── */
const DECO_LINES = [
  { text: "We stopped talking and just watched.", top: "18%", left: "3%", rotate: -3 },
  { text: "I never saw him sit down.", top: "42%", right: "2%", rotate: 2 },
  { text: "Nobody makes the house smell like that anymore.", top: "65%", left: "5%", rotate: -1.5 },
  { text: "Two timestamps tell the whole story.", top: "82%", right: "4%", rotate: 1 },
];

/* ───── SCROLL ANIMATION HOOK ───── */
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setVisible(true); }, { threshold: 0.15 });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return { ref, style: { opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(20px)", transition: "opacity 0.6s ease, transform 0.6s ease" } as React.CSSProperties };
}

/* ───── MAIN PAGE ───── */
export default function LandingPage() {
  const [gameState, setGameState] = useState<"idle" | "playing" | "result">("idle");
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [scrolledPastHero, setScrolledPastHero] = useState(false);
  const gameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolledPastHero(window.scrollY > window.innerHeight * 0.7);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToGame = () => gameRef.current?.scrollIntoView({ behavior: "smooth" });

  const handleSelect = (idx: number) => setSelected(selected === idx ? null : idx);

  const handleNext = () => {
    if (selected === null) return;
    const newScores = [...scores, ROUNDS[round].options[selected].score];
    setScores(newScores);
    setSelected(null);
    if (round < 4) setRound(round + 1);
    else { setGameState("result"); posthog.capture("game_completed", { score: newScores.reduce((a, b) => a + b, 0) }); }
  };

  const handlePlayAgain = () => { setGameState("idle"); setRound(0); setSelected(null); setScores([]); };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@") || emailLoading) return;
    setEmailLoading(true);
    try {
      const supabase = createClient();
      await supabase.from("agent_waitlist").insert({ email: email.trim().toLowerCase(), source: "game_email" });
      setEmailSubmitted(true);
      posthog.capture("game_email_signup");
    } catch {}
    setEmailLoading(false);
  };

  const totalScore = scores.reduce((a, b) => a + b, 0);
  const result = getResult(totalScore);
  const currentRound = ROUNDS[round];

  const s1 = useScrollReveal();
  const s2 = useScrollReveal();
  const s3 = useScrollReveal();

  return (
    <div className="relative" style={{ background: CREAM, color: INK }}>
      {/* ── Background writing decorations (desktop only) ── */}
      <div className="hidden lg:block pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {DECO_LINES.map((d, i) => (
          <span key={i} className="absolute font-serif italic text-[15px]" style={{ color: RULE, top: d.top, left: d.left, right: d.right, transform: `rotate(${d.rotate}deg)`, opacity: 0.5 }}>{d.text}</span>
        ))}
      </div>

      {/* ── Nav ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300" style={{ background: scrolledPastHero ? CREAM : "transparent", borderBottom: scrolledPastHero ? `1px solid ${RULE}` : "none" }}>
        <div className="max-w-[960px] mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="font-serif text-[20px] no-underline" style={{ color: scrolledPastHero ? INK : CREAM, fontWeight: 400 }}>
            accent<span style={{ color: ACCENT }}>.</span>
          </Link>
          <Link href="/write" className="no-underline px-5 py-2 rounded-full text-[13px] font-sans font-semibold transition-colors" style={{ background: scrolledPastHero ? INK : ACCENT, color: scrolledPastHero ? CREAM : INK }}>
            Try free
          </Link>
        </div>
      </nav>

      {/* ═══ SECTION 1: HERO ═══ */}
      <section className="relative w-full overflow-hidden" style={{ height: "100vh" }}>
        <video autoPlay muted loop playsInline poster="/accent-hero-poster.jpg" className="absolute inset-0 w-full h-full object-cover z-0">
          <source src="/accent-hero.mp4" type="video/mp4" />
        </video>

        {/* Dark overlay for text contrast */}
        <div className="absolute inset-0 z-10 pointer-events-none" style={{ background: "rgba(0,0,0,0.35)" }} />

        {/* Text overlay — positioned in middle-lower zone */}
        <div className="absolute inset-0 z-20 flex flex-col items-center text-center px-6 overflow-visible" style={{ paddingTop: "32vh" }}>
          <div className="max-w-[520px] w-full mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[12px] font-mono uppercase tracking-wider" style={{
              marginBottom: 8,
              background: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#fff",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT, display: "inline-block" }} />
              a writing game by accent.
            </div>
            <h1 style={{
              fontFamily: "'Switzer', sans-serif",
              fontSize: "clamp(2rem, 4.5vw, 3.8rem)",
              fontWeight: 400,
              color: "#FFFFFF",
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              marginTop: 8,
            }}>
              You haven't written anything{" "}
              <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", fontWeight: 400, color: "#FFFFFF" }}>truly yours</span>{" "}
              in months.
            </h1>
            <p className="mt-4 font-sans mx-auto" style={{
              fontSize: "0.875rem",
              color: "rgba(255,255,255,0.85)",
              lineHeight: 1.6,
              maxWidth: 420,
              textShadow: "0 1px 12px rgba(0,0,0,0.4)",
            }}>
              You paste into AI. It comes back polished. But it doesn't sound like you.
            </p>
            <button onClick={scrollToGame} className="mt-8 px-8 py-3.5 rounded-full font-sans font-bold text-[16px] transition-opacity hover:opacity-90" style={{ background: "#E8C464", color: INK }}>
              Do you have taste?
            </button>
            <div className="mt-10 space-y-2">
              <div className="flex justify-center gap-8 font-serif italic text-[14px] flex-wrap" style={{ color: "rgba(255,255,255,0.6)", textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}>
                <span>&ldquo;We stopped talking and just watched.&rdquo;</span>
                <span>&ldquo;I never saw him sit down.&rdquo;</span>
              </div>
              <p className="font-mono text-[11px] uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)", textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}>5 rounds &middot; 2 minutes &middot; no typing</p>
            </div>
          </div>
        </div>

        {/* Bottom fade to cream */}
        <div className="absolute bottom-0 left-0 right-0 z-10 pointer-events-none" style={{ height: 80, background: `linear-gradient(to bottom, transparent 0%, ${CREAM} 100%)` }} />
      </section>

      {/* ═══ SECTION 2: MAKE IT HIT GAME ═══ */}
      <section ref={gameRef} className="relative z-10" style={{ borderTop: `1px solid ${INK}`, borderBottom: `1px solid ${INK}` }}>
        <div ref={s1.ref} style={s1.style} className="max-w-[800px] mx-auto px-6 py-20">

          {/* Game Start */}
          {gameState === "idle" && (
            <div className="text-center">
              <p className="font-mono text-[11px] uppercase tracking-wider mb-4" style={{ color: FAINT }}>2-minute game</p>
              <h2 className="font-serif mb-4" style={{ fontSize: "clamp(30px, 5vw, 36px)", fontWeight: 400 }}>
                Make It <span className="italic font-bold">Hit.</span>
              </h2>
              <p className="text-[16px] mb-8 max-w-[460px] mx-auto" style={{ color: DIM, lineHeight: 1.6 }}>
                A flat sentence. Four rewrites. Pick the one that lands. See what your choices reveal.
              </p>
              <button onClick={() => { setGameState("playing"); posthog.capture("game_started"); }} className="px-10 py-3 rounded-full font-sans font-semibold text-[15px]" style={{ background: INK, color: CREAM }}>
                Play
              </button>
            </div>
          )}

          {/* Game Playing */}
          {gameState === "playing" && (
            <div>
              {/* Progress dots */}
              <div className="flex justify-center gap-2 mb-6">
                {ROUNDS.map((_, i) => (
                  <div key={i} className="rounded-full" style={{ width: 8, height: 8, background: i <= round ? INK : RULE }} />
                ))}
              </div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-center mb-8" style={{ color: FAINT }}>Round {round + 1} of 5</p>
              <p className="text-[13px] text-center mb-2" style={{ color: DIM }}>Make this hit harder:</p>
              <p className="font-serif italic text-center mb-10" style={{ fontSize: "clamp(18px, 3vw, 22px)", color: INK, lineHeight: 1.4 }}>&ldquo;{currentRound.flat}&rdquo;</p>

              <div className="space-y-3 max-w-[600px] mx-auto">
                {currentRound.options.map((opt, i) => (
                  <div key={i}>
                    <button
                      onClick={() => handleSelect(i)}
                      className="w-full text-left px-5 py-4 rounded-[10px] transition-all flex items-start gap-3"
                      style={{
                        border: selected === i ? `1.5px solid ${INK}` : `1px solid ${RULE}`,
                        background: selected === i ? "rgba(0,0,0,0.03)" : "transparent",
                      }}
                    >
                      <div className="mt-0.5 shrink-0 rounded-full" style={{ width: 16, height: 16, border: selected === i ? `5px solid ${INK}` : `1.5px solid ${RULE}` }} />
                      <span className="text-[15px] leading-relaxed" style={{ color: INK }}>&ldquo;{opt.text}&rdquo;</span>
                    </button>
                    {selected === i && (
                      <div className="ml-8 mt-2 pl-4" style={{ borderLeft: `2px solid ${INK}` }}>
                        <p className="italic text-[13px]" style={{ color: DIM }}>{currentRound.insights[i]}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {selected !== null && (
                <div className="text-center mt-8">
                  <button onClick={handleNext} className="px-8 py-3 rounded-full font-sans font-semibold text-[15px]" style={{ background: INK, color: CREAM }}>
                    {round === 4 ? "See My Result" : "Next"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Game Result */}
          {gameState === "result" && (
            <div className="text-center">
              <div className="flex justify-center gap-2 mb-6">
                {ROUNDS.map((_, i) => (
                  <div key={i} className="rounded-full" style={{ width: 8, height: 8, background: INK }} />
                ))}
              </div>
              <p className="font-mono text-[11px] uppercase tracking-wider mb-4" style={{ color: FAINT }}>Your result</p>
              <h3 className="font-serif mb-2" style={{ fontSize: "clamp(32px, 5vw, 40px)", fontWeight: 300 }}>{result.title}</h3>
              <p className="font-mono text-[13px] mb-6" style={{ color: FAINT }}>{totalScore} / 20</p>
              <p className="text-[16px] max-w-[500px] mx-auto mb-6" style={{ color: DIM, lineHeight: 1.6 }}>{result.desc}</p>
              <p className="font-serif italic text-[16px] mb-10" style={{ color: INK }}>{result.cta}</p>

              {!emailSubmitted ? (
                <div className="max-w-[400px] mx-auto">
                  <p className="text-[13px] mb-3" style={{ color: DIM }}>Your first writing challenge drops this week.</p>
                  <form onSubmit={handleEmail} className="flex gap-2">
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="flex-1 px-4 py-3 rounded-[8px] font-sans text-[15px] outline-none" style={{ border: `1px solid ${RULE}`, background: "white", color: INK }} />
                    <button type="submit" disabled={emailLoading} className="px-6 py-3 rounded-[8px] font-sans font-semibold text-[15px] disabled:opacity-50" style={{ background: INK, color: CREAM }}>{emailLoading ? "..." : "I'm in"}</button>
                  </form>
                </div>
              ) : (
                <p className="font-mono text-[13px]" style={{ color: INK }}>&check; Watch your inbox.</p>
              )}

              <button onClick={handlePlayAgain} className="mt-6 px-6 py-2.5 rounded-full font-sans text-[13px] font-medium" style={{ border: `1px solid ${RULE}`, color: DIM, background: "transparent" }}>
                Play Again
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ═══ SECTION 3: PRODUCT REVEAL ═══ */}
      <section className="relative z-10">
        <div ref={s2.ref} style={s2.style} className="max-w-[800px] mx-auto px-6 py-24 text-center">
          <p className="font-mono text-[11px] uppercase tracking-wider mb-4" style={{ color: FAINT }}>Introducing</p>
          <h2 className="font-serif mb-4" style={{ fontSize: "clamp(30px, 5vw, 40px)", fontWeight: 300 }}>
            AI writes for you. <span className="font-bold">Accent</span> makes you a writer.
          </h2>
          <p className="text-[15px] max-w-[420px] mx-auto mb-8" style={{ color: DIM, lineHeight: 1.6 }}>
            Daily challenges that make writing fun. AI coaching that teaches you why good writing works. A Phrasebook that captures your voice. Coming soon.
          </p>
          <button onClick={scrollToGame} className="px-8 py-3 rounded-full font-sans font-semibold text-[15px]" style={{ background: INK, color: CREAM }}>
            Play the game first
          </button>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="relative z-10" style={{ borderTop: `1px solid ${RULE}` }}>
        <div ref={s3.ref} style={s3.style} className="max-w-[960px] mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-serif text-[16px]" style={{ color: INK }}>accent<span style={{ color: ACCENT }}>.</span></span>
          <div className="flex gap-6 text-[12px] font-sans" style={{ color: FAINT }}>
            <Link href="/privacy-contact" className="no-underline hover:underline" style={{ color: FAINT }}>Privacy</Link>
            <a href="mailto:hello@myaccent.io" className="no-underline hover:underline" style={{ color: FAINT }}>Contact</a>
          </div>
          <span className="text-[12px] font-sans" style={{ color: FAINT }}>Built in Amsterdam</span>
        </div>
      </footer>
    </div>
  );
}
