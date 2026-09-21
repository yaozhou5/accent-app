"use client";

import { useEffect, useRef, useState } from "react";
import styles from "@/app/page.module.css";

const RING_CIRCUMFERENCE = 540.35;
const REDUCED_MOTION_END = 171;
const RAMP_DURATION_MS = 9000;
const HOLD_DURATION_MS = 3200;

function formatTime(t: number) {
  const s = Math.floor(t);
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

type WaveBar = { height: number; delay: number; duration: number };

export default function HeroDevice() {
  const progRef = useRef<SVGCircleElement>(null);
  const timerRef = useRef<HTMLSpanElement>(null);
  const chipRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLParagraphElement>(null);

  // Starts empty and fills in from an effect, not a lazy initializer —
  // Math.random() run during the initial render would produce different
  // values on the server (during SSR) and the client (during hydration),
  // which is a real hydration mismatch, not just a cosmetic one. Deferring
  // to an effect means Math.random() only ever runs client-side, after
  // hydration, matching how the original script (a plain <script> tag
  // that never touched the server) generated these bars.
  const [bars, setBars] = useState<WaveBar[]>([]);

  useEffect(() => {
    setBars(
      Array.from({ length: 26 }, () => ({
        height: 14 + Math.random() * 30,
        delay: Math.random() * -1,
        duration: 0.7 + Math.random() * 0.7,
      }))
    );

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function draw(t: number) {
      const timer = timerRef.current;
      const prog = progRef.current;
      const chip = chipRef.current;
      const flash = flashRef.current;
      if (!timer || !prog || !chip || !flash) return;

      timer.textContent = formatTime(t);
      const over = t > 60;
      const frac = over ? 1 : t / 60;
      prog.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - frac));
      prog.classList.toggle(styles.over, over);
      timer.classList.toggle(styles.over, over);

      chip.className = styles.chip;
      if (t < 74) {
        chip.textContent = "Problem";
      } else if (t < 96) {
        chip.textContent = "What you do";
        chip.classList.add(styles.what);
      } else if (t < 107) {
        chip.textContent = "Proof";
        chip.classList.add(styles.what);
      } else {
        chip.textContent = "Over time";
        chip.classList.add(styles.over);
      }
      flash.classList.toggle(styles.on, t >= 74);
    }

    let rafId: number | null = null;

    if (reduce) {
      // Static end state, no loop — same values the loop would eventually
      // settle on, just drawn once.
      draw(REDUCED_MOTION_END);
    } else {
      let start: number | null = null;
      const frame = (ts: number) => {
        if (start === null) start = ts;
        const elapsed = ts - start;
        if (elapsed <= RAMP_DURATION_MS) {
          draw((REDUCED_MOTION_END * elapsed) / RAMP_DURATION_MS);
        } else if (elapsed <= RAMP_DURATION_MS + HOLD_DURATION_MS) {
          draw(REDUCED_MOTION_END);
        } else {
          start = ts;
          draw(0);
        }
        rafId = requestAnimationFrame(frame);
      };
      rafId = requestAnimationFrame(frame);
    }

    // The "last run" timeline card is a sibling element in page.tsx, not
    // part of this component's own tree — but its scroll-in reveal needs
    // the same reduced-motion check this effect already made, so it's
    // wired up here (via id, matching the original script) rather than
    // duplicating that check in a second component.
    const lastrun = document.getElementById("lastrun");
    let observer: IntersectionObserver | null = null;
    if (lastrun) {
      if (reduce || !("IntersectionObserver" in window)) {
        lastrun.classList.add(styles.in);
      } else {
        observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                lastrun.classList.add(styles.in);
                observer?.disconnect();
              }
            });
          },
          { threshold: 0.35 }
        );
        observer.observe(lastrun);
      }
    }

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      observer?.disconnect();
    };
  }, []);

  return (
    <div className={styles.herodevice} aria-hidden="true">
      <div className={styles.glow}></div>
      <div className={styles.phone}>
        <div className={styles.screen}>
          <div className={styles.sbar}>
            <span>9:41</span>
            <span className={styles.notch}></span>
            <span>●●●</span>
          </div>
          <p className={styles.prompt}>What does your company do?</p>
          <div className={styles.ringwrap}>
            <svg viewBox="0 0 200 200" className={styles.ring}>
              <circle cx="100" cy="100" r="86" className={styles.track} />
              <circle ref={progRef} cx="100" cy="100" r="86" className={styles.prog} />
              <line x1="100" y1="6" x2="100" y2="22" className={styles.tick} />
            </svg>
            <div className={styles.ringin}>
              <span ref={timerRef} className={styles.timer}>
                0:00
              </span>
              <span className={styles.of}>target 1:00</span>
            </div>
          </div>
          <div ref={chipRef} className={styles.chip}>
            Problem
          </div>
          <div className={styles.wave}>
            {bars.map((bar, i) => (
              <i
                key={i}
                style={{
                  height: `${bar.height}px`,
                  animationDelay: `${bar.delay}s`,
                  animationDuration: `${bar.duration}s`,
                }}
              />
            ))}
          </div>
          <p ref={flashRef} className={styles.flash}>
            Got to the point at 1:14
          </p>
          <div className={styles.recbtn}>
            <span></span>
          </div>
        </div>
      </div>
    </div>
  );
}
