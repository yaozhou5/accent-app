"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getProfile, type UserProfile } from "@/lib/supabase/profiles";
import { createWeeklyDump, getCurrentWeekDump, type WeeklyDump } from "@/lib/supabase/planner";
import { savePlan, getCurrentPlan, type ContentPlan, type ContentPlanData } from "@/lib/supabase/planner";

const INK = "#1A1A18";
const DIM = "#6B6B6B";
const FAINT = "#AAAAAA";
const BLUE = "#2563EB";
const BORDER = "#E5E5E5";

const PLATFORM_ICONS: Record<string, string> = {
  instagram: "IG", linkedin: "in", x: "X", threads: "TH", tiktok: "TT",
};

const POST_TYPE_COLORS: Record<string, string> = {
  "origin story": "#8b5cf6", "launch moment": "#ef4444", "founder decision": "#f59e0b",
  "behind the scenes": "#0d9488", "user proof": "#22c55e", "industry take": "#3b82f6",
  "vulnerability": "#ec4899", "lesson learned": "#6366f1",
};

function getWeekLabel(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  if (day >= 4 || day === 0) monday.setDate(monday.getDate() + 7);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(monday)}-${fmt(friday)}`;
}

const NUDGE_CHIPS = ["launches?", "meetings?", "decisions?", "wins?", "frustrations?"];

/* ── Weekly Dump View ── */
function DumpView({ profile, onPlanGenerated }: { profile: UserProfile; onPlanGenerated: (plan: ContentPlan) => void }) {
  const [dump, setDump] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!dump.trim() || generating) return;
    setGenerating(true);
    setError(null);

    try {
      const savedDump = await createWeeklyDump(dump.trim());
      if (!savedDump) { setError("Failed to save your dump."); setGenerating(false); return; }

      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dump: dump.trim(), profile }),
      });

      if (!res.ok) { setError("Failed to generate plan. Try again."); setGenerating(false); return; }

      const planData: ContentPlanData = await res.json();
      const saved = await savePlan(savedDump.id, planData);
      if (!saved) { setError("Plan generated but failed to save."); setGenerating(false); return; }

      onPlanGenerated(saved);
    } catch {
      setError("Something went wrong. Check console.");
    }
    setGenerating(false);
  };

  return (
    <div>
      <h1 className="font-serif mb-2" style={{ fontSize: 28, fontWeight: 400, color: INK }}>What's happening this week?</h1>
      <p className="font-sans mb-6" style={{ fontSize: 15, color: DIM, lineHeight: 1.6 }}>
        Dump everything. Launches, meetings, decisions, frustrations, wins. Messy is fine.
      </p>

      <textarea
        value={dump}
        onChange={e => setDump(e.target.value)}
        placeholder="This week we're launching the beta, had a call with a potential investor, onboarding is still broken, and I hired my first intern..."
        rows={8}
        className="w-full outline-none resize-y font-sans mb-3"
        style={{ fontSize: 16, color: INK, lineHeight: 1.7, padding: "16px 20px", border: `1px solid ${BORDER}`, borderRadius: 12, background: "#fff", minHeight: 180 }}
      />

      <div className="flex flex-wrap gap-2 mb-6">
        {NUDGE_CHIPS.map(chip => (
          <span key={chip} className="font-mono text-[11px] px-3 py-1 rounded-full" style={{ background: "#f5f5f5", color: FAINT }}>
            {chip}
          </span>
        ))}
      </div>

      {error && <p className="font-sans text-[13px] mb-3" style={{ color: "#DC2626" }}>{error}</p>}

      <button
        onClick={handleGenerate}
        disabled={!dump.trim() || generating}
        className="w-full py-3.5 rounded-full font-sans font-semibold text-[15px] transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
        style={{ background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}
      >
        {generating ? "Generating your plan..." : "Generate my plan"}
      </button>

      {generating && (
        <div className="mt-6 space-y-3 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-[12px] p-5" style={{ background: "#fafafa", border: `1px solid ${BORDER}` }}>
              <div className="h-3 rounded w-16 mb-3" style={{ background: "#e5e5e5" }} />
              <div className="h-5 rounded w-3/4 mb-2" style={{ background: "#e5e5e5" }} />
              <div className="h-12 rounded" style={{ background: "#f0f0f0" }} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Plan View ── */
function PlanView({ plan, profile }: { plan: ContentPlan; profile: UserProfile }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const raw = plan.plan;
  const planData: ContentPlanData = typeof raw === "string" ? JSON.parse(raw) : raw;
  const primaryGoal = (profile.goals || [])[0]?.replace("_", " ") || "content";

  return (
    <div>
      <div className="flex items-center gap-3 mb-1">
        <h1 className="font-serif" style={{ fontSize: 28, fontWeight: 400, color: INK }}>Your week</h1>
        <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full" style={{ background: `${BLUE}10`, color: BLUE, border: `1px solid ${BLUE}20` }}>
          {primaryGoal}
        </span>
      </div>
      <p className="font-sans mb-6" style={{ fontSize: 14, color: DIM }}>
        {getWeekLabel()} · {planData.posts.length} post{planData.posts.length !== 1 ? "s" : ""} planned
      </p>

      {planData.strategy_note && (
        <div className="mb-6 p-4 rounded-[10px]" style={{ background: "#fafafa", border: `1px solid ${BORDER}` }}>
          <p className="font-sans text-[14px]" style={{ color: INK, lineHeight: 1.6 }}>{planData.strategy_note}</p>
        </div>
      )}

      <div className="space-y-3">
        {planData.posts.map((post, i) => {
          const isExpanded = expanded === i;
          const typeColor = POST_TYPE_COLORS[post.post_type] || BLUE;
          const dateObj = new Date(post.date + "T12:00:00");
          const dayNum = dateObj.getDate();
          const dayName = post.day.slice(0, 3);

          return (
            <div
              key={i}
              onClick={() => setExpanded(isExpanded ? null : i)}
              className="rounded-[12px] transition-all cursor-pointer"
              style={{
                border: `1px solid ${isExpanded ? BLUE : BORDER}`,
                background: isExpanded ? `${BLUE}04` : "#fff",
              }}
            >
              <div className="flex gap-4 p-5">
                {/* Date column */}
                <div className="shrink-0 text-center" style={{ width: 44 }}>
                  <span className="font-mono uppercase block" style={{ fontSize: 10, color: DIM }}>{dayName}</span>
                  <span className="font-serif block" style={{ fontSize: 22, fontWeight: 600, color: INK }}>{dayNum}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: "#f0f0f0", color: DIM }}>
                      {PLATFORM_ICONS[post.platform] || post.platform}
                    </span>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded" style={{ background: `${typeColor}12`, color: typeColor }}>
                      {post.post_type}
                    </span>
                  </div>
                  <p className="font-sans font-medium" style={{ fontSize: 15, color: INK, lineHeight: 1.45 }}>
                    {post.hook}
                  </p>
                  {!isExpanded && (
                    <p className="font-sans mt-1.5" style={{ fontSize: 13, color: DIM, lineHeight: 1.55, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {post.reasoning}
                    </p>
                  )}
                </div>

                <span className="shrink-0 mt-1" style={{ color: FAINT, fontSize: 12, transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "none" }}>▼</span>
              </div>

              {isExpanded && (
                <div className="px-5 pb-5 pt-0 ml-16 space-y-4" style={{ borderTop: `1px solid ${BORDER}` }}>
                  <div className="pt-4">
                    <span className="font-mono uppercase block mb-1" style={{ fontSize: 10, color: FAINT, letterSpacing: "0.06em" }}>Why this post</span>
                    <p className="font-sans text-[14px]" style={{ color: INK, lineHeight: 1.6 }}>{post.reasoning}</p>
                  </div>
                  <div>
                    <span className="font-mono uppercase block mb-1" style={{ fontSize: 10, color: FAINT, letterSpacing: "0.06em" }}>Goal alignment</span>
                    <p className="font-sans text-[14px]" style={{ color: INK, lineHeight: 1.55 }}>{post.goal_alignment}</p>
                  </div>
                  <button disabled className="px-5 py-2 rounded-full font-sans text-[13px] opacity-40 cursor-default" style={{ border: `1px solid ${BORDER}`, background: "transparent", color: DIM }}>
                    Help me write this · coming soon
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={() => window.location.reload()}
        className="mt-6 w-full py-3 rounded-full font-sans text-[14px]"
        style={{ border: `1px solid ${BORDER}`, color: DIM, background: "transparent", cursor: "pointer" }}
      >
        New dump for this week
      </button>
    </div>
  );
}

/* ── Dashboard Page ── */
export default function DashboardPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [plan, setPlan] = useState<ContentPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [p, currentPlan] = await Promise.all([getProfile(), getCurrentPlan()]);
      setProfile(p);
      setPlan(currentPlan);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: "#fff" }}>
        <header style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="max-w-[640px] mx-auto px-5 py-4 flex items-center justify-between">
            <span className="font-serif" style={{ fontSize: 20, fontWeight: 600, color: INK }}>accent</span>
          </div>
        </header>
        <div className="max-w-[640px] mx-auto px-5 py-8 animate-pulse">
          <div className="h-7 rounded w-48 mb-4" style={{ background: "#f0f0f0" }} />
          <div className="h-4 rounded w-64 mb-8" style={{ background: "#f5f5f5" }} />
          <div className="h-44 rounded-[12px]" style={{ background: "#fafafa" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#fff" }}>
      <header style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="max-w-[640px] mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/" className="no-underline font-serif" style={{ fontSize: 20, fontWeight: 600, color: INK }}>accent</Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard/write" className="no-underline font-mono text-[12px]" style={{ color: DIM }}>Writing coach</Link>
            <Link href="/settings" className="no-underline font-mono text-[12px]" style={{ color: DIM }}>Settings</Link>
          </div>
        </div>
      </header>

      <div className="max-w-[640px] mx-auto px-5 py-8">
        {plan ? (
          <PlanView plan={plan} profile={profile!} />
        ) : (
          <DumpView profile={profile!} onPlanGenerated={setPlan} />
        )}
      </div>
    </div>
  );
}
