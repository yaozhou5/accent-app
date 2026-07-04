"use client";

import { useState } from "react";
import { upsertProfile } from "@/lib/supabase/profiles";
import { createLogEntry } from "@/lib/supabase/log-entries";
import { ArrowRight } from "@/components/ArrowIcon";
import posthog from "posthog-js";

const INK = "#111827";
const DIM = "#6b7280";
const BLUE = "#3B82F6";
const BORDER = "#e5e7eb";
const FAINT = "#9ca3af";

export default function Onboard() {
  const [step, setStep] = useState(1);
  const [q1, setQ1] = useState("");
  const [q2, setQ2] = useState("");
  const [q3, setQ3] = useState("");
  const [q4, setQ4] = useState("");
  const [loading, setLoading] = useState(false);
  const [seededEntryId, setSeededEntryId] = useState<string | null>(null);
  const [result, setResult] = useState<{
    direction: string;
    inferred_profile: { account_type: string; goal: string; confidence: string };
  } | null>(null);

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
      return;
    }
    // Step 4 → submit
    handleSubmit();
  };

  const handleSubmit = async () => {
    setStep(5); // show generating state
    setLoading(true);

    // Seed the Log FIRST so it's never empty, even if the AI call fails
    const seededEntry = await createLogEntry(q2.trim(), { type: "note", source: "onboarding" }).catch(() => null);
    if (seededEntry) setSeededEntryId(seededEntry.id);

    // Save interview answers immediately (profile fields that don't need AI)
    await upsertProfile({
      business_description: q1.trim(),
      interview_q1: q1.trim(),
      interview_q2: q2.trim(),
      interview_q3: q3.trim(),
      interview_q4: q4.trim() || null,
      why_you_post: q3.trim(),
    }).catch(() => {});

    try {
      const res = await fetch("/api/infer-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q1: q1.trim(), q2: q2.trim(), q3: q3.trim(), q4: q4.trim() }),
      });
      const data = await res.json();
      console.log("infer-profile response:", data);

      if (data.direction && data.inferred_profile) {
        setResult(data);
        // Save inferred profile fields
        await upsertProfile({
          account_type: data.inferred_profile?.account_type || null,
          inferred_goal: data.inferred_profile?.goal || null,
          account_type_confidence: data.inferred_profile?.confidence || null,
        }).catch(() => {});
      } else {
        // AI returned something unexpected — use fallback
        setResult({
          direction: "Tell me a bit more in your first log and I'll help you find the angle.",
          inferred_profile: { account_type: "unsure", goal: "", confidence: "low" },
        });
      }
    } catch (err) {
      console.error("infer-profile error:", err);
      setResult({
        direction: "Tell me a bit more in your first log and I'll help you find the angle.",
        inferred_profile: { account_type: "unsure", goal: "", confidence: "low" },
      });
    }
    setLoading(false);
  };

  const handleStart = async () => {
    // Go to voice exercise step
    posthog.capture("onboarding_completed", { account_type: result?.inferred_profile?.account_type || "unknown" });
    window.location.href = "/onboard/2";
  };

  const canAdvance = () => {
    if (step === 1) return q1.trim().length > 0;
    if (step === 2) return q2.trim().length > 0;
    if (step === 3) return q3.trim().length > 0;
    if (step === 4) return true; // Q4 is skippable
    return false;
  };

  // Generating / payoff screen
  if (step === 5) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#fff" }}>
        <div className="max-w-[480px] w-full py-16">
          {loading || !result ? (
            <div className="text-center">
              <div
                className="inline-block w-6 h-6 rounded-full border-2 mb-4 animate-spin"
                style={{ borderColor: `${BORDER} ${BLUE} ${BLUE}` }}
              />
              <p className="font-sans" style={{ fontSize: 16, color: DIM }}>
                Reading what you told me...
              </p>
            </div>
          ) : (
            <>
              <h1 className="font-serif mb-8" style={{ fontSize: 24, fontWeight: 600, color: INK }}>
                Here's where the post is.
              </h1>

              <div className="p-4 rounded-[12px] mb-4" style={{ background: "#fafafa", border: `1px solid ${BORDER}` }}>
                <span
                  className="font-mono uppercase block mb-2"
                  style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}
                >
                  Your moment
                </span>
                <p className="font-sans" style={{ fontSize: 15, color: INK, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                  {q2}
                </p>
              </div>

              <div
                className="p-4 rounded-[12px] mb-8"
                style={{ background: `${BLUE}06`, border: `1px solid ${BLUE}15` }}
              >
                <span
                  className="font-mono uppercase block mb-2"
                  style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}
                >
                  What's missing
                </span>
                <p className="font-sans" style={{ fontSize: 15, color: INK, lineHeight: 1.6 }}>
                  {result.direction}
                </p>
              </div>

              <button
                onClick={handleStart}
                className="w-full py-3.5 rounded-full font-sans font-semibold text-[15px]"
                style={{ background: BLUE, color: "#fff", border: "none", cursor: "pointer" }}
              >
                Develop this <ArrowRight size={14} color="#fff" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  const questions = [
    {
      q: "What are you building or working on, and who's it for?",
      sub: null,
      placeholder: "e.g. A content tool for solo founders who struggle to post consistently",
      value: q1,
      setValue: setQ1,
    },
    {
      q: "What's something that happened with it recently worth sharing?",
      sub: "A win, a setback, a conversation, a decision — anything real.",
      placeholder: "e.g. Had a user interview yesterday and realized we were solving the wrong problem",
      value: q2,
      setValue: setQ2,
    },
    {
      q: "What do you want this account to do for you?",
      sub: "Grow an audience, get users, build your reputation, support the product — whatever's true.",
      placeholder: "e.g. Get early users by sharing what I'm learning as I build",
      value: q3,
      setValue: setQ3,
    },
    {
      q: "What's something you believe about your space that not everyone agrees with?",
      sub: "Optional — skip if nothing comes to mind.",
      placeholder: "e.g. Most founders don't need a content strategy, they need to stop overthinking and just post",
      value: q4,
      setValue: setQ4,
    },
  ];

  const current = questions[step - 1];

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "#fff" }}>
      <div className="max-w-[480px] w-full py-16">
        {/* Progress bar */}
        <div className="flex gap-2 mb-10">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className="flex-1 h-[3px] rounded-full"
              style={{ background: s <= step ? INK : BORDER, transition: "background-color 0.2s ease" }}
            />
          ))}
        </div>

        <span className="font-mono text-[11px] uppercase block mb-2" style={{ color: DIM, letterSpacing: "0.1em" }}>
          {step} of 4
        </span>
        <h1 className="font-serif mb-2" style={{ fontSize: 22, fontWeight: 600, color: INK, lineHeight: 1.4 }}>
          {current.q}
        </h1>
        {current.sub && (
          <p className="font-sans mb-6" style={{ fontSize: 14, color: FAINT, lineHeight: 1.5 }}>
            {current.sub}
          </p>
        )}
        {!current.sub && <div className="mb-6" />}

        <textarea
          value={current.value}
          onChange={(e) => current.setValue(e.target.value)}
          placeholder={current.placeholder}
          rows={4}
          className="w-full outline-none resize-y font-sans mb-6"
          style={{
            fontSize: 16,
            color: INK,
            lineHeight: 1.7,
            padding: "12px 16px",
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
          }}
          autoFocus
        />

        <div className="flex gap-3">
          <button
            onClick={handleNext}
            disabled={!canAdvance()}
            className="flex-1 py-3.5 rounded-full font-sans font-semibold text-[15px] disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: BLUE,
              color: "#fff",
              border: "none",
              cursor: "pointer",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {step === 4 ? (q4.trim() ? "Finish" : "Skip & finish") : "Next"}
          </button>
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="px-6 py-3 rounded-full font-sans text-[14px]"
              style={{
                border: `1px solid ${BORDER}`,
                color: DIM,
                background: "#fff",
                cursor: "pointer",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
