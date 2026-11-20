import { NextResponse } from "next/server";

// Public realtime settings for the stage pages (static files can't read env vars).
// Both values are already public: they ship in every browser bundle of the app.
export function GET() {
  return NextResponse.json(
    {
      url: (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim(),
      // Trimmed: the stored value carries trailing whitespace, which breaks the realtime websocket.
      key: (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "").trim(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
