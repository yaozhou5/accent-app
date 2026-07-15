import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "email" | "magiclink" | "email_change" | null;
  const nextParam = searchParams.get("next") ?? searchParams.get("redirect_to") ?? "/dashboard";
  // Normalize full URLs to paths, prevent open redirect
  let next = "/dashboard";
  if (nextParam) {
    try {
      const url = new URL(nextParam, request.url);
      // Only allow same-origin redirects
      if (url.origin === new URL(request.url).origin) {
        next = url.pathname;
      }
    } catch {
      // If it's already a relative path
      if (nextParam.startsWith("/") && !nextParam.startsWith("//")) {
        next = nextParam;
      }
    }
  }

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type: type === "magiclink" ? "magiclink" : type!,
      token_hash,
    });

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
    console.error("Auth confirm verifyOtp failed:", {
      error: error.message,
      type,
      token_hash: token_hash?.slice(0, 8) + "...",
    });
  } else {
    console.error("Auth confirm missing params:", { token_hash: !!token_hash, type });
  }

  return NextResponse.redirect(new URL("/auth/error", request.url));
}
