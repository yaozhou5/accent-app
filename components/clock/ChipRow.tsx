"use client";

import styles from "@/app/clock/page.module.css";
import type { Chip } from "@/lib/clock/chips";

export default function ChipRow({
  chips,
  selectedIds,
  onToggle,
}: {
  chips: Chip[];
  selectedIds: Set<string>;
  onToggle: (chipId: string) => void;
}) {
  if (chips.length === 0) return null;

  return (
    <div className={styles.chipRow}>
      <p className={styles.step}>Add a challenge:</p>
      <div className={styles.chipList}>
        {chips.map((chip) => {
          const selected = selectedIds.has(chip.id);
          return (
            <div key={chip.id} className={styles.chipWrap}>
              <button
                type="button"
                className={`${styles.chip} ${selected ? styles.chipSelected : ""}`}
                aria-pressed={selected}
                onClick={() => onToggle(chip.id)}
              >
                {chip.label}
              </button>
              {chip.type === "ai_check" && <p className={styles.chipBadge}>Checked by AI · sends your transcript</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
