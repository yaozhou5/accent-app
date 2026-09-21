import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Privacy — Accent",
};

export default function PrivacyPage() {
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

        <h1>Privacy</h1>
        <p className={styles.sub}>
          Last updated <span className={styles.fill}>[date]</span>
        </p>

        <div className={styles.note}>
          <p>
            Draft for review. Everything marked in red needs your real details, and this should be checked by someone
            qualified before launch — it is not legal advice.
          </p>
        </div>

        <p>
          Accent helps people practise explaining what they do. Most of it runs on your own device and never reaches us.
          This page explains the parts that do, what happens to them, and how to make us stop.
        </p>

        <h2>Who is responsible</h2>
        <p>
          The controller of your personal data is <span className={styles.fill}>[legal entity name]</span>, registered
          in the Netherlands, Chamber of Commerce (KvK) number <span className={styles.fill}>[KvK number]</span>, at{" "}
          <span className={styles.fill}>[registered address]</span>.
        </p>
        <p>
          For anything on this page, write to <span className={styles.fill}>[privacy@yourdomain]</span>. A person reads
          it, and that person is currently me.
        </p>

        <h2>What stays on your device</h2>
        <p>
          Your recordings are stored locally in your browser or on your phone. The clock, the transcript and the repeat
          check all run there. We do not receive that audio, cannot listen to it, and cannot recover it for you if you
          clear your browser data or lose the device.
        </p>
        <p>
          A recording only leaves your device if you choose to send it to listeners. Nothing is uploaded in the
          background.
        </p>

        <h2>What we process, and why</h2>
        <table>
          <tbody>
            <tr>
              <th>Data</th>
              <th>Why</th>
              <th>Legal basis</th>
              <th>Kept</th>
            </tr>
            <tr>
              <td>Your email address</td>
              <td>To reply to you, send access, and let you know about the product</td>
              <td>Consent (Art. 6(1)(a)) — or performance of a contract where you&apos;re a customer</td>
              <td>Until you ask us to remove it</td>
            </tr>
            <tr>
              <td>A sixty-second recording you choose to send</td>
              <td>To play it to the listeners you asked for and return their answers to you</td>
              <td>Consent (Art. 6(1)(a))</td>
              <td>
                <span className={styles.fill}>[30 days]</span>, or until you delete it
              </td>
            </tr>
            <tr>
              <td>Listener answers</td>
              <td>To show you what people understood</td>
              <td>Consent (Art. 6(1)(a))</td>
              <td>With your recording, on the same schedule</td>
            </tr>
            <tr>
              <td>Basic server logs</td>
              <td>Keeping the site up and secure</td>
              <td>Legitimate interest (Art. 6(1)(f))</td>
              <td>
                <span className={styles.fill}>[30 days]</span>
              </td>
            </tr>
          </tbody>
        </table>

        <h3>A note about voices</h3>
        <p>
          A recording of you speaking is personal data — your voice identifies you, and what you say may identify your
          company. That&apos;s why sending is a deliberate, separate step, why only the sixty seconds can be sent, and
          why you can delete it at any time. Do not send a recording containing anything confidential.
        </p>

        <h3>If you are a listener</h3>
        <p>
          When you listen to someone&apos;s sixty seconds, your answer is shown to that person. We show it{" "}
          <span className={styles.fill}>[without your name / with the name you give]</span>. You are hearing someone
          else&apos;s material — please don&apos;t record it, share it, or pass it on.
        </p>

        <h2>Who else sees it</h2>
        <p>
          We use a small number of service providers who process data on our behalf under data processing agreements:
        </p>
        <ul>
          <li>
            <span className={styles.fill}>[Hosting provider, country]</span> — running the site
          </li>
          <li>
            <span className={styles.fill}>[Email provider, country]</span> — sending and receiving email
          </li>
          <li>
            <span className={styles.fill}>[Analytics provider, or &quot;none&quot;]</span>
          </li>
        </ul>
        <p>
          We do not sell personal data, and we do not use your recordings or anything you say to train machine-learning
          models.
        </p>
        <p>
          Where a provider is outside the European Economic Area, transfers are covered by the European
          Commission&apos;s Standard Contractual Clauses or an adequacy decision.{" "}
          <span className={styles.fill}>[List which, or delete this paragraph if all providers are in the EEA.]</span>
        </p>

        <h2>Cookies</h2>
        <p>
          <span className={styles.fill}>
            [If you use only what is strictly necessary, say so here and you need no banner. If you add analytics or
            anything that tracks, you need consent before it loads, and a banner that makes refusing as easy as
            accepting.]
          </span>
        </p>
        <p>
          Local storage on your device — where your recordings and settings live — is not a cookie in the tracking sense
          and is never read by us.
        </p>

        <h2>Your rights</h2>
        <p>
          Under the GDPR you can ask us to: give you a copy of your data, correct it, delete it, restrict what we do
          with it, hand it over in a portable format, or object to processing based on legitimate interest. Where we
          rely on consent, you can withdraw it at any time — that doesn&apos;t affect what happened before you withdrew
          it.
        </p>
        <p>
          Email <span className={styles.fill}>[privacy@yourdomain]</span>
          {" and we'll respond within one month. There's no charge."}
        </p>
        <p>
          If you think we&apos;ve handled your data badly, you can complain to the Dutch data protection authority, the{" "}
          <a href="https://autoriteitpersoonsgegevens.nl/">Autoriteit Persoonsgegevens</a>, or to the authority in the
          EU country where you live.
        </p>

        <h2>Children</h2>
        <p>
          Accent is for adults working on a business. It isn&apos;t directed at children and we don&apos;t knowingly
          collect their data.
        </p>

        <h2>Security</h2>
        <p>
          Data in transit is encrypted. Access to anything stored is limited to{" "}
          <span className={styles.fill}>[who]</span>. No system is perfectly secure, which is the other reason the
          recordings stay on your device by default.
        </p>

        <h2>Changes</h2>
        <p>
          If this page changes in a way that matters, we&apos;ll update the date at the top and tell anyone on the list
          by email.
        </p>

        <footer>
          <span>Accent</span>
          <Link href="/terms">Terms</Link>
          <Link href="/">Home</Link>
          <a href="mailto:hello@myaccent.io">hello@myaccent.io</a>
        </footer>
      </div>
    </div>
  );
}
