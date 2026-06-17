"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { upsertProfile } from "@/lib/supabase/profiles";
import { ArrowLeft } from "@/components/ArrowIcon";

const INK = "#111827";
const DIM = "#6b7280";
const FAINT = "#9ca3af";
const BORDER = "#e5e7eb";

export default function SettingsPage() {
  const [email, setEmail] = useState("");
  const [resetting, setResetting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }
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
        <div className="max-w-[640px] mx-auto px-5 py-4 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="no-underline font-serif"
            style={{ fontSize: 20, fontWeight: 600, color: INK }}
          >
            accent
          </Link>
          <Link href="/dashboard" className="no-underline font-mono text-[12px]" style={{ color: DIM }}>
            <ArrowLeft size={12} /> Back
          </Link>
        </div>
      </nav>

      <div className="max-w-[480px] mx-auto px-5 py-12">
        <h1 className="font-serif mb-8" style={{ fontSize: 24, fontWeight: 600, color: INK }}>
          Settings
        </h1>

        <div className="space-y-6">
          <div>
            <label
              className="font-mono uppercase block mb-2"
              style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}
            >
              Email
            </label>
            <p className="font-sans text-[15px]" style={{ color: INK }}>
              {email}
            </p>
          </div>

          <div className="pt-4 space-y-3" style={{ borderTop: `1px solid ${BORDER}` }}>
            <button
              onClick={async () => {
                setResetting(true);
                await upsertProfile({ onboarding_completed: false });
                window.location.href = "/onboard/1";
              }}
              disabled={resetting}
              className="w-full py-3 rounded-full font-sans text-[14px]"
              style={{ border: `1px solid ${BORDER}`, color: DIM, background: "transparent", cursor: "pointer" }}
            >
              {resetting ? "Redirecting..." : "Redo onboarding"}
            </button>
            <button
              onClick={handleSignOut}
              className="w-full py-3 rounded-full font-sans text-[14px]"
              style={{ border: `1px solid ${BORDER}`, color: DIM, background: "transparent", cursor: "pointer" }}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
