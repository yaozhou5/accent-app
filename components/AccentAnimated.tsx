"use client";

import { useState, useEffect, useRef } from "react";

const B = "#2563EB";
const N = "#111";
const N3 = "#999";
const N5 = "#f5f5f5";
const W = "#fff";
const G = "#10b981";
const LI = "#0A66C2";
const O = "#f59e0b";

type ChatStep =
  | { type: "msg"; from: "user"; text: string; wait: number; kind?: undefined; items?: undefined; src?: undefined; caption?: undefined; step?: undefined }
  | { type: "msg"; from: "user"; kind: "image"; src: string; caption: string; wait: number; text?: undefined; items?: undefined; step?: undefined }
  | { type: "msg"; from: "accent"; text: string; wait: number; kind?: undefined; items?: undefined; src?: undefined; caption?: undefined; step?: undefined }
  | { type: "msg"; from: "plan"; wait: number; items: Array<{ ch: string; cc: string; title: string; when: string; detail: string }>; text?: undefined; kind?: undefined; src?: undefined; caption?: undefined; step?: undefined }
  | { type: "typing"; wait: number; from?: undefined; text?: undefined; kind?: undefined; items?: undefined; src?: undefined; caption?: undefined; step?: undefined }
  | { type: "switch_tab"; wait: number; from?: undefined; text?: undefined; kind?: undefined; items?: undefined; src?: undefined; caption?: undefined; step?: undefined }
  | { type: "ws"; step: number; wait: number; from?: undefined; text?: undefined; kind?: undefined; items?: undefined; src?: undefined; caption?: undefined }
  | { type: "reset"; wait: number; from?: undefined; text?: undefined; kind?: undefined; items?: undefined; src?: undefined; caption?: undefined; step?: undefined };

const CHAT_STEPS: ChatStep[] = [
  { type: "msg", from: "user", text: "vendor ghosted me after 2 great calls. then randomly got my first organic sale from a DM. also 8 people showed up to community call which is a record", wait: 1500 },
  { type: "msg", from: "user", kind: "image", src: "📱", caption: "dm-screenshot.png", wait: 900 },
  { type: "msg", from: "user", kind: "image", src: "📸", caption: "community-call.png", wait: 700 },
  { type: "typing", wait: 1400 },
  { type: "msg", from: "accent", text: "3 stories, all saved. Here's your week:", wait: 1000 },
  { type: "typing", wait: 1800 },
  { type: "msg", from: "plan", wait: 1200, items: [
    { ch: "LinkedIn", cc: LI, title: "Ghosted + first sale, same day", when: "Tue", detail: "Use the DM screenshot. Open with rejection, end with the surprise." },
    { ch: "Community", cc: G, title: "8 people showed up", when: "Wed", detail: "Post the call photo. Ask what keeps them coming back." },
    { ch: "Newsletter", cc: O, title: "The worst and best day", when: "Fri", detail: "Combine both into a reflection. Your subscribers want the real story." },
  ]},
  { type: "msg", from: "accent", text: "Materials saved. Tap when you're ready to write ✍️", wait: 2000 },
  { type: "switch_tab", wait: 500 },
  { type: "ws", step: 1, wait: 500 },
  { type: "ws", step: 2, wait: 500 },
  { type: "ws", step: 3, wait: 500 },
  { type: "ws", step: 4, wait: 4000 },
  { type: "reset", wait: 0 },
];

export default function AccentAnimated() {
  const [messages, setMessages] = useState<ChatStep[]>([]);
  const [showTyping, setShowTyping] = useState(false);
  const [tab, setTab] = useState("chat");
  const [wsStep, setWsStep] = useState(0);
  const [runId, setRunId] = useState(0);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, showTyping]);

  useEffect(() => {
    const timeouts: NodeJS.Timeout[] = [];
    let t = 800;

    CHAT_STEPS.forEach((step) => {
      const at = t;
      if (step.type === "typing") {
        timeouts.push(setTimeout(() => setShowTyping(true), at));
        t += step.wait;
        timeouts.push(setTimeout(() => setShowTyping(false), t));
      } else if (step.type === "msg") {
        timeouts.push(setTimeout(() => {
          setShowTyping(false);
          setMessages(prev => [...prev, step]);
        }, at));
        t += step.wait;
      } else if (step.type === "switch_tab") {
        timeouts.push(setTimeout(() => setTab("workspace"), at));
        t += step.wait;
      } else if (step.type === "ws") {
        timeouts.push(setTimeout(() => setWsStep(step.step), at));
        t += step.wait;
      } else if (step.type === "reset") {
        timeouts.push(setTimeout(() => {
          setMessages([]);
          setShowTyping(false);
          setTab("chat");
          setWsStep(0);
          setRunId(r => r + 1);
        }, at));
      }
    });

    return () => timeouts.forEach(clearTimeout);
  }, [runId]);

  const hasPlan = messages.some(m => m.from === "plan");

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "20px", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <style>{`
        @keyframes pop { from { opacity:0; transform:scale(0.92) translateY(8px) } to { opacity:1; transform:scale(1) translateY(0) } }
        @keyframes fu { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:translateY(0) } }
        @keyframes si { from { opacity:0; transform:translateX(-8px) } to { opacity:1; transform:translateX(0) } }
        @keyframes d1 { 0%,80%,100% { opacity:0.2 } 40% { opacity:1 } }
        @keyframes d2 { 0%,80%,100% { opacity:0.2 } 50% { opacity:1 } }
        @keyframes d3 { 0%,80%,100% { opacity:0.2 } 60% { opacity:1 } }
      `}</style>

      <div style={{ width: 350, height: 680, borderRadius: 44, background: "#1a1a1a", padding: 9, boxShadow: "0 50px 120px rgba(0,0,0,0.2), 0 2px 10px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(255,255,255,0.05)" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 36, background: N5, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {/* Island */}
          <div style={{ height: 50, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 6, flexShrink: 0 }}>
            <div style={{ width: 105, height: 30, borderRadius: 15, background: "#1a1a1a" }} />
          </div>

          {/* Header */}
          <div style={{ padding: "10px 18px 0", background: W, display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: `linear-gradient(140deg, ${B}, #6d28d9)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: W, fontSize: 14, fontWeight: 800 }}>a.</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: N, letterSpacing: "-0.02em" }}>accent</div>
              <div style={{ fontSize: 11, color: G, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: G, display: "inline-block" }} />Content coach
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", padding: "10px 18px 0", background: W, borderBottom: "1px solid rgba(0,0,0,0.05)", flexShrink: 0 }}>
            {[{ id: "chat", label: "Chat", icon: "💬" }, { id: "workspace", label: "Workspace", icon: "📂" }].map(ti => (
              <div key={ti.id} style={{ flex: 1, padding: "10px 0 12px", cursor: "default", fontSize: 12, fontWeight: tab === ti.id ? 600 : 400, color: tab === ti.id ? N : N3, borderBottom: tab === ti.id ? `2px solid ${B}` : "2px solid transparent", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                <span style={{ fontSize: 12 }}>{ti.icon}</span>{ti.label}
                {ti.id === "workspace" && hasPlan && tab === "chat" && (
                  <span style={{ fontSize: 8, fontWeight: 700, background: B, color: W, padding: "1px 5px", borderRadius: 8, animation: "pop 0.3s ease" }}>3</span>
                )}
              </div>
            ))}
          </div>

          {/* CHAT */}
          {tab === "chat" && (
            <div ref={chatRef} style={{ flex: 1, overflow: "auto", padding: "14px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ textAlign: "center", fontSize: 10, color: N3, padding: "6px 0 4px", fontFamily: "JetBrains Mono, monospace" }}>Thursday, 9:14 PM</div>
              {messages.map((msg, idx) => {
                if (msg.from === "plan" && msg.items) {
                  return (
                    <div key={idx} style={{ alignSelf: "flex-start", maxWidth: "90%", animation: "pop 0.35s ease" }}>
                      <div style={{ background: W, borderRadius: 18, borderTopLeftRadius: 5, padding: 14, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
                        <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: B, marginBottom: 10, fontFamily: "JetBrains Mono, monospace" }}>📋 This week</div>
                        {msg.items.map((item, j) => (
                          <div key={j} style={{ padding: "10px 11px", background: N5, borderRadius: 10, marginBottom: j < msg.items!.length - 1 ? 6 : 0, borderLeft: `3px solid ${item.cc}`, animation: `si 0.3s ease ${j * 0.12}s both` }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: N, marginBottom: 2 }}>{item.title}</div>
                            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 3 }}>
                              <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 6, background: `${item.cc}12`, color: item.cc }}>{item.ch}</span>
                              <span style={{ fontSize: 9, color: N3 }}>{item.when}</span>
                            </div>
                            <p style={{ fontSize: 10, color: N3, lineHeight: 1.4, margin: 0, fontStyle: "italic" }}>{item.detail}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }
                if (msg.kind === "image") {
                  return (
                    <div key={idx} style={{ alignSelf: "flex-end", maxWidth: "42%", animation: "pop 0.3s ease" }}>
                      <div style={{ background: N, borderRadius: 18, borderTopRightRadius: 5, padding: 6 }}>
                        <div style={{ background: "linear-gradient(135deg, #2a2a2a, #3a3a3a)", borderRadius: 12, height: 52, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 4 }}>
                          <span style={{ fontSize: 20 }}>{msg.src}</span>
                        </div>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", padding: "0 4px 1px", display: "flex", alignItems: "center", gap: 3 }}>📎 {msg.caption}</div>
                      </div>
                    </div>
                  );
                }
                const isUser = msg.from === "user";
                return (
                  <div key={idx} style={{ alignSelf: isUser ? "flex-end" : "flex-start", maxWidth: "82%", animation: "pop 0.3s ease" }}>
                    <div style={{ padding: "10px 14px", background: isUser ? N : W, color: isUser ? W : N, borderRadius: 18, borderTopRightRadius: isUser ? 5 : 18, borderTopLeftRadius: isUser ? 18 : 5, fontSize: 13, lineHeight: 1.5, boxShadow: isUser ? "none" : "0 1px 3px rgba(0,0,0,0.04)" }}>{msg.text}</div>
                  </div>
                );
              })}
              {showTyping && (
                <div style={{ alignSelf: "flex-start", animation: "pop 0.2s ease" }}>
                  <div style={{ padding: "12px 18px", background: W, borderRadius: 18, borderTopLeftRadius: 5, display: "flex", gap: 5, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
                    {[0,1,2].map(d => <div key={d} style={{ width: 7, height: 7, borderRadius: "50%", background: N3, animation: `d${d+1} 1.2s ease infinite` }} />)}
                  </div>
                </div>
              )}
              <div style={{ height: 8 }} />
            </div>
          )}

          {/* WORKSPACE */}
          {tab === "workspace" && (
            <div style={{ flex: 1, overflow: "auto", padding: "16px 14px", background: N5 }}>
              {wsStep >= 1 && (
                <div style={{ animation: "fu 0.4s ease" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: N }}>This week</div>
                      <div style={{ fontSize: 11, color: N3 }}>3 posts · 2 photos saved</div>
                    </div>
                  </div>
                  <div style={{ background: W, borderRadius: 14, padding: 14, marginBottom: 10, border: `2px solid ${LI}`, boxShadow: "0 2px 8px rgba(10,102,194,0.06)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${LI}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: LI }}>in</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: N }}>Ghosted + first sale</div>
                          <div style={{ fontSize: 10, color: N3 }}>Tuesday</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: `${O}12`, color: O }}>Ready</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                      {["📱 DM", "📝 Notes", "💡 Nudge"].map((m, i) => (
                        <div key={i} style={{ flex: 1, padding: "8px 4px", background: N5, borderRadius: 8, fontSize: 9, color: N3, textAlign: "center" }}>{m}</div>
                      ))}
                    </div>
                    <div style={{ width: "100%", padding: 10, background: N, color: W, borderRadius: 8, fontSize: 12, fontWeight: 600, textAlign: "center" }}>Start writing →</div>
                  </div>
                </div>
              )}
              {wsStep >= 2 && (
                <div style={{ background: W, borderRadius: 14, padding: 14, marginBottom: 10, border: "1px solid rgba(0,0,0,0.04)", animation: "fu 0.35s ease" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${G}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>👥</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: N }}>8 people showed up</div>
                        <div style={{ fontSize: 10, color: N3 }}>Community · Wed</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: `${G}12`, color: G }}>✓ Posted</div>
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 8, fontSize: 10, color: N3 }}><span>📸 photo</span><span>💬 12 replies</span></div>
                </div>
              )}
              {wsStep >= 3 && (
                <div style={{ background: W, borderRadius: 14, padding: 14, marginBottom: 10, border: "1px solid rgba(0,0,0,0.04)", animation: "fu 0.35s ease" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${O}12`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>📧</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: N }}>The worst and best day</div>
                        <div style={{ fontSize: 10, color: N3 }}>Newsletter · Fri</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 9, fontWeight: 600, padding: "3px 8px", borderRadius: 6, background: N5, color: N3 }}>Fri</div>
                  </div>
                </div>
              )}
              {wsStep >= 4 && (
                <div style={{ marginTop: 12, padding: 12, background: W, borderRadius: 12, border: `1px dashed ${N3}40`, textAlign: "center", animation: "fu 0.35s ease" }}>
                  <div style={{ fontSize: 11, color: N3 }}>Last week</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: N }}>3 posts · 4.2K total reach</div>
                </div>
              )}
            </div>
          )}

          {/* Input */}
          {tab === "chat" && (
            <div style={{ padding: "8px 12px 28px", background: W, borderTop: "1px solid rgba(0,0,0,0.05)", display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: N5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>📷</div>
              <div style={{ flex: 1, padding: "9px 14px", background: N5, borderRadius: 20, fontSize: 13, color: N3 }}>What happened today...</div>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: B, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ color: W, fontSize: 13, fontWeight: 700 }}>↑</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
