"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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

type Alternative = { word: string; reason: string };
type ChoicePoint = { original: string; alternatives: Alternative[] };
type StandOut = { common_take: string; unique_angle: string; bold_move: string };
type ChannelResult = { text: string; choices: ChoicePoint[]; stand_out?: StandOut };

/* ── Choice Point Popup ── */
function ChoicePopup({ original, alternatives, position, onPick, onClose }: {
  original: string;
  alternatives: Alternative[];
  position: { x: number; y: number };
  onPick: (word: string) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("mousedown", onClick); };
  }, [onClose]);

  // Clamp position to viewport
  const left = Math.min(Math.max(position.x - 140, 8), typeof window !== "undefined" ? window.innerWidth - 296 : 200);
  const top = position.y + 8;

  return (
    <div ref={ref} className="fixed z-50" style={{
      left, top, width: 280,
      background: "#fff", borderRadius: 12,
      boxShadow: "0 4px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
      border: `1px solid ${BORDER}`, overflow: "hidden",
    }}>
      <div className="px-4 py-2.5" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <span className="font-mono text-[10px] uppercase" style={{ color: DIM, letterSpacing: "0.06em" }}>Current</span>
        <span className="block font-sans text-[13px] mt-0.5" style={{ color: DIM }}>{original}</span>
      </div>
      {alternatives.map((alt, i) => (
        <button
          key={i}
          onClick={() => onPick(alt.word)}
          className="w-full text-left px-4 py-3 transition-colors hover:bg-[#EFF6FF] flex flex-col gap-0.5"
          style={{ border: "none", background: "transparent", cursor: "pointer", borderBottom: i < alternatives.length - 1 ? `1px solid ${BORDER}05` : "none" }}
        >
          <span className="font-sans text-[14px] font-medium" style={{ color: INK }}>{alt.word}</span>
          <span className="font-sans text-[12px]" style={{ color: DIM }}>{alt.reason}</span>
        </button>
      ))}
    </div>
  );
}

/* ── Interactive Editable Text with Choice Points ── */
function InteractiveText({ text, choices, onTextChange }: {
  text: string;
  choices: ChoicePoint[];
  onTextChange: (newText: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeChoice, setActiveChoice] = useState<{ original: string; alternatives: Alternative[]; spanEl: HTMLElement; pos: { x: number; y: number } } | null>(null);
  const [editCount, setEditCount] = useState(0);

  // Build HTML with choice point spans
  const buildHTML = useCallback((t: string, ch: ChoicePoint[]) => {
    const positions = ch
      .map(c => ({ ...c, idx: t.indexOf(c.original) }))
      .filter(c => c.idx !== -1)
      .sort((a, b) => a.idx - b.idx);

    const used: Array<{ s: number; e: number }> = [];
    const valid = positions.filter(c => {
      const s = c.idx, e = s + c.original.length;
      if (used.some(r => s < r.e && e > r.s)) return false;
      used.push({ s, e });
      return true;
    });

    let html = "";
    let cursor = 0;
    for (const c of valid) {
      if (c.idx > cursor) html += escapeHTML(t.slice(cursor, c.idx));
      html += `<span data-choice="${encodeURIComponent(JSON.stringify(c.alternatives))}" data-original="${escapeAttr(c.original)}" style="border-bottom:1.5px dotted ${BLUE}66;padding-bottom:1px;border-radius:2px;cursor:pointer">${escapeHTML(c.original)}</span>`;
      cursor = c.idx + c.original.length;
    }
    if (cursor < t.length) html += escapeHTML(t.slice(cursor));
    return html;
  }, []);

  // Set initial HTML
  useEffect(() => {
    if (!editorRef.current) return;
    editorRef.current.innerHTML = buildHTML(text, choices);
  }, []); // Only on mount — after that, user edits directly

  // Re-render only when text changes externally (alternative pick)
  const lastTextRef = useRef(text);
  useEffect(() => {
    if (text !== lastTextRef.current) {
      lastTextRef.current = text;
      if (!editorRef.current) return;
      // Save cursor position
      const sel = window.getSelection();
      const hadFocus = document.activeElement === editorRef.current;
      editorRef.current.innerHTML = buildHTML(text, choices);
      // Restore focus
      if (hadFocus && sel) {
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
  }, [text, choices, buildHTML]);

  // Handle input — sync text back
  const handleInput = useCallback(() => {
    if (!editorRef.current) return;
    const newText = editorRef.current.innerText || "";
    lastTextRef.current = newText;
    onTextChange(newText);
  }, [onTextChange]);

  // Handle click on choice spans
  const handleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (!target.dataset.choice) return;
    e.preventDefault();

    try {
      const alternatives: Alternative[] = JSON.parse(decodeURIComponent(target.dataset.choice));
      const original = target.dataset.original || target.textContent || "";
      const rect = target.getBoundingClientRect();
      setActiveChoice({
        original,
        alternatives,
        spanEl: target,
        pos: { x: rect.left + rect.width / 2, y: rect.bottom },
      });
    } catch {}
  }, []);

  // Handle hover on choice spans
  const handleMouseOver = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.dataset.choice) {
      target.style.borderBottomStyle = "solid";
      target.style.background = `${BLUE}0D`;
    }
  }, []);

  const handleMouseOut = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.dataset.choice) {
      target.style.borderBottomStyle = "dotted";
      target.style.background = target.classList.contains("edited") ? `${BLUE}0A` : "transparent";
    }
  }, []);

  const handlePick = useCallback((newWord: string) => {
    if (!activeChoice) return;
    // Replace the span's text
    activeChoice.spanEl.textContent = newWord;
    activeChoice.spanEl.style.background = `${BLUE}0A`;
    activeChoice.spanEl.classList.add("edited");
    // Remove the data-choice so it's no longer clickable after replacement
    activeChoice.spanEl.removeAttribute("data-choice");
    activeChoice.spanEl.style.borderBottom = `1.5px solid ${BLUE}`;
    activeChoice.spanEl.style.cursor = "default";

    setEditCount(c => c + 1);
    setActiveChoice(null);

    // Sync text
    if (editorRef.current) {
      const newText = editorRef.current.innerText || "";
      lastTextRef.current = newText;
      onTextChange(newText);
    }
  }, [activeChoice, onTextChange]);

  // Handle paste — strip formatting
  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const plain = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, plain);
  }, []);

  return (
    <div className="relative">
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onClick={handleClick}
        onMouseOver={handleMouseOver}
        onMouseOut={handleMouseOut}
        onPaste={handlePaste}
        className="font-sans whitespace-pre-wrap outline-none"
        style={{
          fontSize: 15,
          lineHeight: 1.7,
          color: INK,
          minHeight: 120,
          caretColor: INK,
        }}
      />

      {editCount > 0 && (
        <p className="mt-3 font-mono text-[11px]" style={{ color: DIM }}>
          {editCount} {editCount === 1 ? "word" : "words"} refined
        </p>
      )}

      {activeChoice && (
        <ChoicePopup
          original={activeChoice.original}
          alternatives={activeChoice.alternatives}
          position={activeChoice.pos}
          onPick={handlePick}
          onClose={() => setActiveChoice(null)}
        />
      )}
    </div>
  );
}

function escapeHTML(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function escapeAttr(s: string) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/* ── Stand Out Section ── */
function StandOutSection({ standOut }: { standOut: StandOut }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left py-3 flex items-center justify-between font-mono text-[12px] transition-colors hover:opacity-80"
        style={{ color: DIM, background: "none", border: "none", cursor: "pointer", borderTop: `1px solid ${BORDER}` }}
      >
        <span>How to stand out</span>
        <span style={{ fontSize: 10, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none" }}>▼</span>
      </button>
      {expanded && (
        <div className="pb-2 space-y-4">
          <div>
            <span className="font-mono uppercase block mb-1" style={{ fontSize: 10, letterSpacing: "0.06em", color: "#AAAAAA" }}>What everyone says</span>
            <p className="font-sans text-[14px]" style={{ color: INK, lineHeight: 1.5 }}>{standOut.common_take}</p>
          </div>
          <div className="pl-3" style={{ borderLeft: `2px solid ${BLUE}` }}>
            <span className="font-mono uppercase block mb-1" style={{ fontSize: 10, letterSpacing: "0.06em", color: "#AAAAAA" }}>Your angle</span>
            <p className="font-sans text-[14px]" style={{ color: INK, lineHeight: 1.5 }}>{standOut.unique_angle}</p>
          </div>
          <div>
            <span className="font-mono uppercase block mb-1" style={{ fontSize: 10, letterSpacing: "0.06em", color: "#AAAAAA" }}>One bold move</span>
            <p className="font-sans text-[14px] font-medium" style={{ color: INK, lineHeight: 1.5 }}>{standOut.bold_move}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Channel Insights ── */
const CHANNEL_INSIGHTS: Record<string, { format: string; tip: string; sweet: string }> = {
  linkedin: { format: "Story-driven, line breaks between paragraphs, hook in first line.", tip: "First hour engagement matters most. Comments > reactions. Posts without external links get 3x reach.", sweet: "150-300 words" },
  cold_dm: { format: "Short, personal, specific. Feels like a message to one person, not a broadcast.", tip: "First sentence decides if they read or archive. Lead with relevance, not introduction.", sweet: "Under 100 words" },
  tweet: { format: "Punchy, fragmented lines. One idea per tweet. Thread if longer.", tip: "Replies and quote tweets signal value. Posts with images get 1.5x impressions.", sweet: "Under 280 chars, or 3-5 tweet thread" },
  newsletter: { format: "Personal, letter-like, storytelling arc. Feels like writing to a friend.", tip: "Subject line is everything. 40% of readers decide from subject alone.", sweet: "200-500 words" },
  community_post: { format: "Casual, vulnerable, asks questions. Feels like talking to peers.", tip: "Give before you ask. Share a real insight, then invite responses.", sweet: "100-200 words" },
};

function ChannelInsightTooltip({ channelKey, position }: { channelKey: string; position: { x: number; y: number } }) {
  const insight = CHANNEL_INSIGHTS[channelKey];
  const isCustom = !insight;

  const left = Math.min(Math.max(position.x - 120, 8), typeof window !== "undefined" ? window.innerWidth - 256 : 200);

  return (
    <div className="fixed z-50" style={{ left, top: position.y + 6, width: 240, background: "#FAFAFA", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
      {isCustom ? (
        <p className="font-sans text-[12px]" style={{ color: DIM, lineHeight: 1.5 }}>
          Accent will adapt your draft to match this channel's typical tone and format.
        </p>
      ) : (
        <div className="space-y-2.5">
          <div>
            <span className="font-mono uppercase block mb-0.5" style={{ fontSize: 10, letterSpacing: "0.06em", color: "#AAAAAA" }}>Native format</span>
            <p className="font-sans text-[12px]" style={{ color: INK, lineHeight: 1.4 }}>{insight.format}</p>
          </div>
          <div>
            <span className="font-mono uppercase block mb-0.5" style={{ fontSize: 10, letterSpacing: "0.06em", color: "#AAAAAA" }}>Algorithm</span>
            <p className="font-sans text-[12px]" style={{ color: INK, lineHeight: 1.4 }}>{insight.tip}</p>
          </div>
          <div>
            <span className="font-mono uppercase block mb-0.5" style={{ fontSize: 10, letterSpacing: "0.06em", color: "#AAAAAA" }}>Sweet spot</span>
            <p className="font-sans text-[12px]" style={{ color: INK, lineHeight: 1.4 }}>{insight.sweet}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Spread View ── */
function SpreadView() {
  const [draft, setDraft] = useState("");
  const [selectedChannels, setSelectedChannels] = useState<string[]>(CHANNELS.map(c => c.key));
  const [customChannels, setCustomChannels] = useState<Array<{ key: string; label: string }>>([]);
  const [addingChannel, setAddingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [hoveredInsight, setHoveredInsight] = useState<{ key: string; pos: { x: number; y: number } } | null>(null);
  const [results, setResults] = useState<Record<string, ChannelResult> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeResultTab, setActiveResultTab] = useState("");
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Load custom channels from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("accent-custom-channels");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCustomChannels(parsed);
        setSelectedChannels(prev => [...prev, ...parsed.map((c: { key: string }) => c.key)]);
      } catch {}
    }
  }, []);

  const allChannels = [...CHANNELS, ...customChannels];

  const toggleChannel = (key: string) => {
    setSelectedChannels(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const addCustomChannel = () => {
    const name = newChannelName.trim();
    if (!name) return;
    const key = name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    if (allChannels.some(c => c.key === key)) return;
    const newChannel = { key, label: name };
    const updated = [...customChannels, newChannel];
    setCustomChannels(updated);
    setSelectedChannels(prev => [...prev, key]);
    localStorage.setItem("accent-custom-channels", JSON.stringify(updated));
    setNewChannelName("");
    setAddingChannel(false);
  };

  const removeCustomChannel = (key: string) => {
    const updated = customChannels.filter(c => c.key !== key);
    setCustomChannels(updated);
    setSelectedChannels(prev => prev.filter(k => k !== key));
    localStorage.setItem("accent-custom-channels", JSON.stringify(updated));
  };

  const handleSpread = async () => {
    if (!draft.trim() || selectedChannels.length === 0 || loading) return;
    setLoading(true);
    setError(null);
    setResults(null);

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
        setActiveResultTab(selectedChannels[0]);
      }
    } catch {
      setError("Something went wrong. Try again.");
    }
    setLoading(false);
  };

  const updateChannelText = (channel: string, newText: string) => {
    setResults(prev => {
      if (!prev) return prev;
      return { ...prev, [channel]: { ...prev[channel], text: newText } };
    });
  };

  const getText = (key: string) => results?.[key]?.text || "";

  const handleCopy = async (key: string) => {
    await navigator.clipboard.writeText(getText(key));
    setCopiedTab(key);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const handleCopyAll = async () => {
    const allText = selectedChannels
      .filter(k => results?.[k])
      .map(k => {
        const label = [...CHANNELS, ...customChannels].find(c => c.key === k)?.label || k;
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
        <h2 className="font-serif mb-2" style={{ fontSize: 28, fontWeight: 400, color: INK }}>Spread your writing</h2>
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
          <div className="flex flex-wrap gap-2 items-center">
            {allChannels.map(c => {
              const isCustom = customChannels.some(cc => cc.key === c.key);
              const isSelected = selectedChannels.includes(c.key);
              return (
                <span key={c.key} className="inline-flex items-center gap-0 relative">
                  <button onClick={() => toggleChannel(c.key)} className="px-4 py-2 rounded-full text-[13px] font-mono transition-all" style={{
                    background: isSelected ? BLUE : "transparent",
                    color: isSelected ? "#fff" : DIM,
                    border: isSelected ? "none" : `1px solid ${BORDER}`,
                    cursor: "pointer",
                    paddingRight: isCustom ? 28 : undefined,
                  }}>{c.label}</button>
                  {isCustom && (
                    <button onClick={(e) => { e.stopPropagation(); removeCustomChannel(c.key); }} className="absolute right-2 text-[11px] leading-none" style={{ color: isSelected ? "rgba(255,255,255,0.6)" : "#AAAAAA", background: "none", border: "none", cursor: "pointer" }}>×</button>
                  )}
                  {!isCustom && (
                    <button
                      className="ml-[-4px] text-[11px]"
                      style={{ color: "#AAAAAA", background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}
                      onMouseEnter={(e) => { const rect = (e.target as HTMLElement).getBoundingClientRect(); setHoveredInsight({ key: c.key, pos: { x: rect.left, y: rect.bottom } }); }}
                      onMouseLeave={() => setHoveredInsight(null)}
                    >ⓘ</button>
                  )}
                </span>
              );
            })}
            {addingChannel ? (
              <span className="inline-flex items-center gap-1">
                <input
                  autoFocus
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addCustomChannel(); if (e.key === "Escape") { setAddingChannel(false); setNewChannelName(""); } }}
                  placeholder="Channel name"
                  className="px-3 py-1.5 rounded-full text-[13px] font-mono outline-none"
                  style={{ border: `1px solid ${BLUE}`, width: 140, color: INK }}
                />
                <button onClick={addCustomChannel} className="text-[14px]" style={{ color: BLUE, background: "none", border: "none", cursor: "pointer" }}>✓</button>
                <button onClick={() => { setAddingChannel(false); setNewChannelName(""); }} className="text-[14px]" style={{ color: "#AAAAAA", background: "none", border: "none", cursor: "pointer" }}>×</button>
              </span>
            ) : (
              <button onClick={() => setAddingChannel(true)} className="px-4 py-2 rounded-full text-[13px] font-mono" style={{ border: `1px dashed ${BORDER}`, background: "transparent", color: "#AAAAAA", cursor: "pointer" }}>
                + Add channel
              </button>
            )}
          </div>
          {hoveredInsight && <ChannelInsightTooltip channelKey={hoveredInsight.key} position={hoveredInsight.pos} />}
        </div>
        {error && <p className="font-sans text-[14px] mb-4" style={{ color: "#DC2626" }}>{error}</p>}
        <button onClick={handleSpread} disabled={!draft.trim() || selectedChannels.length === 0}
          className="w-full py-3.5 rounded-full font-sans font-semibold text-[15px] transition-opacity hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}>
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

  // Step 3: Results with interactive choice points
  const resultChannels = selectedChannels.filter(k => results?.[k]);

  return (
    <div className="max-w-[720px] mx-auto px-5 py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif" style={{ fontSize: 22, fontWeight: 400, color: INK }}>Your content</h2>
        <div className="flex gap-2">
          <button onClick={handleCopyAll} className="px-4 py-2 rounded-full text-[12px] font-mono" style={{ border: `1px solid ${BORDER}`, background: "transparent", cursor: "pointer", color: DIM }}>
            {copiedAll ? "Copied all \u2713" : "Copy all"}
          </button>
          <button onClick={() => { setResults(null); }} className="px-4 py-2 rounded-full text-[12px] font-mono" style={{ border: `1px solid ${BORDER}`, background: "transparent", cursor: "pointer", color: DIM }}>
            New draft
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-4 overflow-x-auto pb-1">
        {resultChannels.map(key => {
          const label = allChannels.find(c => c.key === key)?.label || key;
          return (
            <button key={key} onClick={() => setActiveResultTab(key)} className="px-4 py-2 rounded-full text-[13px] font-mono shrink-0 transition-all" style={{
              background: activeResultTab === key ? BLUE : "transparent",
              color: activeResultTab === key ? "#fff" : DIM,
              border: activeResultTab === key ? "none" : `1px solid ${BORDER}`,
              cursor: "pointer",
            }}>{label}</button>
          );
        })}
      </div>

      {activeResultTab && results?.[activeResultTab] && (
        <div className="p-5" style={{ background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 10 }}>
          <div className="mb-3">
            <span className="font-mono text-[10px] uppercase" style={{ color: DIM, letterSpacing: "0.06em" }}>
              Edit freely. Click underlined words for alternatives.
            </span>
          </div>

          <InteractiveText
            text={results[activeResultTab].text}
            choices={results[activeResultTab].choices}
            onTextChange={(newText) => updateChannelText(activeResultTab, newText)}
          />

          <div className="flex items-center justify-end mt-4 pt-4" style={{ borderTop: `1px solid ${BORDER}` }}>
            <button onClick={() => handleCopy(activeResultTab)} className="px-5 py-2 rounded-full text-[13px] font-mono transition-opacity hover:opacity-90" style={{ background: INK, color: "#fff", border: "none", cursor: "pointer" }}>
              {copiedTab === activeResultTab ? "Copied \u2713" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {/* Stand Out analysis */}
      {activeResultTab && results?.[activeResultTab]?.stand_out && (
        <StandOutSection standOut={results[activeResultTab].stand_out!} />
      )}
    </div>
  );
}

/* ── Main Page ── */
export default function WritePage() {
  const [mode, setMode] = useState<"spread" | "polish">("spread");

  return (
    <div className="min-h-screen" style={{ background: "#fff" }}>
      <nav style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[960px] mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/" className="no-underline font-serif" style={{ fontSize: 20, fontWeight: 600, color: INK }}>accent</Link>
          <div className="flex items-center gap-1 p-0.5 rounded-full" style={{ background: "#F5F5F5" }}>
            <button onClick={() => setMode("spread")} className="px-4 py-1.5 rounded-full text-[13px] font-mono transition-all" style={{
              background: mode === "spread" ? "#fff" : "transparent", color: mode === "spread" ? INK : DIM,
              border: "none", cursor: "pointer", boxShadow: mode === "spread" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}>Spread</button>
            <button onClick={() => setMode("polish")} className="px-4 py-1.5 rounded-full text-[13px] font-mono transition-all" style={{
              background: mode === "polish" ? "#fff" : "transparent", color: mode === "polish" ? INK : DIM,
              border: "none", cursor: "pointer", boxShadow: mode === "polish" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}>Polish</button>
          </div>
        </div>
      </nav>

      {mode === "spread" ? (
        <SpreadView />
      ) : (
        <div className="max-w-[640px] mx-auto px-5 py-8">
          <AppShell />
        </div>
      )}
    </div>
  );
}
