"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getProfile, upsertProfile } from "@/lib/supabase/profiles";

const BLUE = "#2563EB";
const INK = "#1A1A18";
const DIM = "#6B6B6B";
const BORDER = "#E5E5E5";

export default function SettingsPage() {
  const [audience, setAudience] = useState("");
  const [tone, setTone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      setEmail(user.email || "");
    });
    getProfile().then(p => {
      if (p) { setAudience(p.audience_description || ""); setTone(p.tone || ""); }
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await upsertProfile({ audience_description: audience, tone });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen" style={{ background: "#fff" }}>
      <nav style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[640px] mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/write" className="no-underline font-serif" style={{ fontSize: 20, fontWeight: 600, color: INK }}>accent</Link>
          <Link href="/write" className="no-underline font-mono text-[13px]" style={{ color: DIM }}>← Back to writing</Link>
        </div>
      </nav>

      <div className="max-w-[480px] mx-auto px-6 py-12">
        <h1 className="font-serif mb-8" style={{ fontSize: 28, fontWeight: 400, color: INK }}>Settings</h1>

        <div className="space-y-6">
          <div>
            <label className="font-mono uppercase block mb-2" style={{ fontSize: 10, letterSpacing: "0.1em", color: DIM }}>Email</label>
            <p className="font-sans text-[15px]" style={{ color: INK }}>{email}</p>
          </div>

          <div>
            <label className="font-mono uppercase block mb-2" style={{ fontSize: 10, letterSpacing: "0.1em", color: DIM }}>Audience</label>
            <textarea value={audience} onChange={e => setAudience(e.target.value)} placeholder="Who reads your content?"
              rows={2} className="w-full outline-none resize-y font-sans" style={{ fontSize: 15, color: INK, lineHeight: 1.6, padding: "12px 16px", border: `1px solid ${BORDER}`, borderRadius: 10 }} />
          </div>

          <div>
            <label className="font-mono uppercase block mb-2" style={{ fontSize: 10, letterSpacing: "0.1em", color: DIM }}>Tone</label>
            <div className="flex flex-wrap gap-2">
              {["direct", "casual", "professional", "warm"].map(t => (
                <button key={t} onClick={() => setTone(t)} className="px-4 py-2 rounded-full text-[13px] font-mono transition-all capitalize" style={{
                  background: tone === t ? BLUE : "transparent", color: tone === t ? "#fff" : DIM,
                  border: tone === t ? "none" : `1px solid ${BORDER}`, cursor: "pointer",
                }}>{t}</button>
              ))}
            </div>
          </div>

          <button onClick={handleSave} disabled={saving} className="w-full py-3 rounded-full font-sans font-semibold text-[15px] disabled:opacity-50" style={{ background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}>
            {saved ? "Saved \u2713" : saving ? "Saving..." : "Save changes"}
          </button>

          <div className="pt-6" style={{ borderTop: `1px solid ${BORDER}` }}>
            <button onClick={handleSignOut} className="w-full py-3 rounded-full font-sans text-[14px]" style={{ border: `1px solid ${BORDER}`, color: DIM, background: "transparent", cursor: "pointer" }}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
