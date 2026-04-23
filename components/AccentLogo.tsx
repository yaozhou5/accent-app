export function AccentLogo({ color = "#1A1A18" }: { color?: string }) {
  return (
    <span className="font-serif" style={{ fontSize: 22, lineHeight: 1, color, fontWeight: 400, letterSpacing: "-0.01em" }}>
      accent<span style={{ color: "#B8964E" }}>.</span>
    </span>
  );
}
