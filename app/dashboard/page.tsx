"use client";

import Link from "next/link";

const INK = "#1A1A18";
const DIM = "#6B6B6B";
const BORDER = "#E5E5E5";

const STATIONS = [
  { title: "Log", desc: "What happened this week? Drop your notes here.", href: "/dashboard/log", color: "#0d9488" },
  { title: "Ideas", desc: "See what to post based on your real stories.", href: "/dashboard", color: "#3b82f6", soon: true },
  { title: "Write", desc: "Polish your writing and spread it across channels.", href: "/dashboard/write", color: "#2563EB" },
  { title: "Shelf", desc: "Your content library and rhythm tracker.", href: "/shelf", color: "#8b5cf6" },
];

export default function DashboardPage() {
  return (
    <div className="min-h-screen" style={{ background: "#fff" }}>
      <header style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[640px] mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/" className="no-underline font-serif" style={{ fontSize: 20, fontWeight: 600, color: INK }}>accent</Link>
          <Link href="/settings" className="no-underline font-mono text-[12px]" style={{ color: DIM }}>Settings</Link>
        </div>
      </header>

      <div className="max-w-[640px] mx-auto px-5 py-8">
        <h1 className="font-serif mb-2" style={{ fontSize: 28, fontWeight: 400, color: INK }}>Your workspace</h1>
        <p className="font-sans mb-8" style={{ fontSize: 15, color: DIM }}>Four stations. One flow.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {STATIONS.map(s => (
            <Link
              key={s.title}
              href={s.soon ? "#" : s.href}
              className="no-underline block rounded-[12px] transition-all hover:-translate-y-0.5"
              style={{
                padding: "24px 22px",
                border: `1px solid ${BORDER}`,
                background: "#fff",
                opacity: s.soon ? 0.5 : 1,
                cursor: s.soon ? "default" : "pointer",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded-full" style={{ width: 8, height: 8, background: s.color }} />
                <h2 className="font-serif" style={{ fontSize: 18, fontWeight: 600, color: INK }}>{s.title}</h2>
                {s.soon && <span className="font-mono text-[10px] px-2 py-0.5 rounded-full" style={{ background: "#f5f5f5", color: DIM }}>Soon</span>}
              </div>
              <p className="font-sans" style={{ fontSize: 14, color: DIM, lineHeight: 1.55 }}>{s.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
