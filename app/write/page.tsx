"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";

const AppShell = dynamic(
  () => import("@/components/AppShell").then((m) => m.AppShell),
  { ssr: false }
);

const CHANNELS = [
  { key: "linkedin", label: "LinkedIn" },
  { key: "cold_dm", label: "Cold DM" },
  { key: "tweet", label: "Tweet" },
  { key: "newsletter", label: "Newsletter" },
  { key: "community_post", label: "Community Post" },
];

const BLUE = "#2563EB";
const INK = "#1A1A18";
const DIM = "#6B6B6B";
const BORDER = "#E5E5E5";

function SpreadView() {
  const [draft, setDraft] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<string[]>(CHANNELS.map(c => c.key));
  const [results, setResults] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeResultTab, setActiveResultTab] = useState("");
  const [editingTab, setEditingTab] = useState<string | null>(null);
  const [editedResults, setEditedResults] = useState<Record<string, string>>({});
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const toggleChannel = (key: string) => {
    setSelectedChannels(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const handleSpread = async () => {
    if (!draft.trim() || selectedChannels.length === 0 || loading) return;
    setLoading(true);
    setError(null);
    setResults(null);
    setEditedResults({});

    try {
      const res = await fetch("/api/spread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft, channels: selectedChannels }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); }
      else if (data.results) {
        setResults(data.results);
        setEditedResults({ ...data.results });
        setActiveResultTab(selectedChannels[0]);
      }
    } catch {
      setError("Something went wrong. Try again.");
    }
    setLoading(false);
  };

  const getText = (key: string) => editedResults[key] || results?.[key] || "";

  const handleCopy = async (key: string) => {
    await navigator.clipboard.writeText(getText(key));
    setCopiedTab(key);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const handleCopyAll = async () => {
    const allText = selectedChannels
      .filter(k => results?.[k])
      .map(k => {
        const label = CHANNELS.find(c => c.key === k)?.label || k;
        return `--- ${label} ---\n${getText(k)}`;
      })
      .join("\n\n");
    await navigator.clipboard.writeText(allText);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  // Step 1: Paste
  if (!results && !loading) {
    return (
      <div className="max-w-[640px] mx-auto px-5 py-12">
        <h2 className="font-serif mb-2" style={{ fontSize: 28, fontWeight: 400, color: INK }}>
          Spread your writing
        </h2>
        <p className="font-sans mb-8" style={{ fontSize: 15, color: DIM, lineHeight: 1.6 }}>
          Paste something you wrote. Accent will turn it into native content for every channel.
        </p>

        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Paste something you've already written..."
          rows={8}
          className="w-full outline-none resize-y font-sans"
          style={{ fontSize: 16, color: INK, lineHeight: 1.7, padding: "16px 20px", border: `1px solid ${BORDER}`, borderRadius: 10, background: "#fff", minHeight: 200 }}
        />

        <div className="mt-6 mb-8">
          <span className="font-mono uppercase block mb-3" style={{ fontSize: 10, letterSpacing: "0.1em", color: DIM }}>Channels</span>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map(c => (
              <button
                key={c.key}
                onClick={() => toggleChannel(c.key)}
                className="px-4 py-2 rounded-full text-[13px] font-mono transition-all"
                style={{
                  background: selectedChannels.includes(c.key) ? BLUE : "transparent",
                  color: selectedChannels.includes(c.key) ? "#fff" : DIM,
                  border: selectedChannels.includes(c.key) ? "none" : `1px solid ${BORDER}`,
                  cursor: "pointer",
                }}
              >{c.label}</button>
            ))}
          </div>
        </div>

        {error && (
          <p className="font-sans text-[14px] mb-4" style={{ color: "#DC2626" }}>{error}</p>
        )}

        <button
          onClick={handleSpread}
          disabled={!draft.trim() || selectedChannels.length === 0}
          className="w-full py-3.5 rounded-full font-sans font-semibold text-[15px] transition-opacity hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}
        >
          Spread it →
        </button>
      </div>
    );
  }

  // Step 2: Loading
  if (loading) {
    return (
      <div className="max-w-[640px] mx-auto px-5 py-20 text-center">
        <p className="font-mono uppercase" style={{ fontSize: 12, letterSpacing: "0.1em", color: DIM }}>
          Turning your draft into {selectedChannels.length} channels...
        </p>
        <div className="mt-6 flex justify-center gap-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="rounded-full" style={{ width: 6, height: 6, background: BLUE, opacity: 0.4, animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:0.3} 50%{opacity:1} }`}</style>
      </div>
    );
  }

  // Step 3: Results
  const resultChannels = selectedChannels.filter(k => results?.[k]);

  return (
    <div className="max-w-[720px] mx-auto px-5 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif" style={{ fontSize: 22, fontWeight: 400, color: INK }}>
          Your content
        </h2>
        <div className="flex gap-2">
          <button
            onClick={handleCopyAll}
            className="px-4 py-2 rounded-full text-[12px] font-mono transition-opacity hover:opacity-80"
            style={{ border: `1px solid ${BORDER}`, background: "transparent", cursor: "pointer", color: DIM }}
          >
            {copiedAll ? "Copied all ✓" : "Copy all"}
          </button>
          <button
            onClick={() => { setResults(null); setEditedResults({}); }}
            className="px-4 py-2 rounded-full text-[12px] font-mono transition-opacity hover:opacity-80"
            style={{ border: `1px solid ${BORDER}`, background: "transparent", cursor: "pointer", color: DIM }}
          >
            New draft
          </button>
        </div>
      </div>

      {/* Channel tabs */}
      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {resultChannels.map(key => {
          const label = CHANNELS.find(c => c.key === key)?.label || key;
          return (
            <button
              key={key}
              onClick={() => setActiveResultTab(key)}
              className="px-4 py-2 rounded-full text-[13px] font-mono shrink-0 transition-all"
              style={{
                background: activeResultTab === key ? BLUE : "transparent",
                color: activeResultTab === key ? "#fff" : DIM,
                border: activeResultTab === key ? "none" : `1px solid ${BORDER}`,
                cursor: "pointer",
              }}
            >{label}</button>
          );
        })}
      </div>

      {/* Active channel content */}
      {activeResultTab && results?.[activeResultTab] && (
        <div className="p-5" style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 10 }}>
          {editingTab === activeResultTab ? (
            <textarea
              value={editedResults[activeResultTab] || ""}
              onChange={(e) => setEditedResults(prev => ({ ...prev, [activeResultTab]: e.target.value }))}
              className="w-full outline-none resize-y font-sans"
              rows={12}
              style={{ fontSize: 15, color: INK, lineHeight: 1.7, border: "none", background: "transparent" }}
            />
          ) : (
            <p className="font-sans whitespace-pre-wrap" style={{ fontSize: 15, lineHeight: 1.7, color: INK }}>
              {getText(activeResultTab)}
            </p>
          )}

          <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: `1px solid ${BORDER}` }}>
            <button
              onClick={() => setEditingTab(editingTab === activeResultTab ? null : activeResultTab)}
              className="text-[12px] font-mono transition-opacity hover:opacity-70"
              style={{ color: DIM, background: "none", border: "none", cursor: "pointer" }}
            >
              {editingTab === activeResultTab ? "Done editing" : "Edit"}
            </button>
            <button
              onClick={() => handleCopy(activeResultTab)}
              className="px-5 py-2 rounded-full text-[13px] font-mono transition-opacity hover:opacity-90"
              style={{ background: INK, color: "#fff", border: "none", cursor: "pointer" }}
            >
              {copiedTab === activeResultTab ? "Copied ✓" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function WritePage() {
  const [mode, setMode] = useState<"spread" | "polish">("spread");

  return (
    <div className="min-h-screen" style={{ background: "#fff" }}>
      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[960px] mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/" className="no-underline font-serif" style={{ fontSize: 20, fontWeight: 600, color: INK }}>
            accent
          </Link>
          <div className="flex items-center gap-1 p-0.5 rounded-full" style={{ background: "#F5F5F5" }}>
            <button
              onClick={() => setMode("spread")}
              className="px-4 py-1.5 rounded-full text-[13px] font-mono transition-all"
              style={{
                background: mode === "spread" ? "#fff" : "transparent",
                color: mode === "spread" ? INK : DIM,
                border: "none", cursor: "pointer",
                boxShadow: mode === "spread" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >Spread</button>
            <button
              onClick={() => setMode("polish")}
              className="px-4 py-1.5 rounded-full text-[13px] font-mono transition-all"
              style={{
                background: mode === "polish" ? "#fff" : "transparent",
                color: mode === "polish" ? INK : DIM,
                border: "none", cursor: "pointer",
                boxShadow: mode === "polish" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >Polish</button>
          </div>
        </div>
      </nav>

      {mode === "spread" ? (
        <SpreadView />
      ) : (
        <div className="max-w-[480px] md:max-w-[600px] mx-auto min-h-screen flex flex-col bg-white md:shadow-[0_0_40px_rgba(0,0,0,0.06)]">
          <AppShell />
        </div>
      )}
    </div>
  );
}
