"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const INK = "#111111";
const DIM = "#6B6B6B";
const FAINT = "#9ca3af";
const BORDER = "#E5E5E5";

export default function SettingsPage() {
  const [email, setEmail] = useState("");
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/login"); return; }
      setEmail(user.email || "");
    });
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="min-h-screen" style={{ background: "#fff" }}>
      <nav style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[640px] mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="no-underline font-serif" style={{ fontSize: 20, fontWeight: 600, color: INK }}>accent</Link>
          <Link href="/dashboard" className="no-underline font-mono text-[12px]" style={{ color: DIM }}>← Back</Link>
        </div>
      </nav>

      <div className="max-w-[480px] mx-auto px-6 py-12">
        <h1 className="font-serif mb-8" style={{ fontSize: 24, fontWeight: 600, color: INK }}>Settings</h1>

        <div className="space-y-6">
          <div>
            <label className="font-mono uppercase block mb-2" style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}>Email</label>
            <p className="font-sans text-[15px]" style={{ color: INK }}>{email}</p>
          </div>

          <div className="pt-4" style={{ borderTop: `1px solid ${BORDER}` }}>
            <button onClick={handleSignOut} className="w-full py-3 rounded-full font-sans text-[14px]" style={{ border: `1px solid ${BORDER}`, color: DIM, background: "transparent", cursor: "pointer" }}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
