"use client";

import { useState } from "react";
import posthog from "posthog-js";
import Link from "next/link";

const ORIGINAL =
  "The rise of AI tools has fundamentally transformed how we approach creative work. What was once a purely human endeavor has become a collaborative process between humans and machines. As we navigate this new landscape, it's crucial that we find the right balance between leveraging these powerful tools and maintaining our authentic creative voice.";

const HIGHLIGHTS = [
  "fundamentally transformed",
  "navigate this new landscape",
  "leveraging these powerful tools and maintaining our authentic creative voice.",
];

const REVISED =
  "People are shipping apps they can't explain. They paste code from ChatGPT, it runs, and they push it live without understanding what it does. That should worry us more than it does. The tool works. The person using it didn't learn anything.";

function HighlightedOriginal() {
  // Highlight phrases in the original text with soft red underline
  const parts: Array<{ text: string; highlight: boolean }> = [];
  let cursor = 0;
  while (cursor < ORIGINAL.length) {
    let nextIdx = -1;
    let nextPhrase = "";
    for (const h of HIGHLIGHTS) {
      const idx = ORIGINAL.indexOf(h, cursor);
      if (idx !== -1 && (nextIdx === -1 || idx < nextIdx)) {
        nextIdx = idx;
        nextPhrase = h;
      }
    }
    if (nextIdx === -1) {
      parts.push({ text: ORIGINAL.slice(cursor), highlight: false });
      break;
    }
    if (nextIdx > cursor) {
      parts.push({ text: ORIGINAL.slice(cursor, nextIdx), highlight: false });
    }
    parts.push({ text: nextPhrase, highlight: true });
    cursor = nextIdx + nextPhrase.length;
  }

  return (
    <p className="text-[15px] leading-relaxed text-[#1C1917]">
      {parts.map((p, i) =>
        p.highlight ? (
          <span
            key={i}
            className="text-[#C4553A] underline decoration-[#C4553A]/50 decoration-2 underline-offset-[3px]"
          >
            {p.text}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </p>
  );
}

const STEPS = ["Your text", "Accent asks", "You answer", "Your version"];

export function SocraticDemo() {
  const [step, setStep] = useState(0);

  const advance = (next: number) => {
    posthog.capture("demo_step_advanced", { step: next });
    setStep(next);
  };

  return (
    <div className="space-y-6">
      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2">
        {STEPS.map((_, i) => (
          <span
            key={i}
            className={`w-2 h-2 rounded-full transition-colors ${
              i <= step ? "bg-[#F5C842]" : "bg-[#D4D0C8]"
            }`}
          />
        ))}
      </div>

      {/* Step label */}
      <p className="text-center text-[11px] font-sans font-medium text-[#8A8579] tracking-wide uppercase">
        {STEPS[step]}
      </p>

      {/* Step 0 — original text */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="bg-white border border-[#1B3A2D]/10 rounded-[12px] p-5">
            <p className="text-[15px] leading-relaxed text-[#1C1917]">
              {ORIGINAL}
            </p>
          </div>
          <button
            onClick={() => advance(1)}
            className="w-full py-3 rounded-[12px] bg-[#1B3A2D] text-white text-sm font-sans font-medium hover:bg-[#1B3A2D]/90 transition-colors"
          >
            See what Accent finds &rarr;
          </button>
        </div>
      )}

      {/* Step 1 — Accent asks */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-white border border-[#1B3A2D]/10 rounded-[12px] p-5">
            <HighlightedOriginal />
          </div>

          <div className="bg-[#FDF3CC] border border-[#F5C842]/40 rounded-[12px] p-5 space-y-3">
            <div className="inline-flex items-start gap-1.5">
              <span className="font-serif font-bold text-[15px] text-[#1B3A2D] leading-none">
                accent
              </span>
              <span
                className="bg-[#F5C842] rounded-full shrink-0"
                style={{ width: 5, height: 5, marginTop: 3 }}
              />
            </div>
            <p className="text-[14px] text-[#1C1917] leading-relaxed">
              You started with &ldquo;The rise of AI tools&rdquo; — that&apos;s
              a topic, not a point of view. Every sentence here could be written
              by anyone about anything.{" "}
              <span className="font-semibold">
                What do you actually think is happening? What have you seen that
                made you want to write this?
              </span>
            </p>
          </div>

          <button
            onClick={() => advance(2)}
            className="w-full py-3 rounded-[12px] bg-[#1B3A2D] text-white text-sm font-sans font-medium hover:bg-[#1B3A2D]/90 transition-colors"
          >
            Answer the question &rarr;
          </button>
        </div>
      )}

      {/* Step 2 — you answer */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-white border border-[#1B3A2D]/10 rounded-[12px] p-5">
            <HighlightedOriginal />
          </div>

          <div className="bg-[#F5F2EB] border border-[#1B3A2D]/10 rounded-[12px] p-5">
            <p className="text-[11px] font-sans font-medium text-[#8A8579] uppercase tracking-wide mb-2">
              You
            </p>
            <p className="text-[15px] leading-relaxed text-[#1C1917]">
              I keep seeing people ship apps they don&apos;t understand. They
              paste code from ChatGPT, it works, but they can&apos;t explain
              what it does. That scares me.
            </p>
          </div>

          <button
            onClick={() => advance(3)}
            className="w-full py-3 rounded-[12px] bg-[#1B3A2D] text-white text-sm font-sans font-medium hover:bg-[#1B3A2D]/90 transition-colors"
          >
            See your version &rarr;
          </button>
        </div>
      )}

      {/* Step 3 — your version + lesson */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-white border-2 border-[#1B3A2D] rounded-[12px] p-5">
            <p className="text-[11px] font-sans font-medium text-[#1B3A2D] uppercase tracking-wide mb-2">
              Your version
            </p>
            <p className="text-[15px] leading-relaxed text-[#1C1917] font-medium">
              {REVISED}
            </p>
          </div>

          <div className="bg-[#F5F2EB] rounded-[12px] p-5 space-y-4">
            <div>
              <p className="text-[11px] font-sans font-semibold text-[#8A8579] uppercase tracking-wide mb-1.5">
                The pattern
              </p>
              <p className="text-[14px] text-[#1C1917] leading-relaxed">
                AI loves to &ldquo;set the scene&rdquo; with big abstract
                claims (&ldquo;fundamentally transformed,&rdquo; &ldquo;purely
                human endeavor,&rdquo; &ldquo;navigate this new
                landscape&rdquo;). These phrases sound important but say
                nothing your reader doesn&apos;t already know. They&apos;re
                filler disguised as insight.
              </p>
            </div>
            <div>
              <p className="text-[11px] font-sans font-semibold text-[#8A8579] uppercase tracking-wide mb-1.5">
                The principle
              </p>
              <p className="text-[14px] text-[#1C1917] leading-relaxed">
                Start with what you&apos;ve actually noticed, not with what
                everyone already agrees on.{" "}
                <span className="font-medium">
                  &ldquo;People are shipping apps they can&apos;t
                  explain&rdquo;
                </span>{" "}
                is an observation.{" "}
                <span className="font-medium">
                  &ldquo;AI has fundamentally transformed creative work&rdquo;
                </span>{" "}
                is a headline from 2023. Your reader stays for your
                observations, not your summaries.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => advance(0)}
              className="w-[35%] py-3 rounded-[12px] border border-[#1B3A2D]/20 text-[#1B3A2D] text-sm font-sans font-medium hover:bg-[#F5F2EB] transition-colors"
            >
              Replay
            </button>
            <Link
              href="/write"
              onClick={() =>
                posthog.capture("landing_cta_clicked", {
                  location: "demo_final",
                })
              }
              className="flex-1 py-3 rounded-[12px] bg-[#F5C842] text-[#1B3A2D] text-sm font-sans font-medium text-center hover:bg-[#F5C842]/90 transition-colors"
            >
              Try with your writing &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
