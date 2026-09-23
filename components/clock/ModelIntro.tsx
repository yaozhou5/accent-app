"use client";

import styles from "@/app/clock/page.module.css";
import { getModelForDevice } from "@/lib/clock/model";

export default function ModelIntro({ onContinue }: { onContinue: () => void }) {
  const model = getModelForDevice();
  return (
    <div className={styles.card}>
      <p className={styles.recorderState}>
        The clock transcribes on this device using {model.label}. The first time, it downloads the speech model (about{" "}
        {model.sizeMB} MB, best on wifi). Your audio never leaves this device.
      </p>
      <button className={styles.btn} onClick={onContinue}>
        Continue
      </button>
    </div>
  );
}
