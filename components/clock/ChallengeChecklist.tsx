"use client";

import { useEffect, useRef } from "react";
import posthog from "posthog-js";
import styles from "@/app/clock/page.module.css";
import { checkAllCriteria } from "@/lib/clock/challengeCheck";
import type { Challenge } from "@/lib/clock/challenges";
import type { Run } from "@/lib/clock/types";

function statusMark(status: "met" | "not_met" | "needs_confirmation"): string {
  if (status === "met") return "✓";
  if (status === "not_met") return "✗";
  return "?";
}

export default function ChallengeChecklist({
  challenge,
  run,
  onSetOverride,
}: {
  challenge: Challenge;
  run: Run;
  onSetOverride: (criterionId: string, value: boolean) => void;
}) {
  const results = checkAllCriteria(challenge, run, run.criteriaOverrides);
  const metCount = results.filter((r) => r.status === "met").length;
  const allResolved = results.every((r) => r.status !== "needs_confirmation");
  const tryNext = results.find((r) => r.status !== "met")?.criterion.tryNext ?? null;

  // Fires only on a genuine false -> true transition after mount, so
  // revisiting an already-fully-resolved run on a fresh page load doesn't
  // re-fire this event — the ref starts at the CURRENT resolved state.
  const prevResolvedRef = useRef(allResolved);
  useEffect(() => {
    if (prevResolvedRef.current !== allResolved) {
      if (allResolved) {
        posthog.capture("challenge_run_completed", {
          challenge_id: challenge.id,
          criteria_met: metCount,
          criteria_total: results.length,
        });
      }
      prevResolvedRef.current = allResolved;
    }
  }, [allResolved, challenge.id, metCount, results.length]);

  function handleShare() {
    const text = `This week's Accent challenge: ${metCount}/${results.length} ✓ myaccent.io/practice`;
    navigator.clipboard.writeText(text).catch(() => {});
    posthog.capture("challenge_shared", {
      challenge_id: challenge.id,
      criteria_met: metCount,
      criteria_total: results.length,
    });
  }

  return (
    <div className={styles.challengeChecklist}>
      <p className={styles.step}>This week&apos;s challenge</p>
      <ul className={styles.challengeList}>
        {results.map(({ criterion, status }) => (
          <li key={criterion.id} className={styles.challengeItem}>
            <span>
              {statusMark(status)} {criterion.label}
            </span>
            {status === "needs_confirmation" && (
              <span className={styles.challengeConfirm}>
                <button type="button" className={styles.linkBtn} onClick={() => onSetOverride(criterion.id, true)}>
                  Yes
                </button>
                <button type="button" className={styles.linkBtn} onClick={() => onSetOverride(criterion.id, false)}>
                  No
                </button>
              </span>
            )}
          </li>
        ))}
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
