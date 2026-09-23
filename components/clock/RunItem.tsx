"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
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

type Draft = { type: "point"; ms: number } | { type: "none" };

/** The compact confirm-row copy for the current draft choice — the highlight already shows where. */
function confirmRowText(draft: Draft): string {
  if (draft.type === "none") return "Never said it.";
  if (draft.ms === 0) return "Said it right at the start.";
  const seconds = Math.floor(draft.ms / 1000);
  return `Said it ${seconds} second${seconds === 1 ? "" : "s"} in.`;
}

export default function RunItem({
  run,
  repNumber,
  transcribeState,
  onDelete,
  onTranscribe,
  onMarkPoint,
  onMarkNone,
  onGoAgain,
}: {
  run: Run;
  repNumber: number;
  transcribeState: TranscribeState;
  onDelete: (id: string) => void;
  onTranscribe: (run: Run) => void;
  onMarkPoint: (id: string, pointMs: number) => void;
  onMarkNone: (id: string) => void;
  onGoAgain: () => void;
}) {
  const audioUrl = useMemo(() => URL.createObjectURL(run.blob), [run.blob]);

  useEffect(() => {
    return () => URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  // Briefly flashes the timeline marker whenever the confirmed point
  // changes — never on first mount/load, only on an actual change.
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

  // A picked-but-unconfirmed choice. Reset whenever Confirm actually saves
  // it (run.pointStatus leaves "unmarked" and isChanging drops back out).
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isChanging, setIsChanging] = useState(false);
  const isPicking = run.pointStatus === "unmarked" || isChanging;

  const handleConfirm = () => {
    if (!draft) return;
    if (draft.type === "point") onMarkPoint(run.id, draft.ms);
    else onMarkNone(run.id);
    setDraft(null);
    setIsChanging(false);
  };

  const handleChange = () => {
    setDraft(
      run.pointStatus === "marked" && run.pointMs !== null ? { type: "point", ms: run.pointMs } : { type: "none" }
    );
    setIsChanging(true);
  };

  const transcript = run.transcript;
  const effectivePointMs = isPicking
    ? draft?.type === "point"
      ? draft.ms
      : null
    : run.pointStatus === "marked"
      ? run.pointMs
      : null;
  const activeIndex =
    transcript && effectivePointMs !== null
      ? transcript.sentences.findIndex((s) => Math.round(s.start * 1000) === effectivePointMs)
      : -1;

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

            {transcript.sentences.length > 0 ? (
              <div className={styles.transcript}>
                {transcript.sentences.map((sentence, i) => {
                  const sentencePointMs = Math.round(sentence.start * 1000);
                  const active = i === activeIndex;
                  const dimmed = activeIndex !== -1 && i < activeIndex;
                  const chunkClass = `${styles.chunk} ${active ? styles.chunkActive : ""} ${dimmed ? styles.chunkDimmed : ""}`;
                  return (
                    <Fragment key={i}>
                      {isPicking ? (
                        <button
                          type="button"
                          className={chunkClass}
                          onClick={() => setDraft({ type: "point", ms: sentencePointMs })}
                        >
                          {sentence.text}
                        </button>
                      ) : (
                        <span className={`${chunkClass} ${styles.chunkStatic}`}>{sentence.text}</span>
                      )}
                      {isPicking && active && draft?.type === "point" && (
                        <div className={styles.confirmRow}>
                          <span className={styles.confirmRowText}>{confirmRowText(draft)}</span>
                          <button type="button" className={styles.confirmRowBtn} onClick={handleConfirm}>
                            Confirm
                          </button>
                        </div>
                      )}
                    </Fragment>
                  );
                })}
              </div>
            ) : (
              <div className={styles.transcript}>
                {isPicking ? (
                  <>
                    <button
                      type="button"
                      className={`${styles.chunk} ${draft?.type === "point" ? styles.chunkActive : ""}`}
                      onClick={() => setDraft({ type: "point", ms: 0 })}
                    >
                      {transcript.text}
                    </button>
                    {draft?.type === "point" && (
                      <div className={styles.confirmRow}>
                        <span className={styles.confirmRowText}>{confirmRowText(draft)}</span>
                        <button type="button" className={styles.confirmRowBtn} onClick={handleConfirm}>
                          Confirm
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <span
                    className={`${styles.chunk} ${styles.chunkStatic} ${run.pointStatus === "marked" ? styles.chunkActive : ""}`}
                  >
                    {transcript.text}
                  </span>
                )}
              </div>
            )}

            {isPicking ? (
              <>
                <div className={styles.transcriptActions}>
                  <button
                    type="button"
                    className={`${styles.quietLink} ${draft?.type === "none" ? styles.quietLinkActive : ""}`}
                    onClick={() => setDraft({ type: "none" })}
                  >
                    I never said it
                  </button>
                </div>
                {draft?.type === "none" && (
                  <div className={styles.confirmRow}>
                    <span className={styles.confirmRowText}>{confirmRowText(draft)}</span>
                    <button type="button" className={styles.confirmRowBtn} onClick={handleConfirm}>
                      Confirm
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className={styles.transcriptActions}>
                <span className={styles.confirmedLine}>
                  {run.pointStatus === "marked" && run.pointMs !== null
                    ? `Confirmed — said it at ${formatClock(run.pointMs)}.`
                    : "Confirmed — you never said it."}
                </span>
                <button type="button" className={styles.quietLink} onClick={handleChange}>
                  Change
                </button>
              </div>
            )}

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
