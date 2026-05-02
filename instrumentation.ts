// Next.js 16 instrumentation hook — runs once per server / edge runtime
// boot, BEFORE any route handlers or middleware execute. This is where
// Sentry plugs into Node and Edge so unhandled rejections, route-handler
// throws, and middleware crashes are all captured.
//
// The browser-side counterpart lives in `instrumentation-client.ts`
// (Next 15+ convention). Both files share the same empty-DSN-noop
// contract: when `NEXT_PUBLIC_SENTRY_DSN` is empty, Sentry.init is
// skipped silently, so dev builds without a configured DSN behave
// identically to before.
//
// Privacy defaults (mirrors iOS/Android `SentryService`):
//   - `sendDefaultPii: false`             → no IP / cookies / user agent
//   - tracing/profiling NOT enabled       → opt in later if quota allows
//   - simulator / dev events NOT dropped  → handled per-runtime via `environment`

import * as Sentry from "@sentry/nextjs";

export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";
  if (!dsn) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV === "production" ? "production" : "debug",
      // Bound version surfaces in Sentry releases. Falls back to "dev"
      // when not set, e.g. local dev. CI / Vercel can inject either of
      // these to associate events with a specific deploy.
      release:
        process.env.SENTRY_RELEASE ??
        process.env.VERCEL_GIT_COMMIT_SHA ??
        "dev",
      sendDefaultPii: false,
      // tracesSampleRate / profilesSampleRate intentionally omitted —
      // performance + profiling cost quota and we don't need them yet.
    });
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV === "production" ? "production" : "debug",
      release:
        process.env.SENTRY_RELEASE ??
        process.env.VERCEL_GIT_COMMIT_SHA ??
        "dev",
      sendDefaultPii: false,
    });
  }
}

// Required export for Next.js 15+ — Sentry hooks into request errors
// (route handlers, server actions, RSC renders) via this callback. Without
// it, errors thrown inside `app/` route segments wouldn't reach Sentry
// even when `register()` ran.
export const onRequestError = Sentry.captureRequestError;
