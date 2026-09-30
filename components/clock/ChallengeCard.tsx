"use client";

import styles from "@/app/clock/page.module.css";
import type { Challenge } from "@/lib/clock/challenges";

export default function ChallengeCard({
  challenge,
  dismissed,
  onDismiss,
  onReopen,
}: {
  challenge: Challenge;
  dismissed: boolean;
  onDismiss: () => void;
  onReopen: () => void;
}) {
  if (dismissed) {
    return (
      <button type="button" className={styles.linkBtn} onClick={onReopen}>
        This week&apos;s challenge
      </button>
    );
  }

  return (
    <div className={styles.card}>
      <p className={styles.step}>This week&apos;s challenge</p>
      <p className={styles.challengeTitle}>{challenge.title}</p>
      <button type="button" className={styles.linkBtn} onClick={onDismiss}>
        Dismiss — free practice instead
      </button>
    </div>
  );
}
