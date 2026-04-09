"use client";

import { useState } from "react";
import type { QuickCheckResponse, Issue } from "@/lib/types";
import { wordDiff } from "@/lib/word-diff";
import { RotatingStatus } from "./RotatingStatus";
import { CopyButton } from "./CopyButton";
import { saveToShelf } from "@/lib/supabase/shelf";
import { useKeyboardHeight } from "@/lib/use-keyboard-height";

interface TeachResultProps {
  original: string;
  fixResult: QuickCheckResponse | null;
  issues: Issue[] | null;
  isFixing: boolean;
  isExplaining: boolean;
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

// Extract the sentence (or short window) of `text` containing `phrase`.
function extractSentence(text: string, phrase: string): string {
  const idx = text.indexOf(phrase);
  if (idx === -1) return phrase;

  // Expand backward to sentence start
  let start = idx;
  while (start > 0) {
    const ch = text[start - 1];
    if (ch === "\n") break;
    if ((ch === "." || ch === "!" || ch === "?") && text[start] === " ") break;
    start -= 1;
  }
  // Expand forward to sentence end
  let end = idx + phrase.length;
  while (end < text.length) {
    const ch = text[end];
    if (ch === "\n") break;
    if (ch === "." || ch === "!" || ch === "?") {
      end += 1;
      break;
    }
    end += 1;
  }
  return text.slice(start, end).trim();
}

function DiffedPhrase({
  phrase,
  fixedPhrase,
}: {
  phrase: string;
  fixedPhrase: string;
}) {
  const ops = wordDiff(phrase, fixedPhrase);
  return (
    <>
      {ops.map((op, k) => {
        if (op.type === "equal") return <span key={k}>{op.text}</span>;
        if (op.type === "del")
          return (
            <span
              key={k}
              className="bg-[#FBE9E4] text-[#C4553A] line-through decoration-[#C4553A]/60 rounded-[3px] px-1 py-px"
            >
              {op.text}
            </span>
          );
        return (
          <span
            key={k}
            className="bg-[#C8DDD5] text-[#1B3A2D] rounded-[3px] px-1 py-px font-medium"
          >
            {op.text}
          </span>
        );
      })}
    </>
  );
}

function ExcerptDiff({
  original,
  phrase,
  fixedPhrase,
}: {
  original: string;
  phrase: string;
  fixedPhrase: string;
}) {
  const sentence = extractSentence(original, phrase);
  const idx = sentence.indexOf(phrase);
  const baseClass =
    "font-sans text-[15px] leading-relaxed text-ink whitespace-pre-wrap";

  if (idx === -1) {
    return (
      <p className={baseClass}>
        <DiffedPhrase phrase={phrase} fixedPhrase={fixedPhrase} />
      </p>
    );
  }

  return (
    <p className={baseClass}>
      {sentence.slice(0, idx)}
      <DiffedPhrase phrase={phrase} fixedPhrase={fixedPhrase} />
      {sentence.slice(idx + phrase.length)}
    </p>
  );
}

export function TeachResult({
  original,
  fixResult,
  issues,
  isFixing,
  isExplaining,
  onNew,
}: TeachResultProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const keyboardHeight = useKeyboardHeight();

  // Loading: still fixing OR fix done but explain hasn't completed
  if (isFixing || !fixResult || issues === null || isExplaining) {
    const messages = isFixing
      ? [
          "Reading carefully\u2026",
          "Marking up your draft\u2026",
          "Almost done\u2026",
        ]
      : [
          "Preparing your lesson\u2026",
          "Finding the patterns\u2026",
          "Almost done\u2026",
        ];
    return (
      <div className="space-y-4">
        <RotatingStatus messages={messages} />
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

  if (issues.length === 0) {
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

  // Drop issues where the explain model didn't return a real lesson —
  // we'd otherwise render an empty "Improvement" placeholder card.
  const usableIssues = issues.filter(
    (i) => i.lesson_body && i.lesson_body.trim().length > 0
  );
  const cards = buildCards(usableIssues);
  const card = cards[currentIndex];
  const totalIssues = usableIssues.length;
  const improvedFull = fixResult.improved_full;

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
            i <= activePipIndex ? "bg-coral" : "bg-[#D4D0C8]"
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
            {issues.map((issue, i) => (
              <li
                key={i}
                className="flex gap-2 text-sm font-sans text-ink"
              >
                <span className="text-teal font-medium shrink-0">
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
              text={improvedFull}
              onSave={() => {
                saveToShelf(original, improvedFull, issues, "teach");
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
    <div
      className="grid grid-rows-[1fr_auto] overflow-hidden -mx-4 md:-mx-6"
      style={{ height: "calc(100dvh - 140px)" }}
    >
      {/* Scrollable card area — min-h-0 prevents grid blowout */}
      <div className="overflow-y-auto min-h-0 px-4 md:px-6 pt-2 pb-4">
        <div className="mb-3">{pips}</div>
        <div className="bg-white border border-ink/10 rounded-[12px] px-5 py-5 space-y-3">
          {/* Issue card */}
          {card.type === "issue" && (
            <>
              <span className="text-xs font-sans font-semibold text-ink/40 tracking-wide">
                Issue {issueNum} of {totalIssues}
              </span>
              <h3 className="font-serif font-bold text-lg text-ink">{issue.title}</h3>

              <div className="bg-warm/60 rounded-[8px] px-3.5 py-3 border border-ink/5">
                <ExcerptDiff
                  original={original}
                  phrase={issue.phrase}
                  fixedPhrase={issue.fixed_phrase || ""}
                />
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
                      <span className="text-[#C4553A] font-semibold text-sm mt-1 shrink-0">&#10007;</span>
                      <div className="flex-1 bg-[#FBE9E4] rounded-[8px] px-3.5 py-2.5">
                        <p className="font-sans text-[15px] leading-[1.6] text-[#C4553A] line-through decoration-[#C4553A]/60">
                          {ex.bad}
                        </p>
                      </div>
                    </div>
                    {/* Right version */}
                    <div className="flex gap-2.5 items-start">
                      <span className="text-teal text-sm mt-1 shrink-0">&#10003;</span>
                      <div className="flex-1 bg-[#C8DDD5] rounded-[8px] px-3.5 py-2.5">
                        <p className="font-sans text-[16px] leading-[1.6] font-medium text-[#1B3A2D]">
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

      {/* CTA row — grid auto row, always at bottom */}
      <div
        className="bg-paper border-t border-ink/10 px-4 md:px-6 pt-4"
        style={{ paddingBottom: `calc(2rem + ${keyboardHeight}px)` }}
      >
        <div className="flex gap-2">
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
            className={`py-3 min-h-[48px] rounded-[12px] bg-coral text-[#1B3A2D] text-sm font-sans font-medium hover:bg-coral/90 transition-colors ${
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
