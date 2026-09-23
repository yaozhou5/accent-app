"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "@/app/clock/page.module.css";
import { decodeAudio } from "@/lib/clock/decodeAudio";
import { deleteAllRuns, deleteRun, isDbAvailable, listRuns, saveRun, updateRun } from "@/lib/clock/db";
import { formatClock, isToday } from "@/lib/clock/format";
import { hasSeenModelIntro, markModelIntroSeen } from "@/lib/clock/modelIntro";
import type { TranscribeProgress } from "@/lib/clock/transcriberClient";
import { transcribe } from "@/lib/clock/transcriberClient";
import type { Run, TranscribeState } from "@/lib/clock/types";
import ModelIntro from "./ModelIntro";
import Recorder, { type FinishedRecording, type RecorderHandle } from "./Recorder";
import RunItem from "./RunItem";
import TimeToPointChart from "./TimeToPointChart";

type SaveFailure = { downloadUrl: string; durationMs: number };

/** "First rep: 0:41. Latest: 0:13." — only when both ends of the run history have a marked point. */
function repDeltaText(runs: Run[]): string | null {
  if (runs.length < 2) return null;
  const latest = runs[0];
  const first = runs[runs.length - 1];
  if (first.pointStatus !== "marked" || first.pointMs === null) return null;
  if (latest.pointStatus !== "marked" || latest.pointMs === null) return null;
  return `First rep: ${formatClock(first.pointMs)}. Latest: ${formatClock(latest.pointMs)}.`;
}

export default function ClockApp() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [dbAvailable, setDbAvailable] = useState(true);
  const [saveFailure, setSaveFailure] = useState<SaveFailure | null>(null);
  const [confirmingDeleteAll, setConfirmingDeleteAll] = useState(false);
  const [introSeen, setIntroSeen] = useState<boolean | null>(null);
  const [transcribeStates, setTranscribeStates] = useState<Record<string, TranscribeState>>({});
  const idCounter = useRef(0);
  const recorderRef = useRef<RecorderHandle | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDbAvailable(isDbAvailable());
    setIntroSeen(hasSeenModelIntro());
    listRuns()
      .then(setRuns)
      .catch(() => setRuns([]))
      .finally(() => setLoaded(true));
  }, []);

  const runTranscription = useCallback(async (run: Run, preDecodedAudio?: Float32Array) => {
    setTranscribeStates((s) => ({ ...s, [run.id]: { phase: "downloading", percent: null } }));
    try {
      const audio = preDecodedAudio ?? (await decodeAudio(run.blob)).audio;
      const transcript = await transcribe(
        run.id,
        audio,
        (progress: TranscribeProgress) => {
          setTranscribeStates((s) => ({
            ...s,
            [run.id]: {
              phase: "downloading",
              percent: typeof progress.progress === "number" ? Math.round(progress.progress) : null,
            },
          }));
        },
        () => setTranscribeStates((s) => ({ ...s, [run.id]: { phase: "transcribing" } }))
      );
      setRuns((prev) => prev.map((r) => (r.id === run.id ? { ...r, transcript } : r)));
      updateRun(run.id, { transcript }).catch(() => {});
      setTranscribeStates((s) => {
        const next = { ...s };
        delete next[run.id];
        return next;
      });
    } catch (err) {
      setTranscribeStates((s) => ({
        ...s,
        [run.id]: { phase: "error", message: err instanceof Error ? err.message : "Transcription failed." },
      }));
    }
  }, []);

  const handleFinished = useCallback(
    async (data: FinishedRecording) => {
      idCounter.current += 1;
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `run-${Date.now()}-${idCounter.current}`;

      // Decode once up front: it gives us the real duration (the recorder's
      // timer and the final encoded file can differ by a frame or two) and
      // the 16kHz mono PCM the transcriber needs, so the blob never has to
      // be decoded twice.
      let durationMs = data.fallbackDurationMs;
      let preDecodedAudio: Float32Array | undefined;
      try {
        const decoded = await decodeAudio(data.blob);
        durationMs = decoded.durationMs;
        preDecodedAudio = decoded.audio;
      } catch {
        // Fall back to the timer estimate; transcription will hit the same
        // decode error moments later and surface its own message.
      }

      const run: Run = {
        id,
        createdAt: Date.now(),
        durationMs,
        pointMs: null,
        pointStatus: "unmarked",
        mimeType: data.mimeType,
        blob: data.blob,
        transcript: null,
      };
      try {
        await saveRun(run);
        setRuns((prev) => [run, ...prev]);
        setSaveFailure(null);
        void runTranscription(run, preDecodedAudio);
      } catch {
        setSaveFailure({ downloadUrl: URL.createObjectURL(data.blob), durationMs });
      }
    },
    [runTranscription]
  );

  const handleDelete = useCallback((id: string) => {
    setRuns((prev) => prev.filter((r) => r.id !== id));
    deleteRun(id).catch(() => {});
  }, []);

  const handleDeleteAll = useCallback(() => {
    setRuns([]);
    setConfirmingDeleteAll(false);
    deleteAllRuns().catch(() => {});
  }, []);

  const handleMarkPoint = useCallback((id: string, pointMs: number) => {
    setRuns((prev) => prev.map((r) => (r.id === id ? { ...r, pointMs, pointStatus: "marked" } : r)));
    updateRun(id, { pointMs, pointStatus: "marked" }).catch(() => {});
  }, []);

  const handleMarkNone = useCallback((id: string) => {
    setRuns((prev) => prev.map((r) => (r.id === id ? { ...r, pointMs: null, pointStatus: "none" } : r)));
    updateRun(id, { pointMs: null, pointStatus: "none" }).catch(() => {});
  }, []);

  const handleClearPoint = useCallback((id: string) => {
    setRuns((prev) => prev.map((r) => (r.id === id ? { ...r, pointMs: null, pointStatus: "unmarked" } : r)));
    updateRun(id, { pointMs: null, pointStatus: "unmarked" }).catch(() => {});
  }, []);

  const handleContinueFromIntro = useCallback(() => {
    markModelIntroSeen();
    setIntroSeen(true);
  }, []);

  const handleGoAgain = useCallback(() => {
    recorderRef.current?.start();
    const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    topRef.current?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }, []);

  const todayCount = runs.filter((r) => isToday(r.createdAt)).length;
  const repDelta = repDeltaText(runs);

  return (
    <div ref={topRef}>
      {loaded && todayCount > 0 && <p className={styles.repToday}>Rep {todayCount} today</p>}

      {introSeen === false ? (
        <ModelIntro onContinue={handleContinueFromIntro} />
      ) : introSeen === true ? (
        <Recorder ref={recorderRef} onFinished={handleFinished} />
      ) : null}

      <p className={styles.recorderNote}>
        Record yourself explaining your company. Afterwards, pick the sentence where you said what you do. The clock
        shows how long it took you to get there.
      </p>
      <p className={styles.privacyNote}>
        Everything stays in this browser. Clear your browser data and your runs are gone. Nothing syncs between devices.
      </p>

      {!dbAvailable && (
        <p className={styles.warning}>
          This browser doesn’t support saving runs. Recording still works, but nothing will be kept after you leave the
          page.
        </p>
      )}

      {saveFailure && (
        <div className={styles.warning}>
          <p>
            Couldn’t save that {Math.floor(saveFailure.durationMs / 1000)}-second run — storage might be full or
            unavailable.
          </p>
          <a href={saveFailure.downloadUrl} download="accent-clock-run.webm">
            Download the recording instead
          </a>
        </div>
      )}

      {loaded && runs.length >= 2 && (
        <div className={styles.card}>
          <p className={styles.step}>Time until you said what you do</p>
          <TimeToPointChart runs={runs} />
          {repDelta && <p className={styles.repDelta}>{repDelta}</p>}
        </div>
      )}

      {loaded && runs.length === 0 && (
        <p className={styles.empty}>
          Most people need three or four goes before it gets crisp. Record as many as you like.
        </p>
      )}

      {runs.length > 0 && (
        <div className={styles.runsList}>
          <div className={styles.runsHead}>
            <p className={styles.step}>Your runs</p>
            {confirmingDeleteAll ? (
              <span className={styles.confirmRow}>
                <span>Delete all {runs.length} runs?</span>
                <button className={styles.deleteBtn} onClick={handleDeleteAll}>
                  Yes, delete all
                </button>
                <button className={styles.linkBtn} onClick={() => setConfirmingDeleteAll(false)}>
                  Cancel
                </button>
              </span>
            ) : (
              <button className={styles.linkBtn} onClick={() => setConfirmingDeleteAll(true)}>
                Delete all runs
              </button>
            )}
          </div>
          {runs.map((run, i) => (
            <RunItem
              key={run.id}
              run={run}
              repNumber={runs.length - i}
              transcribeState={transcribeStates[run.id] ?? { phase: "idle" }}
              onDelete={handleDelete}
              onTranscribe={(r) => runTranscription(r)}
              onMarkPoint={handleMarkPoint}
              onMarkNone={handleMarkNone}
              onClearPoint={handleClearPoint}
              onGoAgain={handleGoAgain}
            />
          ))}
        </div>
      )}
    </div>
  );
}
