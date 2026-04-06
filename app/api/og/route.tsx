import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "#F7F4EF",
          padding: "80px",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            marginBottom: "48px",
          }}
        >
          <div
            style={{
              fontSize: "52px",
              fontWeight: 700,
              color: "#1B3A2D",
              lineHeight: 1,
            }}
          >
            accent
          </div>
          <div
            style={{
              width: "16px",
              height: "16px",
              borderRadius: "50%",
              background: "#F5C842",
              marginLeft: "6px",
              marginTop: "14px",
            }}
          />
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: "76px",
            fontWeight: 700,
            color: "#1C1917",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            maxWidth: "1000px",
          }}
        >
          Stop sounding like AI. Start sounding like you.
        </div>

        {/* Subtext */}
        <div
          style={{
            fontSize: "32px",
            color: "#78716C",
            fontFamily: "sans-serif",
            fontWeight: 400,
            marginTop: "16px",
          }}
        >
          The tool that makes you a better writer.
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
