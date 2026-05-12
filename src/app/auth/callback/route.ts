// OAuth callback for `supabase.auth.signInWithOAuth({ provider: 'google' })`.
//
// Flow:
//   1. Login page calls `signInWithOAuth({ provider: 'google', options: {
//      redirectTo: `${origin}/app/auth/callback` } })`.
//   2. Supabase bounces the user to Google's consent screen.
//   3. Google returns to Supabase's `/auth/v1/callback` with an `?code=…`.
//   4. Supabase puts a session cookie hint into the response and 302s
//      the user to OUR `redirectTo` URL — i.e. this route — with `?code`
//      appended.
//   5. We swap the code for a session on the server side via
//      `exchangeCodeForSession`, which also writes the auth cookies
//      that the rest of the app reads via `createServerClient`.
//   6. We then 302 the user into the app (or onboarding if they're new).
//
// Why server-route, not client component:
//   - Supabase's PKCE flow stores the code-verifier in a cookie. Only a
//     server route can read that cookie + set the resulting session
//     cookies in the same response. A client component would 200ms
//     later still be looking at an unauthenticated page.
//   - This also dodges the brief flash of `/login` showing on top of
//     the OAuth handoff that a client-side handler would cause.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  // `next` is an optional redirect target the login page can pass through
  // — e.g. deep-link into /history after sign-in. Default to the dashboard.
  // We sanitise to a relative path with our own basePath prefix so an
  // attacker can't craft `?next=https://evil.com` and steal the user.
  const rawNext = url.searchParams.get("next") ?? "/";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // First-login profile bootstrap: if the user is brand new (signed
      // up with Google, no profile row yet), seed a minimal profile so
      // downstream queries (`useUser`) find something. The onboarding
      // screen will fill in the rest. We use the Google `full_name` and
      // email straight off the auth user. Duplicate keys are a no-op via
      // upsert.
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
        const username =
          (typeof meta.full_name === "string" && meta.full_name) ||
          (typeof meta.name === "string" && meta.name) ||
          (user.email?.split("@")[0] ?? "User");
        // Only upsert if no row exists yet — don't clobber existing
        // username/avatar a returning Google user has already set.
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", user.id)
          .maybeSingle();
        if (!existing) {
          await supabase.from("profiles").upsert({
            id: user.id,
            username,
            email: user.email ?? "",
            avatar_url:
              typeof meta.avatar_url === "string"
                ? meta.avatar_url
                : typeof meta.picture === "string"
                  ? meta.picture
                  : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          // Brand new account → send through onboarding so they pick a
          // belt level, height/weight, etc. Returning users skip to
          // wherever `next` points (or the dashboard).
          return NextResponse.redirect(new URL(`/app/onboarding`, url.origin));
        }
      }
      return NextResponse.redirect(new URL(`/app${next}`, url.origin));
    }
    console.error("OAuth callback exchangeCodeForSession error:", error.message);
  }

  // Code missing or exchange failed — bounce back to login with a flag
  // the page can surface as an error message. Avoid leaking the raw
  // Supabase error string to the URL bar.
  return NextResponse.redirect(new URL(`/app/login?error=oauth`, url.origin));
}
