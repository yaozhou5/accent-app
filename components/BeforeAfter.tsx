"use client";

interface BeforeAfterProps {
  before: string;
  after: string;
  beforeLabel: string;
  afterLabel: string;
}

export function BeforeAfter({
  before,
  after,
  beforeLabel,
  afterLabel,
}: BeforeAfterProps) {
  return (
    <div className="space-y-3">
      <div>
        <span className="text-xs font-sans font-medium text-sand uppercase tracking-wide">
          {beforeLabel}
        </span>
        <div className="mt-1 bg-coral-light rounded-lg px-3 py-2.5 font-mono text-sm leading-relaxed text-ink/70 whitespace-pre-wrap">
          {before}
        </div>
      </div>
      <div>
        <span className="text-xs font-sans font-medium text-sand uppercase tracking-wide">
          {afterLabel}
        </span>
        <div className="mt-1 bg-sage-light rounded-lg px-3 py-2.5 font-mono text-sm leading-relaxed text-ink whitespace-pre-wrap">
          {after}
        </div>
      </div>
    </div>
  );
}
