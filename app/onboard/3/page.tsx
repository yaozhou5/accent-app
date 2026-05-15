"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upsertProfile } from "@/lib/supabase/profiles";

const INK = "#1A1A18";
const DIM = "#6B6B6B";
const BLUE = "#2563EB";
const BORDER = "#E5E5E5";

const PLATFORMS = ["Instagram", "LinkedIn", "X", "Threads", "TikTok"];
const FREQUENCIES = ["1-2", "3-4", "5+"];

export default function Onboard3() {
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [frequency, setFrequency] = useState("3-4");
  const [challenges, setChallenges] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const togglePlatform = (p: string) => {
    setPlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);
  };

  const handleDone = async () => {
    if (platforms.length === 0) return;
    setSaving(true);
    const ok = await upsertProfile({
      platforms,
      posting_frequency: frequency,
      posting_challenges: challenges.trim() || null,
      onboarding_completed: true,
    });
    if (!ok) {
      console.error("Failed to save onboarding profile");
      setSaving(false);
      return;
    }
    // Brief pause to let the server-side session see the updated profile
    await new Promise(r => setTimeout(r, 500));
    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#fff" }}>
      <div className="max-w-[480px] w-full py-16">
        <div className="flex gap-2 mb-10">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex-1 h-[3px] rounded-full" style={{ background: INK }} />
          ))}
        </div>

        <span className="font-mono text-[11px] uppercase block mb-2" style={{ color: DIM, letterSpacing: "0.1em" }}>3 of 3</span>
        <h1 className="font-serif mb-2" style={{ fontSize: 28, fontWeight: 400, color: INK }}>Where and how often?</h1>
        <p className="font-sans mb-8" style={{ fontSize: 15, color: DIM, lineHeight: 1.6 }}>Pick the platforms you're on. Be honest about what you can sustain.</p>

        <div className="mb-6">
          <label className="font-mono uppercase block mb-2" style={{ fontSize: 10, letterSpacing: "0.1em", color: DIM }}>Platforms</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map(p => (
              <button
                key={p}
                onClick={() => togglePlatform(p)}
                className="px-4 py-2 rounded-full text-[13px] font-mono transition-all"
                style={{
                  background: platforms.includes(p) ? BLUE : "transparent",
                  color: platforms.includes(p) ? "#fff" : DIM,
                  border: platforms.includes(p) ? "none" : `1px solid ${BORDER}`,
                  cursor: "pointer",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <label className="font-mono uppercase block mb-2" style={{ fontSize: 10, letterSpacing: "0.1em", color: DIM }}>Posts per week you can actually do</label>
          <div className="flex gap-2">
            {FREQUENCIES.map(f => (
              <button
                key={f}
                onClick={() => setFrequency(f)}
                className="px-5 py-2.5 rounded-full text-[14px] font-mono transition-all"
                style={{
                  background: frequency === f ? BLUE : "transparent",
                  color: frequency === f ? "#fff" : DIM,
                  border: frequency === f ? "none" : `1px solid ${BORDER}`,
                  cursor: "pointer",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8">
          <label className="font-mono uppercase block mb-2" style={{ fontSize: 10, letterSpacing: "0.1em", color: DIM }}>What's been hard about posting?</label>
          <textarea
            value={challenges}
            onChange={e => setChallenges(e.target.value)}
            placeholder="Been in builder mode. Not confident enough yet. Time to focus on content."
            rows={3}
            className="w-full outline-none resize-y font-sans"
            style={{ fontSize: 16, color: INK, lineHeight: 1.7, padding: "12px 16px", border: `1px solid ${BORDER}`, borderRadius: 10 }}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleDone}
            disabled={platforms.length === 0 || saving}
            className="flex-1 py-3.5 rounded-full font-sans font-semibold text-[15px] disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}
          >
            {saving ? "Saving..." : "Done, start planning"}
          </button>
          <button
            onClick={() => router.push("/onboard/2")}
            className="px-6 py-3 rounded-full font-sans text-[14px]"
            style={{ border: `1px solid ${BORDER}`, color: DIM, background: "transparent", cursor: "pointer" }}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
