import { TARGET_MS } from "@/lib/clock/recording";
import type { Run } from "@/lib/clock/types";

const VIEW_WIDTH = 680;
const VIEW_HEIGHT = 180;
const LEFT = 40;
const RIGHT = 672;
const TOP = 24;
const BASELINE = 150;

export default function TimeToPointChart({ runs }: { runs: Run[] }) {
  if (runs.length < 2) return null;

  const ordered = [...runs].sort((a, b) => a.createdAt - b.createdAt);
  const reachedValues = ordered
    .filter((r) => r.pointStatus === "marked" && r.pointMs !== null)
    .map((r) => r.pointMs as number);
  const domainMax = Math.max(TARGET_MS, ...reachedValues) * 1.15;

  const innerHeight = BASELINE - TOP;
  const columnWidth = (RIGHT - LEFT) / ordered.length;
  const barWidth = Math.min(columnWidth * 0.55, 40);
  const targetY = BASELINE - (TARGET_MS / domainMax) * innerHeight;

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      width="100%"
      height="auto"
      role="img"
      aria-label={`Chart: time until you said what you do, across ${ordered.length} runs.`}
    >
      <line x1={LEFT} y1={BASELINE} x2={RIGHT} y2={BASELINE} stroke="var(--rule)" strokeWidth="1" />
      <line x1={LEFT} y1={targetY} x2={RIGHT} y2={targetY} stroke="var(--ink)" strokeWidth="1" strokeDasharray="4 3" />
      <text x={LEFT + 2} y={targetY - 6} fontFamily="Archivo, sans-serif" fontSize="11" fill="var(--ink)">
        60 s
      </text>
      <text x="0" y={BASELINE + 4} fontFamily="Archivo, sans-serif" fontSize="11" fill="var(--muted)">
        0 s
      </text>

      {ordered.map((run, i) => {
        const cx = LEFT + columnWidth * i + columnWidth / 2;
        const barHeight =
          run.pointStatus === "marked" && run.pointMs !== null ? (run.pointMs / domainMax) * innerHeight : 0;
        return (
          <g key={run.id}>
            {run.pointStatus === "marked" ? (
              <rect
                x={cx - barWidth / 2}
                y={BASELINE - barHeight}
                width={barWidth}
                height={barHeight}
                fill="var(--mark)"
              />
            ) : run.pointStatus === "none" ? (
              <circle cx={cx} cy={TOP} r="6" fill="none" stroke="var(--flag)" strokeWidth="2" />
            ) : (
              <circle cx={cx} cy={BASELINE} r="3" fill="var(--muted)" />
            )}
            <text
              x={cx}
              y={VIEW_HEIGHT - 8}
              textAnchor="middle"
              fontFamily="Archivo, sans-serif"
              fontSize="11.5"
              fill="var(--muted)"
            >
              rep {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
