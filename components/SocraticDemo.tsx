"use client";

import { useState } from "react";
import posthog from "posthog-js";
import Link from "next/link";

const ORIGINAL =
  "After months of exploring different directions, I've decided to take a leap of faith and pursue my passion for building products that help people communicate better. It wasn't an easy decision, but I truly believe that the best things in life happen outside your comfort zone.";

const HIGHLIGHT_1 = "take a leap of faith and pursue my passion";
const HIGHLIGHT_2 =
  "It wasn't an easy decision, but I truly believe that the best things in life happen outside your comfort zone";

const REVISED =
  "After months of exploring different directions, I quit my design job to build my own app. I'm on a visa with about 8 months of savings, so the stakes are real. But I'd rather spend that time making something I believe in than wondering what if.";

function HighlightedOriginal() {
  // Highlight two phrases in the original text with soft red underline
  const text = ORIGINAL;
  const i1 = text.indexOf(HIGHLIGHT_1);
  const i2 = text.indexOf(HIGHLIGHT_2);
  const part1 = text.slice(0, i1);
  const part2 = text.slice(i1 + HIGHLIGHT_1.length, i2);
  const part3 = text.slice(i2 + HIGHLIGHT_2.length);

  return (
    <p className="text-[15px] leading-relaxed text-[#1C1917]">
      {part1}
      <span className="text-[#C4553A] underline decoration-[#C4553A]/50 decoration-2 underline-offset-[3px]">
        {HIGHLIGHT_1}
      </span>
      {part2}
      <span className="text-[#C4553A] underline decoration-[#C4553A]/50 decoration-2 underline-offset-[3px]">
        {HIGHLIGHT_2}
      </span>
      {part3}
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
            <p className="text-[14px] font-medium text-[#1B3A2D] leading-snug">
              &ldquo;Take a leap of faith and pursue my passion&rdquo;
            </p>
            <p className="text-[14px] text-[#1C1917] leading-relaxed">
              This is one of the most common AI-generated phrases. It sounds
              confident but says nothing specific. What did you actually decide
              to do? What made it feel risky?
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
              I quit my design job to build my own app. Scary because I&apos;m
              on a visa and I have maybe 8 months of runway.
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
                AI fills in emotion with clichés (&ldquo;leap of faith,&rdquo;
                &ldquo;pursue my passion,&rdquo; &ldquo;outside your comfort
                zone&rdquo;). They feel good to write but give your reader
                nothing to hold onto.
              </p>
            </div>
            <div>
              <p className="text-[11px] font-sans font-semibold text-[#8A8579] uppercase tracking-wide mb-1.5">
                The principle
              </p>
              <p className="text-[14px] text-[#1C1917] leading-relaxed">
                Replace abstract feelings with concrete details.{" "}
                <span className="font-medium">&ldquo;I quit my job&rdquo;</span>{" "}
                is scarier than{" "}
                <span className="font-medium">&ldquo;leap of faith.&rdquo;</span>{" "}
                <span className="font-medium">
                  &ldquo;8 months of runway&rdquo;
                </span>{" "}
                is realer than{" "}
                <span className="font-medium">
                  &ldquo;outside my comfort zone.&rdquo;
                </span>{" "}
                Readers remember specifics, not sentiments.
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
