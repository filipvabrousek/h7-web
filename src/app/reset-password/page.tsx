"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setDone(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#0D1C40]">
            <span className="text-3xl font-black text-yellow-400">H7</span>
          </div>
          <h1 className="mt-4 text-lg font-semibold">Set a new password</h1>
        </div>

        {done ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-emerald-500">
              Password updated. You can now sign in with your new password.
            </p>
            <a
              href="/login"
              className="inline-block w-full py-3 rounded-xl bg-[#0D1C40] text-white font-bold text-sm hover:bg-[#152A5A] transition"
            >
              Go to sign in
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              required
              minLength={6}
              className="w-full bg-gray-100 dark:bg-[#242A2A] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm new password"
              required
              minLength={6}
              className="w-full bg-gray-100 dark:bg-[#242A2A] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
            {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#0D1C40] text-white font-bold text-sm hover:bg-[#152A5A] transition disabled:opacity-50"
            >
              {loading ? "..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
