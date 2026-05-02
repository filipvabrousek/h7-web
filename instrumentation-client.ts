// Next.js 15+ client instrumentation — runs once in the browser before
// the React tree mounts. This is the browser counterpart to
// `instrumentation.ts` (server + edge). Combined, they cover all three
// Next.js runtimes.
//
// Same empty-DSN-noop contract as the iOS/Android wrappers: with an
// empty `NEXT_PUBLIC_SENTRY_DSN` the SDK init is skipped silently so
// debug builds without a configured DSN behave identically to before.
//
// Privacy defaults:
//   - `sendDefaultPii: false`           → no IP / user agent
//   - Session Replay NOT enabled        → would record DOM mutations + clicks; opt in later
//   - `tracesSampleRate` NOT set        → performance tracing off; opt in later

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV === "production" ? "production" : "debug",
    release:
      process.env.NEXT_PUBLIC_SENTRY_RELEASE ??
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
      "dev",
    sendDefaultPii: false,
    // Drop events from localhost so dev sessions don't pollute the
    // production project's event stream. Mirrors the iOS
    // `targetEnvironment(simulator)` and Android emulator-fingerprint
    // filters.
    beforeSend(event) {
      if (
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" ||
          window.location.hostname === "127.0.0.1")
      ) {
        return null;
      }
      return event;
    },
  });
}

// Required for Next.js 15+ App Router navigation breadcrumbs — Sentry
// uses this to annotate events with the route-change context that led
// up to the error.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
