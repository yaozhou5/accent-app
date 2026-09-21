import type { Metadata } from "next";
import Link from "next/link";
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
        <p className={styles.sub}>
          Last updated <span className={styles.fill}>[date]</span>
        </p>

        <div className={styles.note}>
          <p>
            Draft for review. Everything marked in red needs your real details, and this should be checked by someone
            qualified before launch — it is not legal advice.
          </p>
        </div>

        <h2>Who you&apos;re dealing with</h2>
        <div className={styles.idbox}>
          <dl>
            <dt>Trading name</dt>
            <dd>Accent</dd>
            <dt>Legal entity</dt>
            <dd>
              <span className={styles.fill}>[entity name and form, e.g. eenmanszaak / B.V.]</span>
            </dd>
            <dt>KvK number</dt>
            <dd>
              <span className={styles.fill}>[number]</span>
            </dd>
            <dt>VAT (BTW) number</dt>
            <dd>
              <span className={styles.fill}>[number, if registered]</span>
            </dd>
            <dt>Address</dt>
            <dd>
              <span className={styles.fill}>[registered address]</span>
            </dd>
            <dt>Email</dt>
            <dd>
              <span className={styles.fill}>[hello@yourdomain]</span>
            </dd>
          </dl>
        </div>
        <p>
          Dutch law requires a business website to show this. It&apos;s also just useful to know there&apos;s a real
          person and a real address behind the thing you&apos;re using.
        </p>

        <h2>What Accent is</h2>
        <p>
          A tool for practising how you explain your work out loud. It records you, times you, and — if you ask it to —
          sends a sixty-second recording to people who answer one question about what they understood.
        </p>
        <p>
          It is early software. Features are incomplete, things break, and the product may change substantially or stop
          existing. Where the site says something is being built, it isn&apos;t finished yet.
        </p>

        <h2>What it isn&apos;t</h2>
        <p>
          Accent gives you other people&apos;s reactions and some measurements of your own speech. It does not give
          investment, financial, legal or business advice, and nothing it returns is a prediction about whether
          you&apos;ll raise money or a judgement of your business. What you do with any of it is your decision.
        </p>

        <h2>Your recordings</h2>
        <p>
          Your recordings are yours. We claim no ownership of them and no licence to use them beyond what&apos;s needed
          to do the thing you asked for — playing a sixty-second clip to the listeners you requested, and returning
          their answers to you.
        </p>
        <p>We don&apos;t use your recordings, transcripts or anything you say to train machine-learning models.</p>
        <p>
          Recordings are stored on your device. If you clear your browser data or lose the device, they&apos;re gone and
          we can&apos;t get them back.
        </p>

        <h2>Using it decently</h2>
        <p>
          Please don&apos;t: send recordings of anyone who hasn&apos;t agreed to it, upload anything unlawful, abusive
          or infringing, send confidential material you aren&apos;t entitled to share, try to identify or contact
          listeners without their agreement, or use the service to harass anyone.
        </p>
        <p>
          If you listen to someone else&apos;s recording, don&apos;t record it, republish it, or share what you heard.
          People are sending unfinished work to strangers in good faith and the whole thing depends on that holding.
        </p>
        <p>We can suspend access if any of this is breached.</p>

        <h2>Cost</h2>
        <p>
          <span className={styles.fill}>
            [Free during this phase. If and when there&apos;s a price, describe it here — amount, what&apos;s included,
            VAT treatment, how to cancel. Paid consumer services in the EU also need a 14-day withdrawal right unless
            the customer expressly waives it for immediately delivered digital content.]
          </span>
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
          <span className={styles.fill}>
            [If you introduce paid plans, add a liability cap — commonly the amount paid in the preceding 12 months.]
          </span>
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
          Dutch law applies, and disputes go to the competent court in <span className={styles.fill}>[district]</span>.
          If you&apos;re a consumer in the EU, you keep the protection of your own country&apos;s mandatory consumer law
          and can bring a claim there. You can also use the European Commission&apos;s{" "}
          <a href="https://ec.europa.eu/consumers/odr">online dispute resolution platform</a>.
        </p>

        <footer>
          <span>Accent</span>
          <Link href="/privacy">Privacy</Link>
          <Link href="/">Home</Link>
          <a href="mailto:hello@myaccent.io">hello@myaccent.io</a>
        </footer>
      </div>
    </div>
  );
}
