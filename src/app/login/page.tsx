"use client";

import { useState } from "react";
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
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setInfo("Check your inbox for a reset link.");
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

      window.location.href = isSignUp ? "/onboarding" : "/";
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
