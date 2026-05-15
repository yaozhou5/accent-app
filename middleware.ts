import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

const PROTECTED = ["/write", "/settings", "/shelf", "/dashboard", "/onboard"];

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  const path = request.nextUrl.pathname;

  // Check auth for protected routes
  if (PROTECTED.some(p => path.startsWith(p))) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { cookies: { getAll() { return request.cookies.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", path);
      return NextResponse.redirect(loginUrl);
    }

    // Onboarding redirect: dashboard -> onboard if not complete, onboard -> dashboard if complete
    if (path.startsWith("/dashboard") || path.startsWith("/onboard")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .single();

      const onboarded = profile?.onboarding_completed === true;

      if (path.startsWith("/dashboard") && !onboarded) {
        return NextResponse.redirect(new URL("/onboard/1", request.url));
      }
      if (path.startsWith("/onboard") && onboarded) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|ingest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)",
  ],
};
