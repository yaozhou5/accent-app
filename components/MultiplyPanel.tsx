"use client";
import { useState, useRef } from "react";
import type { VoiceProfile } from "@/lib/voice-dimensions";

const INK = "#1A1A18";
const BLUE = "#1a1a1a";
const DIM = "#6B6860";
const FAINT = "#A8A49C";
const BORDER = "#e5e7eb";

type Platform = "linkedin" | "twitter" | "newsletter" | "short";

const PLATFORMS: { key: Platform; label: string; color: string }[] = [
  { key: "linkedin", label: "LinkedIn", color: "#0A66C2" },
  { key: "twitter", label: "X / Twitter", color: "#1A1A18" },
  { key: "newsletter", label: "Newsletter", color: "#D97706" },
  { key: "short", label: "Short post", color: "#E85D3A" },
];

export default function MultiplyPanel({ draftText, voiceProfile }: { draftText: string; voiceProfile: VoiceProfile }) {
  const [activeTab, setActiveTab] = useState<Platform>("linkedin");
  const [generated, setGenerated] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const streamRef = useRef("");

  async function generateForPlatform(platform: Platform) {
    if (generated[platform] || loading) return;
    setLoading(platform);
    streamRef.current = "";

    try {
      const res = await fetch("/api/multiply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftText, voiceProfile, platform }),
      });

      if (!res.ok) throw new Error("Failed");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          streamRef.current += decoder.decode(value, { stream: true });
          setGenerated((prev) => ({
            ...prev,
            [platform]: streamRef.current,
          }));
        }
      }
    } catch (err) {
      console.error("Multiply failed:", err);
    } finally {
      setLoading(null);
    }
  }

  function handleTabClick(platform: Platform) {
    setActiveTab(platform);
    if (!generated[platform] && !loading) {
      generateForPlatform(platform);
    }
  }

  function handleCopy(text: string, platform: string) {
    navigator.clipboard.writeText(text);
    setCopied(platform);
    setTimeout(() => setCopied(null), 2000);
  }

  const activePlatform = PLATFORMS.find((p) => p.key === activeTab)!;
  const content = generated[activeTab] || "";

  return (
    <div style={{ borderRadius: 0, border: `1px solid ${BORDER}`, overflow: "hidden" }}>
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          overflowX: "auto",
          borderBottom: `1px solid ${BORDER}`,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {PLATFORMS.map((p) => (
          <button
            key={p.key}
            onClick={() => handleTabClick(p.key)}
            style={{
              flex: "0 0 auto",
              padding: "12px 20px",
              fontSize: 14,
              fontWeight: activeTab === p.key ? 700 : 500,
              color: activeTab === p.key ? p.color : DIM,
              background: activeTab === p.key ? `${p.color}08` : "transparent",
              border: "none",
              borderBottom: activeTab === p.key ? `2px solid ${p.color}` : "2px solid transparent",
              cursor: "pointer",
              whiteSpace: "nowrap",
              fontFamily: "inherit",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div style={{ padding: "20px 24px", minHeight: 120 }}>
        {loading === activeTab && !content && (
          <p className="font-sans text-[14px]" style={{ color: FAINT }}>
            Adapting for {activePlatform.label}...
          </p>
        )}

        {content && (
          <div>
            <p
              className="font-sans"
              style={{
                fontSize: 15,
                color: INK,
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
                marginBottom: 16,
              }}
            >
              {content}
            </p>
            <button
              onClick={() => handleCopy(content, activeTab)}
              className="font-sans text-[13px] font-semibold"
              style={{
                background: copied === activeTab ? "#E8F5E0" : "#f9fafb",
                border: `1px solid ${BORDER}`,
                borderRadius: 0,
                padding: "8px 16px",
                cursor: "pointer",
                color: copied === activeTab ? "#16a34a" : DIM,
              }}
            >
              {copied === activeTab ? "Copied!" : "Copy"}
            </button>
          </div>
        )}

        {!loading && !content && (
          <button
            onClick={() => generateForPlatform(activeTab)}
            className="font-sans text-[14px] font-semibold"
            style={{
              background: BLUE,
              color: "#fff",
              border: "none",
              borderRadius: 0,
              padding: "10px 24px",
              cursor: "pointer",
            }}
          >
            Generate for {activePlatform.label}
          </button>
        )}
      </div>

      {/* Voice label */}
      <div
        style={{
          padding: "12px 24px",
          borderTop: `1px solid ${BORDER}`,
          background: "#f9fafb",
        }}
      >
        <p className="font-mono text-[11px]" style={{ color: FAINT }}>
          Written in your voice · {voiceProfile.top_traits?.join(". ")}.
        </p>
      </div>
    </div>
  );
}
