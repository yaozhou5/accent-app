"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upsertProfile } from "@/lib/supabase/profiles";

const INK = "#111827";
const DIM = "#6B6B6B";
const BLUE = "#3B82F6";
const BORDER = "#E5E5E5";

export default function Onboard1() {
  const [businessDesc, setBusinessDesc] = useState("A social app to connect people IRL for activities. Gen Z and Millennials who want to meet new people.");
  const [partyPitch, setPartyPitch] = useState("A hangout app to meet new people and make friends through concerts, sports events, and group activities.");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const handleNext = async () => {
    if (!businessDesc.trim()) return;
    setSaving(true);
    await upsertProfile({ business_description: businessDesc.trim(), party_pitch: partyPitch.trim() });
    setSaving(false);
    router.push("/onboard/2");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#fff" }}>
      <div className="max-w-[480px] w-full py-16">
        <div className="flex gap-2 mb-10">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex-1 h-[3px] rounded-full" style={{ background: s === 1 ? INK : BORDER }} />
          ))}
        </div>

        <span className="font-mono text-[11px] uppercase block mb-2" style={{ color: DIM, letterSpacing: "0.1em" }}>1 of 3</span>
        <h1 className="font-serif mb-8" style={{ fontSize: 24, fontWeight: 600, color: INK }}>Who are you?</h1>

        <div className="mb-6">
          <label className="font-mono uppercase block mb-2" style={{ fontSize: 11, letterSpacing: "0.05em", color: "#9ca3af", fontWeight: 500 }}>What are you building and who's it for?</label>
          <textarea
            value={businessDesc}
            onChange={e => setBusinessDesc(e.target.value)}
            placeholder="A social app to connect people IRL for activities. Gen Z and Millennials who want to meet new people."
            rows={3}
            className="w-full outline-none resize-y font-sans"
            style={{ fontSize: 16, color: INK, lineHeight: 1.7, padding: "12px 16px", border: `1px solid ${BORDER}`, borderRadius: 10 }}
          />
        </div>

        <div className="mb-8">
          <label className="font-mono uppercase block mb-2" style={{ fontSize: 11, letterSpacing: "0.05em", color: "#9ca3af", fontWeight: 500 }}>How do you explain it at a party?</label>
          <textarea
            value={partyPitch}
            onChange={e => setPartyPitch(e.target.value)}
            placeholder="A hangout app to meet new people and make friends through concerts, sports events, and group activities."
            rows={3}
            className="w-full outline-none resize-y font-sans"
            style={{ fontSize: 16, color: INK, lineHeight: 1.7, padding: "12px 16px", border: `1px solid ${BORDER}`, borderRadius: 10 }}
          />
        </div>

        <button
          onClick={handleNext}
          disabled={!businessDesc.trim() || saving}
          className="w-full rounded-full font-sans font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ fontSize: 15, padding: "12px 24px", background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}
        >
          {saving ? "Saving..." : "Next"}
        </button>
      </div>
    </div>
  );
}
