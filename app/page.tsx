"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { createClient } from "@/lib/supabase/client";

/* ───────── DATA ───────── */
const CHATGPT_TEXT = `Thrilled to share that I've completed my first 6 months as a product lead in Amsterdam. The transition from Lagos to Europe has been an incredible learning experience. I'm grateful for the opportunity to work with such a diverse and talented team. Here are my top 3 takeaways from this journey:`;

const AGENT_TEXT = `6 months in Amsterdam and I still rehearse what I'm going to say in meetings. In Lagos I was the loudest person in the room. Here I edit myself before I even open my mouth. My English is fine. My confidence in it is not. Working on that part.`;

const CHATGPT_OBS: Array<{ icon: string; text: string; type: string }> = [
  { icon: "⚠", text: "You never say \"incredible learning experience\" — you keep it blunt", type: "flag" },
  { icon: "⚠", text: "You don't do gratitude lists. Your posts are one sharp observation.", type: "flag" },
  { icon: "⚠", text: "\"Here are my top 3 takeaways\" — you've never written a listicle", type: "flag" },
];
const AGENT_OBS: Array<{ icon: string; text: string; type: string }> = [
  { icon: "✦", text: "\"Loudest person in the room\" — pulled from your own past writing", type: "good" },
  { icon: "✦", text: "Short punchy sentences. Matched your rhythm.", type: "good" },
  { icon: "✦", text: "\"Working on that part\" — your style of ending. Not ChatGPT's.", type: "good" },
];

const SAMPLES = [
  { label: "LinkedIn post", emoji: "💼", preview: "I said 'I don't know' in a meeting last week and my manager thanked me after...", text: "I said 'I don't know' in a meeting last week and my manager thanked me after. She said most people just fake an answer. I think being a non-native speaker taught me this — when you're not fluent enough to bullshit, honesty becomes your default. Turns out that's a skill." },
  { label: "Work email", emoji: "✉️", preview: "Hi Sarah, I wanted to follow up on our conversation from yesterday...", text: "Hi Sarah, I wanted to follow up on our conversation from yesterday. I think the proposal is good but maybe we should consider to add more details about the timeline. Also I am not sure if the budget is enough for what we want to achieve. Please let me know your thoughts about this." },
  { label: "Self-intro", emoji: "👋", preview: "I'm a designer who accidentally became a founder...", text: "I'm a designer who accidentally became a founder. I say accidentally because if you told me two years ago I would be building AI tools in Amsterdam I would probably laugh and ask you what's Amsterdam like in winter." },
];

/* ───────── COMPONENTS ───────── */

function AccentLogo() {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="w-7 h-7 rounded-[6px] bg-[#1B4332] flex items-center justify-center text-white font-serif font-bold text-[16px]">a</span>
      <span className="font-serif font-bold text-[20px] tracking-tight text-[#1B4332]">accent.</span>
    </span>
  );
}

function DemoPanel({ tab }: { tab: "chatgpt" | "agent" }) {
  const text = tab === "chatgpt" ? CHATGPT_TEXT : AGENT_TEXT;
  const obs = tab === "chatgpt" ? CHATGPT_OBS : AGENT_OBS;
  const statusColor = tab === "chatgpt" ? "#E9C46A" : "#2D6A4F";
  const statusText = tab === "chatgpt" ? "Doesn't sound like Suki" : "Sounds like Suki";
  const [visibleObs, setVisibleObs] = useState(0);

  useEffect(() => {
    setVisibleObs(0);
    const timers = obs.map((_, i) =>
      setTimeout(() => setVisibleObs(i + 1), 400 * (i + 1))
    );
    return () => timers.forEach(clearTimeout);
  }, [tab]);

  return (
    <div className="flex flex-col lg:flex-row gap-0 border border-[#1B4332]/10 rounded-[12px] overflow-hidden bg-white">
      {/* LinkedIn post side */}
      <div className="flex-1 p-5 border-b lg:border-b-0 lg:border-r border-[#1B4332]/10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#1B4332] flex items-center justify-center text-white font-sans font-bold text-[14px]">SA</div>
          <div>
            <div className="font-sans font-semibold text-[14px] text-[#1C1917]">Suki Adeyemi</div>
            <div className="font-sans text-[12px] text-[#1C1917]/50">Product lead · Lagos → Amsterdam</div>
          </div>
        </div>
        <p className="font-sans text-[14px] leading-[1.6] text-[#1C1917]/80 whitespace-pre-wrap">{text}</p>
      </div>
      {/* Accent panel side */}
      <div className="w-full lg:w-[280px] p-5 bg-[#FDFAF3]">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full" style={{ background: statusColor }} />
          <span className="font-sans text-[12px] font-medium" style={{ color: statusColor }}>{statusText}</span>
        </div>
        <div className="space-y-3">
          {obs.map((o, i) => (
            <div
              key={i}
              className="transition-all duration-300"
              style={{ opacity: i < visibleObs ? 1 : 0, transform: i < visibleObs ? "translateY(0)" : "translateY(8px)" }}
            >
              <div className="flex gap-2 items-start">
                <span className="text-[14px] shrink-0 mt-0.5" style={{ color: o.type === "flag" ? "#E9C46A" : "#2D6A4F" }}>{o.icon}</span>
                <span className="font-sans text-[13px] leading-[1.5] text-[#1C1917]/70">{o.text}</span>
              </div>
            </div>
          ))}
        </div>
        {tab === "chatgpt" && (
          <button className="mt-4 font-sans text-[13px] font-medium text-[#1B4332] border-b border-[#1B4332] pb-0.5">
            ↻ Rewrite as Suki
          </button>
        )}
      </div>
    </div>
  );
}

/* ───────── MAIN PAGE ───────── */
export default function LandingPage() {
  const [demoTab, setDemoTab] = useState<"chatgpt" | "agent">("chatgpt");
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  const trackCTA = (location: string) => {
    posthog.capture("landing_cta_clicked", { location });
  };

  const handleWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail.trim() || waitlistLoading) return;
    setWaitlistLoading(true);
    try {
      const supabase = createClient();
      await supabase.from("agent_waitlist").insert({
        email: waitlistEmail.trim().toLowerCase(),
        source: "agent_waitlist",
      });
      setWaitlistSubmitted(true);
      posthog.capture("agent_waitlist_signup");
    } catch {}
    setWaitlistLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#FFFBF5] text-[#1C1917]">
      {/* ── Nav ── */}
      <nav className="max-w-[800px] mx-auto px-5 py-5 flex items-center justify-between">
        <AccentLogo />
        <Link
          href="/write"
          onClick={() => trackCTA("nav")}
          className="px-4 py-2 rounded-[8px] bg-[#1B4332] text-white text-[13px] font-sans font-medium hover:bg-[#1B4332]/90 transition-colors"
        >
          Try free &rarr;
        </Link>
      </nav>

      {/* ── Section 1: Hero ── */}
      <section className="max-w-[800px] mx-auto px-5 pt-12 pb-20">
        <h1
          className="font-serif font-bold text-[#1B4332] leading-[1.05] tracking-tight"
          style={{ fontSize: "clamp(40px, 10vw, 64px)" }}
        >
          The first AI
          <br />
          that writes
          <br />
          like{" "}
          <span className="relative inline-block">
            you,
            <span className="absolute left-0 right-0 bg-[#E9C46A]" style={{ bottom: "0.06em", height: "0.18em", zIndex: -1 }} />
          </span>
          <br />
          not for you.
        </h1>
        <p className="mt-6 text-[17px] leading-relaxed text-[#1C1917]/60 max-w-[520px] font-sans">
          An AI that learns your voice and writes as you.
        </p>
      </section>

      {/* ── Section 2: Demo ── */}
      <section className="max-w-[800px] mx-auto px-5 pb-20">
        {/* Prompt bubble */}
        <div className="flex items-start gap-3 mb-6">
          <div className="w-8 h-8 rounded-full bg-[#E9C46A] flex items-center justify-center text-[#1B4332] font-sans font-bold text-[13px] shrink-0">S</div>
          <p className="font-sans text-[15px] italic text-[#1C1917]/60 pt-1">
            &ldquo;Write a LinkedIn post about my first 6 months in Amsterdam&rdquo;
          </p>
        </div>

        {/* Browser chrome */}
        <div className="rounded-[12px] border border-[#1B4332]/10 overflow-hidden bg-[#F5F2EB]">
          {/* Tab bar */}
          <div className="flex border-b border-[#1B4332]/10">
            <button
              onClick={() => setDemoTab("chatgpt")}
              className={`flex-1 py-3 text-[13px] font-sans font-medium transition-colors ${
                demoTab === "chatgpt"
                  ? "text-[#1B4332] bg-white border-b-2 border-[#1B4332]"
                  : "text-[#1C1917]/40 hover:text-[#1C1917]/60"
              }`}
            >
              ChatGPT wrote it
            </button>
            <button
              onClick={() => setDemoTab("agent")}
              className={`flex-1 py-3 text-[13px] font-sans font-medium transition-colors ${
                demoTab === "agent"
                  ? "text-[#1B4332] bg-white border-b-2 border-[#1B4332]"
                  : "text-[#1C1917]/40 hover:text-[#1C1917]/60"
              }`}
            >
              Accent agent wrote it
            </button>
          </div>
          <DemoPanel tab={demoTab} />
        </div>

        <p className="mt-6 text-center font-sans text-[14px] text-[#1C1917]/50 max-w-[560px] mx-auto">
          Same prompt. One sounds like a template. One sounds like Suki — because Accent already knew her voice.
        </p>
      </section>

      {/* ── Section 3: How it works ── */}
      <section className="border-t border-[#1B4332]/10">
        <div className="max-w-[800px] mx-auto px-5 py-20">
          <h2
            className="font-serif font-bold text-[#1B4332] leading-tight tracking-tight text-center mb-16"
            style={{ fontSize: "clamp(28px, 6vw, 40px)" }}
          >
            How it learns you.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
            {[
              { step: "01", title: "Write with Accent", desc: "Use Accent to fix and improve your writing. Every session, it pays attention to what you keep and what you change." },
              { step: "02", title: "It builds your voice", desc: "Over time, Accent maps your patterns — the words you favor, the rhythm you like, the phrases you'd never use." },
              { step: "03", title: "It writes as you", desc: "When you're ready, Accent can draft for you. Not generic AI text — text that sounds like you wrote it." },
            ].map((s) => (
              <div key={s.step}>
                <div className="font-sans text-[12px] font-semibold text-[#E9C46A] tracking-wider mb-3">{s.step}</div>
                <h3 className="font-sans font-bold text-[18px] text-[#1B4332] mb-2">{s.title}</h3>
                <p className="font-sans text-[15px] leading-relaxed text-[#1C1917]/60">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 4: Try free ── */}
      <section className="bg-[#1B4332]">
        <div className="max-w-[800px] mx-auto px-5 py-20">
          <div className="font-sans text-[11px] font-semibold tracking-[0.12em] text-[#E9C46A] uppercase mb-4">
            Available now — Free
          </div>
          <h2
            className="font-serif font-bold text-[#FFFBF5] leading-tight tracking-tight mb-4"
            style={{ fontSize: "clamp(28px, 6vw, 40px)" }}
          >
            Start teaching it your voice.
          </h2>
          <p className="font-sans text-[16px] leading-relaxed text-[#FFFBF5]/60 max-w-[520px] mb-10">
            Every time you write with Accent, it learns how you sound. Start now — it&apos;s free.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
            {SAMPLES.map((s) => (
              <Link
                key={s.label}
                href={`/write?text=${encodeURIComponent(s.text)}`}
                onClick={() => trackCTA("sample_card")}
                className="block p-4 rounded-[10px] bg-white/10 border border-white/10 hover:bg-white/15 transition-colors"
              >
                <div className="font-sans text-[13px] font-medium text-[#E9C46A] mb-2">
                  {s.emoji} {s.label}
                </div>
                <p className="font-sans text-[13px] leading-[1.5] text-[#FFFBF5]/70 line-clamp-2">
                  {s.preview}
                </p>
              </Link>
            ))}
          </div>

          <Link
            href="/write"
            onClick={() => trackCTA("try_free")}
            className="inline-flex items-center px-6 py-3.5 rounded-[10px] bg-[#E9C46A] text-[#1B4332] text-[15px] font-sans font-semibold hover:bg-[#E9C46A]/90 transition-colors"
          >
            Start writing — it&apos;s free &rarr;
          </Link>
        </div>
      </section>

      {/* ── Section 5: Agent waitlist ── */}
      <section className="max-w-[800px] mx-auto px-5 py-20">
        <div className="max-w-[520px] mx-auto text-center">
          <h2
            className="font-serif font-bold text-[#1B4332] leading-tight tracking-tight mb-4"
            style={{ fontSize: "clamp(26px, 5vw, 36px)" }}
          >
            Soon it&apos;ll write the first draft for you.
          </h2>
          <p className="font-sans text-[16px] text-[#1C1917]/50 mb-8">
            An AI that sounds like you — because it learned from you.
          </p>

          {waitlistSubmitted ? (
            <div className="p-5 rounded-[12px] border border-[#2D6A4F]/20 bg-[#2D6A4F]/5">
              <p className="font-sans text-[15px] text-[#2D6A4F] font-medium">
                ✦ You&apos;re on the list. We&apos;ll email you when your agent is ready to train.
              </p>
            </div>
          ) : (
            <form onSubmit={handleWaitlist} className="flex gap-2 max-w-[400px] mx-auto">
              <input
                type="email"
                required
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
                placeholder="you@email.com"
                className="flex-1 px-4 py-3 rounded-[8px] border border-[#1B4332]/15 bg-white font-sans text-[14px] text-[#1C1917] placeholder:text-[#1C1917]/30 focus:outline-none focus:ring-2 focus:ring-[#1B4332]/15"
              />
              <button
                type="submit"
                disabled={waitlistLoading}
                className="px-5 py-3 rounded-[8px] bg-[#1B4332] text-white text-[14px] font-sans font-medium hover:bg-[#1B4332]/90 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {waitlistLoading ? "..." : "Join waitlist"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#1B4332]/10">
        <div className="max-w-[800px] mx-auto px-5 py-8 flex flex-col sm:flex-row items-center gap-3 sm:justify-between">
          <p className="text-[12px] text-[#8A8579] font-sans">
            © 2026 accent. Built in Amsterdam.
          </p>
          <Link href="/privacy-contact" className="text-[12px] text-[#8A8579] font-sans hover:text-[#1B4332]">
            Privacy
          </Link>
        </div>
      </footer>
    </div>
  );
}
