import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { email, runIndex } = await request.json();
    const trimmed = typeof email === "string" ? email.trim() : "";
    if (!trimmed || !trimmed.includes("@")) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.from("email_captures").insert({
      email: trimmed,
      source: "practice",
      run_index: typeof runIndex === "number" ? runIndex : null,
    });

    if (error) {
      console.error("Practice email capture error:", error);
      return NextResponse.json({ error: "Failed to save" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Practice email capture error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
