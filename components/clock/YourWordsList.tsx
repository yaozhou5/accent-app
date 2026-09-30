"use client";

import { useEffect, useState } from "react";
import styles from "@/app/clock/page.module.css";
import { loadPersonalCorrections, removePersonalCorrection } from "@/lib/clock/personalCorrections";
import type { PersonalCorrection } from "@/lib/clock/wordFixes";

/** View/delete list for "Your words" — rules built up via the "Always fix?" prompt in Fix words mode. Local only, never synced. */
export default function YourWordsList() {
  const [expanded, setExpanded] = useState(false);
  const [corrections, setCorrections] = useState<PersonalCorrection[]>([]);

  useEffect(() => {
    loadPersonalCorrections()
      .then(setCorrections)
      .catch(() => {});
  }, []);

  const handleRemove = (from: string) => {
    setCorrections((prev) => prev.filter((c) => c.from.toLowerCase() !== from.toLowerCase()));
    removePersonalCorrection(from).catch(() => {});
  };

  if (corrections.length === 0 && !expanded) return null;

  return (
    <div className={styles.scriptStep}>
      <button
        type="button"
        className={styles.scriptToggle}
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        Your words ({corrections.length})
        <span className={styles.scriptToggleIcon} aria-hidden="true">
          {expanded ? "–" : "+"}
        </span>
      </button>

      {expanded && (
        <div className={styles.scriptBody}>
          {corrections.length === 0 ? (
            <p className={styles.markHint}>
              Nothing yet — when you fix a misheard word in Review, you can save it here to fix automatically next time.
            </p>
          ) : (
            <ul className={styles.yourWordsList}>
              {corrections.map((c) => (
                <li key={c.from} className={styles.yourWordsRow}>
                  <span>
                    {c.from} → {c.to}
                  </span>
                  <button type="button" className={styles.removeMarkLink} onClick={() => handleRemove(c.from)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
