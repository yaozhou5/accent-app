"use client";

import { useState } from "react";
import styles from "@/app/clock/page.module.css";

export default function ScriptStep({ value, onChange }: { value: string; onChange: (text: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={styles.scriptStep}>
      <button
        type="button"
        className={styles.scriptToggle}
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
      >
        Write a script first (optional)
        <span className={styles.scriptToggleIcon} aria-hidden="true">
          {expanded ? "–" : "+"}
        </span>
      </button>

      {expanded && (
        <div className={styles.scriptBody}>
          <textarea
            className={styles.scriptTextarea}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="What do you want to say?"
            rows={6}
          />
          <p className={styles.scriptHint}>You won’t see this while you’re talking.</p>
        </div>
      )}
    </div>
  );
}
