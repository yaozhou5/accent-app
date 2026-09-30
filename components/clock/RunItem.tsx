"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import styles from "@/app/clock/page.module.css";
import type { AiCheckResult } from "@/lib/clock/aiCheck";
import { formatClock, formatDate } from "@/lib/clock/format";
import type { Mark, MarkLabel, Run, SelfRating, TranscribeState, WordFix } from "@/lib/clock/types";
import DevModelCompare from "./DevModelCompare";
import RunChecklist from "./RunChecklist";
import RunListen from "./RunListen";
import RunReview from "./RunReview";
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
  onSetCriterionOverride,
  onAiCheckResult,
  onClearAiCheckResult,
  onAddMark,
  onDoneListening,
  onSetMarkLabel,
  onRemoveMark,
  onRestoreMark,
  onSetSelfRating,
  onSetWordFix,
  onRemoveWordFix,
}: {
  run: Run;
  repNumber: number;
  transcribeState: TranscribeState;
  onDelete: (id: string) => void;
  onTranscribe: (run: Run) => void;
  onMarkPoint: (id: string, pointMs: number) => void;
  onMarkNone: (id: string) => void;
  onGoAgain: () => void;
  onSetCriterionOverride: (runId: string, criterionId: string, value: boolean) => void;
  onAiCheckResult: (runId: string, chipId: string, result: AiCheckResult) => void;
  onClearAiCheckResult: (runId: string, chipId: string) => void;
  onAddMark: (runId: string, ms: number) => void;
  onDoneListening: (runId: string) => void;
  onSetMarkLabel: (runId: string, markId: string, label: MarkLabel | null) => void;
  onRemoveMark: (runId: string, markId: string) => void;
  onRestoreMark: (runId: string, mark: Mark) => void;
  onSetSelfRating: (runId: string, rating: SelfRating) => void;
  onSetWordFix: (runId: string, sentenceIndex: number, fix: WordFix) => void;
  onRemoveWordFix: (runId: string, sentenceIndex: number, start: number, end: number) => void;
}) {
  const audioUrl = useMemo(() => URL.createObjectURL(run.blob), [run.blob]);

  useEffect(() => {
    return () => URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  // A run decided under the old flow (point already set) that never went
  // through Listen (listenedAt still null, and never will) — renders
  // exactly what this component rendered before the two-step flow existed.
  const isLegacyRun = run.pointStatus !== "unmarked" && run.listenedAt === null;
  const phase: "legacy" | "listen" | "review" = isLegacyRun ? "legacy" : run.listenedAt === null ? "listen" : "review";

  // Everything below this point (flash, draft, isChanging, isPicking) is
  // used only by the legacy branch — RunReview owns its own copy of this
  // same point-picking state for the new-flow case, kept deliberately
  // separate so nothing new can leak into how a legacy run behaves.
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

      {phase === "listen" && (
        <RunListen
          run={run}
          audioUrl={audioUrl}
          onAddMark={(ms) => onAddMark(run.id, ms)}
          onDoneListening={() => onDoneListening(run.id)}
        />
      )}

      {phase === "review" && (
        <RunReview
          run={run}
          audioUrl={audioUrl}
          transcribeState={transcribeState}
          onTranscribe={() => onTranscribe(run)}
          onMarkPoint={(ms) => onMarkPoint(run.id, ms)}
          onMarkNone={() => onMarkNone(run.id)}
          onSetMarkLabel={(markId, label) => onSetMarkLabel(run.id, markId, label)}
          onRemoveMark={(markId) => onRemoveMark(run.id, markId)}
          onRestoreMark={(mark) => onRestoreMark(run.id, mark)}
          onSetSelfRating={(rating) => onSetSelfRating(run.id, rating)}
          onSetWordFix={(sentenceIndex, fix) => onSetWordFix(run.id, sentenceIndex, fix)}
          onRemoveWordFix={(sentenceIndex, start, end) => onRemoveWordFix(run.id, sentenceIndex, start, end)}
        />
      )}

      {phase === "legacy" && (
        <>
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
                  <div className={`${styles.transcript} ph-no-capture`}>
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
                  <div className={`${styles.transcript} ph-no-capture`}>
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
                Downloading {transcribeState.modelLabel}
                {transcribeState.percent !== null ? ` — ${transcribeState.percent}%` : "…"}
              </p>
            ) : transcribeState.phase === "transcribing" ? (
              <p className={styles.transcribeHint}>Transcribing with {transcribeState.modelLabel}…</p>
            ) : (
              <div className={styles.transcribeRow}>
                <p className={styles.transcribeError}>
                  Transcription failed: {transcribeState.message} Your recording is still saved.
                </p>
                <button className={styles.btn} onClick={() => onTranscribe(run)}>
                  Try again
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {run.selectedChipIds.length > 0 && run.pointStatus !== "unmarked" && (
        <RunChecklist
          run={run}
          onSetOverride={(chipId, value) => onSetCriterionOverride(run.id, chipId, value)}
          onAiCheckResult={(chipId, result) => onAiCheckResult(run.id, chipId, result)}
          onClearAiCheckResult={(chipId) => onClearAiCheckResult(run.id, chipId)}
        />
      )}

      <div className={styles.goAgainRow}>
        <button className={styles.btn} onClick={onGoAgain}>
          Go again
        </button>
      </div>
    </div>
  );
}
