import styles from "@/app/clock/page.module.css";
import { formatClock } from "@/lib/clock/format";
import { TARGET_MS } from "@/lib/clock/recording";
import type { PointStatus } from "@/lib/clock/types";

const VIEW_WIDTH = 680;
const VIEW_HEIGHT = 40;
const TRACK_Y = 12;
const TRACK_HEIGHT = 16;
const LABEL_PAD = 14;

export default function RunTimeline({
  durationMs,
  pointMs,
  pointStatus,
  flash = false,
}: {
  durationMs: number;
  pointMs: number | null;
  pointStatus: PointStatus;
  /** Briefly pulses the point marker — set true right after the point changes. */
  flash?: boolean;
}) {
  const scale = durationMs > 0 ? VIEW_WIDTH / durationMs : 0;
  const pointX = pointStatus === "marked" && pointMs !== null ? Math.min(pointMs * scale, VIEW_WIDTH) : null;
  const showTarget = durationMs > TARGET_MS;
  const targetX = TARGET_MS * scale;
  const targetLabelX = Math.min(Math.max(targetX, LABEL_PAD), VIEW_WIDTH - LABEL_PAD);
  const targetLabelAnchor = targetX < LABEL_PAD ? "start" : targetX > VIEW_WIDTH - LABEL_PAD ? "end" : "middle";

  const trackFill = pointStatus === "none" ? "var(--hl)" : "var(--rule)";

  const label =
    pointStatus === "marked" && pointMs !== null
      ? `Timeline: reached the point at ${Math.floor(pointMs / 1000)} seconds, out of ${Math.floor(durationMs / 1000)} seconds total.`
      : pointStatus === "none"
        ? `Timeline: never said it, out of ${Math.floor(durationMs / 1000)} seconds total.`
        : `Timeline: not marked yet, out of ${Math.floor(durationMs / 1000)} seconds total.`;

  return (
    <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} width="100%" height="auto" role="img" aria-label={label}>
      <rect x="0" y={TRACK_Y} width={VIEW_WIDTH} height={TRACK_HEIGHT} rx="2" fill={trackFill} />
      {pointX !== null && (
        <>
          <rect x="0" y={TRACK_Y} width={pointX} height={TRACK_HEIGHT} rx="2" fill="var(--mark)" />
          <rect
            x={pointX}
            y={TRACK_Y}
            width={Math.max(VIEW_WIDTH - pointX, 0)}
            height={TRACK_HEIGHT}
            fill="var(--mark3)"
          />
        </>
      )}
      {showTarget && (
        <>
          <line
            x1={targetX}
            y1="2"
            x2={targetX}
            y2={TRACK_Y + TRACK_HEIGHT + 6}
            stroke="var(--ink)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <text
            x={targetLabelX}
            y="10"
            textAnchor={targetLabelAnchor}
            fontFamily="Archivo, sans-serif"
            fontSize="10.5"
            fill="var(--ink)"
          >
            60s
          </text>
        </>
      )}
      {pointX !== null && (
        <line
          className={flash ? styles.timelineMarkerFlash : undefined}
          x1={pointX}
          y1="4"
          x2={pointX}
          y2={TRACK_Y + TRACK_HEIGHT + 4}
          stroke="var(--mark)"
          strokeWidth="2"
        />
      )}
      <text x="0" y={VIEW_HEIGHT - 2} fontFamily="Archivo, sans-serif" fontSize="11" fill="var(--muted)">
        0:00
      </text>
      <text
        x={VIEW_WIDTH}
        y={VIEW_HEIGHT - 2}
        textAnchor="end"
        fontFamily="Archivo, sans-serif"
        fontSize="11"
        fill="var(--muted)"
      >
        {formatClock(durationMs)}
      </text>
    </svg>
  );
}
