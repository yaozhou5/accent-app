"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "@/app/clock/page.module.css";
import { decodeAudio } from "@/lib/clock/decodeAudio";
import { deleteAllRuns, deleteRun, isDbAvailable, listRuns, saveRun, updateRun } from "@/lib/clock/db";
import { formatClock, isToday } from "@/lib/clock/format";
import { getModelForDevice } from "@/lib/clock/model";
import { hasSeenModelIntro, markModelIntroSeen } from "@/lib/clock/modelIntro";
import { computeStats, mergeForChart } from "@/lib/clock/progress";
import { loadScriptDraft, saveScriptDraft } from "@/lib/clock/scriptDraft";
import type { TranscribeProgress } from "@/lib/clock/transcriberClient";
import { transcribe } from "@/lib/clock/transcriberClient";
import {
  markTranscriptionFinished,
  markTranscriptionStarted,
  takeStaleTranscriptionRunId,
} from "@/lib/clock/transcriptionGuard";
import type { ChartRun, Run, TranscribeState } from "@/lib/clock/types";
import { createClient } from "@/lib/supabase/client";
import { fetchPracticeRuns, syncPracticeRuns } from "@/lib/supabase/practice-runs";
import ModelIntro from "./ModelIntro";
import Recorder, { type FinishedRecording, type RecorderHandle } from "./Recorder";
import RunItem from "./RunItem";
import ScriptStep from "./ScriptStep";
import TimeToPointChart from "./TimeToPointChart";

type SaveFailure = { downloadUrl: string; durationMs: number; errorText: string };

function describeError(err: unknown): string {
  if (err instanceof DOMException || err instanceof Error) return `${err.name}: ${err.message}`;
  return String(err);
}

/** "First rep: 0:41. Latest: 0:13." — only when both ends of the run history have a marked point. */
function repDeltaText(runs: ChartRun[]): string | null {
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
  const [scriptDraft, setScriptDraft] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  // Set once a transcription had to fall back to loading the model without
  // the browser cache (Private Browsing) — otherwise the next session's
  // re-download looks like it's broken for no visible reason.
  const [noCacheNotice, setNoCacheNotice] = useState(false);
  // null = auth state not checked yet. Deliberately not the default —
  // showing "Save your progress" before we know whether someone's already
  // signed in would flash incorrectly for returning users.
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [syncedRuns, setSyncedRuns] = useState<ChartRun[]>([]);
  const idCounter = useRef(0);
  const recorderRef = useRef<RecorderHandle | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth
      .getUser()
      .then(({ data }) => setSignedIn(!!data.user))
      .catch(() => setSignedIn(false));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(!!session?.user));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!signedIn) {
      setSyncedRuns([]);
      return;
    }
    fetchPracticeRuns()
      .then(setSyncedRuns)
      .catch(() => {});
  }, [signedIn]);

  useEffect(() => {
    setDbAvailable(isDbAvailable());
    setIntroSeen(hasSeenModelIntro());
    listRuns()
      .then((loadedRuns) => {
        setRuns(loadedRuns);
        // A run still marked in-flight means the previous attempt never
        // reached its own success/error handling — the tab crashed (iOS
        // OOM) rather than transcription failing normally. Surface that
        // instead of auto-retrying: a crash loop is worse than a failure.
        const staleId = takeStaleTranscriptionRunId();
        const staleRun = staleId ? loadedRuns.find((r) => r.id === staleId) : undefined;
        if (staleRun && !staleRun.transcript) {
          console.error(
            "Transcription for run",
            staleId,
            "was still in progress when the page reloaded — likely a crash. Not auto-retrying."
          );
          setTranscribeStates((s) => ({
            ...s,
            [staleId as string]: {
              phase: "error",
              message: "Didn't finish last time — the tab may have run out of memory. Try again when you're ready.",
            },
          }));
        }
      })
      .catch(() => setRuns([]))
      .finally(() => setLoaded(true));
    loadScriptDraft()
      .then(setScriptDraft)
      .catch(() => {});
  }, []);

  const handleScriptChange = useCallback((text: string) => {
    setScriptDraft(text);
    saveScriptDraft(text).catch(() => {});
  }, []);

  const runTranscription = useCallback(async (run: Run, preDecodedAudio?: Float32Array) => {
    const model = getModelForDevice();
    markTranscriptionStarted(run.id);
    setTranscribeStates((s) => ({ ...s, [run.id]: { phase: "downloading", percent: null, modelLabel: model.label } }));
    try {
      const audio = preDecodedAudio ?? (await decodeAudio(run.blob)).audio;
      const transcript = await transcribe(
        run.id,
        audio,
        model.id,
        (progress: TranscribeProgress) => {
          setTranscribeStates((s) => ({
            ...s,
            [run.id]: {
              phase: "downloading",
              percent: typeof progress.progress === "number" ? Math.round(progress.progress) : null,
              modelLabel: model.label,
            },
          }));
        },
        (usedNoCacheFallback) => {
          setTranscribeStates((s) => ({ ...s, [run.id]: { phase: "transcribing", modelLabel: model.label } }));
          if (usedNoCacheFallback) setNoCacheNotice(true);
        }
      );
      setRuns((prev) => prev.map((r) => (r.id === run.id ? { ...r, transcript } : r)));
      updateRun(run.id, { transcript }).catch(() => {});
      setTranscribeStates((s) => {
        const next = { ...s };
        delete next[run.id];
        return next;
      });
    } catch (err) {
      console.error("Transcription failed for run", run.id, err);
      setTranscribeStates((s) => ({
        ...s,
        [run.id]: { phase: "error", message: err instanceof Error ? err.message : String(err) },
      }));
    } finally {
      markTranscriptionFinished(run.id);
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
        // A copy, not a reference — this run keeps the script as it read at
        // the moment of recording, even if the draft is edited afterwards.
        script: scriptDraft.trim() || null,
      };
      try {
        await saveRun(run);
        setRuns((prev) => [run, ...prev]);
        setSaveFailure(null);
        void runTranscription(run, preDecodedAudio);
      } catch (err) {
        console.error("Failed to save run:", err);
        if (navigator.storage?.estimate) {
          try {
            console.error("Storage estimate at failure:", await navigator.storage.estimate());
          } catch (estErr) {
            console.error("navigator.storage.estimate() failed:", estErr);
          }
        } else {
          console.error("navigator.storage.estimate() is not supported in this browser.");
        }
        setSaveFailure({ downloadUrl: URL.createObjectURL(data.blob), durationMs, errorText: describeError(err) });
      }
    },
    [runTranscription, scriptDraft]
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

  // Completing a run's mark is also the moment it becomes sync-eligible —
  // if signed in, upsert it in the background. Needs the full run (not
  // just id/pointMs) for duration_ms, so this reads `runs` directly rather
  // than using the functional setState form the rest of the file uses.
  const handleMarkPoint = useCallback(
    (id: string, pointMs: number) => {
      const updated = runs.map((r) => (r.id === id ? { ...r, pointMs, pointStatus: "marked" as const } : r));
      setRuns(updated);
      updateRun(id, { pointMs, pointStatus: "marked" }).catch(() => {});
      if (signedIn) {
        const run = updated.find((r) => r.id === id);
        if (run) syncPracticeRuns([run]).catch(() => {});
      }
    },
    [runs, signedIn]
  );

  const handleMarkNone = useCallback(
    (id: string) => {
      const updated = runs.map((r) => (r.id === id ? { ...r, pointMs: null, pointStatus: "none" as const } : r));
      setRuns(updated);
      updateRun(id, { pointMs: null, pointStatus: "none" }).catch(() => {});
      if (signedIn) {
        const run = updated.find((r) => r.id === id);
        if (run) syncPracticeRuns([run]).catch(() => {});
      }
    },
    [runs, signedIn]
  );

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
  // signedIn ? merge with synced runs (may include other devices) : local only.
  // TimeToPointChart never receives synced-only runs unless signed in, so
  // there's no risk of it (or anything else) trying to play one back — the
  // run list below always renders from local `runs` alone, untouched.
  const chartRuns = useMemo(() => (signedIn ? mergeForChart(runs, syncedRuns) : runs), [runs, syncedRuns, signedIn]);
  const stats = useMemo(() => (signedIn ? computeStats(chartRuns) : null), [chartRuns, signedIn]);
  const repDelta = repDeltaText(chartRuns);
  const hasCompletedRun = runs.some((r) => r.pointStatus !== "unmarked");

  return (
    <div ref={topRef}>
      {loaded && todayCount > 0 && <p className={styles.repToday}>Rep {todayCount} today</p>}

      {/* Must never be visible while the timer runs — hidden outright, not just dimmed, the moment recording starts. */}
      {!isRecording && <ScriptStep value={scriptDraft} onChange={handleScriptChange} />}

      {introSeen === false ? (
        <ModelIntro onContinue={handleContinueFromIntro} />
      ) : introSeen === true ? (
        <Recorder ref={recorderRef} onFinished={handleFinished} onRecordingChange={setIsRecording} />
      ) : null}

      <p className={styles.recorderNote}>
        Record yourself explaining your company. Afterwards, pick the sentence where you said what you do. The clock
        shows how long it took you to get there.
      </p>
      <p className={styles.privacyNote}>
        {signedIn
          ? "Recordings, transcripts and scripts stay in this browser — never uploaded. Signed in, so a few numbers about each run (when, how long, how long until you said it) sync to your account across devices."
          : "Everything stays in this browser. Clear your browser data and your runs are gone. Nothing syncs between devices."}
      </p>

      {signedIn === false && hasCompletedRun && (
        <p className={styles.privacyNote}>
          <Link href="/signup?redirect=/practice&utm_source=practice">Save your progress</Link> to keep it across
          devices — still just the numbers, never the recording.
        </p>
      )}

      {!dbAvailable && (
        <p className={styles.warning}>
          This browser doesn’t support saving runs. Recording still works, but nothing will be kept after you leave the
          page.
        </p>
      )}

      {noCacheNotice && (
        <p className={styles.warning}>
          Private Browsing doesn’t let this device save the speech model, so it downloaded fresh this time. Expect
          another download next session.
        </p>
      )}

      {saveFailure && (
        <div className={styles.warning}>
          <p>
            Couldn’t save that {Math.floor(saveFailure.durationMs / 1000)}-second run — {saveFailure.errorText}
          </p>
          <a href={saveFailure.downloadUrl} download="accent-clock-run.webm">
            Download the recording instead
          </a>
        </div>
      )}

      {loaded && chartRuns.length >= 2 && (
        <div className={styles.card}>
          <p className={styles.step}>Time until you said what you do</p>
          <TimeToPointChart runs={chartRuns} />
          {repDelta && <p className={styles.repDelta}>{repDelta}</p>}
          {stats && (
            <p className={styles.repDelta}>
              {stats.daysPracticed} day{stats.daysPracticed === 1 ? "" : "s"} practised
              {stats.bestTimeMs !== null && <> · best {formatClock(stats.bestTimeMs)}</>}
            </p>
          )}
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
              onGoAgain={handleGoAgain}
            />
          ))}
        </div>
      )}
    </div>
  );
}
