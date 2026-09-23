import type { Metadata } from "next";
import Link from "next/link";
import ClockApp from "@/components/clock/ClockApp";
import styles from "@/app/clock/page.module.css";

export const metadata: Metadata = {
  title: "Practice — Accent",
  description: "Record, and see how long it takes you to say what you do.",
};

export default function PracticePage() {
  return (
    <div className="accent-legacy">
      <div className={styles.wrap}>
        <nav>
          <div className={styles.in}>
            <Link className={styles.word} href="/">
              Acc<em>e</em>nt
            </Link>
          </div>
        </nav>

        <h1>Practice.</h1>

        <ClockApp />

        <footer>
          <span>Accent</span>
          <Link href="/privacy">Privacy</Link>
          <Link href="/">Home</Link>
        </footer>
      </div>
    </div>
  );
}
