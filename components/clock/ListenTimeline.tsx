import { formatClock } from "@/lib/clock/format";
import type { Mark } from "@/lib/clock/types";

const VIEW_WIDTH = 680;
const VIEW_HEIGHT = 40;
const TRACK_Y = 12;
const TRACK_HEIGHT = 16;

export default function ListenTimeline({
  durationMs,
  currentMs,
  marks,
  pointMs,
}: {
  durationMs: number;
  currentMs: number;
  marks: Mark[];
  /** Only set if a point was already confirmed on an earlier pass through review. */
  pointMs: number | null;
}) {
  const scale = durationMs > 0 ? VIEW_WIDTH / durationMs : 0;
  const playheadX = Math.min(Math.max(currentMs, 0) * scale, VIEW_WIDTH);
  const pointX = pointMs !== null ? Math.min(pointMs * scale, VIEW_WIDTH) : null;

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      width="100%"
      height="auto"
      role="img"
      aria-label={`Playback timeline, ${marks.length} mark${marks.length === 1 ? "" : "s"} placed.`}
    >
      <rect x="0" y={TRACK_Y} width={VIEW_WIDTH} height={TRACK_HEIGHT} rx="2" fill="var(--rule)" />
      <rect x="0" y={TRACK_Y} width={playheadX} height={TRACK_HEIGHT} rx="2" fill="var(--mark3)" />

      {marks.map((mark) => {
        const x = Math.min(Math.max(mark.ms, 0) * scale, VIEW_WIDTH);
        return (
          <line
            key={mark.id}
            x1={x}
            y1="2"
            x2={x}
            y2={TRACK_Y + TRACK_HEIGHT + 4}
            stroke="var(--flag)"
            strokeWidth="2"
          />
        );
      })}

      {pointX !== null && (
        <line x1={pointX} y1="4" x2={pointX} y2={TRACK_Y + TRACK_HEIGHT + 4} stroke="var(--mark)" strokeWidth="2" />
      )}

      <line x1={playheadX} y1="0" x2={playheadX} y2={TRACK_Y + TRACK_HEIGHT} stroke="var(--ink)" strokeWidth="1.5" />

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
