import type { Metadata } from "next";
import Link from "next/link";
import { CookieSettingsButton } from "@/components/CookieSettingsButton";
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
        <p className={styles.sub}>Last updated 28 September 2026</p>

        <p>
          Accent helps you write and speak about your work in your own voice. Some of it runs entirely on your device.
          Some of it has to reach our servers and a few service providers to work. This page says which is which, what
          happens to your data, and how to make us stop.
        </p>
        <p>
          For anything on this page, write to hello@myaccent.io. A person reads it, and that person is currently me.
        </p>

        <h2>What stays on your device</h2>
        <p>
          Practice runs in your browser. Your recordings, their transcripts and your practice script are stored on your
          device and never sent to us. We cannot listen to them, and we cannot recover them if you clear your browser
          data or lose the device.
        </p>
        <p>
          To transcribe on your device, your browser downloads a speech-recognition model from Hugging Face the first
          time you practise, and on some iPhones each time. That download tells Hugging Face your IP address and browser
          type, like any file download. No audio or text is sent.
        </p>
        <p>
          Your browser also keeps a few things so the site works. These are unsent notes in the compose box and, if you
          take the voice quiz before signing up, your quiz answers. When you sign up, those answers are saved to your
          account. Nothing else stored on your device is read by us.
        </p>
        <p>
          If you use the practice page and choose to save your progress, a few numbers about each practice — when it
          happened, how long it took, how long until you said what you do, and, if you selected any challenge chips,
          which ones and which you met — are sent to our server so you can see your progress over time. The recording
          and transcript themselves never are.
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
              <td>Your email address and login session</td>
              <td>To create your account and sign you in</td>
              <td>Contract (Art. 6(1)(b))</td>
              <td>Until you delete your account</td>
            </tr>
            <tr>
              <td>How you found us (referring page, campaign tags)</td>
              <td>To know which channels bring people</td>
              <td>Legitimate interest (Art. 6(1)(f))</td>
              <td>Until you delete your account</td>
            </tr>
            <tr>
              <td>
                What you write in Accent: drafts, notes, images you upload, your voice-quiz answers and voice profile
              </td>
              <td>To provide the tool</td>
              <td>Contract (Art. 6(1)(b))</td>
              <td>Until you delete it or your account</td>
            </tr>
            <tr>
              <td>
                Practice run stats (timestamp, duration, time-to-point, which challenge chips you selected and which you
                met) — only if you save your progress
              </td>
              <td>To show your practice history over time</td>
              <td>Contract (Art. 6(1)(b))</td>
              <td>Until you delete your account</td>
            </tr>
            <tr>
              <td>Results of AI features: reviews, coaching and learned writing patterns</td>
              <td>So you can come back to them without regenerating</td>
              <td>Contract (Art. 6(1)(b))</td>
              <td>Until you delete your account</td>
            </tr>
            <tr>
              <td>
                Usage records of AI features (which feature, how much, when; no text), and error details, which can
                include part of a generated result
              </td>
              <td>To keep costs under control and fix failures</td>
              <td>Legitimate interest (Art. 6(1)(f))</td>
              <td>90 days, then deleted automatically</td>
            </tr>
            <tr>
              <td>Contact, waitlist and interest forms</td>
              <td>To reply to you</td>
              <td>Consent (Art. 6(1)(a))</td>
              <td>Until you ask us to remove it</td>
            </tr>
            <tr>
              <td>Links you paste into a note</td>
              <td>
                To show a preview. For YouTube and Vimeo links, the link is sent to them to fetch the title and
                thumbnail
              </td>
              <td>Contract (Art. 6(1)(b))</td>
              <td>With the note</td>
            </tr>
            <tr>
              <td>Analytics without cookies (pages viewed, buttons clicked)</td>
              <td>To see which parts of the site work</td>
              <td>Legitimate interest (Art. 6(1)(f))</td>
              <td>Up to 1 year</td>
            </tr>
            <tr>
              <td>Session recordings, and linking analytics to your account</td>
              <td>To see where people get stuck</td>
              <td>Consent (Art. 6(1)(a)); only if you accept</td>
              <td>Recordings 30 days; other analytics up to 1 year</td>
            </tr>
            <tr>
              <td>Server logs</td>
              <td>Keeping the site up and secure</td>
              <td>Legitimate interest (Art. 6(1)(f))</td>
              <td>1 hour</td>
            </tr>
          </tbody>
        </table>

        <h2>When you use an AI feature</h2>
        <p>
          When you ask Accent to review, coach, suggest or generate, the text involved is sent to Anthropic, which runs
          the AI model. That can include your draft or note, your voice profile and short excerpts of your past drafts,
          and, if you select an AI-checked practice chip, that run&apos;s transcript — to check whether you met the
          chip, not stored by us. Your email address and account ID are never sent.
        </p>
        <p>
          Anthropic processes this under its commercial terms, which do not allow it to train models on your content. We
          do not use what you write to train models either.
        </p>

        <h2>Analytics and cookies</h2>
        <p>
          By default, Accent measures visits without cookies and without storing anything on your device. Each visit is
          counted on its own and is not linked to you.
        </p>
        <p>
          If you choose <strong>Accept</strong>, we also:
        </p>
        <ul>
          <li>set an analytics identifier in a cookie and local storage,</li>
          <li>record sessions, which show how the page was used, with all text and form fields masked, and</li>
          <li>link your activity to your account if you are signed in.</li>
        </ul>
        <p>
          <strong>Reject</strong> is as easy as Accept, and the site works the same either way. You can change your
          choice at any time with the <em>Cookie settings</em> tab, which is always visible in the corner of the page.
          Withdrawing consent stops recording and clears the identifier.
        </p>
        <p>
          The only other cookies are the ones that keep you signed in. Those are strictly necessary and need no consent.
        </p>

        <h2>Who else sees it</h2>
        <p>These providers process data on our behalf under data processing agreements:</p>
        <table>
          <tbody>
            <tr>
              <th>Provider</th>
              <th>What for</th>
              <th>Where</th>
            </tr>
            <tr>
              <td>Vercel</td>
              <td>Hosting the site and running the server</td>
              <td>EU (Ireland)</td>
            </tr>
            <tr>
              <td>Supabase</td>
              <td>Database, sign-in and file storage</td>
              <td>EU (Ireland)</td>
            </tr>
            <tr>
              <td>Anthropic</td>
              <td>AI features</td>
              <td>US</td>
            </tr>
            <tr>
              <td>Resend</td>
              <td>Sending email, such as your voice report</td>
              <td>EU (Ireland); US company</td>
            </tr>
            <tr>
              <td>PostHog</td>
              <td>Analytics and, with consent, session recording</td>
              <td>EU</td>
            </tr>
          </tbody>
        </table>
        <p>
          Hugging Face (model download), YouTube and Vimeo (link previews) receive only what&apos;s described above.
          They are independent services, not our processors.
        </p>
        <p>We do not sell personal data.</p>
        <p>
          Some of these providers are US companies, and some data may be processed in the US. Those transfers are
          covered as follows:
        </p>
        <ul>
          <li>
            <strong>Vercel</strong> is certified under the EU–US Data Privacy Framework and also uses the European
            Commission&apos;s Standard Contractual Clauses.
          </li>
          <li>
            <strong>Resend</strong> is certified under the EU–US Data Privacy Framework.
          </li>
          <li>
            <strong>Anthropic</strong> uses Standard Contractual Clauses.
          </li>
        </ul>

        <h2>Your rights</h2>
        <p>Under the GDPR you can ask us to:</p>
        <ul>
          <li>give you a copy of your data,</li>
          <li>correct it,</li>
          <li>delete it,</li>
          <li>restrict what we do with it,</li>
          <li>hand it over in a portable format, or</li>
          <li>object to processing based on legitimate interest.</li>
        </ul>
        <p>
          Where we rely on consent, you can withdraw it at any time. That doesn&apos;t affect what happened before you
          withdrew it.
        </p>
        <p>
          To delete your account, email hello@myaccent.io. We&apos;ll delete it along with everything linked to it,
          including uploaded images. AI usage and error records are unlinked from you straight away and deleted within
          90 days. We&apos;ll respond within one month, and there&apos;s no charge.
        </p>
        <p>
          If you think we&apos;ve handled your data badly, you can complain to the Dutch data protection authority, the{" "}
          <a href="https://autoriteitpersoonsgegevens.nl">Autoriteit Persoonsgegevens</a>, or to the authority in the EU
          country where you live.
        </p>

        <h2>Children</h2>
        <p>
          Accent is for adults working on a business. It isn&apos;t directed at children, and we don&apos;t knowingly
          collect their data.
        </p>

        <h2>Security</h2>
        <p>
          Data is encrypted in transit. Only I have access to what&apos;s stored. No system is perfectly secure, which
          is one reason recordings stay on your device.
        </p>

        <h2>Changes</h2>
        <p>
          If this page changes in a way that matters, we&apos;ll update the date at the top and tell account holders by
          email.
        </p>

        <footer>
          <div className={styles.footerLinks}>
            <span>Accent</span>
            <Link href="/terms">Terms</Link>
            <Link href="/">Home</Link>
            <a href="mailto:hello@myaccent.io">hello@myaccent.io</a>
            <CookieSettingsButton />
          </div>
          <p className={styles.legal}>
            Accent is operated by Accent AI, registered with the Netherlands Chamber of Commerce (KvK) under number
            98500562, which is the controller of your personal data. Contact: hello@myaccent.io.
          </p>
        </footer>
      </div>
    </div>
  );
}
