import type { Metadata } from "next";
import Link from "next/link";
import { CookieSettingsButton } from "@/components/CookieSettingsButton";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Terms — Accent",
};

export default function TermsPage() {
  return (
    <div className="accent-legacy">
      <div className={styles.wrap}>
        <nav>
          <div className={styles.in}>
            <Link className={styles.word} href="/">
              Acc<em>e</em>nt
            </Link>
            <span className={styles.sp}></span>
            <Link className={styles.back} href="/">
              Back
            </Link>
          </div>
        </nav>

        <h1>Terms</h1>
        <p className={styles.sub}>Last updated 27 September 2026</p>

        <h2>Who you&apos;re dealing with</h2>
        <p>
          Dutch law requires a business website to show this. Our company registration details are in the footer of this
          page.
        </p>

        <h2>What Accent is</h2>
        <p>
          A writing tool. It helps you turn your thoughts into clearer writing while keeping your words, meaning and
          personality, and it shows you what it changed.
        </p>
        <p>
          It is early software. Features are incomplete, things break, and the product may change substantially or stop
          existing. Where the site says something is being built, it isn&apos;t finished yet.
        </p>

        <h2>What it isn&apos;t</h2>
        <p>
          It isn&apos;t a ghostwriter. Suggestions are only suggestions. You decide what stays, and you&apos;re
          responsible for what you publish.
        </p>

        <h2>Your content</h2>
        <p>
          What you write stays yours. We don&apos;t claim any rights to it and we don&apos;t use it to train AI models.
          We only process it to give you suggestions, as described in the privacy page.
        </p>

        <h2>Using it decently</h2>
        <p>
          Please don&apos;t: upload anything unlawful, abusive or infringing, send confidential material you aren&apos;t
          entitled to share, or use the service to harass anyone.
        </p>
        <p>We can suspend access if any of this is breached.</p>

        <h2>Cost</h2>
        <p>
          Accent is free while it is in early access. If we introduce paid plans, we&apos;ll tell you in advance, and
          you will never be charged unless you choose a plan yourself.
        </p>

        <h2>Availability and liability</h2>
        <p>The service is provided as is. We don&apos;t promise it will be available, accurate, or free of faults.</p>
        <p>
          To the extent the law allows, we aren&apos;t liable for indirect or consequential loss, including lost
          funding, lost revenue or lost opportunity. Nothing here limits liability for death or personal injury, fraud,
          or anything else that can&apos;t be limited by law. If you&apos;re a consumer, your statutory rights under
          Dutch and EU law are unaffected by anything on this page.
        </p>
        <p>
          Our total liability to you is limited to the amount you paid us in the 12 months before the claim, or €100 if
          you paid nothing. This does not limit liability for intent or gross negligence, or anything else that cannot
          be limited under Dutch law.
        </p>

        <h2>Ending it</h2>
        <p>
          Stop using it whenever you like. Ask us to delete your data and we will — see{" "}
          <Link href="/privacy">Privacy</Link>.
        </p>

        <h2>Changes</h2>
        <p>
          These terms may change. Material changes will be announced by email to anyone on the list, with the date at
          the top updated.
        </p>

        <h2>Law and disputes</h2>
        <p>
          Dutch law applies, and disputes go to the competent court in Rechtbank Midden-Nederland. If you&apos;re a
          consumer in the EU, you keep the protection of your own country&apos;s mandatory consumer law and can bring a
          claim there. You can also use the European Commission&apos;s{" "}
          <a href="https://ec.europa.eu/consumers/odr">online dispute resolution platform</a>.
        </p>

        <footer>
          <div className={styles.footerLinks}>
            <span>Accent</span>
            <Link href="/privacy">Privacy</Link>
            <Link href="/">Home</Link>
            <a href="mailto:hello@myaccent.io">hello@myaccent.io</a>
            <CookieSettingsButton />
          </div>
          <p className={styles.legal}>
            Accent is the trading name registered with the Dutch Chamber of Commerce (KvK) under number 98500562. The
            registered address is held in the KvK register. Contact: hello@myaccent.io.
          </p>
        </footer>
      </div>
    </div>
  );
}
