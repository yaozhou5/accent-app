"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upsertProfile } from "@/lib/supabase/profiles";

const INK = "#111827";
const DIM = "#6b7280";
const BLUE = "#3B82F6";
const BORDER = "#e5e7eb";

const GOALS = [
  { key: "get_users", label: "Get users", desc: "Content that reaches your target audience and drives signups" },
  { key: "raise_money", label: "Raise money", desc: "Signal traction and vision to investors" },
  { key: "find_partners", label: "Find partners", desc: "Attract collaborators, creators, or business partners" },
  { key: "build_credibility", label: "Build credibility", desc: "Become known in your space as the go-to person" },
];

export default function Onboard2() {
  const [selected, setSelected] = useState<string[]>(["get_users"]);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const toggle = (key: string) => {
    setSelected(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleNext = async () => {
    if (selected.length === 0) return;
    setSaving(true);
    await upsertProfile({ goals: selected });
    setSaving(false);
    router.push("/onboard/3");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#fff" }}>
      <div className="max-w-[480px] w-full py-16">
        <div className="flex gap-2 mb-10">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex-1 h-[3px] rounded-full" style={{ background: s <= 2 ? INK : BORDER }} />
          ))}
        </div>

        <span className="font-mono text-[11px] uppercase block mb-2" style={{ color: DIM, letterSpacing: "0.1em" }}>2 of 3</span>
        <h1 className="font-serif mb-2" style={{ fontSize: 24, fontWeight: 600, color: INK }}>Why are you posting?</h1>
        <p className="font-sans mb-8" style={{ fontSize: 15, color: DIM, lineHeight: 1.6 }}>Pick your main goal. This shapes what kind of content we plan for you.</p>

        <div className="space-y-3 mb-8">
          {GOALS.map(g => (
            <button
              key={g.key}
              onClick={() => toggle(g.key)}
              className="w-full text-left p-4 rounded-[10px] transition-all"
              style={{
                border: selected.includes(g.key) ? `1.5px solid ${BLUE}` : `1px solid ${BORDER}`,
                background: selected.includes(g.key) ? `${BLUE}08` : "transparent",
                cursor: "pointer",
              }}
            >
              <span className="block font-sans text-[15px] font-medium" style={{ color: INK }}>{g.label}</span>
              <span className="block font-sans text-[13px] mt-0.5" style={{ color: DIM }}>{g.desc}</span>
            </button>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleNext}
            disabled={selected.length === 0 || saving}
            className="flex-1 rounded-full font-sans font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ fontSize: 15, padding: "12px 24px", background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}
          >
            {saving ? "Saving..." : "Next"}
          </button>
          <button
            onClick={() => router.push("/onboard/1")}
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
