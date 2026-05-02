import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // The web app is deployed under /app on the public domain.
  // The marketing site (Nodality) lives at / and rewrites /app/* to this
  // Next.js deployment. Setting basePath makes Next.js prefix every
  // internal link, asset URL, and API route automatically.
  basePath: "/app",
  // Baked at build time — surfaced on the login screen so we can tell at a
  // glance which deploy is live. `next.config.ts` evaluates once per build,
  // so `new Date()` here freezes to the build's moment.
  env: {
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  images: {
    localPatterns: [
      {
        pathname: "/**",
      },
    ],
  },
};

// withSentryConfig wraps the Next.js config to:
//   - Inject the Sentry webpack plugin (uploads source maps for symbol-
//     icated client stack traces — only runs when SENTRY_AUTH_TOKEN is
//     set, so local builds skip the upload silently).
//   - Tunnel browser → Sentry traffic through /monitoring on our own
//     domain so ad-blockers don't drop error reports.
//
// The `@sentry/nextjs` runtime init still happens via instrumentation.ts
// (server + edge) and instrumentation-client.ts (browser). Without a
// configured `NEXT_PUBLIC_SENTRY_DSN` the SDK no-ops cleanly so dev
// builds without Sentry behave identically to before.
export default withSentryConfig(nextConfig, {
  // Sentry org + project slugs — required by the webpack plugin to know
  // which project to upload source maps to. Pulled from env so we don't
  // hardcode the slugs in the repo (and so a fork can use a different
  // Sentry org without editing this file). The plugin no-ops when these
  // are unset, so source-map upload is opt-in via env.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Quieter build output — only relevant when SENTRY_AUTH_TOKEN is set
  // and the plugin is actually doing work. Default `true` would print
  // debug logs on every build.
  silent: !process.env.CI,

  // Tunnel browser SDK requests through this same-origin path. The
  // Sentry SDK normally POSTs events to ingest.sentry.io directly, which
  // ad-blockers and corporate proxies often drop. Routing through
  // /monitoring keeps the requests same-origin so they survive.
  tunnelRoute: "/monitoring",

  // Hide source maps from being served publicly after upload — they get
  // uploaded to Sentry but stripped from the public build, so end users
  // can't view your unminified source via DevTools.
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});
