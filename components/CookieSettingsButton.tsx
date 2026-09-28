"use client";

import type { CSSProperties } from "react";
import { REOPEN_CONSENT_EVENT } from "./ConsentBanner";

// Resets default button chrome so it sits inline with the plain <a>/<Link>
// footer links around it on every page, inheriting that page's own font
// size and color rather than needing per-page CSS.
const baseStyle: CSSProperties = {
  font: "inherit",
  color: "inherit",
  background: "none",
  border: "none",
  padding: 0,
  cursor: "pointer",
};

export function CookieSettingsButton({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <button
      type="button"
      className={className}
      style={{ ...baseStyle, ...style }}
      onClick={() => window.dispatchEvent(new Event(REOPEN_CONSENT_EVENT))}
    >
      Cookie settings
    </button>
  );
}
