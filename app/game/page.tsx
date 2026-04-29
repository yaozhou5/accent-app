"use client";

import { useState } from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { createClient } from "@/lib/supabase/client";

/* ───── DESIGN TOKENS ───── */
const INK = "#1A1A18";
const DIM = "#6B6860";
const FAINT = "#A8A49C";
const ACCENT = "#B8964E";
const CREAM = "#F7F4EF";

/* ───── GAME DATA ───── */
type Option = { text: string; score: number; type: string };
type Round = { flat: string; options: Option[]; insights: string[] };

const ROUNDS: Round[] = [
  {
    flat: "He was eating alone.",
    options: [
      { text: "He cut his steak carefully, like someone was watching.", score: 3, type: "editor" },
      { text: "He ate the way people eat when they've stopped expecting company.", score: 2, type: "safe" },
      { text: "There was a second chair. He'd pushed it to the other side of the table.", score: 4, type: "writer" },
      { text: "He was reading something on his phone and chewing slowly. No one was waiting for him and he knew it.", score: 1, type: "polisher" },
    ],
    insights: [
      "The performance of care. 'Like someone was watching' plants doubt without explaining it.",
      "Smart observation, but it tells the reader what to feel. The abstraction softens the image.",
      "You never said 'lonely.' The chair says it. That's the whole move.",
      "The last sentence explains what the first already showed. Trust the image. Cut the caption.",
    ],
  },
  {
    flat: "She was tired of her marriage.",
    options: [
      { text: "She started sleeping on her side of the bed again.", score: 4, type: "writer" },
      { text: "He said something funny at dinner and she smiled, but only with her mouth.", score: 3, type: "editor" },
      { text: "She noticed he'd stopped closing the bathroom door. She didn't know when that started.", score: 2, type: "safe" },
      { text: "They still said 'love you' before hanging up. It sounded like 'bye.'", score: 1, type: "polisher" },
    ],
    insights: [
      "'Again.' One word does all the work. It implies a before, a during, and a giving up.",
      "The split between face and feeling. 'Only with her mouth' is precise and devastating.",
      "Observant, but the second sentence softens the first. Let the detail land alone.",
      "The comparison is clever but it reaches for the reader. The best lines don't explain the metaphor.",
    ],
  },
  {
    flat: "The house felt empty after the kids left.",
    options: [
      { text: "She made two lunches out of habit and threw one away.", score: 4, type: "writer" },
      { text: "The hallway was quiet in a way that used to mean everyone was asleep.", score: 3, type: "editor" },
      { text: "He found a sock behind the dryer and held it for a long time.", score: 2, type: "safe" },
      { text: "Nobody makes the house smell like that anymore.", score: 1, type: "polisher" },
    ],
    insights: [
      "One action. Two lunches. Threw one away. The reader fills in every year of motherhood.",
      "Redefining silence. 'Used to mean' turns a sound into a memory. Sharp.",
      "The sock is specific. But 'held it for a long time' tells the reader how to feel. Let the sock do the work.",
      "Warm and sad, but vague. Which smell? Whose? The generic weakens what could be visceral.",
    ],
  },
  {
    flat: "He realized he was getting old.",
    options: [
      { text: "The barber didn't ask what style he wanted anymore.", score: 3, type: "editor" },
      { text: "He started reading the obituaries. Not for anyone. Just to check.", score: 4, type: "writer" },
      { text: "A younger guy offered him a seat on the tram. He took it.", score: 2, type: "safe" },
      { text: "He used to skip stairs. Now he counts them.", score: 1, type: "polisher" },
    ],
    insights: [
      "Small, brutal observation. The barber gave up on him and nobody said a word.",
      "'Just to check.' Two words turn a habit into an existential confession. Minimal. Perfect.",
      "Good scene. But it stays on the surface. The reader sees the event but not the interior.",
      "Neat symmetry. But the structure is doing the feeling for the reader. Compression isn't always depth.",
    ],
  },
  {
    flat: "They hadn't spoken in years.",
    options: [
      { text: "Her number was still in his phone under a name he'd changed twice.", score: 4, type: "writer" },
      { text: "He saw her at the market. She was buying the same oranges.", score: 3, type: "editor" },
      { text: "Someone mentioned her at dinner and he laughed a half second too late.", score: 2, type: "safe" },
      { text: "He almost called once, on a Tuesday, for no reason. Then didn't.", score: 1, type: "polisher" },
    ],
    insights: [
      "Changed the name. Twice. Kept the number. Every contradiction tells the whole story.",
      "'The same oranges.' Tiny detail, enormous weight. You see both of them at once.",
      "The timing is good. But 'a half second too late' is a writer describing a feeling, not showing it.",
      "'For no reason. Then didn't.' The rhythm is nice but it performs restraint instead of showing it. The almost-call is a cliche of longing.",
    ],
  },
];

function getResult(score: number) {
  if (score >= 17) return { title: "The Writer", desc: "You go specific. You go visceral. You trust the reader to feel it without being told. Most people have lost this instinct. You haven't.", cta: "You already have voice. Imagine it sharper." };
  if (score >= 13) return { title: "The Editor", desc: "You know what hits. You see the good option. But sometimes you pull back before committing. Choosing clever over honest. The instinct is there. It just needs permission.", cta: "You're one draft away from great." };
  if (score >= 9) return { title: "The Safe Voice", desc: "You're warm and honest. People like what you write. But they don't remember it. You go for 'nice' when you could go for 'true.' The generic option feels comfortable because it's what everyone picks.", cta: "Comfortable isn't memorable. Train the muscle." };
  return { title: "The Polisher", desc: "You reach for bigger words when smaller ones would hit harder. You decorate when you should delete. This isn't a talent problem. It's a habit. AI writes like this too. That should worry you.", cta: "Your voice is underneath all that polish. Let's find it." };
}

/* ───── PLAY PAGE ───── */
export default function PlayPage() {
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  const handleSelect = (idx: number) => setSelected(selected === idx ? null : idx);

  const handleNext = () => {
    if (selected === null) return;
    const newScores = [...scores, ROUNDS[round].options[selected].score];
    setScores(newScores);
    setSelected(null);
    if (round < 4) setRound(round + 1);
    else { setDone(true); posthog.capture("game_completed", { score: newScores.reduce((a, b) => a + b, 0), source: "play_page" }); }
  };

  const handlePlayAgain = () => { setRound(0); setSelected(null); setScores([]); setDone(false); };

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@") || emailLoading) return;
    setEmailLoading(true);
    const score = scores.reduce((a, b) => a + b, 0);
    const resultType = getResult(score).title;
    try {
      const supabase = createClient();
      await supabase.from("agent_waitlist").insert({ email: email.trim().toLowerCase(), source: "game_email", result_type: resultType, score });
      setEmailSubmitted(true);
      posthog.capture("game_email_signup", { result_type: resultType, score, source: "play_page" });
    } catch {}
    setEmailLoading(false);
  };

  const totalScore = scores.reduce((a, b) => a + b, 0);
  const result = getResult(totalScore);
  const currentRound = ROUNDS[round];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: CREAM, color: INK }}>
      {/* Nav */}
      <nav className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: `1px solid rgba(26,26,24,0.1)` }}>
        <Link href="/" className="font-serif text-[20px] no-underline" style={{ color: INK, fontWeight: 400 }}>
          accent<span style={{ color: ACCENT }}>.</span>
        </Link>
        <Link href="/write" className="no-underline px-5 py-2 rounded-full text-[13px] font-sans font-semibold" style={{ background: INK, color: CREAM }}>
          Try the tool
        </Link>
      </nav>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-[600px] w-full">

          {/* Game rounds */}
          {!done && (
            <div>
              <div className="flex justify-center gap-2 mb-6">
                {ROUNDS.map((_, i) => (
                  <div key={i} className="rounded-full" style={{ width: 8, height: 8, background: i <= round ? INK : "rgba(26,26,24,0.15)" }} />
                ))}
              </div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-center mb-8" style={{ color: FAINT }}>Round {round + 1} of 5</p>
              <p className="font-sans text-center mb-3" style={{ fontSize: 20, fontWeight: 600, color: INK }}>Make this hit harder</p>
              <p className="font-serif italic text-center mb-10" style={{ fontSize: "clamp(18px, 3vw, 22px)", color: INK, lineHeight: 1.4 }}>&ldquo;{currentRound.flat}&rdquo;</p>

              <div>
                {currentRound.options.map((opt, i) => {
                  const isSelected = selected === i;
                  return (
                    <div key={i}>
                      <button
                        onClick={() => handleSelect(i)}
                        onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.background = "rgba(26,26,24,0.04)"; e.currentTarget.style.borderLeftColor = ACCENT; } }}
                        onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderLeftColor = "transparent"; } }}
                        className="w-full text-left py-4 px-5 flex items-start gap-4 transition-colors cursor-pointer"
                        style={{
                          background: isSelected ? "rgba(26,26,24,0.05)" : "transparent",
                          borderLeft: `3px solid ${isSelected ? ACCENT : "transparent"}`,
                          borderTop: i === 0 ? `1px solid rgba(26,26,24,0.12)` : "none",
                          borderBottom: `1px solid rgba(26,26,24,0.12)`,
                          borderRight: "none",
                        }}
                      >
                        <span className="font-mono shrink-0" style={{ fontSize: 17, lineHeight: 1.5, color: isSelected ? ACCENT : "rgba(26,26,24,0.45)", fontWeight: 600 }}>{i + 1}.</span>
                        <span className="font-sans flex-1" style={{ fontSize: 17, lineHeight: 1.5, color: INK }}>&ldquo;{opt.text}&rdquo;</span>
                      </button>
                      {isSelected && (
                        <div className="ml-12 mt-3 mb-3 pl-4" style={{ borderLeft: `2px solid ${ACCENT}` }}>
                          <p className="font-sans" style={{ fontSize: 16, lineHeight: 1.55, color: DIM, fontStyle: "italic" }}>{currentRound.insights[i]}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {selected !== null && (
                <div className="text-center mt-8">
                  <button onClick={handleNext} className="px-7 py-3 rounded-full font-sans font-bold text-[14px] transition-opacity hover:opacity-90" style={{ background: "#000000", color: "#FFFFFF" }}>
                    {round === 4 ? "See My Result \u2192" : "Lock it in \u2192"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Result */}
          {done && (
            <div className="text-center">
              <div className="flex justify-center gap-2 mb-6">
                {ROUNDS.map((_, i) => (
                  <div key={i} className="rounded-full" style={{ width: 8, height: 8, background: INK }} />
                ))}
              </div>
              <p className="font-mono text-[11px] uppercase tracking-wider mb-4" style={{ color: FAINT }}>Your result</p>
              <h2 className="font-serif mb-2" style={{ fontSize: "clamp(32px, 5vw, 40px)", fontWeight: 300 }}>{result.title}</h2>
              <p className="font-mono mb-6" style={{ fontSize: 13, color: FAINT }}>{totalScore} / 20</p>
              <p className="font-sans mb-6 max-w-[500px] mx-auto" style={{ fontSize: 16, color: DIM, lineHeight: 1.6 }}>{result.desc}</p>
              <p className="font-serif italic mb-10" style={{ fontSize: 16, color: INK }}>{result.cta}</p>

              {!emailSubmitted ? (
                <div className="max-w-[400px] mx-auto">
                  <p className="font-sans mb-3" style={{ fontSize: 16, color: DIM }}>Your first writing challenge drops this week.</p>
                  <form onSubmit={handleEmail} className="flex gap-2">
                    <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="flex-1 px-4 py-3 rounded-[8px] font-sans text-[16px] outline-none" style={{ border: `1px solid rgba(26,26,24,0.15)`, background: "white", color: INK }} />
                    <button type="submit" disabled={emailLoading} className="px-6 py-3 rounded-[8px] font-sans font-semibold text-[16px] disabled:opacity-50" style={{ background: INK, color: CREAM }}>{emailLoading ? "..." : "I'm in"}</button>
                  </form>
                </div>
              ) : (
                <p className="font-mono" style={{ fontSize: 14, letterSpacing: "0.04em", color: INK }}>&check; Watch your inbox.</p>
              )}

              <button onClick={handlePlayAgain} className="mt-6 px-6 py-2.5 rounded-full font-sans text-[13px] font-medium" style={{ border: "1px solid rgba(26,26,24,0.15)", color: DIM, background: "transparent" }}>
                Play Again
              </button>

              <div className="mt-16 pt-10" style={{ borderTop: "1px solid rgba(26,26,24,0.15)" }}>
                <p className="font-mono text-[11px] uppercase tracking-wider mb-3" style={{ color: FAINT }}>next</p>
                <p className="font-serif mb-5" style={{ fontSize: 22, fontWeight: 400, color: INK }}>
                  Want to work on your own writing?
                </p>
                <div className="flex justify-center gap-8 flex-wrap">
                  <Link href="/write?mode=polish" className="no-underline font-sans font-medium inline-flex items-center gap-1 transition-opacity hover:opacity-70" style={{ fontSize: 16, color: INK, borderBottom: `1px solid ${INK}`, paddingBottom: 1 }}>
                    Polish it <span>&rarr;</span>
                  </Link>
                  <Link href="/write?mode=coach" className="no-underline font-sans font-medium inline-flex items-center gap-1 transition-opacity hover:opacity-70" style={{ fontSize: 16, color: INK, borderBottom: `1px solid ${INK}`, paddingBottom: 1 }}>
                    Coach me <span>&rarr;</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: "1px solid rgba(26,26,24,0.1)" }}>
        <span className="font-serif text-[16px]" style={{ color: INK }}>accent<span style={{ color: ACCENT }}>.</span></span>
        <div className="flex gap-6 text-[12px] font-sans" style={{ color: FAINT }}>
          <Link href="/privacy-contact" className="no-underline hover:underline" style={{ color: FAINT }}>Privacy</Link>
          <a href="mailto:hello@myaccent.io" className="no-underline hover:underline" style={{ color: FAINT }}>Contact</a>
        </div>
      </footer>
    </div>
  );
}
