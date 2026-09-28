import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  // A separate .ttf, not the woff2 self-hosted for next/font/local — the
  // @vercel/og font parser bundled with this Next.js version can't read
  // woff2 ("Unsupported OpenType signature wOF2"), only ttf/otf/woff.
  // Loaded via new URL(..., import.meta.url) rather than fs, since this
  // route runs on the edge.
  const fontRes = await fetch(new URL("../../../public/fonts/fraunces-700-normal-og.ttf", import.meta.url));
  const fraunces = fontRes.ok ? await fontRes.arrayBuffer() : null;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "space-between",
        background: "#F7F4EF",
        padding: "80px",
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            fontSize: "56px",
            fontFamily: "Fraunces",
            fontWeight: 700,
            color: "#1A1A18",
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
            background: "#4A6CF7",
            marginLeft: "6px",
            marginTop: "14px",
          }}
        />
      </div>

      {/* Headline + subtext */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            fontSize: "78px",
            fontFamily: "Fraunces",
            fontWeight: 700,
            color: "#1C1917",
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            maxWidth: "1000px",
          }}
        >
          Your voice. AI-assisted.
        </div>
        <div
          style={{
            fontSize: "30px",
            color: "#78716C",
            fontWeight: 400,
            marginTop: "20px",
          }}
        >
          AI that learns your voice. Every draft gets closer.
        </div>
      </div>

      {/* URL */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          fontSize: "24px",
          color: "#1A1A18",
          fontFamily: "Fraunces",
          fontWeight: 700,
        }}
      >
        myaccent.io
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: fraunces
        ? [
            {
              name: "Fraunces",
              data: fraunces,
              style: "normal",
              weight: 700,
            },
          ]
        : undefined,
    }
  );
}
