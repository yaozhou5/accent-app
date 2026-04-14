"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { createClient } from "@/lib/supabase/client";
import { AccentLogo } from "@/components/AccentLogo";

/* ───────── DATA ───────── */
const CHATGPT_TEXT = `Thrilled to share that I've completed my first 6 months as a product lead in Amsterdam. The transition from Lagos to Europe has been an incredible learning experience. I'm grateful for the opportunity to work with such a diverse and talented team. Here are my top 3 takeaways from this journey:`;

const AGENT_TEXT = `6 months in Amsterdam and I still rehearse what I'm going to say in meetings. In Lagos I was the loudest person in the room. Here I edit myself before I even open my mouth. My English is fine. My confidence in it is not. Working on that part.`;

type Obs = { icon: string; text: string; type: "flag" | "good" | "nudge" };

const CHATGPT_OBS: Obs[] = [
  { icon: "—", text: "You never say \"incredible learning experience\" — you keep it blunt", type: "flag" },
  { icon: "—", text: "You don't do gratitude lists. Your posts are one sharp observation.", type: "flag" },
  { icon: "—", text: "\"Here are my top 3 takeaways\" — you've never written a listicle", type: "flag" },
];
const AGENT_OBS: Obs[] = [
  { icon: "✦", text: "\"Loudest person in the room\" — pulled from your own past writing", type: "good" },
  { icon: "✦", text: "Short punchy sentences. Matched your rhythm.", type: "good" },
  { icon: "✦", text: "\"Working on that part\" — your style of ending. Not ChatGPT's.", type: "good" },
];

const SAMPLES = [
  { label: "LinkedIn post", emoji: "💼", preview: "I said 'I don't know' in a meeting last week and my manager thanked me after...", text: "I said 'I don't know' in a meeting last week and my manager thanked me after. She said most people just fake an answer. I think being a non-native speaker taught me this — when you're not fluent enough to bullshit, honesty becomes your default. Turns out that's a skill." },
  { label: "Work email", emoji: "✉️", preview: "Hi Sarah, I wanted to follow up on our conversation from yesterday...", text: "Hi Sarah, I wanted to follow up on our conversation from yesterday. I think the proposal is good but maybe we should consider to add more details about the timeline. Also I am not sure if the budget is enough for what we want to achieve. Please let me know your thoughts about this." },
  { label: "Self-intro", emoji: "👋", preview: "I'm a designer who accidentally became a founder...", text: "I'm a designer who accidentally became a founder. I say accidentally because if you told me two years ago I would be building AI tools in Amsterdam I would probably laugh and ask you what's Amsterdam like in winter." },
];

/* ───────── HELPERS ───────── */
function ObsItem({ obs, index, visible }: { obs: Obs; index: number; visible: boolean }) {
  return (
    <div
      className="flex items-start gap-[7px] rounded-[8px]"
      style={{
        padding: "7px 9px",
        background: obs.type === "flag" ? "rgba(0,0,0,0.03)" : "rgba(0,0,0,0.02)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(6px)",
        transition: `all 0.35s ease ${index * 150}ms`,
      }}
    >
      <span className="text-[11px] shrink-0 mt-[1px]" style={{ color: "#999" }}>{obs.icon}</span>
      <span className="text-[11px] leading-[1.45]" style={{ color: obs.type === "flag" ? "#999" : "#111" }}>{obs.text}</span>
    </div>
  );
}

/* ───────── MAIN ───────── */
export default function AccentLanding() {
  const [tab, setTab] = useState<"chatgpt" | "agent">("chatgpt");
  const [showObs, setShowObs] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hoveredSample, setHoveredSample] = useState<number | null>(null);

  useEffect(() => {
    setShowObs(false);
    const t = setTimeout(() => setShowObs(true), 400);
    return () => clearTimeout(t);
  }, [tab]);

  const isChatGPT = tab === "chatgpt";
  const obs = isChatGPT ? CHATGPT_OBS : AGENT_OBS;

  const trackCTA = (location: string) => {
    posthog.capture("landing_cta_clicked", { location });
  };

  const handleWaitlist = async () => {
    if (!email.includes("@") || submitting) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      await supabase.from("agent_waitlist").insert({
        email: email.trim().toLowerCase(),
        source: "agent_waitlist",
      });
      setSubmitted(true);
      posthog.capture("agent_waitlist_signup");
    } catch {}
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen font-sans" style={{ background: "#FFFFFF" }}>
      {/* ─── NAV ─── */}
      <nav className="max-w-[960px] mx-auto px-5 py-5 flex items-center justify-between">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <AccentLogo />
        </Link>
        <Link
          href="/write"
          onClick={() => trackCTA("nav")}
          style={{ fontSize: 13, fontWeight: 500, color: "#111", padding: "8px 20px", border: "1px solid #E8E8E8", borderRadius: 100, textDecoration: "none" }}
        >
          Try free →
        </Link>
      </nav>

      {/* ═══ SECTION 1 — HERO ═══ */}
      <section style={{ padding: "80px 32px 40px", maxWidth: 900, margin: "0 auto" }}>
        <h1
          className="font-serif"
          style={{ fontSize: "clamp(52px, 10vw, 96px)", color: "#111", lineHeight: 1.0, margin: 0, fontWeight: 400, letterSpacing: "-0.02em" }}
        >
          The first AI<br />that writes<br />
          <span style={{ fontStyle: "italic" }}>like you,</span><br />
          not for you.
        </h1>
        <p style={{ fontSize: 18, color: "#999", lineHeight: 1.6, margin: "28px 0 0", maxWidth: 480 }}>
          An AI that learns your voice and writes as you.
        </p>
      </section>

      {/* ═══ SECTION 2 — DEMO ═══ */}
      <section className="flex flex-col items-center" style={{ padding: "40px 20px 80px" }}>
        {/* Prompt bubble */}
        <div className="flex items-center gap-[10px]" style={{ maxWidth: 720, width: "100%", marginBottom: 16 }}>
          <div
            className="flex items-center justify-center shrink-0 font-semibold"
            style={{ width: 32, height: 32, borderRadius: "50%", background: "#111", color: "#fff", fontSize: 12 }}
          >S</div>
          <div style={{ background: "#F5F5F5", borderRadius: 12, padding: "10px 16px", fontSize: 14, color: "#999", fontStyle: "italic" }}>
            &ldquo;Write a LinkedIn post about my first 6 months in Amsterdam&rdquo;
          </div>
        </div>

        <div style={{ width: "100%", maxWidth: 720 }}>
          {/* Browser chrome */}
          <div className="flex items-center gap-2" style={{ background: "#E8E8E8", borderRadius: "12px 12px 0 0", padding: "10px 16px" }}>
            <div className="flex gap-[6px]">
              {["#ccc", "#ccc", "#ccc"].map((c, i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
              ))}
            </div>
            <div className="flex-1" style={{ background: "#fff", borderRadius: 6, padding: "5px 12px", fontSize: 12, color: "#999", marginLeft: 8 }}>linkedin.com/feed</div>
          </div>

          <div className="flex flex-col md:flex-row" style={{ background: "#FFF", border: "1px solid #E8E8E8", borderTop: "none", borderRadius: "0 0 12px 12px" }}>
            {/* Post */}
            <div className="flex-1" style={{ padding: "24px 24px 24px 28px" }}>
              <div className="flex items-center gap-[10px] mb-4">
                <div
                  className="flex items-center justify-center font-semibold"
                  style={{ width: 36, height: 36, borderRadius: "50%", background: "#111", color: "#fff", fontSize: 14 }}
                >S</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>Suki Adeyemi</div>
                  <div style={{ fontSize: 11, color: "#999" }}>Product lead · Lagos → Amsterdam</div>
                </div>
              </div>

              <div className="flex gap-[2px] mb-4" style={{ background: "#F5F5F5", borderRadius: 8, padding: 3 }}>
                {(["chatgpt", "agent"] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)} style={{
                    flex: 1, padding: "8px 0", border: "none", borderRadius: 6,
                    fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
                    background: tab === t ? "#fff" : "transparent",
                    color: tab === t ? "#111" : "#999",
                    boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  }}>
                    {t === "chatgpt" ? "ChatGPT wrote it" : "Accent agent wrote it"}
                  </button>
                ))}
              </div>

              <div style={{ fontSize: 14, lineHeight: 1.75, color: "#111" }}>
                {isChatGPT ? CHATGPT_TEXT : AGENT_TEXT}
              </div>
            </div>

            {/* Agent panel — desktop */}
            <div
              className="shrink-0 hidden md:block"
              style={{
                width: 216, borderLeft: "1px solid #E8E8E8",
                padding: "16px 14px",
                background: "#FAFAFA",
                borderRadius: "0 0 12px 0",
              }}
            >
              <div className="flex items-center gap-[6px] mb-[14px] pb-[10px]" style={{ borderBottom: "1px solid #E8E8E8" }}>
                <div
                  className="flex items-center justify-center font-bold"
                  style={{ width: 18, height: 18, borderRadius: 4, background: "#111", fontSize: 10, color: "#fff" }}
                >a</div>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#111" }}>accent.</span>
              </div>

              <div className="flex items-center gap-[6px] mb-[14px]">
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: isChatGPT ? "#999" : "#111", transition: "background 0.3s" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: isChatGPT ? "#999" : "#111", transition: "color 0.3s" }}>
                  {isChatGPT ? "Doesn't sound like Suki" : "Sounds like Suki"}
                </span>
              </div>

              <div className="flex flex-col gap-[6px]">
                {obs.map((o, i) => (
                  <ObsItem key={`${tab}-${i}`} obs={o} index={i} visible={showObs} />
                ))}
              </div>

              {isChatGPT && (
                <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid #E8E8E8", opacity: showObs ? 1 : 0, transition: "opacity 0.4s ease 0.5s" }}>
                  <div style={{ fontSize: 11, color: "#111", fontWeight: 600, cursor: "pointer" }}>↻ Rewrite as Suki</div>
                </div>
              )}
            </div>

            {/* Agent panel — mobile */}
            <div className="block md:hidden" style={{ padding: "16px 20px", background: "#FAFAFA", borderTop: "1px solid #E8E8E8" }}>
              <div className="flex items-center gap-[6px] mb-3">
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: isChatGPT ? "#999" : "#111" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: isChatGPT ? "#999" : "#111" }}>
                  {isChatGPT ? "Doesn't sound like Suki" : "Sounds like Suki"}
                </span>
              </div>
              <div className="flex flex-col gap-[6px]">
                {obs.map((o, i) => (
                  <ObsItem key={`m-${tab}-${i}`} obs={o} index={i} visible={showObs} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <p className="text-center" style={{ maxWidth: 500, fontSize: 14, color: "#999", marginTop: 20, lineHeight: 1.5 }}>
          Same prompt. One sounds like a template. One sounds like Suki — because Accent already knew her voice.
        </p>
      </section>

      {/* ═══ SECTION 3 — HOW IT WORKS ═══ */}
      <section style={{ padding: "64px 20px", borderTop: "1px solid #E8E8E8" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <h2 className="font-serif text-center" style={{ fontSize: "clamp(28px, 4vw, 40px)", color: "#111", fontWeight: 400, margin: "0 0 40px" }}>
            How it learns you.
          </h2>
          <div className="flex gap-[2px] flex-wrap justify-center">
            {[
              { s: "01", l: "Write with Accent", d: "Use the free writing coach. Fix your English, learn patterns. Every session teaches Accent how you sound." },
              { s: "02", l: "It builds your voice", d: "Your rhythm, your phrases, your way of ending a paragraph. It maps all of it, quietly, in the background." },
              { s: "03", l: "It writes as you", d: "When it knows you well enough, it drafts posts, emails, and messages that sound like you on a good day." },
            ].map((item) => (
              <div key={item.s} className="text-center" style={{ flex: "1 1 200px", padding: "16px 24px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#999", letterSpacing: "0.05em", marginBottom: 8 }}>{item.s}</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#111", marginBottom: 6 }}>{item.l}</div>
                <div style={{ fontSize: 14, color: "#999", lineHeight: 1.55 }}>{item.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 4 — TRY FREE NOW ═══ */}
      <section style={{ padding: "72px 20px", background: "#111" }}>
        <div className="text-center" style={{ maxWidth: 640, margin: "0 auto" }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#999", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 16 }}>Available now — free</p>
          <h2 className="font-serif" style={{ fontSize: "clamp(28px, 4vw, 40px)", color: "#FFF", fontWeight: 400, margin: "0 0 12px", lineHeight: 1.15 }}>
            Start teaching it your voice.
          </h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.5)", marginBottom: 36, lineHeight: 1.5 }}>
            Every time you write with Accent, it learns how you sound. Start now — it&apos;s free.
          </p>

          <div className="flex gap-3 justify-center flex-wrap">
            {SAMPLES.map((s, i) => (
              <Link key={i} href={`/write?text=${encodeURIComponent(s.text)}`}
                onClick={() => trackCTA("sample_card")}
                onMouseEnter={() => setHoveredSample(i)}
                onMouseLeave={() => setHoveredSample(null)}
                className="text-left no-underline"
                style={{
                  flex: "1 1 180px", maxWidth: 200,
                  background: hoveredSample === i ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12, padding: "18px 16px",
                  cursor: "pointer", transition: "all 0.2s",
                  transform: hoveredSample === i ? "translateY(-2px)" : "none",
                }}
              >
                <div style={{ fontSize: 20, marginBottom: 8 }}>{s.emoji}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#FFF", marginBottom: 6 }}>{s.label}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.45, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>{s.preview}</div>
              </Link>
            ))}
          </div>

          <Link href="/write" onClick={() => trackCTA("try_free")} className="inline-block no-underline" style={{
            marginTop: 28, padding: "14px 32px", background: "#FFF", color: "#111",
            borderRadius: 100, fontSize: 15, fontWeight: 700,
          }}>Start writing — it&apos;s free →</Link>
        </div>
      </section>

      {/* ═══ SECTION 5 — AGENT WAITLIST ═══ */}
      <section className="flex flex-col items-center" style={{ padding: "72px 20px 80px" }}>
        <div className="text-center w-full" style={{ maxWidth: 480, padding: "48px 32px", background: "#FAFAFA", borderRadius: 20, border: "1px solid #E8E8E8" }}>
          <h2 className="font-serif" style={{ fontSize: 32, color: "#111", fontWeight: 400, margin: "0 0 8px" }}>
            Your writing voice, captured.
          </h2>
          <p style={{ fontSize: 15, color: "#999", marginBottom: 8, lineHeight: 1.5 }}>
            An AI that learns how you sound — and remembers.
          </p>
          <p style={{ fontSize: 13, color: "#999", marginBottom: 28 }}>
            Join the waitlist for early access.
          </p>

          {!submitted ? (
            <div className="flex gap-2" style={{ maxWidth: 380, margin: "0 auto" }}>
              <input type="email" placeholder="your@email.com" value={email}
                onChange={e => setEmail(e.target.value)}
                className="flex-1 outline-none"
                style={{ padding: "12px 16px", border: "1px solid #E8E8E8", borderRadius: 10, fontSize: 15, background: "#fff", color: "#111" }}
              />
              <button onClick={handleWaitlist} disabled={submitting}
                className="whitespace-nowrap disabled:opacity-50"
                style={{ padding: "12px 24px", background: "#111", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: "pointer" }}
              >{submitting ? "..." : "Join waitlist"}</button>
            </div>
          ) : (
            <div style={{ padding: "16px 24px", background: "rgba(0,0,0,0.03)", borderRadius: 12, maxWidth: 380, margin: "0 auto" }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>✦</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#111", marginBottom: 4 }}>You&apos;re on the list.</div>
              <div style={{ fontSize: 13, color: "#999" }}>We&apos;ll email you when your agent is ready to train.</div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="flex justify-between items-center" style={{ padding: "24px 32px", borderTop: "1px solid #E8E8E8", maxWidth: 960, margin: "0 auto" }}>
        <span style={{ fontSize: 12, color: "#999" }}>© 2026 accent. Built in Amsterdam.</span>
        <Link href="/privacy-contact" style={{ fontSize: 12, color: "#999", textDecoration: "none" }}>Privacy</Link>
      </footer>
    </div>
  );
}
