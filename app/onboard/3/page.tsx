"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upsertProfile } from "@/lib/supabase/profiles";

const INK = "#111827";
const DIM = "#6B6B6B";
const BLUE = "#3B82F6";
const BORDER = "#E5E5E5";

const PLATFORMS = ["LinkedIn", "X", "Substack", "小红书", "Threads"];
const FREQUENCIES = ["1-2", "3-4", "5+"];
const EXPERIENCE_OPTIONS = ["Yes regularly", "A little", "Not really"];
const POST_TYPE_CHIPS = ["Personal stories", "Product updates", "Industry opinions", "Behind the scenes", "Lessons learned", "Engagement posts", "Not sure yet"];
const TONE_CHIPS = ["Casual and honest", "Professional", "Funny", "Inspirational", "Still figuring it out"];

function ChipSelect({ options, selected, onToggle, multi = true }: { options: string[]; selected: string[]; onToggle: (v: string) => void; multi?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o} onClick={() => onToggle(o)} className="px-4 py-2 rounded-full text-[13px] font-mono transition-all"
          style={{ background: selected.includes(o) ? BLUE : "transparent", color: selected.includes(o) ? "#fff" : DIM, border: selected.includes(o) ? "none" : `1px solid ${BORDER}`, cursor: "pointer" }}>
          {o}
        </button>
      ))}
    </div>
  );
}

export default function Onboard3() {
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [frequency, setFrequency] = useState("3-4");
  const [challenges, setChallenges] = useState("");
  const [profileUrl, setProfileUrl] = useState("");
  const [pastPosts, setPastPosts] = useState("");
  const [experience, setExperience] = useState<string | null>(null);
  const [postsThatWork, setPostsThatWork] = useState<string[]>([]);
  const [postsThatFlop, setPostsThatFlop] = useState<string[]>([]);
  const [voiceTone, setVoiceTone] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const toggleMulti = (arr: string[], setArr: (v: string[]) => void) => (v: string) => {
    setArr(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]);
  };

  const showHistory = experience === "Yes regularly" || experience === "A little";

  const handleDone = async () => {
    if (platforms.length === 0) return;
    setSaving(true);
    const ok = await upsertProfile({
      platforms,
      posting_frequency: frequency,
      posting_challenges: challenges.trim() || null,
      profile_url: profileUrl.trim() || null,
      past_posts: pastPosts.trim() || null,
      posting_experience: experience,
      posts_that_work: showHistory ? postsThatWork : [],
      posts_that_flop: showHistory ? postsThatFlop : [],
      voice_tone: showHistory ? voiceTone : null,
      onboarding_completed: true,
    });
    if (!ok) { setSaving(false); return; }
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
        <h1 className="font-serif mb-2" style={{ fontSize: 24, fontWeight: 600, color: INK }}>Where and how often?</h1>
        <p className="font-sans mb-8" style={{ fontSize: 15, color: DIM, lineHeight: 1.6 }}>Pick the platforms you're on. Be honest about what you can sustain.</p>

        {/* Platforms */}
        <div className="mb-6">
          <label className="font-mono uppercase block mb-2" style={{ fontSize: 11, letterSpacing: "0.05em", color: "#9ca3af", fontWeight: 500 }}>Platforms</label>
          <ChipSelect options={PLATFORMS} selected={platforms} onToggle={v => setPlatforms(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v])} />
        </div>

        {/* Frequency */}
        <div className="mb-6">
          <label className="font-mono uppercase block mb-2" style={{ fontSize: 11, letterSpacing: "0.05em", color: "#9ca3af", fontWeight: 500 }}>Posts per week you can actually do</label>
          <div className="flex gap-2">
            {FREQUENCIES.map(f => (
              <button key={f} onClick={() => setFrequency(f)} className="px-5 py-2.5 rounded-full text-[14px] font-mono transition-all"
                style={{ background: frequency === f ? BLUE : "transparent", color: frequency === f ? "#fff" : DIM, border: frequency === f ? "none" : `1px solid ${BORDER}`, cursor: "pointer" }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Content history toggle */}
        <div className="mb-6">
          <label className="font-mono uppercase block mb-2" style={{ fontSize: 11, letterSpacing: "0.05em", color: "#9ca3af", fontWeight: 500 }}>Have you posted before?</label>
          <div className="flex gap-2 flex-wrap">
            {EXPERIENCE_OPTIONS.map(o => (
              <button key={o} onClick={() => setExperience(o)} className="px-4 py-2 rounded-full text-[13px] font-mono transition-all"
                style={{ background: experience === o ? BLUE : "transparent", color: experience === o ? "#fff" : DIM, border: experience === o ? "none" : `1px solid ${BORDER}`, cursor: "pointer" }}>
                {o}
              </button>
            ))}
          </div>
        </div>

        {/* Conditional content history questions */}
        {showHistory && (
          <div className="space-y-6 mb-6 p-5 rounded-[12px]" style={{ background: "#fafafa", border: `1px solid ${BORDER}` }}>
            <div>
              <label className="font-mono uppercase block mb-2" style={{ fontSize: 11, letterSpacing: "0.05em", color: "#9ca3af", fontWeight: 500 }}>What kind of posts have worked best?</label>
              <ChipSelect options={POST_TYPE_CHIPS} selected={postsThatWork} onToggle={toggleMulti(postsThatWork, setPostsThatWork)} />
            </div>
            <div>
              <label className="font-mono uppercase block mb-2" style={{ fontSize: 11, letterSpacing: "0.05em", color: "#9ca3af", fontWeight: 500 }}>What kind of posts haven't worked?</label>
              <ChipSelect options={POST_TYPE_CHIPS} selected={postsThatFlop} onToggle={toggleMulti(postsThatFlop, setPostsThatFlop)} />
            </div>
            <div>
              <label className="font-mono uppercase block mb-2" style={{ fontSize: 11, letterSpacing: "0.05em", color: "#9ca3af", fontWeight: 500 }}>How would you describe your tone?</label>
              <ChipSelect options={TONE_CHIPS} selected={voiceTone ? [voiceTone] : []} onToggle={v => setVoiceTone(voiceTone === v ? null : v)} multi={false} />
            </div>
          </div>
        )}

        {/* Challenges */}
        <div className="mb-6">
          <label className="font-mono uppercase block mb-2" style={{ fontSize: 11, letterSpacing: "0.05em", color: "#9ca3af", fontWeight: 500 }}>What's been hard about posting?</label>
          <textarea value={challenges} onChange={e => setChallenges(e.target.value)}
            placeholder="Been in builder mode. Not confident enough yet. Time to focus on content." rows={3}
            className="w-full outline-none resize-y font-sans"
            style={{ fontSize: 16, color: INK, lineHeight: 1.7, padding: "12px 16px", border: `1px solid ${BORDER}`, borderRadius: 10 }} />
        </div>

        {/* Profile URL */}
        <div className="mb-6">
          <label className="font-mono uppercase block mb-2" style={{ fontSize: 11, letterSpacing: "0.05em", color: "#9ca3af", fontWeight: 500 }}>Your LinkedIn or Instagram profile URL (optional)</label>
          <input type="url" value={profileUrl} onChange={e => setProfileUrl(e.target.value)}
            placeholder="https://linkedin.com/in/yourname" className="w-full outline-none font-sans"
            style={{ fontSize: 16, color: INK, padding: "12px 16px", border: `1px solid ${BORDER}`, borderRadius: 10 }} />
        </div>

        {/* Past posts */}
        <div className="mb-8">
          <label className="font-mono uppercase block mb-2" style={{ fontSize: 11, letterSpacing: "0.05em", color: "#9ca3af", fontWeight: 500 }}>Paste 2-3 posts you've written before (optional)</label>
          <textarea value={pastPosts} onChange={e => setPastPosts(e.target.value)}
            placeholder="Copy paste any posts you've made. Good ones, bad ones, doesn't matter. This helps us understand your voice and what's worked for you." rows={5}
            className="w-full outline-none resize-y font-sans"
            style={{ fontSize: 16, color: INK, lineHeight: 1.7, padding: "12px 16px", border: `1px solid ${BORDER}`, borderRadius: 10 }} />
        </div>

        <div className="flex gap-3">
          <button onClick={handleDone} disabled={platforms.length === 0 || saving}
            className="flex-1 rounded-full font-sans font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ fontSize: 15, padding: "12px 24px", background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}>
            {saving ? "Saving..." : "Done, start planning"}
          </button>
          <button onClick={() => router.push("/onboard/2")} className="px-6 py-3 rounded-full font-sans text-[14px]"
            style={{ border: `1px solid ${BORDER}`, color: DIM, background: "transparent", cursor: "pointer" }}>
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
