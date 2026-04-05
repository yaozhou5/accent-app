"use client";

import { useState } from "react";
import type { CheckResponse, Issue } from "@/lib/types";
import { RotatingStatus } from "./RotatingStatus";
import { CopyButton } from "./CopyButton";
import { saveToShelf } from "@/lib/supabase/shelf";

interface TeachResultProps {
  original: string;
  result: CheckResponse | null;
  isStreaming: boolean;
  onNew: () => void;
}

type CardType = "issue" | "lesson" | "example" | "summary";
interface Card {
  type: CardType;
  issueIndex: number;
  issue?: Issue;
}

function buildCards(issues: Issue[]): Card[] {
  const cards: Card[] = [];
  for (let i = 0; i < issues.length; i++) {
    cards.push({ type: "issue", issueIndex: i, issue: issues[i] });
    cards.push({ type: "lesson", issueIndex: i, issue: issues[i] });
    cards.push({ type: "example", issueIndex: i, issue: issues[i] });
  }
  cards.push({ type: "summary", issueIndex: issues.length });
  return cards;
}

function getButtonLabel(card: Card, totalIssues: number): string {
  if (card.type === "issue") return "What\u2019s the lesson? \u2192";
  if (card.type === "lesson") return "See examples \u2192";
  if (card.type === "example") {
    if (card.issueIndex < totalIssues - 1) return "Next issue \u2192";
    return "See summary \u2192";
  }
  return "";
}

function LessonBody({ html }: { html: string }) {
  return (
    <p
      className="font-sans text-sm leading-relaxed text-ink/70 lesson-body"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function HighlightedText({
  text,
  phrase,
  color = "coral",
}: {
  text: string;
  phrase: string;
  color?: "coral" | "teal";
}) {
  const idx = text.indexOf(phrase);
  const baseClass =
    color === "coral"
      ? "font-sans text-sm leading-relaxed text-ink/60"
      : "font-sans text-sm leading-relaxed text-ink font-medium";
  const highlightClass =
    color === "coral"
      ? "bg-[#FAECE7] text-[#993C1D] rounded-[3px] px-1 py-px"
      : "bg-[#E1F5EE] text-[#0F6E56] rounded-[3px] px-1 py-px";

  if (idx === -1) return <p className={baseClass}>{text}</p>;

  return (
    <p className={baseClass}>
      {text.slice(0, idx)}
      <span className={highlightClass}>{phrase}</span>
      {text.slice(idx + phrase.length)}
    </p>
  );
}

export function TeachResult({
  original,
  result,
  isStreaming,
  onNew,
}: TeachResultProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (isStreaming || !result) {
    return (
      <div className="space-y-4">
        <RotatingStatus
          messages={[
            "Reading carefully\u2026",
            "Finding the lessons\u2026",
            "Almost done\u2026",
          ]}
        />
        <div className="animate-pulse-subtle">
          <div className="bg-white border border-ink/10 rounded-[12px] px-5 py-5 space-y-3">
            <div className="h-3 bg-ink/10 rounded w-20" />
            <div className="h-5 bg-ink/10 rounded w-48" />
            <div className="h-16 bg-ink/5 rounded" />
            <div className="h-16 bg-ink/5 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (result.issues.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-teal-light border border-teal/20 rounded-[8px] px-4 py-3 text-teal font-sans text-sm font-medium">
          This is good writing! Nothing to teach here.
        </div>
        <button
          onClick={onNew}
          className="w-full py-3 min-h-[44px] rounded-[12px] border border-ink/10 text-sm font-sans font-medium text-ink/50 hover:bg-warm hover:text-ink transition-colors"
        >
          Write something new
        </button>
      </div>
    );
  }

  const cards = buildCards(result.issues);
  const card = cards[currentIndex];
  const totalIssues = result.issues.length;

  const goNext = () => {
    if (currentIndex < cards.length - 1) setCurrentIndex(currentIndex + 1);
  };
  const goBack = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };

  // Pips — one per issue + one for summary
  const activePipIndex =
    card.type === "summary" ? totalIssues : card.issueIndex;
  const pips = (
    <div className="flex items-center justify-center gap-1.5">
      {Array.from({ length: totalIssues + 1 }).map((_, i) => (
        <span
          key={i}
          className={`w-1.5 h-1.5 rounded-full transition-colors ${
            i <= activePipIndex ? "bg-coral" : "bg-ink/15"
          }`}
        />
      ))}
    </div>
  );

  // Summary card — inline layout, no fixed bottom, no Back
  if (card.type === "summary") {
    return (
      <div className="space-y-4">
        {pips}
        <div className="bg-white border border-ink/10 rounded-[12px] px-5 py-5 space-y-4">
          <div>
            <span className="text-xs font-sans font-semibold text-teal tracking-wide">
              All done
            </span>
            <h3 className="mt-1 font-serif font-bold text-xl text-ink">
              {totalIssues} lesson{totalIssues > 1 ? "s" : ""} learned
            </h3>
          </div>

          <ul className="space-y-2">
            {result.issues.map((issue, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm font-sans text-ink/70"
              >
                <span className="text-coral font-medium shrink-0">
                  {i + 1}.
                </span>
                <span>{issue.lesson_title || issue.title}</span>
              </li>
            ))}
          </ul>

          <div className="flex gap-2 pt-2">
            <button
              onClick={onNew}
              className="w-[35%] py-2.5 min-h-[44px] rounded-[8px] text-sm font-sans font-medium border border-ink/10 text-ink hover:bg-warm transition-colors"
            >
              New
            </button>
            <CopyButton
              text={result.improved_full}
              onSave={() => {
                saveToShelf(original, result.improved_full, result.issues, "teach");
              }}
            />
          </div>

          <button
            onClick={goBack}
            className="w-full text-[13px] font-sans text-ink/40 hover:text-ink transition-colors py-1 text-center"
          >
            &larr; Back
          </button>
        </div>
      </div>
    );
  }

  const issue = card.issue!;
  const issueNum = card.issueIndex + 1;

  return (
    <div className="relative min-h-[calc(100vh-200px)]">
      <div className="mb-3">{pips}</div>

      {/* Card */}
      <div className="pb-[100px]">
        <div className="bg-white border border-ink/10 rounded-[12px] px-5 py-5 space-y-3">
          {/* Issue card */}
          {card.type === "issue" && (
            <>
              <span className="text-xs font-sans font-semibold text-ink/40 tracking-wide">
                Issue {issueNum} of {totalIssues}
              </span>
              <h3 className="font-serif font-bold text-lg text-ink">{issue.title}</h3>

              <div>
                <span className="text-[11px] font-sans text-ink/40">
                  Before
                </span>
                <div className="mt-0.5 bg-coral-light/50 rounded-[8px] px-3 py-2">
                  <HighlightedText text={original} phrase={issue.phrase} />
                </div>
              </div>

              <div>
                <span className="text-[11px] font-sans text-[#0F6E56] font-medium">
                  After
                </span>
                <div className="mt-0.5 bg-teal-light/50 rounded-[8px] px-3 py-2">
                  <HighlightedText
                    text={result.improved_full}
                    phrase={issue.fixed_phrase || ""}
                    color="teal"
                  />
                </div>
              </div>
            </>
          )}

          {/* Lesson card */}
          {card.type === "lesson" && (
            <>
              <span className="text-xs font-sans font-semibold text-ink/40 tracking-wide">
                The lesson
              </span>
              <h3 className="font-serif font-bold text-lg text-ink">
                {issue.lesson_title || issue.title}
              </h3>
              <LessonBody html={issue.lesson_body} />
            </>
          )}

          {/* Example card */}
          {card.type === "example" && (
            <>
              <h3 className="font-sans text-[18px] font-medium text-ink">
                Spot the pattern
              </h3>
              <div className="space-y-6 mt-1">
                {issue.examples.map((ex, i) => (
                  <div key={i} className="space-y-4">
                    {/* Wrong version */}
                    <div className="flex gap-2.5 items-start">
                      <span className="text-coral text-sm mt-1 shrink-0">&#10007;</span>
                      <div className="flex-1 bg-[#F1EFE8] rounded-[8px] px-3.5 py-2.5">
                        <p className="font-sans text-[15px] leading-[1.6] text-ink/60 line-through decoration-coral/50">
                          {ex.bad}
                        </p>
                      </div>
                    </div>
                    {/* Right version */}
                    <div className="flex gap-2.5 items-start">
                      <span className="text-teal text-sm mt-1 shrink-0">&#10003;</span>
                      <div className="flex-1 bg-[#E1F5EE] rounded-[8px] px-3.5 py-2.5">
                        <p className="font-sans text-[16px] leading-[1.6] font-medium text-[#0F6E56]">
                          {ex.good}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Fixed bottom CTA row */}
      <div className="fixed bottom-0 left-0 right-0 bg-paper px-5 pb-8 pt-4">
        <div className="max-w-[480px] md:max-w-[600px] mx-auto px-4 md:px-6 flex gap-2">
          {currentIndex > 0 && (
            <button
              onClick={goBack}
              className="w-[35%] py-3 min-h-[48px] rounded-[12px] border border-ink/10 text-sm font-sans font-medium text-ink/60 hover:bg-warm transition-colors"
            >
              &larr; Back
            </button>
          )}
          <button
            onClick={goNext}
            className={`py-3 min-h-[48px] rounded-[12px] bg-coral text-white text-sm font-sans font-medium hover:bg-coral/90 transition-colors ${
              currentIndex > 0 ? "w-[65%]" : "w-full"
            }`}
          >
            {getButtonLabel(card, totalIssues)}
          </button>
        </div>
      </div>
    </div>
  );
}
