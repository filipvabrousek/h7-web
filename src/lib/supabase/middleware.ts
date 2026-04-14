import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Next.js strips the configured `basePath` from `request.nextUrl.pathname`
// before the middleware sees it, and automatically re-prepends it when we
// set `url.pathname` on a redirect. So we work with unprefixed paths on both
// sides — no manual prefixing.
function redirectTo(request: NextRequest, relPath: string): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = relPath.startsWith("/") ? relPath : "/" + relPath;
  return NextResponse.redirect(url);
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

  const pathname = request.nextUrl.pathname;

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
