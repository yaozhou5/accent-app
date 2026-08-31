"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "@/components/ArrowIcon";
import ReviewMode from "@/components/ReviewMode";

const FAINT = "#9ca3af";
const DIM = "#6b7280";

export default function ReviewPage() {
  const [hasResults, setHasResults] = useState(false);

  return (
    <div className="min-h-screen" style={{ background: "#F5F0E8" }}>
      <div className="mx-auto px-5 py-6" style={{ maxWidth: hasResults ? 760 : 640 }}>
        <div className="flex items-center justify-between mb-6">
          <Link href="/dashboard" className="no-underline font-mono" style={{ fontSize: 13, color: FAINT }}>
            <ArrowLeft size={12} /> Back
          </Link>
        </div>

        {!hasResults && (
          <>
            <span
              className="font-mono uppercase block mb-2"
              style={{ fontSize: 11, letterSpacing: "0.05em", color: FAINT, fontWeight: 500 }}
            >
              Review
            </span>
            <p className="font-sans mb-6" style={{ fontSize: 16, color: DIM }}>
              Paste something you&apos;ve already written. Get a read on how it sounds.
            </p>
          </>
        )}

        <ReviewMode onResultsChange={setHasResults} />
      </div>
    </div>
  );
}
