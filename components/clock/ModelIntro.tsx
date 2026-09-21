"use client";

import styles from "@/app/clock/page.module.css";
import { MODEL_SIZE_MB } from "@/lib/clock/model";

export default function ModelIntro({ onContinue }: { onContinue: () => void }) {
  return (
    <div className={styles.card}>
      <p className={styles.recorderState}>
        The clock transcribes on this device. The first time, it downloads a speech model (about {MODEL_SIZE_MB} MB,
        best on wifi). Your audio never leaves this device.
      </p>
      <button className={styles.btn} onClick={onContinue}>
        Continue
      </button>
    </div>
  );
}
