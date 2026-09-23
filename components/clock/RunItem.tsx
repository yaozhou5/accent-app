"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "@/app/clock/page.module.css";
import { formatClock, formatDate } from "@/lib/clock/format";
import type { Run, TranscribeState } from "@/lib/clock/types";
import DevModelCompare from "./DevModelCompare";
import RunTimeline from "./RunTimeline";

function metaSuffix(run: Run): string {
  if (run.pointStatus === "marked" && run.pointMs !== null) return ` · said it at ${formatClock(run.pointMs)}`;
  if (run.pointStatus === "none") return " · never said it";
  return " · not marked yet";
}

type ResultLine = { headline: string; sub: string | null; tone: "positive" | "none" };

/** Names the warm-up itself, not just the raw timestamp. */
function resultLine(run: Run): ResultLine | null {
  if (run.pointStatus === "marked" && run.pointMs !== null) {
    if (run.pointMs === 0) {
      return { headline: "You said it in your first sentence. No warm-up at all.", sub: null, tone: "positive" };
    }
    const warmupSeconds = Math.floor(run.pointMs / 1000);
    return {
      headline: `${warmupSeconds} second${warmupSeconds === 1 ? "" : "s"} of warm-up before you said what you do.`,
      sub: `out of ${formatClock(run.durationMs)}`,
      tone: "positive",
    };
  }
  if (run.pointStatus === "none") {
    return { headline: "You never said what you do.", sub: null, tone: "none" };
  }
  return null;
}

export default function RunItem({
  run,
  repNumber,
  transcribeState,
  onDelete,
  onTranscribe,
  onMarkPoint,
  onMarkNone,
  onClearPoint,
  onGoAgain,
}: {
  run: Run;
  repNumber: number;
  transcribeState: TranscribeState;
  onDelete: (id: string) => void;
  onTranscribe: (run: Run) => void;
  onMarkPoint: (id: string, pointMs: number) => void;
  onMarkNone: (id: string) => void;
  onClearPoint: (id: string) => void;
  onGoAgain: () => void;
}) {
  const audioUrl = useMemo(() => URL.createObjectURL(run.blob), [run.blob]);

  useEffect(() => {
    return () => URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  // Briefly flashes the result line and the timeline marker whenever the
  // chosen point changes — never on first mount/load, only on an actual
  // change of choice.
  const choiceKey = `${run.pointStatus}:${run.pointMs}`;
  const prevChoiceKeyRef = useRef(choiceKey);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (prevChoiceKeyRef.current === choiceKey) return;
    prevChoiceKeyRef.current = choiceKey;
    setFlash(true);
    const timer = setTimeout(() => setFlash(false), 500);
    return () => clearTimeout(timer);
  }, [choiceKey]);

  const transcript = run.transcript;
  const activeIndex =
    transcript && run.pointStatus === "marked"
      ? transcript.sentences.findIndex((s) => Math.round(s.start * 1000) === run.pointMs)
      : -1;
  const result = resultLine(run);

  return (
    <div className={styles.card}>
      <div className={styles.runHead}>
        <span className={styles.runTitle}>Rep {repNumber}</span>
        <span className={styles.runMeta}>
          {formatDate(run.createdAt)} · {formatClock(run.durationMs)}
          {metaSuffix(run)}
        </span>
        <button className={styles.deleteBtn} onClick={() => onDelete(run.id)} aria-label="Delete this run">
          Delete
        </button>
      </div>

      <RunTimeline durationMs={run.durationMs} pointMs={run.pointMs} pointStatus={run.pointStatus} flash={flash} />

      <audio controls preload="none" src={audioUrl} className={styles.player} />

      <div className={styles.transcriptArea}>
        {run.script && (
          <div className={styles.scriptCompareBlock}>
            <p className={styles.scriptCompareLabel}>What you planned</p>
            <p className={styles.scriptCompareText}>{run.script}</p>
          </div>
        )}
        {run.script && transcript && <p className={styles.scriptCompareLabel}>What you said</p>}
        {transcript ? (
          <>
            <h2 className={styles.markQuestion}>Which sentence says what your company does?</h2>
            <p className={styles.markHint}>
              Click the sentence. Everything before it is how long it took you to get there.
            </p>

            {result && (
              <p
                className={`${styles.markResult} ${result.tone === "none" ? styles.markResultNone : ""} ${flash ? styles.flash : ""}`}
              >
                {result.headline}
                {result.sub && <span className={styles.markResultSub}> {result.sub}</span>}
              </p>
            )}

            {transcript.sentences.length > 0 ? (
              <p className={styles.transcript}>
                {transcript.sentences.map((sentence, i) => {
                  const sentencePointMs = Math.round(sentence.start * 1000);
                  const active = i === activeIndex;
                  const dimmed = activeIndex !== -1 && i < activeIndex;
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`${styles.chunk} ${active ? styles.chunkActive : ""} ${dimmed ? styles.chunkDimmed : ""}`}
                      onClick={() => onMarkPoint(run.id, sentencePointMs)}
                    >
                      {sentence.text}
                    </button>
                  );
                })}
              </p>
            ) : (
              <p className={styles.transcript}>
                <button
                  type="button"
                  className={`${styles.chunk} ${run.pointStatus === "marked" ? styles.chunkActive : ""}`}
                  onClick={() => onMarkPoint(run.id, 0)}
                >
                  {transcript.text}
                </button>
              </p>
            )}
            <div className={styles.transcriptActions}>
              <button className={styles.quietLink} onClick={() => onMarkNone(run.id)}>
                I never said it
              </button>
              {run.pointStatus !== "unmarked" && (
                <button className={styles.quietLink} onClick={() => onClearPoint(run.id)}>
                  Clear
                </button>
              )}
            </div>
            {process.env.NODE_ENV === "development" && <DevModelCompare run={run} />}
          </>
        ) : transcribeState.phase === "idle" ? (
          <button className={styles.btn} onClick={() => onTranscribe(run)}>
            Transcribe
          </button>
        ) : transcribeState.phase === "downloading" ? (
          <p className={styles.transcribeHint}>
            Downloading speech model{transcribeState.percent !== null ? ` — ${transcribeState.percent}%` : "…"}
          </p>
        ) : transcribeState.phase === "transcribing" ? (
          <p className={styles.transcribeHint}>Transcribing…</p>
        ) : (
          <div className={styles.transcribeRow}>
            <p className={styles.transcribeError}>Transcription failed. Your recording is still saved.</p>
            <button className={styles.btn} onClick={() => onTranscribe(run)}>
              Try again
            </button>
          </div>
        )}
      </div>

      <div className={styles.goAgainRow}>
        <button className={styles.btn} onClick={onGoAgain}>
          Go again
        </button>
      </div>
    </div>
  );
}
