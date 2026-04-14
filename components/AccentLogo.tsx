export function AccentLogo() {
  return (
    <span className="inline-flex items-start">
      <span
        className="font-serif tracking-tight"
        style={{ fontSize: 22, lineHeight: 1, color: "#111", fontWeight: 400 }}
      >
        accent
      </span>
      <span
        className="rounded-full shrink-0"
        style={{ width: 7, height: 7, marginLeft: 2, marginTop: 6, background: "#111" }}
      />
    </span>
  );
}
