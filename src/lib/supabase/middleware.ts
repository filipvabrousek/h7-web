import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login
  if (user && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
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
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      return NextResponse.redirect(url);
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
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
