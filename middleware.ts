import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { createServerClient } from "@supabase/ssr";

const PROTECTED = ["/write", "/settings", "/shelf", "/dashboard"];
const AUTH_PAGES = ["/login", "/signup"];

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  const path = request.nextUrl.pathname;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect logged-in users away from landing, login, signup
  if (user && (path === "/" || AUTH_PAGES.some((p) => path.startsWith(p)))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Check auth for protected routes
  if (PROTECTED.some((p) => path.startsWith(p))) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", path);
      return NextResponse.redirect(loginUrl);
    }

    // Voice profile gate: dashboard requires voice profile
    if (path.startsWith("/dashboard")) {
      const { data: profile } = await supabase.from("profiles").select("voice_profile").eq("id", user.id).maybeSingle();

      if (!profile?.voice_profile) {
        return NextResponse.redirect(new URL("/voice", request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|ingest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)"],
};
