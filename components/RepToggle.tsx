"use client";

import { useState } from "react";
import styles from "@/app/page.module.css";

type RepKey = "r1" | "r12";

const DATA: Record<RepKey, { text: string; timeTo: string; total: string; namedCount: string }> = {
  r1: {
    text: "We're building an intelligent routing layer for last-mile delivery, with a real-time optimisation engine and a dispatcher dashboard, and there's also a driver app that we use as a proving ground for the algorithm.",
    timeTo: "1:14",
    total: "2:51",
    namedCount: "3",
  },
  r12: {
    text: "Courier companies lose money on badly planned routes. We plan them. 4 firms in Utrecht run their morning drops on it.",
    timeTo: "0:06",
    total: "0:19",
    namedCount: "1",
  },
};

export default function RepToggle() {
  const [active, setActive] = useState<RepKey>("r1");
  const data = DATA[active];

  return (
    <>
      <div className={styles.tabs}>
        <button aria-pressed={active === "r1"} onClick={() => setActive("r1")}>
          Rep 1
        </button>
        <button aria-pressed={active === "r12"} onClick={() => setActive("r12")}>
          Rep 12
        </button>
      </div>
      <p className={styles.answer}>{data.text}</p>
      <div className={styles.stats}>
        <span>
          Time to &quot;what you do&quot; <b>{data.timeTo}</b>
        </span>
        <span>
          Total <b>{data.total}</b>
        </span>
        <span>
          Things named <b>{data.namedCount}</b>
        </span>
      </div>
    </>
  );
}
