"use client";

import { useEffect, useRef, useState } from "react";
import posthog from "posthog-js";
import styles from "@/app/clock/page.module.css";
import { checkWithAi, type AiCheckResult } from "@/lib/clock/aiCheck";
import { checkSelectedChips, type CriterionStatus } from "@/lib/clock/chipCheck";
import type { Run } from "@/lib/clock/types";
import { correctedTranscriptText } from "@/lib/clock/wordFixes";

function statusMark(status: CriterionStatus): string {
  if (status === "met") return "✓";
  if (status === "not_met") return "✗";
  return "?";
}

export default function RunChecklist({
  run,
  onSetOverride,
  onAiCheckResult,
  onClearAiCheckResult,
}: {
  run: Run;
  onSetOverride: (chipId: string, value: boolean) => void;
  onAiCheckResult: (chipId: string, result: AiCheckResult) => void;
  onClearAiCheckResult: (chipId: string) => void;
}) {
  const results = checkSelectedChips(run, run.criteriaOverrides);
  const metCount = results.filter((r) => r.status === "met").length;
  const allResolved = results.every((r) => r.status !== "needs_confirmation");
  const tryNext = results.find((r) => r.status !== "met")?.chip.tryNext ?? null;

  const [checking, setChecking] = useState<Set<string>>(new Set());

  // Fires the AI check once per ai_check chip: only when the transcript is
  // ready, nobody's already overridden it, there's no result yet, and it's
  // not already in flight.
  useEffect(() => {
    if (!run.transcript) return;
    const transcriptText = correctedTranscriptText(run.transcript, run.wordFixes);

    for (const { chip } of results) {
      if (chip.type !== "ai_check") continue;
      if (chip.id in run.criteriaOverrides) continue;
      if (run.aiCheckResults[chip.id]) continue;
      if (checking.has(chip.id)) continue;

      setChecking((prev) => new Set(prev).add(chip.id));
      void checkWithAi(transcriptText, chip.id).then((result) => {
        setChecking((prev) => {
          const next = new Set(prev);
          next.delete(chip.id);
          return next;
        });
        if (result) {
          onAiCheckResult(chip.id, result);
          posthog.capture("ai_check_used", { tag: chip.id, met: result.met });
        }
      });
    }
    // Deliberately keyed on the run data that determines which checks are
    // needed, not on `results` (a fresh array every render) or `checking`
    // (would re-fire this same effect the moment it starts a check).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.transcript, run.criteriaOverrides, run.aiCheckResults]);

  // Fires only on a genuine false -> true transition after mount, so
  // revisiting an already-fully-resolved run on a fresh page load doesn't
  // re-fire this event — the ref starts at the CURRENT resolved state.
  const prevResolvedRef = useRef(allResolved);
  useEffect(() => {
    if (prevResolvedRef.current !== allResolved) {
      if (allResolved) posthog.capture("challenge_run_completed", { selected: results.length, met: metCount });
      prevResolvedRef.current = allResolved;
    }
  }, [allResolved, metCount, results.length]);

  function handleShare() {
    const text = `This week's Accent challenge: ${metCount}/${results.length} ✓ myaccent.io/practice`;
    navigator.clipboard.writeText(text).catch(() => {});
    posthog.capture("challenge_shared", { selected: results.length, met: metCount });
  }

  if (results.length === 0) return null;

  return (
    <div className={styles.challengeChecklist}>
      <p className={styles.step}>This week&apos;s challenge</p>
      <ul className={styles.challengeList}>
        {results.map(({ chip, status, detail }) => {
          const isChecking = chip.type === "ai_check" && checking.has(chip.id);
          const staleResult =
            chip.type === "ai_check" && detail && run.wordFixesVersion > detail.wordFixesVersionAtCheck;
          return (
            <li key={chip.id} className={styles.challengeItem}>
              <span>
                {isChecking ? (
                  "… Checking"
                ) : status === "met" && chip.type === "ai_check" && detail?.quote ? (
                  <>✓ Your example: &ldquo;{detail.quote}&rdquo;</>
                ) : (
                  <>
                    {statusMark(status)} {chip.label}
                  </>
                )}
              </span>
              {status === "not_met" && chip.type === "ai_check" && detail?.reason && (
                <span className={styles.challengeReason}>{detail.reason}</span>
              )}
              {status === "needs_confirmation" && !isChecking && (
                <span className={styles.challengeConfirm}>
                  <button type="button" className={styles.linkBtn} onClick={() => onSetOverride(chip.id, true)}>
                    Yes
                  </button>
                  <button type="button" className={styles.linkBtn} onClick={() => onSetOverride(chip.id, false)}>
                    No
                  </button>
                </span>
              )}
              {staleResult && !isChecking && (
                <button type="button" className={styles.quietLink} onClick={() => onClearAiCheckResult(chip.id)}>
                  Re-check with your fixes
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {tryNext && <p className={styles.repDelta}>Try next: {tryNext}</p>}
      {allResolved && (
        <button type="button" className={styles.linkBtn} onClick={handleShare}>
          Share
        </button>
      )}
    </div>
  );
}
