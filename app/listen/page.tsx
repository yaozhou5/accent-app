import type { Metadata } from "next";
import Link from "next/link";
import ListenTask from "@/components/ListenTask";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Listen — Accent",
};

export default function ListenPage() {
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

        <h1>Listen to sixty seconds.</h1>
        <p className={styles.lede}>
          A founder recorded this explaining their company. Play it once — no replays — and tell them what you
          understood. That’s the whole thing.
        </p>

        <ListenTask />

        <div className={styles.rules}>
          <ul>
            <li>Once through, at normal speed. Investors don’t rewind either.</li>
            <li>Don’t look the company up. Not knowing is the point.</li>
            <li>Don’t give advice unless you want to. What you understood is the valuable part.</li>
            <li>Don’t record, share or repost what you heard.</li>
          </ul>
        </div>

        <footer>
          <span>Accent</span>
          <Link href="/privacy">Privacy</Link>
          <Link href="/">Home</Link>
        </footer>
      </div>
    </div>
  );
}
