"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/app/clock/page.module.css";
import { formatClock } from "@/lib/clock/format";
import type { Run } from "@/lib/clock/types";
import ListenTimeline from "./ListenTimeline";

export default function RunListen({
  run,
  audioUrl,
  onAddMark,
  onDoneListening,
}: {
  run: Run;
  audioUrl: string;
  onAddMark: (ms: number) => void;
  onDoneListening: () => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMs, setCurrentMs] = useState(0);

  // The listener-setup effect below only runs once (see its own comment),
  // so `ended` must call through a ref, not the prop directly — otherwise
  // it permanently captures whatever onDoneListening was at mount, before
  // this run had any marks. No dependency array — kept current after every
  // render, not just when onDoneListening's identity changes.
  const onDoneListeningRef = useRef(onDoneListening);
  useEffect(() => {
    onDoneListeningRef.current = onDoneListening;
  });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handleTimeUpdate = () => setCurrentMs(audio.currentTime * 1000);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      onDoneListeningRef.current();
    };
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
    // Runs once — attaching directly to the audio element's own events,
    // not to a value that changes per render, so there's nothing here that
    // should ever need to re-subscribe.
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  };

  const handleMark = () => {
    const audio = audioRef.current;
    if (!audio) return;
    onAddMark(audio.currentTime * 1000);
  };

  return (
    <div className={styles.card}>
      <p className={styles.step}>Listen back</p>
      {/* No transcript here on purpose — this step is about hearing it, not reading it. */}
      <audio ref={audioRef} preload="auto" src={audioUrl} className={styles.listenAudio} />
      <ListenTimeline
        durationMs={run.durationMs}
        currentMs={currentMs}
        marks={run.marks}
        pointMs={run.pointStatus === "marked" ? run.pointMs : null}
      />
      <p className={styles.listenHint}>
        {formatClock(currentMs)} / {formatClock(run.durationMs)} · {run.marks.length} mark
        {run.marks.length === 1 ? "" : "s"} placed
      </p>
      <div className={styles.listenControls}>
        <button type="button" className={styles.btn} onClick={togglePlay}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button type="button" className={styles.markBtn} onClick={handleMark}>
          Mark
        </button>
      </div>
      <div className={styles.goAgainRow}>
        <button type="button" className={styles.quietLink} onClick={onDoneListening}>
          Done listening
        </button>
      </div>
    </div>
  );
}
