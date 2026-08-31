"use client";

import { useState } from "react";
import Link from "next/link";
import ReviewMode from "@/components/ReviewMode";

const FAINT = "#9ca3af";
const DIM = "#6b7280";

export default function PublicReviewPage() {
  const [hasResults, setHasResults] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: "#F5F0E8" }}>
      <div className="mx-auto px-5 py-6" style={{ maxWidth: hasResults ? 760 : 640 }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: hasResults ? 12 : 24,
          }}
        >
          <Link
            href="/"
            className="no-underline"
            style={{
              fontFamily: "'Fraunces', Georgia, serif",
              fontSize: 18,
              fontWeight: 600,
              fontStyle: "italic",
              color: "#1a1a1a",
            }}
          >
            accent
          </Link>
          <Link href="/login?redirect=/review" className="no-underline font-sans" style={{ fontSize: 14, color: DIM }}>
            Sign in
          </Link>
        </header>

        {!hasResults && (
          <>
            <span
              className="font-mono uppercase block mb-2"
              style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}
            >
              Review
            </span>
            <div className="mb-6">
              <p className="font-sans" style={{ fontSize: 16, color: DIM, marginBottom: 4 }}>
                Paste something you&apos;ve written. Get a read on how it sounds.
              </p>
              <p className="font-sans" style={{ fontSize: 15, color: "#78716c", maxWidth: 620 }}>
                Up to 300 words, 3 reviews per hour, no account needed.{" "}
                <Link href="/login?redirect=/review" style={{ color: "#1a1a1a", fontWeight: 500 }}>
                  Sign in
                </Link>{" "}
                for longer pieces and your voice profile.
              </p>
            </div>
          </>
        )}

        <ReviewMode
          onResultsChange={setHasResults}
          apiEndpoint="/api/review-public"
          maxWords={300}
          footer={
            <p className="font-sans mt-2" style={{ fontSize: 14, color: DIM }}>
              <Link href="/signup" style={{ color: "#1a1a1a", fontWeight: 500 }}>
                Sign in
              </Link>{" "}
              to keep this review, use your voice profile, and review up to 3,000 words.
            </p>
          }
        />
      </div>
    </div>
  );
}
