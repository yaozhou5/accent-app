"use client";

export function ArrowRight({
  size = 14,
  color = "currentColor",
  className = "",
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block arrow-right ${className}`}
      style={{ verticalAlign: "middle", marginLeft: 4, transition: "transform 0.2s ease" }}
    >
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

export function ArrowLeft({
  size = 14,
  color = "currentColor",
  className = "",
}: {
  size?: number;
  color?: string;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block arrow-left ${className}`}
      style={{ verticalAlign: "middle", marginRight: 4, transition: "transform 0.2s ease" }}
    >
      <path d="M13 8H3M7 4L3 8l4 4" />
    </svg>
  );
}
