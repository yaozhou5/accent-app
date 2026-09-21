"use client";

import { useState } from "react";
import styles from "@/app/listen/page.module.css";

export default function ListenTask() {
  const [plays, setPlays] = useState(0);
  const [answer, setAnswer] = useState("");
  const [wonder, setWonder] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const canSend = answer.trim().length >= 2;

  async function handleSend() {
    await fetch("/api/listen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer, wonder, plays }),
    });
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (submitted) {
    return (
      <div className={`${styles.card} ${styles.done}`}>
        <h2>Sent. Thank you.</h2>
        <p>
          That’s more useful to them than it probably felt. They’ll see it alongside four other people’s answers,
          without your name attached.
        </p>
        <p style={{ marginBottom: 0 }}>
          If you want the same done for your own sixty seconds, <a href="/">start here</a>.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.card}>
        <p className={styles.step}>Step 1 · Play it once</p>
        <audio controls preload="none" src="/clips/example.m4a" onPlay={() => setPlays((n) => n + 1)}>
          Your browser can’t play audio. <a href="/clips/example.m4a">Download the clip</a> instead.
        </audio>
        <p className={styles.meta}>58 seconds · played {plays} times</p>
      </div>

      <div className={styles.card} style={{ marginTop: 16 }}>
        <p className={styles.step}>Step 2 · One question</p>
        <p className={styles.q}>What does this company do?</p>
        <p className={styles.hint}>
          In your own words, however unsure. “I don’t know” is a real answer and an useful one — don’t guess to be
          polite.
        </p>
        <textarea placeholder="They…" value={answer} onChange={(e) => setAnswer(e.target.value)} />
        <p className={styles.q} style={{ marginTop: 22 }}>
          Anything you were left wondering?
        </p>
        <p className={styles.hint}>Optional. One line is plenty.</p>
        <textarea
          style={{ minHeight: 70 }}
          placeholder="I wasn’t sure…"
          value={wonder}
          onChange={(e) => setWonder(e.target.value)}
        />
        <button className={styles.btn} disabled={!canSend} onClick={handleSend}>
          Send it back
        </button>
      </div>
    </div>
  );
}
