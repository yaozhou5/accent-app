"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upsertProfile } from "@/lib/supabase/profiles";

const CHANNEL_OPTIONS = ["LinkedIn", "Twitter / X", "Newsletter", "Community", "Cold DM", "Instagram", "TikTok"];
const TONE_OPTIONS = [
  { key: "direct", label: "Direct", desc: "Short sentences. No filler. Say it and move on." },
  { key: "casual", label: "Casual", desc: "Conversational. Like texting a friend who gets it." },
  { key: "professional", label: "Professional", desc: "Polished but human. Credible without being stiff." },
  { key: "warm", label: "Warm", desc: "Encouraging. Personal. You care and it shows." },
];

const BLUE = "#2563EB";
const INK = "#1A1A18";
const DIM = "#6B6B6B";
const BORDER = "#E5E5E5";

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [audience, setAudience] = useState("");
  const [channels, setChannels] = useState<string[]>(["LinkedIn"]);
  const [tone, setTone] = useState("direct");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const toggleChannel = (c: string) => {
    setChannels(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  const handleFinish = async () => {
    setSaving(true);
    await upsertProfile({ audience_description: audience, channels, tone, onboarding_completed: true });
    setSaving(false);
    router.push("/write");
  };

  const handleSkip = async () => {
    await upsertProfile({ onboarding_completed: true });
    router.push("/write");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#fff" }}>
      <div className="max-w-[480px] w-full py-16">
        {/* Progress */}
        <div className="flex gap-2 mb-10">
          {[1, 2].map(s => (
            <div key={s} className="flex-1 h-[3px] rounded-full" style={{ background: step >= s ? INK : BORDER }} />
          ))}
        </div>

        {step === 1 && (
          <>
            <h1 className="font-serif mb-2" style={{ fontSize: 28, fontWeight: 400, color: INK }}>Tell us about you</h1>
            <p className="font-sans mb-8" style={{ fontSize: 15, color: DIM, lineHeight: 1.6 }}>
              This helps Accent find the right stories in your diary.
            </p>

            <div className="mb-6">
              <label className="font-mono uppercase block mb-2" style={{ fontSize: 10, letterSpacing: "0.1em", color: DIM }}>What are you building?</label>
              <textarea value={audience} onChange={e => setAudience(e.target.value)} placeholder="e.g., a design community in Amsterdam, a SaaS for freelancers"
                rows={2} className="w-full outline-none resize-y font-sans" style={{ fontSize: 16, color: INK, lineHeight: 1.7, padding: "12px 16px", border: `1px solid ${BORDER}`, borderRadius: 10 }} />
            </div>

            <div className="mb-8">
              <label className="font-mono uppercase block mb-2" style={{ fontSize: 10, letterSpacing: "0.1em", color: DIM }}>Your channels</label>
              <div className="flex flex-wrap gap-2">
                {CHANNEL_OPTIONS.map(c => (
                  <button key={c} onClick={() => toggleChannel(c)} className="px-4 py-2 rounded-full text-[13px] font-mono transition-all" style={{
                    background: channels.includes(c) ? BLUE : "transparent", color: channels.includes(c) ? "#fff" : DIM,
                    border: channels.includes(c) ? "none" : `1px solid ${BORDER}`, cursor: "pointer",
                  }}>{c}</button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-3.5 rounded-full font-sans font-semibold text-[15px]" style={{ background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}>
                Next
              </button>
              <button onClick={handleSkip} className="px-6 py-3 rounded-full font-sans text-[14px]" style={{ border: `1px solid ${BORDER}`, color: DIM, background: "transparent", cursor: "pointer" }}>
                Skip
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="font-serif mb-2" style={{ fontSize: 28, fontWeight: 400, color: INK }}>How do you want to sound?</h1>
            <p className="font-sans mb-8" style={{ fontSize: 15, color: DIM, lineHeight: 1.6 }}>
              Pick the tone closest to your natural writing voice.
            </p>

            <div className="space-y-3 mb-8">
              {TONE_OPTIONS.map(t => (
                <button key={t.key} onClick={() => setTone(t.key)} className="w-full text-left p-4 rounded-[10px] transition-all" style={{
                  border: tone === t.key ? `1.5px solid ${BLUE}` : `1px solid ${BORDER}`,
                  background: tone === t.key ? `${BLUE}08` : "transparent", cursor: "pointer",
                }}>
                  <span className="block font-sans text-[15px] font-medium" style={{ color: INK }}>{t.label}</span>
                  <span className="block font-sans text-[13px] mt-0.5" style={{ color: DIM }}>{t.desc}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={handleFinish} disabled={saving} className="flex-1 py-3.5 rounded-full font-sans font-semibold text-[15px] disabled:opacity-50" style={{ background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}>
                {saving ? "Saving..." : "Start writing"}
              </button>
              <button onClick={() => setStep(1)} className="px-6 py-3 rounded-full font-sans text-[14px]" style={{ border: `1px solid ${BORDER}`, color: DIM, background: "transparent", cursor: "pointer" }}>
                Back
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
