import type { ReactNode } from "react";
import Link from "next/link";
import { CookieSettingsButton } from "@/components/CookieSettingsButton";
import styles from "./LegalShell.module.css";

// Header and footer for the Privacy and Terms pages, matching the homepage.
export function LegalShell({ children, legal }: { children: ReactNode; legal: ReactNode }) {
  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <div className={styles.navIn}>
          <Link className={styles.logo} href="/">
            accent
          </Link>
          <Link className={styles.home} href="/">
            Home
          </Link>
        </div>
      </header>
      <main className={styles.wrap}>{children}</main>
      <footer className={styles.foot}>
        <div className={styles.footIn}>
          <Link className={styles.logo} href="/">
            accent
          </Link>
          <nav className={styles.footNav} aria-label="Footer">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <a href="mailto:hello@myaccent.io">Contact</a>
            <CookieSettingsButton />
          </nav>
        </div>
        <p className={styles.legal}>{legal}</p>
      </footer>
    </div>
  );
}

export { styles as legalStyles };
