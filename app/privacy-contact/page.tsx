import Link from "next/link";
import type { Metadata } from "next";
import { PrivacyContactForm } from "@/components/PrivacyContactForm";
import { PRIVACY_POLICY_HTML } from "@/lib/privacy-policy-html";

export const metadata: Metadata = {
  title: "Privacy & Contact · accent.",
  description: "Privacy policy and contact form for Accent.",
};

export default function PrivacyContactPage() {
  return (
    <div className="min-h-screen bg-paper md:bg-[#EEEBE4]">
      <div className="max-w-[480px] md:max-w-[720px] mx-auto bg-paper md:shadow-[0_0_40px_rgba(0,0,0,0.06)] min-h-screen">
        {/* Header */}
        <header className="flex items-center justify-between px-4 md:px-8 py-4 border-b border-ink/10">
          <Link href="/" className="inline-flex items-start">
            <span className="font-serif font-bold text-xl tracking-tight text-teal">
              accent
            </span>
            <span
              className="bg-coral rounded-full shrink-0"
              style={{ width: 7, height: 7, marginLeft: 2, marginTop: 6 }}
            />
          </Link>
          <Link
            href="/"
            className="text-sm font-sans text-ink/60 hover:text-ink transition-colors"
          >
            ← Back to app
          </Link>
        </header>

        <main className="px-4 md:px-8 py-8 md:py-12 space-y-12">
          {/* Title */}
          <section>
            <h1 className="font-serif font-bold text-3xl md:text-4xl text-ink leading-tight">
              Privacy &amp; Contact
            </h1>
            <p className="mt-3 font-sans text-base text-ink/70 leading-relaxed">
              Questions about your data, our practices, or anything else? Reach
              out to{" "}
              <a
                href="mailto:hello@yaozhou.me"
                className="text-teal underline decoration-teal/30 hover:decoration-teal underline-offset-2"
              >
                hello@yaozhou.me
              </a>
              .
            </p>
          </section>

          {/* Contact Form */}
          <section className="space-y-4">
            <h2 className="font-serif font-bold text-2xl text-ink">
              Make a request
            </h2>
            <p className="font-sans text-sm text-ink/70 leading-relaxed">
              Use this form for data access, deletion, correction, or any other
              privacy-related request. We&apos;ll respond within 30 days.
            </p>
            <div className="bg-warm/60 border border-ink/10 rounded-[12px] p-5 md:p-6">
              <PrivacyContactForm />
            </div>
          </section>

          {/* Privacy Policy */}
          <section className="space-y-4">
            <h2 className="font-serif font-bold text-2xl text-ink">
              Privacy policy
            </h2>
            <div
              className="privacy-policy bg-white border border-ink/10 rounded-[12px] p-5 md:p-8"
              dangerouslySetInnerHTML={{ __html: PRIVACY_POLICY_HTML }}
            />
          </section>

          {/* Footer link */}
          <footer className="pt-6 border-t border-ink/10">
            <Link
              href="/"
              className="font-sans text-sm text-ink/60 hover:text-ink transition-colors"
            >
              ← Back to accent
            </Link>
          </footer>
        </main>
      </div>
    </div>
  );
}
