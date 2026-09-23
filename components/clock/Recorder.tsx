"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import styles from "@/app/clock/page.module.css";
import { formatClock } from "@/lib/clock/format";
import { MAX_RECORDING_MS, TARGET_MS, isRecordingSupported, pickAudioMimeType } from "@/lib/clock/recording";

export type FinishedRecording = {
  blob: Blob;
  mimeType: string;
  /** Timer-based estimate, used only if the blob can't be decoded afterwards. */
  fallbackDurationMs: number;
};

export type RecorderHandle = {
  /** Starts a new recording, as if the record button was tapped. No-ops if already recording. */
  start: () => void;
};

type Status = "unsupported" | "idle" | "requesting" | "denied" | "recording" | "error";

const Recorder = forwardRef<
  RecorderHandle,
  { onFinished: (run: FinishedRecording) => void; onRecordingChange?: (isRecording: boolean) => void }
>(function Recorder({ onFinished, onRecordingChange }, ref) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isRecordingSupported()) setStatus("unsupported");
  }, []);

  // Lets the parent (ClockApp) hide anything that must never be visible
  // mid-recording — the script step, in particular — without it having to
  // know anything about this component's internal status machine.
  useEffect(() => {
    onRecordingChange?.(status === "recording");
  }, [status, onRecordingChange]);

  const stopTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }, []);

  useEffect(() => {
    return () => {
      stopTimer();
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [stopTimer]);

  const start = useCallback(async () => {
    // Guards against "Go again" (or a doubled click) re-entering while a
    // recording is already in flight — anything else (idle, denied, error)
    // is a legitimate place to (re)start from, same as the "Try again" button.
    if (status === "recording" || status === "requesting") return;

    setErrorMessage(null);
    setStatus("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickAudioMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      setElapsedMs(0);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stopTimer();
        const fallbackDurationMs = performance.now() - startedAtRef.current;
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType || "audio/webm" });
        setStatus("idle");
        setElapsedMs(0);
        onFinished({ blob, mimeType: recorder.mimeType || mimeType || "", fallbackDurationMs });
      };

      recorder.start();
      startedAtRef.current = performance.now();
      setStatus("recording");

      intervalRef.current = setInterval(() => {
        const elapsed = performance.now() - startedAtRef.current;
        setElapsedMs(elapsed);
        if (elapsed >= MAX_RECORDING_MS) stop();
      }, 200);
    } catch (err) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setElapsedMs(0);
      if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "SecurityError")) {
        setStatus("denied");
      } else {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Couldn't start recording.");
      }
    }
  }, [status, onFinished, stop, stopTimer]);

  useImperativeHandle(ref, () => ({ start }), [start]);

  if (status === "unsupported") {
    return (
      <div className={styles.card}>
        <p className={styles.recorderState}>
          This browser can’t record audio. Try the latest Chrome, Safari, or Firefox.
        </p>
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className={styles.card}>
        <p className={styles.recorderState}>
          Microphone access was denied. Allow it in your browser’s site settings, then reload the page.
        </p>
        <button className={styles.btn} onClick={start}>
          Try again
        </button>
      </div>
    );
  }

  // Icon, label, and timer all read from this one value, so they can never
  // drift out of sync with each other — and the timer always reads 0:00
  // whenever we're not actually recording.
  const isRecording = status === "recording";
  const displayedElapsedMs = isRecording ? elapsedMs : 0;
  const pastTarget = isRecording && elapsedMs >= TARGET_MS;
  const idleLabel = status === "requesting" ? "Requesting microphone…" : "Tap to record";

  return (
    <div className={styles.card}>
      <div className={styles.recorder}>
        <button
          className={`${styles.recordBtn} ${isRecording ? styles.recording : ""}`}
          onClick={isRecording ? stop : start}
          disabled={status === "requesting"}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
        >
          <span className={styles.recordDot} />
        </button>

        <div className={styles.recorderInfo}>
          <span className={`${styles.timer} ${pastTarget ? styles.timerPast : ""}`}>
            {formatClock(displayedElapsedMs)}
          </span>
          {!isRecording && <span className={styles.timerNote}>{idleLabel}</span>}
        </div>
      </div>

      {errorMessage && <p className={styles.recorderError}>{errorMessage}</p>}
    </div>
  );
});

export default Recorder;
