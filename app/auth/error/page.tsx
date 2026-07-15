export default function AuthError() {
  return (
    <div
      className="max-w-[480px] mx-auto min-h-screen flex items-center justify-center px-4"
      style={{ background: "#F5F0E8" }}
    >
      <div className="text-center space-y-3">
        <h1 style={{ fontFamily: "'Fraunces', Georgia, serif", fontSize: 24, fontWeight: 600, color: "#1A1A18" }}>
          Something went wrong
        </h1>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#A8A49C" }}>
          The magic link may have expired or was already used. Please try signing in again.
        </p>
        <a
          href="/login"
          style={{
            display: "inline-block",
            marginTop: 16,
            padding: "10px 24px",
            background: "#1A1A18",
            color: "#fff",
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Sign in
        </a>
      </div>
    </div>
  );
}
