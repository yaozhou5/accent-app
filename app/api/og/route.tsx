import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  // Load Fraunces 700 via the Google Fonts CSS API (resolves to current font URL)
  const cssRes = await fetch(
    "https://fonts.googleapis.com/css2?family=Fraunces:wght@700&display=swap",
    {
      headers: {
        // Forces Google to return woff2 URLs
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    }
  );
  const css = await cssRes.text();
  const fontUrlMatch = css.match(
    /src: url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/
  );
  let fraunces: ArrayBuffer | null = null;
  if (fontUrlMatch) {
    const fontRes = await fetch(fontUrlMatch[1]);
    if (fontRes.ok) fraunces = await fontRes.arrayBuffer();
  }

  return new ImageResponse(
    (
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
            Stop sounding like AI. Start sounding like you.
          </div>
          <div
            style={{
              fontSize: "30px",
              color: "#78716C",
              fontWeight: 400,
              marginTop: "20px",
            }}
          >
            The tool that makes you a better writer.
          </div>
        </div>

        {/* URL */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: "24px",
            color: "#1B3A2D",
            fontFamily: "Fraunces",
            fontWeight: 700,
          }}
        >
          myaccent.io
        </div>
      </div>
    ),
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
