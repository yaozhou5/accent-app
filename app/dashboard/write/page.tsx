"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const AppShell = dynamic(() => import("@/components/AppShell").then(m => m.AppShell), { ssr: false });

const INK = "#1A1A18";
const DIM = "#6B6B6B";
const BORDER = "#E5E5E5";

export default function DashboardWritePage() {
  return (
    <div className="min-h-screen" style={{ background: "#fff" }}>
      <header style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[640px] mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="no-underline flex items-center" style={{ color: DIM }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="font-serif" style={{ fontSize: 22, fontWeight: 600, color: INK }}>Write</h1>
          </div>
        </div>
      </header>

      <div className="max-w-[640px] mx-auto px-5 py-8">
        <AppShell />
      </div>
    </div>
  );
}
