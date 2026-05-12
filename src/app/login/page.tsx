"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useTheme, type ThemeMode } from "@/lib/theme";
import { Sun, Moon, Monitor } from "lucide-react";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { mode: themeMode, setMode: setThemeMode } = useTheme();

  // Surface OAuth failures bounced back from `/app/auth/callback`. The
  // callback route writes `?error=oauth` to the redirect URL when the
  // code exchange fails (Supabase down, expired code, user cancelled
  // mid-flow). We don't leak the raw provider error here — just a
  // generic prompt to try again.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "oauth") {
      setError("Sign-in with Google failed. Please try again.");
      // Clear the param so a page refresh doesn't redisplay the error
      // forever. `replaceState` rewrites the URL without triggering a
      // history entry / a navigation event.
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);
    }
  }, []);

  const supabase = createClient();

  const cycleTheme = () => {
    const order: ThemeMode[] = ["system", "light", "dark"];
    const next = order[(order.indexOf(themeMode) + 1) % order.length];
    setThemeMode(next);
  };
  const ThemeIcon = themeMode === "light" ? Sun : themeMode === "dark" ? Moon : Monitor;

  // Baked at build time in next.config.ts. Rendered below the logo in the
  // Europe/Prague zone (CET/CEST, DST-aware) so the current deploy is
  // identifiable at a glance.
  const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME;
  const deployedAt = buildTime
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: "Europe/Prague",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(buildTime))
    : null;

  const handleForgotPassword = async () => {
    setError(null);
    setInfo(null);
    if (!email) {
      setError("Enter your email first");
      return;
    }
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/app/reset-password`,
    });
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setInfo("Check your inbox for a reset link.");
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setInfo(null);
    setLoading(true);
    // Redirect target lives at `/app/auth/callback` (Next.js basePath is
    // `/app`, so the route file at `src/app/auth/callback/route.ts`
    // ends up served at that URL). Supabase 302s the user there with a
    // `?code=` query, and the route swaps the code for a session
    // cookie before redirecting into the app. This URL must also be
    // registered in Supabase Dashboard → Authentication → URL
    // Configuration → Redirect URLs, otherwise the dashboard rejects
    // the callback as an open-redirect.
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/app/auth/callback`,
        // `prompt: select_account` forces Google to show the chooser
        // even when the user is already signed into a single Google
        // account in the browser. Without it, returning users get
        // silently logged in under whatever account they last used,
        // which is confusing when several people share a device.
        queryParams: { prompt: "select_account" },
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
    // No `setLoading(false)` on success — Supabase navigates away to
    // Google's consent page, so any state we set here is thrown out
    // anyway. Keeping the spinner visible until the redirect happens
    // hides the brief "logged out" flash.
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username } },
        });
        if (signUpError) throw signUpError;

        // Create profile
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("profiles").upsert({
            id: user.id,
            username,
            email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }

      // `window.location.href` is a raw browser navigation and does NOT get
      // `basePath` prepended by Next.js (unlike <Link> / router.push). Since
      // the app is mounted at /app, we include the prefix explicitly.
      window.location.href = isSignUp ? "/app/onboarding" : "/app/";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <button
        type="button"
        onClick={cycleTheme}
        aria-label={`Theme: ${themeMode}`}
        title={`Theme: ${themeMode}`}
        className="fixed top-4 right-4 w-10 h-10 rounded-full bg-gray-100 dark:bg-[#242A2A] border border-gray-200 dark:border-gray-700 flex items-center justify-center shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition"
      >
        <ThemeIcon size={18} className="text-gray-700 dark:text-gray-200" />
      </button>
      <div className="w-full max-w-sm space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#0D1C40]">
            <span className="text-3xl font-black text-yellow-400">H7</span>
          </div>
          <p className="mt-3 text-xs font-bold text-gray-400 tracking-[3px] uppercase">
            Happy 7 / Healthy 7
          </p>
          {deployedAt && (
            <p className="mt-1 text-[10px] font-mono text-gray-400 dark:text-gray-500">
              deployed {deployedAt} CEST
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="w-full bg-gray-100 dark:bg-[#242A2A] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full bg-gray-100 dark:bg-[#242A2A] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            minLength={6}
            className="w-full bg-gray-100 dark:bg-[#242A2A] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />

          {error && (
            <p className="text-sm text-red-500 text-center">{error}</p>
          )}

          {info && (
            <p className="text-sm text-emerald-500 text-center">{info}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#0D1C40] text-white font-bold text-sm hover:bg-[#152A5A] transition disabled:opacity-50"
          >
            {loading ? "..." : isSignUp ? "Sign Up" : "Sign In"}
          </button>

          {/* Divider between email/password and OAuth providers. Doubled
              horizontal rule pattern is the standard "or" affordance —
              fewer pixels than a single rule + centered text since the
              flex collapses the lines around the word. */}
          <div className="flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-[11px] uppercase tracking-wider text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          {/* Google sign-in. `type="button"` because this lives inside
              the email/password <form> — without that, pressing the
              button submits the form first (which fires the password
              validation) before we ever reach the handler. */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-white dark:bg-[#242A2A] text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-gray-700 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-50"
            aria-label="Continue with Google"
          >
            {/* Inline Google "G" logo SVG — avoids the extra round-trip
                of fetching it as an image. Sizes are fixed at 18px so
                the icon optically aligns with the 14px button text
                regardless of theme. */}
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          {!isSignUp && (
            <button
              type="button"
              onClick={handleForgotPassword}
              className="w-full text-center text-xs text-gray-500 hover:underline"
            >
              Forgot password?
            </button>
          )}

          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setError(null); setInfo(null); }}
            className="w-full text-center text-sm text-blue-600 hover:underline"
          >
            {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
          </button>
        </form>
      </div>
    </div>
  );
}
