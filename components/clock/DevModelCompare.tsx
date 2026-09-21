"use client";

import { useState } from "react";
import styles from "@/app/clock/page.module.css";
import { decodeAudio } from "@/lib/clock/decodeAudio";
import { MODEL_OPTIONS } from "@/lib/clock/model";
import { transcribe } from "@/lib/clock/transcriberClient";
import type { TranscribeProgress } from "@/lib/clock/transcriberClient";
import type { Run } from "@/lib/clock/types";

type CompareState =
  | { phase: "idle" }
  | { phase: "downloading"; percent: number | null }
  | { phase: "transcribing" }
  | { phase: "done"; text: string }
  | { phase: "error"; message: string };

let compareCounter = 0;

/**
 * Dev-only tool for comparing transcription models on the same saved run
 * before we pick a default. Never touches the run's stored transcript —
 * results here are throwaway, view-only.
 */
export default function DevModelCompare({ run }: { run: Run }) {
  const [modelId, setModelId] = useState(MODEL_OPTIONS[0].id);
  const [state, setState] = useState<CompareState>({ phase: "idle" });

  async function runCompare() {
    setState({ phase: "downloading", percent: null });
    compareCounter += 1;
    const requestId = `${run.id}:compare:${compareCounter}`;
    try {
      const { audio } = await decodeAudio(run.blob);
      const transcript = await transcribe(
        requestId,
        audio,
        (progress: TranscribeProgress) => {
          setState({
            phase: "downloading",
            percent: typeof progress.progress === "number" ? Math.round(progress.progress) : null,
          });
        },
        () => setState({ phase: "transcribing" }),
        modelId
      );
      setState({ phase: "done", text: transcript.text });
    } catch (err) {
      setState({ phase: "error", message: err instanceof Error ? err.message : "Transcription failed." });
    }
  }

  const busy = state.phase === "downloading" || state.phase === "transcribing";

  return (
    <div className={styles.devCompare}>
      <p className={styles.devCompareLabel}>Dev only — compare models</p>
      <div className={styles.devCompareRow}>
        <select
          className={styles.devSelect}
          value={modelId}
          onChange={(e) => setModelId(e.target.value)}
          disabled={busy}
        >
          {MODEL_OPTIONS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label} — ~{m.sizeMB} MB
            </option>
          ))}
        </select>
        <button className={styles.btn} onClick={runCompare} disabled={busy}>
          Transcribe with this model
        </button>
      </div>
      {state.phase === "downloading" && (
        <p className={styles.transcribeHint}>Downloading{state.percent !== null ? ` — ${state.percent}%` : "…"}</p>
      )}
      {state.phase === "transcribing" && <p className={styles.transcribeHint}>Transcribing…</p>}
      {state.phase === "error" && <p className={styles.transcribeError}>{state.message}</p>}
      {state.phase === "done" && <p className={styles.devCompareResult}>{state.text}</p>}
    </div>
  );
}
