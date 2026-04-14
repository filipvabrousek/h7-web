import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// `basePath` handling in middleware is inconsistent between the Turbopack
// dev server (strips from pathname, auto-prepends on redirect) and Vercel's
// production runtime (strips from pathname, does NOT auto-prepend). To get
// the same behavior everywhere, we:
//   1. Normalize the incoming pathname by manually stripping BASE_PATH if
//      it's still there (so comparisons like `startsWith("/login")` work).
//   2. Build redirect URLs with `new URL()` — that form never auto-applies
//      basePath on either runtime — and include BASE_PATH explicitly.
const BASE_PATH = "/app";

function normalizePath(pathname: string): string {
  if (pathname === BASE_PATH) return "/";
  if (pathname.startsWith(BASE_PATH + "/")) return pathname.slice(BASE_PATH.length);
  return pathname;
}

function redirectTo(request: NextRequest, relPath: string): NextResponse {
  const path = relPath.startsWith("/") ? relPath : "/" + relPath;
  // `new URL(target, base)` resolves against the current request URL, giving
  // us an absolute URL with the correct host/scheme for the environment.
  return NextResponse.redirect(new URL(BASE_PATH + path, request.url));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = normalizePath(request.nextUrl.pathname);

  // Redirect unauthenticated users to login
  if (!user && !pathname.startsWith("/login")) {
    return redirectTo(request, "/login");
  }

  // Redirect authenticated users away from login
  if (user && pathname.startsWith("/login")) {
    return redirectTo(request, "/");
  }

  // Redirect new users to onboarding if they haven't completed it
  if (
    user &&
    !pathname.startsWith("/onboarding") &&
    !pathname.startsWith("/login") &&
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/api")
  ) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("initial_weekly_activity")
      .eq("id", user.id)
      .single();

    if (profile && profile.initial_weekly_activity == null) {
      return redirectTo(request, "/onboarding");
    }
  }

  // Redirect onboarded users away from onboarding
  if (user && pathname.startsWith("/onboarding")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("initial_weekly_activity")
      .eq("id", user.id)
      .single();

    if (profile && profile.initial_weekly_activity != null) {
      return redirectTo(request, "/");
    }
  }

  return supabaseResponse;
}
