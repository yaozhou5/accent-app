"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import posthog from "posthog-js";
import styles from "@/app/clock/page.module.css";
import { formatClock } from "@/lib/clock/format";
import { groupMarksBySentence, runwayLandingMs } from "@/lib/clock/marks";
import type { Mark, MarkLabel, Run, SelfRating, TranscribeState } from "@/lib/clock/types";
import DevModelCompare from "./DevModelCompare";

const LABEL_OPTIONS: { value: MarkLabel; text: string }[] = [
  { value: "filler", text: "Filler" },
  { value: "lost_thread", text: "Lost the thread" },
  { value: "too_much_background", text: "Too much background" },
  { value: "rushed", text: "Rushed" },
];

const LABEL_TEXT: Record<MarkLabel, string> = {
  filler: "Filler",
  lost_thread: "Lost the thread",
  too_much_background: "Too much background",
  rushed: "Rushed",
};

const UNDO_WINDOW_MS = 5000;

type Draft = { type: "point"; ms: number } | { type: "none" };

function confirmRowText(draft: Draft): string {
  if (draft.type === "none") return "Never said it.";
  if (draft.ms === 0) return "Said it right at the start.";
  const seconds = Math.floor(draft.ms / 1000);
  return `Said it ${seconds} second${seconds === 1 ? "" : "s"} in.`;
}

function selfRatingText(rating: SelfRating): string {
  if (rating === "yes") return "Yes";
  if (rating === "sort_of") return "Sort of";
  return "No";
}

function summaryLine(run: Run): string {
  const parts = [selfRatingText(run.selfRating as SelfRating)];
  if (run.pointStatus === "marked" && run.pointMs !== null) parts.push(`point at ${formatClock(run.pointMs)}`);
  const markCount = run.marks.length;
  parts.push(`${markCount} mark${markCount === 1 ? "" : "s"}`);

  const labelCounts = new Map<MarkLabel, number>();
  for (const mark of run.marks) {
    if (!mark.label) continue;
    labelCounts.set(mark.label, (labelCounts.get(mark.label) ?? 0) + 1);
  }
  if (labelCounts.size > 0) {
    const labelText = [...labelCounts.entries()].map(([label, count]) => `${LABEL_TEXT[label]}: ${count}`).join(", ");
    parts.push(labelText);
  }

  return parts.join(" · ");
}

/** The four labels plus Remove, opened under whichever trigger (flag or list row) it belongs to. */
function LabelRow({
  mark,
  onSetLabel,
  onRemove,
}: {
  mark: Mark;
  onSetLabel: (label: MarkLabel | null) => void;
  onRemove: () => void;
}) {
  return (
    <div className={styles.markLabelRow}>
      {LABEL_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          className={`${styles.linkBtn} ${mark.label === option.value ? styles.chipSelected : ""}`}
          onClick={() => onSetLabel(mark.label === option.value ? null : option.value)}
        >
          {option.text}
        </button>
      ))}
      <button type="button" className={styles.removeMarkLink} onClick={onRemove}>
        Remove mark
      </button>
    </div>
  );
}

function RemovedMarkNotice({ onUndo }: { onUndo: () => void }) {
  return (
    <span className={styles.markRemovedNotice}>
      Mark removed ·{" "}
      <button type="button" className={styles.linkBtn} onClick={onUndo}>
        Undo
      </button>
    </span>
  );
}

function MarkFlag({
  mark,
  isOpen,
  onToggleOpen,
  onSetLabel,
  onRemove,
}: {
  mark: Mark;
  isOpen: boolean;
  onToggleOpen: () => void;
  onSetLabel: (label: MarkLabel | null) => void;
  onRemove: () => void;
}) {
  return (
    <>
      <button type="button" className={styles.markFlag} onClick={onToggleOpen} aria-label="Mark options">
        ⚑ {mark.label ? LABEL_TEXT[mark.label] : "Mark"}
      </button>
      {isOpen && <LabelRow mark={mark} onSetLabel={onSetLabel} onRemove={onRemove} />}
    </>
  );
}

function MarkListRow({
  mark,
  isOpen,
  onToggleOpen,
  onSetLabel,
  onRemove,
}: {
  mark: Mark;
  isOpen: boolean;
  onToggleOpen: () => void;
  onSetLabel: (label: MarkLabel | null) => void;
  onRemove: () => void;
}) {
  return (
    <li className={styles.markListItem}>
      <button type="button" className={styles.markListTime} onClick={onToggleOpen}>
        {formatClock(mark.ms)}
        {mark.label ? ` — ${LABEL_TEXT[mark.label]}` : ""}
      </button>
      {isOpen && <LabelRow mark={mark} onSetLabel={onSetLabel} onRemove={onRemove} />}
    </li>
  );
}

export default function RunReview({
  run,
  audioUrl,
  transcribeState,
  onTranscribe,
  onMarkPoint,
  onMarkNone,
  onSetMarkLabel,
  onRemoveMark,
  onRestoreMark,
  onSetSelfRating,
}: {
  run: Run;
  audioUrl: string;
  transcribeState: TranscribeState;
  onTranscribe: () => void;
  onMarkPoint: (pointMs: number) => void;
  onMarkNone: () => void;
  onSetMarkLabel: (markId: string, label: MarkLabel | null) => void;
  onRemoveMark: (markId: string) => void;
  onRestoreMark: (mark: Mark) => void;
  onSetSelfRating: (rating: SelfRating) => void;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isChanging, setIsChanging] = useState(false);
  const [openMarkId, setOpenMarkId] = useState<string | null>(null);
  const [previewedIndices, setPreviewedIndices] = useState<Set<number>>(new Set());
  // Marks removed in the last few seconds, kept around only so Undo can
  // bring them back — the removal itself already happened for real.
  const [removedMarks, setRemovedMarks] = useState<Map<string, Mark>>(new Map());
  const removeTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    const timers = removeTimersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const isPicking = run.pointStatus === "unmarked" || isChanging;

  const handleConfirm = () => {
    if (!draft) return;
    if (draft.type === "point") onMarkPoint(draft.ms);
    else onMarkNone();
    setDraft(null);
    setIsChanging(false);
  };

  const handleChange = () => {
    setDraft(
      run.pointStatus === "marked" && run.pointMs !== null ? { type: "point", ms: run.pointMs } : { type: "none" }
    );
    setIsChanging(true);
  };

  const toggleRunwayPreview = (index: number) => {
    setPreviewedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
        posthog.capture("review_runway_cut_previewed");
      }
      return next;
    });
  };

  const handleRemoveMark = (mark: Mark) => {
    onRemoveMark(mark.id);
    setOpenMarkId(null);
    setRemovedMarks((prev) => new Map(prev).set(mark.id, mark));
    const timer = setTimeout(() => {
      removeTimersRef.current.delete(mark.id);
      setRemovedMarks((prev) => {
        const next = new Map(prev);
        next.delete(mark.id);
        return next;
      });
    }, UNDO_WINDOW_MS);
    removeTimersRef.current.set(mark.id, timer);
  };

  const handleUndoRemove = (mark: Mark) => {
    const timer = removeTimersRef.current.get(mark.id);
    if (timer) clearTimeout(timer);
    removeTimersRef.current.delete(mark.id);
    setRemovedMarks((prev) => {
      const next = new Map(prev);
      next.delete(mark.id);
      return next;
    });
    onRestoreMark(mark);
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

  const marksBySentence = useMemo(
    () => (transcript ? groupMarksBySentence(transcript.sentences, run.marks) : new Map<number, Mark[]>()),
    [transcript, run.marks]
  );
  const removedMarksBySentence = useMemo(
    () =>
      transcript ? groupMarksBySentence(transcript.sentences, [...removedMarks.values()]) : new Map<number, Mark[]>(),
    [transcript, removedMarks]
  );

  return (
    <div className={styles.card}>
      <p className={styles.step}>Review</p>

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
            <h2 className={styles.markQuestion}>Which sentence is your point?</h2>
            <p className={styles.markHint}>Tap it. Everything before it is how long it took you to get there.</p>

            {transcript.sentences.length > 0 ? (
              <div className={`${styles.transcript} ph-no-capture`}>
                {transcript.sentences.map((sentence, i) => {
                  const sentencePointMs = Math.round(sentence.start * 1000);
                  const active = i === activeIndex;
                  const dimmed = activeIndex !== -1 && i < activeIndex;
                  const isRunway = dimmed && !isPicking;
                  const chunkClass = `${styles.chunk} ${active ? styles.chunkActive : ""} ${dimmed ? styles.chunkDimmed : ""} ${isRunway ? styles.chunkRunway : ""}`;
                  const marksHere = marksBySentence.get(i) ?? [];
                  const removedHere = removedMarksBySentence.get(i) ?? [];

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
                      ) : isRunway ? (
                        <button type="button" className={chunkClass} onClick={() => toggleRunwayPreview(i)}>
                          {sentence.text}
                        </button>
                      ) : (
                        <span className={`${chunkClass} ${styles.chunkStatic}`}>{sentence.text}</span>
                      )}
                      {marksHere.map((mark) => (
                        <MarkFlag
                          key={mark.id}
                          mark={mark}
                          isOpen={openMarkId === mark.id}
                          onToggleOpen={() => setOpenMarkId(openMarkId === mark.id ? null : mark.id)}
                          onSetLabel={(label) => {
                            onSetMarkLabel(mark.id, label);
                            setOpenMarkId(null);
                          }}
                          onRemove={() => handleRemoveMark(mark)}
                        />
                      ))}
                      {removedHere.map((mark) => (
                        <RemovedMarkNotice key={mark.id} onUndo={() => handleUndoRemove(mark)} />
                      ))}
                      {isRunway && previewedIndices.has(i) && run.pointMs !== null && (
                        <p className={styles.runwayPreview}>
                          Cut this and your point lands at {formatClock(runwayLandingMs(run.pointMs, sentence))}.
                        </p>
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
                {run.marks.map((mark) => (
                  <MarkFlag
                    key={mark.id}
                    mark={mark}
                    isOpen={openMarkId === mark.id}
                    onToggleOpen={() => setOpenMarkId(openMarkId === mark.id ? null : mark.id)}
                    onSetLabel={(label) => {
                      onSetMarkLabel(mark.id, label);
                      setOpenMarkId(null);
                    }}
                    onRemove={() => handleRemoveMark(mark)}
                  />
                ))}
                {[...removedMarks.values()].map((mark) => (
                  <RemovedMarkNotice key={mark.id} onUndo={() => handleUndoRemove(mark)} />
                ))}
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
        ) : (
          <>
            {transcribeState.phase === "idle" ? (
              <button className={styles.btn} onClick={onTranscribe}>
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
                <button className={styles.btn} onClick={onTranscribe}>
                  Try again
                </button>
              </div>
            )}

            {/* No transcript yet to anchor flags to — a plain list instead.
                Switches to sentence flags automatically once transcript arrives. */}
            {(run.marks.length > 0 || removedMarks.size > 0) && (
              <div className={styles.markListWrap}>
                <p className={styles.scriptCompareLabel}>Marks</p>
                <ul className={styles.markList}>
                  {run.marks.map((mark) => (
                    <MarkListRow
                      key={mark.id}
                      mark={mark}
                      isOpen={openMarkId === mark.id}
                      onToggleOpen={() => setOpenMarkId(openMarkId === mark.id ? null : mark.id)}
                      onSetLabel={(label) => {
                        onSetMarkLabel(mark.id, label);
                        setOpenMarkId(null);
                      }}
                      onRemove={() => handleRemoveMark(mark)}
                    />
                  ))}
                  {[...removedMarks.values()].map((mark) => (
                    <li key={mark.id} className={styles.markListItem}>
                      <RemovedMarkNotice onUndo={() => handleUndoRemove(mark)} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {/* Independent of transcript/point state on purpose — a failed or
          still-running transcription must never block reaching "done". */}
      <div className={styles.selfRatingRow}>
        {run.selfRating === null ? (
          <>
            <p className={styles.step}>Did you say what you meant to say?</p>
            <div className={styles.selfRatingButtons}>
              <button type="button" className={styles.btn} onClick={() => onSetSelfRating("yes")}>
                Yes
              </button>
              <button type="button" className={styles.btn} onClick={() => onSetSelfRating("sort_of")}>
                Sort of
              </button>
              <button type="button" className={styles.btn} onClick={() => onSetSelfRating("no")}>
                No
              </button>
            </div>
          </>
        ) : (
          <p className={styles.repDelta}>{summaryLine(run)}</p>
        )}
      </div>
    </div>
  );
}
