import type { Metadata } from "next";
import Link from "next/link";
import AnnouncementBar from "@/components/AnnouncementBar";
import HeroDevice from "@/components/HeroDevice";
import RepToggle from "@/components/RepToggle";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Accent",
  description:
    "The test every investor runs in the first minute, and the one thing you can't judge for yourself: Accent records it, times it, and shows you what you actually said.",
};

export default function LandingPage() {
  return (
    <div className="accent-legacy">
      <AnnouncementBar />
      <div className={styles.wrap}>
        <nav>
          <div className={styles.in}>
            <span className={styles.word}>
              Acc<em>e</em>nt
            </span>
            <span className={styles.sp}></span>
            <Link className={styles.navlink} href="#how">
              How it works
            </Link>
            <Link className={styles.navlink} href="#faq">
              FAQ
            </Link>
            <Link className={styles.navbtn} href="/clock">
              The clock
            </Link>
            <Link className={styles.navbtn} href="/listen">
              Listen
            </Link>
          </div>
        </nav>

        <header className={styles.hero}>
          <div>
            <h1>Talk your way to a clear pitch.</h1>
            <p className={styles.lede}>Practice out loud in 60 seconds, and find out what people actually heard.</p>
            <div className={styles.ctarow}>
              <Link className={styles.cta} href="/clock">
                Try the clock
              </Link>
            </div>
            <p className={styles.trust}>Runs on your phone. Nothing leaves it unless you send it.</p>
          </div>

          <HeroDevice />
        </header>

        <div className={`${styles.card} ${styles.lastrun}`} id="lastrun">
          <div className={styles.clockhead}>
            <span className={styles.t}>Your last run</span>
            <span className={styles.m}>2:51 · target 1:00</span>
          </div>

          <svg
            viewBox="0 0 680 108"
            width="100%"
            height="auto"
            role="img"
            aria-label="Timeline: 74 seconds on the problem, 22 seconds on what you do, 11 seconds of proof, then 64 seconds over the target."
          >
            <rect
              className={styles.bar}
              style={{ animationDelay: "0s" }}
              x="0"
              y="16"
              width="294"
              height="44"
              fill="var(--mark)"
            />
            <rect
              className={styles.bar}
              style={{ animationDelay: ".35s" }}
              x="294"
              y="16"
              width="87"
              height="44"
              fill="var(--mark2)"
            />
            <rect
              className={styles.bar}
              style={{ animationDelay: ".5s" }}
              x="381"
              y="16"
              width="44"
              height="44"
              fill="var(--mark3)"
            />
            <rect
              className={styles.bar}
              style={{ animationDelay: ".62s" }}
              x="425"
              y="16"
              width="255"
              height="44"
              fill="var(--flag)"
            />
            <line x1="238" y1="4" x2="238" y2="72" stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="4 3" />
            <text x="243" y="12" fontFamily="Archivo, sans-serif" fontSize="11" fill="var(--ink)">
              60 s target
            </text>
            <text className={styles.lbl} x="10" y="43" fontFamily="Archivo, sans-serif" fontSize="12" fill="#fff">
              Problem: 74 s
            </text>
            <text className={styles.lbl} x="302" y="43" fontFamily="Archivo, sans-serif" fontSize="12" fill="#fff">
              What you do: 22 s
            </text>
            <text className={styles.lbl} x="435" y="43" fontFamily="Archivo, sans-serif" fontSize="12" fill="#fff">
              Still going: 64 s
            </text>
            <text x="0" y="88" fontFamily="Archivo, sans-serif" fontSize="11.5" fill="var(--muted)">
              0:00
            </text>
            <text x="222" y="88" fontFamily="Archivo, sans-serif" fontSize="11.5" fill="var(--muted)">
              1:00
            </text>
            <text x="460" y="88" fontFamily="Archivo, sans-serif" fontSize="11.5" fill="var(--muted)">
              2:00
            </text>
            <text x="648" y="88" fontFamily="Archivo, sans-serif" fontSize="11.5" fill="var(--muted)">
              2:51
            </text>
          </svg>

          <p className={styles.clockread}>
            <b>You reached “what you do” at 1:14.</b> Most of the room decided before you got there.
          </p>
        </div>

        <section>
          <p className={styles.eyebrow} id="how">
            Alone, on your phone
          </p>
          <h2>4 ways to hear yourself properly</h2>
          <div className={styles.modes}>
            <div className={styles.mode}>
              <span className={`${styles.tag} ${styles.live}`}>Live</span>
              <svg width="72" height="30" viewBox="0 0 72 30" aria-hidden="true">
                <rect x="0" y="9" width="40" height="12" fill="var(--mark)" />
                <rect x="40" y="9" width="32" height="12" fill="var(--flag)" />
                <line x1="30" y1="3" x2="30" y2="27" stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="3 2" />
              </svg>
              <h3>The clock</h3>
              <p>How long until you say what you do. Not filler words. The thing that actually loses people.</p>
            </div>

            <div className={styles.mode}>
              <span className={`${styles.tag} ${styles.soon}`}>Building</span>
              <svg width="72" height="30" viewBox="0 0 72 30" aria-hidden="true">
                <g fill="var(--mark)">
                  <rect x="0" y="12" width="3" height="6" />
                  <rect x="6" y="7" width="3" height="16" />
                  <rect x="12" y="3" width="3" height="24" />
                  <rect x="18" y="10" width="3" height="10" />
                  <rect x="24" y="6" width="3" height="18" />
                </g>
                <rect x="40" y="5" width="32" height="20" fill="none" stroke="var(--mark3)" strokeWidth="2" />
                <circle cx="56" cy="15" r="4" fill="var(--mark3)" />
              </svg>
              <h3>Sound off, picture off</h3>
              <p>
                Watch it once with no audio, once with no picture. 2 different problems, and you can&apos;t see either
                with both on.
              </p>
            </div>

            <div className={styles.mode}>
              <span className={`${styles.tag} ${styles.soon}`}>Building</span>
              <svg width="72" height="30" viewBox="0 0 72 30" aria-hidden="true">
                <g fill="var(--rule)">
                  <rect x="14" y="3" width="52" height="3" />
                  <rect x="14" y="10" width="44" height="3" />
                  <rect x="14" y="17" width="56" height="3" />
                  <rect x="14" y="24" width="30" height="3" />
                </g>
                <g fill="var(--mark)">
                  <rect x="0" y="3" width="9" height="3" />
                  <rect x="0" y="10" width="9" height="3" />
                  <rect x="0" y="17" width="9" height="3" />
                  <rect x="0" y="24" width="9" height="3" />
                </g>
              </svg>
              <h3>Your transcript</h3>
              <p>What you said, not what you think you said. Most people have never read one of their own.</p>
            </div>

            <div className={styles.mode}>
              <span className={`${styles.tag} ${styles.soon}`}>Building</span>
              <svg width="72" height="30" viewBox="0 0 72 30" aria-hidden="true">
                <rect x="0" y="2" width="46" height="9" fill="var(--hl)" />
                <rect x="0" y="2" width="46" height="9" fill="none" stroke="var(--flag)" strokeWidth="1" />
                <rect x="48" y="2" width="18" height="9" fill="var(--rule)" />
                <rect x="0" y="19" width="46" height="9" fill="var(--hl)" />
                <rect x="0" y="19" width="46" height="9" fill="none" stroke="var(--flag)" strokeWidth="1" />
                <rect x="48" y="19" width="24" height="9" fill="var(--rule)" />
              </svg>
              <h3>The repeat check</h3>
              <p>
                Answer the same question twice, days apart. Identical phrasing means you&apos;re reciting, and it breaks
                the moment someone interrupts.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2>The repeat check</h2>
          <div className={styles.narrow}>
            <p>2 answers to the same question, 3 days apart. Everything highlighted came out word for word.</p>
          </div>
          <div className={styles.card}>
            <div className={styles.diffrow}>
              <span className={styles.lbl}>Monday</span>
              <p>
                <mark>We&apos;re building an intelligent routing layer for last-mile delivery</mark>, and what really
                sets us apart is the optimisation engine underneath.
              </p>
            </div>
            <div className={styles.diffrow}>
              <span className={styles.lbl}>Thursday</span>
              <p>
                <mark>We&apos;re building an intelligent routing layer for last-mile delivery</mark>
                {". So basically it's software for couriers."}
              </p>
            </div>
            <p className={styles.diffread}>
              <b>11 words identical.</b>
              {" That sentence is memorised. It'll survive right up until someone stops you in the middle of it."}
            </p>
          </div>
          <p className={styles.caption}>An example, not a real company.</p>
        </section>

        <section>
          <h2>12 runs later</h2>
          <div className={styles.narrow}>
            <p>Every run is kept, and 1 number tracks across all of them: how long it takes you to say what you do.</p>
          </div>

          <div className={styles.card}>
            <svg
              viewBox="0 0 680 180"
              width="100%"
              height="auto"
              role="img"
              aria-label="Chart: time to say what you do falls from 74 seconds at rep 1 to 7 seconds at rep 12."
            >
              <line x1="34" y1="150" x2="672" y2="150" stroke="var(--rule)" strokeWidth="1" />
              <line x1="34" y1="42" x2="672" y2="42" stroke="var(--ink)" strokeWidth="1" strokeDasharray="4 3" />
              <text x="36" y="36" fontFamily="Archivo, sans-serif" fontSize="11" fill="var(--ink)">
                60 s
              </text>
              <text x="0" y="154" fontFamily="Archivo, sans-serif" fontSize="11" fill="var(--muted)">
                0 s
              </text>
              <g fill="var(--mark)">
                <rect x="44" y="17" width="34" height="133" />
                <rect x="96" y="30" width="34" height="120" />
                <rect x="148" y="24" width="34" height="126" />
                <rect x="200" y="55" width="34" height="95" />
                <rect x="252" y="61" width="34" height="89" />
                <rect x="304" y="48" width="34" height="102" />
                <rect x="356" y="86" width="34" height="64" />
                <rect x="408" y="93" width="34" height="57" />
                <rect x="460" y="79" width="34" height="71" />
                <rect x="512" y="111" width="34" height="39" />
                <rect x="564" y="122" width="34" height="28" />
                <rect x="616" y="137" width="34" height="13" />
              </g>
              <text x="44" y="172" fontFamily="Archivo, sans-serif" fontSize="11.5" fill="var(--muted)">
                rep 1
              </text>
              <text x="608" y="172" fontFamily="Archivo, sans-serif" fontSize="11.5" fill="var(--muted)">
                rep 12
              </text>
              <text x="44" y="12" fontFamily="Archivo, sans-serif" fontSize="11.5" fill="var(--muted)">
                74 s
              </text>
              <text x="616" y="132" fontFamily="Archivo, sans-serif" fontSize="11.5" fill="var(--mark)">
                7 s
              </text>
            </svg>
          </div>

          <div className={styles.card} style={{ marginTop: 20 }}>
            <p className={styles.q}>What does your company do?</p>
            <p className={styles.qmeta}>Same question, 12 runs apart</p>
            <RepToggle />
          </div>
          <p className={styles.caption}>An example, not a real company.</p>
        </section>

        <section>
          <p className={styles.eyebrow}>When you&apos;re ready</p>
          <h2>Send 60 seconds to 5 listeners</h2>
          <div className={styles.narrow}>
            <p>
              Working alone shows you what you said. It can&apos;t tell you what landed: you&apos;re the one person who
              can&apos;t hear your own pitch fresh, and the people you normally ask already know what you do.
            </p>
            <p>
              So when you want that, send the 60 seconds: not your deck, not your numbers, to 5 people who&apos;ve never
              heard of you. They answer 1 question: what does this company do. You listen to 3 others to get your 5.
            </p>
          </div>
          <div className={styles.card}>
            <div className={styles.meter}>
              <i></i>
              <i></i>
              <i></i>
              <i></i>
              <i className={styles.got}></i>
              <span>1 of 5 understood</span>
            </div>
            <div className={styles.heard}>
              <span className={styles.dot}></span>
              <p>Delivery software? For a supermarket, maybe.</p>
            </div>
            <div className={styles.heard}>
              <span className={styles.dot}></span>
              <p>Something about algorithms. Didn&apos;t catch who uses it.</p>
            </div>
            <div className={styles.heard}>
              <span className={styles.dot}></span>
              <p>An app for drivers.</p>
            </div>
            <div className={styles.heard}>
              <span className={styles.dot}></span>
              <p>No idea, honestly. Logistics something.</p>
            </div>
            <div className={styles.heard}>
              <span className={`${styles.dot} ${styles.got}`}></span>
              <p>It plans delivery routes for courier companies.</p>
            </div>
            <p className={styles.verdict}>
              <b>3 heard a different product.</b> You named 3 things and the last one buried the first.
            </p>
          </div>
          <p className={styles.caption}>An example, not a real company.</p>
        </section>

        <section>
          <p className={styles.eyebrow}>Where this actually is</p>
          <h2>1 feature works. The rest is this month.</h2>
          <div className={styles.status}>
            <ul>
              <li>
                <span className={`${styles.st} ${styles.on}`}>Live</span>
                <span>
                  The clock. Record yourself, get a transcript, and see how long it takes you to say what you do.
                </span>
              </li>
              <li>
                <span className={styles.st}>Next</span>
                <span>The listener link. This is the part I want help with.</span>
              </li>
              <li>
                <span className={styles.st}>Then</span>
                <span>Sound off / picture off, the repeat check.</span>
              </li>
            </ul>
            <p>
              I&apos;d rather tell you that than let you find out. The clock is ready to try now. If you&apos;d like to
              be a listener for someone else, say so and I&apos;ll send you the link.
            </p>
          </div>
          <div className={styles.ctarow}>
            <Link className={styles.cta} href="/listen">
              Listen to someone&apos;s sixty seconds
            </Link>
            <Link className={`${styles.cta} ${styles.quiet}`} href="/clock">
              Try the clock
            </Link>
          </div>
        </section>

        <section>
          <h2 id="faq">Questions</h2>
          <div className={styles.faq}>
            <details>
              <summary>Is this AI deciding whether my pitch is good?</summary>
              <p>
                No. The parts that run on your phone only measure: how long until you say what you do, what words you
                actually used, whether 2 answers came out identical. None of that is an opinion. Any judgement comes
                from people, and you can see who said what.
              </p>
            </details>
            <details>
              <summary>Why not just have an AI listen?</summary>
              <p>
                You can prompt a model to be neutral. You can&apos;t prompt it to not understand. It reads your whole
                answer at once and gets the point even when you buried it at minute two: exactly the miss a person
                hearing you once would make. That miss is what you&apos;re trying to find.
              </p>
            </details>
            <details>
              <summary>Who are the listeners?</summary>
              <p>
                Other founders, and people who&apos;ve agreed to spend 90 seconds listening. They don&apos;t need to be
                investors or experts: the only quality that matters is that they&apos;ve never heard of your company.
                That&apos;s the thing your friends and your team can&apos;t be.
              </p>
            </details>
            <details>
              <summary>Do I have to share my deck or my numbers?</summary>
              <p>
                No, and you can&apos;t. The only thing that can be sent is the 60-second recording. There&apos;s no
                upload for a deck, a financial model or a data room, because none of that is needed to find out whether
                people understand what you do.
              </p>
            </details>
            <details>
              <summary>What happens to my recording?</summary>
              <p>
                It stays on your device. Sending it to listeners is a separate, deliberate step, and you can delete it
                at any point. It&apos;s never published, never sold, and never used to train a model.{" "}
                <a href="/privacy">The full policy</a>.
              </p>
            </details>
            <details>
              <summary>What does it cost?</summary>
              <p>
                Nothing right now. If there&apos;s ever a price, you&apos;ll hear about it before anything changes, and
                nothing you&apos;ve already recorded gets locked behind it.
              </p>
            </details>
            <details>
              <summary>I&apos;m not raising. Is this any use?</summary>
              <p>
                Probably. The 60-second test isn&apos;t really about investors: it&apos;s the same test a customer, a
                hire or an interviewer runs in the first minute. Founders raising money just feel it most sharply, which
                is why they&apos;re who it&apos;s built around first.
              </p>
            </details>
          </div>
        </section>

        <section>
          <div className={styles.privacy}>
            <p>
              The recording stays on your device. The clock, the transcript and the repeat check all run there: no
              upload, no account needed to use any of it.
            </p>
            <p>
              Nothing is sent anywhere unless you choose to send it, and the only thing you can send is the 60 seconds.
              A recording of your voice is personal data, so sending is always a deliberate step and you can delete it
              whenever you like.
            </p>
            <p>
              <a href="/privacy" style={{ color: "var(--mark)" }}>
                The full policy
              </a>
              : what&apos;s kept, for how long, and how to make us delete it.
            </p>
          </div>
        </section>

        <footer>
          <div className={styles.in}>
            <span className={styles.sp}></span>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="/content">Content tool</a>
            <a href="mailto:hello@myaccent.io">hello@myaccent.io</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
