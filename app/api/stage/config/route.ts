import { NextResponse } from "next/server";

// Public realtime settings for the stage pages (static files can't read env vars).
// Both values are already public: they ship in every browser bundle of the app.
export function GET() {
  return NextResponse.json(
    {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
